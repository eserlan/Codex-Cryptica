import { render, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RoutePage from "./+page.svelte";
import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
import { guestVault } from "$lib/stores/guest-vault.svelte";
import { themeStore } from "$lib/stores/theme.svelte";
import { vault } from "$lib/stores/vault.svelte";

vi.mock("$app/environment", () => ({
  browser: true,
}));

vi.mock("$app/paths", () => ({
  base: "",
}));

vi.mock("$lib/stores/ui/session-mode.svelte", () => ({
  sessionModeStore: {
    isGuestMode: false,
  },
}));

vi.mock("$lib/stores/guest-vault.svelte", () => ({
  guestVault: {
    publishId: "published-1",
    entities: [],
    loadBundle: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn(),
  },
}));

vi.mock("$lib/stores/theme.svelte", () => ({
  themeStore: {
    worldThemeId: "local-theme",
    resolveJargon: vi.fn(() => "Loading Shared World..."),
    setTheme: vi.fn().mockResolvedValue(undefined),
    loadForVault: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    selectedEntityId: null,
    entities: {},
    activeVaultId: "vault-123",
  },
}));

vi.mock("$lib/stores/ui/onboarding.svelte", () => ({
  onboardingStore: {
    dismissedWorldPage: true,
    dismissLandingPage: vi.fn(),
  },
}));

vi.mock("$lib/stores/ui/layout-ui.svelte", () => ({
  layoutUIStore: {
    mainViewMode: "graph",
    focusedEntityId: null,
  },
}));

vi.mock("$lib/services/publishing/guest-history", () => ({
  addGuestHistory: vi.fn(),
  removeGuestHistory: vi.fn(),
}));

vi.mock("$lib/components/GraphView.svelte", async () => ({
  default: (await import("../../__tests__/GraphViewStub.svelte")).default,
}));

vi.mock("$lib/components/EntityDetailPanel.svelte", async () => ({
  default: (await import("../../__tests__/EntityDetailPanelStub.svelte"))
    .default,
}));

vi.mock("$lib/components/entity/EmbeddedEntityView.svelte", async () => ({
  default: (await import("../../__tests__/EmbeddedEntityViewStub.svelte"))
    .default,
}));

vi.mock("$lib/components/world/FrontPage.svelte", async () => ({
  default: (await import("../../__tests__/FrontPageStub.svelte")).default,
}));

describe("/guest/[publishId] page", () => {
  beforeEach(() => {
    sessionModeStore.isGuestMode = false;
    (vault as any).activeVaultId = "vault-123";
    (themeStore as any).worldThemeId = "local-theme";
    vi.clearAllMocks();
  });

  it("keeps the guest session active when navigating within the app", async () => {
    const { unmount } = render(RoutePage, {
      data: {
        publishId: "published-1",
        status: 200,
        error: null,
        bundle: {
          publishId: "published-1",
          vaultTitle: "Shared World",
          activeTheme: { id: "host-theme" },
          entities: [],
          relationships: [],
          maps: [],
          canvases: [],
          assetManifest: [],
        },
      } as any,
    });

    await waitFor(() => {
      expect(guestVault.loadBundle).toHaveBeenCalled();
      expect(themeStore.setTheme).toHaveBeenCalledWith("host-theme");
    });

    unmount();

    expect(sessionModeStore.isGuestMode).toBe(true);
    expect(guestVault.clear).not.toHaveBeenCalled();
    expect(themeStore.loadForVault).not.toHaveBeenCalled();
    expect(themeStore.setTheme).toHaveBeenCalledTimes(1);
  });

  it("keeps the host theme when no local vault is active", async () => {
    (vault as any).activeVaultId = "";

    const { unmount } = render(RoutePage, {
      data: {
        publishId: "published-2",
        status: 200,
        error: null,
        bundle: {
          publishId: "published-2",
          vaultTitle: "Shared World",
          activeTheme: { id: "host-theme" },
          entities: [],
          relationships: [],
          maps: [],
          canvases: [],
          assetManifest: [],
        },
      } as any,
    });

    await waitFor(() => {
      expect(themeStore.setTheme).toHaveBeenCalledWith("host-theme");
    });

    unmount();

    expect(themeStore.loadForVault).not.toHaveBeenCalled();
    expect(themeStore.setTheme).toHaveBeenCalledTimes(1);
  });
});
