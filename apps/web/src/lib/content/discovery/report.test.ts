import { describe, it, expect } from "vitest";
import { DiscoveryEntrySchema, type DiscoveryEntry } from "./schema";
import {
  JOB_ORDER,
  coverableEntries,
  clusterCoverage,
  coverageGaps,
  clustersMissingJob,
  familyCounts,
  aliasLoad,
  buildReport,
} from "./report";
import { entries } from "./entries";

const make = (
  overrides: Partial<DiscoveryEntry> & Pick<DiscoveryEntry, "id">,
): DiscoveryEntry =>
  DiscoveryEntrySchema.parse({
    pageKind: "answer",
    canonicalPath: `/x/${overrides.id}`,
    primaryIntent: `intent for ${overrides.id}`,
    userJob: "understand",
    uniqueValue:
      "A rationale long enough to satisfy the schema's minimum length requirement.",
    indexable: true,
    status: "live",
    ...overrides,
  });

describe("coverable entries", () => {
  it("counts only live, indexable, clustered pages", () => {
    const result = coverableEntries([
      make({ id: "counted", parentCluster: "shared" }),
      make({ id: "unclustered" }),
      make({ id: "planned", parentCluster: "shared", status: "planned" }),
      make({ id: "retired", parentCluster: "shared", status: "retired" }),
      make({ id: "hidden", parentCluster: "shared", indexable: false }),
    ]);
    expect(result.map((entry) => entry.id)).toEqual(["counted"]);
  });
});

describe("cluster coverage", () => {
  const registry = [
    make({ id: "a", parentCluster: "faction", userJob: "create" }),
    make({ id: "b", parentCluster: "faction", userJob: "create" }),
    make({ id: "c", parentCluster: "faction", userJob: "understand" }),
    make({ id: "d", parentCluster: "naming", userJob: "create" }),
  ];

  it("groups paths by cluster and job", () => {
    const [faction, naming] = clusterCoverage(registry);
    expect(faction.cluster).toBe("faction");
    expect(faction.total).toBe(3);
    expect(faction.byJob.get("create")).toHaveLength(2);
    expect(faction.byJob.get("understand")).toHaveLength(1);
    expect(naming.byJob.get("understand")).toBeUndefined();
  });

  it("sorts clusters alphabetically so the matrix is stable between runs", () => {
    expect(clusterCoverage(registry).map((row) => row.cluster)).toEqual([
      "faction",
      "naming",
    ]);
  });

  it("covers every job in JOB_ORDER", () => {
    // Guards against a job being added to the schema and silently missing from
    // the report's columns.
    const schemaJobs = new Set(entries.map((entry) => entry.userJob));
    for (const job of schemaJobs) {
      expect(JOB_ORDER, `${job} missing from JOB_ORDER`).toContain(job);
    }
  });
});

describe("coverage gaps", () => {
  it("flags a cluster with a generator and no explanation", () => {
    const gaps = coverageGaps([
      make({ id: "gen", parentCluster: "naming", userJob: "create" }),
    ]);
    expect(gaps).toHaveLength(1);
    expect(gaps[0]).toMatchObject({
      cluster: "naming",
      has: "create",
      missing: "understand",
    });
  });

  it("flags a cluster with an explanation and no tool", () => {
    const gaps = coverageGaps([
      make({ id: "ans", parentCluster: "notes", userJob: "understand" }),
    ]);
    expect(gaps[0]).toMatchObject({ has: "understand", missing: "create" });
  });

  it("reports nothing when both jobs are served", () => {
    expect(
      coverageGaps([
        make({ id: "gen", parentCluster: "faction", userJob: "create" }),
        make({ id: "ans", parentCluster: "faction", userJob: "understand" }),
      ]),
    ).toEqual([]);
  });

  it("ranks a well-tooled cluster above a thin one", () => {
    const gaps = coverageGaps([
      make({ id: "thin", parentCluster: "aaa-thin", userJob: "create" }),
      make({ id: "g1", parentCluster: "zzz-heavy", userJob: "create" }),
      make({ id: "g2", parentCluster: "zzz-heavy", userJob: "create" }),
      make({ id: "g3", parentCluster: "zzz-heavy", userJob: "create" }),
    ]);
    // Weight wins over the alphabet: three generators is the stronger candidate.
    expect(gaps.map((gap) => gap.cluster)).toEqual(["zzz-heavy", "aaa-thin"]);
  });

  it("ignores clusters made only of pages outside the complement pairs", () => {
    expect(
      coverageGaps([
        make({ id: "hub", parentCluster: "hubs", userJob: "navigate" }),
      ]),
    ).toEqual([]);
  });
});

describe("clustersMissingJob", () => {
  it("lists clusters that serve none of a job", () => {
    const registry = [
      make({ id: "a", parentCluster: "has-it", userJob: "see-an-example" }),
      make({ id: "b", parentCluster: "lacks-it", userJob: "create" }),
    ];
    expect(clustersMissingJob("see-an-example", registry)).toEqual([
      "lacks-it",
    ]);
  });
});

describe("family counts and alias load", () => {
  it("counts entries per page kind, largest first", () => {
    const counts = familyCounts([
      make({ id: "a", pageKind: "generator" }),
      make({ id: "b", pageKind: "generator" }),
      make({ id: "c", pageKind: "answer" }),
    ]);
    expect(counts).toEqual([
      ["generator", 2],
      ["answer", 1],
    ]);
  });

  it("measures how many phrasings are absorbed without new URLs", () => {
    const load = aliasLoad([
      make({ id: "a", intentAliases: ["one", "two"] }),
      make({ id: "b" }),
    ]);
    expect(load).toEqual({ aliases: 2, pages: 2, ratio: 1 });
  });

  it("does not divide by zero on an empty registry", () => {
    expect(aliasLoad([]).ratio).toBe(0);
  });
});

describe("the committed registry", () => {
  const report = buildReport();

  it("builds a report without throwing", () => {
    expect(report.totals.entries).toBe(entries.length);
    expect(report.totals.clusters).toBeGreaterThan(0);
  });

  it("absorbs more phrasings than it has pages", () => {
    // The registry's whole purpose: aliases instead of URLs.
    expect(report.totals.aliases).toBeGreaterThan(report.totals.entries);
  });

  it("serializes to JSON for the --json flag", () => {
    expect(() => JSON.stringify(report)).not.toThrow();
  });
});
