import { untrack } from "svelte";
import type { Core } from "cytoscape";
import {
  initGraph,
  isLayoutCollinear,
  LayoutManager,
  GraphImageManager,
  setupGraphEvents,
  syncGraphElements,
  type LayoutRequest,
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

/**
 * Pure viewport-policy resolver — no class state, fully unit-testable.
 * Returns "preserve" when the camera should stay put; "fit" when it should
 * re-frame. T11 will inline this into LayoutRequest.viewport at each call site.
 */
export function resolveViewport(
  isInitial: boolean,
  reason: string,
  reseed: boolean,
  hasNewNodes: boolean,
  hasRemovedNodes: boolean,
  stableLayout: boolean,
): "preserve" | "fit" {
  if (isInitial || !stableLayout) return "fit";
  if (reason === "Window Resize" && !reseed) return "preserve";
  if (reason === "Elements Update" && !hasNewNodes && !hasRemovedNodes)
    return "preserve";
  return "fit";
}

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
  graphVisible = $derived(this.cy !== undefined);
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

  // Tracks the vault the live cy instance is currently showing, so a switch
  // that reuses the controller can restart the load state machine. (A switch
  // that recreates the controller gets a fresh "idle" phase for free.)
  private lastVaultId: string | null | undefined = undefined;

  // Post-load "diagonal slash" safety net. A vault whose saved coordinates
  // collapsed onto a line can have those coords applied to cy by a late element
  // re-sync *after* the initial layout already ran, so no layout pass ever sees
  // the slash. After the vault settles we re-check the actual rendered positions
  // and re-solve once. Re-armed on every fresh load / vault change.
  private slashRecoveryDone = false;
  private slashGuardTimer: number | null = null;
  private readonly SLASH_GUARD_DELAY_MS = 1500;

  // True when the vault being finalized had degenerate (collinear) saved
  // coordinates that the transformer discarded — so the initial solve should be
  // persisted to permanently clean the data instead of re-solving every load.
  private savedCoordsDegenerate = false;

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

      this.deps.debugStore.log(
        "[GraphViewController] Init successful, cy initialized",
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
    if (this.slashGuardTimer) {
      clearTimeout(this.slashGuardTimer);
      this.slashGuardTimer = null;
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
  applyCurrentLayout = async (req: LayoutRequest) => {
    if (!this.layoutManager) return;

    const isInitial = req.isInitial ?? false;
    const viewport = resolveViewport(
      isInitial,
      req.reason,
      req.reseed ?? false,
      req.hasNewNodes ?? false,
      req.hasRemovedNodes ?? false,
      this.deps.graph.stableLayout,
    );

    await this.layoutManager.apply(
      { ...req, viewport },
      {
        timelineMode: this.deps.graph.timelineMode,
        timelineAxis: this.deps.graph.timelineAxis,
        timelineScale: this.deps.graph.timelineScale,
        orbitMode: this.deps.graph.orbitMode,
        centralNodeId: this.deps.graph.centralNodeId,
        stableLayout: this.deps.graph.stableLayout,
        isGuest: this.deps.vault.isGuest,
        isMobile: this.deps.layoutUIStore.isMobile,
        onLayoutStart: () => {
          this.isLayoutRunning = true;
        },
        onLayoutComputed: (ms) => {
          this.deps.debugStore.log(`Layout: ${ms}ms`, {
            nodes: this.deps.graph.stats.nodeCount,
            caller: req.reason,
          });
        },
        onLayoutStop: () => {
          this.isLayoutRunning = false;
          if (isInitial) {
            this.loadPhase = "ready";
          }
        },
        onPositionsUpdated: (updates, meta) => {
          const notLoading = this.deps.vault.status !== "loading";
          const isReady = this.loadPhase === "ready" && notLoading;
          // Persist the initial layout when it heals a degenerate vault — either
          // a runtime re-solve (meta.healed) or the first solve of a vault whose
          // saved coords were a discarded slash. This lands the fix in the vault
          // so it stops reshuffling every load and a Save cleans the on-disk
          // diagonal, instead of being skipped just because it's the initial pass.
          const isHealPersist = meta?.healed || this.savedCoordsDegenerate;
          const shouldPersist = isHealPersist
            ? notLoading
            : !isInitial && isReady;
          if (shouldPersist) {
            this.savedCoordsDegenerate = false;
            this.deps.vault.batchUpdate(
              updates as Record<string, Partial<LocalEntity>>,
            );
          }
        },
      },
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
          this.applyCurrentLayout({
            reason: "Window Resize",
            isForced: true,
            reseed: true,
          });
        } else {
          this.applyCurrentLayout({ reason: "Window Resize" });
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
        },
        onLayoutUpdate: (req) => {
          this.applyCurrentLayout(req);
        },
      });
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

  reconcileLoadState = () => {
    const { status, allEntities, activeVaultId } = this.deps.vault;

    // A vault switch under a reused controller never reactively empties the
    // entity index (it swaps old→new), so restart the load machine when the
    // active id changes. (When the controller is recreated on switch this is a
    // no-op — it already starts fresh.)
    const vaultChanged = this.cy != null && activeVaultId !== this.lastVaultId;
    this.lastVaultId = activeVaultId;

    if (vaultChanged || (status === "loading" && allEntities.length === 0)) {
      this.loadPhase = "idle";
      this.slashRecoveryDone = false;
      if (this.slashGuardTimer) {
        clearTimeout(this.slashGuardTimer);
        this.slashGuardTimer = null;
      }
      if (this.imageManager)
        this.imageManager.destroy({
          releaseImageUrl: (path: string) =>
            this.deps.vault.releaseImageUrl(path),
        } as any);
      return;
    }

    if (status === "idle" && this.loadPhase === "elements") {
      this.loadPhase = "finalized";
      this.savedCoordsDegenerate = this.areSavedCoordsDegenerate();
      this.deps.debugStore.log(
        "[GraphView] Vault load finalized, unlocking all updates.",
      );
      this.applyCurrentLayout({
        reason: "Load Finalized",
        isInitial: true,
        isForced: true,
      });
    }

    // Once the vault is idle with content, (re)arm the slash guard. Debounced
    // via clearTimeout so it fires only after positions have stopped churning.
    if (
      status === "idle" &&
      !this.slashRecoveryDone &&
      this.cy &&
      this.cy.nodes().length > 0
    ) {
      this.scheduleSlashGuard();
    }
  };

  private areSavedCoordsDegenerate = (): boolean => {
    const positions: { x: number; y: number }[] = [];
    for (const entity of this.deps.vault.allEntities) {
      const c = entity?.metadata?.coordinates;
      if (c && Number.isFinite(c.x) && Number.isFinite(c.y)) {
        positions.push({ x: c.x, y: c.y });
      }
    }
    return isLayoutCollinear(positions);
  };

  private scheduleSlashGuard = () => {
    if (this.slashGuardTimer) clearTimeout(this.slashGuardTimer);
    this.slashGuardTimer = window.setTimeout(() => {
      this.slashGuardTimer = null;
      this.recoverFromSlashIfNeeded();
    }, this.SLASH_GUARD_DELAY_MS);
  };

  private recoverFromSlashIfNeeded = () => {
    if (this.slashRecoveryDone || !this.cy || this.cy.destroyed()) return;
    if (this.deps.vault.status === "loading") return;
    const nodes = this.cy.nodes();
    if (nodes.length < 12) return;

    const positions = nodes.map((n) => n.position());
    if (!isLayoutCollinear(positions)) return;

    this.slashRecoveryDone = true;
    this.deps.debugStore.log(
      "[GraphView] Degenerate slash layout detected after load — re-solving.",
    );
    this.applyCurrentLayout({
      reason: "Slash Recovery",
      isInitial: true,
      isForced: true,
      reseed: true,
    });
  };

  handleModeChange = () => {
    if (
      this.cy &&
      (this.loadPhase === "finalized" || this.loadPhase === "ready")
    ) {
      this.applyCurrentLayout({ reason: "Mode Change Effect", isForced: true });
    }
  };
}
