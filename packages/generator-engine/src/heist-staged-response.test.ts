import { describe, expect, it } from "vitest";
import { checkHeistResponseStage } from "./heist-staged-response";
import { buildHeistPrompt } from "./public-heist";
import {
  RESOLVED_THEFT,
  VALID_STAGE_1,
  VALID_STAGE_2,
  VALID_STAGE_3,
} from "./heist-staged.fixtures";

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
