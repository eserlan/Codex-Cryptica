import { describe, expect, it } from "vitest";
import {
  assembleAdventure,
  checkCast,
  checkConsequences,
  checkSituation,
  generateAdventureStaged,
  sameName,
  type AdventureStagedStats,
} from "./adventure-staged";
import { generateAdventureGraphTopology } from "./adventure/adventure-graph-generator";
import {
  buildAdventurePrompt,
  type AdventureGeneratorOptions,
} from "./public-adventure";
import type { StagedProgressStep } from "./staged-progress";

type Json = Record<string, unknown>;

const SITUATION: Json = {
  title: "The Tithe of Lantern Ford",
  summary:
    "A river toll-house holds the proof that a mill guild poisoned the ford.",
  throughline:
    "Guildmaster Oren Pell fouled the ford to seize the toll, and the proof is split between his mill and the toll-house before the magistrate's audit.",
  initialSituation:
    "Two halves of a sealed assay are split: one at the Weir Mill, one in the Lantern Toll-House. The party are hired by the ferry folk.",
  primaryObjective:
    "Recover both halves of the assay before the audit at dawn, or the guild's claim stands.",
  assets: [
    {
      name: "First assay half",
      status: "essential",
      place: "Weir Mill",
      heldBy: "Oren Pell",
    },
    {
      name: "Second assay half",
      status: "essential",
      place: "Lantern Toll-House",
      heldBy: "",
    },
  ],
};

const location = (name: string) => ({
  name,
  description: "Wet stone and lamplight.",
  role: "Holds part of the proof.",
  relation: "Tied to Oren Pell.",
  leverage: "Bribe the night clerk.",
  dilemma: "Speed or stealth.",
});
const npc = (name: string) => ({
  name,
  role: "Mill guildmaster",
  relation: "Owns the Weir Mill.",
  goal: "Keep the toll",
  secret: "Fouled the ford himself.",
  leverage: "His debts.",
  dilemma: "Expose him or bargain.",
});

const CAST: Json = {
  keyLocations: [location("Weir Mill"), location("Lantern Toll-House")],
  npcs: [npc("Oren Pell"), npc("Mira Tallow")],
};

const entry = (title: string, involves: string[] = ["Oren Pell"]) => ({
  title,
  text: `${title} happens before dawn.`,
  involves,
});

const CONSEQUENCES: Json = {
  threats: [entry("Guild Bravos")],
  discoveries: [
    { ...entry("Sluice Ledger"), opens: "the Weir Mill's lower sluice" },
    { ...entry("Clerk's Ink"), opens: "Lantern Toll-House records" },
  ],
  complications: [entry("Rising Water"), entry("Ferry Strike")],
  rewards: [
    {
      title: "Toll Share",
      text: "A cut of the ford toll.",
      involves: ["Weir Mill"],
    },
  ],
  outcomes: [entry("Guild Broken"), entry("Guild Triumphant")],
  hooks: [
    {
      title: "Ferry Plea",
      text: "The ferry folk beg for help.",
      involves: ["Oren Pell"],
    },
    {
      title: "Bounty",
      text: "The magistrate pays for the proof.",
      involves: ["Lantern Toll-House"],
    },
  ],
};

/**
 * A model that answers each stage from `replies[stage][attempt]`, falling
 * back to the clean reply, and records every message it was sent.
 */
function fakeModel(
  replies: Partial<Record<1 | 2 | 3, (string | Json)[]>> = {},
) {
  const sent: { stage: number; message: string }[] = [];
  const clean: Record<number, Json> = {
    1: SITUATION,
    2: CAST,
    3: CONSEQUENCES,
  };
  const complete = async (_system: string, message: string) => {
    const stage = Number(message.match(/STAGE (\d) OF 3/)?.[1]);
    const attempt = sent.filter((s) => s.stage === stage).length;
    sent.push({ stage, message });
    const reply = replies[stage as 1 | 2 | 3]?.[attempt] ?? clean[stage];
    return typeof reply === "string" ? reply : JSON.stringify(reply);
  };
  return { complete, sent };
}

const OPTIONS: AdventureGeneratorOptions = {
  themeId: "fantasy",
  archetype: "Investigation & Mystery",
  scale: "Short Arc (2-3 Sessions)",
  tone: "Grim",
};

async function run(
  model = fakeModel(),
  options: AdventureGeneratorOptions = OPTIONS,
  extra: { signal?: AbortSignal } = {},
) {
  const progress: StagedProgressStep[][] = [];
  let stats: AdventureStagedStats | undefined;
  let clock = 1000;
  const result = await generateAdventureStaged(
    buildAdventurePrompt(options),
    options,
    {
      complete: model.complete,
      onProgress: (s) => progress.push(s),
      onStats: (s) => (stats = s),
      now: () => (clock += 250),
      ...extra,
    },
  );
  return { result, progress, stats, sent: model.sent };
}

describe("generateAdventureStaged", () => {
  it("writes the adventure in three calls, in the one-pass shape", async () => {
    const { result, stats, progress } = await run();
    expect(result).not.toBeNull();
    const output = result!.output;
    expect(output.title).toBe("The Tithe of Lantern Ford");
    expect(output.aiFallback).toBeUndefined();
    for (const heading of [
      "## Initial Situation",
      "## Primary Objective & Pressure",
      "## Key Locations",
      "## Important NPCs & Factions",
      "## Threats & Antagonists",
      "## Clues, Secrets & Discoveries",
    ]) {
      expect(output.content).toContain(heading);
    }
    expect(output.lore).toContain("### Possible Outcomes");
    expect(output.content).toContain("**Guild Bravos**: Guild Bravos happens");
    expect(stats).toMatchObject({
      outcome: "staged",
      aiCalls: 3,
      repairedStages: [],
      elapsedMs: 250,
    });
    expect(progress[0].map((s) => s.status)).toEqual([
      "pending",
      "pending",
      "pending",
    ]);
    expect(progress.at(-1)!.every((s) => s.status === "done")).toBe(true);
  });

  it("stays compatible with the Adventure Canvas converter", async () => {
    const { result } = await run();
    const doc = generateAdventureGraphTopology(result!.output, {
      now: () => 1,
    });
    const labels = doc.nodes.map((n) => JSON.stringify(n));
    expect(labels.some((l) => l.includes("Weir Mill"))).toBe(true);
    expect(labels.some((l) => l.includes("Oren Pell"))).toBe(true);
  });

  it("passes each stage's validated output to the stages after it", async () => {
    const { sent } = await run();
    expect(sent.map((s) => s.stage)).toEqual([1, 2, 3]);
    expect(sent[0].message).not.toContain("Established in earlier stages");
    expect(sent[1].message).toContain('"place": "Weir Mill"');
    expect(sent[2].message).toContain('"name": "Mira Tallow"');
    expect(sent[2].message).toContain("Recover both halves of the assay");
  });

  it("keeps the stage-1 objective when a later stage tries to change it", async () => {
    const { result } = await run(
      fakeModel({
        2: [{ ...CAST, primaryObjective: "Burn the mill down.", title: "X" }],
      }),
    );
    expect(result!.output.title).toBe("The Tithe of Lantern Ford");
    expect(result!.output.content).toContain(
      "Recover both halves of the assay",
    );
    expect(result!.output.content).not.toContain("Burn the mill down");
  });

  it("retries when a split asset's place has no location card", async () => {
    const missingToll = {
      ...CAST,
      keyLocations: [location("Weir Mill"), location("Old Chapel")],
    };
    const { result, stats, sent } = await run(fakeModel({ 2: [missingToll] }));
    expect(result).not.toBeNull();
    expect(stats!.repairedStages).toEqual(["cast"]);
    expect(sent[2].message).toContain(
      '"Second assay half" is at "Lantern Toll-House", which needs its own keyLocations card',
    );
    expect(sent[2].message).toContain('"name": "Old Chapel"');
  });

  it("falls back when the target location never appears", async () => {
    const missingToll = {
      ...CAST,
      keyLocations: [location("Weir Mill"), location("Old Chapel")],
    };
    const { result, stats, progress, sent } = await run(
      fakeModel({ 2: [missingToll, missingToll] }),
    );
    expect(result).toBeNull();
    expect(stats).toMatchObject({
      outcome: "fell-back",
      stoppedAt: "cast",
      aiCalls: 3,
    });
    expect(sent.map((s) => s.stage)).toEqual([1, 2, 2]);
    expect(progress.at(-1)!.map((s) => s.status)).toEqual([
      "done",
      "fallback",
      "skipped",
    ]);
  });

  it("rejects an outcome that needs an NPC nobody introduced", async () => {
    const stranger = {
      ...CONSEQUENCES,
      outcomes: [entry("Guild Broken"), entry("Saint's Return", ["Saint Ivo"])],
    };
    const { result, stats, sent } = await run(fakeModel({ 3: [stranger] }));
    expect(result).not.toBeNull();
    expect(stats!.repairedStages).toEqual(["consequences"]);
    expect(sent.at(-1)!.message).toContain(
      'outcomes[1] involves "Saint Ivo", which earlier stages never established',
    );
    expect(result!.output.lore).not.toContain("Saint's Return");
  });

  it("keeps the given situation's names and deadline binding", async () => {
    const options = {
      ...OPTIONS,
      seed: "Captain Hale must reach Greywater before the flood crest in three days.",
    };
    const drifted = {
      ...SITUATION,
      summary: "Smugglers move goods.",
      primaryObjective: "Find the smugglers' cache.",
    };
    // The retry gets the clean contract, which has a deadline but still
    // none of the seed's names, so the run gives up: no phantom success.
    const { result, stats, sent } = await run(
      fakeModel({ 1: [drifted] }),
      options,
    );
    expect(result).toBeNull();
    expect(stats!.stoppedAt).toBe("situation");
    expect(sent[1].message).toContain(
      "drops these names from the given situation",
    );
    expect(sent[1].message).toContain("carries no pressure");
  });

  it("accepts a contract that honours the given situation", async () => {
    const options = {
      ...OPTIONS,
      seed: "Captain Hale must reach Greywater before the flood crest in three days.",
    };
    const honoured = {
      ...SITUATION,
      initialSituation: `${SITUATION.initialSituation} Captain Hale needs it in Greywater.`,
      primaryObjective:
        "Get both halves to Captain Hale in Greywater before the flood crest.",
    };
    const { result } = await run(fakeModel({ 1: [honoured] }), options);
    expect(result).not.toBeNull();
    expect(result!.output.content).toContain("Captain Hale");
  });

  it("asks for a clock in the threats when the objective has one", async () => {
    const noClock = {
      ...CONSEQUENCES,
      threats: [
        { title: "Guild Bravos", text: "Thugs.", involves: ["Oren Pell"] },
      ],
      complications: [
        {
          title: "Rising Water",
          text: "The ford floods.",
          involves: ["Weir Mill"],
        },
        {
          title: "Ferry Strike",
          text: "No boats.",
          involves: ["Lantern Toll-House"],
        },
      ],
    };
    const { stats, sent } = await run(fakeModel({ 3: [noClock] }));
    expect(stats!.repairedStages).toEqual(["consequences"]);
    expect(sent.at(-1)!.message).toContain(
      "Primary objective deadline/clock must be integrated",
    );
  });

  it("keeps a usable draft when the retry comes back unreadable", async () => {
    const noClock = {
      ...CONSEQUENCES,
      threats: [
        {
          title: "Guild Bravos",
          text: "They block the bridge.",
          involves: ["Oren Pell"],
        },
      ],
      complications: [
        {
          title: "Rising Water",
          text: "The ford floods.",
          involves: ["Weir Mill"],
        },
        {
          title: "Ferry Strike",
          text: "No boats are working.",
          involves: ["Lantern Toll-House"],
        },
      ],
    };
    const { result, stats, sent } = await run(
      fakeModel({ 3: [noClock, "not json"] }),
    );
    expect(sent.map((s) => s.stage)).toEqual([1, 2, 3, 3]);
    expect(result).not.toBeNull();
    expect(result!.output.lore).toContain("Ferry Strike");
    expect(stats!.repairedStages).toEqual(["consequences"]);
  });

  it("falls back when stage 1 is never readable", async () => {
    const { result, stats } = await run(fakeModel({ 1: ["nope", "still no"] }));
    expect(result).toBeNull();
    expect(stats).toMatchObject({ stoppedAt: "situation", aiCalls: 2 });
  });

  it("stops on cancellation without reporting or returning partial work", async () => {
    const controller = new AbortController();
    const model = fakeModel();
    const complete = async (system: string, message: string) => {
      const reply = await model.complete(system, message);
      if (message.includes("STAGE 2 OF 3")) controller.abort();
      return reply;
    };
    let reported = false;
    await expect(
      generateAdventureStaged(buildAdventurePrompt(OPTIONS), OPTIONS, {
        complete,
        signal: controller.signal,
        onStats: () => (reported = true),
      }),
    ).rejects.toThrow();
    expect(reported).toBe(false);
    expect(model.sent.map((s) => s.stage)).toEqual([1, 2]);
  });

  it("puts the caller's context before every stage", async () => {
    const model = fakeModel();
    await generateAdventureStaged(buildAdventurePrompt(OPTIONS), OPTIONS, {
      complete: model.complete,
      contextPrefix: "VAULT CONTEXT: the Ash Kingdom.",
    });
    expect(
      model.sent.every((s) =>
        s.message.startsWith("VAULT CONTEXT: the Ash Kingdom."),
      ),
    ).toBe(true);
  });
});

describe("sameName", () => {
  it.each([
    ["Weir Mill", "the Weir Mill"],
    ["Lantern Toll-House", "lantern toll house"],
    ["Assay Office", "the Old Assay Office"],
    ["Oren Pell", "Guildmaster Oren Pell"],
    ["Hale", "Captain Hale"],
  ])("matches %s and %s", (a, b) => {
    expect(sameName(a, b)).toBe(true);
  });

  it.each([
    ["Weir Mill", "Old Chapel"],
    ["Ash", "Ashford Keep"],
    ["", "Weir Mill"],
    ["Oren", "Orenna Pell"],
  ])("does not match %s and %s", (a, b) => {
    expect(sameName(a, b)).toBe(false);
  });
});

describe("stage checks", () => {
  it("requires the situation fields and placed assets", () => {
    const result = checkSituation(
      { title: "T", assets: [{ name: "Relic" }] },
      OPTIONS,
      [],
    );
    expect(result.hard).toEqual([
      "missing required fields: summary, throughline, initialSituation, primaryObjective",
      'assets[0] needs a "name" and the "place" it is in right now',
    ]);
  });

  it("allows a situation with no assets, such as social pressure", () => {
    expect(checkSituation({ ...SITUATION, assets: [] }, OPTIONS, [])).toEqual({
      hard: [],
      soft: [],
    });
  });

  it("rejects assets spread over too many places", () => {
    const assets = ["A", "B", "C", "D"].map((p) => ({
      name: `${p} piece`,
      place: `${p} Tower`,
    }));
    expect(checkSituation({ ...SITUATION, assets }, OPTIONS, []).hard).toEqual([
      "objective assets are spread over more than 3 places; use at most 3",
    ]);
  });

  it("flags names reused from the session", () => {
    const result = checkSituation(SITUATION, OPTIONS, ["Lantern Ford"]);
    expect(result.hard).toEqual([
      "reuses names already used elsewhere in this session: Lantern Ford",
    ]);
  });

  it("requires every asset holder in the cast", () => {
    const result = checkCast(
      { ...CAST, npcs: [npc("Mira Tallow"), npc("Dov Reed")] },
      SITUATION,
      [],
    );
    expect(result.hard).toEqual([
      '"First assay half" is held by "Oren Pell", who needs their own npcs entry with that name',
    ]);
  });

  it("lets a faction share a word with its base", () => {
    const result = checkCast(
      { ...CAST, npcs: [npc("Oren Pell"), npc("Weir Mill Guild")] },
      SITUATION,
      [],
    );
    expect(result.hard).toEqual([]);
  });

  it("flags duplicate names and missing dilemmas", () => {
    const result = checkCast(
      {
        keyLocations: [location("Weir Mill"), location("Lantern Toll-House")],
        npcs: [npc("Oren Pell"), { ...npc("the Weir Mill"), dilemma: "" }],
      },
      SITUATION,
      [],
    );
    expect(result.hard).toEqual([
      "npcs[1] is missing: dilemma",
      "each name must be distinct: the Weir Mill",
    ]);
  });

  it("accepts any count in range and rejects one outside it", () => {
    expect(checkCast(CAST, SITUATION, [])).toEqual({ hard: [], soft: [] });
    const crowded = {
      ...CAST,
      npcs: ["Oren Pell", "A Reed", "B Reed", "C Reed"].map(npc),
    };
    expect(checkCast(crowded, SITUATION, []).hard).toEqual([
      "write 2-3 npcs (got 4)",
    ]);
  });

  const established = ["Weir Mill", "Lantern Toll-House", "Oren Pell"];

  it("lets established names through", () => {
    const d = {
      ...CONSEQUENCES,
      threats: [entry("Bravos", ["the Weir Mill"])],
    };
    expect(checkConsequences(d, established, () => [])).toEqual({
      hard: [],
      soft: [],
    });
  });

  it.each([
    "threats",
    "discoveries",
    "complications",
    "rewards",
    "outcomes",
    "hooks",
  ] as const)("requires %s to say what it involves", (list) => {
    const d = {
      ...CONSEQUENCES,
      [list]: [{ title: "Bravos", text: "Thugs." }],
    };
    expect(checkConsequences(d, established, () => []).hard).toContain(
      `${list}[0] should list in "involves" the established names it depends on`,
    );
  });

  it.each([
    "threats",
    "discoveries",
    "complications",
    "rewards",
    "outcomes",
    "hooks",
  ] as const)("rejects unknown names in %s", (list) => {
    const d = {
      ...CONSEQUENCES,
      [list]: [entry("Bravos", ["Ferry Guild"])],
    };
    expect(checkConsequences(d, established, () => []).hard).toContain(
      `${list}[0] involves "Ferry Guild", which earlier stages never established; use only established places, people and assets`,
    );
  });

  it("rejects an unknown name in a complication", () => {
    const d = {
      ...CONSEQUENCES,
      complications: [entry("Rising Water"), entry("Strike", ["Ferry Guild"])],
    };
    const result = checkConsequences(d, established, () => []);
    expect(result.hard).toHaveLength(1);
  });

  it("requires each discovery to open something", () => {
    const d = {
      ...CONSEQUENCES,
      discoveries: [entry("Ledger"), { ...entry("Ink"), opens: "Weir Mill" }],
    };
    expect(checkConsequences(d, established, () => []).hard).toEqual([
      'discoveries[0] needs "opens": the established place, person or route it opens up, or the decision it changes',
    ]);
  });

  it("only retries over the one-pass problems this stage can fix", () => {
    const result = checkConsequences(CONSEQUENCES, established, () => [
      "Primary objective deadline/clock must be integrated into threats or complications.",
      "Title 'X' references aquatic/flooding keywords but the adventure context has no corresponding aquatic/flooding elements.",
    ]);
    expect(result.soft).toEqual([
      "Primary objective deadline/clock must be integrated into threats or complications.",
    ]);
  });

  it("skips the assembled checks while hard problems remain", () => {
    let assembled = false;
    checkConsequences({}, established, () => {
      assembled = true;
      return [];
    });
    expect(assembled).toBe(false);
  });
});

describe("assembleAdventure", () => {
  it("renders consequence entries in the one-pass list format", () => {
    const doc = assembleAdventure(SITUATION, CAST, {
      threats: [
        { title: "**Bravos**", text: "Thugs." },
        { text: "Bare text." },
      ],
    });
    expect(doc.threats).toEqual(["**Bravos**: Thugs.", "Bare text."]);
    expect(doc.discoveries).toEqual([]);
  });
});
