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
  import { handleGraphDeleteShortcut } from "./graph/graph-keyboard";
  import {
    DEFAULT_SEARCH_ENTITY_ZOOM,
    consumePendingSearchEntityFocus,
    SEARCH_ENTITY_FOCUS_EVENT,
    markSearchEntityFocusHandled,
  } from "./search/search-focus";

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
  let findNodeCounter = $derived(ui.findNodeCounter);
  let pendingSearchFocus: {
    entityId: string;
    zoom: number;
  } | null = null;
  let pendingSearchFocusRevision = $state(0);
  let nodeSelectTimer: number | null = null;
  const NODE_SELECT_DELAY_MS = 300;

  let editingEdge = $state<{
    source: string;
    target: string;
    label: string;
    type: string;
  } | null>(null);

  let cleanupEvents: (() => void) | undefined;
  let searchFocusListener: ((event: Event) => void) | null = null;

  const applyCurrentLayout = async (
    isInitial = false,
    isForced = false,
    caller = "unknown",
    randomizeForced = false,
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
        onLayoutComputed: (ms) => {
          debugStore.log(`Layout: ${ms}ms`, {
            nodes: graph.stats.nodeCount,
            caller,
          });
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
      randomizeForced,
    );
  };

  $effect(() => {
    if (!ui.isConnecting) {
      cy?.$(".selected-source").removeClass("selected-source");
    }
  });

  const clearNodeSelectTimer = () => {
    if (nodeSelectTimer !== null) {
      clearTimeout(nodeSelectTimer);
      nodeSelectTimer = null;
    }
  };

  const handleKeyDown = async (e: KeyboardEvent) => {
    const handledDelete = await handleGraphDeleteShortcut(e, {
      cy,
      selectedId,
      isGuest: vault.isGuest,
      confirm: (params) => ui.confirm(params),
      deleteEntity: (id) => vault.deleteEntity(id),
      clearSelectedId: () => {
        selectedId = null;
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
  let resizeTimer: ReturnType<typeof setTimeout> | null = null;
  let lastOrientation: "landscape" | "portrait" | null = null;

  const handleResize = () => {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (cy) {
        cy.resize(); // Ensure Cytoscape knows about the new container size
        const width = cy.width();
        const height = cy.height();
        const currentOrientation = width > height ? "landscape" : "portrait";

        // Only rearrange if orientation changed
        if (lastOrientation && currentOrientation !== lastOrientation) {
          debugStore.log(
            `[GraphView] Orientation changed to ${currentOrientation}, updating layout...`,
          );
          applyCurrentLayout(false, true, "Window Resize", true);
        } else {
          applyCurrentLayout(false, false, "Window Resize", false);
        }

        lastOrientation = currentOrientation;
      }
    }, 250);
  };

  onMount(() => {
    window.addEventListener("resize", handleResize);
    searchFocusListener = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          entityId?: string;
          zoom?: number;
          requestId?: number;
        }>
      ).detail;
      if (!detail?.entityId) return;
      if (typeof detail.requestId === "number") {
        markSearchEntityFocusHandled(detail.requestId);
      }
      pendingSearchFocus = {
        entityId: detail.entityId,
        zoom: detail.zoom ?? DEFAULT_SEARCH_ENTITY_ZOOM,
      };
      pendingSearchFocusRevision += 1;
    };

    window.addEventListener(SEARCH_ENTITY_FOCUS_EVENT, searchFocusListener);

    const bufferedSearchFocus = consumePendingSearchEntityFocus();
    if (bufferedSearchFocus) {
      pendingSearchFocus = bufferedSearchFocus;
      pendingSearchFocusRevision += 1;
    }

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
                clearNodeSelectTimer();
                nodeSelectTimer = window.setTimeout(() => {
                  selectedId = id;
                  nodeSelectTimer = null;
                }, NODE_SELECT_DELAY_MS);
              }
            },
            onNodeDoubleTap: (id) => {
              clearNodeSelectTimer();
              ui.openZenMode(id);
              selectedId = null;
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
              clearNodeSelectTimer();
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
    window.removeEventListener("resize", handleResize);
    if (initTimer) {
      clearTimeout(initTimer);
      initTimer = null;
    }
    if (resizeTimer) {
      clearTimeout(resizeTimer);
      resizeTimer = null;
    }
    if (searchFocusListener) {
      window.removeEventListener(
        SEARCH_ENTITY_FOCUS_EVENT,
        searchFocusListener,
      );
      searchFocusListener = null;
    }
    if (cleanupEvents) {
      cleanupEvents();
      cleanupEvents = undefined;
    }
    clearNodeSelectTimer();
    if (layoutManager) {
      layoutManager.stop();
      layoutManager = undefined;
    }
    if (imageManager) {
      imageManager.destroy({
        releaseImageUrl: (path: string) => vault.releaseImageUrl(path),
      } as any);
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

  // Trigger layout when switching modes (Orbit, Timeline)
  $effect(() => {
    const _mode = graph.orbitMode;
    const _node = graph.centralNodeId;
    const _timeline = graph.timelineMode;

    if (cy && didFinalizeLoad) {
      untrack(() => {
        applyCurrentLayout(false, true, "Mode Change Effect");
      });
    }
  });

  // Reset loading state when vault starts loading a NEW or EMPTY vault
  $effect(() => {
    if (vault.status === "loading" && vault.allEntities.length === 0) {
      untrack(() => {
        initialLoaded = false;
        didFinalizeLoad = false;
        if (imageManager)
          imageManager.destroy({
            releaseImageUrl: (path: string) => vault.releaseImageUrl(path),
          } as any);
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
    // Optimization: Keep graph visible if we have data and it was already loaded
    if (initialLoaded && !graphVisible) {
      graphVisible = true;
    }
  });

  $effect(() => {
    void pendingSearchFocusRevision;
    const currentCy = cy;
    if (currentCy) {
      applyFocus(selectedId);
      if (selectedId) {
        const node = currentCy.$id(selectedId);
        if (node.length > 0) {
          const focusZoom =
            pendingSearchFocus?.entityId === selectedId
              ? (pendingSearchFocus?.zoom ?? DEFAULT_SEARCH_ENTITY_ZOOM)
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
            pendingSearchFocus = null;
          }
        } else if (pendingSearchFocus?.entityId === selectedId) {
          pendingSearchFocus = null;
        }
      } else if (pendingSearchFocus) {
        pendingSearchFocus = null;
      }
    }
  });

  $effect(() => {
    const currentCy = cy;
    const findCounter = findNodeCounter;
    if (!currentCy || !selectedId) return;

    const node = currentCy.$id(selectedId);
    if (node.length === 0) return;

    if (findCounter >= 0) {
      untrack(() => {
        currentCy.center(node);
      });
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
    const currentElements = graph.elements;
    const showImages = graph.showImages;
    if (currentCy && currentElements && imageManager) {
      untrack(() => {
        imageManager!.sync({
          showImages,
          resolveImageUrl: (path) => vault.resolveImageUrl(path),
          releaseImageUrl: (path: string) => vault.releaseImageUrl(path),
          onBatchApplied: (count) => {
            debugStore.log(
              `[GraphView] Applied ${count} images to graph nodes.`,
            );
          },
          onLog: (msg) => debugStore.log(msg),
          onError: (err) =>
            debugStore.error("Incremental image resolution failed", err),
        });
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

  <GraphHUD
    {selectedEntity}
    {parentEntity}
    {selectedId}
    {isLayoutRunning}
    {cy}
  />

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
  {#if selectedCount === 2}
    <div class="fixed top-20 right-4 z-[60]" data-testid="node-merging-hint">
      <FeatureHint hintId="node-merging" />
    </div>
  {/if}
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
