import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock environment
vi.mock("$app/environment", () => ({
  browser: true,
}));

vi.mock("$app/paths", () => ({
  base: "",
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

import { uiStore } from "./ui.svelte";

describe("UIStore", () => {
  beforeEach(() => {
    // Reset state before each test
    uiStore.closeSettings();
    uiStore.activeSettingsTab = "vault";
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
  });

  it("should open a new window for import", () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    uiStore.openImportWindow();
    expect(openSpy).toHaveBeenCalled();
    expect(openSpy.mock.calls[0][0]).toContain("/import");
    openSpy.mockRestore();
  });

  it("should toggle connect mode and clear connectingNodeId", () => {
    // Initial state
    expect(uiStore.isConnecting).toBe(false);
    expect(uiStore.connectingNodeId).toBe(null);

    // Toggle on
    uiStore.toggleConnectMode();
    expect(uiStore.isConnecting).toBe(true);

    // Set a connecting node
    uiStore.connectingNodeId = "test-node";
    expect(uiStore.connectingNodeId).toBe("test-node");

    // Toggle off
    uiStore.toggleConnectMode();
    expect(uiStore.isConnecting).toBe(false);
    expect(uiStore.connectingNodeId).toBe(null);
  });
});
