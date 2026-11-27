import { beforeEach, describe, expect, it, vi } from "vitest";
import { fileIOAdapter } from "./adapters.svelte";
import { VaultSyncConflicts } from "./sync-conflicts";
import { createSyncFixture } from "./tests/sync-fixtures";

vi.mock("./adapters.svelte", () => ({
  fileIOAdapter: { walkDirectory: vi.fn() },
}));
beforeEach(() => vi.clearAllMocks());

function fixture() {
  const f = createSyncFixture();
  const reload = vi.fn().mockResolvedValue(undefined);
  return {
    ...f,
    reload,
    conflicts: new VaultSyncConflicts(f.context, f.state, reload),
  };
}

describe("VaultSyncConflicts", () => {
  it("detects conflict filenames and clears the flag on a failed scan", async () => {
    const { conflicts, state } = fixture();
    vi.mocked(fileIOAdapter.walkDirectory).mockResolvedValueOnce([
      { path: ["notes", "hero.conflict-123.md"] },
    ] as any);
    await conflicts.scan();
    expect(state.hasConflictFiles).toBe(true);
    vi.mocked(fileIOAdapter.walkDirectory).mockRejectedValueOnce(
      new Error("unreadable"),
    );
    await conflicts.check();
    expect(state.hasConflictFiles).toBe(false);
  });

  it("does not publish scan results after cancellation", async () => {
    const { conflicts, state } = fixture();
    const abort = new AbortController();
    vi.mocked(fileIOAdapter.walkDirectory).mockImplementationOnce(async () => {
      abort.abort();
      return [{ path: ["hero.conflict-123.md"] }] as any;
    });
    await conflicts.scan(abort.signal);
    expect(state.hasConflictFiles).toBe(false);
  });

  it("cleans through the coordinator and forwards reload and status callbacks", async () => {
    const { conflicts, coordinator, handle, reload, state } = fixture();
    coordinator.cleanupConflictFiles.mockImplementationOnce(
      async (_id, _handle, onStatus, load) => {
        onStatus("saving");
        await load();
      },
    );
    await conflicts.cleanup();
    expect(state.status).toBe("saving");
    expect(reload).toHaveBeenCalledOnce();
    expect(coordinator.cleanupConflictFiles).toHaveBeenCalledWith(
      "vault-1",
      handle,
      expect.any(Function),
      expect.any(Function),
      undefined,
    );
  });

  it("skips cleanup after a vault switch and ignores cancelled status callbacks", async () => {
    const { conflicts, coordinator, deps, switchVault, state } = fixture();
    deps.getActiveVaultHandle.mockImplementationOnce(async () => {
      switchVault("vault-2");
      return {};
    });
    await conflicts.cleanup();
    expect(coordinator.cleanupConflictFiles).not.toHaveBeenCalled();
    switchVault("vault-1");
    const abort = new AbortController();
    coordinator.cleanupConflictFiles.mockImplementationOnce(
      async (_id, _handle, onStatus) => {
        abort.abort();
        onStatus("error");
      },
    );
    await conflicts.cleanup(abort.signal);
    expect(state.status).toBe("idle");
  });
});
