import { describe, it, expect } from "vitest";
import { DiscoveryEntrySchema, type DiscoveryEntry } from "./schema";
import {
  getDiscoveryEntries,
  getEntryByPath,
  getEntryById,
  findIntentOwner,
  normaliseIntent,
  claimedIntents,
  getClusters,
} from "./registry";
import {
  auditDiscoveryRegistry,
  findUnregisteredPaths,
  findOrphanedEntries,
  errorsOnly,
  warningsOnly,
} from "./audit";
import { entries } from "./entries";
import { listGovernedPaths } from "./governed-routes";

const make = (
  overrides: Partial<DiscoveryEntry> & Pick<DiscoveryEntry, "id">,
): DiscoveryEntry =>
  DiscoveryEntrySchema.parse({
    pageKind: "answer",
    canonicalPath: `/answers/${overrides.id}`,
    primaryIntent: `intent for ${overrides.id}`,
    userJob: "understand",
    uniqueValue:
      "A rationale long enough to satisfy the schema's minimum length requirement.",
    indexable: true,
    status: "live",
    ...overrides,
  });

describe("discovery schema", () => {
  it("rejects a non-kebab-case id", () => {
    expect(() => make({ id: "Not Kebab" })).toThrow();
  });

  it("rejects a canonical path that is not root-relative", () => {
    expect(() =>
      make({ id: "external", canonicalPath: "https://example.com/x" }),
    ).toThrow();
  });

  it("rejects a trailing slash on a canonical path", () => {
    expect(() =>
      make({ id: "trailing", canonicalPath: "/answers/trailing/" }),
    ).toThrow();
  });

  it("rejects a capitalised or punctuated primary intent", () => {
    expect(() =>
      make({ id: "shouty", primaryIntent: "What Is A Thing?" }),
    ).toThrow();
  });

  it("rejects a one-word unique value", () => {
    expect(() => make({ id: "thin", uniqueValue: "Good." })).toThrow();
  });

  it("defaults the optional link arrays", () => {
    const entry = make({ id: "defaults" });
    expect(entry.intentAliases).toEqual([]);
    expect(entry.relatedIntents).toEqual([]);
    expect(entry.acknowledgedOverlap).toEqual([]);
  });
});

describe("registry lookups", () => {
  const registry = [
    make({
      id: "alpha",
      primaryIntent: "how do you build a thing",
      intentAliases: ["building things", "How do you BUILD a thing?"],
    }),
    make({ id: "beta", primaryIntent: "what is a thing" }),
  ];

  it("finds an entry by canonical path", () => {
    expect(getEntryByPath("/answers/alpha", registry)?.id).toBe("alpha");
    expect(getEntryByPath("/nope", registry)).toBeUndefined();
  });

  it("finds an entry by id", () => {
    expect(getEntryById("beta", registry)?.id).toBe("beta");
    expect(getEntryById("nope", registry)).toBeUndefined();
  });

  it("normalises casing and punctuation when matching intents", () => {
    expect(normaliseIntent("How do you BUILD a thing?")).toBe(
      "how do you build a thing",
    );
  });

  it("finds the owner of a phrasing through its aliases", () => {
    expect(findIntentOwner("Building Things!", registry)?.id).toBe("alpha");
    expect(findIntentOwner("how do you build a thing", registry)?.id).toBe(
      "alpha",
    );
  });

  it("returns no owner for an unclaimed phrasing", () => {
    expect(findIntentOwner("something nobody owns", registry)).toBeUndefined();
  });

  it("lists everything an entry claims", () => {
    expect(claimedIntents(registry[0])).toContain("building things");
    expect(claimedIntents(registry[0])).toContain("how do you build a thing");
  });

  it("groups entries by cluster, ignoring unclustered ones", () => {
    const clustered = [
      make({ id: "one", parentCluster: "shared" }),
      make({ id: "two", parentCluster: "shared" }),
      make({ id: "three" }),
    ];
    const clusters = getClusters(clustered);
    expect(clusters.get("shared")).toHaveLength(2);
    expect(clusters.has("three")).toBe(false);
  });
});

describe("audit — deterministic errors", () => {
  it("reports a duplicate id", () => {
    const findings = auditDiscoveryRegistry([
      make({ id: "same", canonicalPath: "/a" }),
      make({ id: "same", canonicalPath: "/b" }),
    ]);
    expect(findings.map((f) => f.code)).toContain("duplicate-id");
  });

  it("reports two entries claiming one canonical path", () => {
    const findings = auditDiscoveryRegistry([
      make({ id: "one", canonicalPath: "/shared" }),
      make({ id: "two", canonicalPath: "/shared" }),
    ]);
    expect(findings.map((f) => f.code)).toContain("duplicate-canonical-path");
  });

  it("reports two indexable pages claiming one primary intent", () => {
    const findings = auditDiscoveryRegistry([
      make({ id: "one", primaryIntent: "the same thing" }),
      make({ id: "two", primaryIntent: "the same thing" }),
    ]);
    expect(errorsOnly(findings).map((f) => f.code)).toContain(
      "duplicate-primary-intent",
    );
  });

  it("downgrades a duplicate intent to a warning once the overlap is acknowledged", () => {
    const findings = auditDiscoveryRegistry([
      make({
        id: "one",
        primaryIntent: "the same thing",
        acknowledgedOverlap: [
          {
            with: "two",
            reason:
              "Recorded pre-existing duplication, kept visible pending consolidation.",
          },
        ],
      }),
      make({ id: "two", primaryIntent: "the same thing" }),
    ]);
    expect(errorsOnly(findings)).toHaveLength(0);
    expect(warningsOnly(findings).map((f) => f.code)).toContain(
      "acknowledged-duplicate-intent",
    );
  });

  it("ignores a non-indexable page sharing an intent with the page it redirects to", () => {
    const findings = auditDiscoveryRegistry([
      make({ id: "canonical", primaryIntent: "the same thing" }),
      make({
        id: "redirect",
        primaryIntent: "the same thing",
        indexable: false,
      }),
    ]);
    expect(errorsOnly(findings)).toHaveLength(0);
  });

  it("reports an alias that another page owns as its primary intent", () => {
    const findings = auditDiscoveryRegistry([
      make({ id: "owner", primaryIntent: "owned phrasing" }),
      make({ id: "thief", intentAliases: ["owned phrasing"] }),
    ]);
    expect(findings.map((f) => f.code)).toContain("alias-claims-owned-intent");
  });

  it("reports a related intent that points at nothing", () => {
    const findings = auditDiscoveryRegistry([
      make({ id: "one", relatedIntents: ["ghost"] }),
    ]);
    expect(findings.map((f) => f.code)).toContain("dangling-related-intent");
  });

  it("reports an acknowledged overlap that points at nothing", () => {
    const findings = auditDiscoveryRegistry([
      make({
        id: "one",
        acknowledgedOverlap: [
          { with: "ghost", reason: "A reason long enough for the schema." },
        ],
      }),
    ]);
    expect(findings.map((f) => f.code)).toContain(
      "dangling-acknowledged-overlap",
    );
  });

  it("reports an entry that relates to itself", () => {
    const findings = auditDiscoveryRegistry([
      make({ id: "narcissus", relatedIntents: ["narcissus"] }),
    ]);
    expect(findings.map((f) => f.code)).toContain("self-reference");
  });

  it("reports a unique value that only restates the intent", () => {
    const findings = auditDiscoveryRegistry([
      make({
        id: "circular",
        primaryIntent: "how to build a fantasy faction",
        uniqueValue: "How to build a fantasy faction",
      }),
    ]);
    expect(findings.map((f) => f.code)).toContain("weak-unique-value");
  });

  it("rejects a rationale that claims the page targets another phrasing", () => {
    // The exact justification #2566 rules out. It clears the schema's length
    // minimum comfortably, so only a content check catches it.
    for (const excuse of [
      "Targets another phrasing of the keyword for extra coverage.",
      "An alternative wording of the same query, for search coverage.",
      "SEO variant of the canonical page, aimed at a different spelling.",
    ]) {
      const findings = auditDiscoveryRegistry([
        make({ id: "filler", uniqueValue: excuse }),
      ]);
      expect(
        findings.map((f) => f.code),
        excuse,
      ).toContain("keyword-variant-rationale");
    }
  });

  it("accepts a rationale that names a real differentiator", () => {
    const findings = auditDiscoveryRegistry([
      make({
        id: "genuine",
        uniqueValue:
          "Works a concrete fen example with real travel costs, and says when not to use one.",
      }),
    ]);
    expect(findings.map((f) => f.code)).not.toContain(
      "keyword-variant-rationale",
    );
  });

  it("reports a live governed route with no registry entry", () => {
    const findings = findUnregisteredPaths(
      ["/answers/known", "/answers/orphan"],
      [make({ id: "known", canonicalPath: "/answers/known" })],
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].code).toBe("unregistered-discovery-page");
    expect(findings[0].message).toContain("/answers/orphan");
  });
});

describe("orphaned entries", () => {
  it("warns when a live entry owns a path that is no longer a governed route", () => {
    const findings = findOrphanedEntries(
      ["/answers/still-here"],
      [
        make({ id: "still-here", canonicalPath: "/answers/still-here" }),
        make({ id: "ghost", canonicalPath: "/answers/deleted" }),
      ],
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].code).toBe("orphaned-registry-entry");
    expect(findings[0].entries).toEqual(["ghost"]);
  });

  it("never warns about a planned entry, which has no route yet by design", () => {
    const findings = findOrphanedEntries(
      [],
      [
        make({
          id: "future",
          canonicalPath: "/answers/future",
          status: "planned",
        }),
      ],
    );
    expect(findings).toHaveLength(0);
  });

  it("never warns about a retired or non-indexable entry", () => {
    const findings = findOrphanedEntries(
      [],
      [
        make({ id: "gone", canonicalPath: "/answers/gone", status: "retired" }),
        make({ id: "hidden", canonicalPath: "/x", indexable: false }),
      ],
    );
    expect(findings).toHaveLength(0);
  });

  it("is a warning, never a build failure", () => {
    const findings = findOrphanedEntries(
      [],
      [make({ id: "ghost", canonicalPath: "/answers/deleted" })],
    );
    expect(errorsOnly(findings)).toHaveLength(0);
  });

  it("leaves no orphans in the committed registry", () => {
    const registry = getDiscoveryEntries();
    const orphans = findOrphanedEntries(listGovernedPaths(), registry);
    expect(orphans.map((finding) => finding.message)).toEqual([]);
  });
});

describe("audit — judgement warnings", () => {
  const inCluster = (
    id: string,
    intent: string,
    extra: Partial<DiscoveryEntry> = {},
  ) =>
    make({
      id,
      canonicalPath: `/x/${id}`,
      primaryIntent: intent,
      userJob: "create",
      parentCluster: "shared",
      ...extra,
    });

  it("warns when two pages share a cluster, a job and vocabulary", () => {
    const findings = auditDiscoveryRegistry([
      inCluster("one", "fantasy faction generator"),
      inCluster("two", "faction generator for campaigns"),
    ]);
    expect(warningsOnly(findings).map((f) => f.code)).toContain(
      "same-job-same-vocabulary",
    );
  });

  it("does not warn when the pages share a cluster and job but no vocabulary", () => {
    const findings = auditDiscoveryRegistry([
      inCluster("one", "faction generator"),
      inCluster("two", "tavern generator"),
    ]);
    expect(warningsOnly(findings)).toHaveLength(0);
  });

  it("does not warn when the pages state different audiences", () => {
    const findings = auditDiscoveryRegistry([
      inCluster("one", "faction generator", { audience: "D&D game masters" }),
      inCluster("two", "faction generator variant", {
        audience: "Cyberpunk game masters",
      }),
    ]);
    expect(warningsOnly(findings)).toHaveLength(0);
  });

  it("treats a term used across three or more entries as the cluster's vocabulary", () => {
    // Every importer says "import"; sharing it proves nothing.
    const findings = auditDiscoveryRegistry([
      inCluster("one", "import obsidian notes"),
      inCluster("two", "import kanka campaign"),
      inCluster("three", "import world anvil articles"),
    ]);
    expect(warningsOnly(findings)).toHaveLength(0);
  });

  it("stays silent once an overlap is acknowledged", () => {
    const findings = auditDiscoveryRegistry([
      inCluster("one", "fantasy faction generator", {
        acknowledgedOverlap: [
          {
            with: "two",
            reason: "Deliberate tier split, revisited and kept on purpose.",
          },
        ],
      }),
      inCluster("two", "faction generator for campaigns"),
    ]);
    expect(warningsOnly(findings)).toHaveLength(0);
  });

  it("never fails the deterministic checks on a judgement call", () => {
    const findings = auditDiscoveryRegistry([
      inCluster("one", "fantasy faction generator"),
      inCluster("two", "faction generator for campaigns"),
    ]);
    expect(errorsOnly(findings)).toHaveLength(0);
  });
});

describe("the committed registry", () => {
  const registry = getDiscoveryEntries();

  it("parses every entry", () => {
    expect(registry.length).toBe(entries.length);
    expect(registry.length).toBeGreaterThan(50);
  });

  it("has no deterministic errors", () => {
    const findings = [
      ...auditDiscoveryRegistry(registry),
      ...findUnregisteredPaths(listGovernedPaths(), registry),
    ];
    const errors = errorsOnly(findings);
    expect(
      errors.map((finding) => `${finding.code}: ${finding.message}`),
    ).toEqual([]);
  });

  it("covers every governed route", () => {
    const owned = new Set(registry.map((entry) => entry.canonicalPath));
    for (const path of listGovernedPaths()) {
      expect(owned, `${path} has no registry entry`).toContain(path);
    }
  });

  it("seeds every major discovery family", () => {
    const kinds = new Set(registry.map((entry) => entry.pageKind));
    for (const kind of [
      "for",
      "answer",
      "generator",
      "tool",
      "hub",
      "solution",
      "comparison",
      "import",
      "feature",
      "landing",
      "index",
      "blog",
    ]) {
      expect(kinds, `no entry of kind ${kind}`).toContain(kind);
    }
  });

  it("gives every acknowledged overlap a reason on both readings", () => {
    for (const entry of registry) {
      for (const overlap of entry.acknowledgedOverlap) {
        expect(
          overlap.reason.length,
          `${entry.id} -> ${overlap.with}`,
        ).toBeGreaterThan(40);
      }
    }
  });

  it("keeps the judgement warnings to a reviewable number", () => {
    // Not a quality bar — a tripwire. If this climbs, the overlap heuristic has
    // started reporting noise and needs tightening rather than muting.
    const warnings = warningsOnly(auditDiscoveryRegistry(registry));
    expect(warnings.length).toBeLessThan(20);
  });
});
