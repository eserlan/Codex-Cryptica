import { describe, expect, it, vi, beforeEach } from "vitest";
import type { StatSheetField } from "schema";
import { mapTovMechanicsToStatSheet } from "@codex/stat-sheet-engine";

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
  DiceParser: class {
    parse(formula: string) {
      if (formula.includes("invalid")) throw new Error("Invalid formula");
      return formula;
    }
  },
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
  abilityModifier,
  applyDerivedModifiers,
  applyTypedFormula,
  computeAdjustedCounterValue,
  rollStatSheetDiceField,
} from "./stat-sheet-field-actions";
import { diceEngine } from "dice-engine";

function diceField(overrides: Partial<StatSheetField> = {}): StatSheetField {
  return {
    id: "atk",
    label: "Attack",
    type: "dice",
    formula: "1d20+5",
    ...overrides,
  } as StatSheetField;
}

describe("abilityModifier", () => {
  it("follows the standard D&D table", () => {
    expect(abilityModifier(10)).toBe(0);
    expect(abilityModifier(11)).toBe(0);
    expect(abilityModifier(14)).toBe(2);
    expect(abilityModifier(15)).toBe(2);
    expect(abilityModifier(8)).toBe(-1);
    expect(abilityModifier(1)).toBe(-5);
  });
});

describe("applyDerivedModifiers", () => {
  function scoreField(id: string, value: number): StatSheetField {
    return {
      id,
      label: id.toUpperCase(),
      type: "number",
      value,
    } as StatSheetField;
  }

  it("rewrites a dice field's flat modifier from its source score", () => {
    const fields: StatSheetField[] = [
      scoreField("str_score", 14),
      {
        id: "str",
        label: "STR Check",
        type: "dice",
        formula: "1d20+0",
        modifierSource: "str_score",
      } as StatSheetField,
    ];

    const result = applyDerivedModifiers(fields);

    expect(result.find((f) => f.id === "str")?.formula).toBe("1d20+2");
  });

  it("preserves a customized dice base, only rewriting the trailing modifier", () => {
    const fields: StatSheetField[] = [
      scoreField("dex_score", 8),
      {
        id: "dex",
        label: "DEX Check",
        type: "dice",
        formula: "2d20kh1+0",
        modifierSource: "dex_score",
      } as StatSheetField,
    ];

    const result = applyDerivedModifiers(fields);

    expect(result.find((f) => f.id === "dex")?.formula).toBe("2d20kh1-1");
  });

  it("preserves a manually-added extra modifier term, only rewriting the last", () => {
    const fields: StatSheetField[] = [
      scoreField("str_score", 14),
      {
        id: "str",
        label: "STR Check",
        type: "dice",
        formula: "1d20+2+0",
        modifierSource: "str_score",
      } as StatSheetField,
    ];

    const result = applyDerivedModifiers(fields);

    expect(result.find((f) => f.id === "str")?.formula).toBe("1d20+2+2");
  });

  it("leaves the field untouched when the source score has no value yet", () => {
    const fields: StatSheetField[] = [
      { id: "wis_score", label: "WIS", type: "number" } as StatSheetField,
      {
        id: "wis",
        label: "WIS Check",
        type: "dice",
        formula: "1d20+0",
        modifierSource: "wis_score",
      } as StatSheetField,
    ];

    const result = applyDerivedModifiers(fields);

    expect(result.find((f) => f.id === "wis")?.formula).toBe("1d20+0");
  });

  it("resolves a modifierSource key to the canonical field (#3180)", () => {
    const fields: StatSheetField[] = [
      {
        id: "field-abc",
        key: "strength",
        label: "STR",
        type: "number",
        value: 14,
      } as StatSheetField,
      {
        id: "str",
        label: "STR Check",
        type: "dice",
        formula: "1d20+0",
        modifierSource: "strength",
      } as StatSheetField,
    ];

    const result = applyDerivedModifiers(fields);

    expect(result.find((f) => f.id === "str")?.formula).toBe("1d20+2");
  });

  it("leaves fields without a modifierSource unchanged", () => {
    const fields: StatSheetField[] = [
      {
        id: "atk",
        label: "Attack",
        type: "dice",
        formula: "1d20+5",
      } as StatSheetField,
    ];

    expect(applyDerivedModifiers(fields)).toEqual(fields);
  });

  it("preserves generated proficiency through later sheet edits", () => {
    const sheet = mapTovMechanicsToStatSheet({
      kind: "tov-character",
      data: {
        lineage: "Elf",
        heritage: "Sylvan",
        background: "Wanderer",
        className: "Rogue",
        level: 3,
        proficiencyBonus: 2,
        ac: 14,
        hp: 24,
        hitDice: "3d8+6",
        speed: "35 ft.",
        abilityScores: {
          str: 10,
          dex: 14,
          con: 14,
          int: 12,
          wis: 12,
          cha: 8,
        },
        saveProficiencies: ["dex"],
        skillProficiencies: ["Stealth"],
      },
    });
    expect(sheet).not.toBeNull();

    const editedFields = [...sheet!.fields];
    editedFields.find((field) => field.id === "level")!.value = 4;
    const updated = Object.fromEntries(
      applyDerivedModifiers(editedFields).map((field) => [field.id, field]),
    );

    expect(updated.dex_save?.formula).toBe("1d20+4");
    expect(updated.stealth?.formula).toBe("1d20+4");
  });
});

describe("applyTypedFormula", () => {
  function sheet(formula: string, score: number | null = 16) {
    return [
      {
        id: "str_score",
        label: "STR",
        type: "number",
        value: score ?? undefined,
      },
      {
        id: "str_save",
        label: "STR Save",
        type: "dice",
        formula,
        modifierSource: "str_score",
      },
    ] as StatSheetField[];
  }
  const formulaOf = (fields: StatSheetField[]) =>
    fields.find((f) => f.id === "str_save")?.formula;

  it("keeps a typed proficiency bonus through the next derived save", () => {
    const typed = applyTypedFormula(sheet("1d20+5"), "str_save");
    expect(formulaOf(typed)).toBe("1d20+2+3");

    // Any later save re-derives only the last term, and the total holds.
    expect(formulaOf(applyDerivedModifiers(typed))).toBe("1d20+2+3");

    // The derived part still follows the score.
    const stronger = typed.map((f) =>
      f.id === "str_score" ? { ...f, value: 18 } : f,
    );
    expect(formulaOf(applyDerivedModifiers(stronger))).toBe("1d20+2+4");
  });

  it("folds the bonus into an existing flat term", () => {
    expect(formulaOf(applyTypedFormula(sheet("1d20+2+4"), "str_save"))).toBe(
      "1d20+3+3",
    );
    expect(formulaOf(applyTypedFormula(sheet("1d20-2+5"), "str_save"))).toBe(
      "1d20+3",
    );
  });

  it("leaves a formula that already ends in the derived modifier alone", () => {
    expect(formulaOf(applyTypedFormula(sheet("1d20+3"), "str_save"))).toBe(
      "1d20+3",
    );
    expect(formulaOf(applyTypedFormula(sheet("1d20+2+3"), "str_save"))).toBe(
      "1d20+2+3",
    );
  });

  it("does nothing without a score or a flat last term", () => {
    expect(
      formulaOf(applyTypedFormula(sheet("1d20+5", null), "str_save")),
    ).toBe("1d20+5");
    expect(formulaOf(applyTypedFormula(sheet("1d20+1d4"), "str_save"))).toBe(
      "1d20+1d4",
    );
  });

  it("only touches the named field", () => {
    const fields = sheet("1d20+5");
    expect(applyTypedFormula(fields, "other")).toEqual(fields);
  });
});

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

    expect(display).toEqual({
      text: "= 17",
      isError: false,
      total: 17,
      roll: { total: 17, parts: [] },
    });
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

  it("shows the dice as rolled in the toast", async () => {
    mapSessionState.vttEnabled = false;
    vi.mocked(diceEngine.execute).mockReturnValueOnce({
      total: 17,
      formula: "1d20+3",
      timestamp: 0,
      parts: [
        { type: "dice", sides: 20, rolls: [14], value: 14 },
        { type: "modifier", value: 3 },
      ],
    } as never);

    await rollStatSheetDiceField(diceField({ formula: "1d20+3" }));

    expect(notify).toHaveBeenCalledWith(
      "Attack: 1d20+3 = 17 ([14] +3)",
      "success",
    );
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
    expect(successDisplay.total).toBe(17);

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
    expect(failDisplay.total).toBe(17);
  });

  it("shows just the rolled number in the non-VTT toast for target rolls", async () => {
    mapSessionState.vttEnabled = false;

    await rollStatSheetDiceField(diceField({ formula: "1d100", value: 50 }));

    expect(notify).toHaveBeenCalledWith("Attack: 1d100 = 17", "info");
  });

  it("keeps a failed target-roll toast neutral", async () => {
    mapSessionState.vttEnabled = false;

    await rollStatSheetDiceField(diceField({ formula: "1d100", value: 10 }));

    expect(notify).toHaveBeenCalledWith("Attack: 1d100 = 17", "info");
  });
});
