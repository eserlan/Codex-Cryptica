import { describe, expect, it } from "vitest";
import { VaultSyncContext } from "./sync-context";
import { createSyncFixture } from "./tests/sync-fixtures";

describe("VaultSyncContext", () => {
  it("resolves the coordinator and vault directory in order", async () => {
    const { context, deps, coordinator, handle } = createSyncFixture();
    const target = await context.resolveTarget();
    expect(target).toEqual({ coordinator, handle });
    expect(deps.getSyncCoordinator.mock.invocationCallOrder[0]).toBeLessThan(
      deps.getActiveVaultHandle.mock.invocationCallOrder[0],
    );
  });

  it("stops if either the coordinator or the vault directory is missing", async () => {
    const { context, deps } = createSyncFixture();
    deps.getSyncCoordinator.mockResolvedValueOnce(null);
    expect(await context.resolveTarget()).toBeNull();
    expect(deps.getActiveVaultHandle).not.toHaveBeenCalled();
    deps.getActiveVaultHandle.mockResolvedValueOnce(undefined);
    expect(await context.resolveTarget()).toBeNull();
  });

  it("flushes debounced saves and falls back to the repository barrier", async () => {
    const { context, deps, repository } = createSyncFixture();
    await context.waitForSaves(50);
    expect(deps.flushPendingSaves).toHaveBeenCalledWith(50);
    expect(repository.waitForAllSaves).not.toHaveBeenCalled();
    const fallback = new VaultSyncContext({
      ...deps,
      flushPendingSaves: undefined,
    });
    await fallback.waitForSaves(75);
    expect(repository.waitForAllSaves).toHaveBeenCalledWith(75);
    deps.flushPendingSaves.mockRejectedValueOnce(new Error("write failed"));
    await expect(context.waitForSaves()).rejects.toThrow("write failed");
  });

  it("recognises both a vault switch and an aborted operation", () => {
    const { context, switchVault } = createSyncFixture();
    const abort = new AbortController();
    expect(context.isStale("vault-1", abort.signal)).toBe(false);
    abort.abort();
    expect(context.isStale("vault-1", abort.signal)).toBe(true);
    switchVault("vault-2");
    expect(context.isStale("vault-1")).toBe(true);
  });
});
