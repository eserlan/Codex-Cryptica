import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock environment
vi.mock("$app/environment", () => ({
  browser: true,
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
    uiStore.openZenMode("test-entity");
    expect(uiStore.showZenMode).toBe(true);
    expect(uiStore.zenModeEntityId).toBe("test-entity");

    uiStore.closeZenMode();
    expect(uiStore.showZenMode).toBe(false);
    expect(uiStore.zenModeEntityId).toBe(null);
  });

  it("should handle sidebar state transitions", () => {
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
});
