import { beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  (global as any).$state = (v: any) => v;
  (global as any).$state.raw = (v: any) => v;
  (global as any).$derived = (v: any) => v;
  (global as any).$derived.by = (fn: any) => fn();
});

vi.mock("../utils/idb", () => ({ getDB: vi.fn() }));
vi.mock("../utils/opfs", () => ({
  getOpfsRoot: vi.fn().mockResolvedValue({}),
  createVaultDir: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("./debug.svelte", () => ({
  debugStore: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("./vault/registry", () => ({
  getVault: vi.fn(),
  listVaults: vi.fn().mockResolvedValue([]),
  updateLastOpened: vi.fn().mockResolvedValue(undefined),
}));

import { getDB } from "../utils/idb";
import * as registry from "./vault/registry";
import { vaultRegistry } from "./vault-registry.svelte";

/**
 * #2619 — startup restores the active vault straight from settings rather than
 * through `setActiveVault`, so "Last opened" only ever showed the last explicit
 * switch. A user gathering evidence for a data-loss report read that as "the
 * app has not opened this vault since then" and drew the wrong conclusion.
 */
describe("VaultRegistryStore.init — lastOpened (#2619)", () => {
  let db: any;

  beforeEach(() => {
    vi.clearAllMocks();
    db = {
      get: vi.fn(async (store: string, key: string) =>
        store === "settings" && key === "activeVaultId" ? "vault-1" : undefined,
      ),
      put: vi.fn().mockResolvedValue(undefined),
      getAll: vi.fn().mockResolvedValue([]),
    };
    vi.mocked(getDB).mockResolvedValue(db);
    vi.mocked(registry.getVault).mockResolvedValue({
      id: "vault-1",
      name: "Campaign",
    } as any);

    // The store is a module singleton; reset the init guard between cases.
    (vaultRegistry as any).isInitialized = false;
    (vaultRegistry as any).activeVaultId = null;
  });

  it("stamps lastOpened when startup restores the active vault", async () => {
    await vaultRegistry.init();

    expect(registry.updateLastOpened).toHaveBeenCalledWith("vault-1");
  });

  it("does not stamp anything when there is no vault to restore", async () => {
    vi.mocked(registry.getVault).mockResolvedValue(undefined as any);
    db.get = vi.fn().mockResolvedValue(undefined);
    // No opfsRoot means the default-vault bootstrap is skipped too.
    (vaultRegistry as any).activeVaultId = null;
    const { getOpfsRoot } = await import("../utils/opfs");
    vi.mocked(getOpfsRoot).mockResolvedValue(undefined as any);

    await vaultRegistry.init();

    expect(registry.updateLastOpened).not.toHaveBeenCalled();
  });
});
