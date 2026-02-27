<script lang="ts">
  import {
    SvelteFlow,
    Background,
    Controls,
    MiniMap,
    useSvelteFlow,
    addEdge as addXyEdge,
    type Node,
    type Edge,
    type Connection,
  } from "@xyflow/svelte";
  import {
    CanvasStore,
    type CanvasNode,
    type CanvasEdge,
  } from "@codex/canvas-engine";
  import { vault } from "$lib/stores/vault.svelte";
  import { canvasRegistry } from "$lib/stores/canvas-registry.svelte";
  import EntityNode from "$lib/components/canvas/EntityNode.svelte";
  import EntityPalette from "$lib/components/canvas/EntityPalette.svelte";
  import CanvasSelectionModal from "$lib/components/canvas/CanvasSelectionModal.svelte";
  import CanvasContextMenu from "$lib/components/canvas/CanvasContextMenu.svelte";
  import CanvasHint from "$lib/components/hints/CanvasHint.svelte";
  import { page } from "$app/state";
  import { untrack } from "svelte";

  let { engine }: { engine: CanvasStore } = $props();
  const canvasId = $derived(page.params.id);

  const nodeTypes = {
    entity: EntityNode,
  };

  let nodes = $state<Node[]>([]);
  let edges = $state<Edge[]>([]);
  let contextMenu = $state<{
    x: number;
    y: number;
    type: "node" | "edge";
    id: string;
  } | null>(null);

  const { screenToFlowPosition } = useSvelteFlow();

  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  function debouncedSave() {
    if (saveTimer !== null) {
      clearTimeout(saveTimer);
    }
    saveTimer = setTimeout(saveCanvas, 1000);
  }

  // Sync engine to local state
  $effect(() => {
    if (vault.isInitialized && canvasId) {
      const data = untrack(() => vault.canvases[canvasId]);
      if (data) {
        nodes = data.nodes.map((n: CanvasNode) => ({
          id: n.id,
          type: n.type,
          position: n.position,
          data: { entityId: n.entityId, width: n.width, height: n.height },
        }));
        edges = data.edges.map((e: CanvasEdge) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle || null,
          targetHandle: e.targetHandle || null,
          label: e.label,
          type: e.type === "line" || !e.type ? "smoothstep" : (e.type as any),
          style: e.style,
        }));
      } else {
        nodes = [];
        edges = [];
      }
    }
  });

  function onConnect(connection: Connection) {
    const edgeId = `edge-${crypto.randomUUID()}`;
    // Explicitly add the edge to our state to ensure reactivity and sync
    edges = addXyEdge(
      {
        ...connection,
        id: edgeId,
        type: "smoothstep",
        animated: true,
        style: { stroke: "var(--color-theme-primary)", strokeWidth: "2" },
      },
      edges,
    );
  }

  function onNodeContextMenu({
    event,
    node,
  }: {
    event: MouseEvent;
    node: any;
  }) {
    event.preventDefault();
    contextMenu = {
      x: event.clientX,
      y: event.clientY,
      type: "node",
      id: node.id,
    };
  }

  function onEdgeContextMenu({
    event,
    edge,
  }: {
    event: MouseEvent;
    edge: any;
  }) {
    event.preventDefault();
    contextMenu = {
      x: event.clientX,
      y: event.clientY,
      type: "edge",
      id: edge.id,
    };
  }

  function handlePaneContextMenu(event: MouseEvent) {
    event.preventDefault();
    contextMenu = null;
  }

  function handleDelete() {
    if (!contextMenu) return;
    if (contextMenu.type === "node") {
      nodes = nodes.filter((n) => n.id !== contextMenu.id);
      edges = edges.filter(
        (e) => e.source !== contextMenu.id && e.target !== contextMenu.id,
      );
    } else {
      edges = edges.filter((e) => e.id !== contextMenu.id);
    }
    contextMenu = null;
  }

  // Keep engine state in sync whenever SvelteFlow's edges change (add/remove).
  $effect(() => {
    const snapshot = edges;
    untrack(() => {
      if (vault.isInitialized && canvasId) {
        engine.edges = snapshot.map((e: Edge) => ({
          id: e.id || `edge-${crypto.randomUUID()}`,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle || undefined,
          targetHandle: e.targetHandle || undefined,
          label: e.label as string,
          type: "smoothstep",
          style: e.style as any,
        }));
        debouncedSave();
      }
    });
  });

  // Keep engine state in sync whenever SvelteFlow's nodes change (drag/add/remove).
  $effect(() => {
    const snapshot = nodes;
    untrack(() => {
      if (vault.isInitialized && canvasId) {
        engine.nodes = snapshot.map((n: Node) => ({
          id: n.id,
          type: n.type as "entity",
          position: n.position,
          entityId: n.data?.entityId as string,
          width: n.data?.width as number,
          height: n.data?.height as number,
        }));
        debouncedSave();
      }
    });
  });

  function onDragOver(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();

    const entityId = event.dataTransfer?.getData("application/codex-entity");

    if (!entityId) return;

    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    const newNodeId = engine.addNode(entityId, position);
    // Manually add to nodes to trigger sync
    nodes = [
      ...nodes,
      {
        id: newNodeId,
        type: "entity",
        position,
        data: { entityId },
      },
    ];
  }

  function handleQuickSpawn(
    event: CustomEvent<{
      entityId: string;
      position?: { x: number; y: number };
    }>,
  ) {
    const { entityId, position: eventPosition } = event.detail;

    // Center in flow coordinates or use provided
    const position =
      eventPosition ||
      screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });

    const newNodeId = engine.addNode(entityId, position);
    // Manually add to nodes to trigger sync
    nodes = [
      ...nodes,
      {
        id: newNodeId,
        type: "entity",
        position,
        data: { entityId },
      },
    ];
  }

  async function saveCanvas() {
    if (!vault.activeVaultId || !canvasId) return;

    const data = engine.export();
    vault.canvases[canvasId] = data;
    await vault.saveCanvas(canvasId);
    await canvasRegistry.touch(canvasId);
  }

  $effect(() => {
    window.addEventListener("add-to-canvas", handleQuickSpawn as any);
    return () =>
      window.removeEventListener("add-to-canvas", handleQuickSpawn as any);
  });

  $effect(() => {
    return () => {
      if (saveTimer !== null) {
        clearTimeout(saveTimer);
      }
    };
  });
</script>

<div class="flex h-screen w-full bg-theme-bg overflow-hidden relative">
  <EntityPalette />

  <div
    class="flex-1 relative"
    ondragover={onDragOver}
    ondrop={onDrop}
    role="region"
    aria-label="Canvas Workspace"
  >
    <SvelteFlow
      bind:nodes
      bind:edges
      {nodeTypes}
      onconnect={onConnect}
      onnodecontextmenu={onNodeContextMenu}
      onedgecontextmenu={onEdgeContextMenu}
      onpanecontextmenu={handlePaneContextMenu}
      fitView
    >
      <Background color="var(--color-theme-border)" gap={20} />
      <Controls />
      <MiniMap />
    </SvelteFlow>
  </div>

  {#if contextMenu}
    <CanvasContextMenu
      x={contextMenu.x}
      y={contextMenu.y}
      onDelete={handleDelete}
      onClose={() => (contextMenu = null)}
    />
  {/if}

  <CanvasHint />
  <CanvasSelectionModal />
</div>

<style>
  :global(.svelte-flow) {
    background-color: var(--theme-bg);
  }
  :global(.svelte-flow__edge-path) {
    stroke: var(--color-theme-primary, #78350f) !important;
    stroke-width: 2 !important;
    stroke-opacity: 1 !important;
    visibility: visible !important;
    transition:
      stroke-width 0.2s ease,
      stroke 0.2s ease;
  }
  :global(.svelte-flow__edge:hover .svelte-flow__edge-path) {
    stroke-width: 4 !important;
    stroke: var(--color-theme-primary) !important;
    filter: drop-shadow(0 0 4px var(--color-theme-primary));
  }
  :global(.svelte-flow__edge.selected .svelte-flow__edge-path) {
    stroke-width: 4 !important;
    stroke: var(--color-theme-primary) !important;
  }
  :global(.svelte-flow__edge.animated path) {
    stroke-dasharray: 5;
    animation: svelte-flow__dashdraw 0.5s linear infinite;
  }
  :global(.svelte-flow__edge-textbg) {
    fill: var(--theme-surface) !important;
    fill-opacity: 0.8 !important;
  }
  :global(.svelte-flow__edge-text) {
    fill: var(--theme-text) !important;
    font-size: 10px !important;
    font-weight: bold !important;
  }
  :global(.svelte-flow__controls) {
    background: var(--theme-surface);
    border: 1px solid var(--theme-border);
    border-radius: 8px;
    overflow: hidden;
  }
  :global(.svelte-flow__controls-button) {
    background: var(--theme-surface);
    fill: var(--theme-text);
    border-bottom: 1px solid var(--theme-border);
  }
  :global(.svelte-flow__controls-button:hover) {
    background: var(--theme-bg);
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
