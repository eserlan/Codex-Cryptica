import { describe, expect, it, vi } from "vitest";
import type { Token } from "../../../types/vtt";
import {
  SoloExplorationRecorder,
  type SoloExplorationState,
} from "./solo-exploration-recorder.svelte";

const hex = {
  orientation: "pointy" as const,
  size: 20,
  offsetX: 0,
  offsetY: 0,
};
const source = (x: number): Token => ({
  id: "party",
  entityId: null,
  name: "Party",
  x,
  y: 0,
  width: 20,
  height: 20,
  rotation: 0,
  zIndex: 0,
  ownerPeerId: null,
  ownerGuestName: null,
  visibleTo: "all",
  color: "white",
  imageUrl: null,
  statusEffects: [],
  isVisionSource: true,
});

function setup(
  overrides: Partial<SoloExplorationState> = {},
  alreadyRevealed = false,
) {
  const state: SoloExplorationState = {
    soloOn: true,
    canReveal: true,
    hex,
    visionRange: 0,
    gridDistance: 6,
    gridSize: 20,
    gridUnit: "mi",
    showHexCoordinates: true,
    mapId: "map-1",
    assetsReady: true,
    ...overrides,
  };
  const before = {} as HTMLCanvasElement;
  const revealer = { reveal: vi.fn().mockResolvedValue(true) };
  const undo = { snapshot: vi.fn(() => before), commit: vi.fn() };
  const publishCapture = vi.fn();
  const recorder = new SoloExplorationRecorder({
    revealer,
    undo,
    isRevealedAt: () => alreadyRevealed,
    publishCapture,
    getState: () => state,
  });
  return { state, revealer, undo, publishCapture, recorder };
}

describe("SoloExplorationRecorder", () => {
  it("keeps legacy reveal behavior with SOLO off and refuses reveal for guests", async () => {
    const legacy = setup({ soloOn: false });
    await legacy.recorder.onVisionChanged([source(0)]);
    await legacy.recorder.onMoveSettled([source(30)]);
    expect(legacy.revealer.reveal).toHaveBeenCalled();
    expect(legacy.undo.commit).not.toHaveBeenCalled();
    expect(legacy.publishCapture).not.toHaveBeenCalled();

    const guest = setup({ canReveal: false });
    await guest.recorder.onVisionChanged([source(0)]);
    expect(guest.revealer.reveal).not.toHaveBeenCalled();
  });

  it("counts travel only after placement and settles repeated drag reveals once", async () => {
    const { recorder, undo, revealer, publishCapture } = setup();
    await recorder.onVisionChanged([source(0)]);
    await recorder.onMoveSettled([source(0)]);
    expect(recorder.lastMove).toBeNull();

    await recorder.onVisionChanged([source(35)]);
    await recorder.onVisionChanged([source(55)]);
    expect(revealer.reveal).toHaveBeenCalledTimes(3);
    expect(revealer.reveal).toHaveBeenLastCalledWith([source(55)], 0, 0);
    expect(undo.snapshot).toHaveBeenCalledOnce();
    expect(undo.commit).not.toHaveBeenCalled();
    await recorder.onMoveSettled([source(55)]);

    expect(recorder.lastMove).toEqual({ hexes: 2, distance: 12, unit: "mi" });
    expect(recorder.total).toEqual({ hexes: 2, distance: 12, unit: "mi" });
    expect(undo.commit).toHaveBeenCalledOnce();
    expect(publishCapture).toHaveBeenCalledOnce();
    expect(publishCapture).toHaveBeenCalledWith(
      expect.objectContaining({
        entryType: "map-move",
        content: "Moved 2 hexes (12 mi) to 02.00, revealing 2 new hexes.",
      }),
    );
  });

  it("does not count non-vision tokens, same-hex movement, or areas already revealed", async () => {
    const nonVision = setup();
    const token = { ...source(0), isVisionSource: false };
    await nonVision.recorder.onVisionChanged([token]);
    await nonVision.recorder.onMoveSettled([token]);
    expect(nonVision.revealer.reveal).not.toHaveBeenCalled();
    expect(nonVision.publishCapture).not.toHaveBeenCalled();

    const sameHex = setup();
    await sameHex.recorder.onVisionChanged([source(0)]);
    await sameHex.recorder.onVisionChanged([source(10)]);
    await sameHex.recorder.onMoveSettled([source(10)]);
    expect(sameHex.recorder.lastMove).toBeNull();
    expect(sameHex.undo.commit).not.toHaveBeenCalled();
    expect(sameHex.publishCapture).not.toHaveBeenCalled();

    const revealed = setup({}, true);
    await revealed.recorder.onVisionChanged([source(0)]);
    await revealed.recorder.onVisionChanged([source(35)]);
    await revealed.recorder.onMoveSettled([source(35)]);
    expect(revealed.undo.snapshot).not.toHaveBeenCalled();
    expect(revealed.undo.commit).not.toHaveBeenCalled();
  });

  it("uses straight-line map units, resets totals, and still counts the next move", async () => {
    const { recorder, publishCapture, undo } = setup({
      hex: null,
      gridDistance: 5,
      gridSize: 10,
    });
    await recorder.onVisionChanged([source(0)]);
    await recorder.onVisionChanged([source(30)]);
    await recorder.onMoveSettled([source(30)]);
    expect(recorder.lastMove).toEqual({
      hexes: null,
      distance: 15,
      unit: "mi",
    });
    recorder.reset();
    expect(recorder.lastMove).toBeNull();
    expect(recorder.total.distance).toBe(0);

    await recorder.onVisionChanged([source(30)]);
    await recorder.onVisionChanged([source(50)]);
    await recorder.onMoveSettled([source(50)]);
    expect(recorder.lastMove?.distance).toBe(10);
    expect(recorder.total.distance).toBe(10);
    expect(publishCapture).toHaveBeenLastCalledWith(
      expect.objectContaining({
        content: "Moved 10 mi.",
        sourceRef: expect.objectContaining({ revealed: 0 }),
      }),
    );
    expect(undo.commit).toHaveBeenCalledTimes(2);
  });

  it("updates an empty travel tally when the map unit changes", async () => {
    const { recorder, state } = setup();
    state.gridUnit = "km";

    await recorder.onVisionChanged([source(0)]);

    expect(recorder.total).toEqual({ hexes: 0, distance: 0, unit: "km" });
  });

  it("applies a changed sight range on the next move, not to a stationary token", async () => {
    const { recorder, state, revealer } = setup();
    await recorder.onVisionChanged([source(0)]);
    state.visionRange = 12;

    await recorder.onVisionChanged([source(0)]);
    expect(revealer.reveal).toHaveBeenCalledOnce();

    await recorder.onVisionChanged([source(20)]);
    expect(revealer.reveal).toHaveBeenLastCalledWith([source(20)], 60, 2);
  });

  it("retries the initial reveal when map assets finish loading", async () => {
    const { recorder, state, revealer } = setup({ assetsReady: false });
    revealer.reveal.mockResolvedValueOnce(false);
    await recorder.onVisionChanged([source(0)]);
    expect(revealer.reveal).toHaveBeenCalledOnce();

    state.assetsReady = true;
    await recorder.onVisionChanged([source(0)]);
    expect(revealer.reveal).toHaveBeenCalledTimes(2);
  });
});
