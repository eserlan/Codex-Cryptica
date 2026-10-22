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
    },
    timeline: [
      "The record was copied",
      "The bell was rung",
      "The keeper disappeared",
    ],
    revelations: ["record", "bell", "key"].map((id) => ({
      id,
      fact: `${id} was altered`,
    })),
  };
  const cast = {
    suspects: ["Mara Quill", "Oren Pike", "Sella Reed", "Tovin Elm"].map(
      (name, index) => ({
        id: `person-${index + 1}`,
        name,
        role: "clerk",
        publicFace: "A trusted local",
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
    expect(result?.output.lore).toContain("Lead Graph (Adjacency List)");
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

  it("rejects an adjacency path that does not support its revelation", async () => {
    const [foundation, cast, validClues, pressure] = validStages();
    const clues = {
      ...validClues,
      independentPaths: validClues.independentPaths.map((path, index) =>
        index === 0 ? { ...path, clueIds: ["clue-2"] } : path,
      ),
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
