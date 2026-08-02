/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  renameTemplate,
  deleteTemplate,
  setDefaultTemplate,
  toggleTemplateEnabled,
  updateTemplateFields,
  saveAsTemplate,
  isTemplateEnabled,
  confirm,
  notify,
  templatesState,
  BUILT_INS,
} = vi.hoisted(() => ({
  renameTemplate: vi.fn(),
  deleteTemplate: vi.fn(),
  setDefaultTemplate: vi.fn(),
  toggleTemplateEnabled: vi.fn(),
  updateTemplateFields: vi.fn(),
  saveAsTemplate: vi.fn(),
  isTemplateEnabled: vi.fn().mockReturnValue(true),
  confirm: vi.fn().mockResolvedValue(true),
  notify: vi.fn(),
  templatesState: {
    templates: [
      {
        id: "template-1",
        name: "My Custom Sheet",
        fields: [
          { id: "f1", label: "Field 1", type: "text" },
          { id: "f2", label: "Field 2", type: "text" },
        ],
      },
    ],
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
    get availableTemplates() {
      return [...BUILT_INS, ...templatesState.templates];
    },
    isTemplateEnabled,
    toggleTemplateEnabled,
    renameTemplate,
    deleteTemplate,
    setDefaultTemplate,
    updateTemplateFields,
    saveAsTemplate,
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
  notificationStore: { confirm, notify },
}));

vi.mock("$app/paths", () => ({
  resolve: (path: string) => `/app${path}`,
}));

import StatSheetTemplateSettings from "./StatSheetTemplateSettings.svelte";

describe("StatSheetTemplateSettings", () => {
  beforeEach(() => {
    renameTemplate.mockClear();
    renameTemplate.mockResolvedValue(true);
    deleteTemplate.mockClear();
    deleteTemplate.mockResolvedValue(true);
    setDefaultTemplate.mockClear();
    toggleTemplateEnabled.mockClear();
    updateTemplateFields.mockClear();
    saveAsTemplate.mockClear();
    saveAsTemplate.mockResolvedValue({
      id: "template-copy",
      name: "D&D NPC (Vault copy)",
    });
    confirm.mockClear();
    confirm.mockResolvedValue(true);
    notify.mockClear();
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

  it("lists built-in templates with vault applicability toggle", () => {
    render(StatSheetTemplateSettings);
    const row = screen.getByTestId("stat-sheet-builtin-row");
    expect(row.textContent).toContain("D&D NPC");
    expect(row.textContent).toContain("Applicable");
  });

  it("saves a built-in template as an editable vault copy", async () => {
    render(StatSheetTemplateSettings);

    await fireEvent.click(
      screen.getByLabelText("Save a vault copy of D&D NPC template"),
    );

    expect(saveAsTemplate).toHaveBeenCalledWith(
      "D&D NPC (Vault copy)",
      BUILT_INS[0].fields,
      { description: "Quick stats", category: undefined },
    );
    expect(notify).toHaveBeenCalledWith(
      expect.stringContaining("You can now edit or publish it"),
      "success",
    );
  });

  it("notifies when saving a built-in template copy fails", async () => {
    saveAsTemplate.mockResolvedValueOnce(null);
    render(StatSheetTemplateSettings);

    await fireEvent.click(
      screen.getByLabelText("Save a vault copy of D&D NPC template"),
    );

    expect(notify).toHaveBeenCalledWith(
      "Failed to save a vault copy of this template.",
      "error",
    );
  });

  it("lists vault-saved templates with rename/delete controls", () => {
    render(StatSheetTemplateSettings);
    const row = screen.getByTestId("stat-sheet-template-settings-row");
    expect(row.textContent).toContain("My Custom Sheet");
    expect(
      screen.getByLabelText("Rename My Custom Sheet template"),
    ).toBeTruthy();
  });

  it("links vault template settings to the community Stat Sheet directory", () => {
    render(StatSheetTemplateSettings);

    const link = screen.getByTestId(
      "browse-community-stat-sheet-templates",
    ) as HTMLAnchorElement;

    expect(link.textContent).toContain("Browse community templates");
    expect(link.getAttribute("href")).toBe("/app/templates");
  });

  it("opens the shared publish flow for selected vault templates", async () => {
    render(StatSheetTemplateSettings);

    const publishButton = screen.getByTestId(
      "publish-selected-stat-sheet-templates",
    ) as HTMLButtonElement;
    expect(publishButton.disabled).toBe(true);

    await fireEvent.click(
      screen.getByLabelText("Select My Custom Sheet for community publishing"),
    );
    expect(publishButton.disabled).toBe(false);
    await fireEvent.click(publishButton);

    expect(screen.getByText("Share template")).toBeTruthy();
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

  it("notifies on failure when renaming a template fails", async () => {
    renameTemplate.mockResolvedValueOnce(false);
    render(StatSheetTemplateSettings);

    await fireEvent.click(
      screen.getByLabelText("Rename My Custom Sheet template"),
    );
    const input = screen.getByDisplayValue("My Custom Sheet");
    await fireEvent.input(input, { target: { value: "Renamed Sheet" } });
    await fireEvent.click(screen.getByText("Save"));

    expect(notify).toHaveBeenCalledWith(
      expect.stringContaining("Failed"),
      "error",
    );
  });

  it("notifies on failure when deleting a template fails", async () => {
    deleteTemplate.mockResolvedValueOnce(false);
    render(StatSheetTemplateSettings);

    await fireEvent.click(
      screen.getByLabelText("Delete My Custom Sheet template"),
    );

    expect(notify).toHaveBeenCalledWith(
      expect.stringContaining("Failed"),
      "error",
    );
  });

  it("calls toggleTemplateEnabled when template applicability button is clicked", async () => {
    render(StatSheetTemplateSettings);

    const toggleButtons = screen.getAllByTestId("stat-sheet-toggle-enabled");
    await fireEvent.click(toggleButtons[0]);

    expect(toggleTemplateEnabled).toHaveBeenCalledWith("builtin-dnd-npc");
  });

  it("does not render redundant bulk template visibility controls", () => {
    render(StatSheetTemplateSettings);

    expect(screen.queryByTestId("stat-sheet-enable-all")).toBeNull();
    expect(screen.queryByTestId("stat-sheet-disable-all")).toBeNull();
  });

  it("reorders template fields via drag and drop and move buttons in settings preview", async () => {
    render(StatSheetTemplateSettings);

    await fireEvent.click(
      screen.getByLabelText("Toggle preview of My Custom Sheet template"),
    );

    const downButtons = screen.getAllByLabelText("Move Field 1 down");
    await fireEvent.click(downButtons[0]);

    expect(updateTemplateFields).toHaveBeenCalledWith("template-1", [
      { id: "f2", label: "Field 2", type: "text" },
      { id: "f1", label: "Field 1", type: "text" },
    ]);
  });

  it("reorders template fields once via Alt+ArrowDown from the drag handle", async () => {
    render(StatSheetTemplateSettings);

    await fireEvent.click(
      screen.getByLabelText("Toggle preview of My Custom Sheet template"),
    );

    const handles = screen.getAllByTestId("stat-sheet-template-drag-handle");
    await fireEvent.keyDown(handles[0], { key: "ArrowDown", altKey: true });

    expect(updateTemplateFields).toHaveBeenCalledTimes(1);
    expect(updateTemplateFields).toHaveBeenCalledWith("template-1", [
      { id: "f2", label: "Field 2", type: "text" },
      { id: "f1", label: "Field 1", type: "text" },
    ]);
  });

  it("reorders template fields via Ctrl+ArrowUp from the field row", async () => {
    render(StatSheetTemplateSettings);

    await fireEvent.click(
      screen.getByLabelText("Toggle preview of My Custom Sheet template"),
    );

    const rows = screen.getAllByTestId("stat-sheet-template-field-item");
    await fireEvent.keyDown(rows[1], { key: "ArrowUp", ctrlKey: true });

    expect(updateTemplateFields).toHaveBeenCalledTimes(1);
    expect(updateTemplateFields).toHaveBeenCalledWith("template-1", [
      { id: "f2", label: "Field 2", type: "text" },
      { id: "f1", label: "Field 1", type: "text" },
    ]);
  });
});
