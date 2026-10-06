import { describe, expect, it, vi } from "vitest";
import { MaskUndoRecorder } from "./mask-undo-recorder";

function canvas() {
  const ctx = { clearRect: vi.fn(), drawImage: vi.fn() };
  return {
    value: {
      width: 20,
      height: 10,
      getContext: vi.fn(() => ctx),
    } as unknown as HTMLCanvasElement,
    ctx,
  };
}

describe("MaskUndoRecorder", () => {
  it("copies the live mask and registers undo/redo snapshots on the same map", async () => {
    const live = canvas();
    const before = canvas();
    const after = canvas();
    const made = [before.value, after.value];
    const saveMask = vi.fn().mockResolvedValue(undefined);
    let undo: (() => Promise<void>) | undefined;
    let redo: (() => Promise<void>) | undefined;
    const pushUndoAction = vi.fn(
      (
        _: string,
        u: () => Promise<void>,
        __: unknown,
        r: () => Promise<void>,
      ) => {
        undo = u;
        redo = r;
      },
    );
    const activeMap = { value: "map-1" };
    const recorder = new MaskUndoRecorder({
      getMaskCanvas: () => live.value,
      createCanvas: () => made.shift()!,
      mapStore: {
        get activeMapId() {
          return activeMap.value;
        },
        saveMask,
      },
      oracle: { pushUndoAction },
    });
    const snapshot = recorder.snapshot();
    expect(snapshot).toBe(before.value);
    expect(before.ctx.drawImage).toHaveBeenCalledWith(live.value, 0, 0);

    recorder.commit("Map Drawing", snapshot);
    expect(pushUndoAction).toHaveBeenCalledOnce();
    await undo!();
    expect(live.ctx.clearRect).toHaveBeenCalledWith(0, 0, 20, 10);
    expect(live.ctx.drawImage).toHaveBeenCalledWith(before.value, 0, 0);
    await redo!();
    expect(live.ctx.drawImage).toHaveBeenCalledWith(after.value, 0, 0);
    expect(saveMask).toHaveBeenCalledTimes(2);
  });

  it("returns null without a mask and ignores undo after a map switch", async () => {
    const live = canvas();
    const before = canvas();
    const after = canvas();
    const made = [before.value, after.value];
    const saveMask = vi.fn();
    let undo: (() => Promise<void>) | undefined;
    const activeMap = { value: "map-1" };
    const recorder = new MaskUndoRecorder({
      getMaskCanvas: () => live.value,
      createCanvas: () => made.shift()!,
      mapStore: {
        get activeMapId() {
          return activeMap.value;
        },
        saveMask,
      },
      oracle: {
        pushUndoAction: (_: string, action: () => Promise<void>) => {
          undo = action;
        },
      },
    });
    expect(
      new MaskUndoRecorder({
        getMaskCanvas: () => null,
        createCanvas: () => canvas().value,
        mapStore: { activeMapId: "map-1", saveMask },
        oracle: { pushUndoAction: vi.fn() },
      }).snapshot(),
    ).toBeNull();
    recorder.commit("Map Drawing", before.value);
    activeMap.value = "map-2";
    await undo!();
    expect(saveMask).not.toHaveBeenCalled();
    expect(live.ctx.clearRect).not.toHaveBeenCalled();
  });
});
