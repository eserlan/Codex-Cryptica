import { describe, expect, it } from "vitest";
import {
  checkFactionGrounding,
  checkFactions,
  checkSectors,
  DUNGEON_REVIEW_MARKER,
  generateDungeonStaged,
} from "./dungeon-staged";
import {
  OPTIONS,
  setup,
  foundation,
  sectors,
  faction,
  factions,
} from "./dungeon-staged.test-fixtures";
import type { StagedProgressStep } from "./staged-progress";

type Reply = (n: number, message: string) => unknown;
function script(replies: {
  foundation?: Reply;
  sectors?: Reply;
  factions?: Reply;
  review?: Reply;
  repair?: Reply;
}) {
  const calls: string[] = [];
  const counts = {
    foundation: 0,
    sectors: 0,
    factions: 0,
    review: 0,
    repair: 0,
  };
  const complete = async (_sys: string, message: string) => {
    calls.push(message);
    const stage = message.includes("Stage 1 of 3")
      ? "foundation"
      : message.includes("Stage 2 of 3")
        ? "sectors"
        : message.includes("Stage 3 of 3")
          ? "factions"
          : message.includes(DUNGEON_REVIEW_MARKER)
            ? "review"
            : "repair";
    const reply = replies[stage]?.(counts[stage]++, message);
    if (reply === undefined) throw new Error("no reply");
    return typeof reply === "string" ? reply : JSON.stringify(reply);
  };
  return { complete, calls };
}

describe("generateDungeonStaged", () => {
  it("runs three stages and keeps the fixed plan", async () => {
    const resolved = setup();
    const s = script({
      foundation: () => foundation(resolved),
      sectors: () => sectors(resolved),
      factions: () => factions(resolved),
      review: () => ({ issues: [] }),
    });
    const result = await generateDungeonStaged(resolved, OPTIONS, {
      complete: s.complete,
    });
    expect(result).not.toBeNull();
    expect(result!.stats.aiCalls).toBe(4);
    expect(result!.stats.outcome).toBe("staged");
    expect(result!.stats.reviewSkipped).toBe(false);
    expect(result!.stats.coherenceRepaired).toBe(false);
    expect(result!.structured.sectors.map((x) => x.id)).toEqual(
      resolved.sectors.map((x) => x.id),
    );
    expect(result!.structured.sectors.map((x) => x.stockType)).toEqual(
      resolved.sectors.map((x) => x.stockType),
    );
    // The model's "WRONG" drive is overridden by the fixed input.
    expect(result!.structured.factions.map((f) => f.drive)).toEqual(
      resolved.factions.map((f) => f.drive),
    );
    expect(result!.output.kind).toBe("dungeon");
    expect(result!.output.title).toBe("The Glasswrights' Descent");
    expect(result!.output.content).toContain("Hollow 1");
  });

  it("passes validated earlier output into the next stage", async () => {
    const resolved = setup();
    const s = script({
      foundation: () => foundation(resolved),
      sectors: () => sectors(resolved),
      factions: () => factions(resolved),
    });
    await generateDungeonStaged(resolved, OPTIONS, {
      complete: s.complete,
      contextPrefix: "VAULT-CTX\n",
    });
    expect(s.calls[1]).toContain("The furnace feeds on whoever tends it.");
    expect(s.calls[2]).toContain("Hollow 1");
    expect(s.calls[2]).toContain("Scalding steam vents");
    expect(s.calls.every((c) => c.includes("VAULT-CTX"))).toBe(true);
  });

  it("repairs a faction that invents a new room, then accepts the fix", async () => {
    const resolved = setup();
    const s = script({
      foundation: () => foundation(resolved),
      sectors: () => sectors(resolved),
      factions: (n) =>
        n === 0
          ? factions(resolved, {
              goal: "Break into the Obsidian Vault beneath the furnace",
            })
          : factions(resolved),
    });
    const result = await generateDungeonStaged(resolved, OPTIONS, {
      complete: s.complete,
    });
    expect(result!.stats.repairedStages).toEqual(["factions"]);
    expect(result!.stats.remainingIssues).toEqual([]);
    expect(s.calls[3]).toContain("Obsidian Vault");
    expect(result!.structured.factions[0].goal).not.toContain("Obsidian");
  });

  it("uses the coherence repair when the invented room persists", async () => {
    const resolved = setup();
    const bad = factions(resolved, {
      goal: "Break into the Obsidian Vault beneath the furnace",
    });
    const s = script({
      foundation: () => foundation(resolved),
      sectors: () => sectors(resolved),
      factions: () => bad,
      repair: () => {
        const fixed = factions(resolved);
        fixed.factions.forEach(
          (f, i) => (f.drive = resolved.factions[i].drive),
        );
        return { ...foundation(resolved), ...sectors(resolved), ...fixed };
      },
    });
    const result = await generateDungeonStaged(resolved, OPTIONS, {
      complete: s.complete,
    });
    expect(result!.stats.coherenceRepaired).toBe(true);
    expect(result!.stats.remainingIssues).toEqual([]);
  });

  it("keeps the first valid draft when the retry is unusable", async () => {
    const resolved = setup();
    const s = script({
      foundation: () => foundation(resolved),
      sectors: () => sectors(resolved),
      factions: (n) =>
        n === 0
          ? factions(resolved, {
              goal: "Break into the Obsidian Vault beneath the furnace",
            })
          : "not json",
      repair: () => "not json",
    });
    const result = await generateDungeonStaged(resolved, OPTIONS, {
      complete: s.complete,
    });
    expect(result).not.toBeNull();
    expect(result!.stats.remainingIssues.length).toBeGreaterThan(0);
  });

  it("returns null when sectors are missing", async () => {
    const resolved = setup();
    const s = script({
      foundation: () => foundation(resolved),
      sectors: () => ({
        ...sectors(resolved),
        sectors: sectors(resolved).sectors.slice(0, 1),
      }),
      factions: () => factions(resolved),
    });
    expect(
      await generateDungeonStaged(resolved, OPTIONS, { complete: s.complete }),
    ).toBeNull();
    expect(s.calls.some((c) => c.includes("Stage 3 of 3"))).toBe(false);
  });

  it("returns null when a faction claims a sector that does not exist", async () => {
    const resolved = setup();
    const s = script({
      foundation: () => foundation(resolved),
      sectors: () => sectors(resolved),
      factions: () => {
        const f = factions(resolved);
        f.factions[0].territorySectorIds = ["sector-99"];
        return f;
      },
    });
    expect(
      await generateDungeonStaged(resolved, OPTIONS, { complete: s.complete }),
    ).toBeNull();
  });

  it("returns null when a stage fails outright", async () => {
    const resolved = setup();
    const noSectors = script({ foundation: () => foundation(resolved) });
    expect(
      await generateDungeonStaged(resolved, OPTIONS, {
        complete: noSectors.complete,
      }),
    ).toBeNull();
    const badFoundation = script({ foundation: () => "{ nope" });
    expect(
      await generateDungeonStaged(resolved, OPTIONS, {
        complete: badFoundation.complete,
      }),
    ).toBeNull();
  });

  it("rejects foundations whose sector briefs do not match the plan", async () => {
    const resolved = setup();
    const s = script({
      foundation: () => ({
        ...foundation(resolved),
        sectorBriefs: [{ id: "sector-9", brief: "x" }],
      }),
    });
    expect(
      await generateDungeonStaged(resolved, OPTIONS, { complete: s.complete }),
    ).toBeNull();
    expect(s.calls).toHaveLength(2);
  });

  it("reports each stage as it runs, including a retry", async () => {
    const resolved = setup();
    const s = script({
      foundation: () => foundation(resolved),
      sectors: (n) => (n === 0 ? "not json" : sectors(resolved)),
      factions: () => factions(resolved),
    });
    const updates: StagedProgressStep[][] = [];
    await generateDungeonStaged(resolved, OPTIONS, {
      complete: s.complete,
      onProgress: (steps) => updates.push(steps),
    });
    const ids = ["foundation", "sectors", "factions", "coherence"];
    expect(updates[0].map((x) => [x.id, x.status])).toEqual(
      ids.map((id) => [id, "pending"]),
    );
    expect(updates).toContainEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "sectors",
          status: "active",
          detail: "fixing problems",
        }),
      ]),
    );
    expect(updates.at(-1)!.map((x) => x.status)).toEqual(ids.map(() => "done"));
  });

  it("marks the failed stage and skips the rest when it gives up", async () => {
    const resolved = setup();
    const s = script({ foundation: () => foundation(resolved) });
    const updates: StagedProgressStep[][] = [];
    const result = await generateDungeonStaged(resolved, OPTIONS, {
      complete: s.complete,
      onProgress: (steps) => updates.push(steps),
    });
    expect(result).toBeNull();
    expect(updates.at(-1)!.map((x) => [x.id, x.status])).toEqual([
      ["foundation", "done"],
      ["sectors", "fallback"],
      ["factions", "skipped"],
      ["coherence", "skipped"],
    ]);
  });

  it("passes the fixed layout to the sector and faction stages", async () => {
    const resolved = setup();
    const s = script({
      foundation: () => foundation(resolved),
      sectors: () => sectors(resolved),
      factions: () => factions(resolved),
    });
    await generateDungeonStaged(resolved, OPTIONS, { complete: s.complete });
    const edge = resolved.sectorEdges[0];
    expect(s.calls[1]).toContain(
      `sector-${edge.from + 1} ↔ sector-${edge.to + 1}`,
    );
    expect(s.calls[2]).toContain("sector-1 (Hollow 1) ↔ sector-2 (Hollow 2)");
  });

  it("writes each faction's presence into the sectors it holds", async () => {
    const resolved = setup();
    const s = script({
      foundation: () => foundation(resolved),
      sectors: () => sectors(resolved),
      factions: () => factions(resolved),
      review: () => ({ issues: [] }),
    });
    const result = await generateDungeonStaged(resolved, OPTIONS, {
      complete: s.complete,
    });
    expect(result!.structured.sectors[0].presence).toEqual([
      {
        faction: "Lantern Wrights",
        detail: "Lantern Wrights camp in sector-1.",
      },
    ]);
    expect(result!.structured.sectors[2].presence).toBeUndefined();
    expect(result!.output.content).toContain(
      "**Held by Lantern Wrights:** Lantern Wrights camp in sector-1.",
    );
    // The rendered layout is the planned one, not a re-roll.
    const shortcut = resolved.sectorEdges.find((e) => e.to !== e.from + 1);
    if (shortcut) expect(result!.output.lore).toContain(shortcut.via);
  });

  it("asks again when a faction says nothing about a sector it holds", async () => {
    const resolved = setup();
    const s = script({
      foundation: () => foundation(resolved),
      sectors: () => sectors(resolved),
      factions: (n) => {
        const f = factions(resolved);
        if (n === 0) f.factions[1].presence = [];
        return f;
      },
    });
    const result = await generateDungeonStaged(resolved, OPTIONS, {
      complete: s.complete,
    });
    expect(result!.stats.repairedStages).toEqual(["factions"]);
    expect(s.calls[3]).toContain(
      "Weir Wardens holds sector-2 but its presence says nothing",
    );
  });

  it("repairs what the review finds and records it", async () => {
    const resolved = setup();
    const s = script({
      foundation: () => foundation(resolved),
      sectors: () => sectors(resolved),
      factions: () => factions(resolved),
      review: () => ({
        issues: ["history never says how the tide broke the descent"],
      }),
      repair: () => {
        const fixed = factions(resolved);
        fixed.factions.forEach(
          (f, i) => (f.drive = resolved.factions[i].drive),
        );
        return {
          ...foundation(resolved),
          history: "A tide-gate failed during the first firing and flooded it.",
          ...sectors(resolved),
          ...fixed,
        };
      },
    });
    const result = await generateDungeonStaged(resolved, OPTIONS, {
      complete: s.complete,
    });
    expect(result!.stats.reviewIssues).toEqual([
      "history never says how the tide broke the descent",
    ]);
    expect(result!.stats.coherenceRepaired).toBe(true);
    expect(s.calls.at(-1)).toContain("history never says how the tide");
    expect(result!.structured.history).toContain("tide-gate");
    // The repair answer omitted presence; it is carried over.
    expect(result!.structured.sectors[0].presence?.[0].faction).toBe(
      "Lantern Wrights",
    );
  });

  it("uses the review's retry when the first answer is unreadable", async () => {
    const resolved = setup();
    const s = script({
      foundation: () => foundation(resolved),
      sectors: () => sectors(resolved),
      factions: () => factions(resolved),
      review: (n) => (n === 0 ? "no idea" : { issues: [] }),
    });
    const result = await generateDungeonStaged(resolved, OPTIONS, {
      complete: s.complete,
    });
    expect(result!.stats.reviewSkipped).toBe(false);
    expect(result!.stats.aiCalls).toBe(5);
  });

  it("keeps one presence per sector and drops sectors the faction does not hold", async () => {
    const resolved = setup();
    const s = script({
      foundation: () => foundation(resolved),
      sectors: () => sectors(resolved),
      factions: () => {
        const f = factions(resolved);
        f.factions[0].presence = [
          { sectorId: "sector-1", detail: "First camp." },
          { sectorId: "sector-1", detail: "Second camp." },
          { sectorId: "sector-3", detail: "Not theirs." },
        ];
        return f;
      },
      review: () => ({ issues: [] }),
    });
    const result = await generateDungeonStaged(resolved, OPTIONS, {
      complete: s.complete,
    });
    expect(result!.structured.sectors[0].presence).toEqual([
      { faction: "Lantern Wrights", detail: "First camp." },
    ]);
    expect(result!.structured.sectors[2].presence).toBeUndefined();
  });

  it("keeps the assembled delve when the review cannot be read", async () => {
    const resolved = setup();
    const s = script({
      foundation: () => foundation(resolved),
      sectors: () => sectors(resolved),
      factions: () => factions(resolved),
      review: () => "no idea",
    });
    const result = await generateDungeonStaged(resolved, OPTIONS, {
      complete: s.complete,
    });
    expect(result!.stats.reviewSkipped).toBe(true);
    expect(result!.stats.coherenceRepaired).toBe(false);
    // The review is retried once, like every stage.
    expect(s.calls).toHaveLength(5);
  });

  it("reports stats for a run that falls back, naming where it stopped", async () => {
    const resolved = setup();
    const s = script({ foundation: () => foundation(resolved) });
    const seen: unknown[] = [];
    await generateDungeonStaged(resolved, OPTIONS, {
      complete: s.complete,
      onStats: (stats) => seen.push(stats),
    });
    expect(seen).toEqual([
      expect.objectContaining({ outcome: "fell-back", stoppedAt: "sectors" }),
    ]);
  });

  it("throws on abort and returns nothing", async () => {
    const resolved = setup();
    const ctl = new AbortController();
    const s = script({
      foundation: () => {
        ctl.abort();
        return foundation(resolved);
      },
    });
    await expect(
      generateDungeonStaged(resolved, OPTIONS, {
        complete: s.complete,
        signal: ctl.signal,
      }),
    ).rejects.toBeDefined();
    expect(s.calls).toHaveLength(1);
  });
});

describe("stage checks", () => {
  it("accepts 2–3 hazards, treasures and hooks", () => {
    const resolved = setup();
    const data = sectors(resolved);
    expect(checkSectors(data, resolved).hard).toEqual([]);

    for (const key of ["hazards", "treasures", "hooks"] as const) {
      const threeEntries = { ...data, [key]: [...data[key], "A third entry"] };
      expect(checkSectors(threeEntries, resolved).hard).toEqual([]);
    }
  });

  it("rejects fewer than 2 or more than 3 hazards, treasures and hooks", () => {
    const resolved = setup();
    const data = sectors(resolved);

    for (const key of ["hazards", "treasures", "hooks"] as const) {
      for (const count of [1, 4]) {
        const entries = [...data[key], "Third entry", "Fourth entry"];
        const invalidCount = { ...data, [key]: entries.slice(0, count) };
        expect(checkSectors(invalidCount, resolved).hard).toContain(
          `${key} must contain 2–3 entries, got ${count}`,
        );
      }
    }
  });

  it("flags sector ids that are out of order or invalid", () => {
    const resolved = setup();
    const data = sectors(resolved);
    data.sectors[0].id = "sector-7";
    expect(checkSectors(data, resolved).hard[0]).toMatch(/must be exactly/);
  });

  it("flags a faction goal to acquire what its own territory holds", () => {
    const resolved = setup();
    const d = { ...foundation(resolved), ...sectors(resolved) };
    const inventory = {
      title: d.title,
      history: d.history,
      currentState: d.currentState,
      signatureFeature: d.signatureFeature,
      secret: d.secret,
      hazards: d.hazards,
      treasures: d.treasures,
    };
    const secs = d.sectors.map((s) => ({ ...s, stockType: "Trap" as const }));
    const issues = checkFactionGrounding(
      [
        {
          ...faction(
            "Lantern Wrights",
            [secs[0].id],
            "Secure the unique brass idol number 1",
          ),
          territorySectorIds: [secs[0].id],
          presence: undefined,
        },
      ],
      "Lantern Wrights wants it.",
      { ...inventory, sectors: secs },
    );
    expect(issues.join()).toMatch(/already in its own territory/);
    const explained = checkFactionGrounding(
      [
        {
          ...faction(
            "Lantern Wrights",
            [secs[0].id],
            "Recover the unique brass idol number 1 from its sealed cradle",
          ),
          presence: undefined,
        },
      ],
      "x",
      { ...inventory, sectors: secs },
    );
    expect(explained).toEqual([]);
  });

  it("flags references to sector ids that do not exist", () => {
    const resolved = setup();
    const secs = sectors(resolved).sectors.map((s) => ({
      ...s,
      stockType: "Trap" as const,
    }));
    const data = factions(resolved, {
      goal: "Hold sector-42 against all comers",
    });
    const check = checkFactions(data, resolved, secs, {
      title: "t",
      history: "h",
      currentState: "c",
      signatureFeature: "s",
      secret: "x",
      hazards: [],
      treasures: [],
    });
    expect(check.soft.join()).toMatch(/sector-42/);
  });
});
