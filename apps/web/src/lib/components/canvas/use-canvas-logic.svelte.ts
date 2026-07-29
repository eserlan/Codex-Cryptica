import { untrack, tick } from "svelte";
import {
  addEdge as addXyEdge,
  useSvelteFlow,
  type Node,
  type Edge,
  type Connection,
} from "@xyflow/svelte";
import { CanvasStore, type Canvas } from "@codex/canvas-engine";
import { vault } from "$lib/stores/vault.svelte";
import { canvasRegistry } from "$lib/stores/canvas-registry.svelte";
import { debugStore } from "$lib/stores/debug.svelte";
import {
  buildCanvasSavePayload,
  createFlowEdgeFromConnection,
  createFlowEntityNode,
  flowEdgeToCanvasEdge,
  flowNodeToCanvasNode,
  hydrateCanvasGraph,
  pruneCanvasGraph,
  reconnectFlowEdge,
  resolveSpawnPosition,
} from "./canvas-workspace-helpers";
import {
  type IdGenerator,
  systemClock,
  systemIdGenerator,
} from "$lib/utils/runtime-deps";

export function createCanvasLogic(
  getEngine: () => CanvasStore,
  idGenerator: IdGenerator = systemIdGenerator,
) {
  const svelteFlow = useSvelteFlow();
  const screenToFlowPosition = $derived(svelteFlow?.screenToFlowPosition);

  let nodes = $state<Node[]>([]);
  let edges = $state<Edge[]>([]);
  let activeCategories = $state(new Set<string>());
  let isConnecting = $state(false);
  let hasInitialized = $state(false);

  let contextMenu = $state<{
    x: number;
    y: number;
    type: "node" | "edge" | "pane";
    id: string;
  } | null>(null);

  let labelModal = $state<{
    isOpen: boolean;
    edgeId: string;
    currentLabel: string;
  }>({
    isOpen: false,
    edgeId: "",
    currentLabel: "",
  });

  let targetVaultId = $state<string | null>(null);
  let targetCanvasId = $state<string | null>(null);
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  let skipLoadingSaves = 0;

  // Persistence Logic
  function flushSave() {
    if (saveTimer !== null) {
      clearTimeout(saveTimer);
      saveTimer = null;
      untrack(() => {
        if (targetVaultId && targetCanvasId) {
          saveCanvas(targetVaultId, targetCanvasId);
        }
      });
    }
  }

  function saveNow() {
    if (saveTimer !== null) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    untrack(() => saveCanvas());
  }

  function debouncedSave() {
    if (skipLoadingSaves > 0) {
      skipLoadingSaves--;
      return;
    }
    if (saveTimer !== null) {
      clearTimeout(saveTimer);
    }
    saveTimer = setTimeout(() => {
      untrack(() => saveCanvas());
    }, 500);
  }

  async function saveCanvas(
    explicitVaultId?: string,
    explicitCanvasId?: string,
  ) {
    const currentVaultId =
      explicitVaultId || targetVaultId || vault.activeVaultId;
    const currentCanvasId = explicitCanvasId || targetCanvasId;
    const currentNodes = untrack(() => nodes);
    const currentEdges = untrack(() => edges);

    await tick();

    if (
      !currentVaultId ||
      !currentCanvasId ||
      (!canvasRegistry.canvases[currentCanvasId] &&
        !vault.canvases[currentCanvasId] &&
        !canvasRegistry.allCanvases.some(
          (c) => c.id === currentCanvasId || c.slug === currentCanvasId,
        ))
    ) {
      debugStore.warn(
        "[CanvasLogic] saveCanvas called for deleted or uninitialized canvas; skipping.",
      );
      return;
    }

    const canvasNodes = currentNodes.map(flowNodeToCanvasNode);
    const canvasEdges = currentEdges.map((e) =>
      flowEdgeToCanvasEdge(e, () => `edge-${idGenerator.uuid()}`),
    );

    const existing = untrack(() => vault.canvases[currentCanvasId] || {});
    const canvasRegistryMeta = canvasRegistry.allCanvases.find(
      (c) => c.id === currentCanvasId || c.slug === currentCanvasId,
    );

    const exportData: Canvas = {
      ...existing,
      id: currentCanvasId,
      nodes: canvasNodes,
      edges: canvasEdges,
      metadata: {
        ...(existing.metadata || {}),
      },
    };

    vault.canvases[currentCanvasId] = buildCanvasSavePayload({
      existing,
      currentCanvas: canvasRegistryMeta,
      exported: exportData,
      canvasId: currentCanvasId,
      lastModified: systemClock.now(),
    });

    await vault.saveCanvas(currentCanvasId, {
      explicitVaultId: currentVaultId,
    });
    await canvasRegistry.touch(currentCanvasId);
  }

  // Categories Logic
  function toggleCategoryFilter(categoryId: string) {
    if (activeCategories.has(categoryId)) {
      activeCategories.delete(categoryId);
    } else {
      activeCategories.add(categoryId);
    }
    activeCategories = new Set(activeCategories);
  }

  function clearCategoryFilters() {
    activeCategories = new Set();
  }

  // Mutations
  function onConnect(connection: Connection) {
    const edgeId = `edge-${idGenerator.uuid()}`;
    const sourceNode = nodes.find((n) => n.id === connection.source);
    const targetNode = nodes.find((n) => n.id === connection.target);
    const flowEdge = createFlowEdgeFromConnection(
      connection,
      edgeId,
      sourceNode,
      targetNode,
    );

    edges = addXyEdge(flowEdge, edges);
    untrack(() => saveCanvas());
  }

  function onReconnect(oldEdge: Edge, newConnection: Connection) {
    edges = edges.map((edge) =>
      edge.id === oldEdge.id ? reconnectFlowEdge(edge, newConnection) : edge,
    );
    untrack(() => saveCanvas());
  }

  let draftAdventureNode = $state<Node | null>(null);

  function handleAddAdventureNode(
    type: "location" | "npc" | "clue" | "threat" | "outcome" | "situation",
    screenPos?: { x: number; y: number },
  ) {
    const position =
      (screenPos && screenToFlowPosition(screenPos)) ||
      resolveSpawnPosition({
        screenToFlowPosition,
        windowSize: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
      });

    const nodeId = `node-${type}-${idGenerator.uuid()}`;
    draftAdventureNode = {
      id: nodeId,
      type: "adventureNode",
      position,
      data: {
        title: "",
        type,
        description: "",
      },
    };
  }

  function handleSaveAdventureNode(node: Node) {
    const existingIndex = nodes.findIndex((n) => n.id === node.id);
    if (existingIndex >= 0) {
      nodes = nodes.map((n) => (n.id === node.id ? node : n));
    } else {
      nodes = [...nodes, node];
    }
    draftAdventureNode = null;
    untrack(() => saveCanvas());
  }

  function handleCancelDraftAdventureNode() {
    draftAdventureNode = null;
  }

  async function handleCreateEntity(type: string) {
    if (!contextMenu) return;

    const title = prompt(`Enter new ${type} name:`);
    if (!title) return;

    try {
      const id = await vault.createEntity(type as any, title);
      const position = screenToFlowPosition({
        x: contextMenu.x,
        y: contextMenu.y,
      });

      const newNodeId = getEngine().addNode(id, position);
      nodes = [...nodes, createFlowEntityNode(id, position, newNodeId)];
      saveCanvas();
    } catch (err) {
      console.error("Failed to create entity from canvas", err);
    }
  }

  function handleDelete() {
    if (!contextMenu) return;
    const targetId = contextMenu.id;
    if (contextMenu.type === "node") {
      nodes = nodes.filter((n) => n.id !== targetId);
      edges = edges.filter(
        (e) => e.source !== targetId && e.target !== targetId,
      );
    } else {
      edges = edges.filter((e) => e.id !== targetId);
    }
    contextMenu = null;
    untrack(() => saveCanvas());
  }

  function saveLabelModal(newLabel: string) {
    const { edgeId } = labelModal;
    edges = edges.map((e) => (e.id === edgeId ? { ...e, label: newLabel } : e));
    saveCanvas();
  }

  function handleQuickSpawn(
    entityId: string,
    eventPosition?: { x: number; y: number },
    eventScreenPosition?: { x: number; y: number },
  ) {
    const position =
      (eventScreenPosition && screenToFlowPosition(eventScreenPosition)) ||
      eventPosition ||
      resolveSpawnPosition({
        screenToFlowPosition,
        windowSize: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
      });

    const newNodeId = getEngine().addNode(entityId, position);
    vault.loadEntityContent(entityId);
    nodes = [...nodes, createFlowEntityNode(entityId, position, newNodeId)];
    saveCanvas();
  }

  function handleBatchSpawn() {
    const toAdd = canvasRegistry.consumePending();
    if (toAdd.length === 0) return;

    const newNodesList: Node[] = [];

    toAdd.forEach((item, index) => {
      const { id: entityId, position: eventPosition } = item;

      const position = eventPosition
        ? screenToFlowPosition(eventPosition)
        : screenToFlowPosition({
            x: window.innerWidth / 2 + index * 30,
            y: window.innerHeight / 2 + index * 30,
          });

      const newNodeId = getEngine().addNode(entityId, position);
      vault.loadEntityContent(entityId);

      newNodesList.push({
        id: newNodeId,
        type: "entity",
        position,
        data: { entityId },
      });
    });

    nodes = [...nodes, ...newNodesList];
    saveCanvas();
  }

  // Initialization & Sync logic (called by effects in the component)
  function initializeCanvas(canvasId: string) {
    if (!vault.isInitialized || !canvasRegistry.isLoaded) return;

    if (targetCanvasId !== canvasId) {
      untrack(() => {
        hasInitialized = false;
        if (saveTimer !== null && targetVaultId && targetCanvasId) {
          const oldVaultId = targetVaultId;
          const oldCanvasId = targetCanvasId;
          clearTimeout(saveTimer);
          saveTimer = null;
          saveCanvas(oldVaultId, oldCanvasId);
        }

        targetVaultId = vault.activeVaultId;
        const matchedCanvas =
          vault.canvases[canvasId] ||
          canvasRegistry.allCanvases.find(
            (c) => c.slug === canvasId || c.id === canvasId,
          );
        const realCanvasId = matchedCanvas ? matchedCanvas.id : canvasId;
        const data = vault.canvases[realCanvasId] || matchedCanvas;
        targetCanvasId = realCanvasId;

        if (data) {
          for (const node of data.nodes || []) {
            if (node.entityId) {
              vault.loadEntityContent(node.entityId);
            }
          }

          skipLoadingSaves = 2;
          const graph = hydrateCanvasGraph(data);

          nodes = graph.nodes;
          edges = graph.edges;

          try {
            getEngine().nodes = graph.nodes.map(flowNodeToCanvasNode);
            getEngine().edges = graph.edges.map((e) =>
              flowEdgeToCanvasEdge(e, () => `edge-${idGenerator.uuid()}`),
            );
          } catch {
            // Ignore engine sync errors if facade not loaded
          }
        } else {
          nodes = [];
          edges = [];
          try {
            getEngine().nodes = [];
            getEngine().edges = [];
          } catch {
            // Ignore engine sync errors if facade not loaded
          }
        }
        hasInitialized = true;
      });
    }
  }

  function pruneNodes() {
    if (!hasInitialized || nodes.length === 0) return;
    const entityIds = new Set(vault.allEntities.map((e) => e.id));
    const pruned = pruneCanvasGraph(nodes, edges, entityIds);

    if (pruned.nodes.length !== nodes.length) {
      nodes = pruned.nodes;
      edges = pruned.edges;
      saveCanvas();
    }
  }

  function syncEngine() {
    if (!hasInitialized || !vault.isInitialized || !targetCanvasId) return;

    // Sync edges
    const currentEdges = edges;
    getEngine().edges = currentEdges.map((edge) =>
      flowEdgeToCanvasEdge(edge, () => `edge-${idGenerator.uuid()}`),
    );

    // Sync nodes
    const currentNodes = nodes;
    getEngine().nodes = currentNodes.map(flowNodeToCanvasNode);

    debouncedSave();
  }

  async function fitGraphForExport() {
    const viewport = svelteFlow.getViewport();
    await svelteFlow.fitView({
      nodes,
      padding: 0.08,
      duration: 0,
      includeHiddenNodes: true,
    });
    await tick();
    return async () => {
      await svelteFlow.setViewport(viewport, { duration: 0 });
      await tick();
    };
  }

  return {
    get nodes() {
      return nodes;
    },
    set nodes(val) {
      nodes = val;
    },
    get edges() {
      return edges;
    },
    set edges(val) {
      edges = val;
    },
    get activeCategories() {
      return activeCategories;
    },
    get isConnecting() {
      return isConnecting;
    },
    set isConnecting(val) {
      isConnecting = val;
    },
    get contextMenu() {
      return contextMenu;
    },
    set contextMenu(val) {
      contextMenu = val;
    },
    get labelModal() {
      return labelModal;
    },
    set labelModal(val) {
      labelModal = val;
    },
    get draftAdventureNode() {
      return draftAdventureNode;
    },
    set draftAdventureNode(val) {
      draftAdventureNode = val;
    },
    get hasInitialized() {
      return hasInitialized;
    },
    get screenToFlowPosition() {
      return screenToFlowPosition;
    },

    toggleCategoryFilter,
    clearCategoryFilters,
    onConnect,
    onReconnect,
    handleAddAdventureNode,
    handleSaveAdventureNode,
    handleCancelDraftAdventureNode,
    handleCreateEntity,
    handleDelete,
    saveLabelModal,
    handleQuickSpawn,
    handleBatchSpawn,
    initializeCanvas,
    pruneNodes,
    syncEngine,
    fitGraphForExport,
    flushSave,
    saveNow,
  };
}
