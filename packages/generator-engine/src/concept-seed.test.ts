import { describe, expect, it } from "vitest";
import {
  type ConceptSeed,
  formatSeedBlock,
  generateConceptSeed,
  pickSeed,
  readSeedCandidates,
  repeatScore,
} from "./concept-seed";

const seed = (
  premise: string,
  titleIdea: string,
  setting = "a riverside mill",
): ConceptSeed => ({
  premise,
  stake: "a family's survival",
  setting,
  distinctiveElement: "a mill wheel that stopped",
  titleIdea,
});

const fresh = seed(
  "A miller's daughter has gone missing before the flood tax is paid.",
  "The Flooded Ledger",
  "a flood-prone mill",
);
const other = seed(
  "A courier refuses to deliver a sealed letter to the reeve.",
  "Night Post",
  "a border tollhouse",
);
const stale = seed(
  "The bell in the chapel rings for a drowned miller.",
  "The Bell Beneath the Chapel",
);

function candidatesReply(list: readonly ConceptSeed[]): string {
  return JSON.stringify({ candidates: list });
}

/** A deterministic random source. */
function seeded(value: number): () => number {
  return () => value;
}

describe("readSeedCandidates", () => {
  it("keeps only complete candidates, with trimmed fields", () => {
    const seeds = readSeedCandidates({
      candidates: [
        { ...fresh, premise: `  ${fresh.premise}  ` },
        { premise: "missing the other fields" },
        "not an object",
        null,
        other,
      ],
    });
    expect(seeds).toHaveLength(2);
    expect(seeds[0].premise).toBe(fresh.premise);
    expect(seeds[1]).toEqual(other);
  });

  it("returns nothing when candidates is not a list", () => {
    expect(readSeedCandidates({ candidates: "soon" })).toEqual([]);
    expect(readSeedCandidates({})).toEqual([]);
  });
});

describe("repeatScore and pickSeed", () => {
  it("counts content words shared with a recent seed", () => {
    expect(repeatScore(stale, [stale])).toBeGreaterThanOrEqual(2);
    // "miller" is shared, so one word counts; the courier shares none.
    expect(repeatScore(fresh, [stale])).toBe(1);
    expect(repeatScore(other, [stale])).toBe(0);
  });

  it("prefers candidates that do not repeat a recent seed", () => {
    const picked = pickSeed([stale, fresh], [stale], seeded(0));
    expect(picked).toEqual(fresh);
  });

  it("falls back to the least similar candidates when all repeat", () => {
    const partlySimilar = seed(
      "A bell is rung at dusk to call the miller home.",
      "Dusk Calls",
    );
    const picked = pickSeed([stale, partlySimilar], [stale], seeded(0));
    expect(picked).toEqual(partlySimilar);
  });

  it("uses the injected random source among the fresh candidates", () => {
    const low = pickSeed([fresh, other], [], seeded(0));
    const high = pickSeed([fresh, other], [], seeded(0.99));
    expect(low).toEqual(fresh);
    expect(high).toEqual(other);
  });
});

describe("generateConceptSeed", () => {
  it("picks a seed from the candidates the model returns", async () => {
    const seeds = await generateConceptSeed(
      { genre: "Pirate", tone: "Tense", context: "", recent: [] },
      {
        complete: async () =>
          candidatesReply([fresh, other, fresh, other, fresh]),
        rng: seeded(0),
      },
    );
    expect([fresh, other]).toContainEqual(seeds);
  });

  it("names the recent seeds and the dimensions in the request", async () => {
    const messages: string[] = [];
    await generateConceptSeed(
      {
        genre: "Pirate",
        tone: "Tense",
        context: "A harbour town",
        recent: [stale],
      },
      {
        complete: async (_system, message) => {
          messages.push(message);
          return candidatesReply([fresh, other, fresh, other, fresh]);
        },
      },
    );
    expect(messages[0]).toContain("Recent seeds to avoid repeating");
    expect(messages[0]).toContain(stale.titleIdea);
    expect(messages[0]).toContain("Concept constraints for this case");
    expect(messages[0]).toContain("A harbour town");
    expect(messages[0]).toContain('"candidates"');
  });

  it("considers no more than the requested number of candidates", async () => {
    const extra = Array.from({ length: 12 }, (_, i) =>
      seed(`Premise ${i} involves a unique event ${i}`, `Title ${i}`),
    );
    const picked = await generateConceptSeed(
      { genre: "Pirate", tone: "Tense", context: "", recent: [] },
      {
        complete: async () => candidatesReply(extra),
        rng: seeded(0.999),
      },
    );
    const considered = extra.slice(0, 5).map((item) => item.premise);
    expect(considered).toContain(picked?.premise);
  });

  it("returns null when every reply is unreadable, so the caller falls back", async () => {
    let calls = 0;
    const result = await generateConceptSeed(
      { genre: "Pirate", tone: "Tense", context: "", recent: [] },
      {
        complete: async () => {
          calls++;
          return "not JSON at all";
        },
      },
    );
    expect(result).toBeNull();
    expect(calls).toBe(2);
  });

  it("returns null when the model call fails rather than throwing", async () => {
    const result = await generateConceptSeed(
      { genre: "Pirate", tone: "Tense", context: "", recent: [] },
      {
        complete: async () => {
          throw new Error("offline");
        },
      },
    );
    expect(result).toBeNull();
  });

  it("accepts a partial reply and retries for the missing candidates", async () => {
    const replies = [
      candidatesReply([fresh, other]),
      candidatesReply([fresh, other, fresh, other, fresh]),
    ];
    const messages: string[] = [];
    const result = await generateConceptSeed(
      { genre: "Pirate", tone: "Tense", context: "", recent: [] },
      {
        complete: async (_system, message) => {
          messages.push(message);
          return replies.shift() ?? "";
        },
        rng: seeded(0),
      },
    );
    expect(result).not.toBeNull();
    expect(messages[1]).toContain("only 2 of 5 candidates were complete");
  });

  it("propagates cancellation and does not retry it", async () => {
    const controller = new AbortController();
    let calls = 0;
    await expect(
      generateConceptSeed(
        { genre: "Pirate", tone: "Tense", context: "", recent: [] },
        {
          signal: controller.signal,
          complete: async () => {
            calls++;
            controller.abort();
            throw new DOMException("aborted", "AbortError");
          },
        },
      ),
    ).rejects.toThrow();
    expect(calls).toBe(1);
  });

  it("prompts with adventure subject, scenario emphasis, and anti-tropes", async () => {
    const messages: string[] = [];
    await generateConceptSeed(
      {
        domain: "adventure",
        subType: "Survival",
        genre: "Classic Fantasy",
        tone: "Bleak",
        context: "A frozen pass",
        recent: [],
        avoidTropes: ["tavern notice board", "missing caravan"],
      },
      {
        complete: async (_system, message) => {
          messages.push(message);
          return candidatesReply([fresh, other, fresh, other, fresh]);
        },
      },
    );
    expect(messages[0]).toContain(
      "adventure seeds for a tabletop RPG scenario",
    );
    expect(messages[0]).toContain("scenario emphasis (Survival)");
    expect(messages[0]).toContain(
      "Candidates must centre on the Survival premise",
    );
    expect(messages[0]).toContain("tavern notice board; missing caravan");
  });

  it("customises prompt subject and guidance for heist domain", async () => {
    const messages: string[] = [];
    await generateConceptSeed(
      {
        domain: "heist",
        subType: "Sabotage",
        genre: "Cyberpunk / Corporate",
        tone: "Tense",
        context: "",
        recent: [],
        avoidTropes: ["gem in a mansion vault"],
      },
      {
        complete: async (_system, message) => {
          messages.push(message);
          return candidatesReply([fresh, other, fresh, other, fresh]);
        },
      },
    );
    expect(messages[0]).toContain(
      "heist scenario concepts for a tabletop RPG score",
    );
    expect(messages[0]).toContain("heist type (Sabotage)");
    expect(messages[0]).toContain(
      "Candidates must centre on a Sabotage objective",
    );
    expect(messages[0]).toContain("gem in a mansion vault");
  });

  it("customises prompt subject and guidance for council-vote domain", async () => {
    const messages: string[] = [];
    await generateConceptSeed(
      {
        domain: "council-vote",
        genre: "Classic Fantasy",
        tone: "Grounded",
        context: "",
        recent: [],
        avoidTropes: ["simple monetary bribe"],
      },
      {
        complete: async (_system, message) => {
          messages.push(message);
          return candidatesReply([fresh, other, fresh, other, fresh]);
        },
      },
    );
    expect(messages[0]).toContain(
      "political vote concepts for a contentious council decision",
    );
    expect(messages[0]).toContain(
      "Candidates must centre on a nuanced political conflict",
    );
    expect(messages[0]).toContain("simple monetary bribe");
  });

  it("respects avoidDimensionIds when rolling dimensions for seeds", async () => {
    const messages: string[] = [];
    await generateConceptSeed(
      {
        domain: "adventure",
        genre: "Classic Fantasy",
        tone: "Grounded",
        context: "",
        recent: [],
        avoidDimensionIds: new Set(["someone-not-who-they-claim"]),
      },
      {
        complete: async (_system, message) => {
          messages.push(message);
          return candidatesReply([fresh, other, fresh, other, fresh]);
        },
        rng: seeded(0),
      },
    );
    expect(messages[0]).not.toContain("someone is not who they claim to be");
  });
});

describe("formatSeedBlock", () => {
  it("renders every field and asks the title idea to be used", () => {
    const block = formatSeedBlock(fresh);
    expect(block).toContain("Case seed, chosen before writing and locked");
    expect(block).toContain(fresh.premise);
    expect(block).toContain(fresh.stake);
    expect(block).toContain(fresh.setting);
    expect(block).toContain(fresh.distinctiveElement);
    expect(block).toContain(fresh.titleIdea);
  });

  it("supports a custom seed label", () => {
    const block = formatSeedBlock(fresh, "Adventure seed");
    expect(block).toContain("Adventure seed, chosen before writing and locked");
  });
});
