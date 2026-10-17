import { describe, expect, it, vi } from "vitest";
import {
  GridChangeGuard,
  type GridChangeConfirmOptions,
} from "./grid-change-guard.svelte";

const MAP_ID = "map-1";

function setup(count = 3) {
  const confirm = vi.fn(async (_opts: GridChangeConfirmOptions) => true);
  const guard = new GridChangeGuard({
    confirm,
    getRecordCount: vi.fn(() => count),
  });
  return { guard, confirm };
}

describe("GridChangeGuard (T080, FR-039)", () => {
  it("lets the change through without asking when the map has no hex records", async () => {
    const { guard, confirm } = setup(0);
    guard.beginSession(MAP_ID);

    expect(await guard.requestChange(MAP_ID)).toBe(true);
    expect(confirm).not.toHaveBeenCalled();
  });

  it("asks when hex records exist, with the record count in the copy", async () => {
    const { guard, confirm } = setup(3);
    guard.beginSession(MAP_ID);

    expect(await guard.requestChange(MAP_ID)).toBe(true);
    expect(confirm).toHaveBeenCalledTimes(1);
    const options = confirm.mock.calls[0][0];
    expect(options.message).toBe(
      "This map has 3 hex records. Changing the grid will leave them on different hexes. Continue?",
    );
    expect(options.confirmLabel).toBe("Change grid");
    expect(options.cancelLabel).toBe("Cancel");
  });

  it("does not ask again after a confirm in the same session", async () => {
    const { guard, confirm } = setup(2);
    guard.beginSession(MAP_ID);

    await guard.requestChange(MAP_ID);
    expect(await guard.requestChange(MAP_ID)).toBe(true);
    expect(await guard.requestChange(MAP_ID)).toBe(true);
    expect(confirm).toHaveBeenCalledTimes(1);
  });

  it("resolves false on cancel, and keeps that answer for the session", async () => {
    const { guard, confirm } = setup(2);
    confirm.mockResolvedValueOnce(false);
    guard.beginSession(MAP_ID);

    expect(await guard.requestChange(MAP_ID)).toBe(false);
    expect(await guard.requestChange(MAP_ID)).toBe(false);
    expect(confirm).toHaveBeenCalledTimes(1);
  });

  it("asks again in a new session after endSession resets the guard", async () => {
    const { guard, confirm } = setup(2);
    guard.beginSession(MAP_ID);
    await guard.requestChange(MAP_ID);

    guard.endSession();
    guard.beginSession(MAP_ID);
    await guard.requestChange(MAP_ID);

    expect(confirm).toHaveBeenCalledTimes(2);
  });

  it("shares one pending question between overlapping requests", async () => {
    const { guard, confirm } = setup(2);
    guard.beginSession(MAP_ID);

    const [a, b] = await Promise.all([
      guard.requestChange(MAP_ID),
      guard.requestChange(MAP_ID),
    ]);

    expect([a, b]).toEqual([true, true]);
    expect(confirm).toHaveBeenCalledTimes(1);
  });

  it("reports whether the map has hex records, without asking", () => {
    const { guard, confirm } = setup(2);
    expect(guard.hasRecords(MAP_ID)).toBe(true);
    expect(confirm).not.toHaveBeenCalled();
    expect(setup(0).guard.hasRecords(MAP_ID)).toBe(false);
  });
});
