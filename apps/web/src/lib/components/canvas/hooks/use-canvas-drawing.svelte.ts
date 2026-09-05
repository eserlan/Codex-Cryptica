import {
  appendCanvasDrawingPoint,
  DEFAULT_CANVAS_DRAWING_COLOR,
  DEFAULT_CANVAS_DRAWING_WIDTH,
  normalizeCanvasDrawingColor,
  normalizeCanvasDrawingWidth,
  type CanvasDrawing,
  type CanvasDrawingPoint,
} from "@codex/canvas-engine";
import { vault } from "$lib/stores/vault.svelte";
import { systemIdGenerator } from "$lib/utils/runtime-deps";

export function useCanvasDrawing(logic: {
  drawings: CanvasDrawing[];
  addDrawing: (drawing: CanvasDrawing) => void;
  removeDrawing: (drawingId: string) => void;
  screenToFlowPosition?: (pos: { x: number; y: number }) => {
    x: number;
    y: number;
  };
}) {
  let isDrawingMode = $state(false);
  let isErasingMode = $state(false);
  let drawingColor = $state(DEFAULT_CANVAS_DRAWING_COLOR);
  let drawingWidth = $state(DEFAULT_CANVAS_DRAWING_WIDTH);
  let activeDrawing = $state<CanvasDrawing | null>(null);
  let activeDrawingPointerId = $state<number | null>(null);

  function drawingPointFromPointer(event: PointerEvent): CanvasDrawingPoint {
    const point = logic.screenToFlowPosition?.({
      x: event.clientX,
      y: event.clientY,
    }) ?? { x: event.clientX, y: event.clientY };
    return { x: point.x, y: point.y };
  }

  function drawingPath(drawing: CanvasDrawing) {
    const [first, ...rest] = drawing.points;
    if (!first) return "";
    const points = rest.length > 0 ? rest : [{ x: first.x + 0.01, y: first.y }];
    return `M ${first.x} ${first.y} ${points.map((point) => `L ${point.x} ${point.y}`).join(" ")}`;
  }

  function cancelActiveDrawing() {
    activeDrawing = null;
    activeDrawingPointerId = null;
  }

  function toggleDrawingMode() {
    isDrawingMode = !isDrawingMode;
    if (isDrawingMode) isErasingMode = false;
    if (!isDrawingMode) cancelActiveDrawing();
  }

  function toggleErasingMode() {
    isErasingMode = !isErasingMode;
    if (isErasingMode) {
      isDrawingMode = false;
      cancelActiveDrawing();
    }
  }

  function eraseDrawing(event: PointerEvent, drawingId: string) {
    if (!isErasingMode || vault.isGuest) return;
    event.preventDefault();
    event.stopPropagation();
    logic.removeDrawing(drawingId);
  }

  function handleEraseLayerPointerDown(event: PointerEvent) {
    const drawingId =
      event.target instanceof Element
        ? event.target.closest<SVGPathElement>("[data-drawing-id]")?.dataset
            .drawingId
        : undefined;
    if (drawingId) eraseDrawing(event, drawingId);
  }

  function handleDrawingColorChange(color: string) {
    drawingColor = normalizeCanvasDrawingColor(color);
  }

  function handleDrawingWidthChange(width: number) {
    drawingWidth = normalizeCanvasDrawingWidth(width);
  }

  function handleDrawingPointerDown(event: PointerEvent) {
    if (
      !isDrawingMode ||
      vault.isGuest ||
      event.button !== 0 ||
      activeDrawingPointerId !== null
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    activeDrawingPointerId = event.pointerId;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    activeDrawing = {
      id: `drawing-${systemIdGenerator.uuid()}`,
      color: drawingColor,
      width: drawingWidth,
      points: [drawingPointFromPointer(event)],
    };
  }

  function handleDrawingPointerMove(event: PointerEvent) {
    if (
      !activeDrawing ||
      activeDrawingPointerId === null ||
      event.pointerId !== activeDrawingPointerId
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    activeDrawing = appendCanvasDrawingPoint(
      activeDrawing,
      drawingPointFromPointer(event),
    );
  }

  function finishDrawing(event: PointerEvent, cancelled = false) {
    if (
      !activeDrawing ||
      activeDrawingPointerId === null ||
      event.pointerId !== activeDrawingPointerId
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget as HTMLElement;
    if (target.hasPointerCapture(event.pointerId)) {
      target.releasePointerCapture(event.pointerId);
    }
    const completedDrawing = activeDrawing;
    cancelActiveDrawing();
    if (!cancelled) logic.addDrawing(completedDrawing);
  }

  function isEditableTarget(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) return false;
    return (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable
    );
  }

  function undoLastDrawing() {
    const last = logic.drawings[logic.drawings.length - 1];
    if (!last) return false;
    logic.removeDrawing(last.id);
    return true;
  }

  function handleDrawingKeydown(event: KeyboardEvent) {
    if (event.key === "Escape" && activeDrawing) {
      event.preventDefault();
      cancelActiveDrawing();
      return;
    }
    if (
      (event.key === "z" || event.key === "Z") &&
      (event.ctrlKey || event.metaKey) &&
      !event.shiftKey &&
      !vault.isGuest &&
      !isEditableTarget(event.target)
    ) {
      if (undoLastDrawing()) {
        event.preventDefault();
      }
    }
  }

  return {
    get isDrawingMode() {
      return isDrawingMode;
    },
    set isDrawingMode(val) {
      isDrawingMode = val;
    },
    get isErasingMode() {
      return isErasingMode;
    },
    set isErasingMode(val) {
      isErasingMode = val;
    },
    get drawingColor() {
      return drawingColor;
    },
    set drawingColor(val) {
      drawingColor = val;
    },
    get drawingWidth() {
      return drawingWidth;
    },
    set drawingWidth(val) {
      drawingWidth = val;
    },
    get activeDrawing() {
      return activeDrawing;
    },
    get activeDrawingPointerId() {
      return activeDrawingPointerId;
    },

    drawingPath,
    cancelActiveDrawing,
    toggleDrawingMode,
    toggleErasingMode,
    eraseDrawing,
    handleEraseLayerPointerDown,
    handleDrawingColorChange,
    handleDrawingWidthChange,
    handleDrawingPointerDown,
    handleDrawingPointerMove,
    finishDrawing,
    undoLastDrawing,
    handleDrawingKeydown,
    isEditableTarget,
  };
}
