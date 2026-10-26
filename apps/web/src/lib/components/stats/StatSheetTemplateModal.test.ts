/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Entity } from "schema";

const { updateEntity, confirm, notify, saveAsTemplate } = vi.hoisted(() => ({
  updateEntity: vi.fn(),
  confirm: vi.fn(),
  notify: vi.fn(),
  saveAsTemplate: vi.fn(),
}));

vi.mock("#lib/stores/vault.svelte.js", () => ({
  vault: { updateEntity },
}));

vi.mock("#lib/stores/ui/notification.svelte.js", () => ({
  notificationStore: { confirm, notify },
}));

const DEFAULT_TEMPLATES = [
  {
    id: "builtin-dnd-npc",
    name: "D&D NPC",
    description: "Quick stats",
    fields: [{ id: "hp", label: "Hit Points", type: "counter" }],
  },
];

const templateState = vi.hoisted(() => ({ templates: [] as any[] }));

vi.mock("#lib/stores/stat-sheet-templates.svelte.js", () => ({
  statSheetTemplates: {
    get allTemplates() {
      return templateState.templates;
    },
    get availableTemplates() {
      return templateState.templates;
    },
    cloneTemplateFields: (t: any) => t.fields.map((f: any) => ({ ...f })),
    saveAsTemplate,
  },
}));

vi.mock("#lib/stores/categories.svelte.js", () => ({
  categories: {
    getCategory: (id: string) =>
      id === "location" ? { id, label: "Location" } : undefined,
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
    templateState.templates = DEFAULT_TEMPLATES;
    updateEntity.mockClear();
    confirm.mockClear();
    notify.mockClear();
    saveAsTemplate.mockClear();
    saveAsTemplate.mockResolvedValue({ id: "template-x", name: "My Layout" });
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
    expect(notify).toHaveBeenCalledWith(
      expect.stringContaining("My Layout"),
      "success",
    );
  });

  it("notifies on failure when saving a template fails", async () => {
    saveAsTemplate.mockResolvedValueOnce(null);
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

    expect(notify).toHaveBeenCalledWith(
      expect.stringContaining("Failed"),
      "error",
    );
  });

  it("clears the active stat sheet when user clicks clear template and confirms", async () => {
    confirm.mockResolvedValueOnce(true);
    const entity = buildEntity({
      statSheet: {
        templateId: "builtin-dnd-npc",
        fields: [{ id: "hp", label: "Hit Points", type: "counter" }],
      },
    });
    render(StatSheetTemplateModal, { entity });

    expect(
      screen.getByTestId("stat-sheet-active-template-banner"),
    ).toBeTruthy();

    await fireEvent.click(screen.getByTestId("stat-sheet-clear-template"));

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

  describe("category suggestions (#3960)", () => {
    const characterSheet = {
      id: "builtin-dnd-character",
      name: "D&D Character",
      category: "character",
      fields: [{ id: "str", label: "STR", type: "number" }],
    };
    const settlement = {
      id: "builtin-settlement",
      name: "Settlement Overview",
      category: "location",
      fields: [{ id: "population", label: "Population", type: "number" }],
    };
    const plain = {
      id: "vault-plain",
      name: "Plain",
      fields: [{ id: "notes", label: "Notes", type: "longtext" }],
    };

    beforeEach(() => {
      templateState.templates = [characterSheet, settlement, plain];
    });

    it("lists templates for the entity's category first and keeps the rest", () => {
      render(StatSheetTemplateModal, {
        entity: buildEntity({ id: "shop-1", type: "location", title: "Shop" }),
      });

      expect(
        screen.getByTestId("stat-sheet-suggested-heading").textContent,
      ).toContain("Suggested for Location");
      expect(screen.getByTestId("stat-sheet-other-heading")).toBeTruthy();
      expect(
        screen
          .getAllByTestId("stat-sheet-template-option")
          .map((option) => option.querySelector("span")?.textContent),
      ).toEqual(["Settlement Overview", "D&D Character", "Plain"]);
    });

    it("applies a suggested template to a Location", async () => {
      render(StatSheetTemplateModal, {
        entity: buildEntity({ id: "shop-1", type: "location", title: "Shop" }),
      });

      await fireEvent.click(
        screen.getAllByTestId("stat-sheet-template-option")[0],
      );

      expect(updateEntity).toHaveBeenCalledWith("shop-1", {
        statSheet: {
          templateId: "builtin-settlement",
          fields: [{ id: "population", label: "Population", type: "number" }],
        },
      });
    });

    it("shows a single ungrouped list when nothing matches the category", () => {
      render(StatSheetTemplateModal, {
        entity: buildEntity({ type: "event", title: "Feast" }),
      });

      expect(screen.queryByTestId("stat-sheet-suggested-heading")).toBeNull();
      expect(screen.queryByTestId("stat-sheet-other-heading")).toBeNull();
      expect(screen.getAllByTestId("stat-sheet-template-option")).toHaveLength(
        3,
      );
    });
  });
});
