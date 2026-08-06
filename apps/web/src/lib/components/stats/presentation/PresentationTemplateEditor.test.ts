/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { StatSheetTemplate } from "schema";

const { saveTemplate, uniqueNameForSchema } = vi.hoisted(() => ({
  saveTemplate: vi.fn(),
  uniqueNameForSchema: vi.fn((name: string) => name),
}));

vi.mock("$lib/stores/presentation-templates.svelte", () => ({
  presentationTemplates: { saveTemplate, uniqueNameForSchema },
}));

vi.mock("$lib/stores/ui/notification.svelte", () => ({
  notificationStore: { notify: vi.fn() },
}));

import PresentationTemplateEditor from "./PresentationTemplateEditor.svelte";

const schema: StatSheetTemplate = {
  id: "schema-1",
  name: "Test Schema",
  isBuiltIn: true,
  fields: [{ id: "hp", label: "Hit Points", type: "counter" }],
};

const builtIn = {
  id: "builtin-standard",
  vaultId: null,
  schemaTemplateId: "schema-1",
  name: "Standard",
  source: "{{stat.hp}}",
  formatVersion: 1,
  isBuiltIn: true,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};

const longTextSchema: StatSheetTemplate = {
  id: "schema-notes",
  name: "Notes Schema",
  isBuiltIn: true,
  fields: [{ id: "notes", label: "Notes", type: "longtext" }],
};

describe("PresentationTemplateEditor", () => {
  it("explains the visual-builder field options in Syntax Help", async () => {
    render(PresentationTemplateEditor, { schema });

    await fireEvent.click(screen.getByTestId("presentation-editor-help-btn"));

    expect(
      screen.getByText(
        "In the Visual Builder, right-click a field chip to choose a compatible display mode or hide its label.",
      ),
    ).toBeTruthy();
  });

  it("flags an unresolved field reference before save via diagnostics", async () => {
    render(PresentationTemplateEditor, { schema });

    const textarea = screen.getByTestId("presentation-editor-source");
    await fireEvent.input(textarea, {
      target: { value: "{{stat.doesNotExist}}" },
    });

    const diagnostics = screen.getByTestId("presentation-editor-diagnostics");
    expect(diagnostics.textContent).toContain("doesNotExist");
    // Save remains available (diagnostics are non-fatal), but the name field
    // must still be filled in.
    expect(screen.getByTestId("presentation-editor-save")).toBeTruthy();
  });

  it("duplicating a built-in seeds an editable copy without a save id and does not touch the original", async () => {
    saveTemplate.mockResolvedValueOnce({
      ...builtIn,
      id: "presentation-copy",
      isBuiltIn: false,
    });
    render(PresentationTemplateEditor, {
      schema,
      template: builtIn,
      duplicate: true,
    });

    const nameInput = screen.getByTestId(
      "presentation-template-name-input",
    ) as HTMLInputElement;
    expect(nameInput.value).not.toBe(builtIn.name);

    await fireEvent.click(screen.getByTestId("presentation-editor-save"));

    expect(saveTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ id: undefined, schemaTemplateId: "schema-1" }),
    );
  });

  it("saves edits to an existing vault-owned template with its id preserved", async () => {
    const vaultOwned = {
      ...builtIn,
      id: "presentation-mine",
      isBuiltIn: false,
    };
    saveTemplate.mockResolvedValueOnce(vaultOwned);
    render(PresentationTemplateEditor, {
      schema,
      template: vaultOwned,
      duplicate: false,
    });

    await fireEvent.click(screen.getByTestId("presentation-editor-save"));

    expect(saveTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ id: "presentation-mine" }),
    );
  });

  it("strips disallowed content from the source before saving (FR-004)", async () => {
    saveTemplate.mockResolvedValueOnce({
      ...builtIn,
      id: "presentation-mine",
      isBuiltIn: false,
    });
    render(PresentationTemplateEditor, {
      schema,
      template: { ...builtIn, id: "presentation-mine", isBuiltIn: false },
      duplicate: false,
    });

    const textarea = screen.getByTestId("presentation-editor-source");
    await fireEvent.input(textarea, {
      target: { value: "<script>alert(1)</script>{{stat.hp}}" },
    });
    await fireEvent.click(screen.getByTestId("presentation-editor-save"));

    expect(saveTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ source: "{{stat.hp}}" }),
    );
  });

  it("only offers compatible display modes and saves the selected mode from the visual builder", async () => {
    const saved = {
      ...builtIn,
      id: "presentation-notes",
      schemaTemplateId: longTextSchema.id,
      isBuiltIn: false,
    };
    saveTemplate.mockResolvedValueOnce(saved);
    render(PresentationTemplateEditor, {
      schema: longTextSchema,
      template: {
        ...saved,
        source: ":::card\n[notes]\n:::",
      },
    });

    await fireEvent.contextMenu(
      screen.getByTitle("Right-click for display options"),
    );

    expect(screen.getByRole("menuitem", { name: "Notes Area" })).toBeTruthy();
    expect(
      screen.queryByRole("menuitem", { name: "Current / Max Counter" }),
    ).toBeNull();

    await fireEvent.click(screen.getByRole("menuitem", { name: "Notes Area" }));
    await fireEvent.click(screen.getByTestId("presentation-editor-save"));

    expect(saveTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        source: expect.stringContaining('{{stat.notes display="notes"}}'),
      }),
    );
  });

  it("adds a literal value to a visual table row without creating a stat field", async () => {
    const tableTemplate = {
      ...builtIn,
      id: "presentation-table",
      isBuiltIn: false,
      source:
        "### Equipment\n\n| Item | Notes |\n| --- | --- |\n| [hp] | |",
    };
    saveTemplate.mockResolvedValueOnce(tableTemplate);
    render(PresentationTemplateEditor, {
      schema,
      template: tableTemplate,
    });

    await fireEvent.click(
      screen.getByTestId("presentation-editor-add-table-value"),
    );
    const valueInput = screen.getByRole("textbox", {
      name: "Value for table row 1",
    });
    await fireEvent.input(valueInput, { target: { value: "Steel" } });
    await fireEvent.click(screen.getByTestId("presentation-editor-save"));

    expect(saveTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        source: expect.stringContaining("Steel"),
      }),
    );
  });
});
