import { beforeEach, describe, expect, it, vi } from "vitest";
import { BoxSelectionHandler } from "./box-selection-handler.svelte";

describe("BoxSelectionHandler", () => {
  let hostMode = true;
  let vttEnabled = true;
  let selectWithinBox: ReturnType<typeof vi.fn>;
  let handler: BoxSelectionHandler;

  beforeEach(() => {
    hostMode = true;
    vttEnabled = true;
    selectWithinBox = vi.fn();
    handler = new BoxSelectionHandler({
      isHostMode: () => hostMode,
      isVttEnabled: () => vttEnabled,
      tokenSelection: { selectWithinBox } as any,
    });
  });

  it("starts with ctrl or meta only in host VTT mode", () => {
    expect(handler.begin({ x: 10, y: 20 }, {})).toBe(false);

    expect(handler.begin({ x: 10, y: 20 }, { ctrlKey: true })).toBe(true);
    expect(handler.start).toEqual({ x: 10, y: 20 });
    expect(handler.end).toEqual({ x: 10, y: 20 });
  });

  it("does not start outside host VTT mode", () => {
    hostMode = false;
    expect(handler.begin({ x: 10, y: 20 }, { ctrlKey: true })).toBe(false);

    hostMode = true;
    vttEnabled = false;
    expect(handler.begin({ x: 10, y: 20 }, { ctrlKey: true })).toBe(false);
  });

  it("updates and commits the selected rectangle", () => {
    handler.begin({ x: 10, y: 20 }, { ctrlKey: true });
    handler.update({ x: 100, y: 120 });

    expect(handler.commit()).toBe(true);

    expect(selectWithinBox).toHaveBeenCalledWith(
      { x: 10, y: 20 },
      { x: 100, y: 120 },
    );
    expect(handler.start).toBeNull();
    expect(handler.end).toBeNull();
  });
});
