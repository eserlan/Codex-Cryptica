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
  import {
    MOBILE_ENTRY_MIN_ZOOM,
    resolveMobileEntryId,
  } from "./graph/mobile-entry";
  import {
    buildGraphSummary,
    buildSelectionAnnouncement,
  } from "./graph/graph-a11y";
  import { createHoverContentLoader } from "./graph/hover-content-loader";
  import EmptyState from "$lib/components/ui/EmptyState.svelte";
  import { onboardingStore } from "$lib/stores/ui/onboarding.svelte";
  import { onboardingFunnel } from "$lib/app/onboarding/onboarding-funnel";
  import { helpStore } from "$lib/stores/help.svelte";
  import { openImportWindow } from "$lib/stores/ui/navigation";
  import { fly, fade } from "svelte/transition";
  import { computeSpotlightClipPath } from "$lib/utils/spotlight";
  import { COACH_MARKS } from "$lib/config/help-content";

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
  let visibilityObserver: IntersectionObserver | undefined;
  let documentVisible = $state(
    typeof document === "undefined" ? true : !document.hidden,
  );
  let containerIntersecting = $state(true);
  const hoverContentLoader = createHoverContentLoader((entityId) =>
    vault.loadEntityContent(entityId),
  );

  const surfaceCovered = $derived(
    onboardingStore.isLandingPageVisible ||
      modalUIStore.isAnyModalOpen ||
      (layoutUIStore.isEntityExplorerWorkspace &&
        !!layoutUIStore.focusedEntityId) ||
      (vault.isInitialized &&
        onboardingStore.skipWelcomeScreen &&
        !onboardingStore.dismissedWorldPage &&
        !vault.selectedEntityId),
  );

  const handleDocumentVisibilityChange = () => {
    documentVisible = !document.hidden;
  };

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
  let mobileEntryVaultId: string | null = null;

  // COACH_MARKS lives in help-content.ts (config, testable) — see its
  // docstring there for why these are scoped to isMobile, not tablets.
  let coachStep = $state(0);
  const showCoachMarks = $derived(
    layoutUIStore.isMobile &&
      !onboardingStore.dismissedMobileGraphCoachMarks &&
      // Sequenced after the main initial-onboarding tour, never alongside it —
      // these teach touch-specific chrome navigation, a different story from
      // the tour's task-oriented steps. Without this, both could render at
      // once on a touch device (two competing cards), exactly what the
      // orchestrator (#1780) exists to prevent.
      !helpStore.activeTour,
  );

  let coachMarkTargetRect = $state<DOMRect | null>(null);

  function updateCoachMarkTargetRect() {
    if (!showCoachMarks) {
      coachMarkTargetRect = null;
      return;
    }
    const selector = COACH_MARKS[coachStep]?.targetSelector;
    const el = selector ? document.querySelector(selector) : null;
    coachMarkTargetRect = el ? el.getBoundingClientRect() : null;
  }

  $effect(() => {
    // Re-measure whenever the visible mark changes.
    void coachStep;
    void showCoachMarks;
    updateCoachMarkTargetRect();
  });

  const coachMarkClipPath = $derived.by(() => {
    if (!coachMarkTargetRect || typeof window === "undefined") return "";
    return computeSpotlightClipPath(
      coachMarkTargetRect,
      window.innerWidth,
      window.innerHeight,
      6,
    );
  });

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
      graph.perfStylingActive,
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
    documentVisible = !document.hidden;
    document.addEventListener(
      "visibilitychange",
      handleDocumentVisibilityChange,
    );
    // Funnel: reaching the graph is the final onboarding milestone. Guests are
    // visitors, not first-time GMs, so they don't count.
    if (!vault.isGuest) {
      onboardingFunnel.track("graph_opened");
    }
    void graph.init();
    controller.init(container, graphStyle);
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        if (controller.cy && !controller.isSuspended) {
          controller.cy.resize();
        }
      });
      resizeObserver.observe(container);
    }
    if (typeof IntersectionObserver !== "undefined") {
      visibilityObserver = new IntersectionObserver(([entry]) => {
        containerIntersecting = entry?.isIntersecting === true;
      });
      visibilityObserver.observe(container);
    }

    // Re-measure the coach mark's spotlighted element on resize/scroll, same
    // as TourOverlay does for the main onboarding tour.
    window.addEventListener("resize", updateCoachMarkTargetRect);
    window.addEventListener("scroll", updateCoachMarkTargetRect, true);
  });

  onDestroy(() => {
    hoverContentLoader.cancel();
    if (resizeObserver) {
      resizeObserver.disconnect();
    }
    visibilityObserver?.disconnect();
    visibilityObserver = undefined;
    document.removeEventListener(
      "visibilitychange",
      handleDocumentVisibilityChange,
    );
    window.removeEventListener("resize", updateCoachMarkTargetRect);
    window.removeEventListener("scroll", updateCoachMarkTargetRect, true);
    controller.destroy();
  });

  $effect(() => {
    const inputs = {
      documentVisible,
      surfaceCovered,
      containerIntersecting,
    };
    untrack(() => controller.setVisibilityInputs(inputs));
  });

  $effect(() => {
    void controller.requiresReinitialization;
    if (controller.consumeReinitializationRequest() && container) {
      void controller.init(container, graphStyle);
    }
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
    void controller.isSuspended;
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
    // Revalidate the root when graph membership changes, while a regular
    // selection remains outside this dependency path.
    void graph.elements;
    if (controller.cy && graph.focusViewActive) {
      graph.ensureFocusRoot();
    }
  });

  $effect(() => {
    void controller.pendingSearchFocus;
    // Re-apply focus after an explicit outside-focus navigation has synced the
    // newly rendered node into Cytoscape.
    void graph.focusRootId;
    const currentCy = controller.cy;
    const currentSelectedId = controller.selectedId;
    if (currentCy) {
      if (
        currentSelectedId &&
        graph.focusViewActive &&
        graph.focusRootId !== currentSelectedId &&
        currentCy.$id(currentSelectedId).length === 0
      ) {
        graph.navigateFocusTo(currentSelectedId);
      }
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

  // A phone should enter a useful local view once per vault/session, then
  // leave the camera entirely under the user's control. This follows the
  // selection effect so an initially selected node cannot replace the legible
  // entry zoom with the previous full-graph fit.
  $effect(() => {
    const currentCy = controller.cy;
    const vaultId = vault.activeVaultId ?? "default";
    const isReady = controller.loadPhase === "ready";
    const entities = vault.allEntities;
    if (
      !layoutUIStore.isMobile ||
      !currentCy ||
      !isReady ||
      mobileEntryVaultId === vaultId
    )
      return;

    mobileEntryVaultId = vaultId;
    const entryId = resolveMobileEntryId(
      entities,
      controller.selectedId,
      vault.inboundConnections,
    );
    if (!entryId) return;

    const node = currentCy.$id(entryId);
    if (node.length > 0) {
      untrack(() =>
        centerOnNode(
          node,
          true,
          Math.max(currentCy.zoom(), MOBILE_ENTRY_MIN_ZOOM),
        ),
      );
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
    void controller.isSuspended;
    if (currentCy && graph.fitRequest > 0 && !controller.isSuspended) {
      untrack(() =>
        currentCy.animate({
          // Cytoscape includes edge-label bounds in fit calculations. Leave a
          // larger rendered margin so label backplates do not sit against the
          // graph frame or the desktop detail-panel boundary.
          fit: { eles: currentCy.elements(), padding: 48 },
          duration: 800,
          easing: "ease-out-cubic",
        }),
      );
    }
  });

  // Layout redraw request — e.g. from Quick Start after it bulk-creates
  // entities and connections. See `graph.requestLayout` for why the
  // incremental sync alone isn't enough here.
  //
  // reason MUST be exactly "UI Redraw Button": with Stable Layout on (the
  // default), LayoutManager's force-randomize solve is gated on that literal
  // string (see LayoutManager.applyForceLayout's `isManualRedraw` check) —
  // anything else silently falls through to a fit-only pass that re-centers
  // the camera without actually spreading piled-up nodes apart.
  $effect(() => {
    const currentCy = controller.cy;
    if (currentCy && graph.layoutRequest > 0) {
      untrack(() =>
        controller.applyCurrentLayout({
          reason: "UI Redraw Button",
          isForced: true,
          reseed: true,
        }),
      );
    }
  });

  // Image Sync
  $effect(() => {
    void graph.elements;
    void graph.showImages;
    void graph.perfStylingActive;
    void controller.cy;
    void controller.isSuspended;
    // Silhouettes are tinted from the theme's entity-type palette (issue
    // #2680), so a theme or category-colour change has to re-resolve them —
    // otherwise already-painted glyphs keep the previous theme's colour.
    void themeStore.activeTheme?.id;
    void categories.list;
    untrack(() => controller.syncImages());
  });

  // Large-graph render hints. cy is built while the vault is still empty, so
  // the renderer-level perf flags (hideEdgesOnViewport, motionBlur) can't be
  // set at init — re-apply them on the live renderer once isLargeGraph settles.
  $effect(() => {
    void graph.isLargeGraph;
    void controller.cy;
    void controller.isSuspended;
    untrack(() => controller.syncRenderHints());
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

  // ── Canvas text alternatives (see graph-a11y.ts) ─────────────────────────
  let graphSummary = $derived(
    buildGraphSummary({
      totalEntities: graph.fullGraphSize.nodeCount,
      totalConnections: graph.fullGraphSize.edgeCount,
      renderedEntities: graph.stats.nodeCount,
      focusViewActive: graph.focusViewActive,
      filtersActive:
        graph.activeCategories.size > 0 ||
        graph.activeLabels.size > 0 ||
        graph.timelineMode,
    }),
  );
  let selectionAnnouncement = $derived(
    buildSelectionAnnouncement(
      selectedEntity,
      (selectedEntity?.connections?.length ?? 0) +
        (controller.selectedId
          ? (vault.inboundConnections[controller.selectedId]?.length ?? 0)
          : 0),
    ),
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

  <!-- The canvas below is aria-hidden (cytoscape paints pixels, not DOM), so
       these two regions carry the view's meaning: a static description with
       the operable alternatives, and the single polite announcer for
       selection. Wording and the reasoning behind it live in graph-a11y.ts. -->
  <section
    class="sr-only"
    aria-labelledby="graph-a11y-heading"
    data-testid="graph-a11y-summary"
  >
    <h2 id="graph-a11y-heading">Knowledge graph</h2>
    {#each graphSummary as line}
      <p>{line}</p>
    {/each}
  </section>
  <div
    class="sr-only"
    role="status"
    aria-live="polite"
    aria-atomic="true"
    data-testid="graph-a11y-announcer"
  >
    {selectionAnnouncement}
  </div>

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
    isSuspended={controller.isSuspended}
    onApplyLayout={controller.applyCurrentLayout}
    selectedCount={controller.selectedCount}
  />

  <OrbitControls />

  <div
    bind:this={container}
    data-testid="graph-canvas"
    aria-hidden="true"
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
            : "Add a character or place to begin. Mention another name in its notes, accept the suggested connection, and it'll appear here."}
          cta={vault.isGuest ? undefined : "＋ Create"}
          ctaTestId={vault.isGuest ? undefined : "graph-empty-state-cta"}
          onCta={vault.isGuest
            ? undefined
            : () => modalUIStore.openIntentCreateMenu()}
          secondaryCta={vault.isGuest ? undefined : "Populate with a pack"}
          onSecondaryCta={vault.isGuest ? undefined : () => openImportWindow()}
        />
      </div>
    </div>
    {#if !vault.isGuest}
      <!-- Durable pointer back to onboarding guidance once the welcome
           screen is dismissed and forgotten (Finding 9, #1791) — a one-time
           reminder that Settings → Help has a getting-started checklist and
           a tour-replay button, for whoever created an empty vault without
           going through the demo/tour flow at all.
           top-4 (not bottom-4): the bottom-left is already the mobile
           GraphToolbar FAB's exact position (`bottom-4`, GraphToolbar.svelte)
           — a corner we spent considerable effort de-crowding this session. -->
      <div class="absolute top-4 left-4 z-20 max-w-xs pointer-events-auto">
        <FeatureHint hintId="getting-started" />
      </div>
    {/if}
  {/if}

  {#if !vault.isGuest}
    <!-- Mobile "+ Create" FAB — the header's own Create button (AppHeader,
         `hidden lg:flex`) is desktop-only, so below lg this was previously
         the only place in the primary Graph view without a route into the
         Guided Mode intent-first create flow (mirrors CanvasHUD's FAB). -->
    <button
      type="button"
      onclick={() => modalUIStore.openIntentCreateMenu()}
      title="Create"
      aria-label="Create new entity"
      data-testid="graph-fab-create"
      class="absolute bottom-6 right-6 z-40 flex lg:hidden items-center justify-center w-14 h-14 rounded-full bg-theme-primary text-theme-bg shadow-[0_4px_20px_rgba(var(--theme-primary-rgb),0.4)] hover:brightness-110 transition-all"
    >
      <span class="icon-[lucide--plus] w-6 h-6" aria-hidden="true"></span>
    </button>
  {/if}

  {#if showCoachMarks}
    {@const mark = COACH_MARKS[coachStep]}
    {#if coachMarkClipPath}
      <!-- Dims everything except the element this mark describes, same
           visual language as the desktop/general onboarding tour
           (TourOverlay.svelte) — so highlighting reads consistently across
           both systems, and it's now unambiguous which element a mark
           refers to even if the card sits nearby (#1785 follow-up). -->
      <div
        class="fixed inset-0 z-[85] bg-black/40 backdrop-blur-[1px] transition-all duration-300"
        style={coachMarkClipPath}
        data-testid="mobile-coach-mark-spotlight"
        transition:fade
      ></div>
    {/if}
    <!-- Visibility is driven by `showCoachMarks` (phones + touch tablets),
         so no responsive `hidden` class is needed here (#1785).
         bottom-36 (not bottom-20): the graph's own "Graph Controls" FAB
         (GraphToolbar.svelte) floats bottom-4 within the GraphView container,
         which itself ends right above the 56px ActivityBar — so the FAB
         occupies roughly the 72-112px band from the true screen bottom.
         bottom-20 (80px) landed inside that band, so this card (z-90) fully
         covered the very button its "graph-fab" step describes. -->
    <div
      class="fixed bottom-36 left-1/2 -translate-x-1/2 z-[90] w-[calc(100%-2rem)] max-w-sm"
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
            {#each COACH_MARKS as _, i (`coach-mark-${i}`)}
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

  {#if layoutUIStore.prefersTouchCoaching && !layoutUIStore.isMobile}
    <!-- Touch tablets (769-1279px + coarse pointer) only — phones already get
         the fuller mobile coach-mark walkthrough (COACH_MARKS, scoped to
         isMobile), and this would be redundant there. Unlike the mobile
         coach marks, this hint is genuinely layout-agnostic (no per-device
         target selector needed): panning/zooming the graph works the same
         regardless of where the ActivityBar happens to render (#1791 Phase 4). -->
    <!-- top uses --header-height (set dynamically in +layout.svelte, grows
         with the staging banner), not a hardcoded offset — `fixed` escapes
         the graph's own container (which the header sits above, so the
         empty-workspace hint above is naturally clear of it via `absolute`),
         so without this it renders underneath/behind the sticky AppHeader. -->
    <div
      class="fixed right-4 z-[60]"
      style="top: calc(var(--header-height, 65px) + 1rem);"
      data-testid="touch-gestures-hint"
    >
      <FeatureHint hintId="touch-graph-gestures" />
    </div>
  {/if}
  {#if controller.selectedCount === 2}
    <!-- Same --header-height fix as touch-gestures-hint above (was fixed
         top-20, a hardcoded offset that only happened to clear the header
         by coincidence, and would clip under it if the header grows — e.g.
         the staging banner). Stacked below the touch-gestures hint (+5rem
         instead of +1rem) rather than sharing its exact position, since a
         touch-tablet user selecting 2 nodes can have both hints on screen
         at once. -->
    <div
      class="fixed right-4 z-[60]"
      style="top: calc(var(--header-height, 65px) + 5rem);"
      data-testid="node-merging-hint"
    >
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
