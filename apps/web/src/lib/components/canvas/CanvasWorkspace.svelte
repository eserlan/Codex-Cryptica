<script lang="ts">
  import ConnectionLine from "./ConnectionLine.svelte";
  import {
    SvelteFlow,
    Background,
    Controls,
    MiniMap,
    ConnectionMode,
  } from "@xyflow/svelte";
  import { CanvasStore } from "@codex/canvas-engine";
  import { vault } from "$lib/stores/vault.svelte";
  import { canvasRegistry } from "$lib/stores/canvas-registry.svelte";
  import EntityNode from "$lib/components/canvas/EntityNode.svelte";
  import CanvasSelectionModal from "$lib/components/canvas/CanvasSelectionModal.svelte";
  import CanvasContextMenu from "$lib/components/canvas/CanvasContextMenu.svelte";
  import CustomEdge from "$lib/components/canvas/CustomEdge.svelte";
  import EdgeLabelModal from "$lib/components/canvas/EdgeLabelModal.svelte";
  import CanvasHint from "$lib/components/hints/CanvasHint.svelte";
  import CanvasHUD from "./CanvasHUD.svelte";
  import { page } from "$app/state";

  import { createCanvasLogic } from "./use-canvas-logic.svelte";
  import { useCanvasEvents } from "./use-canvas-events.svelte";
  import { connectionModeStore } from "$lib/stores/ui/connection-mode.svelte";
  import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";

  let { engine }: { engine: CanvasStore } = $props();

  const canvasSlug = $derived(page.params.slug);
  const canvas = $derived(
    canvasRegistry.allCanvases.find(
      (c) => c.slug === canvasSlug || c.id === canvasSlug,
    ),
  );
  const canvasId = $derived(canvas?.id);

  const logic = createCanvasLogic(engine);

  useCanvasEvents({
    onQuickSpawn: (id, pos, screenPos) =>
      logic.handleQuickSpawn(id, pos, screenPos),
    onEditLabel: (edgeId, currentLabel) => {
      logic.labelModal = { isOpen: true, edgeId, currentLabel };
    },
    onFlushSave: () => logic.flushSave(),
  });

  const filteredNodes = $derived.by(() => {
    if (logic.activeCategories.size === 0) return logic.nodes;
    return logic.nodes.filter((n) =>
      logic.activeCategories.has(n.data?.type as string),
    );
  });

  const nodeTypes = {
    entity: EntityNode,
  };

  const edgeTypes = {
    straight: CustomEdge,
    smoothstep: CustomEdge,
  };

  // Initialization & Lifecycle
  $effect(() => {
    if (canvasId) {
      logic.initializeCanvas(canvasId);
    }
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
    if (vault.isGuest) return;
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
  }

  function onDrop(event: DragEvent) {
    if (vault.isGuest) return;
    event.preventDefault();
    const entityId = event.dataTransfer?.getData("application/codex-entity");
    if (!entityId) return;

    const position = logic.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });
    logic.handleQuickSpawn(entityId, position);
  }

  $effect(() => {
    return () => {
      logic.flushSave();
    };
  });
</script>

<div
  class="canvas-container {logic.isConnecting
    ? 'is-connecting'
    : ''} flex h-[calc(100vh-var(--header-height,65px))] w-full overflow-hidden relative"
  tabindex="-1"
  role="none"
>
  <div
    class="flex-1 relative"
    ondragover={onDragOver}
    ondrop={onDrop}
    role="region"
    aria-label="Canvas Workspace"
  >
    <CanvasHUD
      canvasName={canvas?.name || ""}
      activeCategories={logic.activeCategories}
      onToggleCategory={logic.toggleCategoryFilter}
      onClearCategories={logic.clearCategoryFilters}
    />

    <SvelteFlow
      nodes={filteredNodes}
      bind:edges={logic.edges}
      {nodeTypes}
      {edgeTypes}
      onconnect={!vault.isGuest ? logic.onConnect : undefined}
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
      onedgecontextmenu={onEdgeContextMenu}
      onedgeclick={onEdgeClick}
      onpanecontextmenu={handlePaneContextMenu}
      defaultEdgeOptions={{ type: "straight" }}
      connectionMode={ConnectionMode.Loose}
      zoomOnDoubleClick={false}
      proOptions={{ hideAttribution: true }}
      connectionLineComponent={ConnectionLine}
      minZoom={0.01}
      maxZoom={9}
      fitView
    >
      <Background gap={20} />
      {#if !sessionModeStore.isGuestMode}
        <Controls />
      {/if}
      <MiniMap position="top-right" nodeColor="var(--color-theme-primary)" />
    </SvelteFlow>
  </div>

  {#if logic.contextMenu}
    <CanvasContextMenu
      x={logic.contextMenu.x}
      y={logic.contextMenu.y}
      targetId={logic.contextMenu?.id}
      targetType={logic.contextMenu.type}
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
      onClose={() => (logic.contextMenu = null)}
    />
  {/if}

  <CanvasHint />
  <CanvasSelectionModal />

  <EdgeLabelModal
    bind:isOpen={logic.labelModal.isOpen}
    initialValue={logic.labelModal.currentLabel}
    onSave={logic.saveLabelModal}
    onCancel={() => (logic.labelModal.isOpen = false)}
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
  :global(.svelte-flow__minimap-mask) {
    fill: var(--color-theme-primary) !important;
    fill-opacity: 0.1 !important;
  }
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
