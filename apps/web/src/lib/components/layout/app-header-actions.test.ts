import { beforeEach, describe, expect, it, vi } from "vitest";
import { openFrontPage } from "./app-header-actions";
import { vault } from "$lib/stores/vault.svelte";
import { onboardingStore } from "$lib/stores/ui/onboarding.svelte";
import { layoutUIStore } from "$lib/stores/ui/layout-ui.svelte";
import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";

const mocks = vi.hoisted(() => ({
  closeSidebar: vi.fn(),
  closeZenMode: vi.fn(),
  toggleWelcomeScreen: vi.fn(),
  restoreWorldPage: vi.fn(),
  openLightbox: vi.fn(),
  closeLightbox: vi.fn(),
}));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    selectedEntityId: "entity-1",
  },
}));

describe("openFrontPage", () => {
  beforeEach(() => {
    onboardingStore.dismissedLandingPage = false;
    mocks.closeSidebar.mockClear();
    mocks.closeZenMode.mockClear();
    mocks.toggleWelcomeScreen.mockClear();
    mocks.restoreWorldPage.mockClear();
    layoutUIStore.closeSidebar = mocks.closeSidebar;
    modalUIStore.closeZenMode = mocks.closeZenMode;
    onboardingStore.toggleWelcomeScreen = mocks.toggleWelcomeScreen;
    onboardingStore.restoreWorldPage = mocks.restoreWorldPage;
    vault.selectedEntityId = "entity-1";
  });

  it("restores and persists the front page overlay", () => {
    openFrontPage();

    expect(layoutUIStore.closeSidebar).toHaveBeenCalled();
    expect(modalUIStore.closeZenMode).toHaveBeenCalled();
    expect(onboardingStore.toggleWelcomeScreen).toHaveBeenCalledWith(true);
    expect(onboardingStore.dismissedLandingPage).toBe(true);
    expect(onboardingStore.restoreWorldPage).toHaveBeenCalled();
    expect(vault.selectedEntityId).toBe(null);
  });
});
