<script lang="ts">
  import { onMount, onDestroy, untrack } from "svelte";
  import { graph } from "$lib/stores/graph.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { categories } from "$lib/stores/categories.svelte";
  import { getGraphStyles } from "graph-engine";

  import { themeStore } from "$lib/stores/theme.svelte";
  import OrbitControls from "$lib/components/graph/OrbitControls.svelte";
  import ContextMenu from "$lib/components/graph/ContextMenu.svelte";
  import SelectionConnector from "$lib/components/graph/SelectionConnector.svelte";
  import FeatureHint from "$lib/components/help/FeatureHint.svelte";
  import GraphTooltip from "./graph/GraphTooltip.svelte";
  import EdgeEditorModal from "./graph/EdgeEditorModal.svelte";
  import GraphHUD from "./graph/GraphHUD.svelte";
  import GraphToolbar from "./graph/GraphToolbar.svelte";
  import ChronologyDragIndicator from "./graph/ChronologyDragIndicator.svelte";
  import SemanticPlacementPopover from "./graph/SemanticPlacementPopover.svelte";
  import { handleGraphDeleteShortcut } from "./graph/graph-keyboard";
  import { DEFAULT_SEARCH_ENTITY_ZOOM } from "./search/search-focus";
  import { layoutUIStore } from "$lib/stores/ui/layout-ui.svelte";
  import { connectionModeStore } from "$lib/stores/ui/connection-mode.svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { debugStore } from "$lib/stores/debug.svelte";
  import { GraphViewController } from "./graph/graph-view-controller.svelte";
  import { createHoverContentLoader } from "./graph/hover-content-loader";
  import EmptyState from "$lib/components/ui/EmptyState.svelte";
  import { chronologyEdit } from "$lib/stores/chronology-edit.svelte";
  import type { TemporalMeaning } from "chronology-engine";
  import type { TemporalMetadata } from "schema";

  type ChronologyPlacementSave = {
    meaning: TemporalMeaning;
    date?: TemporalMetadata;
    start_date?: TemporalMetadata;
    end_date?: TemporalMetadata;
    customLabel?: string;
    existingAnchorId?: string;
    createNewAnchor?: boolean;
    createEvent?: boolean;
    eventTitle?: string;
  };

  let { selectedId = $bindable(null) } = $props<{
    selectedId: string | null;
  }>();

  const controller = new GraphViewController(
    { selectedId: untrack(() => selectedId) },
    {
      graph,
      vault,
      debugStore,
      layoutUIStore,
      connectionModeStore,
      modalUIStore,
    },
  );

  let resizeObserver: ResizeObserver | undefined;
  const hoverContentLoader = createHoverContentLoader((entityId) =>
    vault.loadEntityContent(entityId),
  );

  // Sync prop -> controller
  $effect(() => {
    const currentPropId = selectedId;
    untrack(() => {
      if (controller.selectedId !== currentPropId) {
        controller.selectedId = currentPropId;
      }
    });
  });

  // Sync controller -> prop
  $effect(() => {
    const currentControllerId = controller.selectedId;
    untrack(() => {
      if (selectedId !== currentControllerId) {
        selectedId = currentControllerId;
      }
    });
  });

  let container: HTMLElement;

  let graphStyle = $derived(
    getGraphStyles(
      themeStore.activeTheme,
      categories.list,
      graph.showImages,
      graph.timelineMode,
      graph.showLabels,
    ),
  );

  $effect(() => {
    hoverContentLoader.schedule(controller.hoveredEntityId);
  });

  const handleKeyDown = async (e: KeyboardEvent) => {
    if (e.key === "Escape" && chronologyEdit.pendingIntent) {
      controller.restoreChronologyDragOrigin();
      chronologyEdit.cancel();
      return;
    }

    const handledDelete = await handleGraphDeleteShortcut(e, {
      cy: controller.cy,
      selectedId: controller.selectedId,
      isGuest: vault.isGuest,
      confirm: (params) => notificationStore.confirm(params),
      deleteEntity: (id) => vault.deleteEntity(id),
      clearSelectedId: () => {
        controller.selectedId = null;
      },
    });

    if (handledDelete) return;

    const target = document.activeElement;
    if (
      target?.tagName === "INPUT" ||
      target?.tagName === "TEXTAREA" ||
      (target as HTMLElement)?.isContentEditable
    )
      return;

    if (e.key.toLowerCase() === "t" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      graph.toggleTimeline();
      controller.applyCurrentLayout(false, true, "Keyboard Shortcut (T)");
    }
    if (e.key.toLowerCase() === "c" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (!vault.isGuest) {
        if (controller.selectedCount === 2) {
          connectionModeStore.showSelectionConnector =
            !connectionModeStore.showSelectionConnector;
        } else {
          connectionModeStore.toggleConnectMode();
        }
      }
    }
    if (e.key.toLowerCase() === "l" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      graph.toggleLabels();
    }
    if (e.key.toLowerCase() === "i" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      graph.toggleImages();
    }
    if (e.key === "Escape" && connectionModeStore.isConnecting) {
      connectionModeStore.toggleConnectMode();
    }
  };

  onMount(() => {
    void graph.init();
    controller.init(container, graphStyle);
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        if (controller.cy) {
          controller.cy.resize();
        }
      });
      resizeObserver.observe(container);
    }
  });

  onDestroy(() => {
    hoverContentLoader.cancel();
    if (resizeObserver) {
      resizeObserver.disconnect();
    }
    controller.destroy();
  });

  // Mode change triggers
  $effect(() => {
    void graph.orbitMode;
    void graph.centralNodeId;
    void graph.timelineMode;
    void controller.cy;
    untrack(() => controller.handleModeChange());
  });

  // Vault loading triggers
  $effect(() => {
    void vault.status;
    void vault.allEntities.length;
    untrack(() => controller.handleVaultLoading());
  });

  // Style sync
  let activeStyleJson = "";
  $effect(() => {
    const currentStyle = graphStyle;
    if (controller.cy && currentStyle) {
      const styleJson = JSON.stringify(currentStyle);
      if (styleJson !== activeStyleJson) {
        activeStyleJson = styleJson;
        untrack(() => {
          controller.cy!.style(currentStyle);
        });
      }
    }
  });

  // Load Finalization
  $effect(() => {
    void vault.status;
    void controller.initialLoaded;
    void controller.didFinalizeLoad;
    void controller.cy;
    untrack(() => controller.handleVaultLoadFinalization());
  });

  // Element Sync
  $effect(() => {
    void graph.elements;
    void graph.activeLabels;
    void graph.labelFilterMode;
    void graph.activeCategories;
    void controller.cy;
    untrack(() => controller.syncElements());
  });

  function centerOnNode(
    node: any,
    animate = true,
    customZoom: number | null = null,
  ) {
    const currentCy = controller.cy;
    if (!currentCy) return;

    const targetZoom = customZoom !== null ? customZoom : currentCy.zoom();
    const nodePos = node.position();

    // Adjust for desktop sidebar offset to center in the remaining visible area only if open
    const isSidebarVisible = !!vault.selectedEntityId;
    const sidebarWidth =
      !layoutUIStore.isMobile &&
      isSidebarVisible &&
      layoutUIStore.rightSidebarWidth
        ? layoutUIStore.rightSidebarWidth
        : 0;

    const targetPanX =
      (currentCy.width() - sidebarWidth) / 2 - targetZoom * nodePos.x;
    const targetPanY = currentCy.height() / 2 - targetZoom * nodePos.y;

    if (animate) {
      currentCy.animate({
        pan: { x: targetPanX, y: targetPanY },
        zoom: targetZoom,
        duration: 800,
        easing: "ease-out-cubic",
      });
    } else {
      currentCy.viewport({
        zoom: targetZoom,
        pan: { x: targetPanX, y: targetPanY },
      });
    }
  }

  // Selection & Search Focus
  $effect(() => {
    void controller.pendingSearchFocus;
    const currentCy = controller.cy;
    const currentSelectedId = controller.selectedId;
    if (currentCy) {
      controller.applyFocus(currentSelectedId);
      if (currentSelectedId) {
        const node = currentCy.$id(currentSelectedId);
        if (node.length > 0) {
          const focusZoom =
            controller.pendingSearchFocus?.entityId === currentSelectedId
              ? (controller.pendingSearchFocus?.zoom ??
                DEFAULT_SEARCH_ENTITY_ZOOM)
              : null;
          untrack(() => {
            centerOnNode(node, true, focusZoom);

            // Stop animations and clear custom style bypasses on all nodes to prevent sticky/leaky highlight styles
            currentCy.nodes().stop();
            currentCy.nodes().removeStyle();

            // Capture original stylesheet values before running override animations
            const origPadding =
              node.style("underlay-padding") !== undefined
                ? node.style("underlay-padding")
                : 8;
            const origOpacity =
              node.style("underlay-opacity") !== undefined
                ? node.style("underlay-opacity")
                : 0.3;

            node.animate(
              {
                style: {
                  "underlay-padding": 24,
                  "underlay-opacity": 0.5,
                },
              },
              {
                duration: 250,
                easing: "ease-out",
                complete: () => {
                  node.animate(
                    {
                      style: {
                        "underlay-padding": origPadding,
                        "underlay-opacity": origOpacity,
                      },
                    },
                    {
                      duration: 250,
                      easing: "ease-in",
                      complete: () => {
                        // Crucial: remove override styles so they don't persist on node deselection!
                        node.removeStyle();
                      },
                    },
                  );
                },
              },
            );
          });
          if (focusZoom !== null) {
            controller.pendingSearchFocus = null;
          }
        } else if (
          controller.pendingSearchFocus?.entityId === currentSelectedId
        ) {
          controller.pendingSearchFocus = null;
        }
      } else {
        // No node is selected, clear any active node overrides and animations
        untrack(() => {
          currentCy.nodes().stop();
          currentCy.nodes().removeStyle();
          currentCy.$("node:selected").unselect();
        });
        if (controller.pendingSearchFocus) {
          controller.pendingSearchFocus = null;
        }
      }
    }
  });

  // Connect Mode Visual Cleanup
  $effect(() => {
    if (!connectionModeStore.isConnecting && controller.cy) {
      controller.cy.$(".selected-source").removeClass("selected-source");
    }
  });

  // Find Node centering
  $effect(() => {
    const currentCy = controller.cy;
    const findCounter = layoutUIStore.findNodeCounter;
    const currentSelectedId = controller.selectedId;
    if (!currentCy || !currentSelectedId) return;

    const node = currentCy.$id(currentSelectedId);
    if (node.length === 0) return;

    if (findCounter >= 0) {
      untrack(() => {
        centerOnNode(node, false);
      });
    }
  });

  // Fit request
  $effect(() => {
    const currentCy = controller.cy;
    if (currentCy && graph.fitRequest > 0) {
      untrack(() =>
        currentCy.animate({
          fit: { eles: currentCy.elements(), padding: 20 },
          duration: 800,
          easing: "ease-out-cubic",
        }),
      );
    }
  });

  // Image Sync
  $effect(() => {
    void graph.elements;
    void graph.showImages;
    void controller.cy;
    untrack(() => controller.syncImages());
  });

  let selectedEntity = $derived(
    controller.selectedId ? vault.entities[controller.selectedId] : null,
  );
  let parentEntity = $derived(
    controller.selectedId
      ? vault.inboundConnections[controller.selectedId]?.[0]?.sourceId
        ? vault.entities[
            vault.inboundConnections[controller.selectedId][0].sourceId
          ]
        : null
      : null,
  );
  let hoveredEntity = $derived(
    controller.hoveredEntityId
      ? vault.entities[controller.hoveredEntityId]
      : null,
  );
  let hasNoEntities = $derived(
    vault.isInitialized &&
      vault.status !== "loading" &&
      vault.allEntities.length === 0,
  );

  let pendingPlacementEntity = $derived(
    chronologyEdit.pendingEntity
      ? (vault.entities[chronologyEdit.pendingEntity.id] ??
          chronologyEdit.pendingEntity)
      : null,
  );
  let pendingPlacementAnchor = $derived(
    pendingPlacementEntity && chronologyEdit.drag?.anchorId
      ? pendingPlacementEntity.temporalAnchors?.find(
          (anchor) => anchor.id === chronologyEdit.drag?.anchorId,
        )
      : undefined,
  );
  let pendingLinkedEntityTitle = $derived(
    pendingPlacementAnchor?.linkedEntityId
      ? (vault.entities[pendingPlacementAnchor.linkedEntityId]?.title ?? null)
      : null,
  );
  let chronologyPopoverPosition = $derived(
    controller.getChronologyPopoverPosition(),
  );

  async function saveChronologyPlacement(detail: ChronologyPlacementSave) {
    const entity = pendingPlacementEntity;
    if (!entity) return;
    chronologyEdit.buildSemanticIntent({
      ...detail,
      entity,
    });
    const saved = await chronologyEdit.confirm(entity);
    if (saved) {
      await controller.applyCurrentLayout(false, true, "Chronology Edit Save");
    }
  }

  function cancelChronologyPlacement() {
    controller.restoreChronologyDragOrigin();
    chronologyEdit.cancel();
  }

  async function removeChronologyAnchor(anchorId: string) {
    const entity = pendingPlacementEntity;
    if (!entity) return;
    const removed = await chronologyEdit.removeAnchor(entity, anchorId);
    if (removed) {
      await controller.applyCurrentLayout(
        false,
        true,
        "Chronology Anchor Remove",
      );
    }
  }

  function handleCanvasDragover(event: DragEvent) {
    if (!graph.chronologyEditMode) return;
    if (!event.dataTransfer?.types.includes("application/codex-entity")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  function handleCanvasDrop(event: DragEvent) {
    if (!graph.chronologyEditMode) return;
    const entityId = event.dataTransfer?.getData("application/codex-entity");
    if (!entityId) return;
    event.preventDefault();
    controller.beginExplorerChronologyPlacement(entityId, {
      x: event.clientX,
      y: event.clientY,
    });
  }
</script>

<div
  data-testid="graph-view-root"
  class="absolute inset-0 w-full h-full bg-theme-bg overflow-hidden shadow-2xl border-y border-theme-border/30"
>
  <div
    class="absolute inset-0 pointer-events-none opacity-20"
    style="background-image: radial-gradient(var(--color-theme-secondary) 1px, transparent 1px); background-size: 30px 30px;"
  ></div>

  <GraphHUD
    {selectedEntity}
    {parentEntity}
    selectedId={controller.selectedId}
    isLayoutRunning={controller.isLayoutRunning}
    cy={controller.cy}
  />

  <GraphToolbar
    cy={controller.cy}
    isLayoutRunning={controller.isLayoutRunning}
    onApplyLayout={controller.applyCurrentLayout}
    selectedCount={controller.selectedCount}
  />

  <OrbitControls />

  <div
    bind:this={container}
    data-testid="graph-canvas"
    role="application"
    aria-label="Graph canvas"
    ondragover={handleCanvasDragover}
    ondrop={handleCanvasDrop}
    class="w-full h-full {controller.graphVisible
      ? 'opacity-100'
      : 'opacity-0'} transition-opacity duration-1000"
  ></div>

  <GraphTooltip {hoveredEntity} hoverPosition={controller.hoverPosition} />
  <ChronologyDragIndicator
    service={chronologyEdit}
    x={controller.hoverPosition?.x ?? 24}
    y={(controller.hoverPosition?.y ?? 24) + 32}
  />
  <EdgeEditorModal bind:editingEdge={controller.editingEdge} />

  {#if chronologyEdit.pendingIntent && pendingPlacementEntity && chronologyEdit.drag}
    <div class="pointer-events-auto">
      <SemanticPlacementPopover
        entity={pendingPlacementEntity}
        targetYear={chronologyEdit.drag.targetYear}
        existingAnchorId={chronologyEdit.drag.anchorId}
        anchorPosition={chronologyPopoverPosition}
        linkedEntityTitle={pendingLinkedEntityTitle}
        conflict={chronologyEdit.conflict}
        onSave={saveChronologyPlacement}
        onRemove={removeChronologyAnchor}
        onCancel={cancelChronologyPlacement}
      />
    </div>
  {/if}

  {#if controller.cy}
    <ContextMenu cy={controller.cy} />
    <SelectionConnector cy={controller.cy} />
  {/if}
  {#if hasNoEntities}
    <div
      class="absolute inset-0 flex items-center justify-center pointer-events-none"
      data-testid="graph-empty-state"
    >
      <EmptyState
        icon="icon-[lucide--network]"
        headline="Your graph is empty"
        body="Add entities in the explorer to see them appear here."
      />
    </div>
  {/if}

  <FeatureHint hintId="graph-controls" />
  {#if controller.selectedCount === 2}
    <div class="fixed top-20 right-4 z-[60]" data-testid="node-merging-hint">
      <FeatureHint hintId="node-merging" />
    </div>
  {/if}
  {#if connectionModeStore.isConnecting}
    <FeatureHint hintId="connect-mode" />
  {/if}
  {#if graph.chronologyEditMode}
    <FeatureHint hintId="edit-chronology" />
  {/if}
</div>

<svelte:window onkeydown={handleKeyDown} />

<style>
  :global(.selected-source) {
    box-shadow: 0 0 20px #facc15;
    z-index: 1000 !important;
  }

  /* Discovery Pulse Animation */
  @keyframes discovery-pulse {
    0% {
      opacity: 0.15;
    }
    50% {
      opacity: 0.35;
    }
    100% {
      opacity: 0.15;
    }
  }

  :global(node[status="draft"]) {
    animation: discovery-pulse 2s infinite ease-in-out;
  }
</style>
