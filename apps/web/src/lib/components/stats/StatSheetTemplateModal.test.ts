/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Entity } from "schema";

const { updateEntity, confirm, saveAsTemplate } = vi.hoisted(() => ({
  updateEntity: vi.fn(),
  confirm: vi.fn(),
  saveAsTemplate: vi.fn(),
}));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: { updateEntity },
}));

vi.mock("$lib/stores/ui/notification.svelte", () => ({
  notificationStore: { confirm },
}));

vi.mock("$lib/stores/stat-sheet-templates.svelte", () => ({
  statSheetTemplates: {
    allTemplates: [
      {
        id: "builtin-dnd-npc",
        name: "D&D NPC",
        description: "Quick stats",
        fields: [{ id: "hp", label: "Hit Points", type: "counter" }],
      },
    ],
    cloneTemplateFields: (t: any) => t.fields.map((f: any) => ({ ...f })),
    saveAsTemplate,
  },
}));

import StatSheetTemplateModal from "./StatSheetTemplateModal.svelte";

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

describe("StatSheetTemplateModal", () => {
  beforeEach(() => {
    updateEntity.mockClear();
    confirm.mockClear();
    saveAsTemplate.mockClear();
  });

  it("applies a template directly when the entity has no existing fields", async () => {
    render(StatSheetTemplateModal, { entity: buildEntity() });

    await fireEvent.click(screen.getByTestId("stat-sheet-template-option"));

    expect(confirm).not.toHaveBeenCalled();
    expect(updateEntity).toHaveBeenCalledWith("goblin-1", {
      statSheet: {
        templateId: "builtin-dnd-npc",
        fields: [{ id: "hp", label: "Hit Points", type: "counter" }],
      },
    });
  });

  it("appends the template fields when the user confirms append", async () => {
    confirm.mockResolvedValueOnce(true);
    const entity = buildEntity({
      statSheet: {
        fields: [{ id: "existing", label: "Existing", type: "text" }],
      },
    });
    render(StatSheetTemplateModal, { entity });

    await fireEvent.click(screen.getByTestId("stat-sheet-template-option"));

    expect(updateEntity).toHaveBeenCalledWith("goblin-1", {
      statSheet: {
        templateId: "builtin-dnd-npc",
        fields: [
          { id: "existing", label: "Existing", type: "text" },
          { id: "hp", label: "Hit Points", type: "counter" },
        ],
      },
    });
  });

  it("replaces the layout when the user declines append and confirms replace", async () => {
    confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const entity = buildEntity({
      statSheet: {
        fields: [{ id: "existing", label: "Existing", type: "text" }],
      },
    });
    render(StatSheetTemplateModal, { entity });

    await fireEvent.click(screen.getByTestId("stat-sheet-template-option"));

    expect(updateEntity).toHaveBeenCalledWith("goblin-1", {
      statSheet: {
        templateId: "builtin-dnd-npc",
        fields: [{ id: "hp", label: "Hit Points", type: "counter" }],
      },
    });
  });

  it("does not apply anything when the user cancels both prompts", async () => {
    confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(false);
    const entity = buildEntity({
      statSheet: {
        fields: [{ id: "existing", label: "Existing", type: "text" }],
      },
    });
    render(StatSheetTemplateModal, { entity });

    await fireEvent.click(screen.getByTestId("stat-sheet-template-option"));

    expect(updateEntity).not.toHaveBeenCalled();
  });

  it("saves the current layout as a new template", async () => {
    const entity = buildEntity({
      statSheet: {
        fields: [{ id: "hp", label: "Hit Points", type: "counter" }],
      },
    });
    render(StatSheetTemplateModal, { entity });

    await fireEvent.input(screen.getByTestId("stat-sheet-template-save-name"), {
      target: { value: "My Layout" },
    });
    await fireEvent.click(screen.getByTestId("stat-sheet-template-save"));

    expect(saveAsTemplate).toHaveBeenCalledWith(
      "My Layout",
      [{ id: "hp", label: "Hit Points", type: "counter" }],
      { category: "npc" },
    );
  });
});
