<script lang="ts">
  import ConnectionLine from "./ConnectionLine.svelte";
  import {
    SvelteFlow,
    Background,
    Controls,
    MiniMap,
    useSvelteFlow,
    addEdge as addXyEdge,
    ConnectionMode,
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
  import { uiStore } from "$lib/stores/ui.svelte";
  import { canvasRegistry } from "$lib/stores/canvas-registry.svelte";
  import EntityNode from "$lib/components/canvas/EntityNode.svelte";
  import EntityPalette from "$lib/components/canvas/EntityPalette.svelte";
  import CanvasSelectionModal from "$lib/components/canvas/CanvasSelectionModal.svelte";
  import CanvasContextMenu from "$lib/components/canvas/CanvasContextMenu.svelte";
  import CustomEdge from "$lib/components/canvas/CustomEdge.svelte";
  import EdgeLabelModal from "$lib/components/canvas/EdgeLabelModal.svelte";
  import CanvasHint from "$lib/components/hints/CanvasHint.svelte";
  import { page } from "$app/state";
  import { untrack, onDestroy } from "svelte";

  let { engine }: { engine: CanvasStore } = $props();
  const canvasSlug = $derived(page.params.slug);
  const canvasId = $derived(
    canvasRegistry.allCanvases.find((c) => c.slug === canvasSlug)?.id,
  );

  const nodeTypes = {
    entity: EntityNode,
  };

  const edgeTypes = {
    straight: CustomEdge,
    smoothstep: CustomEdge,
  };

  let nodes = $state<Node[]>([]);
  let edges = $state<Edge[]>([]);
  let contextMenu = $state<{
    x: number;
    y: number;
    type: "node" | "edge" | "pane";
    id: string;
  } | null>(null);

  // Modifier state passed to nodes via context or store
  $effect(() => {
    const handleDown = (e: KeyboardEvent) => {
      if (e.key === "Control" || e.metaKey || e.ctrlKey) {
        uiStore.isModifierPressed = true;
      }
    };
    const handleUp = (e: KeyboardEvent) => {
      if (e.key === "Control" || e.metaKey || e.ctrlKey) {
        uiStore.isModifierPressed = false;
      }
    };
    window.addEventListener("keydown", handleDown);
    window.addEventListener("keyup", handleUp);
    return () => {
      window.removeEventListener("keydown", handleDown);
      window.removeEventListener("keyup", handleUp);
    };
  });

  // Label Modal State
  let labelModal = $state<{
    isOpen: boolean;
    edgeId: string;
    currentLabel: string;
  }>({
    isOpen: false,
    edgeId: "",
    currentLabel: "",
  });

  let isConnecting = $state(false);

  let targetVaultId = $state<string | null>(null);
  let targetCanvasId = $state<string | null>(null);

  $effect(() => {
    if (vault.activeVaultId && canvasId) {
      targetVaultId = vault.activeVaultId;
      targetCanvasId = canvasId;
    }
  });

  const { screenToFlowPosition } = useSvelteFlow();

  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  function debouncedSave() {
    if (saveTimer !== null) {
      clearTimeout(saveTimer);
    }
    saveTimer = setTimeout(saveCanvas, 1000);
  }

  // Ensure registry is loaded for slug resolution (critical for reload/deep-link)
  $effect(() => {
    if (vault.activeVaultId && !canvasRegistry.isLoaded) {
      canvasRegistry.loadFromVault(vault.activeVaultId);
    }
  });

  // Sync engine to local state
  $effect(() => {
    if (vault.isInitialized && canvasId) {
      // Flush any pending save for the PREVIOUS canvas before loading new data
      untrack(() => {
        if (saveTimer !== null && targetVaultId && targetCanvasId) {
          const oldVaultId = targetVaultId;
          const oldCanvasId = targetCanvasId;
          clearTimeout(saveTimer);
          saveTimer = null;
          saveCanvas(oldVaultId, oldCanvasId);
        }
      });

      const data = untrack(() => vault.canvases[canvasId]);
      if (data) {
        nodes = data.nodes.map((n: CanvasNode) => ({
          id: n.id,
          type: n.type,
          position: n.position,
          data: {
            entityId: n.entityId,
            width: n.width,
            height: n.height,
          },
        }));
        edges = data.edges.map((e: CanvasEdge) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle || null,
          targetHandle: e.targetHandle || null,
          label: e.label,
          type: e.type === "line" || !e.type ? "straight" : (e.type as any),
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
        type: "straight",
        animated: true,
        style: "stroke: var(--color-theme-primary); stroke-width: 2;",
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

  function handlePaneContextMenu({ event }: { event: MouseEvent }) {
    event.preventDefault();
    contextMenu = {
      x: event.clientX,
      y: event.clientY,
      type: "pane",
      id: "pane",
    };
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

      const newNodeId = engine.addNode(id, position);
      nodes = [
        ...nodes,
        {
          id: newNodeId,
          type: "entity",
          position,
          data: { entityId: id },
        },
      ];
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
  }

  function handleRename() {
    if (!contextMenu || contextMenu.type !== "edge") return;
    const targetId = contextMenu.id;
    const edge = edges.find((e) => e.id === targetId);
    labelModal = {
      isOpen: true,
      edgeId: targetId,
      currentLabel: (edge?.label as string) || "",
    };
    contextMenu = null;
  }

  function handleEditLabel(
    event: CustomEvent<{ edgeId: string; currentLabel: string }>,
  ) {
    const { edgeId, currentLabel } = event.detail;
    labelModal = {
      isOpen: true,
      edgeId,
      currentLabel: currentLabel || "",
    };
  }

  function onEdgeClick({ event, edge }: { event: MouseEvent; edge: any }) {
    if (event.detail === 2) {
      // Double click
      event.stopPropagation();
      labelModal = {
        isOpen: true,
        edgeId: edge.id,
        currentLabel: (edge.label as string) || "",
      };
    }
  }

  function saveLabelModal(newLabel: string) {
    const { edgeId } = labelModal;
    edges = edges.map((e) => (e.id === edgeId ? { ...e, label: newLabel } : e));
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
          sourceHandle: undefined,
          targetHandle: undefined,
          label: e.label as string,
          type: "straight",
          style: e.style as string,
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

  async function saveCanvas(
    explicitVaultId?: string,
    explicitCanvasId?: string,
  ) {
    const currentVaultId = explicitVaultId || targetVaultId;
    const currentCanvasId = explicitCanvasId || targetCanvasId;
    if (!currentVaultId || !currentCanvasId) return;

    const data = engine.export();
    vault.canvases[currentCanvasId] = data;
    await vault.saveCanvas(currentCanvasId, currentVaultId);
    await canvasRegistry.touch(currentCanvasId);
  }

  $effect(() => {
    window.addEventListener("add-to-canvas", handleQuickSpawn as any);
    window.addEventListener("edit-edge-label", handleEditLabel as any);
    return () => {
      window.removeEventListener("add-to-canvas", handleQuickSpawn as any);
      window.removeEventListener("edit-edge-label", handleEditLabel as any);
    };
  });

  onDestroy(() => {
    if (saveTimer !== null) {
      clearTimeout(saveTimer);
      // Use untracked values for final destroy save
      untrack(() => {
        saveCanvas(targetVaultId!, targetCanvasId!);
      });
    }
  });

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key.toLowerCase() === "p" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const target = e.target as HTMLElement;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable
      )
        return;
      uiStore.showCanvasPalette = !uiStore.showCanvasPalette;
    }
  }
</script>

<div
  class="canvas-container {isConnecting
    ? 'is-connecting'
    : ''} flex h-[calc(100vh-var(--header-height,65px))] w-full overflow-hidden relative"
  onkeydown={handleKeyDown}
  tabindex="-1"
  role="none"
>
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
      {edgeTypes}
      onconnect={onConnect}
      onconnectstart={() => {
        isConnecting = true;
        uiStore.isConnecting = true;
      }}
      onconnectend={() => {
        isConnecting = false;
        uiStore.isConnecting = false;
      }}
      onnodecontextmenu={onNodeContextMenu}
      onedgecontextmenu={onEdgeContextMenu}
      onedgeclick={onEdgeClick}
      onpanecontextmenu={handlePaneContextMenu}
      defaultEdgeOptions={{ type: "straight" }}
      connectionMode={ConnectionMode.Loose}
      zoomOnDoubleClick={false}
      proOptions={{ hideAttribution: true }}
      connectionLineComponent={ConnectionLine}
      fitView
    >
      <Background gap={20} />
      <Controls />
      <MiniMap position="top-right" nodeColor="var(--color-theme-primary)" />
    </SvelteFlow>
  </div>

  {#if contextMenu}
    <CanvasContextMenu
      x={contextMenu.x}
      y={contextMenu.y}
      targetType={contextMenu.type}
      onDelete={handleDelete}
      onRename={handleRename}
      onCreateEntity={handleCreateEntity}
      onClose={() => (contextMenu = null)}
    />
  {/if}

  <CanvasHint />
  <CanvasSelectionModal />

  <EdgeLabelModal
    bind:isOpen={labelModal.isOpen}
    initialValue={labelModal.currentLabel}
    onSave={saveLabelModal}
    onCancel={() => (labelModal.isOpen = false)}
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

  /* Force edges to always render strictly underneath all nodes,
     preventing lines from visibly crossing over a selected node card. */
  :global(.svelte-flow__edges) {
    z-index: 0 !important;
  }

  :global(.svelte-flow__nodes) {
    z-index: 10 !important;
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
    opacity: 0.15 !important;
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
  :global(.svelte-flow__minimap-mask) {
    fill: var(--color-theme-primary) !important;
    fill-opacity: 0.1 !important;
  }
  /* High-visibility for the drafting line */
  :global(.svelte-flow__connectionline) {
    z-index: 20 !important;
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
