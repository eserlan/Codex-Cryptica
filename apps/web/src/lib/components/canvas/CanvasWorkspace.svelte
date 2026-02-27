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
  import { uiStore } from "$lib/stores/ui.svelte";
  import EntityNode from "$lib/components/canvas/EntityNode.svelte";
  import EntityPalette from "$lib/components/canvas/EntityPalette.svelte";
  import CanvasSelectionModal from "$lib/components/canvas/CanvasSelectionModal.svelte";
  import CanvasHint from "$lib/components/hints/CanvasHint.svelte";
  import { Layout } from "lucide-svelte";
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
    engine.nodes = nodes.map((n) => ({
      id: n.id,
      type: n.type as "entity",
      position: n.position,
      entityId: n.data?.entityId as string,
      width: n.data?.width as number,
      height: n.data?.height as number,
    }));
    engine.edges = edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label as string,
      type: e.type || "line",
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
          label: e.label,
          type: e.type,
        }));
      } else {
        nodes = [];
        edges = [];
      }
    }
  });

  function onConnect(connection: Connection) {
    if (connection.source && connection.target) {
      const newEdgeId = engine.addEdge(connection.source, connection.target);
      edges = [
        ...edges,
        {
          id: newEdgeId,
          source: connection.source,
          target: connection.target,
          type: "line",
        },
      ];
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
  <!-- Workspace Toggle (Fixed Top Left) -->
  <div class="absolute top-4 left-4 z-20 flex flex-col gap-2">
    <button
      onclick={() => (uiStore.showCanvasSelector = true)}
      class="p-3 bg-theme-surface border border-theme-border rounded-xl shadow-lg text-theme-primary hover:scale-105 active:scale-95 transition-all group flex items-center gap-3"
      title="Switch Workspace"
    >
      <Layout class="w-5 h-5" />
      <span
        class="text-xs font-bold uppercase tracking-widest pr-2 hidden group-hover:inline-block animate-in fade-in slide-in-from-left-2"
      >
        {canvasRegistry.canvases.find((c) => c.id === canvasId)?.name ||
          "Workspaces"}
      </span>
    </button>
  </div>

  <EntityPalette />

  <div class="flex-1 relative" ondragover={onDragOver} ondrop={onDrop}>
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
