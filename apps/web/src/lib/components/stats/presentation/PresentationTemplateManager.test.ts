/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StatSheetTemplate } from "schema";

const {
  saveTemplate,
  deleteTemplate,
  copyTemplateToSchema,
  exportTemplate,
  uniqueNameForSchema,
  notify,
  confirm,
  mockTemplates,
  mockStatSheetTemplates,
  availableTemplatesForSchema,
} = vi.hoisted(() => {
  const mockTemplates = [
    {
      id: "presentation-a",
      vaultId: "vault-1",
      schemaTemplateId: "schema-1",
      name: "Layout A",
      description: "First layout",
      source: "{{stat.hp}}",
      formatVersion: 1,
      isBuiltIn: false,
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    },
    {
      id: "builtin-std",
      vaultId: null,
      schemaTemplateId: "schema-1",
      name: "Standard Builtin",
      description: "Builtin layout",
      source: "{{stat.hp}}",
      formatVersion: 1,
      isBuiltIn: true,
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    },
    {
      id: "other-layout",
      vaultId: "vault-1",
      schemaTemplateId: "entity-local-stat-sheet:other-char",
      name: "Other Char Layout",
      description: "Another character's custom presentation",
      source: "{{stat.hp}}\n\n{{stat.ac}}",
      formatVersion: 1,
      isBuiltIn: false,
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    },
  ];

  const mockStatSheetTemplates = [
    {
      id: "dnd-5e",
      name: "D&D 5e Character",
      isBuiltIn: true,
      fields: [
        { id: "hp", label: "Hit Points", type: "counter" },
        { id: "ac", label: "Armor Class", type: "number" },
      ],
    },
  ];

  const availableTemplatesForSchema = vi.fn((schemaId: string) =>
    mockTemplates.filter((t) => t.schemaTemplateId === schemaId),
  );

  return {
    saveTemplate: vi.fn(),
    deleteTemplate: vi.fn(),
    copyTemplateToSchema: vi.fn(),
    exportTemplate: vi.fn(),
    uniqueNameForSchema: vi.fn((name: string) => name),
    notify: vi.fn(),
    confirm: vi.fn(),
    mockTemplates,
    mockStatSheetTemplates,
    availableTemplatesForSchema,
  };
});

vi.mock("$lib/stores/presentation-templates.svelte", () => ({
  presentationTemplates: {
    templates: mockTemplates,
    availableTemplatesForSchema,
    saveTemplate,
    deleteTemplate,
    copyTemplateToSchema,
    exportTemplate,
    uniqueNameForSchema,
  },
}));

vi.mock("$lib/stores/stat-sheet-templates.svelte", () => ({
  statSheetTemplates: {
    allTemplates: mockStatSheetTemplates,
    getDefaultPresentationTemplateId: () => null,
    setDefaultPresentationTemplate: vi.fn(),
  },
}));

vi.mock("$lib/stores/ui/notification.svelte", () => ({
  notificationStore: { notify, confirm },
}));

vi.mock("$lib/stores/ui/modal-ui.svelte", () => ({
  modalUIStore: { presentationEditorState: { open: false } },
}));

import PresentationTemplateManager from "./PresentationTemplateManager.svelte";

const schema: StatSheetTemplate = {
  id: "schema-1",
  name: "Test Schema",
  isBuiltIn: true,
  fields: [{ id: "hp", label: "Hit Points", type: "counter" }],
};

const localSchema: StatSheetTemplate = {
  id: "entity-local-stat-sheet:hero-1",
  name: "Custom Stat Sheet",
  isBuiltIn: false,
  fields: [{ id: "hp", label: "Hit Points", type: "counter" }],
};

describe("PresentationTemplateManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    availableTemplatesForSchema.mockImplementation((schemaId: string) =>
      mockTemplates.filter((t) => t.schemaTemplateId === schemaId),
    );
  });

  it("renders the list of available presentation templates for the schema", () => {
    render(PresentationTemplateManager, { schema });

    expect(screen.getByText("Layout A")).toBeTruthy();
    expect(screen.getByText("Standard Builtin")).toBeTruthy();
    expect(screen.queryByText("Other Char Layout")).toBeNull();
  });

  it("triggers export when clicking the Export button on a template row", async () => {
    render(PresentationTemplateManager, { schema });

    const exportButtons = screen.getAllByTestId("presentation-manager-export");
    expect(exportButtons.length).toBeGreaterThanOrEqual(1);

    await fireEvent.click(exportButtons[0]);

    expect(exportTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Layout A" }),
    );
    expect(notify).toHaveBeenCalledWith('Exported "Layout A"', "info");
  });

  it("allows deleting a custom template after user confirmation", async () => {
    confirm.mockResolvedValue(true);
    deleteTemplate.mockResolvedValue(true);

    render(PresentationTemplateManager, { schema });

    const deleteBtn = screen.getByTestId("presentation-manager-delete");
    await fireEvent.click(deleteBtn);

    expect(confirm).toHaveBeenCalled();
    expect(deleteTemplate).toHaveBeenCalledWith("presentation-a");
  });

  it("allows copying an existing layout from another character or template", async () => {
    copyTemplateToSchema.mockResolvedValue({
      id: "copied-1",
      schemaTemplateId: "schema-1",
      name: "Other Char Layout",
      source: "{{stat.hp}}\n\n{{stat.ac}}",
      formatVersion: 1,
    });

    render(PresentationTemplateManager, { schema });

    // Open the copy modal
    const copyFromOtherBtn = screen.getByTestId(
      "presentation-manager-copy-from-other",
    );
    await fireEvent.click(copyFromOtherBtn);

    // Should display the other character's layout
    expect(screen.getByText("Other Char Layout")).toBeTruthy();

    // Click confirm copy
    const copyBtn = screen.getByTestId("presentation-manager-confirm-copy");
    await fireEvent.click(copyBtn);

    expect(copyTemplateToSchema).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Other Char Layout" }),
      "schema-1",
    );
    expect(notify).toHaveBeenCalledWith(
      expect.stringContaining('Copied "Other Char Layout"'),
      expect.any(String),
    );
  });

  it("allows promoting an entity-local custom layout to a reusable template", async () => {
    const localTemplates = [
      {
        id: "hero-layout",
        vaultId: "vault-1",
        schemaTemplateId: "entity-local-stat-sheet:hero-1",
        name: "Hero Special Layout",
        source: "{{stat.hp}}",
        formatVersion: 1,
        isBuiltIn: false,
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      },
    ];

    availableTemplatesForSchema.mockReturnValue(localTemplates as any);

    copyTemplateToSchema.mockResolvedValue({
      id: "promoted-1",
      schemaTemplateId: "dnd-5e",
      name: "Hero Special Layout",
      source: "{{stat.hp}}",
      formatVersion: 1,
    });

    render(PresentationTemplateManager, { schema: localSchema });

    // "Save to Template" button should be available for entity-local sheets
    const promoteBtn = screen.getByTestId("presentation-manager-promote");
    await fireEvent.click(promoteBtn);

    // In promote dialog, select the reusable template
    expect(screen.getByText("D&D 5e Character")).toBeTruthy();
    const saveToTemplateBtn = screen.getByTestId(
      "presentation-manager-confirm-promote",
    );
    await fireEvent.click(saveToTemplateBtn);

    expect(copyTemplateToSchema).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Hero Special Layout" }),
      "dnd-5e",
    );
    expect(notify).toHaveBeenCalledWith(
      expect.stringContaining('Saved "Hero Special Layout" as reusable layout'),
      "success",
    );
  });

  it("imports a presentation package into the current schema and notifies with field compatibility", async () => {
    saveTemplate.mockResolvedValue({
      id: "imported-1",
      schemaTemplateId: "schema-1",
      name: "Imported Presentation",
      source: "{{stat.hp}}\n\n{{stat.mana}}",
      formatVersion: 1,
    });

    const { container } = render(PresentationTemplateManager, { schema });

    const fileInput = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    const fileContent = JSON.stringify({
      formatVersion: 1,
      name: "Imported Presentation",
      schemaTemplateId: "other-schema-id",
      source: "{{stat.hp}}\n\n{{stat.mana}}",
    });

    const file = {
      name: "test.presentation.json",
      text: vi.fn().mockResolvedValue(fileContent),
    } as unknown as File;

    Object.defineProperty(fileInput, "files", {
      value: [file],
      writable: true,
    });

    await fireEvent.change(fileInput);

    await vi.waitFor(() => {
      expect(saveTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          schemaTemplateId: "schema-1",
          name: "Imported Presentation",
        }),
      );
    });

    expect(notify).toHaveBeenCalledWith(
      expect.stringContaining('Imported template "Imported Presentation"'),
      "info",
    );
  });
});
