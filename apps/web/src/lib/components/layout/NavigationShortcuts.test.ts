// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent } from "@testing-library/svelte";
import NavigationShortcuts from "./NavigationShortcuts.svelte";
import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";

vi.mock("$app/environment", () => ({
  browser: true,
}));

vi.mock("$app/navigation", () => ({
  beforeNavigate: vi.fn(),
}));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    selectedEntityId: null,
    entities: {
      "entity-1": {},
      "entity-2": {},
    },
  },
}));

const mockHistoryStore = {
  past: [],
  future: [],
  push: vi.fn(),
  back: vi.fn().mockReturnValue(null),
  forward: vi.fn().mockReturnValue(null),
};

vi.mock("$lib/stores/navigation/NavigationHistoryStore.svelte", () => ({
  getNavigationHistoryStore: () => mockHistoryStore,
}));

describe("NavigationShortcuts", () => {
  const historyStore = mockHistoryStore;

  beforeEach(() => {
    historyStore.past = [];
    historyStore.future = [];
    historyStore.push.mockClear();
    historyStore.back.mockClear();
    historyStore.forward.mockClear();

    modalUIStore.showSettings = false;
    modalUIStore.showZenMode = false;
  });

  it("should ignore shortcuts when an input is focused", async () => {
    render(NavigationShortcuts);

    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    await fireEvent.keyDown(window, { key: "ArrowLeft", shiftKey: true });

    expect(historyStore.back).not.toHaveBeenCalled();

    input.remove();
  });

  it("should ignore shortcuts when a non-Zen modal is open", async () => {
    render(NavigationShortcuts);

    modalUIStore.showSettings = true; // This sets isAnyModalOpen to true

    await fireEvent.keyDown(window, { key: "ArrowLeft", shiftKey: true });

    expect(historyStore.back).not.toHaveBeenCalled();
  });

  it("should allow shortcuts when Zen Mode is open", async () => {
    render(NavigationShortcuts);

    modalUIStore.showSettings = true; // A modal is open
    modalUIStore.showZenMode = true; // But zen mode is also open (Zen mode overrides)

    await fireEvent.keyDown(window, { key: "ArrowLeft", shiftKey: true });

    expect(historyStore.back).toHaveBeenCalled();
  });

  it("should call tryNavigate on valid shortcut", async () => {
    render(NavigationShortcuts);

    await fireEvent.keyDown(window, { key: "ArrowLeft", shiftKey: true });
    expect(historyStore.back).toHaveBeenCalled();

    await fireEvent.keyDown(window, { key: "ArrowRight", shiftKey: true });
    expect(historyStore.forward).toHaveBeenCalled();
  });
});
