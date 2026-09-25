/** @vitest-environment jsdom */

import { render } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import Minimap from "./Minimap.svelte";

const createCy = () => ({
  on: vi.fn(),
  off: vi.fn(),
  nodes: vi.fn().mockReturnValue({ length: 0 }),
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Minimap visibility lifecycle", () => {
  it("does not attach graph listeners while suspended", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      {} as CanvasRenderingContext2D,
    );
    const cy = createCy();

    render(Minimap, {
      props: { cy: cy as any, isExpanded: true, isSuspended: true },
    });

    expect(cy.on).not.toHaveBeenCalled();
  });

  it("attaches listeners again when resumed", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      {} as CanvasRenderingContext2D,
    );
    const cy = createCy();
    const view = render(Minimap, {
      props: { cy: cy as any, isExpanded: true, isSuspended: true },
    });

    await view.rerender({
      cy: cy as any,
      isExpanded: true,
      isSuspended: false,
    });

    expect(cy.on).toHaveBeenCalledWith(
      "add remove position data",
      expect.any(Function),
    );
    expect(cy.on).toHaveBeenCalledWith("pan zoom resize", expect.any(Function));
  });
});

describe("Minimap graph updates", () => {
  /** Enough of Cytoscape and a 2D context for a frame to draw. */
  const drawableCy = () => ({
    ...createCy(),
    pan: vi.fn().mockReturnValue({ x: 0, y: 0 }),
    zoom: vi.fn().mockReturnValue(1),
    width: vi.fn().mockReturnValue(100),
    height: vi.fn().mockReturnValue(100),
  });
  const context = () =>
    ({
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
    }) as unknown as CanvasRenderingContext2D;

  /** Queues frames instead of running them, so tests control when they fire. */
  function manualFrames() {
    const queue = new Map<number, FrameRequestCallback>();
    let nextId = 0;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      queue.set(++nextId, cb);
      return nextId;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
      queue.delete(id);
    });
    return () => {
      const pending = [...queue.values()];
      queue.clear();
      pending.forEach((cb) => cb(performance.now()));
    };
  }

  const graphHandler = (cy: ReturnType<typeof createCy>) =>
    cy.on.mock.calls.find(
      (call: unknown[]) => call[0] === "add remove position data",
    )![1] as () => void;

  it("coalesces a burst of element events into one rebuild per frame", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      context(),
    );
    const flushFrames = manualFrames();
    const cy = drawableCy();
    render(Minimap, { props: { cy: cy as any, isExpanded: true } });
    flushFrames();
    cy.nodes.mockClear();

    const onGraphChange = graphHandler(cy);
    for (let i = 0; i < 500; i++) onGraphChange();
    expect(cy.nodes).not.toHaveBeenCalled();

    flushFrames();
    // One rebuild: the node list and the projection read the nodes once each.
    expect(cy.nodes).toHaveBeenCalledTimes(2);
  });

  it("skips rebuilds while collapsed and catches up when expanded", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      context(),
    );
    const flushFrames = manualFrames();
    const cy = drawableCy();
    const view = render(Minimap, {
      props: { cy: cy as any, isExpanded: false },
    });
    flushFrames();
    cy.nodes.mockClear();

    for (let i = 0; i < 50; i++) graphHandler(cy)();
    flushFrames();
    expect(cy.nodes).not.toHaveBeenCalled();

    await view.rerender({ cy: cy as any, isExpanded: true });
    flushFrames();
    expect(cy.nodes).toHaveBeenCalledTimes(2);
  });
});
