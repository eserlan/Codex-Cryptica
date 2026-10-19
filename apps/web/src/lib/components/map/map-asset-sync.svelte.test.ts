import { describe, expect, it, vi } from "vitest";
import { flushSync } from "svelte";
import { syncMapAssets } from "./map-asset-sync.svelte";

type TestMap = { id: string; assetPath: string };

function setup() {
  const state = $state<{ map: TestMap | null }>({
    map: { id: "m1", assetPath: "maps/m1.webp" },
  });
  const cancel = vi.fn();
  const sync = vi.fn((_map: TestMap | null) => cancel);
  let retry = () => {};
  const destroy = $effect.root(() => {
    retry = syncMapAssets({
      signature: () =>
        state.map ? `${state.map.id}:${state.map.assetPath}` : null,
      activeMap: () => state.map,
      sync,
    }).retry;
  });
  flushSync();
  return { state, sync, cancel, retry: () => retry(), destroy };
}

describe("syncMapAssets", () => {
  it("loads the active map once", () => {
    const { sync, destroy } = setup();
    expect(sync).toHaveBeenCalledTimes(1);
    expect(sync).toHaveBeenCalledWith({ id: "m1", assetPath: "maps/m1.webp" });
    destroy();
  });

  it("keeps loading when the map is replaced by an equal record", () => {
    const { state, sync, cancel, destroy } = setup();

    // The vault re-sets its map registry while the image is loading.
    state.map = { id: "m1", assetPath: "maps/m1.webp" };
    flushSync();

    expect(cancel).not.toHaveBeenCalled();
    expect(sync).toHaveBeenCalledTimes(1);
    destroy();
  });

  it("reloads when the image changes, cancelling the previous load", () => {
    const { state, sync, cancel, destroy } = setup();

    state.map = { id: "m1", assetPath: "maps/m1-new.webp" };
    flushSync();

    expect(cancel).toHaveBeenCalledTimes(1);
    expect(sync).toHaveBeenCalledTimes(2);
    expect(sync).toHaveBeenLastCalledWith({
      id: "m1",
      assetPath: "maps/m1-new.webp",
    });
    destroy();
  });

  it("reloads the same image on retry", () => {
    const { sync, retry, destroy } = setup();

    retry();
    flushSync();

    expect(sync).toHaveBeenCalledTimes(2);
    destroy();
  });

  it("cancels the load when torn down", () => {
    const { cancel, destroy } = setup();
    destroy();
    expect(cancel).toHaveBeenCalledTimes(1);
  });
});
