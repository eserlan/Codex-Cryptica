/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { Entity, StatSheetField } from "schema";
import StatSheetNumericOptions from "./StatSheetNumericOptions.svelte";
import StatSheetDicePoolOptions from "./StatSheetDicePoolOptions.svelte";
import StatSheetTableOptions from "./StatSheetTableOptions.svelte";
import StatSheetColumnEditor from "./StatSheetColumnEditor.svelte";
import StatSheetFieldEditor from "./StatSheetFieldEditor.svelte";
import { StatSheetEditorState } from "./StatSheetEditorState.svelte.js";
import { parseOptionalNumber } from "./stat-sheet-editor-input.js";

vi.mock("#lib/utils/stat-sheet-field-actions.js", () => ({
  applyTypedFormula: (fields: StatSheetField[]) => fields,
}));

const field: StatSheetField = { id: "hp", label: "HP", type: "counter" };
const input = (name: string, value: string) =>
  fireEvent.input(screen.getByLabelText(name), { target: { value } });

describe("parseOptionalNumber", () => {
  it("preserves decimals and zero and floors whole-number bounds", () => {
    expect(parseOptionalNumber("0")).toBe(0);
    expect(parseOptionalNumber("2.8")).toBe(2.8);
    expect(parseOptionalNumber("-2.8", true)).toBe(-3);
  });
  it("leaves empty bounds unset and preserves the existing NaN conversion", () => {
    expect(parseOptionalNumber("")).toBeUndefined();
    expect(parseOptionalNumber("", true)).toBeUndefined();
    expect(parseOptionalNumber("invalid")).toBeNaN();
  });
});

describe("StatSheetNumericOptions", () => {
  it("updates counter bounds while deferring clamping until change", async () => {
    const onUpdate = vi.fn();
    const onBoundsCommit = vi.fn();
    render(StatSheetNumericOptions, {
      field,
      onUpdate,
      onBoundsCommit,
      onFormulaCommit: vi.fn(),
    });
    await input("Min", "2.5");
    expect(onUpdate).toHaveBeenLastCalledWith({ min: 2.5 });
    expect(onBoundsCommit).not.toHaveBeenCalled();
    await fireEvent.change(screen.getByLabelText("Min"));
    expect(onBoundsCommit).toHaveBeenCalledOnce();
    await input("Max", "");
    expect(onUpdate).toHaveBeenLastCalledWith({ max: undefined });
    await input("Step", "0");
    expect(onUpdate).toHaveBeenLastCalledWith({ step: 1 });
  });
  it("edits dice target and formula, including an unset target", async () => {
    const onUpdate = vi.fn();
    const onFormulaCommit = vi.fn();
    render(StatSheetNumericOptions, {
      field: { ...field, type: "dice" },
      onUpdate,
      onBoundsCommit: vi.fn(),
      onFormulaCommit,
    });
    await input("Target", "50");
    expect(onUpdate).toHaveBeenLastCalledWith({ value: 50 });
    await input("Target", "");
    expect(onUpdate).toHaveBeenLastCalledWith({ value: undefined });
    await input("Formula", "1d100");
    expect(onUpdate).toHaveBeenLastCalledWith({ formula: "1d100" });
    expect(onFormulaCommit).not.toHaveBeenCalled();
    await fireEvent.change(screen.getByLabelText("Formula"));
    expect(onFormulaCommit).toHaveBeenCalledOnce();
  });
});

describe("StatSheetDicePoolOptions", () => {
  function setup(overrides: Partial<StatSheetField> = {}) {
    const onUpdate = vi.fn();
    const onBoundsCommit = vi.fn();
    render(StatSheetDicePoolOptions, {
      field: { ...field, type: "dice-pool", ...overrides },
      onUpdate,
      onBoundsCommit,
    });
    return { onUpdate, onBoundsCommit };
  }
  it("normalises pool counts and step sizes, including empty and out-of-range input", async () => {
    const { onUpdate, onBoundsCommit } = setup();
    expect(
      (screen.getByLabelText("Default pool count for HP") as HTMLInputElement)
        .value,
    ).toBe("3");
    for (const [raw, count] of [
      ["4.9", 4],
      ["1001", 1000],
      ["-2", 0],
      ["", 0],
    ] as const) {
      await input("Default pool count for HP", raw);
      expect(onUpdate).toHaveBeenLastCalledWith({
        value: count,
        startValue: count,
      });
    }
    expect(onBoundsCommit).not.toHaveBeenCalled();
    await fireEvent.change(screen.getByLabelText("Default pool count for HP"));
    expect(onBoundsCommit).toHaveBeenCalledOnce();
    await input("Step size for HP", "-3.7");
    expect(onUpdate).toHaveBeenLastCalledWith({ step: 3 });
    await input("Step size for HP", "");
    expect(onUpdate).toHaveBeenLastCalledWith({ step: 1 });
  });
  it("prefers the saved start count and updates optional bounds, die and permission", async () => {
    const { onUpdate } = setup({ value: 9, startValue: 4 });
    expect(
      (screen.getByLabelText("Default pool count for HP") as HTMLInputElement)
        .value,
    ).toBe("4");
    await input("Min pool count for HP", "2.9");
    expect(onUpdate).toHaveBeenLastCalledWith({ min: 2 });
    await input("Max pool count for HP", "");
    expect(onUpdate).toHaveBeenLastCalledWith({ max: undefined });
    await fireEvent.change(screen.getByLabelText("Die type for HP"), {
      target: { value: "d20" },
    });
    expect(onUpdate).toHaveBeenLastCalledWith({ formula: "d20" });
    await fireEvent.click(
      screen.getByLabelText("Allow player to change die type for HP"),
    );
    expect(onUpdate).toHaveBeenLastCalledWith({ allowDieChange: false });
  });
});

describe("StatSheetTableOptions", () => {
  const columns: NonNullable<StatSheetField["columns"]> = [
    { id: "a", label: "Name", type: "text" },
    { id: "b", label: "Damage", type: "dice" },
  ];
  function setup(cols: StatSheetField["columns"] = columns) {
    const onUpdate = vi.fn();
    render(StatSheetTableOptions, {
      field: { ...field, type: "item-table", columns: cols },
      onUpdate,
      idGenerator: { uuid: () => "fixed" },
    });
    return onUpdate;
  }
  it("adds columns using the injected generator", async () => {
    const onUpdate = setup();
    await fireEvent.click(screen.getByText("+ Add Column"));
    expect(onUpdate).toHaveBeenLastCalledWith({
      columns: [
        ...columns,
        { id: "col-fixed", label: "New Column", type: "text" },
      ],
    });
  });
  it("uses schema columns when the field has no explicit column configuration", async () => {
    const onUpdate = vi.fn();
    render(StatSheetTableOptions, {
      field: { ...field, type: "item-table" },
      onUpdate,
      idGenerator: { uuid: () => "default" },
    });
    expect(screen.getByDisplayValue("Weapon Type")).toBeTruthy();
    await fireEvent.click(screen.getByText("+ Add Column"));
    const next = onUpdate.mock.lastCall![0].columns;
    expect(next[0]).toMatchObject({ id: "name", label: "Weapon Type" });
    expect(next.at(-1)).toMatchObject({ id: "col-default" });
  });
  it("edits, moves and removes columns without mutating the original array", async () => {
    const onUpdate = setup();
    await input("Formula for column 2", "2d6");
    expect(onUpdate).toHaveBeenLastCalledWith({
      columns: [columns[0], { ...columns[1], formula: "2d6" }],
    });
    await fireEvent.click(screen.getByLabelText("Move column Damage left"));
    expect(onUpdate).toHaveBeenLastCalledWith({
      columns: [columns[1], columns[0]],
    });
    await fireEvent.click(screen.getByLabelText("Delete column Name"));
    expect(onUpdate).toHaveBeenLastCalledWith({ columns: [columns[1]] });
    expect(columns.map((c) => c.id)).toEqual(["a", "b"]);
  });
  it("disables boundary moves and changes table flags independently", async () => {
    const onUpdate = setup();
    await fireEvent.click(screen.getByLabelText("Move column Name left"));
    await fireEvent.click(screen.getByLabelText("Move column Damage right"));
    expect(onUpdate).not.toHaveBeenCalled();
    await fireEvent.click(screen.getByTestId("stock-ledger-toggle"));
    expect(onUpdate).toHaveBeenLastCalledWith({ stockLedger: true });
    await fireEvent.click(
      screen.getByLabelText("Allow linking rows to vault items"),
    );
    expect(onUpdate).toHaveBeenLastCalledWith({ linkVaultItems: false });
  });
});

describe("StatSheetColumnEditor", () => {
  it("edits identity and counter options, preserving unset bounds and zero", async () => {
    const onUpdate = vi.fn();
    const onMove = vi.fn();
    const onRemove = vi.fn();
    render(StatSheetColumnEditor, {
      col: { id: "hp", label: "HP", type: "counter" },
      colIndex: 1,
      columnCount: 3,
      onUpdate,
      onMove,
      onRemove,
    });
    await input("Label for column 2", "Health");
    expect(onUpdate).toHaveBeenLastCalledWith({ label: "Health" });
    await input("Min for column 2", "0");
    expect(onUpdate).toHaveBeenLastCalledWith({ min: 0 });
    await input("Max for column 2", "");
    expect(onUpdate).toHaveBeenLastCalledWith({ max: undefined });
    await input("Step for column 2", "0");
    expect(onUpdate).toHaveBeenLastCalledWith({ step: 1 });
    await fireEvent.change(screen.getByLabelText("Type for column 2"), {
      target: { value: "money" },
    });
    expect(onUpdate).toHaveBeenLastCalledWith({ type: "money" });
    await fireEvent.click(screen.getByLabelText("Move column HP right"));
    expect(onMove).toHaveBeenCalledWith(1);
    await fireEvent.click(screen.getByLabelText("Delete column HP"));
    expect(onRemove).toHaveBeenCalledOnce();
  });
  it("renders dice formulas and disables both moves for the only column", async () => {
    const onUpdate = vi.fn();
    const onMove = vi.fn();
    render(StatSheetColumnEditor, {
      col: { id: "roll", label: "Roll", type: "dice" },
      colIndex: 0,
      columnCount: 1,
      onUpdate,
      onMove,
      onRemove: vi.fn(),
    });
    await input("Formula for column 1", "1d8");
    expect(onUpdate).toHaveBeenLastCalledWith({ formula: "1d8" });
    for (const label of ["Move column Roll left", "Move column Roll right"]) {
      const button = screen.getByLabelText(label) as HTMLButtonElement;
      expect(button.disabled).toBe(true);
      button.click();
    }
    expect(onMove).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Min for column 1")).toBeNull();
  });
});

describe("StatSheetFieldEditor", () => {
  function setup() {
    const updateEntity = vi.fn();
    const confirm = vi.fn().mockResolvedValue(false);
    const editor = new StatSheetEditorState(
      () =>
        ({
          id: "hero",
          title: "Hero",
          statSheet: { fields: [field] },
        }) as Entity,
      { uuid: () => "fixed" },
      { updateEntity },
      { confirm },
    );
    const onMove = vi.fn();
    render(StatSheetFieldEditor, {
      field,
      index: 0,
      fieldCount: 2,
      editor,
      idGenerator: { uuid: () => "fixed" },
      onMove,
    });
    return { editor, updateEntity, onMove };
  }
  it("delegates identity edits and moves while disabling the upper boundary", async () => {
    const { editor, onMove } = setup();
    await input("Field label", "Health");
    expect(editor.fields[0].label).toBe("Health");
    const moveUp = screen.getByLabelText("Move HP up") as HTMLButtonElement;
    expect(moveUp.disabled).toBe(true);
    moveUp.click();
    expect(onMove).not.toHaveBeenCalled();
    await fireEvent.click(screen.getByLabelText("Move HP down"));
    expect(onMove).toHaveBeenCalledWith(1);
    await fireEvent.change(screen.getByLabelText("Field type"), {
      target: { value: "dice-pool" },
    });
    expect(editor.fields[0]).toMatchObject({
      type: "dice-pool",
      startValue: 3,
    });
  });
  it("connects key errors to their input and clears them after correction", async () => {
    const { editor, updateEntity } = setup();
    const key = screen.getByLabelText("Reference key for HP");
    await fireEvent.input(key, { target: { value: "Bad Key" } });
    expect(key.getAttribute("aria-invalid")).toBe("true");
    expect(key.getAttribute("aria-describedby")).toBe(
      screen.getByRole("alert").id,
    );
    expect(updateEntity).not.toHaveBeenCalled();
    await fireEvent.input(key, { target: { value: "health" } });
    expect(editor.fields[0].key).toBe("health");
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
