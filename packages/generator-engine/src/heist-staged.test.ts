import { describe, expect, it, vi } from "vitest";
import {
  assembleHeist,
  checkHeistObjectiveStage,
  checkHeistResponseStage,
  checkHeistSecurityStage,
  generateHeistStaged,
  heistStatsLog,
  type HeistStagedStats,
} from "./heist-staged";
import {
  buildHeistPrompt,
  parseHeistResponse,
  type HeistGeneratorOptions,
} from "./public-heist";
import { validateHeist } from "./heist-validation";
import type { JsonObject } from "./staged-runtime";
import type { StagedProgressStep } from "./staged-progress";

const RESOLVED_THEFT = buildHeistPrompt({
  genre: "Classic Fantasy",
  heistType: "Theft",
  targetType: "Temple Reliquary",
  targetScale: "Major",
  prize: "Sunstone Chalice",
  campaignContext: "House Valdor's rebellion",
}).resolved;

const RESOLVED_RESCUE = buildHeistPrompt({
  genre: "Cyberpunk / Corporate",
  heistType: "Rescue",
  targetType: "Corporate Arcology",
  targetScale: "Major",
  prize: "Dr. Catherine Mercer",
}).resolved;

const VALID_STAGE_1: JsonObject = {
  title: "The Sunstone Chalice Lift",
  summary:
    "Infiltrate the Temple Reliquary and retrieve the Sunstone Chalice before dawn prayer.",
  score:
    "Steal the Sunstone Chalice from beneath the Temple Reliquary before the bells toll dawn. House Valdor will pay handsomely for its recovery.",
  objective:
    "The Sunstone Chalice sits inside a consecrated alcove on the high altar floor. It is shielded by a sacred glass ward that only responds to an anointed deacon's blessing.\n- **The catch**: Fragile — three hard impacts will crack the sacred crystal.\n- **Pressure**: Each time it is run with, dropped, or struck, advance a three-step damage clock.",
  casing: [
    {
      label: "Entry vector",
      detail:
        "A service tunnel under the south cloister is unlocked during the midnight candle replacement shift.",
    },
    {
      label: "Known obstacle",
      detail:
        "The inner cloister gates are locked and guarded by two veteran Templars whose patrol rotates hourly.",
    },
    {
      label: "The objective",
      detail:
        "The Sunstone Chalice rests upon an elevated dais, illuminated by eternal sacred oil lamps.",
    },
  ],
};

const VALID_STAGE_2: JsonObject = {
  hiddenFactor:
    "The midnight candle attendant is actually an undercover inquisitor watching for thieves, visible by their prayer beads.",
  rings: {
    perimeter:
      "Templar sentries patrol the cloister courtyard. Pass by timing their lantern sweep, by wearing pilgrim vestments, or by scaling the shadowed buttress wall.",
    access:
      "A locked oak portcullis bars access to the high altar hall. Pass by picking the lever lock, by presenting stolen deacon keys, or by crawling through the service heating ducts.",
    inner:
      "The inner reliquary sanctum guards the Sunstone Chalice behind an altar cage. Pass by using the deacon's prayer phrase, by quietly lifting the brass hinges, or by dispelling the glass seal with alchemical acid.",
  },
};

const VALID_STAGE_3: JsonObject = {
  quickReference: [
    "- **Objective**: Steal the Sunstone Chalice from the Temple Reliquary.",
    "- **Primary obstacle**: Patrols, a locked portcullis, and an altar cage.",
    "- **Hidden factor**: The midnight attendant is an undercover inquisitor.",
    "- **Point of no return**: Lifting the chalice arms the glass ward.",
    "- **Pressure**: Three strikes crack the fragile chalice.",
    "- **Default complication**: Templar reinforcements arrive early (default).",
    "- **Escape problem**: The cloister service tunnel seals five minutes after the bells sound.",
  ].join("\n"),
  alarmTrack: [
    { level: 0, label: "Quiet", detail: "Routine prayers and silent patrols." },
    {
      level: 1,
      label: "Suspicion",
      detail: "A templar notices an unlatched gate and doubles back.",
    },
    {
      level: 2,
      label: "Alert",
      detail: "Bells begin tolling and cloister gates are barred.",
    },
    {
      level: 3,
      label: "Lockdown",
      detail: "Heavy iron grates drop over courtyard arches.",
    },
    {
      level: 4,
      label: "Lethal Response",
      detail:
        "The Grand Inquisitor mobilises the elite templar strike squads to hunt the intruders.",
    },
  ],
  complications: [
    {
      label: "Early Bells (default)",
      detail: "The dawn prayer starts fifteen minutes earlier than scheduled.",
    },
    {
      label: "Rival Syndicate",
      detail: "A rival thief team is already working on the south gate.",
    },
    {
      label: "Holy Oil Spill",
      detail: "An overturned lantern sets the vestry curtains ablaze.",
    },
  ],
  moment:
    "Once the chalice is lifted from the altar dais, the ward dispels. A deacon checks the altar twenty minutes later.",
  getaway:
    "The south cloister tunnel remains open until the alarm bells toll. Otherwise, escape via the west bell tower ropes or blend into the crowd of early morning pilgrims.\n**Pursuit**: Templar horsemen follow along the river road if the alarm sounds before the crew crosses the bridge.",
  flashbacks: [
    "A bribed monk who left a side window unfastened.",
    "Forged deacon robes tailored for the heist.",
    "A sleep draught slipped into the kennel master's wine.",
    "A copy of the templar patrol schedule acquired last week.",
  ],
};

describe("checkHeistObjectiveStage", () => {
  it("accepts a complete, valid objective stage", () => {
    const check = checkHeistObjectiveStage(VALID_STAGE_1, RESOLVED_THEFT);
    expect(check.hard).toEqual([]);
    expect(check.soft).toEqual([]);
  });

  it("flags missing title, hook, objective, or casing as hard problems", () => {
    const empty: JsonObject = {};
    const check = checkHeistObjectiveStage(empty, RESOLVED_THEFT);
    expect(check.hard).toContain("missing required field: title");
    expect(check.hard).toContain("missing required player-facing hook: score");
    expect(check.hard).toContain("missing required objective section");
    expect(check.hard).toContain("missing required casing intel");
  });

  it("flags banned placeholder names as hard problems", () => {
    const draft = {
      ...VALID_STAGE_1,
      title: "The Master Thorne Score",
    };
    const check = checkHeistObjectiveStage(draft, RESOLVED_THEFT);
    expect(check.hard.some((h) => h.includes("banned placeholder name"))).toBe(
      true,
    );
  });

  describe("heistType invariant enforcement", () => {
    it.each([
      ["Theft", "destroy the sacred relic with explosives", true],
      ["Theft", "safely acquire the sacred chalice", false],
      ["Swindle", "assassinate the bank manager in his office", true],
      ["Swindle", "trick the bank manager into signing over the deed", false],
      ["Rescue", "execute the captive before they can speak", true],
      ["Rescue", "extract Dr. Catherine Mercer quietly", false],
      ["Assassination", "steal the baronial jewel collection and run", true],
      ["Assassination", "eliminate Baron Krell at the banquet", false],
      ["Plant Evidence", "steal the secret ledger from the desk", true],
      ["Plant Evidence", "leave the forged documents in the archive", false],
    ])(
      "%s with objective '%s' flagged=%s",
      (heistType, objectiveSnippet, expectedFlagged) => {
        const resolved = buildHeistPrompt({ heistType }).resolved;
        const draft = {
          ...VALID_STAGE_1,
          score: `Complete the ${heistType} before dawn.`,
          objective: `Our goal is to ${objectiveSnippet}.\n- **The catch**: Catch\n- **Pressure**: Pressure`,
        };
        const check = checkHeistObjectiveStage(draft, resolved);
        const isFlagged = check.hard.some(
          (h) => h.includes(`A ${heistType}`) || h.includes(`An ${heistType}`),
        );
        expect(isFlagged).toBe(expectedFlagged);
      },
    );

    it("flags removal wording on non-Theft heists", () => {
      const draft = {
        ...VALID_STAGE_1,
        objective:
          "Infiltrate the facility to secure the prize's location.\n- **The catch**: Catch\n- **Pressure**: Pressure",
      };
      const check = checkHeistObjectiveStage(draft, RESOLVED_RESCUE);
      expect(check.hard.some((h) => h.includes("no prize to steal"))).toBe(
        true,
      );
    });
  });

  describe("casing intel and context fidelity soft checks", () => {
    it("flags vague casing intel lacking physical or schedule facts as soft", () => {
      const draft = {
        ...VALID_STAGE_1,
        casing: [
          {
            label: "Concept",
            detail: "It will be very difficult to get in without being seen.",
          },
          {
            label: "Danger",
            detail: "Bad things might happen if the crew is careless.",
          },
          { label: "Target", detail: "The goal is important to our patrons." },
        ],
      };
      const check = checkHeistObjectiveStage(draft, RESOLVED_THEFT);
      expect(check.soft).toContain(
        "Casing intel lacks actionable physical or schedule facts (e.g. routes, shifts, guards, locks).",
      );
    });

    it("flags omission of requested prize or campaign context as soft", () => {
      const draft = {
        ...VALID_STAGE_1,
        title: "The Vault Robbery",
        score: "Steal the golden bowl from the chapel before morning.",
        objective:
          "The golden bowl is kept inside a steel box.\n- **The catch**: Fragile\n- **Pressure**: Careful handling",
      };
      const check = checkHeistObjectiveStage(draft, RESOLVED_THEFT);
      expect(check.soft.some((s) => s.includes("Sunstone Chalice"))).toBe(true);
      expect(check.soft.some((s) => s.includes("campaign context"))).toBe(true);
    });
  });
});

describe("checkHeistSecurityStage", () => {
  it("accepts valid security rings with multiple bypass approaches", () => {
    const check = checkHeistSecurityStage(
      VALID_STAGE_2,
      VALID_STAGE_1,
      RESOLVED_THEFT,
    );
    expect(check.hard).toEqual([]);
    expect(check.soft).toEqual([]);
  });

  it("flags missing rings as hard problems", () => {
    const check = checkHeistSecurityStage(
      { rings: {} },
      VALID_STAGE_1,
      RESOLVED_THEFT,
    );
    expect(check.hard).toContain("missing required security ring: Perimeter");
    expect(check.hard).toContain("missing required security ring: Access");
    expect(
      check.hard.some((h) => h.includes("missing required security ring")),
    ).toBe(true);
  });

  it("flags rings with fewer than two distinct bypass approaches", () => {
    const singleApproach = {
      rings: {
        perimeter: "Guard dogs bark at anyone nearby with no way through.",
        access:
          "A locked oak portcullis bars access to the hall. Pass by picking the lever lock, or by presenting stolen deacon keys.",
        inner:
          "The inner reliquary sanctum guards the Sunstone Chalice behind an altar cage. Pass by using the deacon's prayer phrase, or lifting the brass hinges.",
      },
    };
    const check = checkHeistSecurityStage(
      singleApproach,
      VALID_STAGE_1,
      RESOLVED_THEFT,
    );
    expect(check.hard).toContain(
      "Perimeter ring does not describe at least two distinct bypass approaches.",
    );
  });

  it("flags inner ring that fails to guard Stage 1 objective", () => {
    const wrongInner = {
      rings: {
        perimeter:
          "Patrols circle the courtyard. Pass by timing their sweep or wearing pilgrim vestments.",
        access:
          "A portcullis is locked. Pass by picking the lock or crawling through ducts.",
        inner:
          "A reinforced glass cage holds an ancient dragon skull. Pass by breaking the glass or using magic.",
      },
    };
    const check = checkHeistSecurityStage(
      wrongInner,
      VALID_STAGE_1,
      RESOLVED_THEFT,
    );
    expect(
      check.hard.some((h) => h.includes("must guard the objective or prize")),
    ).toBe(true);
  });

  it("flags unanchored clocks lacking step count or trigger as soft", () => {
    const unanchoredClock = {
      ...VALID_STAGE_2,
      rings: {
        ...((VALID_STAGE_2.rings as JsonObject) ?? {}),
        access:
          "A watch clock ticks in the hall. Pass by picking the lock or climbing through vents.",
      },
    };
    const check = checkHeistSecurityStage(
      unanchoredClock,
      VALID_STAGE_1,
      RESOLVED_THEFT,
    );
    expect(check.soft).toContain(
      "Security rings introduce a clock without specifying its step count or advance trigger.",
    );
  });
});

describe("checkHeistResponseStage", () => {
  it("accepts valid response stage with 5-step alarm and getaway", () => {
    const check = checkHeistResponseStage(
      VALID_STAGE_3,
      { ...VALID_STAGE_1, ...VALID_STAGE_2 },
      RESOLVED_THEFT,
    );
    expect(check.hard).toEqual([]);
    expect(check.soft).toEqual([]);
  });

  it("flags missing alarm track, complications, getaway, or flashbacks", () => {
    const check = checkHeistResponseStage(
      {},
      { ...VALID_STAGE_1, ...VALID_STAGE_2 },
      RESOLVED_THEFT,
    );
    expect(check.hard).toContain("missing required alarm track");
    expect(check.hard).toContain("missing required complications");
    expect(check.hard).toContain("missing required getaway section");
    expect(check.hard).toContain("missing required flashback opportunities");
  });

  it("requires exactly one default and two alternative complications", () => {
    const check = checkHeistResponseStage(
      {
        ...VALID_STAGE_3,
        complications: [
          { label: "Early Bells (default)", detail: "The bells ring early." },
          { label: "Rival Syndicate", detail: "Rivals arrive." },
          { label: "Holy Oil Spill", detail: "Oil catches fire." },
          { label: "Guard Rotation", detail: "A patrol changes course." },
        ],
      },
      { ...VALID_STAGE_1, ...VALID_STAGE_2 },
      RESOLVED_THEFT,
    );

    expect(check.hard).toContain(
      "Complications must contain exactly three entries: one default and two alternatives.",
    );
  });

  it("rejects complication arrays without exactly one default marker", () => {
    const check = checkHeistResponseStage(
      {
        ...VALID_STAGE_3,
        complications: [
          { label: "Early Bells", detail: "The bells ring early." },
          { label: "Rival Syndicate", detail: "Rivals arrive." },
          { label: "Holy Oil Spill", detail: "Oil catches fire." },
        ],
      },
      { ...VALID_STAGE_1, ...VALID_STAGE_2 },
      RESOLVED_THEFT,
    );

    expect(check.hard).toContain(
      "Complications must contain exactly three entries: one default and two alternatives.",
    );
  });

  it("flags incomplete alarm tracks with fewer than 5 escalating levels", () => {
    const incompleteAlarm = {
      ...VALID_STAGE_3,
      alarmTrack: [
        { level: 0, label: "Quiet", detail: "Routine." },
        { level: 1, label: "Alert", detail: "Alert sounded." },
      ],
    };
    const check = checkHeistResponseStage(
      incompleteAlarm,
      { ...VALID_STAGE_1, ...VALID_STAGE_2 },
      RESOLVED_THEFT,
    );
    expect(check.hard).toContain(
      "Alarm track must contain all five escalating levels (0 — Quiet through 4 — Lethal Response).",
    );
  });

  it("flags getaway that ignores prize transport constraints", () => {
    const hugeResolved = buildHeistPrompt({
      heistType: "Theft",
      targetType: "Private Vault",
    }).resolved;
    hugeResolved.prizeComplicationLabel = "Huge";

    const narrowDuctGetaway = {
      ...VALID_STAGE_3,
      getaway:
        "Escape by crawling through the narrow duct behind the altar. **Pursuit**: Guards follow on foot.",
    };
    const check = checkHeistResponseStage(
      narrowDuctGetaway,
      { ...VALID_STAGE_1, ...VALID_STAGE_2 },
      hugeResolved,
    );
    expect(
      check.hard.some((h) => h.includes("narrow passages with a Huge prize")),
    ).toBe(true);
  });

  it("flags exotic security mechanisms in getaway absent from Stage 2 as soft", () => {
    const exoticGetaway = {
      ...VALID_STAGE_3,
      getaway:
        "Cross the laser grid in the courtyard to reach the van. **Pursuit**: Guards follow.",
    };
    const check = checkHeistResponseStage(
      exoticGetaway,
      { ...VALID_STAGE_1, ...VALID_STAGE_2 },
      RESOLVED_THEFT,
    );
    expect(check.soft.some((s) => s.includes("absent from Stage 2"))).toBe(
      true,
    );
  });
});

describe("assembleHeist", () => {
  it("assembles stages into a document that parseHeistResponse and validateHeist accept", () => {
    const assembled = assembleHeist(
      VALID_STAGE_1,
      VALID_STAGE_2,
      VALID_STAGE_3,
      RESOLVED_THEFT,
    );

    const parsed = parseHeistResponse(
      JSON.stringify(assembled),
      RESOLVED_THEFT,
    );
    expect(parsed.title).toBe(VALID_STAGE_1.title);
    expect(parsed.content).toContain("### The Score");
    expect(parsed.content).toContain(`### ${RESOLVED_THEFT.objectiveHeading}`);
    expect(parsed.content).toContain("### Casing the Target");
    expect(parsed.lore).toContain("### GM Quick Reference");
    expect(parsed.lore).toContain("### Security Rings");
    expect(parsed.lore).toContain("### Alarm Track");
    expect(parsed.lore).toContain("### Complications");
    expect(parsed.lore).toContain(`### ${RESOLVED_THEFT.momentHeading}`);
    expect(parsed.lore).toContain("### The Getaway");
    expect(parsed.lore).toContain("### Flashback Opportunities");

    const findings = validateHeist({
      heistType: RESOLVED_THEFT.heistType,
      genre: RESOLVED_THEFT.genre,
      content: parsed.content,
      lore: parsed.lore,
    });
    const structural = findings.filter((f) => f.severity === "structural");
    expect(structural).toEqual([]);
  });
});

describe("generateHeistStaged runner", () => {
  const options: HeistGeneratorOptions = {
    genre: "Classic Fantasy",
    heistType: "Theft",
    targetType: "Temple Reliquary",
    targetScale: "Major",
    prize: "Sunstone Chalice",
    campaignContext: "House Valdor's rebellion",
  };
  const prompt = buildHeistPrompt(options);

  function scriptedModel(
    replies: {
      stage1?: JsonObject[];
      stage2?: JsonObject[];
      stage3?: JsonObject[];
      audit?: JsonObject;
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
        if (userMessage.includes("STAGE 1 OF 3")) {
          const item = s1List[Math.min(s1Index++, s1List.length - 1)];
          return JSON.stringify(item);
        }
        if (userMessage.includes("STAGE 2 OF 3")) {
          const item = s2List[Math.min(s2Index++, s2List.length - 1)];
          return JSON.stringify(item);
        }
        if (userMessage.includes("STAGE 3 OF 3")) {
          const item = s3List[Math.min(s3Index++, s3List.length - 1)];
          return JSON.stringify(item);
        }
        if (userMessage.includes("Audit this generated tabletop RPG heist")) {
          return JSON.stringify(
            replies.audit ?? {
              verdict: "clean",
              fullScore: "Infiltrate and retrieve the chalice.",
              transitions: [
                {
                  event: "Objective completed",
                  stateBefore: "Infiltration",
                  stateAfter: "Getaway",
                  factsChanged: ["chalice: taken"],
                },
              ],
              issues: [],
            },
          );
        }
        if (userMessage.includes("Repair the heist you just audited")) {
          return JSON.stringify(
            replies.repair ??
              assembleHeist(
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

  it("happy path: completes with 4 calls (3 stages + 1 clean audit), locking earlier facts", async () => {
    const model = scriptedModel();
    const progressSteps: StagedProgressStep[][] = [];
    let statsRecorded: HeistStagedStats | undefined;

    const result = await generateHeistStaged(prompt, options, {
      complete: model.complete,
      onProgress: (steps) => progressSteps.push(steps),
      onStats: (s) => (statsRecorded = s),
    });

    expect(result).not.toBeNull();
    expect(result!.output.title).toBe(VALID_STAGE_1.title);
    expect(result!.stats.outcome).toBe("staged");
    expect(result!.stats.aiCalls).toBe(4); // 3 stages + 1 audit
    expect(result!.stats.repairedStages).toEqual([]);
    expect(statsRecorded).toBeDefined();
    expect(statsRecorded!.outcome).toBe("staged");

    const finalProgress = progressSteps[progressSteps.length - 1];
    expect(finalProgress.map((s) => s.status)).toEqual([
      "done",
      "done",
      "done",
      "done",
    ]);
  });

  it("retry recovery: retries a stage when the first attempt has a hard problem and succeeds", async () => {
    const invalidStage1 = { ...VALID_STAGE_1, title: "" }; // missing title
    const model = scriptedModel({
      stage1: [invalidStage1, VALID_STAGE_1],
    });

    const result = await generateHeistStaged(prompt, options, {
      complete: model.complete,
    });

    expect(result).not.toBeNull();
    expect(result!.stats.aiCalls).toBe(5); // stage 1 retried (+1)
    expect(result!.stats.repairedStages).toContain("objective");
  });

  it("keeps first draft when retry is worse", async () => {
    // Attempt 1 has soft problem, attempt 2 has hard problem
    const softDraft = {
      ...VALID_STAGE_1,
      casing: [{ label: "Idea", detail: "A thought about the mission." }],
    };
    const hardDraft = {
      ...VALID_STAGE_1,
      title: "",
      score: "",
    };
    const model = scriptedModel({
      stage1: [softDraft, hardDraft],
    });

    const result = await generateHeistStaged(prompt, options, {
      complete: model.complete,
    });

    expect(result).not.toBeNull();
    expect(result!.output.title).toBe(VALID_STAGE_1.title);
  });

  it("null fallback on unusable stage after exhausting retries", async () => {
    const broken = { title: "" };
    const model = scriptedModel({
      stage1: [broken, broken],
    });

    let statsRecorded: HeistStagedStats | undefined;
    const result = await generateHeistStaged(prompt, options, {
      complete: model.complete,
      onStats: (s) => (statsRecorded = s),
    });

    expect(result).toBeNull();
    expect(statsRecorded).toBeDefined();
    expect(statsRecorded!.outcome).toBe("fell-back");
    expect(statsRecorded!.stoppedAt).toBe("objective");
  });

  it("mid-run abort throws AbortError immediately and returns nothing", async () => {
    const controller = new AbortController();
    let callIndex = 0;
    const complete = vi.fn(async () => {
      callIndex++;
      if (callIndex === 2) {
        controller.abort();
      }
      return JSON.stringify(VALID_STAGE_1);
    });

    await expect(
      generateHeistStaged(prompt, options, {
        complete,
        signal: controller.signal,
      }),
    ).rejects.toThrow();
  });

  it("audit triggers targeted repair and accepts it if deterministic checks don't regress", async () => {
    const repairedDoc = assembleHeist(
      VALID_STAGE_1,
      VALID_STAGE_2,
      VALID_STAGE_3,
      prompt.resolved,
    );
    repairedDoc.summary = "Updated summary after successful repair.";

    const model = scriptedModel({
      audit: {
        verdict: "repair",
        fullScore: "Score summary",
        transitions: [
          {
            event: "Objective completion",
            stateBefore: "Infiltration",
            stateAfter: "Getaway",
            factsChanged: ["chalice: taken"],
          },
        ],
        issues: [
          {
            id: "state-1",
            sections: ["Security Rings"],
            problem: "Minor inconsistency in alarm timing",
            requiredFact: "Ensure alarm timing matches the gate lock.",
          },
        ],
      },
      repair: repairedDoc,
    });

    const result = await generateHeistStaged(prompt, options, {
      complete: model.complete,
    });

    expect(result).not.toBeNull();
    expect(result!.stats.coherenceRepaired).toBe(true);
    expect(result!.stats.aiCalls).toBe(5); // 3 stages + 1 audit + 1 repair
    expect(result!.output.summary).toBe(
      "Updated summary after successful repair.",
    );
  });

  it("heistStatsLog formats stats without exposing generated text", () => {
    const log = heistStatsLog({
      outcome: "staged",
      aiCalls: 4,
      elapsedMs: 1200,
      repairedStages: ["objective"],
      coherenceRepaired: true,
      reviewIssues: ["timing issue"],
      reviewSkipped: false,
      remainingIssues: [],
    });
    expect(log).toEqual({
      outcome: "staged",
      stoppedAt: undefined,
      aiCalls: 4,
      elapsedMs: 1200,
      repairedStageCount: 1,
      coherenceRepaired: true,
      reviewIssueCount: 1,
      remainingIssueCount: 0,
    });
    expect(JSON.stringify(log)).not.toContain("Sunstone Chalice");
  });
});
