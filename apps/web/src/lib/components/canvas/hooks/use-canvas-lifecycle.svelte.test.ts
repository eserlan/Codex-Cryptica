/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushSync } from "svelte";

const session = vi.hoisted(() => ({ isGuestMode: false }));

vi.mock("$lib/stores/ui/session-mode.svelte", () => ({
  sessionModeStore: session,
}));
vi.mock("$lib/services/delve-area-enhancement", () => ({
  isPlaceholderDelveAreaName: vi.fn(() => false),
}));
vi.mock("../canvas-auto-arrange", () => ({
  autoArrangeCanvasNodes: vi.fn(() => [{ id: "arranged" }]),
}));

import { autoArrangeCanvasNodes } from "../canvas-auto-arrange";
import { useCanvasLifecycle } from "./use-canvas-lifecycle.svelte";

type TestCanvas = {
  id: string;
  name: string;
  nodes: unknown[];
  edges: unknown[];
  metadata: Record<string, unknown>;
};

function setup(canvasOverrides: Partial<TestCanvas> = {}) {
  const canvas: TestCanvas = {
    id: "c1",
    name: "Map",
    nodes: [],
    edges: [],
    metadata: {},
    ...canvasOverrides,
  };
  const logic = $state({
    nodes: [] as unknown[],
    edges: [] as unknown[],
    hasInitialized: false,
    initializeCanvas: vi.fn(),
    pruneNodes: vi.fn(),
    syncEngine: vi.fn(),
    handleBatchSpawn: vi.fn(),
    saveNow: vi.fn(),
    flushSave: vi.fn(),
    fitView: undefined as unknown,
  });
  const registry = $state({ pendingEntities: [] as unknown[] });
  const populateCanvasAreas = vi.fn();
  let handle!: ReturnType<typeof useCanvasLifecycle>;
  const cleanup = $effect.root(() => {
    handle = useCanvasLifecycle({
      logic: logic as never,
      vault: { entities: {} } as never,
      canvasRegistry: registry as never,
      getCanvas: () => canvas as never,
      getCanvasId: () => canvas.id,
      populateCanvasAreas,
    });
  });
  flushSync();
  return { logic, canvas, registry, populateCanvasAreas, handle, cleanup };
}

describe("useCanvasLifecycle", () => {
  beforeEach(() => {
    session.isGuestMode = false;
    vi.mocked(autoArrangeCanvasNodes).mockClear();
  });

  let teardown: (() => void) | undefined;
  afterEach(() => teardown?.());

  it("initialises the logic for the current canvas", () => {
    const ctx = setup();
    teardown = ctx.cleanup;

    expect(ctx.logic.initializeCanvas).toHaveBeenCalledWith("c1");
  });

  it("auto-arranges once after initialisation and marks the layout auto", () => {
    const ctx = setup();
    teardown = ctx.cleanup;
    expect(autoArrangeCanvasNodes).not.toHaveBeenCalled();

    ctx.logic.hasInitialized = true;
    flushSync();

    expect(autoArrangeCanvasNodes).toHaveBeenCalledOnce();
    expect(ctx.logic.nodes).toEqual([{ id: "arranged" }]);
    expect(ctx.canvas.metadata.layoutState).toBe("auto");
    expect(ctx.logic.saveNow).toHaveBeenCalledOnce();
  });

  it("leaves a manually arranged canvas alone", () => {
    const ctx = setup({ metadata: { layoutState: "manual" } });
    teardown = ctx.cleanup;

    ctx.logic.hasInitialized = true;
    flushSync();

    expect(autoArrangeCanvasNodes).not.toHaveBeenCalled();
    expect(ctx.canvas.metadata.layoutState).toBe("manual");
  });

  it("starts area population once for a canvas that opted in", () => {
    const ctx = setup({ metadata: { autoPopulateAreas: true } });
    teardown = ctx.cleanup;

    ctx.logic.hasInitialized = true;
    flushSync();
    ctx.logic.nodes = [];
    flushSync();

    expect(ctx.populateCanvasAreas).toHaveBeenCalledExactlyOnceWith(ctx.canvas);
  });

  it("does not populate areas for guests, opted-out or finished canvases", () => {
    session.isGuestMode = true;
    const guest = setup({ metadata: { autoPopulateAreas: true } });
    guest.logic.hasInitialized = true;
    flushSync();
    expect(guest.populateCanvasAreas).not.toHaveBeenCalled();
    guest.cleanup();

    session.isGuestMode = false;
    const optedOut = setup({ metadata: {} });
    optedOut.logic.hasInitialized = true;
    flushSync();
    expect(optedOut.populateCanvasAreas).not.toHaveBeenCalled();
    optedOut.cleanup();

    const done = setup({
      metadata: { autoPopulateAreas: true, areaPopulationStatus: "complete" },
    });
    teardown = done.cleanup;
    done.logic.hasInitialized = true;
    flushSync();
    expect(done.populateCanvasAreas).not.toHaveBeenCalled();
  });

  it("spawns pending entities and flushes pending saves on teardown", () => {
    const ctx = setup();

    ctx.registry.pendingEntities = [{ id: "e1" }];
    ctx.logic.nodes = [];
    flushSync();
    expect(ctx.logic.handleBatchSpawn).toHaveBeenCalled();

    ctx.cleanup();
    expect(ctx.logic.flushSave).toHaveBeenCalled();
  });
});
