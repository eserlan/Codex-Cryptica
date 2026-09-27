/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
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

describe("JournalComposer — Markdown formatting (#3481)", () => {
  it("holds several lines and adds the note on submit", async () => {
    const store = storeStub();
    render(JournalComposer, { props: { store, journal } });

    const input = screen.getByTestId(
      "journal-note-input",
    ) as HTMLTextAreaElement;
    await fireEvent.input(input, {
      target: { value: "Line one\nLine two" },
    });
    await fireEvent.click(screen.getByTestId("journal-note-submit"));

    expect(store.appendEntry).toHaveBeenCalledWith(
      expect.objectContaining({ content: "Line one\nLine two" }),
    );
  });

  it("wraps the selection in ** from the toolbar without submitting", async () => {
    const store = storeStub();
    render(JournalComposer, { props: { store, journal } });

    const input = screen.getByTestId(
      "journal-note-input",
    ) as HTMLTextAreaElement;
    await fireEvent.input(input, { target: { value: "bridge" } });
    input.setSelectionRange(0, 6);
    await fireEvent.click(screen.getByTestId("markdown-format-bold"));

    await waitFor(() => expect(input.value).toBe("**bridge**"));
    expect(store.appendEntry).not.toHaveBeenCalled();
  });

  it("toggles a bullet list from the toolbar", async () => {
    const store = storeStub();
    render(JournalComposer, { props: { store, journal } });

    const input = screen.getByTestId(
      "journal-note-input",
    ) as HTMLTextAreaElement;
    await fireEvent.input(input, { target: { value: "A clue" } });
    input.setSelectionRange(0, 6);
    await fireEvent.click(screen.getByTestId("markdown-format-bullet"));

    await waitFor(() => expect(input.value).toBe("- A clue"));
  });

  it("submits on Ctrl/Cmd+Enter without adding a new line", async () => {
    const store = storeStub();
    render(JournalComposer, { props: { store, journal } });

    const input = screen.getByTestId(
      "journal-note-input",
    ) as HTMLTextAreaElement;
    await fireEvent.input(input, { target: { value: "Ready" } });
    await fireEvent.keyDown(input, { key: "Enter", ctrlKey: true });

    expect(store.appendEntry).toHaveBeenCalledWith(
      expect.objectContaining({ content: "Ready" }),
    );
  });

  it("applies bold from Ctrl/Cmd+B", async () => {
    const store = storeStub();
    render(JournalComposer, { props: { store, journal } });

    const input = screen.getByTestId(
      "journal-note-input",
    ) as HTMLTextAreaElement;
    await fireEvent.input(input, { target: { value: "bridge" } });
    input.setSelectionRange(0, 6);
    await fireEvent.keyDown(input, { key: "b", ctrlKey: true });

    await waitFor(() => expect(input.value).toBe("**bridge**"));
  });
});
