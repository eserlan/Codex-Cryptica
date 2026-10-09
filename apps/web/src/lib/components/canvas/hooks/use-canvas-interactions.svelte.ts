import type { Node } from "@xyflow/svelte";
import type { Canvas } from "@codex/canvas-engine";
import type { vault as VaultStore } from "$lib/stores/vault.svelte";
import { connectionModeStore } from "$lib/stores/ui/connection-mode.svelte";
import { fitDelveSectorFrames } from "../canvas-workspace-helpers";
import type { CanvasLogic } from "./canvas-logic-type";

const ADVENTURE_NODE_TYPES = [
  "situation",
  "location",
  "npc",
  "clue",
  "threat",
  "outcome",
];

export function useCanvasInteractions(deps: {
  logic: CanvasLogic;
  vault: typeof VaultStore;
  getCanvas: () => Canvas | undefined;
  rotationLogic: {
    canRotateNode: (nodeId: string) => boolean;
    selectedRotationNodeId: string | null;
  };
  onSelectRoom: (nodeId: string) => void;
  onSelectAdventureNode: (nodeId: string) => void;
}) {
  const { logic, vault, getCanvas, rotationLogic } = deps;

  function openContextMenu(
    event: MouseEvent,
    type: "node" | "edge" | "pane",
    id: string,
  ) {
    event.preventDefault();
    logic.contextMenu = { x: event.clientX, y: event.clientY, type, id };
  }

  function onNodeContextMenu({
    event,
    node,
  }: {
    event: MouseEvent;
    node: any;
  }) {
    openContextMenu(event, "node", node.id);
  }

  function onEdgeContextMenu({
    event,
    edge,
  }: {
    event: MouseEvent;
    edge: any;
  }) {
    openContextMenu(event, "edge", edge.id);
  }

  function onPaneContextMenu({ event }: { event: MouseEvent }) {
    if (vault.isGuest) return;
    openContextMenu(event, "pane", "pane");
  }

  function onNodeClick({ node }: { node: any }) {
    if (!vault.isGuest && rotationLogic.canRotateNode(node.id)) {
      rotationLogic.selectedRotationNodeId = node.id;
    }
    if (node.type === "delveRoom") {
      deps.onSelectRoom(node.id);
      return;
    }
    if (ADVENTURE_NODE_TYPES.includes(node.type)) {
      deps.onSelectAdventureNode(node.id);
    }
  }

  function onPaneClick() {
    rotationLogic.selectedRotationNodeId = null;
  }

  function onEdgeClick({ event, edge }: { event: MouseEvent; edge: any }) {
    if (event.detail === 2) {
      event.stopPropagation();
      logic.labelModal = {
        isOpen: true,
        edgeId: edge.id,
        currentLabel: (edge.label as string) || "",
      };
    }
  }

  function onNodeDragStop({
    targetNode,
    nodes = [],
  }: {
    targetNode?: Node | null;
    nodes?: Node[];
  }) {
    const movedNodes =
      nodes.length > 0 ? nodes : targetNode ? [targetNode] : [];
    if (movedNodes.length === 0) return;

    const movedById = new Map(
      movedNodes.map((movedNode) => [movedNode.id, movedNode] as const),
    );
    logic.nodes = logic.nodes.map((candidate) =>
      movedById.has(candidate.id)
        ? { ...candidate, position: movedById.get(candidate.id)!.position }
        : candidate,
    );
    if (movedNodes.some((movedNode) => movedNode.type === "delveRoom")) {
      logic.nodes = fitDelveSectorFrames(logic.nodes);
    }
    const canvas = getCanvas();
    if (canvas) {
      canvas.metadata = { ...(canvas.metadata || {}), layoutState: "manual" };
    }
    logic.flushSave();
  }

  function onConnectStart() {
    if (vault.isGuest) return;
    logic.isConnecting = true;
    connectionModeStore.isConnecting = true;
  }

  function onConnectEnd() {
    logic.isConnecting = false;
    connectionModeStore.isConnecting = false;
  }

  return {
    onNodeContextMenu,
    onEdgeContextMenu,
    onPaneContextMenu,
    onNodeClick,
    onPaneClick,
    onEdgeClick,
    onNodeDragStop,
    onConnectStart,
    onConnectEnd,
  };
}
