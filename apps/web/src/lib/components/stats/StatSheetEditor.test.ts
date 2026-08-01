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
      props: { entity: buildEntity(), idGenerator: deterministicIdGenerator },
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
