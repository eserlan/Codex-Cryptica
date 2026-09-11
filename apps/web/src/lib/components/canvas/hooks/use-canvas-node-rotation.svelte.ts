import { SvelteMap } from "svelte/reactivity";
import { accumulateRotationDegrees, canvasNodeRotation, pointerAngleDegrees } from "../canvas-workspace-helpers";
import type { Node } from "@xyflow/svelte";

export function useCanvasNodeRotation(logic: {
  nodes: Node[];
  updateNodeRotation: (nodeId: string, rotation: number) => void;
  saveNow: () => void;
}, vault: { isGuest: boolean }) {
  let selectedRotationNodeId = $state<string | null>(null);
  let isRotatingNode = $state(false);

  const touchRotationPointers = new SvelteMap<
    number,
    { nodeId: string; x: number; y: number }
  >();

  let touchRotationGesture = $state<{
    nodeId: string;
    pointerIds: [number, number];
    previousAngle: number;
    rotation: number;
  } | null>(null);

  let desktopRotationGesture = $state<{
    nodeId: string;
    pointerId: number;
    center: { x: number; y: number };
    previousAngle: number;
    rotation: number;
  } | null>(null);

  function nodeIdFromPointerTarget(target: EventTarget | null) {
    if (!target) return null;
    const element = target as HTMLElement;
    const nodeElement = element.closest(".svelte-flow__node") as HTMLElement;
    return nodeElement?.dataset?.id || null;
  }

  function canRotateNode(nodeId: string) {
    const node = logic.nodes.find((candidate) => candidate.id === nodeId);
    return Boolean(
      node &&
        node.type !== "delveSectorGroup" &&
        !(node.data as Record<string, unknown> | undefined)?.locked,
    );
  }

  function beginTouchRotation(event: PointerEvent, isDrawingMode: boolean, isErasingMode: boolean) {
    if (
      event.pointerType !== "touch" ||
      vault.isGuest ||
      isDrawingMode ||
      isErasingMode
    ) {
      return;
    }
    const nodeId = nodeIdFromPointerTarget(event.target);
    if (!nodeId || !canRotateNode(nodeId)) return;

    touchRotationPointers.set(event.pointerId, {
      nodeId,
      x: event.clientX,
      y: event.clientY,
    });
    const matching = [...touchRotationPointers.entries()].filter(
      ([, pointer]) => pointer.nodeId === nodeId,
    );
    if (matching.length !== 2 || touchRotationGesture) return;

    const [[firstId, first], [secondId, second]] = matching;
    const node = logic.nodes.find((candidate) => candidate.id === nodeId);
    touchRotationGesture = {
      nodeId,
      pointerIds: [firstId, secondId],
      previousAngle: pointerAngleDegrees(first, second),
      rotation: canvasNodeRotation(node),
    };
    selectedRotationNodeId = nodeId;
    isRotatingNode = true;
    event.preventDefault();
    event.stopPropagation();
  }

  function beginDesktopRotation(event: PointerEvent) {
    const nodeId = selectedRotationNodeId;
    if (
      !nodeId ||
      vault.isGuest ||
      event.pointerType === "touch" ||
      event.button !== 0 ||
      !canRotateNode(nodeId)
    ) {
      return;
    }
    const nodeElement = [
      ...document.querySelectorAll<HTMLElement>(".svelte-flow__node"),
    ].find((element) => element.dataset.id === nodeId);
    if (!nodeElement) return;
    const bounds = nodeElement.getBoundingClientRect();
    const center = {
      x: bounds.left + bounds.width / 2,
      y: bounds.top + bounds.height / 2,
    };
    const node = logic.nodes.find((candidate) => candidate.id === nodeId);
    desktopRotationGesture = {
      nodeId,
      pointerId: event.pointerId,
      center,
      previousAngle: pointerAngleDegrees(center, {
        x: event.clientX,
        y: event.clientY,
      }),
      rotation: canvasNodeRotation(node),
    };
    isRotatingNode = true;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    event.preventDefault();
    event.stopPropagation();
  }

  function rotateSelectedNodeWithKeyboard(event: KeyboardEvent) {
    if (
      !selectedRotationNodeId ||
      (event.key !== "ArrowLeft" && event.key !== "ArrowRight")
    ) {
      return;
    }
    const node = logic.nodes.find(
      (candidate) => candidate.id === selectedRotationNodeId,
    );
    if (!node || !canRotateNode(node.id)) return;
    const step = event.shiftKey ? 45 : 15;
    const rotation =
      canvasNodeRotation(node) + (event.key === "ArrowRight" ? step : -step);
    logic.updateNodeRotation(node.id, rotation);
    logic.saveNow();
    event.preventDefault();
    event.stopPropagation();
  }

  function handleRotationPointerMove(event: PointerEvent) {
    if (touchRotationPointers.has(event.pointerId)) {
      const current = touchRotationPointers.get(event.pointerId)!;
      touchRotationPointers.set(event.pointerId, {
        ...current,
        x: event.clientX,
        y: event.clientY,
      });
    }

    if (touchRotationGesture) {
      const [firstId, secondId] = touchRotationGesture.pointerIds;
      const first = touchRotationPointers.get(firstId);
      const second = touchRotationPointers.get(secondId);
      if (
        first &&
        second &&
        touchRotationGesture.pointerIds.includes(event.pointerId)
      ) {
        const angle = pointerAngleDegrees(first, second);
        const rotation = accumulateRotationDegrees(
          touchRotationGesture.rotation,
          touchRotationGesture.previousAngle,
          angle,
        );
        touchRotationGesture.rotation = rotation;
        touchRotationGesture.previousAngle = angle;
        logic.updateNodeRotation(touchRotationGesture.nodeId, rotation);
        event.preventDefault();
        event.stopPropagation();
      }
      return;
    }

    if (
      desktopRotationGesture &&
      desktopRotationGesture.pointerId === event.pointerId
    ) {
      const angle = pointerAngleDegrees(desktopRotationGesture.center, {
        x: event.clientX,
        y: event.clientY,
      });
      const rotation = accumulateRotationDegrees(
        desktopRotationGesture.rotation,
        desktopRotationGesture.previousAngle,
        angle,
      );
      desktopRotationGesture.rotation = rotation;
      desktopRotationGesture.previousAngle = angle;
      logic.updateNodeRotation(desktopRotationGesture.nodeId, rotation);
      event.preventDefault();
      event.stopPropagation();
    }
  }

  function finishNodeRotation(event: PointerEvent) {
    const completedTouchGesture = Boolean(
      touchRotationGesture?.pointerIds.includes(event.pointerId),
    );
    const completedDesktopGesture =
      desktopRotationGesture?.pointerId === event.pointerId;
    touchRotationPointers.delete(event.pointerId);
    if (!completedTouchGesture && !completedDesktopGesture) return;

    touchRotationGesture = null;
    desktopRotationGesture = null;
    isRotatingNode = false;
    logic.saveNow();
    event.preventDefault();
    event.stopPropagation();
  }

  return {
    get selectedRotationNodeId() {
      return selectedRotationNodeId;
    },
    set selectedRotationNodeId(value) {
      selectedRotationNodeId = value;
    },
    get isRotatingNode() {
      return isRotatingNode;
    },
    canRotateNode,
    beginTouchRotation,
    beginDesktopRotation,
    rotateSelectedNodeWithKeyboard,
    handleRotationPointerMove,
    finishNodeRotation,
  };
}
