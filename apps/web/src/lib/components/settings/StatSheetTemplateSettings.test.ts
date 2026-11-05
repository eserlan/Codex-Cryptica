/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
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
      category: "npc",
      isBuiltIn: true,
      fields: [
        { id: "hp", label: "Hit Points", type: "counter", min: 0, max: 20 },
        { id: "atk", label: "Attack Roll", type: "dice", formula: "1d20+3" },
      ],
    },
  ],
}));

vi.mock("#lib/stores/stat-sheet/built-in-templates.js", () => ({
  BUILT_IN_STAT_SHEET_TEMPLATES: BUILT_INS,
}));

vi.mock("#lib/stores/stat-sheet-templates.svelte.js", () => ({
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

vi.mock("#lib/stores/categories.svelte.js", () => ({
  categories: {
    list: [
      { id: "character", label: "Character" },
      { id: "item", label: "Item" },
    ],
  },
}));

vi.mock("#lib/stores/ui/notification.svelte.js", () => ({
  notificationStore: { confirm, notify },
}));

vi.mock("$app/paths", () => ({
  base: "",
  asset: (p: string) => p,
  resolve: (path: string) => `/app${path.replace(/\/\([^)]+\)/g, "")}`,
}));

import StatSheetTemplateSettings from "./StatSheetTemplateSettings.svelte";
import StatSheetCategoryDefaults from "./StatSheetCategoryDefaults.svelte";
import StatSheetBuiltInTemplates from "./StatSheetBuiltInTemplates.svelte";
import StatSheetVaultTemplates from "./StatSheetVaultTemplates.svelte";
import { StatSheetTemplateFieldOrder } from "./stat-sheet-template-field-order.svelte.js";

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

  it("lists the generated character and NPC presentation layouts", () => {
    render(StatSheetTemplateSettings);

    expect(screen.getByText("Standard Character Sheet")).toBeTruthy();
    expect(screen.getByText("Standard NPC / Monster Sheet")).toBeTruthy();
  });

  it("saves a built-in template as an editable vault copy", async () => {
    render(StatSheetTemplateSettings);

    await fireEvent.click(
      screen.getByLabelText("Save a vault copy of D&D NPC template"),
    );

    expect(saveAsTemplate).toHaveBeenCalledWith(
      "D&D NPC (Vault copy)",
      BUILT_INS[0].fields,
      { description: "Quick stats", category: "npc" },
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

  it("prevents duplicate saves while a built-in template copy is in progress", async () => {
    let resolveSave: (value: { id: string; name: string }) => void;
    saveAsTemplate.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSave = resolve;
      }),
    );
    render(StatSheetTemplateSettings);

    const button = screen.getByLabelText(
      "Save a vault copy of D&D NPC template",
    ) as HTMLButtonElement;
    await fireEvent.click(button);

    expect(button.disabled).toBe(true);
    expect(button.getAttribute("aria-busy")).toBe("true");
    await fireEvent.click(button);
    expect(saveAsTemplate).toHaveBeenCalledTimes(1);

    resolveSave!({ id: "template-copy", name: "D&D NPC (Vault copy)" });
    await waitFor(() => expect(button.disabled).toBe(false));
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
  it("sets and clears defaults in the category section independently", async () => {
    render(StatSheetCategoryDefaults);
    const select = screen.getByLabelText(
      "Default stat sheet template for Character",
    );
    await fireEvent.change(select, { target: { value: "template-1" } });
    expect(setDefaultTemplate).toHaveBeenLastCalledWith(
      "character",
      "template-1",
    );
    await fireEvent.change(select, { target: { value: "" } });
    expect(setDefaultTemplate).toHaveBeenLastCalledWith("character", null);
  });

  it("uses the shared expansion callback for built-in previews", async () => {
    const togglePreview = vi.fn();
    render(StatSheetBuiltInTemplates, {
      expandedIds: new Set<string>(),
      togglePreview,
      order: new StatSheetTemplateFieldOrder(),
    });
    expect(screen.queryByTestId("stat-sheet-template-preview")).toBeNull();
    await fireEvent.click(
      screen.getByLabelText("Toggle preview of D&D NPC template"),
    );
    expect(togglePreview).toHaveBeenCalledWith("builtin-dnd-npc");
    await fireEvent.click(
      screen.getByLabelText("Save a vault copy of D&D NPC template"),
    );
    expect(saveAsTemplate).toHaveBeenCalledOnce();
  });

  it("reports a rejected built-in copy and releases the saving control", async () => {
    saveAsTemplate.mockRejectedValueOnce(new Error("Disk full"));
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    render(StatSheetBuiltInTemplates, {
      expandedIds: new Set<string>(),
      togglePreview: vi.fn(),
      order: new StatSheetTemplateFieldOrder(),
    });
    const button = screen.getByLabelText(
      "Save a vault copy of D&D NPC template",
    ) as HTMLButtonElement;
    await fireEvent.click(button);
    await waitFor(() => expect(button.disabled).toBe(false));
    expect(notify).toHaveBeenCalledWith(
      "Failed to save a vault copy of this template.",
      "error",
    );
    error.mockRestore();
  });

  it("cancels a rename and deselects publishing in the vault section", async () => {
    render(StatSheetVaultTemplates, {
      expandedIds: new Set<string>(),
      togglePreview: vi.fn(),
      order: new StatSheetTemplateFieldOrder(),
    });
    await fireEvent.click(
      screen.getByLabelText("Rename My Custom Sheet template"),
    );
    await fireEvent.click(screen.getByText("Cancel"));
    expect(renameTemplate).not.toHaveBeenCalled();
    const checkbox = screen.getByLabelText(
      "Select My Custom Sheet for community publishing",
    );
    await fireEvent.click(checkbox);
    await fireEvent.click(checkbox);
    expect(
      (
        screen.getByTestId(
          "publish-selected-stat-sheet-templates",
        ) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it("shows the vault section's empty state without actions", () => {
    const original = templatesState.templates;
    templatesState.templates = [];
    try {
      render(StatSheetVaultTemplates, {
        expandedIds: new Set<string>(),
        togglePreview: vi.fn(),
        order: new StatSheetTemplateFieldOrder(),
      });
      expect(screen.getByText("No vault templates saved yet")).toBeTruthy();
      expect(
        screen.queryByTestId("stat-sheet-template-settings-row"),
      ).toBeNull();
    } finally {
      templatesState.templates = original;
    }
  });

  it("preserves field selection across collapsing previews and shares selection between sections", async () => {
    render(StatSheetTemplateSettings);
    const vaultToggle = screen.getByLabelText(
      "Toggle preview of My Custom Sheet template",
    );
    await fireEvent.click(vaultToggle);
    await fireEvent.click(
      screen.getAllByTestId("stat-sheet-template-field-item")[1],
    );
    await fireEvent.click(vaultToggle);
    await fireEvent.click(vaultToggle);
    expect(
      screen
        .getAllByTestId("stat-sheet-template-field-item")[1]
        .getAttribute("data-selected"),
    ).toBe("true");
    await fireEvent.click(
      screen.getByLabelText("Toggle preview of D&D NPC template"),
    );
    await fireEvent.click(
      screen.getAllByTestId("stat-sheet-template-field-item")[0],
    );
    expect(
      screen
        .getAllByTestId("stat-sheet-template-field-item")[3]
        .getAttribute("data-selected"),
    ).toBe("false");
  });
});
