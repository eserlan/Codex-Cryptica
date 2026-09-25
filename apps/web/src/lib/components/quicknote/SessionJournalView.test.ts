/** @vitest-environment jsdom */

// Mock Svelte 5 effects for the test environment before importing the store
// chain SessionJournalView pulls in (SessionJournalStore's constructor uses
// $effect.root) — see session-journal.svelte.test.ts for the same pattern.
(globalThis as any).$effect = (v: any) => v;
(globalThis as any).$effect.root = (v: any) => v();

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../utils/idb", () => {
  const store = new Map<string, any>();
  return {
    getDB: vi.fn().mockResolvedValue({
      transaction: vi.fn(() => {
        let finish!: () => void;
        const done = new Promise<void>((resolve) => (finish = resolve));
        return {
          store: {
            get: async (id: string) => store.get(`session_journals_${id}`),
            put: async (value: any) => {
              store.set(`session_journals_${value.id}`, value);
              finish();
              return value.id;
            },
            index: () => ({
              getAll: async (vaultId: string) =>
                [...store.values()].filter(
                  (value) => value.vaultId === vaultId,
                ),
            }),
          },
          done,
          abort: finish,
        };
      }),
      get: vi.fn().mockImplementation(async (table: string, key: string) => {
        return store.get(`${table}_${key}`);
      }),
      put: vi.fn().mockImplementation(async (table: string, val: any) => {
        store.set(`${table}_${val.id}`, val);
        return val.id;
      }),
      getAllFromIndex: vi
        .fn()
        .mockImplementation(
          async (table: string, _index: string, vaultId: string) => {
            const prefix = `${table}_`;
            const results: any[] = [];
            for (const [key, value] of store) {
              if (key.startsWith(prefix) && value.vaultId === vaultId) {
                results.push(value);
              }
            }
            return results;
          },
        ),
    }),
  };
});

import { SessionJournalStore } from "$lib/stores/session-journal.svelte";
import SessionJournalView from "./SessionJournalView.svelte";

function fakeIds(prefix = "id") {
  let n = 0;
  return { uuid: () => `${prefix}-${++n}` };
}

function fakeClock(start = 1_000) {
  let now = start;
  return { now: () => now++ };
}

function newStore(vaultId = "vault-1") {
  return new SessionJournalStore(
    { activeVaultId: vaultId } as any,
    fakeIds(),
    fakeClock(),
  );
}

describe("SessionJournalView — start and add notes (US1)", () => {
  it("shows Start Session Journal, then lets a note be added after starting", async () => {
    const store = newStore("vault-a");
    render(SessionJournalView, { props: { store } });

    const startButton = screen.getByTestId("session-journal-control");
    expect(startButton.textContent).toContain("Start Session Journal");

    await fireEvent.click(startButton);
    await waitFor(() =>
      expect(screen.getByTestId("journal-note-input")).toBeTruthy(),
    );

    const input = screen.getByTestId("journal-note-input") as HTMLInputElement;
    await fireEvent.input(input, { target: { value: "The bridge collapses" } });
    await fireEvent.click(screen.getByTestId("journal-note-submit"));

    await waitFor(() =>
      expect(screen.getByTestId("journal-entry").textContent).toContain(
        "The bridge collapses",
      ),
    );
  });

  it("does not show the add-note field before a journal exists", () => {
    const store = newStore("vault-b");
    render(SessionJournalView, { props: { store } });
    expect(screen.queryByTestId("journal-note-input")).toBeNull();
  });
});

describe("SessionJournalView — sections (US2)", () => {
  it("creates then renames a section", async () => {
    const store = newStore("vault-c");
    await store.start();
    render(SessionJournalView, { props: { store } });

    const sectionInput = screen.getByTestId(
      "journal-section-input",
    ) as HTMLInputElement;
    await fireEvent.input(sectionInput, {
      target: { value: "Arrival in Port Vane" },
    });
    await fireEvent.click(screen.getByTestId("journal-section-submit"));

    await waitFor(() =>
      expect(screen.getByTestId("journal-section-name").textContent).toContain(
        "Arrival in Port Vane",
      ),
    );
    const createdSectionId = store.current!.sections[0].id;
    await fireEvent.input(screen.getByTestId("journal-note-input"), {
      target: { value: "The party arrives" },
    });
    await fireEvent.click(screen.getByTestId("journal-note-submit"));
    await waitFor(() =>
      expect(store.current?.entries[0]?.sectionId).toBe(createdSectionId),
    );

    await fireEvent.click(screen.getByTestId("journal-section-name"));
    const renameInput = screen.getByTestId(
      "journal-section-rename-input",
    ) as HTMLInputElement;
    await fireEvent.input(renameInput, { target: { value: "The Ambush" } });
    await fireEvent.keyDown(renameInput, { key: "Enter" });

    await waitFor(() =>
      expect(screen.getByTestId("journal-section-name").textContent).toContain(
        "The Ambush",
      ),
    );
  });

  it("associates a new note with the selected section", async () => {
    const store = newStore("vault-section-entry");
    await store.start();
    const section = await store.createSection("The Market");
    render(SessionJournalView, { props: { store } });
    await fireEvent.change(screen.getByTestId("journal-note-section"), {
      target: { value: section.id },
    });

    const noteInput = screen.getByTestId(
      "journal-note-input",
    ) as HTMLInputElement;
    await fireEvent.input(noteInput, { target: { value: "Met the ferryman" } });
    await fireEvent.click(screen.getByTestId("journal-note-submit"));

    await waitFor(() =>
      expect(store.current?.entries[0]?.sectionId).toBe(section.id),
    );
    expect(screen.getByTestId("journal-entry").textContent).toContain(
      "The Market",
    );
  });

  it("shows a rejection and keeps the old name when a rename is submitted empty", async () => {
    const store = newStore("vault-d");
    await store.start();
    await store.createSection("Chapter One");
    render(SessionJournalView, { props: { store } });

    await fireEvent.click(screen.getByTestId("journal-section-name"));
    const renameInput = screen.getByTestId(
      "journal-section-rename-input",
    ) as HTMLInputElement;
    await fireEvent.input(renameInput, { target: { value: "   " } });
    await fireEvent.keyDown(renameInput, { key: "Enter" });

    await waitFor(() =>
      expect(screen.getByTestId("rename-error")).toBeTruthy(),
    );
    expect(store.current?.sections[0].name).toBe("Chapter One");
  });
});

describe("SessionJournalView — end session (US3)", () => {
  it("ends the session and starting a new one creates a separate journal", async () => {
    const store = newStore("vault-e");
    await store.start();
    await store.appendEntry({ type: "manual-note", content: "Old session" });
    render(SessionJournalView, { props: { store } });

    await fireEvent.click(screen.getByTestId("end-session"));
    await waitFor(() =>
      expect(screen.getByTestId("session-journal-control")).toBeTruthy(),
    );

    await fireEvent.click(screen.getByTestId("session-journal-control"));
    await waitFor(() =>
      expect(screen.getByTestId("journal-note-input")).toBeTruthy(),
    );
    // The new journal starts empty — the ended one's content is untouched.
    expect(screen.queryByText("Old session")).toBeNull();
  });

  it("does not show the add-note field once the journal has ended", async () => {
    const store = newStore("vault-f");
    await store.start();
    await store.end();
    render(SessionJournalView, { props: { store } });

    expect(screen.queryByTestId("journal-note-input")).toBeNull();
    expect(screen.getByTestId("session-journal-control").textContent).toContain(
      "Start Session Journal",
    );
  });

  it("opens an ended journal from history so its entries remain readable", async () => {
    const store = newStore("vault-history");
    await store.start();
    await store.appendEntry({ type: "manual-note", content: "The old pact" });
    await store.end();
    render(SessionJournalView, { props: { store } });

    await fireEvent.click(
      screen.getByRole("button", { name: "Past journals" }),
    );
    await waitFor(() =>
      expect(
        screen.getByTestId(`past-journal-${store.current!.id}`),
      ).toBeTruthy(),
    );
    await fireEvent.click(
      screen.getByTestId(`past-journal-${store.current!.id}`),
    );

    expect(screen.getByTestId("journal-entry").textContent).toContain(
      "The old pact",
    );
    expect(screen.queryByTestId("journal-note-input")).toBeNull();
    expect(screen.getByTestId("back-to-current-journal")).toBeTruthy();
  });

  it("clears cached history and selection when the active vault is cleared", async () => {
    const store = newStore("vault-history-switch");
    await store.start();
    await store.appendEntry({
      type: "manual-note",
      content: "Prior vault note",
    });
    await store.end();
    render(SessionJournalView, { props: { store } });

    await fireEvent.click(
      screen.getByRole("button", { name: "Past journals" }),
    );
    const journalId = store.current!.id;
    const historyButton = await screen.findByTestId(
      `past-journal-${journalId}`,
    );
    await fireEvent.click(historyButton);
    expect(screen.getByTestId("journal-entry").textContent).toContain(
      "Prior vault note",
    );

    store.current = undefined;
    store.allJournals = [];

    await waitFor(() => {
      expect(screen.queryByText("Prior vault note")).toBeNull();
      expect(screen.queryByTestId(`past-journal-${journalId}`)).toBeNull();
      expect(screen.getByTestId("session-journal-control")).toBeTruthy();
    });
  });
});

describe("SessionJournalView — repeated submission", () => {
  it("does not append the same in-flight note twice", async () => {
    const store = newStore("vault-repeat");
    await store.start();
    let finishAppend!: () => void;
    const append = vi
      .spyOn(store, "appendEntry")
      .mockImplementation(
        () =>
          new Promise((resolve) => (finishAppend = () => resolve({} as any))),
      );
    render(SessionJournalView, { props: { store } });

    await fireEvent.input(screen.getByTestId("journal-note-input"), {
      target: { value: "One event" },
    });
    const submit = screen.getByTestId("journal-note-submit");
    await fireEvent.click(submit);
    await fireEvent.click(submit);
    expect(append).toHaveBeenCalledTimes(1);

    finishAppend();
    await waitFor(() => expect(append).toHaveBeenCalledTimes(1));
  });
});

describe("SessionJournalView — automatic entries and the current section (slice 3)", () => {
  it("shows captured entries differently from typed notes", async () => {
    const store = newStore("vault-auto-view");
    await store.start();
    await store.appendEntry({ type: "manual-note", content: "A typed note" });
    await store.appendEntry({
      type: "dice-roll",
      content: "Rolled 1d20: 14",
      sourceRef: { total: 14 },
    });
    render(SessionJournalView, { props: { store } });

    const rows = await screen.findAllByTestId("journal-entry");
    expect(rows).toHaveLength(2);
    expect(rows[0].getAttribute("data-automatic")).toBe("false");
    expect(rows[1].getAttribute("data-automatic")).toBe("true");
    expect(screen.getAllByTestId("journal-entry-label")).toHaveLength(1);
  });

  it("reads the current section from the store, so it survives the view being closed", async () => {
    const store = newStore("vault-auto-section");
    await store.start();
    const first = await store.createSection("One");
    await store.createSection("Two");
    store.setActiveSection(first.id);

    const { unmount } = render(SessionJournalView, { props: { store } });
    expect(
      (screen.getByTestId("journal-note-section") as HTMLSelectElement).value,
    ).toBe(first.id);
    unmount();

    // The panel was closed; a capture would use the same section.
    expect(store.activeSectionId).toBe(first.id);

    render(SessionJournalView, { props: { store } });
    expect(
      (screen.getByTestId("journal-note-section") as HTMLSelectElement).value,
    ).toBe(first.id);
  });

  it("writes a section choice back to the store, and 'No section' clears it", async () => {
    const store = newStore("vault-auto-choose");
    await store.start();
    const section = await store.createSection("The Market");
    store.setActiveSection(undefined);
    render(SessionJournalView, { props: { store } });

    const select = screen.getByTestId("journal-note-section");
    await fireEvent.change(select, { target: { value: section.id } });
    expect(store.activeSectionId).toBe(section.id);

    await fireEvent.change(select, { target: { value: "" } });
    expect(store.activeSectionId).toBeUndefined();
  });

  it("puts a typed note in the store's current section", async () => {
    const store = newStore("vault-auto-typed");
    await store.start();
    const section = await store.createSection("Chapter");
    render(SessionJournalView, { props: { store } });

    await fireEvent.input(screen.getByTestId("journal-note-input"), {
      target: { value: "Into the chapter" },
    });
    await fireEvent.click(screen.getByTestId("journal-note-submit"));

    await waitFor(() =>
      expect(store.current?.entries[0].sectionId).toBe(section.id),
    );
  });
});
