import { render, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RoutePage from "./+page.svelte";
import { vault } from "$lib/stores/vault.svelte";
import { requestZenPopoutPayload } from "$lib/utils/zen-popout";
import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";

type MutableVaultMock = {
  activeVaultId: string | null;
  isInitialized: boolean;
  status: string;
  repository: { entities: Record<string, { id: string; title?: string }> };
  entities: Record<string, { id: string; title?: string }>;
  switchVault: ReturnType<typeof vi.fn>;
};

vi.mock("$app/environment", () => ({
  browser: true,
}));

vi.mock("$app/state", () => ({
  page: {
    params: {
      id: "vault-123",
      entityId: "entity-1",
    },
  },
}));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    activeVaultId: null as string | null,
    isInitialized: false,
    status: "idle",
    repository: {
      entities: {} as Record<string, { id: string; title?: string }>,
    },
    entities: {} as Record<string, { id: string; title?: string }>,
    switchVault: vi.fn(),
  },
}));

vi.mock("$lib/utils/zen-popout", () => ({
  consumeZenPopoutPayload: vi.fn(() => null),
  requestZenPopoutPayload: vi.fn(),
}));

describe("/vault/[id]/entity/[entityId] page", () => {
  beforeEach(() => {
    Object.defineProperty(window, "opener", {
      configurable: true,
      value: {},
    });

    const mutableVault = vault as unknown as MutableVaultMock;
    const entities: Record<string, { id: string; title?: string }> = {};
    mutableVault.activeVaultId = null;
    mutableVault.isInitialized = false;
    mutableVault.status = "idle";
    mutableVault.repository.entities = entities;
    mutableVault.entities = entities;
    sessionModeStore.isGuestMode = false;
    vi.clearAllMocks();
  });

  it("waits for guest popout hydration before taking the host switchVault path", async () => {
    vi.mocked(requestZenPopoutPayload).mockResolvedValue({
      isGuest: true,
      entity: { id: "entity-1", title: "Faerun", _path: ["faerun.md"] } as any,
    });

    render(RoutePage);

    expect(vault.switchVault).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(sessionModeStore.isGuestMode).toBe(true);
    });

    expect(vault.switchVault).not.toHaveBeenCalled();
  });
});
