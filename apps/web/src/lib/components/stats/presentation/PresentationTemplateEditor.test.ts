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

describe("PresentationTemplateEditor", () => {
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
});
