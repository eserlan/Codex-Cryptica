/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import type { Entity, StatSheetField } from "schema";
import { StatSheetEditorState } from "./StatSheetEditorState.svelte.js";

function setup(fields: StatSheetField[] = []) {
  const entity = {
    id: "entity",
    title: "Hero",
    statSheet: {
      templateId: "template",
      presentationTemplateId: "presentation",
      fields,
    },
  } as Entity;
  const updateEntity = vi.fn();
  const confirm = vi.fn().mockResolvedValue(true);
  const editor = new StatSheetEditorState(
    () => entity,
    { uuid: () => "fixed" },
    { updateEntity },
    { confirm },
  );
  return { editor, entity, updateEntity, confirm };
}

const hp: StatSheetField = {
  id: "hp",
  key: "health",
  label: "HP",
  type: "counter",
  value: 8,
};

describe("StatSheetEditorState", () => {
  it("copies reactive input, adds unique keys and preserves presentation metadata", () => {
    const fields = $state<StatSheetField[]>([{ ...hp, key: "new_field" }]);
    const { editor, updateEntity } = setup(fields);
    editor.addField();
    expect(fields).toHaveLength(1);
    expect(editor.fields[1]).toMatchObject({
      id: "field-fixed",
      key: "new_field_2",
    });
    expect(updateEntity).toHaveBeenLastCalledWith("entity", {
      statSheet: {
        templateId: "template",
        presentationTemplateId: "presentation",
        fields: editor.fields,
      },
    });
  });

  it("rejects malformed and colliding keys, then clears errors on a valid or empty key", () => {
    const { editor, updateEntity } = setup([
      hp,
      { id: "other", key: "taken", label: "Other", type: "text" },
    ]);
    for (const key of ["Bad Key", "taken", "other"]) {
      editor.handleKeyInput(hp, key);
      expect(editor.keyErrors.hp).toBeTruthy();
    }
    expect(updateEntity).not.toHaveBeenCalled();
    editor.handleKeyInput(hp, " new_key ");
    expect(editor.fields[0].key).toBe("new_key");
    expect(editor.keyErrors.hp).toBeUndefined();
    editor.handleKeyInput(editor.fields[0], " ");
    expect(editor.fields[0].key).toBeUndefined();
  });

  it("normalises contradictory bounds only on commit, ignoring missing fields and unchanged values", () => {
    const { editor, updateEntity } = setup([hp]);
    editor.updateField("hp", { min: 12, max: 2 });
    expect(editor.fields[0].value).toBe(8);
    editor.clampCounterToBounds("hp");
    expect(editor.fields[0]).toMatchObject({ min: 12, max: 12, value: 12 });
    updateEntity.mockClear();
    editor.clampCounterToBounds("missing");
    editor.clampCounterToBounds("hp");
    expect(updateEntity).not.toHaveBeenCalled();
  });

  it("initialises table and dice-pool types without discarding existing settings", () => {
    const { editor } = setup([hp]);
    editor.changeFieldType(hp, "item-table");
    expect(editor.fields[0].columns?.length).toBeGreaterThan(0);
    editor.updateField("hp", {
      value: -2.5,
      step: -3.5,
      formula: "d8",
      allowDieChange: false,
    });
    editor.changeFieldType(editor.fields[0], "dice-pool");
    expect(editor.fields[0]).toMatchObject({
      value: 0,
      startValue: 0,
      step: 3,
      min: 0,
      formula: "d8",
      allowDieChange: false,
    });
    editor.updateField("hp", {
      value: undefined,
      formula: undefined,
      allowDieChange: undefined,
    });
    editor.changeFieldType(editor.fields[0], "dice-pool");
    expect(editor.fields[0]).toMatchObject({
      value: 3,
      startValue: 3,
      formula: "d6",
      allowDieChange: true,
    });
  });

  it("keeps valued fields and all assignments when confirmation is cancelled", async () => {
    const { editor, confirm, updateEntity } = setup([hp]);
    confirm.mockResolvedValue(false);
    await editor.removeField(hp);
    await editor.clearAllFields();
    expect(editor.fields).toEqual([hp]);
    expect(updateEntity).not.toHaveBeenCalled();
  });

  it("deletes confirmed valued fields and clears the template assignment", async () => {
    const { editor, confirm, updateEntity } = setup([hp]);
    await editor.removeField(hp);
    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Delete Field" }),
    );
    expect(editor.fields).toEqual([]);
    await editor.clearAllFields();
    expect(updateEntity).toHaveBeenLastCalledWith("entity", {
      statSheet: { templateId: null, fields: [] },
    });
  });

  it.each([undefined, "", 0])(
    "deletes default value %s without a prompt",
    async (value) => {
      const field = { ...hp, value };
      const { editor, confirm } = setup([field]);
      await editor.removeField(field);
      expect(confirm).not.toHaveBeenCalled();
      expect(editor.fields).toEqual([]);
    },
  );
});
