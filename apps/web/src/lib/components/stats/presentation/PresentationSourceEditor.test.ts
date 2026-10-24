/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import PresentationSourceEditor from "./PresentationSourceEditor.svelte";
const schema = {
  id: "s",
  name: "Sheet",
  isBuiltIn: false,
  fields: [{ id: "hp", label: "Health", type: "counter" as const }],
};
const diagnostics = { missing: [], unknown: [], mismatched: [] };

describe("PresentationSourceEditor", () => {
  it("replaces the current selection with a snippet and restores the cursor", async () => {
    render(PresentationSourceEditor, {
      schema,
      source: "before selection after",
      diagnostics,
    });
    await fireEvent.click(screen.getByTestId("presentation-editor-tab-code"));
    const textarea = screen.getByTestId(
      "presentation-editor-source",
    ) as HTMLTextAreaElement;
    textarea.setSelectionRange(7, 16);
    await fireEvent.click(screen.getByTitle("Insert Card Container"));
    expect(textarea.value).toBe("before :::card\n\n::: after");
    expect(textarea.selectionStart).toBe(16);
    expect(textarea.selectionEnd).toBe(16);
    expect(document.activeElement).toBe(textarea);
  });

  it("rebuilds visual overrides from code edits and preserves them on the next visual edit", async () => {
    render(PresentationSourceEditor, { schema, source: "[hp]", diagnostics });
    await fireEvent.click(screen.getByTestId("presentation-editor-tab-code"));
    const textarea = screen.getByTestId(
      "presentation-editor-source",
    ) as HTMLTextAreaElement;
    await fireEvent.input(textarea, {
      target: { value: '{{stat.hp display="progress" hide-label}}' },
    });
    await fireEvent.click(screen.getByTestId("presentation-editor-tab-visual"));
    expect(screen.getByText("no-lbl")).toBeTruthy();
    expect(screen.getByText("progress")).toBeTruthy();
    await fireEvent.contextMenu(screen.getByLabelText("Health field options"));
    await fireEvent.click(screen.getByRole("menuitem", { name: "Hide Label" }));
    expect(textarea.value).toContain('display="progress"');
    expect(textarea.value).not.toContain("hide-label");
  });

  it("generates starter source while leaving schema fields untouched", async () => {
    render(PresentationSourceEditor, { schema, source: "", diagnostics });
    await fireEvent.click(screen.getByTestId("presentation-editor-tab-code"));
    await fireEvent.click(
      screen.getByTestId("presentation-editor-auto-layout"),
    );
    expect(
      (screen.getByTestId("presentation-editor-source") as HTMLTextAreaElement)
        .value,
    ).toBe('## Sheet\n\n:::card\n{{stat.hp display="current-max"}}\n:::\n');
    expect(schema.fields).toHaveLength(1);
  });
});
