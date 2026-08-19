/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Entity } from "schema";

const { updateEntity, confirm } = vi.hoisted(() => ({
  updateEntity: vi.fn(),
  confirm: vi.fn().mockResolvedValue(true),
}));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: { updateEntity },
}));

vi.mock("$lib/stores/ui/notification.svelte", () => ({
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
