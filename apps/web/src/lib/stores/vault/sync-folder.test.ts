import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appEventBus } from "@codex/events";
import { cacheService } from "../../services/cache.svelte";
import { notificationStore } from "#lib/stores/ui/notification.svelte.js";
import { updateLastSavedToFolder } from "./registry";
import { VaultFolderSync } from "./sync-folder";
import { createSyncFixture } from "./tests/sync-fixtures";

vi.mock("../../services/cache.svelte", () => ({
  cacheService: { clearVault: vi.fn() },
}));
vi.mock("./registry", () => ({ updateLastSavedToFolder: vi.fn() }));
beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function fixture() {
  const f = createSyncFixture();
  const reload = vi.fn().mockResolvedValue(undefined);
  const checkConflicts = vi.fn().mockResolvedValue(undefined);
  const folder = new VaultFolderSync(
    f.context,
    f.state,
    reload,
    checkConflicts,
  );
  return { ...f, folder, reload, checkConflicts };
}

describe("VaultFolderSync", () => {
  it("pushes interactively after the save barrier, then records and announces the save", async () => {
    vi.useFakeTimers();
    const { folder, coordinator, deps, state, checkConflicts } = fixture();
    const emit = vi.spyOn(appEventBus, "emit");
    coordinator.push.mockImplementationOnce(
      async (_id, _handle, _entities, wait, onState, conflicts) => {
        await wait();
        onState({ status: "idle", syncType: "local" });
        await conflicts();
      },
    );
    await folder.saveToFolder();
    expect(deps.flushPendingSaves).toHaveBeenCalledOnce();
    expect(checkConflicts).toHaveBeenCalledOnce();
    expect(coordinator.push.mock.calls[0][6]).toEqual({ interactive: true });
    expect(updateLastSavedToFolder).toHaveBeenCalledWith("vault-1");
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: "SYNC:LOCAL_PUSH_COMPLETE" }),
    );
    expect(state.status).toBe("saved");
  });

  it("does not report a failed push as saved and retains failed files", async () => {
    const { folder, coordinator, state } = fixture();
    const failures = [{ path: "a.md", error: "unwritable" }];
    coordinator.push.mockImplementationOnce(
      async (_id, _handle, _entities, _wait, onState) => {
        onState({
          status: "error",
          syncType: null,
          errorMessage: "Failed",
          failedFiles: failures,
        });
      },
    );
    await folder.saveToFolder();
    expect(state.status).toBe("error");
    expect(state.errorMessage).toBe("Failed");
    expect(state.failedFiles).toEqual(failures);
    expect(updateLastSavedToFolder).not.toHaveBeenCalled();
  });

  it("invalidates cache before reloading a successful folder pull", async () => {
    const { folder, reload, coordinator } = fixture();
    await folder.loadFromFolder();
    expect(coordinator.pull).toHaveBeenCalledOnce();
    expect(cacheService.clearVault).toHaveBeenCalledWith("vault-1");
    expect(reload).toHaveBeenCalledWith(false);
    expect(
      vi.mocked(cacheService.clearVault).mock.invocationCallOrder[0],
    ).toBeLessThan(reload.mock.invocationCallOrder[0]);
  });

  it("leaves dirty work alone when overwrite is cancelled", async () => {
    const { folder, deps, coordinator } = fixture();
    vi.spyOn(deps, "activeVaultRecord").mockReturnValue({
      lastInternalChange: 20,
      lastSavedToFolder: 10,
    } as any);
    vi.spyOn(notificationStore, "confirm").mockResolvedValue(false);
    await folder.loadFromFolder();
    expect(deps.getSyncCoordinator).not.toHaveBeenCalled();
    expect(coordinator.pull).not.toHaveBeenCalled();
  });

  it.each(["denied", "throws"])(
    "stops an interactive sync when folder permission %s",
    async (permission) => {
      const { folder, deps, coordinator, state } = fixture();
      const requestPermission = vi.fn().mockResolvedValue("denied");
      deps.getActiveFolderHandle.mockResolvedValue({
        queryPermission:
          permission === "throws"
            ? vi.fn().mockRejectedValue(new Error("denied"))
            : vi.fn().mockResolvedValue("prompt"),
        requestPermission,
      });
      const notify = vi.spyOn(notificationStore, "notify");
      await folder.saveToFolder();
      expect(coordinator.push).not.toHaveBeenCalled();
      expect(state.status).toBe("needs-permission");
      expect(notify).toHaveBeenCalledWith(
        "Permission denied for local folder.",
        "error",
      );
    },
  );

  it.each(["push", "pull"] as const)(
    "resets transitional state and ignores stale %s completion",
    async (direction) => {
      const { folder, coordinator, state, switchVault, reload } = fixture();
      coordinator[direction].mockImplementationOnce(
        async (_id, _handle, _entities, _wait, onState) => {
          onState({ status: "loading", syncType: "local" });
          switchVault("vault-2");
          onState({ status: "error", syncType: null, errorMessage: "Stale" });
        },
      );
      await (direction === "push"
        ? folder.saveToFolder()
        : folder.loadFromFolder());
      expect(state.status).toBe("idle");
      expect(state.errorMessage).toBeNull();
      expect(updateLastSavedToFolder).not.toHaveBeenCalled();
      expect(reload).not.toHaveBeenCalled();
    },
  );

  it("queries auto-sync permission without prompting", async () => {
    const { folder, deps, state } = fixture();
    const localHandle = {
      queryPermission: vi.fn().mockResolvedValue("prompt"),
      requestPermission: vi.fn(),
    };
    deps.getActiveFolderHandle.mockResolvedValue(localHandle);
    expect(await folder.queryAutoSyncPermission(false)).toEqual({
      localHandle,
      skipLocalSync: true,
    });
    expect(localHandle.requestPermission).not.toHaveBeenCalled();
    expect(state.hasFolderHandle).toBe(true);
    expect(state.status).toBe("needs-permission");
  });

  it("reloads after a deferred pull and degrades failures without blocking vault readiness", async () => {
    const { folder, deps, coordinator, state, handle, reload } = fixture();
    deps.getActiveFolderHandle.mockResolvedValue({
      queryPermission: vi.fn().mockResolvedValue("granted"),
    });
    const degraded = vi.fn();
    const signal = new AbortController().signal;
    await folder.runDeferred("vault-1", handle, signal, degraded);
    expect(reload).toHaveBeenCalledWith(false, { deferAuxiliary: true });
    coordinator.syncWithLocalFolder.mockImplementationOnce(
      async (_id, _handle, _direction, _entities, _wait, onState) => {
        onState({ status: "error", syncType: null });
      },
    );
    reload.mockClear();
    await folder.runDeferred("vault-1", handle, signal, degraded);
    expect(degraded).toHaveBeenCalledWith("local_sync");
    expect(state.status).toBe("idle");
    expect(reload).not.toHaveBeenCalled();
  });
});
