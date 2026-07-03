/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ActivityBar from "./ActivityBar.svelte";
import { discoveryPolicyStore } from "$lib/stores/ui/discovery-policy.svelte";
import { guestChatStore } from "$lib/stores/guest-chat.svelte";
import { layoutUIStore } from "$lib/stores/ui/layout-ui.svelte";
import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";

vi.mock("$lib/stores/theme.svelte", () => ({
  themeStore: {
    activeTheme: { id: "default" },
  },
}));

vi.mock("$app/state", () => ({
  page: {
    url: { pathname: "/" },
  },
}));

vi.mock("$app/paths", () => ({
  base: "",
}));

vi.mock("$lib/stores/guest-chat.svelte", () => ({
  guestChatStore: {
    showChatModal: false,
  },
}));

describe("ActivityBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    discoveryPolicyStore.aiDisabled = false;
    discoveryPolicyStore.connectionDiscoveryMode = "suggest";
    layoutUIStore.activeSidebarTool = "none";
    layoutUIStore.leftSidebarOpen = false;
    layoutUIStore.mainViewMode = "visualization";
    layoutUIStore.toggleSidebarTool = vi.fn();
    guestChatStore.showChatModal = false;
    sessionModeStore.isGuestMode = false;
  });

  it("does not render the AI Assessment shortcut", () => {
    render(ActivityBar);
    expect(screen.queryByTestId("activity-bar-ai-assessment")).toBeNull();
  });

  it("still renders the core sidebar shortcuts", () => {
    render(ActivityBar);
    expect(screen.getByTestId("activity-bar-oracle")).toBeDefined();
    expect(screen.getByTestId("activity-bar-explorer")).toBeDefined();
    expect(screen.getByTestId("activity-bar-quicknote")).toBeDefined();
  });

  it("opens the Oracle sidebar when the Oracle shortcut is clicked", async () => {
    render(ActivityBar);

    await fireEvent.click(screen.getByTestId("activity-bar-oracle"));

    expect(layoutUIStore.toggleSidebarTool).toHaveBeenCalledWith("oracle");
  });

  it("hides the QuickNote shortcut in guest mode", () => {
    sessionModeStore.isGuestMode = true;

    render(ActivityBar);

    expect(screen.queryByTestId("activity-bar-quicknote")).toBeNull();
    expect(screen.getByTestId("activity-bar-oracle")).toBeTruthy();
  });

  it("opens the guest chat modal for guests", async () => {
    sessionModeStore.isGuestMode = true;
    layoutUIStore.leftSidebarOpen = true;

    render(ActivityBar);

    await fireEvent.click(screen.getByTestId("activity-bar-guest-chat"));

    expect(guestChatStore.showChatModal).toBe(true);
    expect(layoutUIStore.leftSidebarOpen).toBe(false);
    expect(layoutUIStore.mainViewMode).toBe("visualization");
  });
});
