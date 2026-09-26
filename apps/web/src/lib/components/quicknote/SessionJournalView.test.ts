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

describe("SessionJournalView — turning content into entities (slice 4)", () => {
  const fakePromoter = (result: any = { ok: true, entityId: "ent-1" }) => ({
    promote: vi.fn().mockResolvedValue(result),
  });

  /** A journal with a typed note, a section, and a captured roll in it. */
  async function seeded(vaultId: string) {
    const store = newStore(vaultId);
    await store.start();
    await store.appendEntry({
      type: "manual-note",
      content: "The party arrives",
    });
    const section = await store.createSection("The Ambush");
    await store.appendEntry({
      type: "dice-roll",
      content: "Rolled 1d20: 14",
      sectionId: section.id,
    });
    return { store, section };
  }

  /** The whole-journal and section controls sit behind a compact toggle. */
  const openPromoteMenu = async () =>
    fireEvent.click(await screen.findByTestId("promote-toggle"));

  const journalSnapshot = (store: ReturnType<typeof newStore>) =>
    JSON.stringify(store.allJournals);

  it("turns the whole journal into a Note: the form opens with type Note and the journal's title", async () => {
    const { store } = await seeded("vault-p-journal");
    const promoter = fakePromoter();
    render(SessionJournalView, { props: { store, promoter: promoter as any } });

    await openPromoteMenu();
    await fireEvent.click(await screen.findByTestId("promote-journal"));

    expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe(
      store.current!.title,
    );
    expect((screen.getByLabelText("Type") as HTMLSelectElement).value).toBe(
      "note",
    );

    await fireEvent.click(
      screen.getByRole("button", { name: /create draft/i }),
    );
    await waitFor(() => expect(promoter.promote).toHaveBeenCalledTimes(1));
    const [journal, scope, input] = promoter.promote.mock.calls[0];
    expect(journal.id).toBe(store.current!.id);
    expect(scope).toEqual({ kind: "journal" });
    expect(input).toMatchObject({ type: "note", title: store.current!.title });
  });

  it("turns one entry into an entity in at most three clicks (SC-013)", async () => {
    const { store } = await seeded("vault-p-entry");
    const promoter = fakePromoter();
    render(SessionJournalView, { props: { store, promoter: promoter as any } });

    const buttons = await screen.findAllByTestId("journal-entry-promote");
    let clicks = 0;
    await fireEvent.click(buttons[0]);
    clicks++;
    await fireEvent.click(
      screen.getByRole("button", { name: /create draft/i }),
    );
    clicks++;

    await waitFor(() => expect(promoter.promote).toHaveBeenCalledTimes(1));
    expect(promoter.promote.mock.calls[0][1]).toMatchObject({
      kind: "entry",
    });
    expect(clicks).toBeLessThanOrEqual(3);
  });

  it("turns a section into an entity", async () => {
    const { store, section } = await seeded("vault-p-section");
    const promoter = fakePromoter();
    render(SessionJournalView, { props: { store, promoter: promoter as any } });

    await openPromoteMenu();
    await fireEvent.click(await screen.findByTestId("promote-section-button"));
    expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe(
      "The Ambush",
    );
    await fireEvent.click(
      screen.getByRole("button", { name: /create draft/i }),
    );

    await waitFor(() => expect(promoter.promote).toHaveBeenCalled());
    expect(promoter.promote.mock.calls[0][1]).toEqual({
      kind: "section",
      sectionId: section.id,
    });
  });

  it("chooses parts: a section and an entry are independent, and the scope carries both", async () => {
    const { store, section } = await seeded("vault-p-choose");
    const promoter = fakePromoter();
    render(SessionJournalView, { props: { store, promoter: promoter as any } });

    await openPromoteMenu();
    await fireEvent.click(await screen.findByTestId("promote-choose-parts"));
    const chosen = () =>
      screen.getByTestId("promote-chosen") as HTMLButtonElement;
    expect(chosen().disabled).toBe(true);

    const sectionBox = screen.getByRole("checkbox", {
      name: "Choose section: The Ambush",
    }) as HTMLInputElement;
    const entryBoxes = screen
      .getAllByRole("checkbox")
      .filter((box) => box !== sectionBox) as HTMLInputElement[];

    await fireEvent.click(sectionBox);
    // Ticking the section leaves its entries alone (FR-036).
    expect(entryBoxes.every((box) => !box.checked && !box.disabled)).toBe(true);
    expect(chosen().disabled).toBe(false);

    await fireEvent.click(entryBoxes[entryBoxes.length - 1]);
    await fireEvent.click(chosen());
    await fireEvent.click(
      screen.getByRole("button", { name: /create draft/i }),
    );

    await waitFor(() => expect(promoter.promote).toHaveBeenCalled());
    const scope = promoter.promote.mock.calls[0][1];
    expect(scope.kind).toBe("selection");
    expect(scope.sectionIds).toEqual([section.id]);
    expect(scope.entryIds).toHaveLength(1);
  });

  it("leaves the journal exactly as it was after a promotion (SC-014)", async () => {
    const { store } = await seeded("vault-p-unchanged");
    const before = journalSnapshot(store);
    render(SessionJournalView, {
      props: { store, promoter: fakePromoter() as any },
    });

    await openPromoteMenu();
    await fireEvent.click(await screen.findByTestId("promote-journal"));
    await fireEvent.click(
      screen.getByRole("button", { name: /create draft/i }),
    );
    await waitFor(() =>
      expect(screen.queryByTestId("journal-promote-sheet")).toBeNull(),
    );

    expect(journalSnapshot(store)).toBe(before);
    expect(store.current?.entries).toHaveLength(2);
  });

  it("gives focus back to the control that opened the form, after Cancel and after Create (FR-046)", async () => {
    const { store } = await seeded("vault-p-focus");
    render(SessionJournalView, {
      props: { store, promoter: fakePromoter() as any },
    });
    // The form replaces the controls, so focus must land on their replacement.
    const focusedTestId = () =>
      document.activeElement?.getAttribute("data-testid");

    await openPromoteMenu();
    screen.getByTestId("promote-journal").focus();
    await fireEvent.click(screen.getByTestId("promote-journal"));
    await fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    await waitFor(() => expect(focusedTestId()).toBe("promote-journal"));

    (document.activeElement as HTMLElement).blur();
    screen.getByTestId("promote-journal").focus();
    await fireEvent.click(screen.getByTestId("promote-journal"));
    await fireEvent.click(
      screen.getByRole("button", { name: /create draft/i }),
    );
    await waitFor(() => expect(focusedTestId()).toBe("promote-journal"));
  });

  it("returns focus to the right entry's Make entity button when there are several", async () => {
    const { store } = await seeded("vault-p-focus-entry");
    render(SessionJournalView, {
      props: { store, promoter: fakePromoter() as any },
    });

    const buttons = await screen.findAllByTestId("journal-entry-promote");
    const second = buttons[1];
    const label = second.getAttribute("aria-label");
    second.focus();
    await fireEvent.click(second);
    await fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    await waitFor(() =>
      expect(document.activeElement?.getAttribute("aria-label")).toBe(label),
    );
  });

  it("keeps the whole-journal controls out of the way until asked for, and keeps per-entry buttons visible", async () => {
    const { store } = await seeded("vault-p-toggle");
    render(SessionJournalView, {
      props: { store, promoter: fakePromoter() as any },
    });

    const toggle = await screen.findByTestId("promote-toggle");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByTestId("promote-journal")).toBeNull();
    expect(screen.getAllByTestId("journal-entry-promote").length).toBe(2);

    await fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByTestId("promote-journal")).toBeTruthy();

    await fireEvent.click(toggle);
    expect(screen.queryByTestId("promote-journal")).toBeNull();
  });

  describe("after ending a session (FR-043, SC-015)", () => {
    it("ends with one action, still shows Start, and offers the choices without requiring any", async () => {
      const { store } = await seeded("vault-p-ended");
      render(SessionJournalView, {
        props: { store, promoter: fakePromoter() as any },
      });

      await fireEvent.click(await screen.findByTestId("end-session"));

      await waitFor(() =>
        expect(screen.getByTestId("journal-ended-actions")).toBeTruthy(),
      );
      expect(screen.getByTestId("ended-turn-into-note")).toBeTruthy();
      expect(screen.getByTestId("ended-choose-parts")).toBeTruthy();
      // Ignoring the offer: the ended journal is as it was and Start is there.
      expect(store.current?.status).toBe("ended");
      expect(store.current?.entries).toHaveLength(2);
      expect(screen.getByTestId("session-journal-control")).toBeTruthy();
    });

    it("can be dismissed", async () => {
      const { store } = await seeded("vault-p-dismiss");
      render(SessionJournalView, { props: { store } });

      await fireEvent.click(await screen.findByTestId("end-session"));
      await fireEvent.click(await screen.findByTestId("ended-dismiss"));

      expect(screen.queryByTestId("journal-ended-actions")).toBeNull();
      expect(store.current?.status).toBe("ended");
    });

    it("'Turn into a Note' opens the form for the journal that just ended", async () => {
      const { store } = await seeded("vault-p-ended-note");
      const promoter = fakePromoter();
      render(SessionJournalView, {
        props: { store, promoter: promoter as any },
      });

      await fireEvent.click(await screen.findByTestId("end-session"));
      await fireEvent.click(await screen.findByTestId("ended-turn-into-note"));
      await fireEvent.click(
        await screen.findByRole("button", { name: /create draft/i }),
      );

      await waitFor(() => expect(promoter.promote).toHaveBeenCalled());
      expect(promoter.promote.mock.calls[0][1]).toEqual({ kind: "journal" });
      expect(promoter.promote.mock.calls[0][0].status).toBe("ended");
    });

    it("'Choose parts' shows the ended journal with checkboxes", async () => {
      const { store } = await seeded("vault-p-ended-parts");
      render(SessionJournalView, { props: { store } });

      await fireEvent.click(await screen.findByTestId("end-session"));
      await fireEvent.click(await screen.findByTestId("ended-choose-parts"));

      await waitFor(() =>
        expect(screen.getAllByRole("checkbox").length).toBeGreaterThan(0),
      );
      expect(screen.getByText("The party arrives")).toBeTruthy();
    });

    it("does not offer anything for a session that had no entries (negative)", async () => {
      const store = newStore("vault-p-ended-empty");
      await store.start();
      render(SessionJournalView, { props: { store } });

      await fireEvent.click(await screen.findByTestId("end-session"));
      await waitFor(() =>
        expect(screen.getByTestId("session-journal-control")).toBeTruthy(),
      );

      expect(screen.queryByTestId("journal-ended-actions")).toBeNull();
    });
  });

  it("offers the same choices on a past journal opened from history (FR-042)", async () => {
    const { store } = await seeded("vault-p-history");
    await store.end();
    const promoter = fakePromoter();
    render(SessionJournalView, { props: { store, promoter: promoter as any } });

    await fireEvent.click(
      screen.getByRole("button", { name: "Past journals" }),
    );
    await fireEvent.click(
      await screen.findByTestId(`past-journal-${store.current!.id}`),
    );
    await openPromoteMenu();
    await fireEvent.click(await screen.findByTestId("promote-journal"));
    await fireEvent.click(
      screen.getByRole("button", { name: /create draft/i }),
    );

    await waitFor(() => expect(promoter.promote).toHaveBeenCalled());
    expect(promoter.promote.mock.calls[0][0].status).toBe("ended");
  });

  it("hides the past-journals list while the form is open, to give it room", async () => {
    const { store } = await seeded("vault-p-history-room");
    await store.end();
    render(SessionJournalView, {
      props: { store, promoter: fakePromoter() as any },
    });

    await fireEvent.click(
      screen.getByRole("button", { name: "Past journals" }),
    );
    await fireEvent.click(
      await screen.findByTestId(`past-journal-${store.current!.id}`),
    );
    await openPromoteMenu();
    await fireEvent.click(await screen.findByTestId("promote-journal"));

    expect(screen.getByTestId("journal-promote-sheet")).toBeTruthy();
    expect(screen.queryByTestId("journal-history")).toBeNull();
  });

  describe("says why and stays put (negative)", () => {
    it("disables 'Turn journal into a Note' and 'Choose parts' for an empty journal, with a reason", async () => {
      const store = newStore("vault-p-empty");
      await store.start();
      render(SessionJournalView, { props: { store } });

      await openPromoteMenu();
      const journalButton = (await screen.findByTestId(
        "promote-journal",
      )) as HTMLButtonElement;
      expect(journalButton.disabled).toBe(true);
      expect(
        (screen.getByTestId("promote-choose-parts") as HTMLButtonElement)
          .disabled,
      ).toBe(true);
      expect(screen.getByTestId("promote-reason").textContent).toContain(
        "Nothing to turn into an entity yet",
      );
    });

    it("disables a section with no entries and says so", async () => {
      const store = newStore("vault-p-empty-section");
      await store.start();
      await store.appendEntry({ type: "manual-note", content: "Loose note" });
      await store.createSection("Empty scene");
      render(SessionJournalView, { props: { store } });

      await openPromoteMenu();
      const button = (await screen.findByTestId(
        "promote-section-button",
      )) as HTMLButtonElement;
      expect(button.disabled).toBe(true);
      expect(screen.getByText("no entries yet")).toBeTruthy();
    });

    it("keeps the form open, shows the message and leaves the journal alone when the entity cannot be made", async () => {
      const { store } = await seeded("vault-p-fail");
      const before = journalSnapshot(store);
      const promoter = fakePromoter({
        ok: false,
        error: "That could not be made into an entity. Please try again.",
      });
      render(SessionJournalView, {
        props: { store, promoter: promoter as any },
      });

      await openPromoteMenu();
      await fireEvent.click(await screen.findByTestId("promote-journal"));
      await fireEvent.input(screen.getByLabelText("Name"), {
        target: { value: "My chosen name" },
      });
      await fireEvent.click(
        screen.getByRole("button", { name: /create draft/i }),
      );

      await waitFor(() =>
        expect(screen.getByRole("alert").textContent).toContain(
          "could not be made into an entity",
        ),
      );
      expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe(
        "My chosen name",
      );
      expect(screen.getByTestId("journal-promote-sheet")).toBeTruthy();
      expect(journalSnapshot(store)).toBe(before);
    });

    it("stops choosing when Cancel is pressed, clearing the choices", async () => {
      const { store } = await seeded("vault-p-cancel-choose");
      render(SessionJournalView, { props: { store } });

      await openPromoteMenu();
      await fireEvent.click(await screen.findByTestId("promote-choose-parts"));
      await fireEvent.click(screen.getAllByRole("checkbox")[0]);
      await fireEvent.click(screen.getByTestId("promote-stop-choosing"));

      expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
      expect(screen.getByTestId("promote-journal")).toBeTruthy();
    });

    it("does not change how ending a session works: still one click, no dialog", async () => {
      const { store } = await seeded("vault-p-one-click");
      render(SessionJournalView, { props: { store } });

      await fireEvent.click(await screen.findByTestId("end-session"));

      await waitFor(() => expect(store.current?.status).toBe("ended"));
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });
});
