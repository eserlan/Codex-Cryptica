/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Entity } from "schema";

const { updateEntity, confirm } = vi.hoisted(() => ({
  updateEntity: vi.fn(),
  confirm: vi.fn().mockResolvedValue(true),
}));

vi.mock("#lib/stores/vault.svelte.js", () => ({
  vault: { updateEntity },
}));

vi.mock("#lib/stores/ui/notification.svelte.js", () => ({
  notificationStore: { confirm },
}));

import StatSheetEditor from "./StatSheetEditor.svelte";

function buildEntity(overrides: Partial<Entity> = {}): Entity {
  return {
    id: "goblin-1",
    type: "npc",
    title: "Goblin",
    tags: [],
    labels: [],
    aliases: [],
    connections: [],
    content: "",
    statSheet: { fields: [] },
    ...overrides,
  } as Entity;
}

describe("StatSheetEditor", () => {
  beforeEach(() => {
    updateEntity.mockClear();
    confirm.mockClear();
    confirm.mockResolvedValue(true);
  });

  it("uses provided idGenerator for deterministic field IDs", async () => {
    const deterministicIdGenerator = { uuid: () => "test-id-123" };
    render(StatSheetEditor, {
      entity: buildEntity(),
      idGenerator: deterministicIdGenerator,
    });
    const addBtn = screen.getByTestId("stat-sheet-editor-add");
    await fireEvent.click(addBtn);
    expect(updateEntity).toHaveBeenCalledWith(
      "goblin-1",
      expect.objectContaining({
        statSheet: expect.objectContaining({
          fields: [expect.objectContaining({ id: "field-test-id-123" })],
        }),
      }),
    );
  });

  it("adds a new field", async () => {
    render(StatSheetEditor, { entity: buildEntity() });

    await fireEvent.click(screen.getByTestId("stat-sheet-editor-add"));

    expect(updateEntity).toHaveBeenCalledWith(
      "goblin-1",
      expect.objectContaining({
        statSheet: expect.objectContaining({
          fields: [expect.objectContaining({ label: "New Field" })],
        }),
      }),
    );
  });

  it("uses the injected idGenerator to id a new field", async () => {
    const idGenerator = { uuid: vi.fn().mockReturnValue("fixed-id") };
    render(StatSheetEditor, { entity: buildEntity(), idGenerator });

    await fireEvent.click(screen.getByTestId("stat-sheet-editor-add"));

    expect(idGenerator.uuid).toHaveBeenCalled();
    expect(updateEntity).toHaveBeenCalledWith(
      "goblin-1",
      expect.objectContaining({
        statSheet: expect.objectContaining({
          fields: [expect.objectContaining({ id: "field-fixed-id" })],
        }),
      }),
    );
  });

  it("edits a field label", async () => {
    const entity = buildEntity({
      statSheet: {
        fields: [{ id: "hp", label: "Hit Points", type: "counter" }],
      },
    });
    render(StatSheetEditor, { entity });

    await fireEvent.input(screen.getByDisplayValue("Hit Points"), {
      target: { value: "HP" },
    });

    expect(updateEntity).toHaveBeenCalledWith(
      "goblin-1",
      expect.objectContaining({
        statSheet: expect.objectContaining({
          fields: [expect.objectContaining({ label: "HP" })],
        }),
      }),
    );
  });

  it("preserves a selected presentation while editing a manual stat sheet", async () => {
    const entity = buildEntity({
      statSheet: {
        templateId: null,
        presentationTemplateId: "presentation-custom-sheet",
        fields: [{ id: "hp", label: "Hit Points", type: "counter" }],
      },
    });
    render(StatSheetEditor, { entity });

    await fireEvent.input(screen.getByDisplayValue("Hit Points"), {
      target: { value: "HP" },
    });

    expect(updateEntity).toHaveBeenCalledWith(
      "goblin-1",
      expect.objectContaining({
        statSheet: expect.objectContaining({
          presentationTemplateId: "presentation-custom-sheet",
        }),
      }),
    );
  });

  it("reorders fields with move up/down", async () => {
    const entity = buildEntity({
      statSheet: {
        fields: [
          { id: "a", label: "A", type: "text" },
          { id: "b", label: "B", type: "text" },
        ],
      },
    });
    render(StatSheetEditor, { entity });

    const [, downA] = screen.getAllByLabelText(/Move A/);
    await fireEvent.click(downA);

    expect(updateEntity).toHaveBeenCalledWith(
      "goblin-1",
      expect.objectContaining({
        statSheet: expect.objectContaining({
          fields: [
            expect.objectContaining({ id: "b" }),
            expect.objectContaining({ id: "a" }),
          ],
        }),
      }),
    );
  });

  it("deletes a field without confirmation when it has no value", async () => {
    const entity = buildEntity({
      statSheet: {
        fields: [{ id: "hp", label: "Hit Points", type: "counter" }],
      },
    });
    render(StatSheetEditor, { entity });

    await fireEvent.click(screen.getByTestId("stat-sheet-editor-delete"));

    expect(confirm).not.toHaveBeenCalled();
    expect(updateEntity).toHaveBeenCalledWith(
      "goblin-1",
      expect.objectContaining({
        statSheet: expect.objectContaining({ fields: [] }),
      }),
    );
  });

  it("prompts for confirmation before deleting a field with a non-default value", async () => {
    const entity = buildEntity({
      statSheet: {
        fields: [{ id: "hp", label: "Hit Points", type: "counter", value: 12 }],
      },
    });
    render(StatSheetEditor, { entity });

    await fireEvent.click(screen.getByTestId("stat-sheet-editor-delete"));

    expect(confirm).toHaveBeenCalled();
  });

  it("does not delete the field when the user cancels the confirmation", async () => {
    confirm.mockResolvedValueOnce(false);
    const entity = buildEntity({
      statSheet: {
        fields: [{ id: "hp", label: "Hit Points", type: "counter", value: 12 }],
      },
    });
    render(StatSheetEditor, { entity });

    await fireEvent.click(screen.getByTestId("stat-sheet-editor-delete"));

    expect(updateEntity).not.toHaveBeenCalled();
  });

  it("clears all fields and template assignment when user clicks Clear All and confirms", async () => {
    confirm.mockResolvedValueOnce(true);
    const entity = buildEntity({
      statSheet: {
        templateId: "builtin-dnd-npc",
        fields: [{ id: "hp", label: "Hit Points", type: "counter" }],
      },
    });
    render(StatSheetEditor, { entity });

    await fireEvent.click(screen.getByTestId("stat-sheet-editor-clear-all"));

    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Clear Stat Sheet",
        isDangerous: true,
      }),
    );
    expect(updateEntity).toHaveBeenCalledWith("goblin-1", {
      statSheet: { templateId: null, fields: [] },
    });
  });

  it("reorders fields via drag and drop", async () => {
    const entity = buildEntity({
      statSheet: {
        fields: [
          { id: "a", label: "Alpha", type: "text" },
          { id: "b", label: "Beta", type: "text" },
        ],
      },
    });
    render(StatSheetEditor, { entity });

    const fieldRows = screen.getAllByTestId("stat-sheet-editor-field");
    const dataTransfer = { setData: vi.fn(), effectAllowed: "" };

    await fireEvent.dragStart(fieldRows[0], { dataTransfer });
    await fireEvent.dragOver(fieldRows[1], { dataTransfer });
    await fireEvent.drop(fieldRows[1], { dataTransfer });
    await fireEvent.dragEnd(fieldRows[0]);

    expect(updateEntity).toHaveBeenCalledWith(
      "goblin-1",
      expect.objectContaining({
        statSheet: expect.objectContaining({
          fields: [
            expect.objectContaining({ id: "b" }),
            expect.objectContaining({ id: "a" }),
          ],
        }),
      }),
    );
  });

  it("reorders fields once via Alt+ArrowDown from the drag handle", async () => {
    const entity = buildEntity({
      statSheet: {
        fields: [
          { id: "a", label: "Alpha", type: "text" },
          { id: "b", label: "Beta", type: "text" },
        ],
      },
    });
    render(StatSheetEditor, { entity });

    const handles = screen.getAllByTestId("stat-sheet-drag-handle");
    await fireEvent.keyDown(handles[0], { key: "ArrowDown", altKey: true });

    expect(updateEntity).toHaveBeenCalledTimes(1);
    expect(updateEntity).toHaveBeenCalledWith(
      "goblin-1",
      expect.objectContaining({
        statSheet: expect.objectContaining({
          fields: [
            expect.objectContaining({ id: "b" }),
            expect.objectContaining({ id: "a" }),
          ],
        }),
      }),
    );
  });

  it("seeds default columns when switching a field to Repeatable Table", async () => {
    const entity = buildEntity({
      statSheet: {
        fields: [{ id: "gear", label: "Gear", type: "text" }],
      },
    });
    render(StatSheetEditor, { entity });

    await fireEvent.change(screen.getByLabelText("Field type"), {
      target: { value: "item-table" },
    });

    expect(updateEntity).toHaveBeenCalledWith(
      "goblin-1",
      expect.objectContaining({
        statSheet: expect.objectContaining({
          fields: [
            expect.objectContaining({
              type: "item-table",
              columns: expect.arrayContaining([
                expect.objectContaining({ id: "name", label: "Weapon Type" }),
              ]),
            }),
          ],
        }),
      }),
    );
  });

  it("adds a custom column to a Repeatable Table field", async () => {
    const entity = buildEntity({
      statSheet: {
        fields: [
          {
            id: "skills",
            label: "Skills",
            type: "item-table",
            columns: [{ id: "skill", label: "Skill", type: "text" }],
          },
        ],
      },
    });
    render(StatSheetEditor, { entity });

    await fireEvent.click(screen.getByText("+ Add Column"));

    expect(updateEntity).toHaveBeenCalledWith(
      "goblin-1",
      expect.objectContaining({
        statSheet: expect.objectContaining({
          fields: [
            expect.objectContaining({
              columns: [
                expect.objectContaining({ id: "skill", label: "Skill" }),
                expect.objectContaining({ label: "New Column", type: "text" }),
              ],
            }),
          ],
        }),
      }),
    );
  });

  it("edits a column label and type on a Repeatable Table field", async () => {
    const entity = buildEntity({
      statSheet: {
        fields: [
          {
            id: "skills",
            label: "Skills",
            type: "item-table",
            columns: [{ id: "skill", label: "Skill", type: "text" }],
          },
        ],
      },
    });
    render(StatSheetEditor, { entity });

    await fireEvent.input(screen.getByDisplayValue("Skill"), {
      target: { value: "Skill Name" },
    });
    await fireEvent.change(screen.getByLabelText("Type for column 1"), {
      target: { value: "checkbox" },
    });

    expect(updateEntity).toHaveBeenLastCalledWith(
      "goblin-1",
      expect.objectContaining({
        statSheet: expect.objectContaining({
          fields: [
            expect.objectContaining({
              columns: [
                expect.objectContaining({
                  label: "Skill Name",
                  type: "checkbox",
                }),
              ],
            }),
          ],
        }),
      }),
    );
  });

  it("edits the dice formula for a Dice Formula column", async () => {
    const entity = buildEntity({
      statSheet: {
        fields: [
          {
            id: "weapons",
            label: "Weapons",
            type: "item-table",
            columns: [{ id: "damage", label: "Damage", type: "dice" }],
          },
        ],
      },
    });
    render(StatSheetEditor, { entity });

    await fireEvent.input(screen.getByLabelText("Formula for column 1"), {
      target: { value: "1d8+2" },
    });

    expect(updateEntity).toHaveBeenLastCalledWith(
      "goblin-1",
      expect.objectContaining({
        statSheet: expect.objectContaining({
          fields: [
            expect.objectContaining({
              columns: [
                expect.objectContaining({ id: "damage", formula: "1d8+2" }),
              ],
            }),
          ],
        }),
      }),
    );
  });

  it("edits min/max/step for a Counter column", async () => {
    const entity = buildEntity({
      statSheet: {
        fields: [
          {
            id: "weapons",
            label: "Weapons",
            type: "item-table",
            columns: [{ id: "hp", label: "HP", type: "counter" }],
          },
        ],
      },
    });
    render(StatSheetEditor, { entity });

    await fireEvent.input(screen.getByLabelText("Min for column 1"), {
      target: { value: "0" },
    });
    await fireEvent.input(screen.getByLabelText("Max for column 1"), {
      target: { value: "10" },
    });
    await fireEvent.input(screen.getByLabelText("Step for column 1"), {
      target: { value: "2" },
    });

    expect(updateEntity).toHaveBeenLastCalledWith(
      "goblin-1",
      expect.objectContaining({
        statSheet: expect.objectContaining({
          fields: [
            expect.objectContaining({
              columns: [
                expect.objectContaining({
                  id: "hp",
                  min: 0,
                  max: 10,
                  step: 2,
                }),
              ],
            }),
          ],
        }),
      }),
    );
  });

  it("gives each column's label/type inputs a distinct accessible name", () => {
    const entity = buildEntity({
      statSheet: {
        fields: [
          {
            id: "skills",
            label: "Skills",
            type: "item-table",
            columns: [
              { id: "skill", label: "Skill", type: "text" },
              { id: "rank", label: "Rank", type: "number" },
            ],
          },
        ],
      },
    });
    render(StatSheetEditor, { entity });

    expect(
      (screen.getByLabelText("Label for column 1") as HTMLInputElement).value,
    ).toBe("Skill");
    expect(
      (screen.getByLabelText("Label for column 2") as HTMLInputElement).value,
    ).toBe("Rank");
    expect(
      (screen.getByLabelText("Type for column 1") as HTMLSelectElement).value,
    ).toBe("text");
    expect(
      (screen.getByLabelText("Type for column 2") as HTMLSelectElement).value,
    ).toBe("number");
  });

  it("removes a column from a Repeatable Table field", async () => {
    const entity = buildEntity({
      statSheet: {
        fields: [
          {
            id: "skills",
            label: "Skills",
            type: "item-table",
            columns: [
              { id: "skill", label: "Skill", type: "text" },
              { id: "rank", label: "Rank", type: "number" },
            ],
          },
        ],
      },
    });
    render(StatSheetEditor, { entity });

    await fireEvent.click(screen.getByLabelText("Delete column Skill"));

    expect(updateEntity).toHaveBeenCalledWith(
      "goblin-1",
      expect.objectContaining({
        statSheet: expect.objectContaining({
          fields: [
            expect.objectContaining({
              columns: [expect.objectContaining({ id: "rank" })],
            }),
          ],
        }),
      }),
    );
  });

  it("toggles vault item linking for a Repeatable Table field", async () => {
    const entity = buildEntity({
      statSheet: {
        fields: [
          {
            id: "skills",
            label: "Skills",
            type: "item-table",
            columns: [{ id: "skill", label: "Skill", type: "text" }],
          },
        ],
      },
    });
    render(StatSheetEditor, { entity });

    await fireEvent.click(
      screen.getByLabelText("Allow linking rows to vault items"),
    );

    expect(updateEntity).toHaveBeenCalledWith(
      "goblin-1",
      expect.objectContaining({
        statSheet: expect.objectContaining({
          fields: [expect.objectContaining({ linkVaultItems: false })],
        }),
      }),
    );
  });

  it("reorders fields via Ctrl+ArrowUp from the field row", async () => {
    const entity = buildEntity({
      statSheet: {
        fields: [
          { id: "a", label: "Alpha", type: "text" },
          { id: "b", label: "Beta", type: "text" },
        ],
      },
    });
    render(StatSheetEditor, { entity });

    const rows = screen.getAllByTestId("stat-sheet-editor-field");
    await fireEvent.keyDown(rows[1], { key: "ArrowUp", ctrlKey: true });

    expect(updateEntity).toHaveBeenCalledTimes(1);
    expect(updateEntity).toHaveBeenCalledWith(
      "goblin-1",
      expect.objectContaining({
        statSheet: expect.objectContaining({
          fields: [
            expect.objectContaining({ id: "b" }),
            expect.objectContaining({ id: "a" }),
          ],
        }),
      }),
    );
  });
});

describe("StatSheetEditor field keys (#3180)", () => {
  beforeEach(() => {
    updateEntity.mockClear();
  });

  it("keeps a typed proficiency bonus when the formula is committed", async () => {
    render(StatSheetEditor, {
      entity: buildEntity({
        statSheet: {
          fields: [
            { id: "str_score", label: "STR", type: "number", value: 16 },
            {
              id: "str_save",
              label: "STR Save",
              type: "dice",
              formula: "1d20+3",
              modifierSource: "str_score",
            },
          ],
        },
      }),
    });

    const formula = screen.getByLabelText("Formula") as HTMLInputElement;
    await fireEvent.input(formula, { target: { value: "1d20+5" } });
    await fireEvent.change(formula);

    expect(updateEntity).toHaveBeenLastCalledWith(
      "goblin-1",
      expect.objectContaining({
        statSheet: expect.objectContaining({
          fields: expect.arrayContaining([
            expect.objectContaining({ id: "str_save", formula: "1d20+2+3" }),
          ]),
        }),
      }),
    );
  });

  it("lowers a counter's value to a committed lower maximum", async () => {
    render(StatSheetEditor, {
      entity: buildEntity({
        statSheet: {
          fields: [
            { id: "hp", label: "HP", type: "counter", max: 100, value: 100 },
          ],
        },
      }),
    });

    const max = screen.getByLabelText("Max") as HTMLInputElement;
    // Typing "12" passes through "1"; the value must not drop to 1.
    await fireEvent.input(max, { target: { value: "1" } });
    await fireEvent.input(max, { target: { value: "12" } });
    expect(updateEntity).not.toHaveBeenCalledWith(
      "goblin-1",
      expect.objectContaining({
        statSheet: expect.objectContaining({
          fields: [expect.objectContaining({ value: 1 })],
        }),
      }),
    );

    await fireEvent.change(max);

    expect(updateEntity).toHaveBeenLastCalledWith(
      "goblin-1",
      expect.objectContaining({
        statSheet: expect.objectContaining({
          fields: [expect.objectContaining({ max: 12, value: 12 })],
        }),
      }),
    );
  });

  it("raises a counter's value to a committed higher minimum", async () => {
    render(StatSheetEditor, {
      entity: buildEntity({
        statSheet: {
          fields: [
            {
              id: "hp",
              label: "HP",
              type: "counter",
              min: 0,
              max: 10,
              value: 2,
            },
          ],
        },
      }),
    });

    const min = screen.getByLabelText("Min") as HTMLInputElement;
    await fireEvent.input(min, { target: { value: "5" } });
    await fireEvent.change(min);

    expect(updateEntity).toHaveBeenLastCalledWith(
      "goblin-1",
      expect.objectContaining({
        statSheet: expect.objectContaining({
          fields: [expect.objectContaining({ min: 5, value: 5 })],
        }),
      }),
    );
  });

  it("leaves a counter value at or below a raised maximum alone", async () => {
    render(StatSheetEditor, {
      entity: buildEntity({
        statSheet: {
          fields: [
            { id: "hp", label: "HP", type: "counter", max: 10, value: 7 },
          ],
        },
      }),
    });

    const max = screen.getByLabelText("Max") as HTMLInputElement;
    await fireEvent.input(max, { target: { value: "20" } });
    await fireEvent.change(max);

    expect(updateEntity).toHaveBeenLastCalledWith(
      "goblin-1",
      expect.objectContaining({
        statSheet: expect.objectContaining({
          fields: [expect.objectContaining({ max: 20, value: 7 })],
        }),
      }),
    );
  });

  it("assigns a readable unique key to a new field", async () => {
    render(StatSheetEditor, { entity: buildEntity() });

    await fireEvent.click(screen.getByTestId("stat-sheet-editor-add"));

    expect(updateEntity).toHaveBeenCalledWith(
      "goblin-1",
      expect.objectContaining({
        statSheet: expect.objectContaining({
          fields: [
            expect.objectContaining({ label: "New Field", key: "new_field" }),
          ],
        }),
      }),
    );
  });

  it("blocks a duplicate key without persisting it", async () => {
    const entity = buildEntity({
      statSheet: {
        fields: [
          { id: "a", key: "hp", label: "HP", type: "counter" },
          { id: "b", label: "Hit Points", type: "counter" },
        ],
      },
    });
    render(StatSheetEditor, { entity });
    updateEntity.mockClear();

    await fireEvent.input(
      screen.getByLabelText("Reference key for Hit Points"),
      {
        target: { value: "hp" },
      },
    );

    expect(screen.getByRole("alert").textContent).toMatch(/already used/);
    expect(updateEntity).not.toHaveBeenCalled();
  });

  it("blocks a key that reuses another field's stable ID", async () => {
    const entity = buildEntity({
      statSheet: {
        fields: [
          { id: "hp", label: "HP", type: "counter" },
          { id: "other", label: "Other", type: "counter" },
        ],
      },
    });
    render(StatSheetEditor, { entity });
    updateEntity.mockClear();

    await fireEvent.input(screen.getByLabelText("Reference key for Other"), {
      target: { value: "hp" },
    });

    expect(screen.getByRole("alert").textContent).toMatch(/already used/);
    expect(updateEntity).not.toHaveBeenCalled();
  });

  it("blocks a malformed key without persisting it", async () => {
    const entity = buildEntity({
      statSheet: {
        fields: [{ id: "a", label: "HP", type: "counter" }],
      },
    });
    render(StatSheetEditor, { entity });
    updateEntity.mockClear();

    await fireEvent.input(screen.getByLabelText("Reference key for HP"), {
      target: { value: "hit-points" },
    });

    expect(screen.queryByRole("alert")).not.toBeNull();
    expect(updateEntity).not.toHaveBeenCalled();
  });

  it("persists a valid key and clears it when emptied", async () => {
    const entity = buildEntity({
      statSheet: {
        fields: [{ id: "a", label: "HP", type: "counter" }],
      },
    });
    render(StatSheetEditor, { entity });
    updateEntity.mockClear();

    await fireEvent.input(screen.getByLabelText("Reference key for HP"), {
      target: { value: "hit_points" },
    });

    expect(updateEntity).toHaveBeenCalledWith(
      "goblin-1",
      expect.objectContaining({
        statSheet: expect.objectContaining({
          fields: [expect.objectContaining({ id: "a", key: "hit_points" })],
        }),
      }),
    );

    updateEntity.mockClear();
    await fireEvent.input(screen.getByLabelText("Reference key for HP"), {
      target: { value: "" },
    });

    expect(updateEntity).toHaveBeenCalledWith(
      "goblin-1",
      expect.objectContaining({
        statSheet: expect.objectContaining({
          fields: [expect.objectContaining({ id: "a", key: undefined })],
        }),
      }),
    );
  });
});
