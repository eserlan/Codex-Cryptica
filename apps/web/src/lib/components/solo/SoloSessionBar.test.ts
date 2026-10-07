/** @vitest-environment jsdom */

import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const env = vi.hoisted(() => ({
  store: {
    isActive: true,
    session: {
      mapId: "m1" as string | null,
      sceneName: "" as string,
      lastRoll: null as string | null,
    },
    journalRunning: false,
    resume: vi.fn(async () => {}),
    chooseMap: vi.fn(async (_id: string) => {}),
    recordRoll: vi.fn(),
    setScene: vi.fn(async (_n: string) => true),
    renameScene: vi.fn(async (_n: string) => true),
    end: vi.fn(async (_o: unknown) => {}),
  },
  modal: { showDiceModal: false, showSettings: false },
  layout: { isMobile: false, activeSidebarTool: "none" as string },
  discovery: { aiDisabled: false },
  mode: { isGuestMode: false },
  vault: {
    maps: {} as Record<string, { id: string; name: string }>,
    isGuest: false,
  },
  journal: {
    controlState: "start" as "start" | "open" | "resume",
    open: vi.fn(),
    current: null as null | { id: string },
  },
  quickNote: { open: vi.fn(), openJournal: vi.fn() },
}));

vi.mock("$lib/stores/solo-session-instance", () => ({
  soloSessionStore: env.store,
  soloPlayGuard: {
    soloStartBlockedReason: () => null,
    sharedPlayBlockedReason: () => null,
  },
}));
vi.mock("$lib/stores/ui/modal-ui.svelte", () => ({ modalUIStore: env.modal }));
vi.mock("$lib/stores/ui/layout-ui.svelte", () => ({
  layoutUIStore: env.layout,
}));
vi.mock("$lib/stores/ui/discovery-policy.svelte", () => ({
  discoveryPolicyStore: env.discovery,
}));
vi.mock("$lib/stores/ui/session-mode.svelte", () => ({
  sessionModeStore: env.mode,
}));
vi.mock("$lib/stores/vault.svelte", () => ({ vault: env.vault }));
vi.mock("$lib/stores/session-journal.svelte", () => ({
  sessionJournalStore: env.journal,
}));
vi.mock("$lib/stores/quicknote.svelte", () => ({
  quickNoteStore: env.quickNote,
}));
vi.mock("$lib/stores/dice-history.svelte", () => ({
  diceHistory: { addResult: vi.fn(async () => {}) },
}));

import SoloSessionBar from "./SoloSessionBar.svelte";

const MIN_KEY = "codex-solo-bar-minimised";

beforeEach(() => {
  localStorage.clear();
  env.store.isActive = true;
  env.store.session = { mapId: "m1", sceneName: "", lastRoll: null };
  env.store.resume.mockClear();
  env.store.chooseMap.mockClear();
  env.modal.showDiceModal = false;
  env.layout.isMobile = false;
  env.layout.activeSidebarTool = "none";
  env.discovery.aiDisabled = false;
  env.mode.isGuestMode = false;
  env.vault.maps = { m1: { id: "m1", name: "Greyhollow" } };
  env.journal.controlState = "start";
  env.journal.open.mockClear();
  env.quickNote.open.mockClear();
  env.quickNote.openJournal.mockClear();
});

describe("SoloSessionBar visibility", () => {
  it("is not rendered when no solo session is active", () => {
    env.store.isActive = false;
    render(SoloSessionBar);
    expect(screen.queryByTestId("solo-bar")).toBeNull();
  });

  it("is not rendered in guest mode", () => {
    env.mode.isGuestMode = true;
    render(SoloSessionBar);
    expect(screen.queryByTestId("solo-bar")).toBeNull();
  });

  it("is a labelled region showing the map name when a session is active", () => {
    render(SoloSessionBar);
    const bar = screen.getByTestId("solo-bar");
    expect(bar.getAttribute("role")).toBe("region");
    expect(bar.getAttribute("aria-label")).toBe("Solo session");
    expect(within(bar).getByText("Greyhollow")).toBeTruthy();
  });
});

describe("SoloSessionBar actions", () => {
  it("More dice opens the full dice window", async () => {
    render(SoloSessionBar);
    await fireEvent.click(screen.getByTestId("solo-more-dice"));
    expect(env.modal.showDiceModal).toBe(true);
  });

  it("Ask Oracle opens the Oracle when AI is on", async () => {
    render(SoloSessionBar);
    await fireEvent.click(screen.getByTestId("solo-ask-oracle"));
    expect(env.layout.activeSidebarTool).toBe("oracle");
  });

  it("hides Ask Oracle when AI is disabled", () => {
    env.discovery.aiDisabled = true;
    render(SoloSessionBar);
    expect(screen.queryByTestId("solo-ask-oracle")).toBeNull();
  });

  it("Journal opens the running journal, resuming it first when needed", async () => {
    env.journal.controlState = "resume";
    render(SoloSessionBar);
    await fireEvent.click(screen.getByTestId("solo-journal"));
    expect(env.journal.open).toHaveBeenCalledTimes(1);
    expect(env.quickNote.openJournal).toHaveBeenCalledTimes(1);
  });

  it("Journal does not resume an already open journal", async () => {
    env.journal.controlState = "open";
    render(SoloSessionBar);
    await fireEvent.click(screen.getByTestId("solo-journal"));
    expect(env.journal.open).not.toHaveBeenCalled();
    expect(env.quickNote.openJournal).toHaveBeenCalledTimes(1);
  });

  it("Map returns to the session's map", async () => {
    render(SoloSessionBar);
    await fireEvent.click(screen.getByTestId("solo-map"));
    expect(env.store.resume).toHaveBeenCalledTimes(1);
  });

  it("Map offers Choose map when there is no map, and picks one", async () => {
    env.store.session = { mapId: null, sceneName: "", lastRoll: null };
    render(SoloSessionBar);
    const choose = screen.getByTestId("solo-map");
    expect(choose.textContent).toMatch(/Choose map/);
    await fireEvent.click(choose);
    await fireEvent.change(screen.getByTestId("solo-choose-map-select"), {
      target: { value: "m1" },
    });
    await waitFor(() => expect(env.store.chooseMap).toHaveBeenCalledWith("m1"));
  });

  it("Choose map also applies when the session's map was deleted", () => {
    env.store.session = { mapId: "gone", sceneName: "", lastRoll: null };
    render(SoloSessionBar);
    expect(screen.getByTestId("solo-map").textContent).toMatch(/Choose map/);
  });

  it("Add note opens a quick note", async () => {
    render(SoloSessionBar);
    await fireEvent.click(screen.getByTestId("solo-add-note"));
    expect(env.quickNote.open).toHaveBeenCalledTimes(1);
  });

  it("gives every control an accessible name", () => {
    render(SoloSessionBar);
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
    for (const button of buttons) {
      const name =
        button.getAttribute("aria-label") || button.textContent?.trim();
      expect(
        name,
        `unnamed control: ${button.outerHTML.slice(0, 80)}`,
      ).toBeTruthy();
    }
  });
});

describe("SoloSessionBar minimise", () => {
  it("collapses to one control and stores the preference on this device", async () => {
    render(SoloSessionBar);
    await fireEvent.click(screen.getByTestId("solo-bar-minimise"));
    expect(screen.queryByTestId("solo-quick-roll-input")).toBeNull();
    expect(screen.getByTestId("solo-bar-expand")).toBeTruthy();
    expect(localStorage.getItem(MIN_KEY)).toBe("1");
  });

  it("expands again", async () => {
    localStorage.setItem(MIN_KEY, "1");
    render(SoloSessionBar);
    await fireEvent.click(screen.getByTestId("solo-bar-expand"));
    expect(screen.getByTestId("solo-quick-roll-input")).toBeTruthy();
    expect(localStorage.getItem(MIN_KEY)).toBeNull();
  });

  it("keeps the minimised state after a remount", () => {
    localStorage.setItem(MIN_KEY, "1");
    render(SoloSessionBar);
    expect(screen.getByTestId("solo-bar-expand")).toBeTruthy();
    expect(screen.queryByTestId("solo-quick-roll-input")).toBeNull();
  });

  it("treats an unreadable preference as expanded", () => {
    const spy = vi
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("denied");
      });
    render(SoloSessionBar);
    expect(screen.getByTestId("solo-quick-roll-input")).toBeTruthy();
    spy.mockRestore();
  });
});

describe("SoloSessionBar on phones", () => {
  it("shows one trigger rather than the bar, and the sheet holds the same actions", async () => {
    env.layout.isMobile = true;
    render(SoloSessionBar);
    expect(screen.queryByTestId("solo-quick-roll-input")).toBeNull();
    await fireEvent.click(screen.getByTestId("solo-bar-mobile-trigger"));
    const sheet = screen.getByTestId("solo-sheet");
    expect(within(sheet).getByTestId("solo-quick-roll-input")).toBeTruthy();
    expect(within(sheet).getByTestId("solo-more-dice")).toBeTruthy();
    expect(within(sheet).getByTestId("solo-end")).toBeTruthy();
  });

  it("closes the sheet with Escape", async () => {
    env.layout.isMobile = true;
    render(SoloSessionBar);
    await fireEvent.click(screen.getByTestId("solo-bar-mobile-trigger"));
    await fireEvent.keyDown(screen.getByTestId("solo-sheet"), {
      key: "Escape",
    });
    expect(screen.queryByTestId("solo-sheet")).toBeNull();
  });
});
