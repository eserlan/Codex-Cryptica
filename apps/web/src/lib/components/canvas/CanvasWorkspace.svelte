<script lang="ts">
  import {
    SvelteFlow,
    Background,
    Controls,
    MiniMap,
    ConnectionMode,
  } from "@xyflow/svelte";
  import type { CanvasStore } from "@codex/canvas-engine";
  import { page } from "$app/state";
  import { vault } from "$lib/stores/vault.svelte";
  import { canvasRegistry } from "$lib/stores/canvas-registry.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
  import CanvasHint from "$lib/components/hints/CanvasHint.svelte";
  import ConnectionLine from "./ConnectionLine.svelte";
  import CanvasHUD from "./CanvasHUD.svelte";
  import CanvasRotationToolbar from "./CanvasRotationToolbar.svelte";
  import CanvasDrawingLayers from "./CanvasDrawingLayers.svelte";
  import CanvasAutoPopulationStatus from "./CanvasAutoPopulationStatus.svelte";
  import CanvasContextMenuHost from "./CanvasContextMenuHost.svelte";
  import CanvasEditorPanels from "./CanvasEditorPanels.svelte";
  import { nodeTypes, edgeTypes } from "./canvas-flow-registry";
  import "./canvas-workspace.css";

  import { createCanvasLogic } from "./use-canvas-logic.svelte";
  import { useCanvasEvents } from "./use-canvas-events.svelte";
  import { useCanvasDrawing } from "./hooks/use-canvas-drawing.svelte";
  import { useCanvasNodeRotation } from "./hooks/use-canvas-node-rotation.svelte";
  import { useCanvasSource } from "./hooks/use-canvas-source.svelte";
  import { useCanvasLifecycle } from "./hooks/use-canvas-lifecycle.svelte";
  import { useCanvasFileImport } from "./hooks/use-canvas-file-import.svelte";
  import { useCanvasNodeActions } from "./hooks/use-canvas-node-actions.svelte";
  import { useCanvasInteractions } from "./hooks/use-canvas-interactions.svelte";
  import { useDelveAreaActions } from "./hooks/use-delve-area-actions.svelte";
  import { useDelveDossier } from "./hooks/use-delve-dossier.svelte";
  import { useAdventureNodeSelection } from "./hooks/use-adventure-node-selection.svelte";
  import { useEdgeAttributeEditor } from "./hooks/use-edge-attribute-editor.svelte";

  let { engine }: { engine: CanvasStore } = $props();

  let canvasExportElement = $state<HTMLDivElement>();
  let showMinimap = $state(true);

  const logic = createCanvasLogic(() => engine);
  const source = useCanvasSource({
    logic,
    vault,
    canvasRegistry,
    modalUIStore,
    getSlug: () => page.params.slug,
  });
  const rotationLogic = useCanvasNodeRotation(logic, vault);
  const drawingLogic = useCanvasDrawing(logic);
  const isCanvasToolActive = $derived(
    drawingLogic.isDrawingMode ||
      drawingLogic.isErasingMode ||
      rotationLogic.isRotatingNode,
  );

  useCanvasEvents({
    onQuickSpawn: (id, pos, screenPos) =>
      logic.handleQuickSpawn(id, pos, screenPos),
    onEditLabel: (edgeId, currentLabel) => {
      logic.labelModal = { isOpen: true, edgeId, currentLabel };
    },
    onFlushSave: () => logic.flushSave(),
  });

  const { handleAutoArrange } = useCanvasLifecycle({
    logic,
    canvasRegistry,
    getCanvas: () => source.canvas,
    getCanvasId: () => source.canvasId,
  });
  const dossier = useDelveDossier({
    logic,
    vault,
    getCanvas: () => source.canvas,
    getSourceEntity: () => source.sourceEntity,
    getExportElement: () => canvasExportElement,
  });
  const delveAreas = useDelveAreaActions({
    logic,
    vault,
    canvasRegistry,
    getCanvas: () => source.canvas,
  });
  const adventureSelection = useAdventureNodeSelection(logic);
  const edgeEditor = useEdgeAttributeEditor(logic);
  const nodeActions = useCanvasNodeActions({
    logic,
    getEngine: () => engine,
    vault,
    isExporting: () => dossier.isExporting,
  });
  const fileImport = useCanvasFileImport({
    logic,
    getEngine: () => engine,
    vault,
    isEditableTarget: drawingLogic.isEditableTarget,
  });
  const interactions = useCanvasInteractions({
    logic,
    vault,
    getCanvas: () => source.canvas,
    rotationLogic,
    onSelectRoom: delveAreas.selectRoom,
    onSelectAdventureNode: adventureSelection.select,
  });
</script>

<svelte:window
  onkeydown={drawingLogic.handleDrawingKeydown}
  onpaste={fileImport.handleCanvasPaste}
  onpointermove={rotationLogic.handleRotationPointerMove}
  onpointerup={rotationLogic.finishNodeRotation}
  onpointercancel={rotationLogic.finishNodeRotation}
/>

<div
  class="canvas-container {logic.isConnecting
    ? 'is-connecting'
    : ''} relative w-full h-full overflow-hidden select-none flex flex-col"
>
  <div
    class="flex-1 relative"
    ondragover={fileImport.onDragOver}
    ondrop={fileImport.onDrop}
    onpointerdowncapture={(e) =>
      rotationLogic.beginTouchRotation(
        e,
        drawingLogic.isDrawingMode,
        drawingLogic.isErasingMode,
      )}
    role="region"
    aria-label="Canvas Workspace"
  >
    <CanvasHUD
      canvasName={source.canvas?.name || ""}
      sourceEntityId={source.sourceEntityId}
      sourceEntityTitle={source.sourceEntityTitle}
      sourceEntityType={source.sourceEntity?.type ||
        (source.canvas?.metadata?.kind === "adventure" ? "event" : "location")}
      sourceEntityKind={source.sourceEntity?.kind ||
        (source.canvas?.metadata?.kind as string)}
      dossierEntityId={source.dossierEntityId}
      isFinalizingDossier={dossier.isFinalizing}
      onFinalizeDossier={!vault.isGuest &&
      source.sourceEntity &&
      logic.nodes.some((node) => node.type === "delveRoom")
        ? dossier.finalizeDossier
        : undefined}
      onOpenOrCreateSourceEntity={source.handleOpenOrCreateSourceEntity}
      onAutoArrange={handleAutoArrange}
      {showMinimap}
      onToggleMinimap={() => (showMinimap = !showMinimap)}
      onUploadFiles={!vault.isGuest
        ? fileImport.handleExternalFiles
        : undefined}
      onAddTextNode={!vault.isGuest
        ? () => nodeActions.handleAddTextNode()
        : undefined}
      isDrawingMode={drawingLogic.isDrawingMode}
      isErasingMode={drawingLogic.isErasingMode}
      drawingColor={drawingLogic.drawingColor}
      drawingWidth={drawingLogic.drawingWidth}
      onToggleDrawing={!vault.isGuest
        ? drawingLogic.toggleDrawingMode
        : undefined}
      onToggleErasing={!vault.isGuest
        ? drawingLogic.toggleErasingMode
        : undefined}
      onDrawingColorChange={!vault.isGuest
        ? drawingLogic.handleDrawingColorChange
        : undefined}
      onDrawingWidthChange={!vault.isGuest
        ? drawingLogic.handleDrawingWidthChange
        : undefined}
      onAddAdventureNode={source.isAdventureCanvas
        ? (type) => logic.handleAddAdventureNode(type)
        : undefined}
      activeCategories={logic.activeCategories}
      onToggleCategory={logic.toggleCategoryFilter}
      onClearCategories={logic.clearCategoryFilters}
    />

    <div class="absolute inset-0" bind:this={canvasExportElement}>
      <SvelteFlow
        nodes={nodeActions.filteredNodes}
        bind:edges={logic.edges}
        {nodeTypes}
        {edgeTypes}
        onconnect={!vault.isGuest ? logic.onConnect : undefined}
        onreconnect={!vault.isGuest ? logic.onReconnect : undefined}
        onconnectstart={interactions.onConnectStart}
        onconnectend={interactions.onConnectEnd}
        onnodecontextmenu={interactions.onNodeContextMenu}
        onnodeclick={interactions.onNodeClick}
        onpaneclick={interactions.onPaneClick}
        onnodedragstop={interactions.onNodeDragStop}
        onedgecontextmenu={interactions.onEdgeContextMenu}
        onedgeclick={interactions.onEdgeClick}
        onpanecontextmenu={interactions.onPaneContextMenu}
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
        <CanvasRotationToolbar {rotationLogic} />
        <CanvasDrawingLayers {logic} {drawingLogic} />
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

    <CanvasAutoPopulationStatus
      isPopulating={delveAreas.isAutoPopulating}
      completed={delveAreas.autoPopulationCompleted}
      total={delveAreas.autoPopulationTotal}
      message={delveAreas.autoPopulationMessage}
    />
  </div>

  <CanvasContextMenuHost
    {logic}
    {nodeActions}
    {vault}
    isAdventure={source.isAdventureCanvas}
    onPasteFromClipboard={fileImport.handlePasteFromClipboard}
  />

  <CanvasHint />
  <CanvasEditorPanels {logic} {delveAreas} {adventureSelection} {edgeEditor} />
</div>

<style>
  .canvas-container {
    background-color: var(--color-bg-primary);
    background-image: var(--bg-texture-overlay);
    background-repeat: repeat;
    background-position: top left;
    background-attachment: fixed;
  }
</style>
