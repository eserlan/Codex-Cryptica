/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Node } from "@xyflow/svelte";

const connectionMode = vi.hoisted(() => ({ isConnecting: false }));

vi.mock("$lib/stores/ui/connection-mode.svelte", () => ({
  connectionModeStore: connectionMode,
}));
vi.mock("../canvas-workspace-helpers", () => ({
  fitDelveSectorFrames: vi.fn((nodes: Node[]) => nodes),
}));

import { fitDelveSectorFrames } from "../canvas-workspace-helpers";
import { useCanvasInteractions } from "./use-canvas-interactions.svelte";

const node = (id: string, type: string, x = 0): Node =>
  ({ id, type, position: { x, y: 0 }, data: {} }) as Node;

function setup(options: { isGuest?: boolean; canRotate?: boolean } = {}) {
  const canvas = { metadata: {} as Record<string, unknown> };
  const logic = {
    nodes: [node("a", "entity"), node("r", "delveRoom")],
    isConnecting: false,
    labelModal: { isOpen: false, edgeId: "", currentLabel: "" },
    flushSave: vi.fn(),
  };
  const rotationLogic = {
    canRotateNode: vi.fn(() => options.canRotate ?? true),
    selectedRotationNodeId: null as string | null,
  };
  const onSelectRoom = vi.fn();
  const onSelectAdventureNode = vi.fn();
  const interactions = useCanvasInteractions({
    logic: logic as never,
    vault: { isGuest: options.isGuest ?? false } as never,
    getCanvas: () => canvas as never,
    rotationLogic,
    onSelectRoom,
    onSelectAdventureNode,
  });
  return {
    interactions,
    logic,
    canvas,
    rotationLogic,
    onSelectRoom,
    onSelectAdventureNode,
  };
}

describe("useCanvasInteractions", () => {
  beforeEach(() => {
    connectionMode.isConnecting = false;
    vi.mocked(fitDelveSectorFrames).mockClear();
  });

  it("routes node clicks to the room or adventure drawer", () => {
    const { interactions, onSelectRoom, onSelectAdventureNode } = setup();

    interactions.onNodeClick({ node: { id: "r", type: "delveRoom" } });
    interactions.onNodeClick({ node: { id: "n", type: "npc" } });
    interactions.onNodeClick({ node: { id: "a", type: "entity" } });

    expect(onSelectRoom).toHaveBeenCalledExactlyOnceWith("r");
    expect(onSelectAdventureNode).toHaveBeenCalledExactlyOnceWith("n");
  });

  it("selects a rotatable node for rotation, but never for guests", () => {
    const owner = setup();
    owner.interactions.onNodeClick({ node: { id: "a", type: "entity" } });
    expect(owner.rotationLogic.selectedRotationNodeId).toBe("a");

    const guest = setup({ isGuest: true });
    guest.interactions.onNodeClick({ node: { id: "a", type: "entity" } });
    expect(guest.rotationLogic.selectedRotationNodeId).toBeNull();
  });

  it("clears the rotation selection when the pane is clicked", () => {
    const { interactions, rotationLogic } = setup();
    rotationLogic.selectedRotationNodeId = "a";

    interactions.onPaneClick();

    expect(rotationLogic.selectedRotationNodeId).toBeNull();
  });

  it("opens the label modal only on a double click of an edge", () => {
    const { interactions, logic } = setup();
    const stopPropagation = vi.fn();
    const edge = { id: "e1", label: "road" };

    interactions.onEdgeClick({
      event: { detail: 1, stopPropagation } as never,
      edge,
    });
    expect(logic.labelModal.isOpen).toBe(false);

    interactions.onEdgeClick({
      event: { detail: 2, stopPropagation } as never,
      edge,
    });
    expect(logic.labelModal).toEqual({
      isOpen: true,
      edgeId: "e1",
      currentLabel: "road",
    });
    expect(stopPropagation).toHaveBeenCalledOnce();
  });

  it("stores moved positions, marks the layout manual and saves on drag stop", () => {
    const { interactions, logic, canvas } = setup();

    interactions.onNodeDragStop({
      nodes: [{ ...node("a", "entity"), position: { x: 50, y: 60 } }],
    });

    expect(logic.nodes[0].position).toEqual({ x: 50, y: 60 });
    expect(logic.nodes[1].position).toEqual({ x: 0, y: 0 });
    expect(canvas.metadata.layoutState).toBe("manual");
    expect(logic.flushSave).toHaveBeenCalledOnce();
    expect(fitDelveSectorFrames).not.toHaveBeenCalled();
  });

  it("refits sector frames when a delve room moves", () => {
    const { interactions } = setup();

    interactions.onNodeDragStop({ targetNode: node("r", "delveRoom", 5) });

    expect(fitDelveSectorFrames).toHaveBeenCalledOnce();
  });

  it("ignores a drag stop that moved nothing", () => {
    const { interactions, logic, canvas } = setup();

    interactions.onNodeDragStop({});

    expect(logic.flushSave).not.toHaveBeenCalled();
    expect(canvas.metadata.layoutState).toBeUndefined();
  });

  it("tracks connection mode, except for guests", () => {
    const owner = setup();
    owner.interactions.onConnectStart();
    expect(owner.logic.isConnecting).toBe(true);
    expect(connectionMode.isConnecting).toBe(true);
    owner.interactions.onConnectEnd();
    expect(owner.logic.isConnecting).toBe(false);
    expect(connectionMode.isConnecting).toBe(false);

    const guest = setup({ isGuest: true });
    guest.interactions.onConnectStart();
    expect(guest.logic.isConnecting).toBe(false);
    expect(connectionMode.isConnecting).toBe(false);
  });
});
