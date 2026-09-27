/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import JournalMarkdownField from "./JournalMarkdownField.svelte";

function renderField(value = "") {
  let current = value;
  const { rerender } = render(JournalMarkdownField, {
    props: {
      value: current,
      onValueChange: handleChange,
      ariaLabel: "Journal note",
      toolbarLabel: "Note formatting",
      testIdPrefix: "journal-note",
    },
  });

  function handleChange(next: string) {
    current = next;
    rerender({ value: current, onValueChange: handleChange });
  }
}

describe("JournalMarkdownField — live preview (#3490)", () => {
  it("shows no preview while the field is empty", () => {
    renderField();
    expect(screen.queryByTestId("journal-note-preview")).toBeNull();
  });

  it("renders typed Markdown as its saved appearance, not literal syntax", async () => {
    renderField();
    const input = screen.getByTestId(
      "journal-note-input",
    ) as HTMLTextAreaElement;

    await fireEvent.input(input, {
      target: { value: "**bold** and *italic*" },
    });

    const preview = await screen.findByTestId("journal-note-preview");
    expect(preview.querySelector("strong")).not.toBeNull();
    expect(preview.querySelector("em")).not.toBeNull();
    // The raw markers are gone from the rendered preview...
    expect(preview.textContent).not.toContain("**");
    // ...but the source in the textarea itself is untouched.
    expect(input.value).toBe("**bold** and *italic*");
  });

  it("drops the preview again once the field is cleared (negative)", async () => {
    renderField();
    const input = screen.getByTestId(
      "journal-note-input",
    ) as HTMLTextAreaElement;

    await fireEvent.input(input, { target: { value: "Some text" } });
    expect(await screen.findByTestId("journal-note-preview")).not.toBeNull();

    await fireEvent.input(input, { target: { value: "   " } });
    expect(screen.queryByTestId("journal-note-preview")).toBeNull();
  });
});
