import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock environment
vi.mock("$app/environment", () => ({
  browser: true,
}));

vi.mock("$app/paths", () => ({
  base: "",
}));

vi.mock("./vault.svelte", () => ({
  vault: {
    selectedEntityId: null,
    isGuest: false,
    entities: {},
    loadEntityContent: vi.fn(),
  },
}));

vi.mock("../utils/idb", () => ({
  getDB: vi.fn().mockResolvedValue({
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    getAll: vi.fn(),
  }),
}));

// Mock matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated
    removeListener: vi.fn(), // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

import { UIStore, uiStore } from "./ui.svelte";
import { vault } from "./vault.svelte";

const mockedVault = vault as any;

describe("UIStore", () => {
  beforeEach(() => {
    // Reset state before each test
    localStorage.removeItem("codex_explorer_view_mode");
    localStorage.removeItem("codex_explorer_collapsed_label_groups");
    localStorage.removeItem("codex_vtt_sidebar_collapsed");
    localStorage.removeItem("codex_vtt_entity_list_collapsed");

    uiStore.closeSettings();
    uiStore.activeSettingsTab = "vault";
    uiStore.skipWelcomeScreen = false;
    uiStore.dismissedLandingPage = false;
    uiStore.dismissedWorldPage = false;
    uiStore.explorerViewMode = "list";
    uiStore.explorerCollapsedLabelGroups = {};
    uiStore.closeSidebar();
    uiStore.showCanvasPalette = true;
    uiStore.vttSidebarCollapsed = false;
    uiStore.vttEntityListCollapsed = false;
    mockedVault.isGuest = false;
    mockedVault.entities = {};
    mockedVault.loadEntityContent.mockClear();
  });

  it("should make Entity Explorer and Canvas Palette mutually exclusive", () => {
    // 1. Initial state: Palette is open, Sidebar is closed
    expect(uiStore.showCanvasPalette).toBe(true);
    expect(uiStore.activeSidebarTool).toBe("none");

    // 2. Open Explorer -> Palette should close
    uiStore.toggleSidebarTool("explorer");
    expect(uiStore.activeSidebarTool).toBe("explorer");
    expect(uiStore.showCanvasPalette).toBe(false);

    // 3. Open Palette -> Explorer should close
    uiStore.showCanvasPalette = true;
    expect(uiStore.showCanvasPalette).toBe(true);
    expect(uiStore.activeSidebarTool).toBe("none");

    // 4. Opening Oracle should NOT close Palette (they are NOT mutually exclusive)
    uiStore.toggleSidebarTool("oracle");
    expect(uiStore.activeSidebarTool).toBe("oracle");
    expect(uiStore.showCanvasPalette).toBe(true);
  });

  it("should open settings to a specific tab", () => {
    uiStore.openSettings("help");
    expect(uiStore.showSettings).toBe(true);
    expect(uiStore.activeSettingsTab).toBe("help");
  });

  it("should close settings", () => {
    uiStore.openSettings("help");
    uiStore.closeSettings();
    expect(uiStore.showSettings).toBe(false);
  });

  it("should toggle settings visibility", () => {
    // Toggle on
    uiStore.toggleSettings("intelligence");
    expect(uiStore.showSettings).toBe(true);
    expect(uiStore.activeSettingsTab).toBe("intelligence");

    // Toggle off if same tab
    uiStore.toggleSettings("intelligence");
    expect(uiStore.showSettings).toBe(false);

    // Switch tab if already open but different tab
    uiStore.openSettings("vault");
    uiStore.toggleSettings("intelligence");
    expect(uiStore.showSettings).toBe(true);
    expect(uiStore.activeSettingsTab).toBe("intelligence");
  });

  it("should handle Zen Mode visibility", () => {
    // Initial state
    expect(uiStore.leftSidebarOpen).toBe(false);
    expect(uiStore.activeSidebarTool).toBe("none");

    // Toggle on
    uiStore.toggleSidebarTool("oracle");
    expect(uiStore.leftSidebarOpen).toBe(true);
    expect(uiStore.activeSidebarTool).toBe("oracle");

    // Toggle off
    uiStore.toggleSidebarTool("oracle");
    expect(uiStore.leftSidebarOpen).toBe(false);
    expect(uiStore.activeSidebarTool).toBe("none");

    // Close explicitly
    uiStore.toggleSidebarTool("oracle");
    uiStore.closeSidebar();
    expect(uiStore.leftSidebarOpen).toBe(false);
    expect(uiStore.activeSidebarTool).toBe("none");

    // Toggle explorer
    uiStore.toggleSidebarTool("explorer");
    expect(uiStore.leftSidebarOpen).toBe(true);
    expect(uiStore.activeSidebarTool).toBe("explorer");
  });

  it("should handle main view mode transitions", () => {
    // Initial state
    expect(uiStore.mainViewMode).toBe("visualization");
    expect(uiStore.focusedEntityId).toBe(null);

    // Focus entity
    uiStore.focusEntity("hero-123");
    expect(uiStore.mainViewMode).toBe("focus");
    expect(uiStore.focusedEntityId).toBe("hero-123");

    // Clear focus
    uiStore.focusEntity(null);
    expect(uiStore.mainViewMode).toBe("visualization");
    expect(uiStore.focusedEntityId).toBe(null);
  });

  it("should open a new window for import", () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    uiStore.openImportWindow();
    expect(openSpy).toHaveBeenCalled();
    expect(openSpy.mock.calls[0][0]).toContain("/import");
    openSpy.mockRestore();
  });

  it("should preserve the active theme when opening the dice window", () => {
    window.localStorage.setItem("codex-cryptica-active-theme", "cyberpunk");
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    uiStore.openDiceWindow();

    expect(openSpy).toHaveBeenCalled();
    expect(openSpy.mock.calls[0][0]).toContain("/dice?theme=cyberpunk");
    openSpy.mockRestore();
  });

  it("should handle notifications with timeout", () => {
    vi.useFakeTimers();
    uiStore.notify("Success!", "success");
    expect(uiStore.notification).toEqual({
      message: "Success!",
      type: "success",
      persistent: false,
    });

    vi.advanceTimersByTime(5000);
    expect(uiStore.notification).toBe(null);
    vi.useRealTimers();
  });

  it("should not let an older timeout clear a newer persistent notification", () => {
    vi.useFakeTimers();

    uiStore.notify("Short lived", "success");
    uiStore.notify("Persistent", "info", true);

    vi.advanceTimersByTime(5000);

    expect(uiStore.notification).toEqual({
      message: "Persistent",
      type: "info",
      persistent: true,
    });

    uiStore.clearNotification();
    expect(uiStore.notification).toBe(null);
    vi.useRealTimers();
  });

  it("should handle global errors", () => {
    uiStore.setGlobalError("Oops", "stack trace");
    expect(uiStore.globalError).toEqual({
      message: "Oops",
      stack: "stack trace",
    });

    uiStore.clearGlobalError();
    expect(uiStore.globalError).toBe(null);
  });

  it("should handle abort signals", () => {
    const signal = uiStore.abortSignal;
    expect(signal).toBeInstanceOf(AbortSignal);
    expect(signal.aborted).toBe(false);

    uiStore.abortActiveOperations();
    expect(signal.aborted).toBe(true);

    const newSignal = uiStore.abortSignal;
    expect(newSignal.aborted).toBe(false);
    expect(newSignal).not.toBe(signal);
  });

  it("should manage connection labels and history", () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
    uiStore.setLastConnectionLabel("Friend");

    expect(uiStore.lastConnectionLabel).toBe("Friend");
    expect(uiStore.recentConnectionLabels).toContain("Friend");
    expect(setItemSpy).toHaveBeenCalledWith(
      "codex_last_connection_label",
      "Friend",
    );
    expect(setItemSpy).toHaveBeenCalledWith(
      "codex_recent_connection_labels",
      expect.any(String),
    );
  });

  it("should persist explorer view mode changes", () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");

    uiStore.setExplorerViewMode("label");

    expect(uiStore.explorerViewMode).toBe("label");
    expect(setItemSpy).toHaveBeenCalledWith(
      "codex_explorer_view_mode",
      "label",
    );

    setItemSpy.mockRestore();
  });

  it("should persist collapsed explorer label groups per vault", () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");

    uiStore.toggleExplorerLabelGroup("vault-1", "Quest");

    expect(uiStore.getCollapsedLabelGroups("vault-1")).toEqual(
      new Set(["Quest"]),
    );
    expect(setItemSpy).toHaveBeenCalledWith(
      "codex_explorer_collapsed_label_groups",
      JSON.stringify({ "vault-1": ["Quest"] }),
    );

    uiStore.toggleExplorerLabelGroup("vault-1", "Quest");
    expect(uiStore.getCollapsedLabelGroups("vault-1")).toEqual(new Set());

    setItemSpy.mockRestore();
  });

  it("should restore collapsed explorer label groups from localStorage", () => {
    localStorage.setItem(
      "codex_explorer_collapsed_label_groups",
      JSON.stringify({ "vault-1": ["Quest", "NPC"] }),
    );

    const store = new UIStore();

    expect(store.getCollapsedLabelGroups("vault-1")).toEqual(
      new Set(["NPC", "Quest"]),
    );
  });

  it("should handle Zen Mode operations", () => {
    uiStore.openZenMode("entity-1", "inventory");
    expect(uiStore.showZenMode).toBe(true);
    expect(uiStore.zenModeEntityId).toBe("entity-1");
    expect(uiStore.zenModeActiveTab).toBe("inventory");

    uiStore.closeZenMode();
    expect(uiStore.showZenMode).toBe(false);
    expect(uiStore.zenModeEntityId).toBe(null);
  });

  it("should manage Merge and Bulk Label dialogs", () => {
    uiStore.openMergeDialog(["1", "2"]);
    expect(uiStore.mergeDialog).toEqual({ open: true, sourceIds: ["1", "2"] });
    uiStore.closeMergeDialog();
    expect(uiStore.mergeDialog.open).toBe(false);

    uiStore.openBulkLabelDialog(["3", "4"]);
    expect(uiStore.bulkLabelDialog).toEqual({
      open: true,
      entityIds: ["3", "4"],
    });
    uiStore.closeBulkLabelDialog();
    expect(uiStore.bulkLabelDialog.open).toBe(false);
  });

  it("should toggle AI disabled and save to localStorage", () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
    uiStore.toggleAiDisabled(true);
    expect(uiStore.aiDisabled).toBe(true);
    expect(setItemSpy).toHaveBeenCalledWith("codex_ai_disabled", "true");
  });

  it("should toggle welcome screen preference", () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
    uiStore.toggleWelcomeScreen(true);
    expect(uiStore.skipWelcomeScreen).toBe(true);
    expect(setItemSpy).toHaveBeenCalledWith("codex_skip_landing", "true");
  });

  it("should calculate landing page visibility", () => {
    uiStore.skipWelcomeScreen = false;
    uiStore.dismissedLandingPage = false;
    expect(uiStore.isLandingPageVisible).toBe(true);

    uiStore.skipWelcomeScreen = true;
    expect(uiStore.isLandingPageVisible).toBe(false);

    uiStore.skipWelcomeScreen = false;
    uiStore.dismissedLandingPage = true;
    expect(uiStore.isLandingPageVisible).toBe(false);
  });

  it("should close the sidebar when focusing an entity on mobile", () => {
    // 1. Setup mobile state
    uiStore.isMobile = true;
    uiStore.toggleSidebarTool("explorer");
    expect(uiStore.leftSidebarOpen).toBe(true);

    // 2. Focus an entity
    uiStore.focusEntity("hero-123");

    // 3. Verify sidebar is closed
    expect(uiStore.leftSidebarOpen).toBe(false);
    expect(uiStore.activeSidebarTool).toBe("none");
    expect(uiStore.focusedEntityId).toBe("hero-123");
  });

  it("should close the sidebar even when re-focusing the same entity on mobile", () => {
    // 1. Setup mobile state with an entity already focused
    uiStore.isMobile = true;
    uiStore.focusEntity("hero-123");
    uiStore.toggleSidebarTool("explorer");
    expect(uiStore.leftSidebarOpen).toBe(true);
    expect(uiStore.focusedEntityId).toBe("hero-123");

    // 2. Focus the SAME entity again
    uiStore.focusEntity("hero-123");

    // 3. Verify sidebar is closed even if the entity didn't change
    expect(uiStore.leftSidebarOpen).toBe(false);
    expect(uiStore.activeSidebarTool).toBe("none");
    expect(uiStore.focusedEntityId).toBe("hero-123");
  });

  it("should NOT close the sidebar when focusing an entity on desktop", () => {
    // 1. Setup desktop state
    uiStore.isMobile = false;
    uiStore.toggleSidebarTool("explorer");
    expect(uiStore.leftSidebarOpen).toBe(true);

    // 2. Focus an entity
    uiStore.focusEntity("hero-456");

    // 3. Verify sidebar is still open
    expect(uiStore.leftSidebarOpen).toBe(true);
    expect(uiStore.activeSidebarTool).toBe("explorer");
    expect(uiStore.focusedEntityId).toBe("hero-456");
  });

  it("should load persisted VTT sidebar state from localStorage", () => {
    localStorage.setItem("codex_vtt_sidebar_collapsed", "true");
    localStorage.setItem("codex_vtt_entity_list_collapsed", "true");

    const store = new UIStore();

    expect(store.vttSidebarCollapsed).toBe(true);
    expect(store.vttEntityListCollapsed).toBe(true);
  });

  it("should persist VTT sidebar toggles", () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");

    uiStore.toggleVttSidebar(true);
    uiStore.toggleVttEntityList(true);

    expect(uiStore.vttSidebarCollapsed).toBe(true);
    expect(uiStore.vttEntityListCollapsed).toBe(true);
    expect(setItemSpy).toHaveBeenCalledWith(
      "codex_vtt_sidebar_collapsed",
      "true",
    );
    expect(setItemSpy).toHaveBeenCalledWith(
      "codex_vtt_entity_list_collapsed",
      "true",
    );
  });
});
