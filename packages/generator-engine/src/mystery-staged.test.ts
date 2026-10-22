import { describe, expect, it } from "vitest";
import { generateMysteryStaged } from "./mystery-staged";
import { resolveMystery } from "./public-mystery";

function validStages() {
  const foundation = {
    title: "The Quiet Bell",
    summary: "A keeper vanished before the winter bell.",
    centralQuestion: "Who changed the bell record?",
    openingHook: "The town asks the party to find its missing keeper.",
    perpetratorId: "person-1",
    truth: {
      perpetratorName: "Mara Quill",
      motive: "Hide a forged claim",
      means: "Changed the bell record",
      opportunity: "Held the archive key",
      constraints: "Could not leave the watch post",
      keyItem: "The bell record",
      keyItemLocation: "Archive",
      keyItemFate: "Burn it at the next full moon",
      recovery: "Search the archive vault or catch Mara carrying it",
      methodReason:
        "The archive is locked after hours, so a copied key was needed",
      disputedFact: "Whether the north pasture was common land",
      victimStatus:
        "The keeper is locked in the bell loft and can be freed with the spare key",
    },
    timeline: [
      "The record was copied",
      "The bell was rung",
      "The keeper disappeared",
    ],
    revelations: [
      ["record", "culprit"],
      ["bell", "motive"],
      ["key", "item"],
    ].map(([id, kind]) => ({ id, kind, fact: `${id} was altered` })),
  };
  const cast = {
    keyItemLocationId: "place-1",
    suspects: ["Mara Quill", "Oren Pike", "Sella Reed", "Tovin Elm"].map(
      (name, index) => ({
        id: `person-${index + 1}`,
        name,
        role: "clerk",
        publicFace: "A trusted local",
        startLocationId: `place-${(index % 3) + 1}`,
        motive: "Protect a secret",
        secret: "Knows a detail",
        alibi: "An account to test",
        knows: "One fact",
        believes: "A separate theory",
        approach: "Ask about the archive",
      }),
    ),
    locations: ["Archive", "Bell tower", "Ferry"].map((name, index) => ({
      id: `place-${index + 1}`,
      name,
      activity: "Public place",
      evidence: "Records can be checked",
    })),
  };
  const clues = {
    clues: Array.from({ length: 6 }, (_, index) => ({
      id: `clue-${index + 1}`,
      observation: `Trace ${index + 1}`,
      sourceId: `place-${index < 3 ? index + 1 : ((index - 2) % 3) + 1}`,
      supports: [["record", "bell", "key"][index % 3]],
      doesNotProve: "It does not identify the culprit",
      leadsTo: [`place-${((index + 1) % 3) + 1}`],
    })),
    independentPaths: ["record", "bell", "key"].flatMap(
      (revelationId, index) => [
        { revelationId, clueIds: [`clue-${index + 1}`] },
        { revelationId, clueIds: [`clue-${index + 4}`] },
      ],
    ),
  };
  const pressure = {
    escalation: "The watch will seal the archive at dawn.",
    pressureClock: [1, 2, 3].map((n) => ({
      trigger: `At step ${n}`,
      consequence: `A witness ${n} leaves`,
    })),
    npcResponses: [
      {
        personId: "person-2",
        trigger: "If asked about the key",
        response: "Oren shares the copied log",
      },
    ],
    outcomes: Object.fromEntries(
      ["correct", "partial", "mistaken", "failed", "unsolved"].map((key) => [
        key,
        {
          condition: `If ${key}`,
          consequence: `Then ${key}`,
          continuation:
            key === "unsolved" ? "A new record surfaces" : undefined,
        },
      ]),
    ),
  };
  return [foundation, cast, clues, pressure] as const;
}

describe("generateMysteryStaged", () => {
  it("keeps fixed truth locked and separates player content from GM lore", async () => {
    const [foundation, cast, clues, pressure] = validStages();
    const replies = [
      foundation,
      cast,
      clues,
      pressure,
      { status: "consistent", issues: [] },
      { status: "consistent", issues: [] },
    ];
    const result = await generateMysteryStaged(resolveMystery(), {
      complete: async () => JSON.stringify(replies.shift()),
    });

    expect(result?.output.content).toContain("People to Question");
    expect(result?.output.content).not.toContain("Responsible party");
    expect(result?.output.lore).toContain("Responsible party:** Mara Quill");
    expect(result?.output.content).toContain("Lead Graph (Adjacency List)");
    expect(result?.stats.aiCalls).toBe(6);
    expect(result?.stats.outcome).toBe("staged");
  });

  it("strips remote images from model controlled player and GM text before saving", async () => {
    const [foundation, cast, clues, pressure] = validStages();
    foundation.openingHook =
      "A clue appears ![tracker](https://tracker.example/pixel)";
    clues.clues[0].observation =
      'A mark <img src="https://tracker.example/pixel">';
    foundation.truth.motive =
      "Conceal a truth ![tracker](https://tracker.example/pixel)";
    const replies = [
      foundation,
      cast,
      clues,
      pressure,
      { status: "consistent", issues: [] },
      { status: "consistent", issues: [] },
    ];
    const result = await generateMysteryStaged(resolveMystery(), {
      complete: async () => JSON.stringify(replies.shift()),
    });

    expect(result?.output.content).not.toContain("https://tracker.example");
    expect(result?.output.content).not.toContain("<img");
    expect(result?.output.lore).not.toContain("https://tracker.example");
    expect(result?.output.lore).not.toContain("<img");
  });

  it("falls back when a required stage cannot pass validation", async () => {
    const progress: string[][] = [];
    const result = await generateMysteryStaged(resolveMystery(), {
      complete: async () => JSON.stringify({}),
      onProgress: (steps) => progress.push(steps.map((step) => step.status)),
    });

    expect(result).toBeNull();
    expect(progress.at(-1)?.[0]).toBe("fallback");
    expect(
      progress
        .at(-1)
        ?.slice(1)
        .every((status) => status === "skipped"),
    ).toBe(true);
  });

  it("rejects a revelation id that collides with a locked person id", async () => {
    const [foundation, cast] = validStages();
    foundation.revelations[0].id = "person-1";
    const replies = [foundation, cast, cast];
    let stoppedAt: string | undefined;
    const result = await generateMysteryStaged(resolveMystery(), {
      complete: async () => JSON.stringify(replies.shift()),
      onStats: (value) => (stoppedAt = value.stoppedAt),
    });

    expect(result).toBeNull();
    expect(stoppedAt).toBe("cast");
  });

  it("retries clue data whose ids collide with locked cast ids", async () => {
    const [foundation, cast, clues, pressure] = validStages();
    const collidingClues = {
      ...clues,
      clues: clues.clues.map((clue) =>
        clue.id === "clue-6" ? { ...clue, id: "person-4" } : clue,
      ),
      independentPaths: clues.independentPaths.map((path) => ({
        ...path,
        clueIds: path.clueIds.map((id) => (id === "clue-6" ? "person-4" : id)),
      })),
    };
    const replies = [
      foundation,
      cast,
      collidingClues,
      clues,
      pressure,
      { status: "consistent", issues: [] },
      { status: "consistent", issues: [] },
    ];
    const result = await generateMysteryStaged(resolveMystery(), {
      complete: async () => JSON.stringify(replies.shift()),
    });

    expect(result?.stats.repairedStages).toContain("mystery-clues");
    const nodeIds = result?.output.mysteryGraph?.nodes.map((node) => node.id);
    expect(nodeIds?.length).toBe(new Set(nodeIds).size);
  });

  it("replaces a route that does not support its revelation with one derived from the clues", async () => {
    const [foundation, cast, validClues, pressure] = validStages();
    const clues = {
      ...validClues,
      independentPaths: validClues.independentPaths.map((path, index) =>
        index === 0 ? { ...path, clueIds: ["clue-2"] } : path,
      ),
    };
    const replies = [
      foundation,
      cast,
      clues,
      pressure,
      { status: "consistent", issues: [] },
      { status: "consistent", issues: [] },
    ];
    const result = await generateMysteryStaged(resolveMystery(), {
      complete: async () => JSON.stringify(replies.shift()),
    });

    expect(result?.stats.aiCalls).toBe(6);
    expect(result?.output.content).toContain("**record:** clue-1");
  });

  it("stops at the clues when no two sources support a revelation", async () => {
    const [foundation, cast, validClues, pressure] = validStages();
    const clues = {
      clues: validClues.clues.map((clue) => ({
        ...clue,
        sourceId: "place-1",
        supports: ["record"],
      })),
      independentPaths: [],
    };
    const replies = [foundation, cast, clues, clues, pressure];
    let stoppedAt: string | undefined;
    const result = await generateMysteryStaged(resolveMystery(), {
      complete: async () => JSON.stringify(replies.shift()),
      onStats: (value) => (stoppedAt = value.stoppedAt),
    });

    expect(result).toBeNull();
    expect(stoppedAt).toBe("clues");
  });

  it("accepts the field names and shapes models commonly return", async () => {
    const [foundation, cast, clues, pressure] = validStages();
    const { summary, ...rest } = foundation;
    const variantFoundation = {
      ...rest,
      playerSafeSummary: summary,
      truth: { ...foundation.truth, constraints: ["Stay on watch", "No key"] },
      timeline: foundation.timeline.map((event) => ({ event })),
      revelations: foundation.revelations.map(({ id, fact, kind }) => ({
        revelationId: id,
        fact,
        kind: ` ${kind.toUpperCase()}`,
      })),
    };
    const variantCast = {
      ...cast,
      keyItemLocationId: undefined,
      keyItemLocation: "archive",
      suspects: cast.suspects.map((suspect, index) =>
        index === 0 ? { ...suspect, name: "Mara" } : suspect,
      ),
    };
    const replies = [
      variantFoundation,
      variantCast,
      clues,
      pressure,
      { status: "consistent", issues: [] },
      { status: "consistent", issues: [] },
    ];
    const result = await generateMysteryStaged(resolveMystery(), {
      complete: async () => JSON.stringify(replies.shift()),
    });

    expect(result?.stats.repairedStages).toEqual([]);
    expect(result?.output.summary).toBe(foundation.summary);
    expect(result?.output.lore).toContain("Stay on watch; No key");
    // The perpetrator's name stays the one locked by the foundation.
    expect(result?.output.content).toContain(
      "**Mara Quill (person-1), starts at",
    );
  });

  it("moves places listed among the suspects into the locations", async () => {
    const [foundation, cast, clues, pressure] = validStages();
    const mixed = {
      keyItemLocationId: "place-1",
      suspects: [
        ...cast.suspects,
        {
          id: "place-3",
          name: "Cellar",
          activity: "Storage",
          evidence: "Damp tracks",
        },
      ],
      locations: cast.locations.slice(0, 2),
    };
    const replies = [
      foundation,
      mixed,
      clues,
      pressure,
      { status: "consistent", issues: [] },
      { status: "consistent", issues: [] },
    ];
    const result = await generateMysteryStaged(resolveMystery(), {
      complete: async () => JSON.stringify(replies.shift()),
    });

    expect(result?.stats.repairedStages).toEqual([]);
    expect(result?.output.content).toContain("**Cellar:**");
  });

  it("keeps a playable case when the final check still lists doubts", async () => {
    const [foundation, cast, clues, pressure] = validStages();
    const replies = [
      foundation,
      cast,
      clues,
      pressure,
      { status: "inconsistent", issues: ["a wording doubt"] },
      { cast, clues, pressure },
      { status: "needs-repair", issues: ["the doubt remains"] },
    ];
    const result = await generateMysteryStaged(resolveMystery(), {
      complete: async () => JSON.stringify(replies.shift()),
    });

    expect(result).not.toBeNull();
    expect(result?.stats.aiCalls).toBe(7);
  });

  it("renders the timeline and keeps clue ids out of the player-facing leads", async () => {
    const [foundation, cast, baseClues, pressure] = validStages();
    const clues = {
      ...baseClues,
      clues: baseClues.clues.map((clue, index) =>
        index === 0 ? { ...clue, leadsTo: ["clue-2"] } : clue,
      ),
    };
    const replies = [
      foundation,
      cast,
      clues,
      pressure,
      { status: "consistent", issues: [] },
      { status: "consistent", issues: [] },
    ];
    const result = await generateMysteryStaged(resolveMystery(), {
      complete: async () => JSON.stringify(replies.shift()),
    });

    expect(result?.output.content).toContain("1. The record was copied");
    expect(result?.output.content).toContain("3. The keeper disappeared");
    expect(result?.output.content).toMatch(/Follow up: [^\n]*Lead \d/);
    // Player-facing sections never show clue ids; the GM case file does.
    expect(result?.output.content.split("## Actual Timeline")[0]).not.toMatch(
      /clue-\d/,
    );
    expect(result?.output.lore).toContain("Fixed Truth");
    expect(result?.output.lore).not.toContain("Actual Timeline");
  });

  it("cleans stray punctuation and doubled conditionals in the GM text", async () => {
    const [foundation, cast, clues, pressure] = validStages();
    pressure.npcResponses[0].trigger = "If The party asks together.";
    pressure.npcResponses[0].response = "then Oren shares the log..";
    pressure.pressureClock[0].trigger = "Dawn on day one.";
    const replies = [
      foundation,
      cast,
      clues,
      pressure,
      { status: "consistent", issues: [] },
      { status: "consistent", issues: [] },
    ];
    const result = await generateMysteryStaged(resolveMystery(), {
      complete: async () => JSON.stringify(replies.shift()),
    });

    const content = result?.output.content ?? "";
    expect(content).toContain(
      "If the party asks together, then Oren shares the log.",
    );
    expect(content).toContain("**When:** Dawn on day one. **Then:**");
    expect(content).not.toMatch(/\.\.(?!\.)|\.,|If If/);
  });

  it("asks the audit whether the players can deduce and execute the solution", async () => {
    const prompts: string[] = [];
    const [foundation, cast, clues, pressure] = validStages();
    const replies = [
      foundation,
      cast,
      clues,
      pressure,
      { status: "consistent", issues: [] },
      { status: "consistent", issues: [] },
    ];
    await generateMysteryStaged(resolveMystery(), {
      complete: async (_system, message) => {
        prompts.push(message);
        return JSON.stringify(replies.shift());
      },
    });

    const audit = prompts.find((p) => p.startsWith("STAGE 5")) ?? "";
    expect(audit).toContain("can the players deduce the truth");
    expect(audit).toContain("can the players execute the solution");
    expect(audit).toContain("does the world behave consistently");
    const finalAudit = prompts.find((p) => p.startsWith("STAGE 7")) ?? "";
    expect(finalAudit).toContain("can the players deduce the truth");
    expect(finalAudit).toContain("can the players execute the solution");
    expect(finalAudit).toContain("does the world behave consistently");
    expect(finalAudit).toContain("Recheck route sufficiency, test safety");
    expect(prompts.find((p) => p.startsWith("STAGE 4"))).toContain(
      "that test must itself be safe",
    );
  });

  it("asks for a progressing pressure clock and a distinct unsolved outcome", async () => {
    const prompts: string[] = [];
    const [foundation, cast, clues, pressure] = validStages();
    const replies = [
      foundation,
      cast,
      clues,
      pressure,
      { status: "consistent", issues: [] },
      { status: "consistent", issues: [] },
    ];
    await generateMysteryStaged(resolveMystery(), {
      complete: async (_system, message) => {
        prompts.push(message);
        return JSON.stringify(replies.shift());
      },
    });

    const stage4 = prompts.find((p) => p.startsWith("STAGE 4")) ?? "";
    expect(stage4).toContain("advance whether or not the party acts");
    expect(stage4).toContain("historical truth itself is lost");
  });

  it("renders the key item, method reason and revelations for the GM", async () => {
    const [foundation, cast, clues, pressure] = validStages();
    const replies = [
      foundation,
      cast,
      clues,
      pressure,
      { status: "consistent", issues: [] },
      { status: "consistent", issues: [] },
    ];
    const result = await generateMysteryStaged(resolveMystery(), {
      complete: async () => JSON.stringify(replies.shift()),
    });

    expect(result?.output.lore).toContain(
      "**Key item:** The bell record. Now at Archive.",
    );
    expect(result?.output.lore).toContain("locked in the bell loft");
    expect(result?.output.lore).toContain("Burn it at the next full moon");
    expect(result?.output.lore).toContain("a copied key was needed");
    expect(result?.output.lore).toContain("north pasture");
    expect(result?.output.content).toContain("## Revelations");
    expect(result?.output.content).toContain(
      "**record (culprit):** record was altered",
    );
  });

  it.each([
    ["the key item's location", (f: any) => delete f.truth.keyItemLocation],
    ["why the method was needed", (f: any) => delete f.truth.methodReason],
    [
      "a culprit revelation",
      (f: any) => {
        f.revelations[0].kind = "history";
      },
    ],
  ])("stops at the foundation when it lacks %s", async (_name, break_) => {
    const [foundation] = validStages();
    break_(foundation);
    const result = await generateMysteryStaged(resolveMystery(), {
      complete: async () => JSON.stringify(foundation),
    });

    expect(result).toBeNull();
  });

  it("stops at the cast when the key item's location is not one of the locations", async () => {
    const [foundation, cast] = validStages();
    const replies = (): unknown =>
      replies.count++ === 0
        ? foundation
        : { ...cast, keyItemLocationId: "place-9" };
    replies.count = 0;
    let stopped: string | undefined;
    const result = await generateMysteryStaged(resolveMystery(), {
      complete: async () => JSON.stringify(replies()),
      onStats: (stats) => (stopped = stats.stoppedAt),
    });

    expect(result).toBeNull();
    expect(stopped).toBe("cast");
  });

  it("requires a lead to the key item's location even when a clue is found there", async () => {
    const [foundation, cast, clues] = validStages();
    const withHiddenItem = {
      ...cast,
      keyItemLocationId: "place-4",
      locations: [
        ...cast.locations,
        { id: "place-4", name: "Vault", activity: "Sealed", evidence: "Dust" },
      ],
    };
    clues.clues[0].sourceId = "place-4";
    let stopped: string | undefined;
    const replies = [foundation, withHiddenItem, clues, clues];
    const result = await generateMysteryStaged(resolveMystery(), {
      complete: async () => JSON.stringify(replies.shift()),
      onStats: (stats) => (stopped = stats.stoppedAt),
    });

    expect(result).toBeNull();
    expect(stopped).toBe("clues");
  });

  it("shows the GM the same Lead numbers as the players in the Clue Index", async () => {
    const [foundation, cast, clues, pressure] = validStages();
    clues.clues[0].leadsTo = ["clue-2", "place-2"];
    const replies = [
      foundation,
      cast,
      clues,
      pressure,
      { status: "consistent", issues: [] },
      { status: "consistent", issues: [] },
    ];
    const result = await generateMysteryStaged(resolveMystery(), {
      complete: async () => JSON.stringify(replies.shift()),
    });

    expect(result?.output.content).toContain(
      "Leads to: Lead 2 (clue-2), Bell tower.",
    );
  });

  it("asks for the clue to the key item's location to say what points there", async () => {
    const [foundation, cast, clues, pressure] = validStages();
    const replies = [
      foundation,
      cast,
      clues,
      pressure,
      { status: "consistent", issues: [] },
      { status: "consistent", issues: [] },
    ];
    const messages: string[] = [];
    await generateMysteryStaged(resolveMystery(), {
      complete: async (_system, message) => {
        messages.push(message);
        return JSON.stringify(replies.shift());
      },
    });

    expect(messages[2]).toContain("STAGE 3 OF 7");
    expect(messages[2]).toContain("points the party there");
  });

  it("retries the cast when a person has no starting location", async () => {
    const [foundation, cast, clues, pressure] = validStages();
    const unplaced = {
      ...cast,
      suspects: cast.suspects.map(({ startLocationId: _, ...rest }) => rest),
    };
    const replies = [
      foundation,
      unplaced,
      cast,
      clues,
      pressure,
      { status: "consistent", issues: [] },
      { status: "consistent", issues: [] },
    ];
    const result = await generateMysteryStaged(resolveMystery(), {
      complete: async () => JSON.stringify(replies.shift()),
    });

    expect(result?.stats.repairedStages).toContain("mystery-cast");
    expect(result?.output.content).toContain("starts at Archive");
  });

  it("accepts a starting location given by name", async () => {
    const [foundation, cast, clues, pressure] = validStages();
    const named = {
      ...cast,
      suspects: cast.suspects.map((suspect) => ({
        ...suspect,
        startLocationId: "bell tower",
      })),
    };
    const replies = [
      foundation,
      named,
      clues,
      pressure,
      { status: "consistent", issues: [] },
      { status: "consistent", issues: [] },
    ];
    const result = await generateMysteryStaged(resolveMystery(), {
      complete: async () => JSON.stringify(replies.shift()),
    });

    expect(result?.output.content).toContain("starts at Bell tower");
  });

  it("retries clues whose text points at a clue that does not exist", async () => {
    const [foundation, cast, clues, pressure] = validStages();
    const dangling = structuredClone(clues);
    dangling.clues[0].observation = "Matches the mark described in clue-42";
    const replies = [
      foundation,
      cast,
      dangling,
      clues,
      pressure,
      { status: "consistent", issues: [] },
      { status: "consistent", issues: [] },
    ];
    const result = await generateMysteryStaged(resolveMystery(), {
      complete: async () => JSON.stringify(replies.shift()),
    });

    expect(result?.stats.repairedStages).toContain("mystery-clues");
    expect(result?.output.content).not.toContain("clue-42");
  });

  it("stops at the pressure stage when the text keeps pointing at a missing person", async () => {
    const [foundation, cast, clues, pressure] = validStages();
    pressure.npcResponses[0].response = "Oren blames person-9";
    let stopped: string | undefined;
    const replies = [foundation, cast, clues, pressure, pressure, pressure];
    const result = await generateMysteryStaged(resolveMystery(), {
      complete: async () => JSON.stringify(replies.shift()),
      onStats: (stats) => (stopped = stats.stoppedAt),
    });

    expect(result).toBeNull();
    expect(stopped).toBe("pressure");
  });

  it("stops at the clues when every route to the item starts at the item's location", async () => {
    const [foundation, cast, clues] = validStages();
    // place-1 holds the item; make every clue that supports it start there.
    clues.clues[2].sourceId = "place-1";
    clues.clues[5].sourceId = "place-1";
    let stopped: string | undefined;
    const replies = [foundation, cast, clues, clues, clues];
    const result = await generateMysteryStaged(resolveMystery(), {
      complete: async () => JSON.stringify(replies.shift()),
      onStats: (stats) => (stopped = stats.stoppedAt),
    });

    expect(result).toBeNull();
    expect(stopped).toBe("clues");
  });

  it("drops overlapping routes and derives independent ones from the clues", async () => {
    const [foundation, cast, clues, pressure] = validStages();
    clues.clues[0].leadsTo = ["clue-2"];
    clues.clues[3].leadsTo = ["clue-2"];
    clues.independentPaths = [
      { revelationId: "record", clueIds: ["clue-1", "clue-2"] },
      { revelationId: "record", clueIds: ["clue-4", "clue-2"] },
    ];
    const replies = [
      foundation,
      cast,
      clues,
      pressure,
      { status: "consistent", issues: [] },
      { status: "consistent", issues: [] },
    ];
    const result = await generateMysteryStaged(resolveMystery(), {
      complete: async () => JSON.stringify(replies.shift()),
    });

    expect(result?.stats.outcome).toBe("staged");
    expect(result?.stats.repairedStages).toEqual([]);
  });

  it("keeps the checked case when the repair reply is unusable", async () => {
    const [foundation, cast, clues, pressure] = validStages();
    const replies: unknown[] = [
      foundation,
      cast,
      clues,
      pressure,
      { status: "needs-repair", issues: ["Tighten the alibi"] },
      { cast: {}, clues: {}, pressure: {} },
      { cast: {}, clues: {}, pressure: {} },
      { status: "consistent", issues: [] },
    ];
    const result = await generateMysteryStaged(resolveMystery(), {
      complete: async () => JSON.stringify(replies.shift()),
    });

    expect(result?.stats.outcome).toBe("staged");
    expect(result?.output.content).toContain("**Mara Quill — clerk:**");
  });

  it("carries the clue network for the GM graph", async () => {
    const [foundation, cast, clues, pressure] = validStages();
    const replies = [
      foundation,
      cast,
      clues,
      pressure,
      { status: "consistent", issues: [] },
      { status: "consistent", issues: [] },
    ];
    const result = await generateMysteryStaged(resolveMystery(), {
      complete: async () => JSON.stringify(replies.shift()),
    });

    const graph = result?.output.mysteryGraph;
    expect(graph?.nodes.filter((n) => n.kind === "clue")).toHaveLength(6);
    expect(graph?.nodes.find((n) => n.mark === "culprit")?.label).toBe(
      "Mara Quill",
    );
    expect(graph?.edges.some((e) => e.kind === "supports")).toBe(true);
    expect(result?.output.content).not.toContain("mysteryGraph");
  });

  it("states the expected JSON keys and the banned names in the prompts", async () => {
    const [foundation, cast, clues, pressure] = validStages();
    const replies = [foundation, cast, clues, pressure];
    const seen: Array<[string, string]> = [];
    await generateMysteryStaged(resolveMystery({ avoidNames: ["Ilyra"] }), {
      complete: async (system, message) => {
        seen.push([system, message]);
        return JSON.stringify(replies.shift() ?? {});
      },
    });

    expect(seen[0][0]).toContain("Vale");
    expect(seen[0][0]).toContain("Ilyra");
    expect(seen[0][1]).toContain('"summary":');
    expect(seen[1][1]).toContain("locked perpetratorName Mara Quill");
  });

  it("runs a targeted repair before the final audit when the audit flags issues", async () => {
    const [foundation, cast, clues, pressure] = validStages();
    const replies = [
      foundation,
      cast,
      clues,
      pressure,
      { status: "needs-repair", issues: ["clue-2 needs a clearer lead"] },
      { cast, clues, pressure },
      { status: "consistent", issues: [] },
    ];
    const result = await generateMysteryStaged(resolveMystery(), {
      complete: async () => JSON.stringify(replies.shift()),
    });

    expect(result?.stats.aiCalls).toBe(7);
    expect(result?.output.content).toContain("Evidence and Leads");
  });

  it("retries a malformed stage with the detected problems and records the repair", async () => {
    const [foundation, cast, clues, pressure] = validStages();
    const replies = [
      {},
      foundation,
      cast,
      clues,
      pressure,
      { status: "consistent", issues: [] },
      { status: "consistent", issues: [] },
    ];
    const requests: string[] = [];
    const result = await generateMysteryStaged(resolveMystery(), {
      complete: async (_system, message) => {
        requests.push(message);
        return JSON.stringify(replies.shift());
      },
    });

    expect(result?.stats.aiCalls).toBe(7);
    expect(result?.stats.repairedStages).toContain("mystery-foundation");
    expect(requests[1]).toContain(
      "previous answer for this stage was not usable",
    );
    expect(requests[1]).toContain('"title" is missing');
  });

  it("propagates cancellation between stage calls", async () => {
    const controller = new AbortController();
    await expect(
      generateMysteryStaged(resolveMystery(), {
        signal: controller.signal,
        complete: async () => {
          controller.abort(new DOMException("Cancelled", "AbortError"));
          return JSON.stringify({});
        },
      }),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});
