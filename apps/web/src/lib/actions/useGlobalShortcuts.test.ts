import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("$lib/stores/search.svelte", () => ({
  searchStore: {
    open: vi.fn(),
  },
}));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    selectedEntityId: null,
  },
}));

vi.mock("$lib/stores/oracle.svelte", () => ({
  oracle: {
    undo: vi.fn(),
    redo: vi.fn(),
  },
}));

vi.mock("$lib/stores/ui/modal-ui.svelte", () => ({
  modalUIStore: {
    openZenMode: vi.fn(),
  },
}));

vi.mock("$lib/stores/ui/session-mode.svelte", () => ({
  sessionModeStore: {
    sharedMode: false,
  },
}));

import { createGlobalShortcutHandler } from "./useGlobalShortcuts";
import { searchStore } from "$lib/stores/search.svelte";
import { vault } from "$lib/stores/vault.svelte";
import { oracle } from "$lib/stores/oracle.svelte";
import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";

describe("createGlobalShortcutHandler", () => {
  let handler: ReturnType<typeof createGlobalShortcutHandler>;

  beforeEach(() => {
    vi.clearAllMocks();
    vault.selectedEntityId = null;
    sessionModeStore.sharedMode = false;
    handler = createGlobalShortcutHandler();
  });

  it("safely handles event with undefined key without throwing", () => {
    const event = new KeyboardEvent("keydown");
    Object.defineProperty(event, "key", { value: undefined });

    expect(() => handler(event)).not.toThrow();
    expect(searchStore.open).not.toHaveBeenCalled();
    expect(oracle.undo).not.toHaveBeenCalled();
  });

  it("opens search on Cmd+K or Ctrl+K", () => {
    const event = new KeyboardEvent("keydown", {
      key: "k",
      metaKey: true,
    });
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");

    handler(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(searchStore.open).toHaveBeenCalledTimes(1);
  });

  it("triggers undo on Cmd+Z", () => {
    const event = new KeyboardEvent("keydown", {
      key: "z",
      metaKey: true,
      shiftKey: false,
    });
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");

    handler(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(oracle.undo).toHaveBeenCalledTimes(1);
  });

  it("triggers redo on Cmd+Shift+Z or Cmd+Y", () => {
    const event = new KeyboardEvent("keydown", {
      key: "z",
      metaKey: true,
      shiftKey: true,
    });
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");

    handler(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(oracle.redo).toHaveBeenCalledTimes(1);
  });

  it("opens zen mode on Alt+Z when an entity is selected", () => {
    vault.selectedEntityId = "entity-123";
    const event = new KeyboardEvent("keydown", {
      key: "z",
      altKey: true,
    });
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");

    handler(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(modalUIStore.openZenMode).toHaveBeenCalledWith("entity-123");
  });

  it("toggles shared mode on 'p'", () => {
    sessionModeStore.sharedMode = false;
    const event = new KeyboardEvent("keydown", {
      key: "p",
    });

    handler(event);

    expect(sessionModeStore.sharedMode).toBe(true);
  });

  it("ignores shortcuts when typing in an input element", () => {
    const input = document.createElement("input");
    document.body.appendChild(input);

    const event = new KeyboardEvent("keydown", {
      key: "p",
    });
    Object.defineProperty(event, "target", { value: input });

    handler(event);

    expect(sessionModeStore.sharedMode).toBe(false);
    input.remove();
  });
});
