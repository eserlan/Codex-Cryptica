import { describe, expect, it } from "vitest";
import {
  checkFactionGrounding,
  checkFactions,
  checkSectors,
  generateDungeonStaged,
} from "./dungeon-staged";
import { buildDungeonPrompt, type ResolvedDungeon } from "./public-dungeon";

const OPTIONS = { genre: "Classic Fantasy", scale: "Sprawling" };

function setup() {
  const { resolved } = buildDungeonPrompt(OPTIONS);
  return resolved;
}

function foundation(resolved: ResolvedDungeon) {
  return {
    title: "The Glasswrights' Descent",
    summary: "A drowned workshop that still hums.",
    throughline:
      "Glasswrights dug it, the tide broke it, now two crews fight over it.",
    history: "Glasswrights cut the descent to temper glass in the deep heat.",
    currentState: "Contested by two crews.",
    signatureFeature: "A furnace that burns blue without fuel.",
    secret: "The furnace feeds on whoever tends it.",
    sectorBriefs: resolved.sectors.map((s) => ({
      id: s.id,
      brief: `Role of ${s.id}.`,
    })),
  };
}

function sectors(resolved: ResolvedDungeon) {
  return {
    sectors: resolved.sectors.map((s, i) => ({
      id: s.id,
      name: `Hollow ${i + 1}`,
      description: `Description of hollow ${i + 1}.`,
      stockType: "Trap",
      stockDetail: `Unique brass idol number ${i + 1}`,
    })),
    hazards: ["Scalding steam vents"],
    treasures: ["A glassblower's signet"],
    hooks: ["A guild offers a bounty"],
  };
}

function faction(
  name: string,
  territory: string[],
  goal = "Cap the steam vents",
) {
  return {
    name,
    identity: "A crew of salvagers.",
    virtue: "Patient",
    vice: "Greedy",
    goal,
    drive: "WRONG",
    obstacle: "Scalding steam vents block the lower hollows.",
    origin: "Came for the glass after the tide.",
    belief: "The furnace can be tamed.",
    territorySectorIds: territory,
    strength: "Heat-proof gear.",
    leader: { name: `${name} Lead`, description: "Runs the crew." },
    notable: { name: `${name} Second`, description: "Keeps the books." },
    relationship: "Stalls the rivals while mapping the vents.",
  };
}

function factions(
  resolved: ResolvedDungeon,
  override: Partial<ReturnType<typeof faction>> = {},
) {
  const [a, b] = [resolved.sectors[0].id, resolved.sectors[1].id];
  return {
    factionSituation: "Lantern Wrights and Weir Wardens both want the furnace.",
    factions: [
      { ...faction("Lantern Wrights", [a]), ...override },
      faction(
        "Weir Wardens",
        [b],
        "Seal the signet away from the Lantern Wrights",
      ),
    ],
  };
}

type Reply = (n: number, message: string) => unknown;
function script(replies: {
  foundation?: Reply;
  sectors?: Reply;
  factions?: Reply;
  repair?: Reply;
}) {
  const calls: string[] = [];
  const counts = { foundation: 0, sectors: 0, factions: 0, repair: 0 };
  const complete = async (_sys: string, message: string) => {
    calls.push(message);
    const stage = message.includes("Stage 1 of 3")
      ? "foundation"
      : message.includes("Stage 2 of 3")
        ? "sectors"
        : message.includes("Stage 3 of 3")
          ? "factions"
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
    });
    const result = await generateDungeonStaged(resolved, OPTIONS, {
      complete: s.complete,
    });
    expect(result).not.toBeNull();
    expect(result!.stats.aiCalls).toBe(3);
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
