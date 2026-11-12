import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  initializeCloudBackup,
  registerCloudBackupChanges,
} from "./cloud-backup-lifecycle";

const mocks = vi.hoisted(() => ({
  vault: { activeVaultId: "vault-1" as string | null },
  configure: vi.fn(),
  hydrate: vi.fn(),
  destroy: vi.fn(),
  recordLocalChange: vi.fn(),
  startAutoSyncListeners: vi.fn(),
  onDurableVaultChange: vi.fn(),
  subscribe: vi.fn(),
  unsubDurable: vi.fn(),
  unsubSynced: vi.fn(),
}));
vi.mock("#lib/stores/vault.svelte.js", () => ({ vault: mocks.vault }));
vi.mock("#lib/stores/cloud-backup.svelte.js", () => ({
  cloudBackupStore: mocks,
}));
vi.mock("./cloud-backup-config", () => ({
  configureCloudBackup: mocks.configure,
}));
vi.mock("#lib/stores/vault/registry.js", () => ({
  onDurableVaultChange: mocks.onDurableVaultChange,
}));
vi.mock("#lib/stores/vault/events.svelte.js", () => ({
  vaultEventBus: { subscribe: mocks.subscribe },
}));

const cleanups: (() => void)[] = [];
beforeEach(() => {
  vi.clearAllMocks();
  mocks.vault.activeVaultId = "vault-1";
  mocks.onDurableVaultChange.mockReturnValue(mocks.unsubDurable);
  mocks.subscribe.mockReturnValue(mocks.unsubSynced);
});
afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup());
});

describe("cloud backup lifecycle", () => {
  it("configures before hydrating, follows vault switches and cleans up", () => {
    const cleanup = initializeCloudBackup();
    cleanups.push(cleanup);
    expect(mocks.configure).toHaveBeenCalledBefore(mocks.hydrate);
    expect(mocks.hydrate).toHaveBeenCalledWith("vault-1");
    mocks.vault.activeVaultId = "vault-2";
    window.dispatchEvent(new Event("vault-switched"));
    expect(mocks.hydrate).toHaveBeenLastCalledWith("vault-2");
    cleanup();
    window.dispatchEvent(new Event("vault-switched"));
    expect(mocks.hydrate).toHaveBeenCalledTimes(2);
    expect(mocks.destroy).toHaveBeenCalledOnce();
    cleanups.pop();
  });

  it("does not hydrate without an active vault", () => {
    mocks.vault.activeVaultId = null;
    cleanups.push(initializeCloudBackup());
    window.dispatchEvent(new Event("vault-switched"));
    expect(mocks.hydrate).not.toHaveBeenCalled();
  });

  it("records durable writes and sync reads with distinct scheduling", () => {
    const cleanup = registerCloudBackupChanges();
    const onDurable = mocks.onDurableVaultChange.mock.calls[0][0];
    const onSynced = mocks.subscribe.mock.calls[0][0];
    const change = { kind: "entity", ids: ["entity-1"] };
    onDurable("vault-1", change);
    expect(mocks.recordLocalChange).toHaveBeenCalledWith("vault-1", change);
    onSynced({
      type: "SYNC_CHUNK_READY",
      vaultId: "vault-2",
      newOrChangedIds: ["entity-2"],
    });
    expect(mocks.recordLocalChange).toHaveBeenLastCalledWith(
      "vault-2",
      { kind: "entity", ids: ["entity-2"] },
      { schedule: false },
    );
    onSynced({ type: "VAULT_CLOSED" });
    expect(mocks.recordLocalChange).toHaveBeenCalledTimes(2);
    expect(mocks.subscribe).toHaveBeenCalledWith(
      expect.any(Function),
      "cloud-backup-sync-chunks",
    );
    expect(mocks.startAutoSyncListeners).toHaveBeenCalledOnce();
    cleanup();
    expect(mocks.unsubDurable).toHaveBeenCalledOnce();
    expect(mocks.unsubSynced).toHaveBeenCalledOnce();
  });
});
