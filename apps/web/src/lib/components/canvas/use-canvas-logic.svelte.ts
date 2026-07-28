import { untrack, tick } from "svelte";
import {
  addEdge as addXyEdge,
  useSvelteFlow,
  type Node,
  type Edge,
  type Connection,
} from "@xyflow/svelte";
import { CanvasStore } from "@codex/canvas-engine";
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
    await tick();
    const currentVaultId =
      explicitVaultId || targetVaultId || vault.activeVaultId;
    const currentCanvasId = explicitCanvasId || targetCanvasId;

    if (!currentVaultId || !currentCanvasId) {
      debugStore.warn(
        "[CanvasLogic] saveCanvas called before canvas initialization; skipping.",
      );
      return;
    }

    const exportData = getEngine().export();
    const existing = untrack(() => vault.canvases[currentCanvasId] || {});
    const canvas = canvasRegistry.allCanvases.find(
      (c) => c.id === currentCanvasId,
    );

    vault.canvases[currentCanvasId] = buildCanvasSavePayload({
      existing,
      currentCanvas: canvas,
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
    edges = addXyEdge(createFlowEdgeFromConnection(connection, edgeId), edges);
    untrack(() => saveCanvas());
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
        const data = matchedCanvas
          ? (vault.canvases[matchedCanvas.id] ||= matchedCanvas)
          : undefined;
        targetCanvasId = matchedCanvas ? matchedCanvas.id : canvasId;
        console.log(
          "[DelveCanvas] Loading graph for canvas:",
          canvasId,
          "Target ID:",
          targetCanvasId,
          "Matched canvas:",
          matchedCanvas,
        );

        if (data) {
          for (const node of data.nodes || []) {
            if (node.entityId) {
              vault.loadEntityContent(node.entityId);
            }
          }

          skipLoadingSaves = 2;
          const graph = hydrateCanvasGraph(data);
          console.log(
            "[DelveCanvas] Hydrated graph nodes:",
            graph.nodes.length,
            "edges:",
            graph.edges.length,
            graph,
          );
          nodes = graph.nodes;
          edges = graph.edges;
        } else {
          console.warn(
            "[DelveCanvas] No canvas data found for target canvas:",
            canvasId,
          );
          nodes = [];
          edges = [];
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
    get hasInitialized() {
      return hasInitialized;
    },
    get screenToFlowPosition() {
      return screenToFlowPosition;
    },

    toggleCategoryFilter,
    clearCategoryFilters,
    onConnect,
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
  };
}
