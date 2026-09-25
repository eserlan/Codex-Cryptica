/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// jsdom has no Web Animations API, which Svelte's transitions drive.
vi.mock("svelte/transition", async (importOriginal) => ({
  ...(await importOriginal<typeof import("svelte/transition")>()),
  fade: () => ({ duration: 0 }),
  scale: () => ({ duration: 0 }),
}));

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
