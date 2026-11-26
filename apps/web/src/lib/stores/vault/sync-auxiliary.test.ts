import { describe, expect, it, vi } from "vitest";
import { VaultSyncAuxiliary } from "./sync-auxiliary";
import { createSyncFixture } from "./tests/sync-fixtures";

describe("VaultSyncAuxiliary", () => {
  it("dispatches independent tasks without waiting and reports their individual failures", async () => {
    const { context, deps, handle } = createSyncFixture();
    const scan = vi.fn().mockRejectedValue(new Error("scan failed"));
    const auxiliary = new VaultSyncAuxiliary(context, scan);
    const degraded = vi.fn();
    deps.loadMaps.mockImplementation(() => new Promise(() => {}));
    deps.loadCanvases.mockImplementation(() => {
      throw new Error("canvases failed");
    });
    deps.updateEntityCount.mockRejectedValue(new Error("count failed"));
    deps.loadPublishRegistry.mockRejectedValue(new Error("registry failed"));
    const signal = new AbortController().signal;
    expect(
      auxiliary.dispatch("vault-1", handle, signal, degraded, {
        includeEntityCount: true,
        entityCount: 12,
        includePublishRegistry: true,
      }),
    ).toBeUndefined();
    await vi.waitFor(() =>
      expect(degraded.mock.calls.map(([source]) => source).sort()).toEqual([
        "canvases",
        "conflict_scan",
        "entity_count",
        "publish_registry",
      ]),
    );
    expect(deps.updateEntityCount).toHaveBeenCalledWith("vault-1", 12);
    expect(scan).toHaveBeenCalledWith(signal);
  });

  it("awaits warm auxiliary loads in order and skips publication until a directory is known", async () => {
    const { context, deps } = createSyncFixture();
    const auxiliary = new VaultSyncAuxiliary(context, vi.fn());
    await auxiliary.loadWarm("vault-1", 4, new AbortController().signal, {});
    expect(deps.updateEntityCount).toHaveBeenCalledWith("vault-1", 4);
    expect(deps.updateEntityCount.mock.invocationCallOrder[0]).toBeLessThan(
      deps.loadMaps.mock.invocationCallOrder[0],
    );
    expect(deps.loadMaps.mock.invocationCallOrder[0]).toBeLessThan(
      deps.loadCanvases.mock.invocationCallOrder[0],
    );
    expect(deps.getActiveVaultHandle).toHaveBeenCalledOnce();
    expect(deps.loadPublishRegistry).not.toHaveBeenCalled();
  });

  it("loads post-parse registries together and preserves blocking load failures", async () => {
    const { context, deps, handle } = createSyncFixture();
    const auxiliary = new VaultSyncAuxiliary(context, vi.fn());
    await auxiliary.loadAfterParse("vault-1", handle);
    expect(deps.loadPublishRegistry).toHaveBeenCalledWith("vault-1", handle);
    deps.loadCanvases.mockRejectedValueOnce(new Error("unreadable canvases"));
    await expect(auxiliary.loadAfterParse("vault-1", handle)).rejects.toThrow(
      "unreadable canvases",
    );
  });
});
