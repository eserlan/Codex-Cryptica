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
  import { handleGraphDeleteShortcut } from "./graph/graph-keyboard";
  import { DEFAULT_SEARCH_ENTITY_ZOOM } from "./search/search-focus";
  import { layoutUIStore } from "$lib/stores/ui/layout-ui.svelte";
  import { connectionModeStore } from "$lib/stores/ui/connection-mode.svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";
  import { GraphViewController } from "./graph/graph-view-controller.svelte";

  let { selectedId = $bindable(null) } = $props<{
    selectedId: string | null;
  }>();

  const controller = new GraphViewController({ selectedId });

  // Sync selectedId back and forth
  $effect(() => {
    selectedId = controller.selectedId;
  });
  $effect(() => {
    untrack(() => {
      controller.selectedId = selectedId;
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
    if (controller.hoveredEntityId)
      vault.loadEntityContent(controller.hoveredEntityId);
  });

  const handleKeyDown = async (e: KeyboardEvent) => {
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
    controller.init(container, graphStyle);
  });

  onDestroy(() => {
    controller.destroy();
  });

  // Mode change triggers
  $effect(() => {
    void graph.orbitMode;
    void graph.centralNodeId;
    void graph.timelineMode;
    untrack(() => controller.handleModeChange());
  });

  // Vault loading triggers
  $effect(() => {
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
    untrack(() => controller.handleVaultLoadFinalization());
  });

  // Element Sync
  $effect(() => {
    void graph.elements;
    void graph.activeLabels;
    void graph.labelFilterMode;
    void graph.activeCategories;
    untrack(() => controller.syncElements());
  });

  // Selection & Search Focus
  $effect(() => {
    void controller.pendingSearchFocusRevision;
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
          untrack(() =>
            currentCy.animate({
              center: { eles: node },
              ...(focusZoom !== null ? { zoom: focusZoom } : {}),
              duration: 800,
              easing: "ease-out-cubic",
            }),
          );
          if (focusZoom !== null) {
            controller.pendingSearchFocus = null;
          }
        } else if (
          controller.pendingSearchFocus?.entityId === currentSelectedId
        ) {
          controller.pendingSearchFocus = null;
        }
      } else if (controller.pendingSearchFocus) {
        controller.pendingSearchFocus = null;
      }
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
        currentCy.center(node);
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
</script>

<div
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
    class="w-full h-full {controller.graphVisible
      ? 'opacity-100'
      : 'opacity-0'} transition-opacity duration-1000"
  ></div>

  <GraphTooltip {hoveredEntity} hoverPosition={controller.hoverPosition} />
  <EdgeEditorModal bind:editingEdge={controller.editingEdge} />

  {#if controller.cy}
    <ContextMenu cy={controller.cy} />
    <SelectionConnector cy={controller.cy} />
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
