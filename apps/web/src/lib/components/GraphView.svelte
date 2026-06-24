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
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { debugStore } from "$lib/stores/debug.svelte";
  import { GraphViewController } from "./graph/graph-view-controller.svelte";
  import { createHoverContentLoader } from "./graph/hover-content-loader";
  import EmptyState from "$lib/components/ui/EmptyState.svelte";
  import { onboardingStore } from "$lib/stores/ui/onboarding.svelte";
  import { fly } from "svelte/transition";

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

  const COACH_MARKS = [
    {
      id: "activity-bar",
      icon: "icon-[lucide--layout-grid]",
      title: "Views & tools",
      body: "Switch between Graph, Map, Canvas and more from the bar at the bottom.",
    },
    {
      id: "graph-fab",
      icon: "icon-[lucide--sliders-horizontal]",
      title: "Graph controls",
      body: "The dark button opens layout, filters, and display options for the graph.",
    },
    {
      id: "graph-search",
      icon: "icon-[lucide--search]",
      title: "Find anything",
      body: "Tap the search icon to jump to any entity by name.",
    },
  ] as const;

  let coachStep = $state(0);
  const showCoachMarks = $derived(
    layoutUIStore.isMobile && !onboardingStore.dismissedMobileGraphCoachMarks,
  );

  function nextCoachMark() {
    if (coachStep < COACH_MARKS.length - 1) {
      coachStep++;
    } else {
      onboardingStore.dismissMobileGraphCoachMarks();
    }
  }

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
      controller.applyCurrentLayout({
        reason: "Keyboard Shortcut (T)",
        isForced: true,
      });
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

  // Vault load state machine (loading reset + finalization in one effect)
  $effect(() => {
    void vault.status;
    void vault.allEntities.length;
    void vault.activeVaultId;
    void controller.loadPhase;
    void controller.cy;
    untrack(() => controller.reconcileLoadState());
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

  // When focus mode takes over from outside the graph, clear stale graph
  // selection and dimming so both views don't claim ownership simultaneously.
  $effect(() => {
    if (layoutUIStore.mainViewMode === "focus") {
      untrack(() => {
        if (controller.selectedId) {
          controller.clearGraphSelection();
        }
      });
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
  {#if hasNoEntities}
    <div
      class="absolute inset-0 flex items-center justify-center pointer-events-none"
      data-testid="graph-empty-state"
    >
      <div class="pointer-events-auto">
        <EmptyState
          icon="icon-[lucide--network]"
          headline="Your graph is empty"
          body={vault.isGuest
            ? "Nothing has been shared with you yet."
            : "Create your first entity to see it appear here."}
          cta={vault.isGuest ? undefined : "＋ Create your first entity"}
          onCta={vault.isGuest
            ? undefined
            : () => modalUIStore.requestCreateEntity()}
        />
      </div>
    </div>
  {/if}

  {#if showCoachMarks}
    {@const mark = COACH_MARKS[coachStep]}
    <div
      class="md:hidden fixed bottom-20 left-1/2 -translate-x-1/2 z-[90] w-[calc(100%-2rem)] max-w-sm"
      data-testid="mobile-coach-mark"
      transition:fly={{ y: 8, duration: 200 }}
    >
      <div
        class="rounded-2xl border border-theme-primary/40 bg-theme-surface/95 backdrop-blur-md p-4 shadow-2xl"
      >
        <div class="flex items-start gap-3">
          <div
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-theme-primary/10 text-theme-primary"
          >
            <span class="{mark.icon} h-4 w-4"></span>
          </div>
          <div class="flex-1 min-w-0">
            <p
              class="text-[10px] font-bold uppercase tracking-[0.2em] text-theme-primary mb-1"
            >
              {mark.title}
            </p>
            <p class="text-xs leading-relaxed text-theme-text/80">
              {mark.body}
            </p>
          </div>
        </div>
        <div class="mt-3 flex items-center justify-between">
          <div class="flex gap-1">
            {#each COACH_MARKS as _, i}
              <div
                class="h-1.5 w-1.5 rounded-full transition-colors {i ===
                coachStep
                  ? 'bg-theme-primary'
                  : 'bg-theme-border'}"
              ></div>
            {/each}
          </div>
          <div class="flex gap-2">
            <button
              class="text-[10px] text-theme-muted hover:text-theme-primary transition-colors"
              onclick={() => onboardingStore.dismissMobileGraphCoachMarks()}
              data-testid="coach-mark-skip"
            >
              Skip
            </button>
            <button
              class="rounded-lg bg-theme-primary px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-theme-bg transition-opacity hover:opacity-90"
              onclick={nextCoachMark}
              data-testid="coach-mark-next"
            >
              {coachStep < COACH_MARKS.length - 1 ? "Next" : "Got it"}
            </button>
          </div>
        </div>
      </div>
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
