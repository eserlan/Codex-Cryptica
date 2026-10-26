/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";

vi.mock("$lib/components/MarkdownEditor.svelte", async () => ({
  default: (await import("./test-support/markdown-editor-stub"))
    .markdownEditorStub,
}));

import JournalComposer from "./JournalComposer.svelte";

function storeStub(overrides: Record<string, unknown> = {}) {
  return {
    activeSectionId: undefined,
    appendEntry: vi.fn(async () => undefined),
    createSection: vi.fn(async () => undefined),
    renameSection: vi.fn(async () => undefined),
    setActiveSection: vi.fn(),
    ...overrides,
  } as any;
}

const journal = { id: "j1", sections: [], entries: [] } as any;

describe("JournalComposer, note input", () => {
  it("holds several lines and adds the note on submit", async () => {
    const store = storeStub();
    render(JournalComposer, { props: { store, journal } });

    await fireEvent.input(screen.getByTestId("journal-note-input"), {
      target: { value: "Line one\nLine two" },
    });
    await fireEvent.click(screen.getByTestId("journal-note-submit"));

    expect(store.appendEntry).toHaveBeenCalledWith(
      expect.objectContaining({ content: "Line one\nLine two" }),
    );
  });

  it("submits on Ctrl/Cmd+Enter", async () => {
    const store = storeStub();
    render(JournalComposer, { props: { store, journal } });

    const input = screen.getByTestId("journal-note-input");
    await fireEvent.input(input, { target: { value: "Ready" } });
    await fireEvent.keyDown(input, { key: "Enter", ctrlKey: true });

    expect(store.appendEntry).toHaveBeenCalledWith(
      expect.objectContaining({ content: "Ready" }),
    );
  });

  it("does not add a blank note (negative)", async () => {
    const store = storeStub();
    render(JournalComposer, { props: { store, journal } });

    await fireEvent.input(screen.getByTestId("journal-note-input"), {
      target: { value: "   " },
    });
    await fireEvent.click(screen.getByTestId("journal-note-submit"));

    expect(store.appendEntry).not.toHaveBeenCalled();
  });
});
