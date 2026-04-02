import { beforeEach, describe, expect, it, vi } from "vitest";
import { openFrontPage } from "./app-header-actions";
import { uiStore } from "$lib/stores/ui.svelte";
import { vault } from "$lib/stores/vault.svelte";

const mocks = vi.hoisted(() => ({
  closeSidebar: vi.fn(),
  closeZenMode: vi.fn(),
  toggleWelcomeScreen: vi.fn(),
}));

vi.mock("$lib/stores/ui.svelte", () => ({
  uiStore: {
    dismissedLandingPage: false,
    dismissedCampaignPage: true,
    closeSidebar: mocks.closeSidebar,
    closeZenMode: mocks.closeZenMode,
    toggleWelcomeScreen: mocks.toggleWelcomeScreen,
  },
}));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    selectedEntityId: "entity-1",
  },
}));

describe("openFrontPage", () => {
  beforeEach(() => {
    uiStore.dismissedLandingPage = false;
    uiStore.dismissedCampaignPage = true;
    mocks.closeSidebar.mockClear();
    mocks.closeZenMode.mockClear();
    mocks.toggleWelcomeScreen.mockClear();
    vault.selectedEntityId = "entity-1";
  });

  it("restores and persists the front page overlay", () => {
    openFrontPage();

    expect(uiStore.closeSidebar).toHaveBeenCalled();
    expect(uiStore.closeZenMode).toHaveBeenCalled();
    expect(uiStore.toggleWelcomeScreen).toHaveBeenCalledWith(true);
    expect(uiStore.dismissedLandingPage).toBe(true);
    expect(uiStore.dismissedCampaignPage).toBe(false);
    expect(vault.selectedEntityId).toBe(null);
  });
});
