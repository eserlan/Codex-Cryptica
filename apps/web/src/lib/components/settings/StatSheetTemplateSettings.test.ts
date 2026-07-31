/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  renameTemplate,
  deleteTemplate,
  setDefaultTemplate,
  confirm,
  templatesState,
  BUILT_INS,
} = vi.hoisted(() => ({
  renameTemplate: vi.fn(),
  deleteTemplate: vi.fn(),
  setDefaultTemplate: vi.fn(),
  confirm: vi.fn().mockResolvedValue(true),
  templatesState: {
    templates: [{ id: "template-1", name: "My Custom Sheet", fields: [] }],
    categoryDefaults: {} as Record<string, string>,
  },
  BUILT_INS: [
    {
      id: "builtin-dnd-npc",
      name: "D&D NPC",
      description: "Quick stats",
      isBuiltIn: true,
      fields: [
        { id: "hp", label: "Hit Points", type: "counter", min: 0, max: 20 },
        { id: "atk", label: "Attack Roll", type: "dice", formula: "1d20+3" },
      ],
    },
  ],
}));

vi.mock("$lib/stores/stat-sheet-templates.svelte", () => ({
  BUILT_IN_STAT_SHEET_TEMPLATES: BUILT_INS,
  statSheetTemplates: {
    get templates() {
      return templatesState.templates;
    },
    get categoryDefaults() {
      return templatesState.categoryDefaults;
    },
    get allTemplates() {
      return [...BUILT_INS, ...templatesState.templates];
    },
    renameTemplate,
    deleteTemplate,
    setDefaultTemplate,
  },
}));

vi.mock("$lib/stores/categories.svelte", () => ({
  categories: {
    list: [
      { id: "character", label: "Character" },
      { id: "item", label: "Item" },
    ],
  },
}));

vi.mock("$lib/stores/ui/notification.svelte", () => ({
  notificationStore: { confirm },
}));

import StatSheetTemplateSettings from "./StatSheetTemplateSettings.svelte";

describe("StatSheetTemplateSettings", () => {
  beforeEach(() => {
    renameTemplate.mockClear();
    deleteTemplate.mockClear();
    setDefaultTemplate.mockClear();
    confirm.mockClear();
    confirm.mockResolvedValue(true);
    templatesState.categoryDefaults = {};
  });

  it("lists a default-template selector for every category", () => {
    render(StatSheetTemplateSettings);
    expect(
      screen.getByLabelText("Default stat sheet template for Character"),
    ).toBeTruthy();
    expect(
      screen.getByLabelText("Default stat sheet template for Item"),
    ).toBeTruthy();
  });

  it("sets the default template for a category", async () => {
    render(StatSheetTemplateSettings);

    const select = screen.getByLabelText(
      "Default stat sheet template for Character",
    ) as HTMLSelectElement;
    await fireEvent.change(select, { target: { value: "builtin-dnd-npc" } });

    expect(setDefaultTemplate).toHaveBeenCalledWith(
      "character",
      "builtin-dnd-npc",
    );
  });

  it("clears the default template for a category when 'None' is selected", async () => {
    templatesState.categoryDefaults = { character: "builtin-dnd-npc" };
    render(StatSheetTemplateSettings);

    const select = screen.getByLabelText(
      "Default stat sheet template for Character",
    ) as HTMLSelectElement;
    await fireEvent.change(select, { target: { value: "" } });

    expect(setDefaultTemplate).toHaveBeenCalledWith("character", null);
  });

  it("lists built-in templates as read-only", () => {
    render(StatSheetTemplateSettings);
    const row = screen.getByTestId("stat-sheet-builtin-row");
    expect(row.textContent).toContain("D&D NPC");
    expect(screen.getByText("Built-in")).toBeTruthy();
  });

  it("lists vault-saved templates with rename/delete controls", () => {
    render(StatSheetTemplateSettings);
    const row = screen.getByTestId("stat-sheet-template-settings-row");
    expect(row.textContent).toContain("My Custom Sheet");
    expect(
      screen.getByLabelText("Rename My Custom Sheet template"),
    ).toBeTruthy();
  });

  it("renames a vault template", async () => {
    render(StatSheetTemplateSettings);

    await fireEvent.click(
      screen.getByLabelText("Rename My Custom Sheet template"),
    );
    const input = screen.getByDisplayValue("My Custom Sheet");
    await fireEvent.input(input, { target: { value: "Renamed Sheet" } });
    await fireEvent.click(screen.getByText("Save"));

    expect(renameTemplate).toHaveBeenCalledWith("template-1", "Renamed Sheet");
  });

  it("confirms before deleting a vault template", async () => {
    render(StatSheetTemplateSettings);

    await fireEvent.click(
      screen.getByLabelText("Delete My Custom Sheet template"),
    );

    expect(confirm).toHaveBeenCalled();
    expect(deleteTemplate).toHaveBeenCalledWith("template-1");
  });

  it("does not delete when the user cancels the confirmation", async () => {
    confirm.mockResolvedValueOnce(false);
    render(StatSheetTemplateSettings);

    await fireEvent.click(
      screen.getByLabelText("Delete My Custom Sheet template"),
    );

    expect(deleteTemplate).not.toHaveBeenCalled();
  });
});
