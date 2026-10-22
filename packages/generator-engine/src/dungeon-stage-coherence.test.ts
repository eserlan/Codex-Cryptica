import { describe, expect, it, vi } from "vitest";
import { finishDungeonCoherence } from "./dungeon-stage-coherence";
import {
  assembleDungeon,
  foundationFactsOf,
  geographyFactsOf,
} from "./dungeon-stage-assembly";
import {
  OPTIONS,
  setup,
  foundation,
  sectors,
  factions,
} from "./dungeon-staged.test-fixtures";
import { parseDungeonResponseDetailed } from "./public-dungeon";
import { StagedProgress, type StagedProgressStep } from "./staged-progress";
import type { RunState, DungeonStagedDeps } from "./dungeon-staged-types";

function prepare(goal?: string) {
  const resolved = setup();
  const f = foundation(resolved);
  const facts = foundationFactsOf(f);
  const draft = assembleDungeon(resolved, {
    foundation: f,
    facts,
    geography: geographyFactsOf(resolved, facts, sectors(resolved)),
    factions: factions(resolved, goal ? { goal } : {}),
  });
  const current = parseDungeonResponseDetailed(
    JSON.stringify(draft),
    OPTIONS,
    () => 0.5,
    resolved,
  );
  expect(current.structured).toBeDefined();
  const updates: StagedProgressStep[][] = [];
  const run: RunState = {
    stats: {
      outcome: "fell-back",
      aiCalls: 0,
      repairedStages: [],
      reviewIssues: [],
      reviewSkipped: false,
      coherenceRepaired: false,
      remainingIssues: [],
    },
    progress: new StagedProgress(
      [{ id: "coherence", label: "Review" }],
      (steps) => updates.push(steps),
    ),
  };
  const context = { options: OPTIONS, resolved, rng: () => 0.5 };
  const finish = (deps: DungeonStagedDeps) =>
    finishDungeonCoherence(deps, run, current, context);
  return { current, run, finish, updates };
}

describe("dungeon coherence", () => {
  it("returns a clean document after one review and completes progress", async () => {
    const { current, run, finish, updates } = prepare();
    const complete = vi.fn(async () => '{"issues":[]}');
    expect(await finish({ complete })).toBe(current);
    expect(run.stats.aiCalls).toBe(1);
    expect(run.stats.remainingIssues).toEqual([]);
    expect(updates.at(-1)?.[0].status).toBe("done");
  });

  it("retries unreadable reviews and limits filtered review findings to five", async () => {
    const { current, run, finish } = prepare();
    const complete = vi
      .fn<DungeonStagedDeps["complete"]>()
      .mockResolvedValueOnce('{"issues":"bad shape"}')
      .mockResolvedValueOnce(
        JSON.stringify({ issues: [" a ", null, "b", "c", "d", "e", "f"] }),
      )
      .mockRejectedValueOnce(new Error("repair offline"));
    expect(await finish({ complete })).toBe(current);
    expect(run.stats.aiCalls).toBe(3);
    expect(run.stats.reviewIssues).toEqual(["a", "b", "c", "d", "e"]);
    expect(run.stats.remainingIssues).toEqual(run.stats.reviewIssues);
    expect(run.stats.reviewSkipped).toBe(false);
  });

  it("keeps the document when both review attempts fail", async () => {
    const { current, run, finish } = prepare();
    const complete = vi
      .fn<DungeonStagedDeps["complete"]>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce("not json");
    expect(await finish({ complete })).toBe(current);
    expect(run.stats.reviewSkipped).toBe(true);
    expect(run.stats.aiCalls).toBe(2);
  });

  it("accepts a review repair and preserves omitted sector presence", async () => {
    const { current, run, finish, updates } = prepare();
    const repaired = structuredClone(current.structured!);
    repaired.history =
      "A tide-gate failed during firing and flooded the descent.";
    for (const sector of repaired.sectors) delete sector.presence;
    const complete = vi
      .fn<DungeonStagedDeps["complete"]>()
      .mockResolvedValueOnce('{"issues":["history lacks a mechanism"]}')
      .mockResolvedValueOnce(
        JSON.stringify({
          ...repaired,
          throughline: "Built, flooded, now contested.",
        }),
      );
    const result = await finish({ complete });
    expect(result.structured?.history).toBe(repaired.history);
    expect(result.structured?.sectors[0].presence).toEqual(
      current.structured?.sectors[0].presence,
    );
    expect(run.stats.coherenceRepaired).toBe(true);
    expect(run.stats.remainingIssues).toEqual([]);
    expect(complete.mock.calls[1][1]).toContain("- history lacks a mechanism");
    expect(updates.some((steps) => steps[0].detail === "fixing problems")).toBe(
      true,
    );
  });

  it.each(["not json", "{}", '{"sectors":[null]}'])(
    "keeps the draft for unusable repair: %s",
    async (reply) => {
      const { current, run, finish } = prepare();
      const complete = vi
        .fn<DungeonStagedDeps["complete"]>()
        .mockResolvedValueOnce('{"issues":["history lacks a mechanism"]}')
        .mockResolvedValueOnce(reply);
      expect(await finish({ complete })).toBe(current);
      expect(run.stats.coherenceRepaired).toBe(false);
      expect(run.stats.remainingIssues).toEqual(["history lacks a mechanism"]);
    },
  );

  it("rejects a repair that adds deterministic problems", async () => {
    const { current, run, finish } = prepare();
    const repaired = structuredClone(current.structured!);
    repaired.factions[0].goal = "Break into the Obsidian Vault";
    const complete = vi
      .fn<DungeonStagedDeps["complete"]>()
      .mockResolvedValueOnce('{"issues":["history lacks a mechanism"]}')
      .mockResolvedValueOnce(
        JSON.stringify({
          ...repaired,
          throughline: "Built, flooded, now contested.",
        }),
      );
    expect(await finish({ complete })).toBe(current);
    expect(run.stats.coherenceRepaired).toBe(false);
  });

  it("requires fewer deterministic problems when the review found none", async () => {
    const { current, run, finish } = prepare("Break into the Obsidian Vault");
    const complete = vi
      .fn<DungeonStagedDeps["complete"]>()
      .mockResolvedValueOnce('{"issues":[]}')
      .mockResolvedValueOnce(
        JSON.stringify({
          ...current.structured,
          throughline: "Built, flooded, now contested.",
        }),
      );
    expect(await finish({ complete })).toBe(current);
    expect(run.stats.coherenceRepaired).toBe(false);
    expect(run.stats.remainingIssues.join()).toContain("Obsidian Vault");
  });

  it("accepts a repair that removes deterministic problems without review findings", async () => {
    const { current, run, finish } = prepare("Break into the Obsidian Vault");
    const repaired = structuredClone(current.structured!);
    repaired.factions[0].goal = "Cap the steam vents";
    repaired.sectors[0].presence = [
      { faction: "Lantern Wrights", detail: "A new barricade." },
    ];
    const complete = vi
      .fn<DungeonStagedDeps["complete"]>()
      .mockResolvedValueOnce('{"issues":[]}')
      .mockResolvedValueOnce(
        JSON.stringify({
          ...repaired,
          throughline: "Built, flooded, now contested.",
        }),
      );
    const result = await finish({ complete });
    expect(result).not.toBe(current);
    expect(result.structured?.sectors[0].presence).toEqual(
      repaired.sectors[0].presence,
    );
    expect(run.stats.coherenceRepaired).toBe(true);
    expect(run.stats.remainingIssues).toEqual([]);
  });

  it.each(["review", "repair"])(
    "propagates cancellation during %s without finishing progress",
    async (stage) => {
      const { run, finish, updates } = prepare();
      const ctl = new AbortController();
      const reason = new Error("cancelled");
      const complete = vi.fn<DungeonStagedDeps["complete"]>(async () => {
        if (stage === "repair" && complete.mock.calls.length === 1) {
          return '{"issues":["history lacks a mechanism"]}';
        }
        ctl.abort(reason);
        throw reason;
      });
      await expect(finish({ complete, signal: ctl.signal })).rejects.toBe(
        reason,
      );
      expect(complete).toHaveBeenCalledTimes(stage === "review" ? 1 : 2);
      expect(run.stats.coherenceRepaired).toBe(false);
      expect(updates.at(-1)?.[0].status).not.toBe("done");
    },
  );
});
