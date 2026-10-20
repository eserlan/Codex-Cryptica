import { describe, expect, it, vi } from "vitest";
import {
  assembleTome,
  checkTomeHooksStage,
  checkTomeProvenanceStage,
  checkTomeRevelationsStage,
  generateTomeStaged,
  tomeStatsLog,
  type TomeStagedStats,
} from "./tome-staged";
import { buildTomePrompt, type TomeGeneratorOptions } from "./public-tome";
import type { JsonObject } from "./staged-runtime";
import type { StagedProgressStep } from "./staged-progress";

const VALID_STAGE_1: JsonObject = {
  title: "The Cinnabar Liturgy",
  summary:
    "An illuminated fourteenth-century ritual codex from the scriptorium of Saint Jude.",
  canonicalFacts: {
    centralRule:
      "The reader must invert the second purification chant before lighting the brazier.",
    productionMethod: "Handwritten vellum codex with vermilion ink",
    errorSource:
      "Brother Cyprian omitted the conditional qualifier during transcription.",
    bookClaim: "The rite grants communion with the primordial fire.",
    deception: "The rite consumes the celebrant in unquenchable ash.",
    objectiveTruth: "The rite awakens an imprisoned cinder-elemental.",
    actionableClue:
      "Scraped parchment under ultraviolet reveals the expunged negative particle.",
  },
  physicalDescription:
    "Bound in cracked calfskin over oak boards with iron clasps. Heavy vellum leaves, ruled in faint lead. Seven leaves are excised from the third quire, leaving ragged stubs.",
  provenance:
    "Composed circa 1340 by an anonymous heresy in the Marches. Copied by Brother Cyprian at Saint Jude, where an inquisitorial visit suppressed it. Passed through private antiquarian sales to the current vault archive.",
  groundTruth: {
    bookClaims: "The rite grants communion with the primordial fire.",
    deception: "The rite consumes the celebrant in unquenchable ash.",
    objectiveTruth: "The rite awakens an imprisoned cinder-elemental.",
    actionableClue:
      "Scraped parchment under ultraviolet reveals the expunged negative particle.",
  },
  connectedEntities: {
    author: "Anonymous Marcher heretic",
    custodian: "The Dunwich Archive",
    interestedFaction: "The Cinder-Order",
    associatedLocation: "The Sunken Scriptorium",
  },
  labels: ["tome", "forbidden-book", "grimoire", "item"],
  connections: [
    { targetTitle: "The Dunwich Archive", relationship: "Current custodian" },
  ],
};

const VALID_STAGE_2: JsonObject = {
  contents: `The text outlines the ninefold descent through ash and smoke to the subterranean fire-well.
> "Let the supplicant turn their face from the east, pouring the salt into the dying ember while chanting the nine names backwards."
A careful reader who compares the marginal gloss with the erased rubric discovers that the expunged negative particle changes an invitation into an unbinding rite that awakens an imprisoned cinder-elemental.`,
  risks:
    "Handling the leaves transfers a bitter, sulfurous residue causing chemical burns and persistent fever. Prolonged meditation prompts vivid hallucinations of burning spires.",
  quickChecks: {
    deciphering:
      "Requires two days of study and a DC 14 Classical Latin or Occult comprehension check.",
    failureCondition:
      "Failing to invert the second purification chant causes the brazier flame to detonate outward, inflicting severe concussive and burn trauma.",
    safeHandling:
      "Handle only with oiled calfskin gloves in a well-ventilated chamber.",
  },
};

const VALID_STAGE_3: JsonObject = {
  adventureHooks: [
    "1. The Ragged Stubs: An antiquarian hires the party to track down the seven excised leaves taken during the 1842 library heist.",
    "2. The Cinder-Order Demand: A secretive occult cell attempts to burgle the Dunwich Archive to secure the codex before solstice.",
    "3. Echoes from the Scriptorium: Smoke rises from the Sunken Scriptorium, where a desperate novice is reciting the uncorrected litany.",
  ],
};

describe("Tome staged validation", () => {
  const options: TomeGeneratorOptions = {
    genre: "Cosmic Horror",
    tomeType: "Occult Treatise / Cosmology",
    format: "Leather-bound Quarto",
    rarity: "Unique Manuscript",
    custodian: "The Dunwich Archive",
    primaryHazard: "Toxic ash / psychological mania",
    language: "Medieval Latin",
  };
  const prompt = buildTomePrompt(options);

  describe("checkTomeProvenanceStage", () => {
    it("accepts valid stage 1 draft", () => {
      const check = checkTomeProvenanceStage(VALID_STAGE_1, prompt.resolved);
      expect(check.hard).toEqual([]);
      expect(check.soft).toEqual([]);
    });

    it("flags missing required top-level fields as hard", () => {
      const invalid: JsonObject = {
        ...VALID_STAGE_1,
        title: "",
        summary: undefined as never,
      };
      const check = checkTomeProvenanceStage(invalid, prompt.resolved);
      expect(check.hard).toContain("Missing or empty required field: title");
      expect(check.hard).toContain("Missing or empty required field: summary");
    });

    it("flags empty or missing canonicalFacts as hard", () => {
      const invalid: JsonObject = {
        ...VALID_STAGE_1,
        canonicalFacts: {
          centralRule: "",
          productionMethod: "Handwritten",
        },
      };
      const check = checkTomeProvenanceStage(invalid, prompt.resolved);
      expect(
        check.hard.some((h) =>
          h.includes(
            "canonicalFacts is missing or has empty field: centralRule",
          ),
        ),
      ).toBe(true);
      expect(
        check.hard.some((h) =>
          h.includes(
            "canonicalFacts is missing or has empty field: errorSource",
          ),
        ),
      ).toBe(true);
    });

    it("flags unit contradictions between exactDamage and physical description as hard", () => {
      const promptLeaves = buildTomePrompt({
        ...options,
        genre: "Cosmic Horror",
      });
      // Override exactDamage to explicitly mention leaves
      const resolvedLeaves = {
        ...promptLeaves.resolved,
        exactDamage: "Seven leaves are missing from the third section",
      };
      const contradictingDraft: JsonObject = {
        ...VALID_STAGE_1,
        physicalDescription: "Two gatherings are excised from the binding.",
      };
      const check = checkTomeProvenanceStage(
        contradictingDraft,
        resolvedLeaves,
      );
      expect(check.hard.some((h) => h.includes("unit contradiction"))).toBe(
        true,
      );
    });

    it("flags banned names as hard", () => {
      const draftWithBanned: JsonObject = {
        ...VALID_STAGE_1,
        title: "The Book of Gandalf",
      };
      const check = checkTomeProvenanceStage(draftWithBanned, prompt.resolved, [
        "Gandalf",
      ]);
      expect(
        check.hard.some((h) => h.includes("banned placeholder name: Gandalf")),
      ).toBe(true);
    });

    it("flags missing ground truth elements as hard", () => {
      const draftMissingGT: JsonObject = {
        ...VALID_STAGE_1,
        groundTruth: {
          bookClaims: "Some claim",
          // missing deception, truth, clue
        },
      };
      const check = checkTomeProvenanceStage(draftMissingGT, prompt.resolved);
      expect(
        check.hard.some((h) =>
          h.includes("groundTruth missing deception element"),
        ),
      ).toBe(true);
    });

    it("flags real world terms in secondary fantasy as soft", () => {
      const fantasyResolved = {
        ...prompt.resolved,
        genre: "Classic Fantasy",
      };
      const draftWithRealWorld: JsonObject = {
        ...VALID_STAGE_1,
        provenance: "Transcribed in Constantinople in the year 1542.",
      };
      const check = checkTomeProvenanceStage(
        draftWithRealWorld,
        fantasyResolved,
      );
      expect(check.hard).toEqual([]);
      expect(check.soft.some((s) => s.includes("Genre drift"))).toBe(true);
    });

    it("flags errorSource naming a figure absent from provenance as soft", () => {
      const draftAbsentFigure: JsonObject = {
        ...VALID_STAGE_1,
        canonicalFacts: {
          ...(VALID_STAGE_1.canonicalFacts as Record<string, unknown>),
          errorSource: "Abbot Bartholomew deliberately altered the phrasing.",
        },
        provenance:
          "Composed in 1340 by an anonymous monk. Copied by Sister Claire.",
      };
      const check = checkTomeProvenanceStage(
        draftAbsentFigure,
        prompt.resolved,
      );
      expect(
        check.soft.some((s) => s.includes("errorSource names a figure")),
      ).toBe(true);
    });
  });

  describe("checkTomeRevelationsStage", () => {
    it("accepts valid stage 2 draft", () => {
      const check = checkTomeRevelationsStage(
        VALID_STAGE_2,
        VALID_STAGE_1,
        prompt.resolved,
      );
      expect(check.hard).toEqual([]);
      expect(check.soft).toEqual([]);
    });

    it("flags missing sections as hard", () => {
      const invalid: JsonObject = {
        contents: "",
        risks: "Some risk",
        quickChecks: {},
      };
      const check = checkTomeRevelationsStage(
        invalid,
        VALID_STAGE_1,
        prompt.resolved,
      );
      expect(check.hard).toContain(
        "Missing or empty required section: contents",
      );
    });

    it("flags missing translated excerpt in contents as hard", () => {
      const invalidExcerpt: JsonObject = {
        ...VALID_STAGE_2,
        contents:
          "The text discusses general alchemy without any quoted passage.",
      };
      const check = checkTomeRevelationsStage(
        invalidExcerpt,
        VALID_STAGE_1,
        prompt.resolved,
      );
      expect(
        check.hard.some((h) => h.includes("missing a translated excerpt")),
      ).toBe(true);
    });

    it("flags missing failure condition or deciphering in quickChecks as hard", () => {
      const invalidQC: JsonObject = {
        ...VALID_STAGE_2,
        quickChecks: {
          safeHandling: "Wear gloves",
        },
      };
      const check = checkTomeRevelationsStage(
        invalidQC,
        VALID_STAGE_1,
        prompt.resolved,
      );
      expect(
        check.hard.some((h) => h.includes("missing a failure condition")),
      ).toBe(true);
      expect(
        check.hard.some((h) => h.includes("missing a deciphering rule")),
      ).toBe(true);
    });

    it("flags paragraph duplication against stage 1 as soft", () => {
      const duplicatePara = String(VALID_STAGE_1.provenance);
      const draftWithDuplicate: JsonObject = {
        ...VALID_STAGE_2,
        contents: `${VALID_STAGE_2.contents}\n\n${duplicatePara}`,
      };
      const check = checkTomeRevelationsStage(
        draftWithDuplicate,
        VALID_STAGE_1,
        prompt.resolved,
      );
      expect(
        check.soft.some((s) => s.includes("duplicated prose paragraph")),
      ).toBe(true);
    });
  });

  describe("checkTomeHooksStage", () => {
    it("accepts valid stage 3 draft with 3 hooks", () => {
      const check = checkTomeHooksStage(
        VALID_STAGE_3,
        VALID_STAGE_1,
        VALID_STAGE_2,
        prompt.resolved,
      );
      expect(check.hard).toEqual([]);
      expect(check.soft).toEqual([]);
    });

    it("flags fewer than 3 hooks as hard", () => {
      const invalidHooks: JsonObject = {
        adventureHooks: ["1. Only one hook provided."],
      };
      const check = checkTomeHooksStage(
        invalidHooks,
        VALID_STAGE_1,
        VALID_STAGE_2,
        prompt.resolved,
      );
      expect(
        check.hard.some((h) => h.includes("Fewer than 3 adventure hooks")),
      ).toBe(true);
    });

    it("flags unit contradiction in hooks as hard", () => {
      const resolvedLeaves = {
        ...prompt.resolved,
        exactDamage: "Seven leaves are excised from the third quire",
      };
      const invalidHooks: JsonObject = {
        adventureHooks: [
          "1. A collector seeks the two missing gatherings from the binding.",
          "2. A rival scholar investigates the auction house.",
          "3. Cultists ambush the courier on the high road.",
        ],
      };
      const check = checkTomeHooksStage(
        invalidHooks,
        VALID_STAGE_1,
        VALID_STAGE_2,
        resolvedLeaves,
      );
      expect(check.hard.some((h) => h.includes("unit contradiction"))).toBe(
        true,
      );
    });
  });
});

describe("assembleTome", () => {
  const options: TomeGeneratorOptions = {
    genre: "Cosmic Horror",
    tomeType: "Occult Treatise",
    custodian: "The Dunwich Archive",
    associatedLocation: "The Sunken Scriptorium",
  };
  const prompt = buildTomePrompt(options);

  it("assembles stages into a document accepted by parseTomeResponse", () => {
    const assembled = assembleTome(
      VALID_STAGE_1,
      VALID_STAGE_2,
      VALID_STAGE_3,
      prompt.resolved,
    );

    expect(assembled.title).toBe(VALID_STAGE_1.title);
    expect(assembled.summary).toBe(VALID_STAGE_1.summary);
    expect(String(assembled.content)).toContain(
      "### Physical Description & Format",
    );
    expect(String(assembled.content)).toContain(
      "### Provenance & Transmission",
    );
    expect(String(assembled.content)).toContain("### Contents & Revelations");
    expect(String(assembled.content)).toContain("### Risks & Costs of Study");
    expect(String(assembled.content)).toContain("### Adventure Hooks");
    expect(String(assembled.lore)).toContain("### Ground Truth for the GM");
    expect(String(assembled.lore)).toContain("### Connected Entities");
    expect(String(assembled.lore)).toContain("### Quick Checks & Mechanics");
  });
});

describe("generateTomeStaged runner", () => {
  const options: TomeGeneratorOptions = {
    genre: "Cosmic Horror",
    tomeType: "Occult Treatise / Cosmology",
    format: "Leather-bound Quarto",
    rarity: "Unique Manuscript",
    custodian: "The Dunwich Archive",
    primaryHazard: "Toxic ash",
    language: "Medieval Latin",
  };
  const prompt = buildTomePrompt(options);

  function scriptedModel(
    replies: {
      stage1?: JsonObject[];
      stage2?: JsonObject[];
      stage3?: JsonObject[];
      repair?: JsonObject;
    } = {},
  ) {
    let callCount = 0;
    let s1Index = 0;
    let s2Index = 0;
    let s3Index = 0;

    const s1List = replies.stage1 ?? [VALID_STAGE_1];
    const s2List = replies.stage2 ?? [VALID_STAGE_2];
    const s3List = replies.stage3 ?? [VALID_STAGE_3];

    return {
      get callCount() {
        return callCount;
      },
      complete: vi.fn(async (_system: string, userMessage: string) => {
        callCount++;
        if (userMessage.includes("Stage 1 of 3")) {
          const item = s1List[Math.min(s1Index++, s1List.length - 1)];
          return JSON.stringify(item);
        }
        if (userMessage.includes("Stage 2 of 3")) {
          const item = s2List[Math.min(s2Index++, s2List.length - 1)];
          return JSON.stringify(item);
        }
        if (userMessage.includes("Stage 3 of 3")) {
          const item = s3List[Math.min(s3Index++, s3List.length - 1)];
          return JSON.stringify(item);
        }
        if (userMessage.includes("EDITORIAL REPAIR PASS")) {
          return JSON.stringify(
            replies.repair ??
              assembleTome(
                VALID_STAGE_1,
                VALID_STAGE_2,
                VALID_STAGE_3,
                prompt.resolved,
              ),
          );
        }
        return JSON.stringify(VALID_STAGE_1);
      }),
    };
  }

  it("happy path: completes with 3 calls (3 stages, no repair needed), locking earlier facts", async () => {
    const model = scriptedModel();
    const progressSteps: StagedProgressStep[][] = [];
    let statsRecorded: TomeStagedStats | undefined;

    const res = await generateTomeStaged(prompt, options, {
      complete: model.complete,
      onProgress: (steps) => progressSteps.push(steps),
      onStats: (stats) => {
        statsRecorded = stats;
      },
    });

    expect(res).not.toBeNull();
    expect(res?.output.title).toBe(VALID_STAGE_1.title);
    expect(model.callCount).toBe(3);
    expect(statsRecorded?.outcome).toBe("staged");
    expect(statsRecorded?.aiCalls).toBe(3);
    expect(statsRecorded?.repairedStages).toEqual([]);
    expect(statsRecorded?.coherenceRepaired).toBe(false);

    // Progress reporting
    expect(progressSteps.length).toBeGreaterThanOrEqual(3);
    const finalStep = progressSteps[progressSteps.length - 1];
    expect(finalStep.every((s) => s.status === "done")).toBe(true);
  });

  it("retry recovery: retries a stage when the first attempt has a hard problem and succeeds", async () => {
    const brokenStage1: JsonObject = {
      ...VALID_STAGE_1,
      title: "",
    };
    const model = scriptedModel({
      stage1: [brokenStage1, VALID_STAGE_1],
    });
    let statsRecorded: TomeStagedStats | undefined;

    const res = await generateTomeStaged(prompt, options, {
      complete: model.complete,
      onStats: (stats) => {
        statsRecorded = stats;
      },
    });

    expect(res).not.toBeNull();
    expect(model.callCount).toBe(4); // 2 calls for stage 1 + stage 2 + stage 3
    expect(statsRecorded?.repairedStages).toContain("provenance");
  });

  it("keeps first draft when retry is worse (e.g. introduces additional hard problems)", async () => {
    // Soft problem in draft 1 (genre warning)
    const draft1: JsonObject = {
      ...VALID_STAGE_1,
      canonicalFacts: {
        ...(VALID_STAGE_1.canonicalFacts as Record<string, unknown>),
        errorSource: "Abbot Bartholomew altered the text.",
      },
    };
    // Hard problem in draft 2
    const draft2: JsonObject = {
      ...VALID_STAGE_1,
      title: "",
    };
    const model = scriptedModel({
      stage1: [draft1, draft2],
    });

    const res = await generateTomeStaged(prompt, options, {
      complete: model.complete,
    });

    expect(res).not.toBeNull();
    expect(res?.output.title).toBe(VALID_STAGE_1.title);
  });

  it("null fallback on unusable stage after exhausting retries", async () => {
    const unusable: JsonObject = {
      title: "",
      summary: "",
    };
    const model = scriptedModel({
      stage1: [unusable, unusable],
    });
    let statsRecorded: TomeStagedStats | undefined;

    const res = await generateTomeStaged(prompt, options, {
      complete: model.complete,
      onStats: (stats) => {
        statsRecorded = stats;
      },
    });

    expect(res).toBeNull();
    expect(statsRecorded?.outcome).toBe("fell-back");
    expect(statsRecorded?.stoppedAt).toBe("provenance");
  });

  it("mid-run abort throws AbortError immediately and returns nothing", async () => {
    const controller = new AbortController();
    const model = {
      complete: vi.fn(async () => {
        controller.abort();
        return JSON.stringify(VALID_STAGE_1);
      }),
    };

    await expect(
      generateTomeStaged(prompt, options, {
        complete: model.complete,
        signal: controller.signal,
      }),
    ).rejects.toThrow();
  });

  it("coherence repair triggers when consistency check flags issues", async () => {
    // Unit contradiction in Stage 2 contents triggers consistency audit issue upon assembly
    const contradictoryStage2: JsonObject = {
      ...VALID_STAGE_2,
      contents: `${VALID_STAGE_2.contents}\nThree gatherings are excised from the volume.`,
    };
    const model = scriptedModel({
      stage2: [contradictoryStage2, contradictoryStage2],
      repair: assembleTome(
        VALID_STAGE_1,
        VALID_STAGE_2,
        VALID_STAGE_3,
        prompt.resolved,
      ),
    });
    let statsRecorded: TomeStagedStats | undefined;

    const res = await generateTomeStaged(prompt, options, {
      complete: model.complete,
      onStats: (stats) => {
        statsRecorded = stats;
      },
    });

    expect(res).not.toBeNull();
    expect(statsRecorded?.coherenceRepaired).toBe(true);
  });

  it("tomeStatsLog formats stats without exposing generated text", () => {
    const stats: TomeStagedStats = {
      outcome: "staged",
      aiCalls: 3,
      elapsedMs: 250,
      repairedStages: ["provenance"],
      coherenceRepaired: false,
      reviewIssues: ["Issue 1"],
      reviewSkipped: false,
      remainingIssues: [],
    };
    const logged = tomeStatsLog(stats);
    expect(logged.outcome).toBe("staged");
    expect(logged.repairedStageCount).toBe(1);
    expect(logged.reviewIssueCount).toBe(1);
    expect(Object.keys(logged)).not.toContain("content");
    expect(Object.keys(logged)).not.toContain("lore");
  });
});
