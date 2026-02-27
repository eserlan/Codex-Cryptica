<script lang="ts">
  import {
    SvelteFlow,
    Background,
    Controls,
    MiniMap,
    useSvelteFlow,
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

  const { screenToFlowPosition } = useSvelteFlow();

  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  function debouncedSave() {
    if (saveTimer !== null) {
      clearTimeout(saveTimer);
    }
    saveTimer = setTimeout(saveCanvas, 1000);
  }

  function syncEngine() {
    if (!vault.isInitialized || !canvasId) return;

    // Sync nodes
    engine.nodes = nodes.map((n) => ({
      id: n.id,
      type: n.type as "entity",
      position: n.position,
      entityId: n.data?.entityId as string,
      width: n.data?.width as number,
      height: n.data?.height as number,
    }));

    // Sync edges
    engine.edges = edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle || undefined,
      targetHandle: e.targetHandle || undefined,
      label: e.label as string,
      type: e.type || "smoothstep",
    }));

    debouncedSave();
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
          sourceHandle: e.sourceHandle,
          targetHandle: e.targetHandle,
          label: e.label,
          type: e.type || "smoothstep",
        }));
      } else {
        nodes = [];
        edges = [];
      }
    }
  });

  function onConnect(connection: Connection) {
    console.log("[Canvas] Connection event triggered:", connection);

    if (connection.source && connection.target) {
      // Add to engine store
      const newEdgeId = engine.addEdge(
        connection.source,
        connection.target,
        connection.sourceHandle,
        connection.targetHandle,
      );

      // Create the edge object correctly for Svelte Flow
      const newEdge: Edge = {
        id: newEdgeId,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
        type: "smoothstep",
        animated: true, // Add animation for immediate visual feedback
      };

      console.log("[Canvas] Adding new edge to state:", newEdge);
      edges = [...edges, newEdge];
      syncEngine();
    }
  }

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
    syncEngine();
  }

  function handleQuickSpawn(event: CustomEvent<{ entityId: string }>) {
    const { entityId } = event.detail;

    // Center in flow coordinates
    const position = screenToFlowPosition({
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
    syncEngine();
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
      onnodedragstop={syncEngine}
      onmoveend={syncEngine}
      fitView
    >
      <Background gap={20} />
      <Controls />
      <MiniMap />
    </SvelteFlow>
  </div>

  <CanvasHint />
  <CanvasSelectionModal />
</div>
