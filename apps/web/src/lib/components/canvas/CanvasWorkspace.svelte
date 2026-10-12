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
  import { notificationStore } from "$lib/stores/ui/notification.svelte";
  import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
  import ConnectionLine from "./ConnectionLine.svelte";
  import CanvasHUD from "./CanvasHUD.svelte";
  import CanvasRotationToolbar from "./CanvasRotationToolbar.svelte";
  import CanvasDrawingLayers from "./CanvasDrawingLayers.svelte";
  import CanvasAutoPopulationStatus from "./CanvasAutoPopulationStatus.svelte";
  import CanvasContextMenuHost from "./CanvasContextMenuHost.svelte";
  import CanvasEditorPanels from "./CanvasEditorPanels.svelte";
  import { nodeTypes, edgeTypes } from "./canvas-flow-registry";
  import { when } from "./canvas-guard";
  import "./canvas-workspace.css";

  import { createCanvasLogic } from "./use-canvas-logic.svelte";
  import { useCanvasEvents } from "./use-canvas-events.svelte";
  import { useCanvasAreaEnhancement } from "./canvas-area-enhancement.svelte";
  import { createCanvasDropHandlers } from "./canvas-drop-handlers";
  import {
    canGenerateCanvasReport,
    openCanvasReport,
  } from "./open-canvas-report";
  import { useCanvasDrawing } from "./hooks/use-canvas-drawing.svelte";
  import { useCanvasNodeRotation } from "./hooks/use-canvas-node-rotation.svelte";
  import { useCanvasContextMenu } from "./hooks/use-canvas-context-menu.svelte";
  import { useCanvasFileImport } from "./hooks/use-canvas-file-import.svelte";
  import { useCanvasSource } from "./hooks/use-canvas-source.svelte";
  import { useCanvasLifecycle } from "./hooks/use-canvas-lifecycle.svelte";
  import { useCanvasNodeActions } from "./hooks/use-canvas-node-actions.svelte";
  import { useCanvasInteractions } from "./hooks/use-canvas-interactions.svelte";
  import { useCanvasDossier } from "./hooks/use-canvas-dossier.svelte";
  import { useDelveRoomSelection } from "./hooks/use-delve-room-selection.svelte";
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
  const contextMenuLogic = useCanvasContextMenu(logic, vault);
  const isCanvasToolActive = $derived(
    drawingLogic.isDrawingMode ||
      drawingLogic.isErasingMode ||
      rotationLogic.isRotatingNode,
  );

  const fileImport = useCanvasFileImport({
    vault,
    engine: {
      addFileNode: (file, position) => engine.addFileNode(file, position),
    },
    logic,
    isEditableTarget: drawingLogic.isEditableTarget,
    notify: (message, level) => notificationStore.notify(message, level),
    setNodes: (updater) => {
      logic.nodes = updater(logic.nodes);
    },
  });
  const dropHandlers = createCanvasDropHandlers({
    isGuest: () => vault.isGuest,
    handleExternalFiles: (files, position) =>
      fileImport.handleExternalFiles(files, position),
    screenToFlowPosition: (position) => logic.screenToFlowPosition(position),
    handleQuickSpawn: (entityId, position) =>
      logic.handleQuickSpawn(entityId, position),
  });

  const roomSelection = useDelveRoomSelection(logic);
  const adventureSelection = useAdventureNodeSelection(logic);
  const edgeEditor = useEdgeAttributeEditor(logic);
  const areaEnhancement = useCanvasAreaEnhancement({
    vault,
    canvasRegistry,
    logic,
    updateRoomData: roomSelection.saveRoomData,
  });
  const dossier = useCanvasDossier({
    logic,
    vault,
    getCanvas: () => source.canvas,
    getSourceEntity: () => source.sourceEntity,
    getExportElement: () => canvasExportElement,
  });
  const nodeActions = useCanvasNodeActions({
    logic,
    getEngine: () => engine,
    vault,
    getCanvas: () => source.canvas,
    isExporting: () => dossier.isExporting,
  });
  const { handleAutoArrange } = useCanvasLifecycle({
    logic,
    vault,
    canvasRegistry,
    getCanvas: () => source.canvas,
    getCanvasId: () => source.canvasId,
    populateCanvasAreas: (canvas) =>
      areaEnhancement.populateCanvasAreas(canvas),
  });
  const interactions = useCanvasInteractions({
    logic,
    vault,
    getCanvas: () => source.canvas,
    rotationLogic,
    onSelectRoom: (nodeId) => {
      areaEnhancement.clearRoomEnhancementError();
      roomSelection.select(nodeId);
    },
    onSelectAdventureNode: adventureSelection.select,
  });

  useCanvasEvents({
    onQuickSpawn: (id, pos, screenPos) =>
      logic.handleQuickSpawn(id, pos, screenPos),
    onEditLabel: (edgeId, currentLabel) => {
      logic.labelModal = { isOpen: true, edgeId, currentLabel };
    },
    onFlushSave: () => logic.flushSave(),
  });

  const canReport = $derived(
    canGenerateCanvasReport(source.canvas, logic.nodes),
  );
  const canEdit = $derived(!vault.isGuest);
  const canFinalizeDossier = $derived(
    canEdit &&
      Boolean(source.sourceEntity) &&
      logic.nodes.some((node) => node.type === "delveRoom"),
  );
  const sourceEntityType = $derived(
    source.sourceEntity?.type ||
      (source.canvas?.metadata?.kind === "adventure" ? "event" : "location"),
  );
  const sourceEntityKind = $derived(
    source.sourceEntity?.kind || (source.canvas?.metadata?.kind as string),
  );
  const generateReport = $derived(
    canReport && source.canvas
      ? () =>
          openCanvasReport(
            source.canvas!,
            () => logic.nodes,
            () => logic.edges,
          )
      : undefined,
  );
  const addAdventureNode = (
    type: Parameters<typeof logic.handleAddAdventureNode>[0],
  ) => logic.handleAddAdventureNode(type);
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
    ondragover={dropHandlers.onDragOver}
    ondrop={dropHandlers.onDrop}
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
      {sourceEntityType}
      {sourceEntityKind}
      dossierEntityId={source.dossierEntityId}
      isFinalizingDossier={dossier.isFinalizing}
      onFinalizeDossier={when(canFinalizeDossier, dossier.finalizeDossier)}
      onOpenOrCreateSourceEntity={source.handleOpenOrCreateSourceEntity}
      onAutoArrange={handleAutoArrange}
      onGenerateReport={generateReport}
      isAllImageOnly={nodeActions.isAllImageOnly}
      onToggleAllImageOnly={when(
        nodeActions.hasEntityNodes && canEdit,
        nodeActions.handleToggleAllImageOnly,
      )}
      showImageLabels={nodeActions.showImageLabels}
      onToggleShowImageLabels={when(
        nodeActions.hasEntityNodes,
        nodeActions.handleToggleShowImageLabels,
      )}
      {showMinimap}
      onToggleMinimap={() => (showMinimap = !showMinimap)}
      onUploadFiles={when(canEdit, fileImport.handleExternalFiles)}
      onAddTextNode={when(canEdit, () => nodeActions.handleAddTextNode())}
      isDrawingMode={drawingLogic.isDrawingMode}
      isErasingMode={drawingLogic.isErasingMode}
      drawingColor={drawingLogic.drawingColor}
      drawingWidth={drawingLogic.drawingWidth}
      onToggleDrawing={when(canEdit, drawingLogic.toggleDrawingMode)}
      onToggleErasing={when(canEdit, drawingLogic.toggleErasingMode)}
      onDrawingColorChange={when(
        canEdit,
        drawingLogic.handleDrawingColorChange,
      )}
      onDrawingWidthChange={when(
        canEdit,
        drawingLogic.handleDrawingWidthChange,
      )}
      onAddAdventureNode={when(source.isAdventureCanvas, addAdventureNode)}
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
        onconnect={when(canEdit, logic.onConnect)}
        onreconnect={when(canEdit, logic.onReconnect)}
        onconnectstart={interactions.onConnectStart}
        onconnectend={interactions.onConnectEnd}
        onnodecontextmenu={contextMenuLogic.onNodeContextMenu}
        onnodeclick={interactions.onNodeClick}
        onpaneclick={interactions.onPaneClick}
        onnodedragstop={interactions.onNodeDragStop}
        onedgecontextmenu={contextMenuLogic.onEdgeContextMenu}
        onedgeclick={interactions.onEdgeClick}
        onpanecontextmenu={contextMenuLogic.handlePaneContextMenu}
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
      isPopulating={areaEnhancement.isAutoPopulating}
      completed={areaEnhancement.autoPopulationCompleted}
      total={areaEnhancement.autoPopulationTotal}
      message={areaEnhancement.autoPopulationMessage}
    />
  </div>

  <CanvasContextMenuHost
    {logic}
    {nodeActions}
    {contextMenuLogic}
    {vault}
    isAdventure={source.isAdventureCanvas}
    onPasteFromClipboard={fileImport.handlePasteFromClipboard}
  />

  <CanvasEditorPanels
    {logic}
    canvas={source.canvas}
    {areaEnhancement}
    {roomSelection}
    {adventureSelection}
    {edgeEditor}
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
</style>
