import { render, screen, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RoutePage from "./+page.svelte";
import { uiStore } from "$lib/stores/ui.svelte";
import { vault } from "$lib/stores/vault.svelte";

type MutableVaultMock = {
  activeVaultId: string | null;
  selectedEntityId: string | null;
  entities: Record<string, { id: string; title?: string }>;
  switchVault: ReturnType<typeof vi.fn>;
};

vi.mock("svelte", async () => {
  // @ts-expect-error - force the client Svelte runtime so testing-library can mount
  return await import("../../../../../../../node_modules/svelte/src/index-client.js");
});

vi.mock("$app/state", () => ({
  page: {
    params: {
      id: "vault-123",
    },
  },
}));

vi.mock("$lib/components/world/FrontPage.svelte", async () => ({
  default: (await import("./__tests__/FrontPageStub.svelte")).default,
}));

vi.mock("$lib/components/EntityDetailPanel.svelte", async () => ({
  default: (await import("./__tests__/EntityDetailPanelStub.svelte")).default,
}));

vi.mock("$lib/stores/ui.svelte", () => ({
  uiStore: {
    dismissedWorldPage: false,
    skipWelcomeScreen: false,
    openLightbox: vi.fn(),
    closeLightbox: vi.fn(),
    lightbox: { show: false, imageUrl: "", title: "" },
  },
}));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    activeVaultId: null as string | null,
    selectedEntityId: null as string | null,
    entities: {} as Record<string, { id: string; title?: string }>,
    switchVault: vi.fn(),
  },
}));

describe("/vault/[id] page", () => {
  beforeEach(() => {
    const mutableVault = vault as unknown as MutableVaultMock;
    uiStore.dismissedWorldPage = false;
    uiStore.skipWelcomeScreen = false;
    mutableVault.activeVaultId = null;
    mutableVault.selectedEntityId = null;
    mutableVault.entities = {};
    vi.clearAllMocks();
  });

  it("renders the front page on direct vault routes even when skipWelcomeScreen is false", async () => {
    render(RoutePage);

    expect(screen.getByTestId("front-page-stub")).toBeTruthy();
    await waitFor(() =>
      expect(vault.switchVault).toHaveBeenCalledWith("vault-123"),
    );
  });

  it("hides the front page only after the world page is dismissed", () => {
    uiStore.dismissedWorldPage = true;

    render(RoutePage);

    expect(screen.queryByTestId("front-page-stub")).toBeNull();
  });
});
