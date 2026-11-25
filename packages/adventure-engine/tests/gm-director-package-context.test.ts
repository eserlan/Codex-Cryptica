import { describe, expect, it } from "vitest";
import type { PromptAdventurePackage } from "../src/context-budget";
import { buildPackageContext } from "../src/gm-director-package-context";
import type { PackageProgressEvent } from "../src/types";
import { directorTurn } from "./gm-director-fixtures";
import { session } from "./reducer-fixtures";

type Excerpt = PromptAdventurePackage["playerSafe"][number];

function excerpt(
  id: string,
  kind: Excerpt["kind"] = "clue",
  epistemicStatus: Excerpt["epistemicStatus"] = "explicit",
): Excerpt {
  return {
    id,
    kind,
    epistemicStatus,
    visibility: kind === "secret" ? "gm-only" : "player-visible",
    text: `Text for ${id}`,
  };
}

function pinnedSession() {
  const s = session();
  s.sourcePackage = {
    packageId: "package",
    version: "1",
    formatVersion: "adventure-json/v1",
    hash: "a".repeat(64),
  };
  return s;
}

function event(
  id: string,
  overrides: Partial<PackageProgressEvent> = {},
): PackageProgressEvent {
  return {
    id,
    turnId: "turn-1",
    recordId: "clue",
    kind: "clue",
    from: "unvisited",
    to: "active",
    certainty: "claimed",
    note: "The gate is locked",
    ...overrides,
  };
}

describe("director package context", () => {
  it("requires a pinned package or retrieved excerpts and uses the current scene before excerpt fallbacks", () => {
    const s = session();
    expect(buildPackageContext(s)).toBeUndefined();
    expect(
      buildPackageContext(s, { playerSafe: [], gmOnly: [] }),
    ).toBeUndefined();
    const pkg = { playerSafe: [excerpt("fallback", "scene")], gmOnly: [] };
    expect(buildPackageContext(s, pkg)?.sceneId).toBe("fallback");
    s.packageProgress = { sceneId: "current" };
    expect(buildPackageContext(s, pkg)?.sceneId).toBe("current");
    expect(buildPackageContext(pinnedSession())).toEqual({
      activeRecordIds: [],
      establishedActors: [],
      latestEvents: [],
      openUncertainties: [],
    });
  });

  it("prioritizes active and available records, deduplicates, and omits closed records and metadata", () => {
    const s = pinnedSession();
    s.packageProgress = {
      sceneId: "current",
      records: [
        { id: "available", kind: "scene", status: "available" },
        { id: "active", kind: "scene", status: "active" },
        { id: "resolved", kind: "clue", status: "resolved" },
        { id: "altered", kind: "clue", status: "altered" },
        { id: "skipped", kind: "clue", status: "skipped" },
      ],
    };
    const pkg: PromptAdventurePackage = {
      playerSafe: [
        excerpt("premise", "premise"),
        excerpt("system", "system"),
        ...["active", "resolved", "altered", "skipped"].map((id) =>
          excerpt(id),
        ),
        ...Array.from({ length: 10 }, (_, i) => excerpt(`clue-${i}`)),
      ],
      gmOnly: [excerpt("secret", "secret")],
    };
    expect(buildPackageContext(s, pkg)?.activeRecordIds).toEqual([
      "active",
      "available",
      "clue-0",
      "clue-1",
      "clue-2",
      "clue-3",
      "clue-4",
      "clue-5",
    ]);
  });

  it("prioritizes excerpt actors and retains only their latest two clipped facts without mutating progress", () => {
    const s = pinnedSession();
    s.packageProgress = {
      sceneId: "current",
      actors: Array.from({ length: 5 }, (_, i) => ({
        actorId: `actor-${i}`,
        status: "present",
        disposition: "wary",
        facts: ["old", "  latest\n fact ", "detail ".repeat(30)],
      })),
    };
    const before = structuredClone(s.packageProgress);
    const context = buildPackageContext(s, {
      playerSafe: [excerpt("actor-4", "actor")],
      gmOnly: [],
    })!;
    expect(context.establishedActors.map((actor) => actor.actorId)).toEqual([
      "actor-4",
      "actor-0",
      "actor-1",
      "actor-2",
    ]);
    expect(context.establishedActors[0]!.facts?.[0]).toBe("latest fact");
    expect(context.establishedActors[0]!.facts?.[1]).toHaveLength(120);
    expect(s.packageProgress).toEqual(before);
  });

  it("excludes superseded claims in both event streams while retaining confirmed latest events", () => {
    const s = pinnedSession();
    s.packageProgress = {
      sceneId: "current",
      events: [
        event("old"),
        event("confirmed", {
          certainty: "confirmed",
          supersedes: "old",
          note: "The gate is open",
        }),
        event("claim", { note: " A second\n claim " }),
      ],
      actorEvents: [
        {
          id: "old-actor",
          turnId: "turn-1",
          actorId: "keeper",
          certainty: "claimed",
          note: "Missing",
        },
        {
          id: "confirmed-actor",
          turnId: "turn-2",
          actorId: "keeper",
          certainty: "confirmed",
          note: "Present",
          supersedes: "old-actor",
        },
        {
          id: "actor-claim",
          turnId: "turn-3",
          actorId: "keeper",
          certainty: "claimed",
          note: "Wary",
        },
      ],
    };
    const context = buildPackageContext(s)!;
    expect(
      context.latestEvents.map((entry) => [entry.id, entry.certainty]),
    ).toEqual([
      ["confirmed", "confirmed"],
      ["claim", "claimed"],
    ]);
    expect(context.openUncertainties).toEqual([
      "Claimed (clue): A second claim",
      "Claimed actor note (keeper): Wary",
    ]);
  });

  it("keeps unresolved and ambiguous excerpts open except for resolved or altered records", () => {
    const s = pinnedSession();
    s.packageProgress = {
      sceneId: "current",
      records: [
        { id: "resolved", kind: "clue", status: "resolved" },
        { id: "altered", kind: "clue", status: "altered" },
        { id: "skipped", kind: "clue", status: "skipped" },
      ],
    };
    const pkg = {
      playerSafe: [
        excerpt("resolved", "clue", "ambiguous"),
        excerpt("altered", "clue", "unresolved"),
        excerpt("skipped", "clue", "unresolved"),
        excerpt("open", "scene", "ambiguous"),
      ],
      gmOnly: [],
    };
    expect(buildPackageContext(s, pkg)?.openUncertainties).toEqual([
      "unresolved clue (skipped): keep open.",
      "ambiguous scene (open): keep open.",
    ]);
  });

  it("recognizes every durable reveal source and falls back to only the last 256 turns", () => {
    const s = pinnedSession();
    s.packageProgress = {
      sceneId: "current",
      revealedSecretIds: ["summary"],
      records: [{ id: "record", kind: "secret", status: "resolved" }],
    };
    s.hiddenState.secrets = [
      { id: "hidden-state", text: "Known", status: "revealed" },
    ];
    s.turns = Array.from({ length: 257 }, (_, i) => directorTurn(i + 1));
    s.turns[0]!.revealedSecretIds = ["too-old"];
    s.turns[1]!.revealedSecretIds = ["legacy"];
    const pkg = {
      playerSafe: [],
      gmOnly: [
        "summary",
        "record",
        "hidden-state",
        "legacy",
        "too-old",
        "unknown",
      ].map((id) => excerpt(id, "secret")),
    };
    expect(buildPackageContext(s, pkg)?.openUncertainties).toEqual([
      "Unrevealed secret (too-old).",
      "Unrevealed secret (unknown).",
    ]);
    s.packageProgress.revealedSecretIds!.push("too-old", "unknown");
    expect(buildPackageContext(s, pkg)?.openUncertainties).toEqual([]);
  });

  it("caps unique uncertainties and event history while keeping their authored order", () => {
    const s = pinnedSession();
    s.packageProgress = {
      sceneId: "current",
      events: Array.from({ length: 7 }, (_, i) =>
        event(`event-${i}`, { note: `Claim ${Math.max(0, i - 1)}` }),
      ),
    };
    const context = buildPackageContext(s)!;
    expect(context.latestEvents.map((entry) => entry.id)).toEqual([
      "event-3",
      "event-4",
      "event-5",
      "event-6",
    ]);
    expect(context.openUncertainties).toEqual([
      "Claimed (clue): Claim 0",
      "Claimed (clue): Claim 1",
      "Claimed (clue): Claim 2",
      "Claimed (clue): Claim 3",
    ]);
  });
});
