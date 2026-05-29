import { render, screen, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RoutePage from "./+page.svelte";
import { vault } from "$lib/stores/vault.svelte";
import { onboardingStore } from "$lib/stores/ui/onboarding.svelte";

type MutableVaultMock = {
  activeVaultId: string | null;
  selectedEntityId: string | null;
  entities: Record<string, { id: string; title?: string }>;
  switchVault: ReturnType<typeof vi.fn>;
};

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
    onboardingStore.dismissedWorldPage = false;
    onboardingStore.skipWelcomeScreen = false;
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
    onboardingStore.dismissedWorldPage = true;

    render(RoutePage);

    expect(screen.queryByTestId("front-page-stub")).toBeNull();
  });
});
