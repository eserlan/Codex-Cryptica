import { describe, expect, it, vi, beforeEach } from "vitest";
import type { StatSheetField } from "schema";

const { addResult, notify, sendResolvedRollMessage, mapSessionState } =
  vi.hoisted(() => ({
    addResult: vi.fn().mockResolvedValue(undefined),
    notify: vi.fn(),
    sendResolvedRollMessage: vi.fn(),
    mapSessionState: { vttEnabled: true },
  }));

vi.mock("$lib/stores/dice-history.svelte", () => ({
  diceHistory: { addResult },
}));

vi.mock("$lib/stores/map-session.svelte", () => ({
  mapSession: {
    get vttEnabled() {
      return mapSessionState.vttEnabled;
    },
    sendResolvedRollMessage,
  },
}));

vi.mock("$lib/stores/ui/notification.svelte", () => ({
  notificationStore: { notify },
}));

vi.mock("dice-engine", () => ({
  diceParser: {
    parse: vi.fn((formula: string) => {
      if (formula.includes("invalid")) throw new Error("Invalid formula");
      return formula;
    }),
  },
  diceEngine: {
    execute: vi.fn(() => ({ total: 17, parts: [] })),
  },
}));

import {
  computeAdjustedCounterValue,
  rollStatSheetDiceField,
} from "./stat-sheet-field-actions";

function diceField(overrides: Partial<StatSheetField> = {}): StatSheetField {
  return {
    id: "atk",
    label: "Attack",
    type: "dice",
    formula: "1d20+5",
    ...overrides,
  } as StatSheetField;
}

describe("computeAdjustedCounterValue", () => {
  it("increments by the field's step", () => {
    const field = { id: "hp", label: "HP", type: "counter", value: 10 } as any;
    expect(computeAdjustedCounterValue(field, 1)).toBe(11);
  });

  it("respects a custom step", () => {
    const field = {
      id: "hp",
      label: "HP",
      type: "counter",
      value: 10,
      step: 5,
    } as any;
    expect(computeAdjustedCounterValue(field, 1)).toBe(15);
  });

  it("clamps at the max bound", () => {
    const field = {
      id: "hp",
      label: "HP",
      type: "counter",
      value: 20,
      max: 20,
    } as any;
    expect(computeAdjustedCounterValue(field, 1)).toBe(20);
  });

  it("clamps at the min bound", () => {
    const field = {
      id: "hp",
      label: "HP",
      type: "counter",
      value: 0,
      min: 0,
    } as any;
    expect(computeAdjustedCounterValue(field, -1)).toBe(0);
  });
});

describe("rollStatSheetDiceField", () => {
  beforeEach(() => {
    addResult.mockClear();
    notify.mockClear();
    sendResolvedRollMessage.mockClear();
    mapSessionState.vttEnabled = true;
  });

  it("returns the roll total, records history, and broadcasts when a VTT session is live", async () => {
    const display = await rollStatSheetDiceField(diceField());

    expect(display).toEqual({ text: "= 17", isError: false });
    expect(addResult).toHaveBeenCalled();
    expect(addResult).toHaveBeenCalledWith(
      expect.objectContaining({ total: 17 }),
      "modal",
      { label: "Attack" },
    );
    expect(sendResolvedRollMessage).toHaveBeenCalledWith(
      "Attack: 1d20+5",
      expect.objectContaining({ total: 17 }),
    );
    expect(notify).not.toHaveBeenCalled();
  });

  it("records history and shows a toast when no VTT session is live", async () => {
    mapSessionState.vttEnabled = false;

    await rollStatSheetDiceField(diceField());

    expect(addResult).toHaveBeenCalledWith(
      expect.objectContaining({ total: 17 }),
      "modal",
      { label: "Attack" },
    );
    expect(sendResolvedRollMessage).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith("Attack: 1d20+5 = 17", "success");
  });

  it("returns an error display for an invalid formula without throwing", async () => {
    const display = await rollStatSheetDiceField(
      diceField({ formula: "invalid+d" }),
    );

    expect(display.isError).toBe(true);
    expect(display.text).toContain("Invalid formula");
    expect(addResult).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  it("returns an error display when the field has no formula", async () => {
    const display = await rollStatSheetDiceField(
      diceField({ formula: undefined }),
    );

    expect(display.isError).toBe(true);
    expect(addResult).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  it("evaluates success vs target number when target number is set", async () => {
    const successDisplay = await rollStatSheetDiceField(
      diceField({ formula: "1d100", value: 50 }),
    );
    expect(successDisplay.text).toBe("= 17 vs 50 (Success)");
    expect(successDisplay.success).toBe(true);

    const critDisplay = await rollStatSheetDiceField(
      diceField({ formula: "1d100", value: 170 }),
    );
    expect(critDisplay.text).toBe("= 17 vs 170 (Critical Success)");
    expect(critDisplay.success).toBe(true);

    const failDisplay = await rollStatSheetDiceField(
      diceField({ formula: "1d100", value: 10 }),
    );
    expect(failDisplay.text).toBe("= 17 vs 10 (Failure)");
    expect(failDisplay.success).toBe(false);
  });

  it("shows the outcome in the non-VTT toast for target rolls", async () => {
    mapSessionState.vttEnabled = false;

    await rollStatSheetDiceField(diceField({ formula: "1d100", value: 50 }));

    expect(notify).toHaveBeenCalledWith(
      "Attack: 1d100 = 17 vs 50 (Success)",
      "success",
    );
  });

  it("uses an error toast for failed non-VTT target rolls", async () => {
    mapSessionState.vttEnabled = false;

    await rollStatSheetDiceField(diceField({ formula: "1d100", value: 10 }));

    expect(notify).toHaveBeenCalledWith(
      "Attack: 1d100 = 17 vs 10 (Failure)",
      "error",
    );
  });
});
