<script lang="ts">
  import ConnectionLine from "./ConnectionLine.svelte";
  import {
    SvelteFlow,
    Background,
    Controls,
    MiniMap,
    ViewportPortal,
    NodeToolbar,
    ConnectionMode,
    Position,
    type Node,
  } from "@xyflow/svelte";
  import {
    appendCanvasDrawingPoint,
    DEFAULT_CANVAS_DRAWING_COLOR,
    DEFAULT_CANVAS_DRAWING_WIDTH,
    DEFAULT_CANVAS_TEXT_BACKGROUND,
    DEFAULT_CANVAS_TEXT_FONT_SIZE,
    normalizeCanvasDrawingColor,
    normalizeCanvasDrawingWidth,
    normalizeCanvasTextBackground,
    normalizeCanvasTextFontSize,
    type CanvasDrawing,
    type CanvasDrawingPoint,
    CanvasStore,
    type Canvas,
  } from "@codex/canvas-engine";
  import type { FileImportFailureReason } from "@codex/vault-engine";
  import { vault } from "$lib/stores/vault.svelte";
  import { canvasRegistry } from "$lib/stores/canvas-registry.svelte";
  import EntityNode from "$lib/components/canvas/EntityNode.svelte";
  import FileNode from "$lib/components/canvas/FileNode.svelte";
  import TextNode from "$lib/components/canvas/TextNode.svelte";
  import DelveRoomNode from "$lib/components/canvas/DelveRoomNode.svelte";
  import DelveSectorNode from "$lib/components/canvas/DelveSectorNode.svelte";
  import AdventureNode from "$lib/components/canvas/AdventureNode.svelte";
  import CanvasContextMenu from "$lib/components/canvas/CanvasContextMenu.svelte";
  import CustomEdge from "$lib/components/canvas/CustomEdge.svelte";
  import DelveEdge from "$lib/components/canvas/DelveEdge.svelte";
  import EdgeAttributeModal from "$lib/components/canvas/EdgeAttributeModal.svelte";
  import EdgeLabelModal from "$lib/components/canvas/EdgeLabelModal.svelte";
  import RoomStockingDrawer from "$lib/components/canvas/RoomStockingDrawer.svelte";
  import AdventureNodeDrawer from "$lib/components/canvas/AdventureNodeDrawer.svelte";
  import CanvasHint from "$lib/components/hints/CanvasHint.svelte";
  import CanvasHUD from "./CanvasHUD.svelte";
  import { page } from "$app/state";
  import { tick, untrack } from "svelte";
  import { SvelteMap } from "svelte/reactivity";

  import { createCanvasLogic } from "./use-canvas-logic.svelte";
  import { useCanvasEvents } from "./use-canvas-events.svelte";
  import { connectionModeStore } from "$lib/stores/ui/connection-mode.svelte";
  import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
  import type { DelveEdgeData, DelveRoomNodeData } from "generator-engine";
  import {
    delveAreaEnhancementService,
    isPlaceholderDelveAreaName,
  } from "$lib/services/delve-area-enhancement";
  import { delveDossierService } from "$lib/services/delve-dossier-service";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { themeStore } from "$lib/stores/theme.svelte";
  import { getDelveTerm } from "$lib/utils/delve-terminology";
  import {
    autoArrangeCanvasNodes,
    accumulateRotationDegrees,
    canvasNodeRotation,
    canvasNodeStyle,
    canvasNodeZIndex,
    createFlowFileNode,
    createFlowTextNode,
    fitDelveSectorFrames,
    flowEdgeToCanvasEdge,
    flowNodesToCanvasNodes,
    pointerAngleDegrees,
  } from "./canvas-workspace-helpers";
  import { exportCanvasImage } from "./canvas-image-export";
  import { systemIdGenerator } from "$lib/utils/runtime-deps";
  import type {
    DelveCanvasEdge,
    DelveCanvasNode,
    AdventureNode as AdventureNodeGraph,
  } from "generator-engine";

  let { engine }: { engine: CanvasStore } = $props();

  const canvasSlug = $derived(page.params.slug);
  const canvas = $derived(
    canvasRegistry.allCanvases.find(
      (c) => c.slug === canvasSlug || c.id === canvasSlug,
    ) as Canvas | undefined,
  );
  const canvasId = $derived(canvas?.id || canvasSlug);
  let isImportingExternalFiles = $state(false);
  const sourceEntityId = $derived.by(() => {
    const id = canvas?.metadata?.sourceEntityId;
    return typeof id === "string" && id ? id : undefined;
  });
  const sourceEntityTitle = $derived(
    sourceEntityId ? vault.entities[sourceEntityId]?.title : undefined,
  );
  const sourceEntity = $derived(
    sourceEntityId ? vault.entities[sourceEntityId] : undefined,
  );
  const dossierEntityId = $derived.by(() => {
    const id = canvas?.metadata?.dossierEntityId;
    return typeof id === "string" && id ? id : undefined;
  });

  const logic = createCanvasLogic(() => engine);
  let selectedRoomId = $state<string | null>(null);
  let isRestockingRoom = $state(false);
  let roomEnhancementError = $state<string | null>(null);
  let isAutoPopulating = $state(false);
  let autoPopulationCompleted = $state(0);
  let autoPopulationTotal = $state(0);
  let autoPopulationMessage = $state<string | null>(null);
  let isFinalizingDossier = $state(false);
  let isExportingCanvas = $state(false);
  let canvasExportElement = $state<HTMLDivElement>();
  let isDrawingMode = $state(false);
  let isErasingMode = $state(false);
  let drawingColor = $state(DEFAULT_CANVAS_DRAWING_COLOR);
  let drawingWidth = $state(DEFAULT_CANVAS_DRAWING_WIDTH);
  let activeDrawing = $state<CanvasDrawing | null>(null);
  let activeDrawingPointerId = $state<number | null>(null);
  let showMinimap = $state(true);
  let selectedRotationNodeId = $state<string | null>(null);
  let isRotatingNode = $state(false);
  const touchRotationPointers = new SvelteMap<
    number,
    { nodeId: string; x: number; y: number }
  >();
  let touchRotationGesture: {
    nodeId: string;
    pointerIds: [number, number];
    previousAngle: number;
    rotation: number;
  } | null = null;
  let desktopRotationGesture: {
    nodeId: string;
    pointerId: number;
    center: CanvasDrawingPoint;
    previousAngle: number;
    rotation: number;
  } | null = null;
  const isCanvasToolActive = $derived(
    isDrawingMode || isErasingMode || isRotatingNode,
  );
  let autoPopulationCanvasId: string | null = null;
  const selectedRoomData = $derived.by(() => {
    if (!selectedRoomId) return null;
    const node = logic.nodes.find(
      (candidate) =>
        candidate.id === selectedRoomId && candidate.type === "delveRoom",
    );
    return (node?.data as unknown as DelveRoomNodeData | undefined) ?? null;
  });

  let selectedAdventureNodeId = $state<string | null>(null);
  const selectedAdventureNode = $derived.by(() => {
    if (!selectedAdventureNodeId) return null;
    const found = logic.nodes.find(
      (candidate) => candidate.id === selectedAdventureNodeId,
    );
    if (!found) return null;
    return {
      id: found.id,
      type: found.type as any,
      position: found.position,
      data: (found.data as any) || {},
    } as AdventureNodeGraph;
  });

  const activeAdventureNode = $derived(
    (logic.draftAdventureNode as unknown as AdventureNodeGraph | null) ||
      selectedAdventureNode,
  );

  let edgeModal = $state<{
    isOpen: boolean;
    edgeId: string;
    edgeData: any;
  }>({
    isOpen: false,
    edgeId: "",
    edgeData: null,
  });

  useCanvasEvents({
    onQuickSpawn: (id, pos, screenPos) =>
      logic.handleQuickSpawn(id, pos, screenPos),
    onEditLabel: (edgeId, currentLabel) => {
      logic.labelModal = { isOpen: true, edgeId, currentLabel };
    },
    onFlushSave: () => logic.flushSave(),
  });

  $effect(() => {
    function handleEditDelveEdge(e: Event) {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        edgeModal = {
          isOpen: true,
          edgeId: customEvent.detail.edgeId,
          edgeData: customEvent.detail.edgeData,
        };
      }
    }

    window.addEventListener("edit-delve-edge", handleEditDelveEdge);
    return () => {
      window.removeEventListener("edit-delve-edge", handleEditDelveEdge);
    };
  });

  function updateNodeData(nodeId: string, updates: Record<string, unknown>) {
    const { width, height, ...dataUpdates } = updates;
    logic.nodes = logic.nodes.map((node) =>
      node.id === nodeId
        ? {
            ...node,
            ...(width !== undefined ? { width: width as number } : null),
            ...(height !== undefined ? { height: height as number } : null),
            data: { ...node.data, ...dataUpdates },
          }
        : node,
    );
  }

  function toggleNodeLock(nodeId: string) {
    logic.nodes = logic.nodes.map((node) =>
      node.id === nodeId
        ? {
            ...node,
            data: { ...node.data, locked: !(node.data as any)?.locked },
          }
        : node,
    );
  }

  function stackableNodeZIndexBounds() {
    let min = 0;
    let max = 0;
    for (const node of logic.nodes) {
      if (node.type === "delveSectorGroup") continue;
      const z = canvasNodeZIndex(node);
      if (z > max) max = z;
      if (z < min) min = z;
    }
    return { min, max };
  }

  function bringNodeToFront(nodeId: string) {
    const { max } = stackableNodeZIndexBounds();
    logic.nodes = logic.nodes.map((node) =>
      node.id === nodeId
        ? { ...node, data: { ...node.data, zIndex: max + 1 } }
        : node,
    );
  }

  function sendNodeToBack(nodeId: string) {
    const { min } = stackableNodeZIndexBounds();
    logic.nodes = logic.nodes.map((node) =>
      node.id === nodeId
        ? { ...node, data: { ...node.data, zIndex: min - 1 } }
        : node,
    );
  }

  const contextMenuNodeLocked = $derived.by(() => {
    if (logic.contextMenu?.type !== "node") return false;
    const node = logic.nodes.find((n) => n.id === logic.contextMenu?.id);
    return Boolean((node?.data as any)?.locked);
  });

  const contextMenuNodeStackable = $derived.by(() => {
    if (logic.contextMenu?.type !== "node") return false;
    const node = logic.nodes.find((n) => n.id === logic.contextMenu?.id);
    return Boolean(node) && node?.type !== "delveSectorGroup";
  });

  const contextMenuTextNode = $derived.by(() => {
    if (logic.contextMenu?.type !== "node") return undefined;
    const node = logic.nodes.find((n) => n.id === logic.contextMenu?.id);
    return node?.type === "text" ? node : undefined;
  });

  const filteredNodes = $derived.by(() => {
    const base = (() => {
      if (isExportingCanvas) return logic.nodes;
      if (logic.activeCategories.size === 0) return logic.nodes;
      return logic.nodes.filter((n) =>
        logic.activeCategories.has(n.data?.type as string),
      );
    })();
    return base.map((node) => {
      const locked = Boolean((node.data as any)?.locked);
      const withLock = {
        ...node,
        draggable: !locked,
        style: canvasNodeStyle(node),
        zIndex: node.type === "delveSectorGroup" ? 0 : canvasNodeZIndex(node),
      };
      if (node.type === "file") {
        return {
          ...withLock,
          data: {
            ...node.data,
            onUpdateFile: (updates: Record<string, unknown>) =>
              updateNodeData(node.id, updates),
          },
        };
      }
      if (node.type === "text") {
        return {
          ...withLock,
          data: {
            ...node.data,
            onUpdateText: (updates: Record<string, unknown>) =>
              updateNodeData(node.id, updates),
          },
        };
      }
      return withLock;
    });
  });

  const nodeTypes = {
    entity: EntityNode,
    file: FileNode,
    text: TextNode,
    delveRoom: DelveRoomNode,
    delveSectorGroup: DelveSectorNode,
    adventureNode: AdventureNode,
    situation: AdventureNode,
    location: AdventureNode,
    npc: AdventureNode,
    clue: AdventureNode,
    threat: AdventureNode,
    outcome: AdventureNode,
  };

  const edgeTypes = {
    straight: CustomEdge,
    smoothstep: CustomEdge,
    delveEdge: DelveEdge,
    leads_to: CustomEdge,
    holds_clue: CustomEdge,
    threatens: CustomEdge,
    resolves_to: CustomEdge,
  };

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

  function nodeIdFromPointerTarget(target: EventTarget | null) {
    if (!(target instanceof Element)) return null;
    return (
      target.closest<HTMLElement>(".svelte-flow__node")?.dataset.id ?? null
    );
  }

  function canRotateNode(nodeId: string) {
    const node = logic.nodes.find((candidate) => candidate.id === nodeId);
    return Boolean(
      node &&
      node.type !== "delveSectorGroup" &&
      !(node.data as Record<string, unknown> | undefined)?.locked,
    );
  }

  function beginTouchRotation(event: PointerEvent) {
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

  let arrangedCanvasId = $state<string | null>(null);

  // Initialization & Lifecycle
  $effect(() => {
    if (canvasId) {
      logic.initializeCanvas(canvasId);
    }
  });

  $effect(() => {
    if (canvasId && logic.hasInitialized && arrangedCanvasId !== canvasId) {
      arrangedCanvasId = canvasId;
      untrack(() => {
        const isManual = canvas?.metadata?.layoutState === "manual";
        if (!isManual) {
          handleAutoArrange();
        }
      });
    }
  });

  $effect(() => {
    const currentCanvas: Canvas | undefined = canvas;
    const needsAreaNames = currentCanvas?.nodes.some(
      (node) =>
        node.type === "delveRoom" &&
        isPlaceholderDelveAreaName(node.data as unknown as DelveRoomNodeData),
    );
    const needsPassageEnhancement = currentCanvas?.edges.some(
      (edge) =>
        edge.type === "delveEdge" &&
        !(edge.data as unknown as DelveEdgeData | undefined)?.aiEnhancedAt,
    );
    if (
      !currentCanvas?.id ||
      !logic.hasInitialized ||
      sessionModeStore.isGuestMode ||
      currentCanvas.metadata?.autoPopulateAreas !== true ||
      (currentCanvas.metadata?.areaPopulationStatus === "complete" &&
        !needsAreaNames &&
        !needsPassageEnhancement) ||
      autoPopulationCanvasId === currentCanvas.id
    ) {
      return;
    }

    autoPopulationCanvasId = currentCanvas.id;
    untrack(() => void populateCanvasAreas(currentCanvas));
  });

  // Pruning
  $effect(() => {
    logic.pruneNodes();
  });

  // Sync state to engine
  $effect(() => {
    logic.syncEngine();
  });

  // Monitor batch spawn
  $effect(() => {
    if (canvasRegistry.pendingEntities.length > 0) {
      logic.handleBatchSpawn();
    }
  });

  function onNodeContextMenu({
    event,
    node,
  }: {
    event: MouseEvent;
    node: any;
  }) {
    event.preventDefault();
    logic.contextMenu = {
      x: event.clientX,
      y: event.clientY,
      type: "node",
      id: node.id,
    };
  }

  function onNodeClick({ node }: { node: any }) {
    if (!vault.isGuest && canRotateNode(node.id)) {
      selectedRotationNodeId = node.id;
    }
    if (node.type === "delveRoom") {
      roomEnhancementError = null;
      selectedRoomId = node.id;
      return;
    }
    if (
      ["situation", "location", "npc", "clue", "threat", "outcome"].includes(
        node.type,
      )
    ) {
      selectedAdventureNodeId = node.id;
      return;
    }
  }

  function onPaneClick() {
    selectedRotationNodeId = null;
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
        ? {
            ...candidate,
            position: movedById.get(candidate.id)!.position,
          }
        : candidate,
    );
    if (movedNodes.some((movedNode) => movedNode.type === "delveRoom")) {
      logic.nodes = fitDelveSectorFrames(logic.nodes);
    }
    if (canvas) {
      canvas.metadata = {
        ...(canvas.metadata || {}),
        layoutState: "manual",
      };
    }
    logic.flushSave();
  }

  async function finalizeDossier() {
    if (!canvas || !sourceEntity || isFinalizingDossier) return;
    isFinalizingDossier = true;
    isExportingCanvas = true;
    try {
      await vault.loadEntityContent(sourceEntity.id);
      const loadedSourceEntity =
        vault.entities[sourceEntity.id] ?? sourceEntity;
      if (!canvasExportElement) {
        throw new Error("The canvas is not ready to export.");
      }
      await tick();
      const canvasImage = await exportCanvasImage(
        canvasExportElement,
        logic.fitGraphForExport,
      );
      const result = await delveDossierService.finalize({
        canvas,
        sourceEntity: loadedSourceEntity,
        dossierTerm: getDelveTerm(themeStore.activeTheme.id),
        nodes: flowNodesToCanvasNodes(
          logic.nodes,
        ) as unknown as DelveCanvasNode[],
        edges: logic.edges.map((edge) =>
          flowEdgeToCanvasEdge(edge),
        ) as unknown as DelveCanvasEdge[],
        canvasImage,
      });
      notificationStore.notify(
        result.created
          ? "Created the GM dossier."
          : "Updated the GM dossier from the current canvas.",
        "success",
      );
      modalUIStore.openZenMode(result.entityId);
    } catch (error) {
      notificationStore.notify(
        error instanceof Error
          ? error.message
          : "The GM dossier could not be finalized.",
        "error",
      );
    } finally {
      isExportingCanvas = false;
      isFinalizingDossier = false;
    }
  }

  function saveRoomData(updated: DelveRoomNodeData) {
    if (!selectedRoomId) return;
    logic.nodes = logic.nodes.map((node) =>
      node.id === selectedRoomId
        ? { ...node, data: { ...node.data, ...updated } }
        : node,
    );
  }

  function getNearbyAreas(room: DelveRoomNodeData): DelveRoomNodeData[] {
    const connectedIds = new Set<string>();
    for (const edge of logic.edges) {
      if (edge.source === room.id) connectedIds.add(edge.target);
      if (edge.target === room.id) connectedIds.add(edge.source);
    }

    return logic.nodes
      .filter(
        (node) =>
          node.type === "delveRoom" &&
          node.id !== room.id &&
          (connectedIds.has(node.id) ||
            (node.data as unknown as DelveRoomNodeData).sectorId ===
              room.sectorId),
      )
      .slice(0, 8)
      .map((node) => node.data as unknown as DelveRoomNodeData);
  }

  async function enhanceRoom(room: DelveRoomNodeData) {
    if (!canvas) return;
    isRestockingRoom = true;
    roomEnhancementError = null;
    try {
      const updated = await delveAreaEnhancementService.enhanceArea({
        canvas,
        room,
        nearbyAreas: getNearbyAreas(room),
      });
      saveRoomData(updated);
    } catch (error) {
      roomEnhancementError =
        error instanceof Error
          ? error.message
          : "AI enhancement failed. The Area was not changed.";
    } finally {
      isRestockingRoom = false;
    }
  }

  async function populateCanvasAreas(targetCanvas: Canvas) {
    isAutoPopulating = true;
    autoPopulationMessage = null;
    autoPopulationCompleted = 0;
    autoPopulationTotal = targetCanvas.nodes.filter(
      (node) =>
        node.type === "delveRoom" &&
        (!(node.data as unknown as DelveRoomNodeData).aiEnhancedAt ||
          isPlaceholderDelveAreaName(
            node.data as unknown as DelveRoomNodeData,
          )),
    ).length;

    try {
      const result = await delveAreaEnhancementService.populateAllAreas(
        targetCanvas,
        ({ completed, total, updatedAreas }) => {
          autoPopulationCompleted = completed;
          autoPopulationTotal = total;
          if (updatedAreas.length === 0) return;
          const updates = new Map(
            updatedAreas.map((area) => [area.id, area] as const),
          );
          logic.nodes = logic.nodes.map((node) => {
            const update = updates.get(node.id);
            return update
              ? { ...node, data: { ...node.data, ...update } }
              : node;
          });
        },
      );

      const populationStatus =
        result.failed > 0 || result.failedPassages > 0 ? "partial" : "complete";
      const enhancedEdges = new Map(
        result.edges.map((edge) => [edge.id, edge] as const),
      );
      logic.edges = logic.edges.map((edge) => {
        const update = enhancedEdges.get(edge.id);
        return update
          ? { ...edge, data: { ...(edge.data ?? {}), ...(update.data ?? {}) } }
          : edge;
      });
      const metadata = {
        ...(targetCanvas.metadata ?? {}),
        areaPopulationStatus: populationStatus,
        areaPopulationCompleted: result.completed,
        areaPopulationTotal: result.total,
        areaPopulationUpdatedAt: Date.now(),
      };
      const updatedCanvas = {
        ...targetCanvas,
        nodes: flowNodesToCanvasNodes(logic.nodes),
        edges: logic.edges.map((edge) => flowEdgeToCanvasEdge(edge)),
        metadata,
      };
      vault.canvases[targetCanvas.id!] = updatedCanvas;
      canvasRegistry.canvases[targetCanvas.id!] = updatedCanvas;
      await vault.saveCanvas(targetCanvas.id!);

      if (result.failed > 0 || result.failedPassages > 0) {
        const failures = [
          result.failed > 0
            ? `${result.failed} Area${result.failed === 1 ? "" : "s"}`
            : "",
          result.failedPassages > 0
            ? `${result.failedPassages} passage${
                result.failedPassages === 1 ? "" : "s"
              }`
            : "",
        ]
          .filter(Boolean)
          .join(" and ");
        autoPopulationMessage = `${failures} could not be enhanced. They will retry next time this canvas opens.`;
      }
    } catch (err) {
      console.error(
        "[DelveAutoPopulation] Error during canvas auto-population:",
        err,
      );
      const detail =
        err instanceof Error && err.message ? ` (${err.message})` : "";
      autoPopulationMessage = `Automatic AI population paused${detail}. Existing Area details were preserved and it will retry next time.`;
    } finally {
      isAutoPopulating = false;
    }
  }

  function onEdgeContextMenu({
    event,
    edge,
  }: {
    event: MouseEvent;
    edge: any;
  }) {
    event.preventDefault();
    logic.contextMenu = {
      x: event.clientX,
      y: event.clientY,
      type: "edge",
      id: edge.id,
    };
  }

  function handlePaneContextMenu({ event }: { event: MouseEvent }) {
    if (vault.isGuest) return;
    event.preventDefault();
    logic.contextMenu = {
      x: event.clientX,
      y: event.clientY,
      type: "pane",
      id: "pane",
    };
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

  function onDragOver(event: DragEvent) {
    const hasFiles = (event.dataTransfer?.files.length ?? 0) > 0;
    if (vault.isGuest) {
      if (hasFiles) {
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = "none";
      }
      return;
    }
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = hasFiles ? "copy" : "move";
    }
  }

  async function onDrop(event: DragEvent) {
    const files = Array.from(event.dataTransfer?.files || []);
    if (vault.isGuest) {
      if (files.length > 0) {
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = "none";
      }
      return;
    }
    event.preventDefault();
    if (files.length > 0) {
      await handleExternalFiles(files, {
        x: event.clientX,
        y: event.clientY,
      });
      return;
    }
    const entityId = event.dataTransfer?.getData("application/codex-entity");
    if (!entityId) return;

    const position = logic.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });
    logic.handleQuickSpawn(entityId, position);
  }

  function formatFileFailure(file: File, reason: FileImportFailureReason) {
    const descriptions: Record<FileImportFailureReason, string> = {
      empty: "is empty",
      too_large: "is larger than 10 MB",
      vault_unavailable: "could not be saved because the vault is unavailable",
      write_failed: "could not be saved to the vault",
    };
    return `${file.name || "A file"} ${descriptions[reason] || "could not be added"}.`;
  }

  async function handleExternalFiles(
    files: File[],
    screenPosition?: { x: number; y: number },
  ) {
    if (vault.isGuest || files.length === 0 || isImportingExternalFiles) return;
    isImportingExternalFiles = true;
    try {
      const start = screenPosition
        ? logic.screenToFlowPosition(screenPosition)
        : {
            x: 80 + logic.nodes.length * 24,
            y: 80 + logic.nodes.length * 24,
          };
      const failures: string[] = [];
      let added = 0;

      for (const file of files) {
        const result = await vault.importFileToVault(file);
        if (!result.ok) {
          failures.push(formatFileFailure(file, result.reason));
          continue;
        }
        const position = { x: start.x + added * 28, y: start.y + added * 28 };
        const nodeId = engine.addFileNode(result.file, position);
        logic.nodes = [
          ...logic.nodes,
          createFlowFileNode(result.file, position, nodeId),
        ];
        added++;
      }

      if (added > 0 && failures.length > 0) {
        logic.saveNow();
        notificationStore.notify(
          `${added} file${added === 1 ? "" : "s"} added. ${failures.join(" ")}`,
          "info",
        );
      } else if (added > 0) {
        logic.saveNow();
        notificationStore.notify(
          `${added} file${added === 1 ? "" : "s"} added to the vault and canvas.`,
          "success",
        );
      } else if (failures.length) {
        notificationStore.notify(failures.join(" "), "error");
      }
    } catch {
      notificationStore.notify(
        "Files could not be added. Please try again.",
        "error",
      );
    } finally {
      isImportingExternalFiles = false;
    }
  }

  function imageFileFromBlob(blob: Blob, mimeType: string) {
    const extension = mimeType.split("/")[1]?.split("+")[0] || "png";
    return new File([blob], `pasted-image-${Date.now()}.${extension}`, {
      type: mimeType,
    });
  }

  function extractImageFilesFromClipboardData(
    clipboardData: DataTransfer | null,
  ) {
    if (!clipboardData) return [];
    return Array.from(clipboardData.files).filter((file) =>
      file.type.startsWith("image/"),
    );
  }

  async function extractImageFilesFromClipboardItems(items: ClipboardItem[]) {
    const files: File[] = [];
    for (const item of items) {
      const imageType = item.types.find((type) => type.startsWith("image/"));
      if (!imageType) continue;
      const blob = await item.getType(imageType);
      files.push(imageFileFromBlob(blob, imageType));
    }
    return files;
  }

  function centerScreenPosition() {
    return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  }

  function handleAddTextNode(screenPosition?: { x: number; y: number }) {
    if (vault.isGuest) return;
    const position = logic.screenToFlowPosition(
      screenPosition ?? centerScreenPosition(),
    );
    const nodeId = engine.addTextNode("", position);
    const { max } = stackableNodeZIndexBounds();
    const node = createFlowTextNode("", position, nodeId);
    logic.nodes = [
      ...logic.nodes,
      { ...node, data: { ...node.data, zIndex: max + 1 } },
    ];
    logic.saveNow();
  }

  async function handleCanvasPaste(event: ClipboardEvent) {
    if (vault.isGuest || isEditableTarget(event.target)) return;
    const files = extractImageFilesFromClipboardData(event.clipboardData);
    if (files.length === 0) return;
    event.preventDefault();
    await handleExternalFiles(files, centerScreenPosition());
  }

  async function handlePasteFromClipboard(screenPosition: {
    x: number;
    y: number;
  }) {
    if (vault.isGuest) return;
    if (!navigator.clipboard?.read) {
      notificationStore.notify(
        "Pasting from the clipboard isn't supported in this browser.",
        "error",
      );
      return;
    }
    try {
      const items = await navigator.clipboard.read();
      const files = await extractImageFilesFromClipboardItems(items);
      if (files.length === 0) {
        notificationStore.notify("No image found in clipboard.", "info");
        return;
      }
      await handleExternalFiles(files, screenPosition);
    } catch {
      notificationStore.notify(
        "Couldn't read the clipboard. Your browser may need permission.",
        "error",
      );
    }
  }

  async function handleOpenOrCreateSourceEntity() {
    if (sourceEntityId && vault.entities[sourceEntityId]) {
      modalUIStore.openZenMode(sourceEntityId);
      return;
    }

    const title = canvas?.name || "Untitled Adventure";
    const existing = vault.allEntities.find(
      (e) =>
        e.title.trim().toLowerCase() === title.trim().toLowerCase() &&
        e.type === "event",
    );

    let targetId = existing?.id;
    if (!targetId) {
      const sourceLore = (canvas?.metadata as any)?.sourceLore as
        string | undefined;
      const situationNode = logic.nodes.find((n) => n.type === "situation");
      const situationData = situationNode?.data as any;
      const canvasSummary = (canvas?.metadata as any)?.summary as
        string | undefined;
      const situationSummary =
        situationData?.summary ||
        situationData?.description ||
        canvasSummary ||
        "";
      const situationHook =
        situationData?.hook || situationData?.startingHook || "";
      const situationGoal =
        situationData?.goal || situationData?.objective || "";

      if (sourceLore && sourceLore.trim()) {
        targetId = await vault.createEntity("note", title, {
          content: situationSummary ? `*${situationSummary}*` : "",
          lore: sourceLore.trim(),
          kind: "adventure",
          labels: ["adventure"],
        });
      } else {
        let markdown = `# ${title}\n\n`;
        if (situationSummary) markdown += `*${situationSummary}*\n\n`;

        if (situationHook || situationGoal) {
          markdown += `## Situation & Hook\n`;
          if (situationHook)
            markdown += `**Starting Hook:** ${situationHook}\n\n`;
          if (situationGoal) markdown += `**Objective:** ${situationGoal}\n\n`;
        }

        const locations = logic.nodes.filter((n) => n.type === "location");
        if (locations.length > 0) {
          markdown += `## Key Locations\n`;
          for (const loc of locations) {
            const d = loc.data as any;
            const name =
              (loc as any).label || d?.title || d?.name || "Location";
            const desc = d?.description || d?.summary || "";
            const role = d?.role || "";
            const relation = d?.relation || "";
            const leverage = d?.leverage || "";
            const dilemma = d?.dilemma || "";
            const hazard = d?.hazard || d?.danger || "";
            markdown += `### ${name}\n`;
            if (desc) markdown += `${desc}\n\n`;
            if (role) markdown += `- **Role:** ${role}\n`;
            if (relation) markdown += `- **Relation:** ${relation}\n`;
            if (leverage) markdown += `- **Leverage:** ${leverage}\n`;
            if (dilemma) markdown += `- **Dilemma:** ${dilemma}\n`;
            if (hazard) markdown += `- **Hazard/Danger:** ${hazard}\n`;
            markdown += `\n`;
          }
        }

        const npcs = logic.nodes.filter((n) => n.type === "npc");
        if (npcs.length > 0) {
          markdown += `## Important NPCs & Factions\n`;
          for (const npc of npcs) {
            const d = npc.data as any;
            const name = (npc as any).label || d?.title || d?.name || "NPC";
            const role = d?.role || "";
            const desc = d?.description || d?.summary || "";
            const relation = d?.relation || "";
            const wants = d?.wants || d?.motivation || "";
            const secret = d?.secret || "";
            const leverage = d?.leverage || "";
            const dilemma = d?.dilemma || "";
            markdown += `### ${name}${role ? ` (${role})` : ""}\n`;
            if (desc) markdown += `${desc}\n\n`;
            if (relation) markdown += `- **Relation:** ${relation}\n`;
            if (wants) markdown += `- **Wants:** ${wants}\n`;
            if (secret) markdown += `- **Secret:** ${secret}\n`;
            if (leverage) markdown += `- **Leverage:** ${leverage}\n`;
            if (dilemma) markdown += `- **Dilemma:** ${dilemma}\n`;
            markdown += `\n`;
          }
        }

        const clues = logic.nodes.filter((n) => n.type === "clue");
        const threats = logic.nodes.filter((n) => n.type === "threat");
        if (clues.length > 0 || threats.length > 0) {
          markdown += `## Clues & Threats\n`;
          for (const clue of clues) {
            const d = clue.data as any;
            const name = (clue as any).label || d?.title || d?.name || "Clue";
            const desc = d?.description || d?.summary || "";
            const leadsTo = d?.leadsTo || "";
            markdown += `- **${name}:** ${desc}${leadsTo ? ` *(Leads to: ${leadsTo})*` : ""}\n`;
          }
          if (clues.length > 0 && threats.length > 0) markdown += `\n`;
          for (const threat of threats) {
            const d = threat.data as any;
            const name =
              (threat as any).label || d?.title || d?.name || "Threat";
            const desc = d?.description || d?.summary || "";
            const trigger = d?.trigger || "";
            markdown += `- **${name}:** ${desc}${trigger ? ` *(Trigger: ${trigger})*` : ""}\n`;
          }
          markdown += `\n`;
        }

        const outcomes = logic.nodes.filter((n) => n.type === "outcome");
        if (outcomes.length > 0) {
          markdown += `## Possible Outcomes\n`;
          for (const outcome of outcomes) {
            const d = outcome.data as any;
            const name =
              (outcome as any).label || d?.title || d?.name || "Outcome";
            const desc = d?.description || d?.summary || "";
            markdown += `### ${name}\n${desc}\n\n`;
          }
        }

        targetId = await vault.createEntity("note", title, {
          content: situationSummary ? `*${situationSummary}*` : "",
          lore: markdown.trim(),
          kind: "adventure",
          labels: ["adventure"],
        });
      }
    }

    if (canvas?.id) {
      canvas.metadata = {
        ...(canvas.metadata || {}),
        sourceEntityId: targetId,
      };
      await canvasRegistry.saveCanvas(canvas.id);
    }

    modalUIStore.openZenMode(targetId);
  }

  function handleAutoArrange() {
    const positionedNodes = autoArrangeCanvasNodes({
      canvasId: canvas?.id || "temp",
      title: canvas?.name || "Canvas",
      nodes: logic.nodes,
      edges: logic.edges,
    });
    if (!positionedNodes) return;

    logic.nodes = positionedNodes;
    if (canvas) {
      canvas.metadata = {
        ...(canvas.metadata || {}),
        layoutState: "auto",
      };
    }
    logic.saveNow();
  }

  $effect(() => {
    return () => {
      logic.flushSave();
    };
  });
</script>

<svelte:window
  onkeydown={handleDrawingKeydown}
  onpaste={handleCanvasPaste}
  onpointermove={handleRotationPointerMove}
  onpointerup={finishNodeRotation}
  onpointercancel={finishNodeRotation}
/>

<div
  class="canvas-container {logic.isConnecting
    ? 'is-connecting'
    : ''} relative w-full h-full overflow-hidden select-none flex flex-col"
>
  <div
    class="flex-1 relative"
    ondragover={onDragOver}
    ondrop={onDrop}
    onpointerdowncapture={beginTouchRotation}
    role="region"
    aria-label="Canvas Workspace"
  >
    <CanvasHUD
      canvasName={canvas?.name || ""}
      {sourceEntityId}
      {sourceEntityTitle}
      sourceEntityType={sourceEntity?.type ||
        (canvas?.metadata?.kind === "adventure" ? "event" : "location")}
      sourceEntityKind={sourceEntity?.kind ||
        (canvas?.metadata?.kind as string)}
      {dossierEntityId}
      {isFinalizingDossier}
      onFinalizeDossier={!vault.isGuest &&
      sourceEntity &&
      logic.nodes.some((node) => node.type === "delveRoom")
        ? finalizeDossier
        : undefined}
      onOpenOrCreateSourceEntity={handleOpenOrCreateSourceEntity}
      onAutoArrange={handleAutoArrange}
      {showMinimap}
      onToggleMinimap={() => (showMinimap = !showMinimap)}
      onUploadFiles={!vault.isGuest ? handleExternalFiles : undefined}
      onAddTextNode={!vault.isGuest ? () => handleAddTextNode() : undefined}
      {isDrawingMode}
      {isErasingMode}
      {drawingColor}
      {drawingWidth}
      onToggleDrawing={!vault.isGuest ? toggleDrawingMode : undefined}
      onToggleErasing={!vault.isGuest ? toggleErasingMode : undefined}
      onDrawingColorChange={!vault.isGuest
        ? handleDrawingColorChange
        : undefined}
      onDrawingWidthChange={!vault.isGuest
        ? handleDrawingWidthChange
        : undefined}
      onAddAdventureNode={canvas?.metadata?.kind === "adventure" ||
      sourceEntity?.kind === "adventure" ||
      logic.nodes.some((n) => n.type === "adventureNode")
        ? (type) => logic.handleAddAdventureNode(type)
        : undefined}
      activeCategories={logic.activeCategories}
      onToggleCategory={logic.toggleCategoryFilter}
      onClearCategories={logic.clearCategoryFilters}
    />

    <div class="absolute inset-0" bind:this={canvasExportElement}>
      <SvelteFlow
        nodes={filteredNodes}
        bind:edges={logic.edges}
        {nodeTypes}
        {edgeTypes}
        onconnect={!vault.isGuest ? logic.onConnect : undefined}
        onreconnect={!vault.isGuest ? logic.onReconnect : undefined}
        onconnectstart={() => {
          if (vault.isGuest) return;
          logic.isConnecting = true;
          connectionModeStore.isConnecting = true;
        }}
        onconnectend={() => {
          logic.isConnecting = false;
          connectionModeStore.isConnecting = false;
        }}
        onnodecontextmenu={onNodeContextMenu}
        onnodeclick={onNodeClick}
        onpaneclick={onPaneClick}
        onnodedragstop={onNodeDragStop}
        onedgecontextmenu={onEdgeContextMenu}
        onedgeclick={onEdgeClick}
        onpanecontextmenu={handlePaneContextMenu}
        defaultEdgeOptions={{ type: "straight" }}
        connectionMode={ConnectionMode.Loose}
        zoomOnDoubleClick={false}
        proOptions={{ hideAttribution: true }}
        connectionLineComponent={ConnectionLine}
        panOnDrag={!isCanvasToolActive}
        nodesDraggable={!isCanvasToolActive}
        nodesConnectable={!isCanvasToolActive}
        elementsSelectable={!isCanvasToolActive}
        zoomOnScroll={!isCanvasToolActive}
        zoomOnPinch={!isCanvasToolActive}
        minZoom={0.01}
        maxZoom={9}
        fitView
      >
        <Background gap={20} />
        {#if selectedRotationNodeId && canRotateNode(selectedRotationNodeId)}
          <NodeToolbar
            nodeId={selectedRotationNodeId}
            position={Position.Top}
            offset={18}
            isVisible
          >
            <button
              type="button"
              class="nodrag nopan touch-none flex h-9 w-9 cursor-grab items-center justify-center rounded-full border border-theme-primary/50 bg-theme-surface text-theme-primary shadow-lg transition-colors hover:bg-theme-primary/15 active:cursor-grabbing"
              title="Drag to rotate card; use arrow keys for precise rotation"
              aria-label="Rotate selected card"
              onpointerdown={beginDesktopRotation}
              onkeydown={rotateSelectedNodeWithKeyboard}
            >
              <span class="icon-[lucide--rotate-cw] h-4 w-4" aria-hidden="true"
              ></span>
            </button>
          </NodeToolbar>
        {/if}
        <!--
          Freehand drawing input lives here, outside ViewportPortal, so it
          always covers the full visible pane regardless of zoom. Content
          inside ViewportPortal is scaled/translated together with the flow
          viewport for rendering, which means its own layout box (the thing
          a background pointerdown needs to land inside) shrinks well below
          the visible pane at any zoom other than 100% - fitView rarely lands
          on exactly 100%, so drawing would only "activate" near the flow's
          transform origin, i.e. wherever the canvas happened to be anchored
          on screen (in practice, near the top-left HUD).
        -->
        <div
          class="canvas-draw-input-layer"
          data-testid="canvas-draw-input-layer"
          role="img"
          aria-label="Canvas drawing surface"
          style:pointer-events={isDrawingMode ? "auto" : "none"}
          style:cursor={isDrawingMode ? "crosshair" : undefined}
          onpointerdown={handleDrawingPointerDown}
          onpointermove={handleDrawingPointerMove}
          onpointerup={(event) => finishDrawing(event)}
          onpointercancel={(event) => finishDrawing(event, true)}
        ></div>
        <ViewportPortal target="front">
          <svg
            class="canvas-drawing-layer"
            data-testid="canvas-drawing-layer"
            role="img"
            aria-label="Canvas drawing strokes"
            style:pointer-events={isErasingMode ? "auto" : "none"}
            style:cursor={isErasingMode ? "pointer" : undefined}
            onpointerdown={handleEraseLayerPointerDown}
          >
            {#each logic.drawings as drawing (drawing.id)}
              {#if isErasingMode}
                <path
                  data-testid={`eraser-target-${drawing.id}`}
                  data-drawing-id={drawing.id}
                  d={drawingPath(drawing)}
                  fill="none"
                  stroke="transparent"
                  stroke-width={Math.max(drawing.width + 12, 16)}
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  vector-effect="non-scaling-stroke"
                  pointer-events="stroke"
                />
              {/if}
              <path
                d={drawingPath(drawing)}
                fill="none"
                stroke={drawing.color}
                stroke-width={drawing.width}
                stroke-linecap="round"
                stroke-linejoin="round"
                vector-effect="non-scaling-stroke"
                pointer-events="none"
              />
            {/each}
            {#if activeDrawing}
              <path
                d={drawingPath(activeDrawing)}
                fill="none"
                stroke={activeDrawing.color}
                stroke-width={activeDrawing.width}
                stroke-linecap="round"
                stroke-linejoin="round"
                vector-effect="non-scaling-stroke"
                pointer-events="none"
              />
            {/if}
          </svg>
        </ViewportPortal>
        {#if !sessionModeStore.isGuestMode}
          <Controls />
        {/if}
        {#if showMinimap}
          <MiniMap
            position="top-right"
            nodeColor="var(--color-theme-primary)"
          />
        {/if}
      </SvelteFlow>
    </div>

    {#if isAutoPopulating}
      <div
        class="absolute bottom-5 left-1/2 z-30 -translate-x-1/2 inline-flex items-center gap-2 rounded-full border border-theme-primary/40 bg-theme-bg/95 px-4 py-2 text-xs font-mono text-theme-text shadow-xl"
        role="status"
        aria-live="polite"
      >
        <span
          class="icon-[lucide--sparkles] h-4 w-4 animate-pulse text-theme-primary"
          aria-hidden="true"
        ></span>
        Populating Areas with Location-aware AI…
        <span class="text-theme-primary">
          {autoPopulationCompleted}/{autoPopulationTotal}
        </span>
      </div>
    {:else if autoPopulationMessage}
      <div
        class="absolute bottom-5 left-1/2 z-30 max-w-md -translate-x-1/2 rounded-lg border border-amber-500/40 bg-theme-bg/95 px-4 py-2 text-xs text-amber-300 shadow-xl"
        role="status"
      >
        {autoPopulationMessage}
      </div>
    {/if}
  </div>

  {#if logic.contextMenu}
    <CanvasContextMenu
      x={logic.contextMenu.x}
      y={logic.contextMenu.y}
      targetId={logic.contextMenu?.id}
      targetType={logic.contextMenu.type}
      isAdventure={canvas?.metadata?.kind === "adventure" ||
        sourceEntity?.kind === "adventure" ||
        logic.nodes.some((n) => n.type === "adventureNode")}
      isLocked={contextMenuNodeLocked}
      onToggleLock={logic.contextMenu?.type === "node" && logic.contextMenu.id
        ? () => toggleNodeLock(logic.contextMenu!.id)
        : undefined}
      onBringToFront={contextMenuNodeStackable
        ? () => bringNodeToFront(logic.contextMenu!.id)
        : undefined}
      onSendToBack={contextMenuNodeStackable
        ? () => sendNodeToBack(logic.contextMenu!.id)
        : undefined}
      onDelete={logic.handleDelete}
      onRename={() => {
        const edge = logic.edges.find((e) => e.id === logic.contextMenu?.id);
        logic.labelModal = {
          isOpen: true,
          edgeId: logic.contextMenu!.id,
          currentLabel: (edge?.label as string) || "",
        };
        logic.contextMenu = null;
      }}
      onCreateEntity={logic.handleCreateEntity}
      onAddAdventureNode={(type) =>
        logic.handleAddAdventureNode(type, {
          x: logic.contextMenu?.x || 0,
          y: logic.contextMenu?.y || 0,
        })}
      onPaste={!vault.isGuest
        ? () =>
            handlePasteFromClipboard({
              x: logic.contextMenu?.x || 0,
              y: logic.contextMenu?.y || 0,
            })
        : undefined}
      onAddTextNode={!vault.isGuest
        ? () =>
            handleAddTextNode({
              x: logic.contextMenu?.x || 0,
              y: logic.contextMenu?.y || 0,
            })
        : undefined}
      textNodeBackground={normalizeCanvasTextBackground(
        (contextMenuTextNode?.data as any)?.background ?? "",
        DEFAULT_CANVAS_TEXT_BACKGROUND,
      )}
      textNodeFontSize={normalizeCanvasTextFontSize(
        (contextMenuTextNode?.data as any)?.fontSize,
        DEFAULT_CANVAS_TEXT_FONT_SIZE,
      )}
      onTextNodeBackgroundChange={contextMenuTextNode && !vault.isGuest
        ? (background: string) =>
            updateNodeData(contextMenuTextNode!.id, {
              background: normalizeCanvasTextBackground(
                background,
                DEFAULT_CANVAS_TEXT_BACKGROUND,
              ),
            })
        : undefined}
      onTextNodeFontSizeChange={contextMenuTextNode && !vault.isGuest
        ? (fontSize: number) =>
            updateNodeData(contextMenuTextNode!.id, { fontSize })
        : undefined}
      onClose={() => (logic.contextMenu = null)}
    />
  {/if}

  <CanvasHint />
  <EdgeLabelModal
    bind:isOpen={logic.labelModal.isOpen}
    initialValue={logic.labelModal.currentLabel}
    onSave={logic.saveLabelModal}
    onCancel={() => (logic.labelModal.isOpen = false)}
  />
  <EdgeAttributeModal
    isOpen={edgeModal.isOpen}
    edgeData={edgeModal.edgeData}
    onSave={(updates) => {
      logic.edges = logic.edges.map((e) => {
        if (e.id === edgeModal.edgeId) {
          return { ...e, data: { ...(e.data as any), ...updates } };
        }
        return e;
      });
    }}
    onClose={() => (edgeModal.isOpen = false)}
  />
  <RoomStockingDrawer
    isOpen={selectedRoomData !== null}
    roomData={selectedRoomData}
    isRegenerating={isRestockingRoom}
    errorMessage={roomEnhancementError}
    onSave={saveRoomData}
    onRegenerateAi={enhanceRoom}
    onClose={() => (selectedRoomId = null)}
  />

  <AdventureNodeDrawer
    isOpen={activeAdventureNode !== null}
    node={activeAdventureNode}
    onClose={() => {
      selectedAdventureNodeId = null;
      logic.handleCancelDraftAdventureNode();
    }}
    onSave={(updatedNode) => {
      if (logic.draftAdventureNode) {
        const flowNode = {
          ...logic.draftAdventureNode,
          data: {
            ...logic.draftAdventureNode.data,
            ...updatedNode.data,
          },
        };
        logic.handleSaveAdventureNode(flowNode);
      } else {
        logic.nodes = logic.nodes.map((n) =>
          n.id === updatedNode.id
            ? { ...n, data: { ...(n.data as any), ...updatedNode.data } }
            : n,
        );
        logic.flushSave();
      }
      selectedAdventureNodeId = null;
    }}
  />
</div>

<style>
  .canvas-container {
    background-color: var(--color-bg-primary);
    background-image: var(--bg-texture-overlay);
    background-repeat: repeat;
    background-position: top left;
    background-attachment: fixed;
  }

  :global(.svelte-flow__edges) {
    z-index: 0 !important;
  }

  :global(.svelte-flow__nodes) {
    z-index: 10 !important;
  }
  :global(.svelte-flow__node-delveSectorGroup) {
    z-index: 0 !important;
    pointer-events: none !important;
  }

  :global(.svelte-flow) {
    background-color: transparent !important;
    font-family: var(--font-body), ui-sans-serif;
    transition:
      font-family 0.3s ease,
      background-color 0.3s ease;
  }
  :global(.svelte-flow__pane) {
    background-color: transparent !important;
  }
  :global(.svelte-flow__background-pattern) {
    fill: var(--color-border-primary) !important;
    opacity: 0.25 !important;
  }
  :global(.svelte-flow__edgelabel-renderer) {
    background: transparent !important;
    pointer-events: none;
  }
  :global(.svelte-flow__edge-label) {
    background: transparent !important;
  }
  :global(.svelte-flow__edge-path) {
    stroke: var(--color-theme-primary, #78350f) !important;
    stroke-width: var(--theme-edge-stroke-width, 2) !important;
    stroke-opacity: 1 !important;
    visibility: visible !important;
    transition:
      stroke-width 0.2s ease,
      stroke 0.2s ease;
  }
  :global(.svelte-flow__edge:hover .svelte-flow__edge-path) {
    stroke-width: calc(var(--theme-edge-stroke-width, 2) + 2px) !important;
    stroke: var(--color-theme-primary) !important;
    filter: drop-shadow(0 0 4px var(--color-theme-primary));
  }
  :global(.svelte-flow__edge.selected .svelte-flow__edge-path) {
    stroke-width: calc(var(--theme-edge-stroke-width, 2) + 2px) !important;
    stroke: var(--color-theme-primary) !important;
  }
  :global(.svelte-flow__edge.animated path) {
    stroke-dasharray: 5;
    animation: svelte-flow__dashdraw 0.5s linear infinite;
  }
  :global(.svelte-flow__controls) {
    background: var(--color-theme-surface) !important;
    border: 1px solid var(--color-theme-border) !important;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }
  :global(.svelte-flow__controls-button) {
    background: var(--color-theme-surface) !important;
    border-bottom: 1px solid var(--color-theme-border) !important;
    color: var(--color-theme-primary) !important;
    fill: var(--color-theme-primary) !important;
    transition: all 0.2s ease;
  }
  :global(.svelte-flow__controls-button:last-child) {
    border-bottom: none !important;
  }
  :global(.svelte-flow__controls-button:hover) {
    background: var(--color-theme-primary) !important;
    color: var(--color-theme-bg) !important;
    fill: var(--color-theme-bg) !important;
  }
  :global(.svelte-flow__controls-button svg) {
    fill: currentColor !important;
  }
  :global(.svelte-flow__minimap) {
    background-color: var(--color-bg-surface) !important;
    border: 1px solid var(--color-border-primary) !important;
    border-radius: 8px !important;
  }
  @media (max-width: 639px) {
    :global(.svelte-flow__minimap) {
      display: none !important;
    }
  }
  :global(.svelte-flow__minimap-mask) {
    fill: var(--color-theme-primary) !important;
    fill-opacity: 0.1 !important;
  }
  :global(.svelte-flow__connectionline) {
    z-index: 20 !important;
  }

  :global(.svelte-flow__viewport-front) {
    z-index: 30;
  }

  /*
   * Without this, the browser treats a single-finger drag on the pane or a
   * node as a native scroll/zoom gesture instead of handing it to SvelteFlow's
   * own pointer-driven pan/drag, so touch dragging never starts. Same fix
   * already applied to MapView and the family-tree PanZoomContainer.
   */
  :global(.svelte-flow) {
    touch-action: none;
  }

  /*
   * Rotation is applied here, to the node's content element, rather than to
   * `.svelte-flow__node` itself. SvelteFlow positions that wrapper with
   * `transform: translate(...)`, and combining that with a standalone
   * `rotate` property on the same element breaks their shared
   * transform-origin, making the node visually jump instead of spinning in
   * place around its own center.
   */
  :global(.svelte-flow__node > *) {
    rotate: var(--canvas-node-rotate, 0deg);
  }

  :global(.svelte-flow__panel) {
    z-index: 40 !important;
  }

  .canvas-drawing-layer {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: visible;
    touch-action: none;
    user-select: none;
  }

  /*
   * Unlike .canvas-drawing-layer (inside ViewportPortal, scaled/panned with
   * the flow viewport), this sits outside it as a plain SvelteFlow child, so
   * it's never transformed and always spans the full visible pane. See the
   * comment above its markup for why that matters.
   */
  .canvas-draw-input-layer {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    z-index: 25;
    touch-action: none;
    user-select: none;
  }

  @keyframes svelte-flow__dashdraw {
    from {
      stroke-dashoffset: 10;
    }
    to {
      stroke-dashoffset: 0;
    }
  }
</style>
