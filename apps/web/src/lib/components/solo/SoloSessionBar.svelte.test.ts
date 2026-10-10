/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, screen } from "@testing-library/svelte";
import SoloSessionBar from "./SoloSessionBar.svelte";
import { soloSessionStore } from "$lib/stores/solo-session-instance";
import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
import { layoutUIStore } from "$lib/stores/ui/layout-ui.svelte";

// Mock the stores
vi.mock("$lib/stores/solo-session-instance", () => ({
  soloSessionStore: {
    isActive: true,
    session: { mapId: "map1" },
  },
}));

vi.mock("$lib/stores/ui/session-mode.svelte", () => ({
  sessionModeStore: {
    isGuestMode: false,
  },
}));

vi.mock("$lib/stores/ui/layout-ui.svelte", () => ({
  layoutUIStore: {
    isMobile: false,
  },
}));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    maps: {
      map1: { name: "Test Map" },
    },
  },
}));

// Provide minimal mocks for child components to avoid complex rendering errors
vi.mock("./SoloQuickRoll.svelte", () => ({ default: function() {} }));
vi.mock("./SoloActions.svelte", () => ({ default: function() {} }));
vi.mock("./SoloSessionSheet.svelte", () => ({ default: function() {} }));
vi.mock("./SoloSceneMenu.svelte", () => ({ default: function() {} }));


describe("SoloSessionBar", () => {
  let mockStorage: Map<string, string>;
  let fakeStorage: any;

  beforeEach(() => {
    mockStorage = new Map();
    fakeStorage = {
      getItem: vi.fn((key: string) => mockStorage.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => mockStorage.set(key, value)),
      removeItem: vi.fn((key: string) => mockStorage.delete(key)),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reads initial state from injected storage", () => {
    mockStorage.set("codex-solo-bar-minimised", "1");
    render(SoloSessionBar, { props: { storage: fakeStorage } });

    // It should render the expand button if minimised
    expect(screen.getByTestId("solo-bar-expand")).toBeDefined();
  });

  it("writes state to injected storage on minimise", async () => {
    render(SoloSessionBar, { props: { storage: fakeStorage } });

    const minimiseButton = screen.getByTestId("solo-bar-minimise");
    await fireEvent.click(minimiseButton);

    expect(mockStorage.get("codex-solo-bar-minimised")).toBe("1");
    // Expand button should now be visible
    expect(screen.getByTestId("solo-bar-expand")).toBeDefined();
  });

  it("handles storage throwing errors without crashing", async () => {
    fakeStorage.getItem.mockImplementation(() => { throw new Error("Blocked"); });
    fakeStorage.setItem.mockImplementation(() => { throw new Error("Blocked"); });

    render(SoloSessionBar, { props: { storage: fakeStorage } });

    // Assuming default is expanded
    expect(screen.getByTestId("solo-bar-minimise")).toBeDefined();

    const minimiseButton = screen.getByTestId("solo-bar-minimise");
    await fireEvent.click(minimiseButton);

    // After clicking, it updates local state and tries to save.
    // Given the component updates local state before writing, it might actually switch
    // to expanded view, but we are primarily testing that no error crashes the test run.
    expect(fakeStorage.setItem).toHaveBeenCalled();
  });
});
