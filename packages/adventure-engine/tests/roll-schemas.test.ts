import { describe, expect, it } from "vitest";
import {
  dicePresetSchema,
  outcomeSchema,
  pendingRollSchema,
  resolvedRollSchema,
} from "../src/roll-schemas";
import { now } from "./reducer-fixtures";

describe("roll schemas", () => {
  it("retains dice traces and finite outcome bands", () => {
    const roll = {
      expression: "1d6",
      bands: [{ id: "success", label: "Success", minimum: 4 }],
      outcome: {
        kind: "numeric",
        value: 5,
        parts: [{ type: "dice", value: 5, sides: 6, rolls: [5], dropped: [] }],
      },
    };
    expect(resolvedRollSchema.parse(roll)).toEqual(roll);
    expect(resolvedRollSchema.safeParse({ ...roll, bands: [] }).success).toBe(
      false,
    );
    expect(
      outcomeSchema.safeParse({ kind: "numeric", value: Infinity }).success,
    ).toBe(false);
  });

  it("accepts opening pending rolls and rejects too many suggested actions", () => {
    const roll = {
      id: "roll-1",
      inputId: "input-1",
      playerAction: "",
      uncertainty: "Cross?",
      stakes: "Fall",
      resolutionStatus: "awaiting-outcome",
      createdAt: now,
    };
    expect(pendingRollSchema.parse(roll)).toEqual(roll);
    expect(
      pendingRollSchema.safeParse({ ...roll, suggestedActions: ["Wait"] })
        .success,
    ).toBe(false);
  });

  it("requires a timestamp on saved dice presets", () => {
    const preset = {
      id: "preset-1",
      label: "Chance",
      expression: "1d6",
      createdAt: now,
    };
    expect(dicePresetSchema.parse(preset)).toEqual(preset);
    expect(
      dicePresetSchema.safeParse({ ...preset, createdAt: "later" }).success,
    ).toBe(false);
  });
});
