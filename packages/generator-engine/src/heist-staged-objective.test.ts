import { describe, expect, it } from "vitest";
import { checkHeistObjectiveStage } from "./heist-staged-objective";
import type { JsonObject } from "./staged-runtime";
import { buildHeistPrompt } from "./public-heist";
import {
  RESOLVED_THEFT,
  RESOLVED_RESCUE,
  VALID_STAGE_1,
} from "./heist-staged.fixtures";

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
