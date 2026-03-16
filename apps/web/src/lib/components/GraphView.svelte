<script lang="ts">
  import { onMount, onDestroy, untrack } from "svelte";
  import { initGraph } from "graph-engine";
  import { graph } from "$lib/stores/graph.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { ui } from "$lib/stores/ui.svelte";
  import { debugStore } from "$lib/stores/debug.svelte";

  import { isTemporalMetadataEqual } from "$lib/utils/comparison";
  import { categories } from "$lib/stores/categories.svelte";
  import type { Core } from "cytoscape";
  import {
    getGraphStyles,
    LayoutManager,
    GraphImageManager,
    setupGraphEvents,
    syncGraphElements,
  } from "graph-engine";

  import { themeStore } from "$lib/stores/theme.svelte";
  import OrbitControls from "$lib/components/graph/OrbitControls.svelte";
  import ContextMenu from "$lib/components/graph/ContextMenu.svelte";
  import SelectionConnector from "$lib/components/graph/SelectionConnector.svelte";
  import FeatureHint from "$lib/components/help/FeatureHint.svelte";
  import GraphTooltip from "./graph/GraphTooltip.svelte";
  import EdgeEditorModal from "./graph/EdgeEditorModal.svelte";
  import GraphHUD from "./graph/GraphHUD.svelte";
  import GraphToolbar from "./graph/GraphToolbar.svelte";

  let container: HTMLElement;
  let cy: Core | undefined = $state();
  let layoutManager: LayoutManager | undefined = $state();
  let imageManager: GraphImageManager | undefined = $state();
  let isLayoutRunning = $state(false);
  let graphVisible = $state(false);
  let selectedCount = $state(0);

  let graphStyle = $derived(
    getGraphStyles(
      themeStore.activeTheme,
      categories.list,
      graph.showImages,
      graph.timelineMode,
      graph.showLabels,
    ),
  );

  let { selectedId = $bindable(null) } = $props<{
    selectedId: string | null;
  }>();

  const applyFocus = (id: string | null) => {
    const currentCy = cy;
    if (!currentCy) return;
    try {
      currentCy.batch(() => {
        const allEles = currentCy.elements();
        if (!id) {
          allEles.removeClass("dimmed neighborhood secondary-neighborhood");
        } else {
          const node = currentCy.$id(id);
          if (node.length > 0) {
            const firstLevel = node.closedNeighborhood();
            const firstLevelNodes = firstLevel.nodes();
            const secondLevelNodes = firstLevelNodes
              .neighborhood()
              .nodes()
              .not(firstLevelNodes);
            const secondLevelEdges =
              secondLevelNodes.edgesWith(firstLevelNodes);
            const secondLevel = secondLevelNodes.add(secondLevelEdges);

            allEles.addClass("dimmed");
            allEles.removeClass("neighborhood secondary-neighborhood");

            firstLevel.removeClass("dimmed");
            firstLevel.addClass("neighborhood");

            secondLevel.removeClass("dimmed");
            secondLevel.addClass("secondary-neighborhood");
          } else {
            allEles.removeClass("dimmed neighborhood secondary-neighborhood");
          }
        }
      });
    } catch {
      /* ignore */
    }
  };

  let hoveredEntityId = $state<string | null>(null);
  let hoverPosition = $state<{ x: number; y: number } | null>(null);

  let editingEdge = $state<{
    source: string;
    target: string;
    label: string;
    type: string;
  } | null>(null);

  let cleanupEvents: (() => void) | undefined;

  const applyCurrentLayout = async (
    isInitial = false,
    isForced = false,
    caller = "unknown",
  ) => {
    if (!layoutManager) return;

    await layoutManager.apply(
      {
        timelineMode: graph.timelineMode,
        timelineAxis: graph.timelineAxis,
        timelineScale: graph.timelineScale,
        orbitMode: graph.orbitMode,
        centralNodeId: graph.centralNodeId,
        stableLayout: graph.stableLayout,
        isGuest: vault.isGuest,
        onLayoutStart: () => {
          isLayoutRunning = true;
        },
        onLayoutStop: () => {
          isLayoutRunning = false;
          graphVisible = true;
          if (isInitial) {
            setTimeout(() => {
              _layoutReady = true;
            }, 1000);
          }
        },
        onPositionsUpdated: (updates) => {
          vault.batchUpdate(updates as any);
        },
      },
      isInitial,
      isForced,
      caller,
    );
  };

  $effect(() => {
    if (!ui.isConnecting) {
      cy?.$(".selected-source").removeClass("selected-source");
    }
  });

  const handleKeyDown = (e: KeyboardEvent) => {
    const target = document.activeElement;
    if (
      target?.tagName === "INPUT" ||
      target?.tagName === "TEXTAREA" ||
      (target as HTMLElement)?.isContentEditable
    )
      return;

    if (e.key.toLowerCase() === "t" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      graph.toggleTimeline();
      applyCurrentLayout(false, false, "Keyboard Shortcut (T)");
    }
    if (e.key.toLowerCase() === "c" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (!vault.isGuest) {
        if (selectedCount === 2) {
          ui.showSelectionConnector = !ui.showSelectionConnector;
        } else {
          ui.toggleConnectMode();
        }
      }
    }
    if (e.key.toLowerCase() === "l" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      graph.toggleLabels();
    }
    if (e.key.toLowerCase() === "i" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      graph.toggleImages();
    }
    if (e.key === "Escape" && ui.isConnecting) {
      ui.toggleConnectMode();
    }
  };

  let initTimer: ReturnType<typeof setTimeout> | null = null;

  onMount(() => {
    if (container) {
      initTimer = setTimeout(async () => {
        if (!container) return;

        try {
          const instance = (await initGraph({
            container,
            elements: untrack(() => graph.elements),
            style: untrack(() => graphStyle),
          })) as any;

          if (initTimer === null) {
            instance.destroy();
            return;
          }

          cy = instance;
          layoutManager = new LayoutManager(instance);
          imageManager = new GraphImageManager(instance);

          const updateSelectionCount = () => {
            selectedCount = instance.$("node:selected").length;
          };
          instance.on("select unselect", "node", updateSelectionCount);
          updateSelectionCount();

          if (import.meta.env.DEV || (window as any).__E2E__) {
            (window as any).cy = instance;
          }

          cleanupEvents = setupGraphEvents(instance, {
            onNodeMouseOver: (id, renderedPos) => {
              hoverPosition = renderedPos;
              hoveredEntityId = id;
            },
            onNodeMouseOut: () => {
              hoveredEntityId = null;
              hoverPosition = null;
            },
            onNodeTap: async (id, node) => {
              if (ui.isConnecting) {
                if (!ui.connectingNodeId) {
                  ui.connectingNodeId = id;
                  node.addClass("selected-source");
                } else if (ui.connectingNodeId === id) {
                  ui.connectingNodeId = null;
                  node.removeClass("selected-source");
                } else {
                  const source = ui.connectingNodeId;
                  const target = id;
                  await vault.addConnection(source, target, "neutral");
                  ui.toggleConnectMode();
                }
              } else {
                selectedId = id;
              }
            },
            onEdgeTap: (data) => {
              editingEdge = {
                source: data.source,
                target: data.target,
                label: data.label || "",
                type: data.connectionType || "neutral",
              };
            },
            onBackgroundTap: () => {
              selectedId = null;
              if (ui.isConnecting) ui.toggleConnectMode();
            },
            onViewportChange: () => {
              if (hoveredEntityId && instance) {
                const node = instance.$id(hoveredEntityId);
                if (node.length > 0) {
                  const renderedPos = node.renderedPosition();
                  hoverPosition = renderedPos;
                }
              }
              return hoverPosition;
            },
          });

          // Set initial visibility
          graphVisible = true;
        } catch (err) {
          debugStore.error("Graph Init Failed", err);
        }
      }, 50);
    }
  });

  onDestroy(() => {
    if (initTimer) {
      clearTimeout(initTimer);
      initTimer = null;
    }
    if (cleanupEvents) {
      cleanupEvents();
      cleanupEvents = undefined;
    }
    if (layoutManager) {
      layoutManager.stop();
      layoutManager = undefined;
    }
    if (imageManager) {
      imageManager.destroy();
      imageManager = undefined;
    }
    if (cy) {
      if (import.meta.env.DEV) delete (window as any).cy;
      cy.destroy();
      cy = undefined;
    }
  });

  let initialLoaded = $state(false);
  let _layoutReady = $state(false);
  let didFinalizeLoad = $state(false);

  // Reset loading state when vault starts loading
  $effect(() => {
    if (vault.status === "loading") {
      untrack(() => {
        initialLoaded = false;
        didFinalizeLoad = false;
        if (imageManager) imageManager.destroy();
      });
    }
  });

  // FLICKER PREVENTION: Lockdown global style effect during loading.
  let activeStyleJson = "";
  $effect(() => {
    const currentStyle = graphStyle;
    const currentCy = cy;

    // While loading, we ALLOW global style updates if they actually change,
    // but the lockdown condition was causing a final jump when it was lifted.
    if (currentCy && currentStyle) {
      const styleJson = JSON.stringify(currentStyle);
      if (styleJson !== activeStyleJson) {
        activeStyleJson = styleJson;
        untrack(() => {
          currentCy.style(currentStyle);
        });
      }
    }
  });

  // Load Finalization Trigger
  $effect(() => {
    if (vault.status === "idle" && initialLoaded && !didFinalizeLoad) {
      didFinalizeLoad = true;
      debugStore.log(
        "[GraphView] Vault load finalized, unlocking all updates.",
      );
      // Force layout with fitting when loading is finalized
      applyCurrentLayout(false, true, "Load Finalized");
    }
  });

  $effect(() => {
    const currentCy = cy;
    if (currentCy && graph.elements) {
      syncGraphElements(currentCy, {
        elements: graph.elements,
        vaultStatus: vault.status,
        initialLoaded,
        isTemporalMetadataEqual,
        activeLabels: graph.activeLabels,
        labelFilterMode: graph.labelFilterMode,
        activeCategories: graph.activeCategories,
        onFirstElements: () => {
          initialLoaded = true;
          graphVisible = true;
        },
        onLayoutUpdate: applyCurrentLayout,
      });
    }
  });

  $effect(() => {
    const currentCy = cy;
    if (currentCy) {
      applyFocus(selectedId);
      if (selectedId) {
        const node = currentCy.$id(selectedId);
        if (node.length > 0) {
          untrack(() =>
            currentCy.animate({
              center: { eles: node },
              duration: 800,
              easing: "ease-out-cubic",
            }),
          );
        }
      }
    }
  });

  $effect(() => {
    const currentCy = cy;
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

  $effect(() => {
    const currentCy = cy;
    if (currentCy && graph.elements && imageManager) {
      imageManager.sync({
        showImages: graph.showImages,
        resolveImageUrl: (path) => vault.resolveImageUrl(path),
        onBatchApplied: (count) => {
          debugStore.log(`[GraphView] Applied ${count} images to graph nodes.`);
        },
        onError: (err) =>
          debugStore.error("Incremental image resolution failed", err),
      });
    }
  });

  let selectedEntity = $derived(selectedId ? vault.entities[selectedId] : null);
  let parentEntity = $derived(
    selectedId
      ? vault.inboundConnections[selectedId]?.[0]?.sourceId
        ? vault.entities[vault.inboundConnections[selectedId][0].sourceId]
        : null
      : null,
  );
  let hoveredEntity = $derived(
    hoveredEntityId ? vault.entities[hoveredEntityId] : null,
  );
</script>

<div
  class="absolute inset-0 w-full h-full bg-theme-bg overflow-hidden shadow-2xl border-y border-theme-border/30"
>
  <div
    class="absolute inset-0 pointer-events-none opacity-20"
    style="background-image: radial-gradient(var(--color-theme-secondary) 1px, transparent 1px); background-size: 30px 30px;"
  ></div>

  <GraphHUD {selectedEntity} {parentEntity} {selectedId} {isLayoutRunning} />

  <GraphToolbar
    {cy}
    {isLayoutRunning}
    onApplyLayout={applyCurrentLayout}
    {selectedCount}
  />

  <OrbitControls />

  <div
    bind:this={container}
    data-testid="graph-canvas"
    class="w-full h-full {graphVisible
      ? 'opacity-100'
      : 'opacity-0'} transition-opacity duration-1000"
  ></div>

  <GraphTooltip {hoveredEntity} {hoverPosition} />
  <EdgeEditorModal bind:editingEdge />

  {#if cy}
    <ContextMenu {cy} />
    <SelectionConnector {cy} />
  {/if}
  <FeatureHint hintId="graph-controls" />
  {#if ui.isConnecting}
    <FeatureHint hintId="connect-mode" />
  {/if}
</div>

<svelte:window onkeydown={handleKeyDown} />

<style>
  :global(.selected-source) {
    box-shadow: 0 0 20px #facc15;
    z-index: 1000 !important;
  }
</style>
