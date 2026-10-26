/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// jsdom has no Web Animations API, which Svelte's transitions drive.
vi.mock("svelte/transition", async (importOriginal) => ({
  ...(await importOriginal<typeof import("svelte/transition")>()),
  fade: () => ({ duration: 0 }),
  scale: () => ({ duration: 0 }),
}));

// jsdom has no pointer capture either, which the resize handle relies on.
if (typeof Element !== "undefined") {
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = () => {};
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => {};
  }
}

// The journal and note-list views have their own tests; this file is about
// which one the panel shows.
vi.mock("./SessionJournalView.svelte", () => {
  return {
    default: (anchor: any) => {
      const el = document.createElement("div");
      el.setAttribute("data-testid", "journal-view-stub");
      anchor.before(el);
    },
  };
});
vi.mock("./NoteHistory.svelte", () => ({
  default: (anchor: any) => {
    const el = document.createElement("div");
    el.setAttribute("data-testid", "note-history-stub");
    anchor.before(el);
  },
}));

import QuickNoteScratchpad from "./QuickNoteScratchpad.svelte";
import { quickNoteStore } from "$lib/stores/quicknote.svelte";

describe("QuickNoteScratchpad tabs", () => {
  beforeEach(() => {
    quickNoteStore.currentNote = {
      id: 1,
      vaultId: "vault-1",
      content: "A draft",
      status: "active",
      createdAt: 1,
    } as any;
    quickNoteStore.activeTab = "notes";
    quickNoteStore.isOpen = true;
  });

  afterEach(() => {
    quickNoteStore.isOpen = false;
    quickNoteStore.activeTab = "notes";
    quickNoteStore.currentNote = null;
  });

  it("renders the journal view when the store's tab is journal", () => {
    quickNoteStore.activeTab = "journal";
    render(QuickNoteScratchpad);

    expect(screen.getByTestId("quicknote-journal-panel")).toBeTruthy();
    expect(screen.queryByTestId("note-history-stub")).toBeNull();
  });

  it("writes tab clicks back to the store", async () => {
    render(QuickNoteScratchpad);
    expect(screen.getByTestId("note-history-stub")).toBeTruthy();

    await fireEvent.click(screen.getByTestId("quicknote-tab-journal"));
    expect(quickNoteStore.activeTab).toBe("journal");
    expect(screen.getByTestId("quicknote-journal-panel")).toBeTruthy();

    await fireEvent.click(screen.getByTestId("quicknote-tab-notes"));
    expect(quickNoteStore.activeTab).toBe("notes");
  });

  it("still shows the notes tab by default and leaves the journal hidden (FR-023)", () => {
    render(QuickNoteScratchpad);

    expect(screen.getByTestId("note-history-stub")).toBeTruthy();
    expect(screen.queryByTestId("quicknote-journal-panel")).toBeNull();
  });
});

describe("QuickNoteScratchpad — resizing (#3490)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    quickNoteStore.currentNote = null;
    quickNoteStore.activeTab = "notes";
    quickNoteStore.isOpen = true;
  });

  afterEach(() => {
    quickNoteStore.isOpen = false;
  });

  it("grows the card, centred, when the resize handle is dragged outward", async () => {
    render(QuickNoteScratchpad);

    const card = screen.getByTestId("quicknote-scratchpad");
    const startWidth = parseInt(card.style.width, 10);
    const startHeight = parseInt(card.style.height, 10);

    const handle = screen.getByTestId("quicknote-scratchpad-resize-handle");
    await fireEvent.pointerDown(handle, {
      button: 0,
      clientX: 500,
      clientY: 400,
      pointerId: 1,
    });
    await fireEvent.pointerMove(handle, {
      clientX: 540,
      clientY: 430,
      pointerId: 1,
    });
    await fireEvent.pointerUp(handle, { pointerId: 1 });

    // Growing by `delta` on one corner widens/heightens by `2 * delta`, so
    // the card stays centred instead of only growing toward that corner.
    expect(parseInt(card.style.width, 10)).toBe(startWidth + 80);
    expect(parseInt(card.style.height, 10)).toBe(startHeight + 60);

    const saved = JSON.parse(
      window.localStorage.getItem("codex_quicknote_scratchpad_size") || "{}",
    );
    expect(saved.width).toBe(startWidth + 80);
    expect(saved.height).toBe(startHeight + 60);
  });

  it("restores a previously saved size on reopen", () => {
    window.localStorage.setItem(
      "codex_quicknote_scratchpad_size",
      JSON.stringify({ x: 100, y: 100, width: 900, height: 600 }),
    );

    render(QuickNoteScratchpad);

    const card = screen.getByTestId("quicknote-scratchpad");
    expect(card.style.width).toBe("900px");
    expect(card.style.height).toBe("600px");
  });

  it("does not write to storage on a resize-handle click without movement (negative)", async () => {
    render(QuickNoteScratchpad);

    const setItemSpy = vi.spyOn(window.localStorage, "setItem");
    setItemSpy.mockClear();

    const handle = screen.getByTestId("quicknote-scratchpad-resize-handle");
    await fireEvent.pointerDown(handle, {
      button: 0,
      clientX: 500,
      clientY: 400,
      pointerId: 1,
    });
    await fireEvent.pointerUp(handle, { pointerId: 1 });

    expect(setItemSpy).not.toHaveBeenCalled();
    setItemSpy.mockRestore();
  });

  it("resizes with arrow keys and persists the keyboard-selected size", async () => {
    render(QuickNoteScratchpad);

    const card = screen.getByTestId("quicknote-scratchpad");
    const startWidth = parseInt(card.style.width, 10);
    const startHeight = parseInt(card.style.height, 10);
    const handle = screen.getByTestId("quicknote-scratchpad-resize-handle");
    handle.focus();

    await fireEvent.keyDown(handle, { key: "ArrowRight" });
    await fireEvent.keyDown(handle, { key: "ArrowDown" });

    expect(parseInt(card.style.width, 10)).toBe(startWidth + 24);
    expect(parseInt(card.style.height, 10)).toBe(startHeight + 24);

    const saved = JSON.parse(
      window.localStorage.getItem("codex_quicknote_scratchpad_size") || "{}",
    );
    expect(saved.width).toBe(startWidth + 24);
    expect(saved.height).toBe(startHeight + 24);
  });
});
