import { untrack } from "svelte";
import type { Core } from "cytoscape";
import {
  initGraph,
  LayoutManager,
  GraphImageManager,
  setupGraphEvents,
  syncGraphElements,
} from "graph-engine";
import { isTemporalMetadataEqual } from "$lib/utils/comparison";
import type { graph as graphStore } from "$lib/stores/graph.svelte";
import type { vault as vaultStore } from "$lib/stores/vault.svelte";
import type { debugStore as debugStoreType } from "$lib/stores/debug.svelte";
import type { layoutUIStore as layoutUIStoreType } from "$lib/stores/ui/layout-ui.svelte";
import type { connectionModeStore as connectionModeStoreType } from "$lib/stores/ui/connection-mode.svelte";
import type { modalUIStore as modalUIStoreType } from "$lib/stores/ui/modal-ui.svelte";
import {
  DEFAULT_SEARCH_ENTITY_ZOOM,
  consumePendingSearchEntityFocus,
  SEARCH_ENTITY_FOCUS_EVENT,
  markSearchEntityFocusHandled,
} from "../search/search-focus";
import type { LocalEntity } from "$lib/stores/vault/types";

export type LoadPhase = "idle" | "elements" | "finalized" | "ready";

export interface GraphViewDependencies {
  graph: typeof graphStore;
  vault: typeof vaultStore;
  debugStore: typeof debugStoreType;
  layoutUIStore: typeof layoutUIStoreType;
  connectionModeStore: typeof connectionModeStoreType;
  modalUIStore: typeof modalUIStoreType;
}

export class GraphViewController {
  container = $state<HTMLElement | null>(null);
  cy = $state<Core | undefined>();
  layoutManager = $state<LayoutManager | undefined>();
  imageManager = $state<GraphImageManager | undefined>();

  isLayoutRunning = $state(false);
  graphVisible = $state(false);
  selectedCount = $state(0);

  hoveredEntityId = $state<string | null>(null);
  hoverPosition = $state<{ x: number; y: number } | null>(null);

  selectedId = $state<string | null>(null);

  editingEdge = $state<{
    source: string;
    target: string;
    label: string;
    type: string;
  } | null>(null);

  loadPhase = $state<LoadPhase>("idle");

  private nodeSelectTimer: number | null = null;
  private readonly NODE_SELECT_DELAY_MS = 300;

  private resizeTimer: number | null = null;
  private lastOrientation: "landscape" | "portrait" | null = null;

  private isDestroyed = false;

  pendingSearchFocus: {
    entityId: string;
    zoom: number;
    timestamp: number;
  } | null = $state(null);

  private cleanupEvents?: () => void;
  private searchFocusListener: ((event: Event) => void) | null = null;

  private deps: GraphViewDependencies;

  constructor(
    options: { selectedId: string | null },
    deps: GraphViewDependencies,
  ) {
    this.selectedId = options.selectedId;
    this.deps = deps;
  }

  init = async (container: HTMLElement, graphStyle: any) => {
    this.container = container;
    this.isDestroyed = false;

    try {
      const instance = (await initGraph({
        container,
        elements: untrack(() => this.deps.graph.elements),
        style: untrack(() => graphStyle),
      })) as any;

      if (this.isDestroyed || !this.container) {
        instance.destroy();
        return;
      }

      this.cy = instance;
      this.layoutManager = new LayoutManager(instance);
      this.imageManager = new GraphImageManager(instance);

      const updateSelectionCount = () => {
        this.selectedCount = instance.$("node:selected").length;
      };
      instance.on("select unselect", "node", updateSelectionCount);
      updateSelectionCount();

      if (import.meta.env.DEV) {
        (window as any).cy = instance;
      }

      this.cleanupEvents = setupGraphEvents(instance, {
        onNodeMouseOver: (id, renderedPos) => {
          this.hoverPosition = renderedPos;
          this.hoveredEntityId = id;
        },
        onNodeMouseOut: () => {
          this.hoveredEntityId = null;
          this.hoverPosition = null;
        },
        onNodeTap: async (id, node) => {
          const container = this.cy?.container();
          if (container) {
            const rect = container.getBoundingClientRect();
            const renderedPos = node.renderedPosition();
            this.deps.layoutUIStore.setLastSelectedNodePosition({
              x: rect.left + renderedPos.x,
              y: rect.top + renderedPos.y,
            });
          } else {
            this.deps.layoutUIStore.setLastSelectedNodePosition(null);
          }

          if (this.deps.connectionModeStore.isConnecting) {
            if (!this.deps.connectionModeStore.connectingNodeId) {
              this.deps.connectionModeStore.connectingNodeId = id;
              node.addClass("selected-source");
            } else if (this.deps.connectionModeStore.connectingNodeId === id) {
              this.deps.connectionModeStore.connectingNodeId = null;
              node.removeClass("selected-source");
            } else {
              const source = this.deps.connectionModeStore.connectingNodeId;
              const target = id;
              await this.deps.vault.addConnection(source, target, "neutral");
              this.deps.connectionModeStore.toggleConnectMode();
            }
          } else {
            if (this.deps.layoutUIStore.isMobile) {
              this.clearGraphSelection();
              this.deps.modalUIStore.openZenMode(id);
              return;
            }
            this.clearNodeSelectTimer();
            this.nodeSelectTimer = window.setTimeout(() => {
              this.selectedId = id;
              this.nodeSelectTimer = null;
            }, this.NODE_SELECT_DELAY_MS);
          }
        },
        onNodeDoubleTap: (id, _node) => {
          this.clearGraphSelection();
          this.deps.modalUIStore.openZenMode(id);
        },
        onEdgeTap: (data) => {
          if (this.deps.vault.isGuest) return;
          this.editingEdge = {
            source: data.source,
            target: data.target,
            label: data.label || "",
            type: data.connectionType || "neutral",
          };
        },
        onBackgroundTap: () => {
          this.clearGraphSelection();
          if (this.deps.connectionModeStore.isConnecting)
            this.deps.connectionModeStore.toggleConnectMode();
        },
        onViewportChange: () => {
          if (this.hoveredEntityId && instance) {
            const node = instance.$id(this.hoveredEntityId);
            if (node.length > 0) {
              const renderedPos = node.renderedPosition();
              this.hoverPosition = renderedPos;
            }
          }
          return this.hoverPosition;
        },
      });

      this.graphVisible = true;
      this.deps.debugStore.log(
        "[GraphViewController] Init successful, graphVisible set to true",
      );
      this.setupEventListeners();
    } catch (err) {
      this.deps.debugStore.error("Graph Init Failed", err);
    }
  };

  private setupEventListeners = () => {
    window.addEventListener("resize", this.handleResize);
    this.searchFocusListener = (event: Event) => {
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
      this.pendingSearchFocus = {
        entityId: detail.entityId,
        zoom: detail.zoom ?? DEFAULT_SEARCH_ENTITY_ZOOM,
        timestamp: Date.now(),
      };
    };

    window.addEventListener(
      SEARCH_ENTITY_FOCUS_EVENT,
      this.searchFocusListener,
    );

    const bufferedSearchFocus = consumePendingSearchEntityFocus();
    if (bufferedSearchFocus) {
      this.pendingSearchFocus = {
        ...bufferedSearchFocus,
        timestamp: Date.now(),
      };
    }
  };

  destroy = () => {
    this.isDestroyed = true;
    window.removeEventListener("resize", this.handleResize);
    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = null;
    }
    if (this.searchFocusListener) {
      window.removeEventListener(
        SEARCH_ENTITY_FOCUS_EVENT,
        this.searchFocusListener,
      );
      this.searchFocusListener = null;
    }
    if (this.cleanupEvents) {
      this.cleanupEvents();
      this.cleanupEvents = undefined;
    }
    this.clearNodeSelectTimer();
    if (this.layoutManager) {
      this.layoutManager.stop();
      this.layoutManager = undefined;
    }
    if (this.imageManager) {
      this.imageManager.destroy({
        releaseImageUrl: (path: string) =>
          this.deps.vault.releaseImageUrl(path),
      } as any);
      this.imageManager = undefined;
    }
    if (this.cy) {
      if (import.meta.env.DEV) delete (window as any).cy;
      this.cy.destroy();
      this.cy = undefined;
    }
  };

  /**
   * Decides whether a layout pass may move the camera. With stable layout on,
   * safe updates (edge churn from content edits, plain window resizes) keep
   * the user's pan/zoom; structural changes (new/removed nodes), mode
   * changes, explicit Fit/Redraw, and orientation changes still fit.
   */
  private resolveViewportPolicy = (
    isInitial: boolean,
    caller: string,
    randomizeForced: boolean,
    hasNewNodes: boolean,
    hasRemovedNodes: boolean,
  ): "preserve" | "fit" => {
    if (isInitial || !this.deps.graph.stableLayout) return "fit";
    if (caller === "Window Resize" && !randomizeForced) return "preserve";
    if (caller === "Elements Update" && !hasNewNodes && !hasRemovedNodes)
      return "preserve";
    return "fit";
  };

  applyCurrentLayout = async (
    isInitial = false,
    isForced = false,
    caller = "unknown",
    randomizeForced = false,
    hasNewNodes = false,
    hasRemovedNodes = false,
  ) => {
    if (!this.layoutManager) return;

    await this.layoutManager.apply(
      {
        timelineMode: this.deps.graph.timelineMode,
        timelineAxis: this.deps.graph.timelineAxis,
        timelineScale: this.deps.graph.timelineScale,
        orbitMode: this.deps.graph.orbitMode,
        centralNodeId: this.deps.graph.centralNodeId,
        stableLayout: this.deps.graph.stableLayout,
        isGuest: this.deps.vault.isGuest,
        isMobile: this.deps.layoutUIStore.isMobile,
        viewportPolicy: this.resolveViewportPolicy(
          isInitial,
          caller,
          randomizeForced,
          hasNewNodes,
          hasRemovedNodes,
        ),
        onLayoutStart: () => {
          this.isLayoutRunning = true;
        },
        onLayoutComputed: (ms) => {
          this.deps.debugStore.log(`Layout: ${ms}ms`, {
            nodes: this.deps.graph.stats.nodeCount,
            caller,
          });
        },
        onLayoutStop: () => {
          this.isLayoutRunning = false;
          this.graphVisible = true;
          if (isInitial) {
            this.loadPhase = "ready";
          }
        },
        onPositionsUpdated: (updates) => {
          const isReady =
            this.loadPhase === "ready" && this.deps.vault.status !== "loading";
          if (!isInitial && isReady) {
            this.deps.vault.batchUpdate(
              updates as Record<string, Partial<LocalEntity>>,
            );
          }
        },
      },
      isInitial,
      isForced,
      caller,
      randomizeForced,
      hasNewNodes,
    );
  };

  private handleResize = () => {
    if (this.resizeTimer) clearTimeout(this.resizeTimer);
    this.resizeTimer = window.setTimeout(() => {
      if (this.cy) {
        this.cy.resize();
        const width = this.cy.width();
        const height = this.cy.height();
        const currentOrientation = width > height ? "landscape" : "portrait";

        if (
          this.lastOrientation &&
          currentOrientation !== this.lastOrientation
        ) {
          this.deps.debugStore.log(
            `[GraphView] Orientation changed to ${currentOrientation}, updating layout...`,
          );
          this.applyCurrentLayout(false, true, "Window Resize", true);
        } else {
          this.applyCurrentLayout(false, false, "Window Resize", false);
        }

        this.lastOrientation = currentOrientation;
      }
    }, 250);
  };

  private clearNodeSelectTimer = () => {
    if (this.nodeSelectTimer !== null) {
      clearTimeout(this.nodeSelectTimer);
      this.nodeSelectTimer = null;
    }
  };

  // Sync Logic
  syncElements = () => {
    if (this.cy && this.deps.graph.elements) {
      syncGraphElements(this.cy, {
        elements: this.deps.graph.elements,
        vaultStatus: this.deps.vault.status,
        initialLoaded: this.loadPhase !== "idle",
        isTemporalMetadataEqual,
        activeLabels: this.deps.graph.activeLabels,
        labelFilterMode: this.deps.graph.labelFilterMode,
        activeCategories: this.deps.graph.activeCategories,
        onFirstElements: () => {
          this.loadPhase = "elements";
          this.graphVisible = true;
        },
        onLayoutUpdate: (
          isInitial,
          isForced,
          caller,
          hasNewNodes,
          hasRemovedNodes,
        ) => {
          this.applyCurrentLayout(
            isInitial,
            isForced,
            caller,
            false,
            hasNewNodes,
            hasRemovedNodes,
          );
        },
      });
    }
    if (this.loadPhase !== "idle" && !this.graphVisible) {
      this.graphVisible = true;
    }
  };

  syncImages = () => {
    if (this.cy && this.deps.graph.elements && this.imageManager) {
      untrack(() => {
        this.imageManager!.sync({
          showImages: this.deps.graph.showImages,
          resolveImageUrl: (path) => this.deps.vault.resolveImageUrl(path),
          releaseImageUrl: (path: string) =>
            this.deps.vault.releaseImageUrl(path),
          onBatchApplied: (count) => {
            this.deps.debugStore.log(
              `[GraphView] Applied ${count} images to graph nodes.`,
            );
          },
          onLog: (msg) => this.deps.debugStore.log(msg),
          onError: (err) =>
            this.deps.debugStore.error(
              "Incremental image resolution failed",
              err,
            ),
        });
      });
    }
  };

  /**
   * Clears graph-side selection: deselects all nodes, nulls selectedId, and
   * removes neighbourhood dimming. Call this whenever focus ownership moves
   * away from the graph (focus mode takeover, double-tap Zen, background tap).
   */
  clearGraphSelection = () => {
    this.selectedId = null;
    this.clearNodeSelectTimer();
    if (this.cy) {
      this.cy.$("node:selected").unselect();
      this.applyFocus(null);
    }
  };

  applyFocus = (id: string | null) => {
    const currentCy = this.cy;
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

  handleVaultLoading = () => {
    if (
      this.deps.vault.status === "loading" &&
      this.deps.vault.allEntities.length === 0
    ) {
      this.loadPhase = "idle";
      if (this.imageManager)
        this.imageManager.destroy({
          releaseImageUrl: (path: string) =>
            this.deps.vault.releaseImageUrl(path),
        } as any);
    }
  };

  handleVaultLoadFinalization = () => {
    if (this.deps.vault.status === "idle" && this.loadPhase === "elements") {
      this.loadPhase = "finalized";
      this.deps.debugStore.log(
        "[GraphView] Vault load finalized, unlocking all updates.",
      );
      this.applyCurrentLayout(true, true, "Load Finalized");
    }
  };

  handleModeChange = () => {
    if (
      this.cy &&
      (this.loadPhase === "finalized" || this.loadPhase === "ready")
    ) {
      this.applyCurrentLayout(false, true, "Mode Change Effect");
    }
  };
}
