/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import type { Node } from "@xyflow/svelte";
import { useCanvasNodeActions } from "./use-canvas-node-actions.svelte";

const node = (id: string, data: Record<string, unknown> = {}): Node =>
  ({ id, type: "text", position: { x: 0, y: 0 }, data }) as Node;

function setup(options: { isGuest?: boolean } = {}) {
  const canvas = { metadata: {} as Record<string, unknown> };
  const logic = {
    nodes: [node("a", { locked: false }), node("b", { zIndex: 4 })],
    activeCategories: new Set<string>(),
    screenToFlowPosition: vi.fn((p: { x: number; y: number }) => p),
    saveNow: vi.fn(),
  };
  const engine = { addTextNode: vi.fn(() => "new-node") };
  const actions = useCanvasNodeActions({
    logic: logic as never,
    getEngine: () => engine as never,
    vault: { isGuest: options.isGuest ?? false } as never,
    getCanvas: () => canvas as never,
    isExporting: () => false,
  });
  return { actions, logic, engine, canvas };
}

describe("useCanvasNodeActions", () => {
  it("merges data updates and applies size changes to the node itself", () => {
    const { actions, logic } = setup();

    actions.updateNodeData("a", { text: "hello", width: 200, height: 80 });

    expect(logic.nodes[0]).toMatchObject({
      width: 200,
      height: 80,
      data: { locked: false, text: "hello" },
    });
    expect(logic.nodes[1].data).toEqual({ zIndex: 4 });
  });

  it("toggles the lock flag on and off", () => {
    const { actions, logic } = setup();

    actions.toggleNodeLock("a");
    expect((logic.nodes[0].data as { locked: boolean }).locked).toBe(true);
    actions.toggleNodeLock("a");
    expect((logic.nodes[0].data as { locked: boolean }).locked).toBe(false);
  });

  it("stacks nodes in front of and behind the rest", () => {
    const { actions, logic } = setup();

    actions.handleBringNodeToFront("a");
    expect((logic.nodes[0].data as { zIndex: number }).zIndex).toBe(5);

    actions.handleSendNodeToBack("b");
    expect((logic.nodes[1].data as { zIndex: number }).zIndex).toBeLessThan(0);
  });

  it("adds a text node above existing nodes and saves", () => {
    const { actions, logic, engine } = setup();

    actions.handleAddTextNode({ x: 10, y: 20 });

    expect(engine.addTextNode).toHaveBeenCalledWith("", { x: 10, y: 20 });
    expect(logic.nodes).toHaveLength(3);
    expect(logic.nodes[2].id).toBe("new-node");
    expect((logic.nodes[2].data as { zIndex: number }).zIndex).toBe(5);
    expect(logic.saveNow).toHaveBeenCalledOnce();
  });

  it("does not add a text node for guests", () => {
    const { actions, logic, engine } = setup({ isGuest: true });

    actions.handleAddTextNode({ x: 10, y: 20 });

    expect(engine.addTextNode).not.toHaveBeenCalled();
    expect(logic.nodes).toHaveLength(2);
    expect(logic.saveNow).not.toHaveBeenCalled();
  });

  it("toggles image labels in the canvas metadata and saves", () => {
    const { actions, canvas, logic } = setup();

    actions.handleToggleShowImageLabels();

    expect(canvas.metadata.showImageLabels).toBe(true);
    expect(logic.saveNow).toHaveBeenCalledOnce();
  });

  it("does not switch every card to image-only for guests", () => {
    const { actions, canvas, logic } = setup({ isGuest: true });

    actions.handleToggleAllImageOnly();

    expect(canvas.metadata.defaultCardView).toBeUndefined();
    expect(logic.saveNow).not.toHaveBeenCalled();
  });
});
