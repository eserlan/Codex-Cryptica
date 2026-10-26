import type { Core, NodeSingular } from "cytoscape";
import { setupGraphEvents } from "graph-engine";
import { systemClock, type Clock } from "#lib/utils/runtime-deps.js";
import {
  browserPerformanceCapture,
  browserPerformanceRecorder,
} from "#lib/services/performance/browser-performance-capture.js";
import {
  DEFAULT_SEARCH_ENTITY_ZOOM,
  consumePendingSearchEntityFocus,
  SEARCH_ENTITY_FOCUS_EVENT,
  markSearchEntityFocusHandled,
} from "../search/search-focus";
import type { GraphViewDependencies, GraphViewHost } from "./graph-view-types";

/** Graph pointer interactions, selection and incoming search-focus requests. */
export class GraphViewInteractions {
  private nodeSelectTimer: number | null = null;
  private nodeSelectSpan: ReturnType<
    typeof browserPerformanceRecorder.start
  > | null = null;
  private searchFocusListener: ((event: Event) => void) | null = null;
  private clock: Clock;

  constructor(
    private host: GraphViewHost,
    private deps: GraphViewDependencies,
  ) {
    this.clock = deps.clock ?? systemClock;
  }

  attach(cy: Core) {
    return setupGraphEvents(cy, {
      onNodeMouseOver: (id, renderedPos) => {
        this.host.hoverPosition = renderedPos;
        this.host.hoveredEntityId = id;
      },
      onNodeMouseOut: () => {
        this.host.hoveredEntityId = null;
        this.host.hoverPosition = null;
      },
      onNodeTap: this.onNodeTap,
      onNodeDoubleTap: (id, _node) => {
        this.host.clearGraphSelection();
        this.deps.modalUIStore.openZenMode(id);
      },
      onEdgeTap: (data) => {
        this.host.editingEdge = {
          source: data.source,
          target: data.target,
          label: data.label || "",
          type: data.connectionType || "neutral",
        };
      },
      onBackgroundTap: () => {
        this.host.clearGraphSelection();
        if (this.deps.connectionModeStore.isConnecting)
          this.deps.connectionModeStore.toggleConnectMode();
      },
      onViewportChange: () => {
        if (this.host.hoveredEntityId && cy) {
          const node = cy.$id(this.host.hoveredEntityId);
          if (node.length > 0) {
            const renderedPos = node.renderedPosition();
            this.host.hoverPosition = renderedPos;
          }
        }
        return this.host.hoverPosition;
      },
    });
  }

  private onNodeTap = async (id: string, node: NodeSingular) => {
    const cy = typeof node?.cy === "function" ? node.cy() : this.host.cy;
    const lastContextTap =
      (cy?.scratch?.("_lastCxtTap") as number | undefined) ?? 0;
    if (this.clock.now() - lastContextTap < 400) return;
    this.recordNodePosition(cy, node);
    if (this.deps.connectionModeStore.isConnecting) {
      await this.connectNode(id, node);
      return;
    }
    if (this.deps.layoutUIStore.isMobile) {
      this.host.clearGraphSelection();
      this.deps.modalUIStore.openZenMode(id);
      return;
    }
    this.scheduleNodeSelection(id);
  };

  private recordNodePosition(cy: Core | undefined, node: NodeSingular) {
    const container =
      typeof cy?.container === "function"
        ? cy.container()
        : typeof this.host.cy?.container === "function"
          ? this.host.cy.container()
          : null;
    if (!container) {
      this.deps.layoutUIStore.setLastSelectedNodePosition(null);
      return;
    }
    const rect = container.getBoundingClientRect();
    const renderedPos = node.renderedPosition();
    this.deps.layoutUIStore.setLastSelectedNodePosition({
      x: rect.left + renderedPos.x,
      y: rect.top + renderedPos.y,
    });
  }

  private async connectNode(id: string, node: NodeSingular) {
    const connection = this.deps.connectionModeStore;
    if (!connection.connectingNodeId) {
      connection.connectingNodeId = id;
      node.addClass("selected-source");
    } else if (connection.connectingNodeId === id) {
      connection.connectingNodeId = null;
      node.removeClass("selected-source");
    } else {
      await this.deps.vault.addConnection(
        connection.connectingNodeId,
        id,
        "neutral",
      );
      connection.toggleConnectMode();
    }
  }

  private scheduleNodeSelection(id: string) {
    this.clearNodeSelectTimer();
    const selectionStartedAt = browserPerformanceCapture.now();
    this.nodeSelectSpan = browserPerformanceRecorder.start("graph_select");
    this.nodeSelectTimer = window.setTimeout(() => {
      this.host.selectedId = id;
      this.nodeSelectTimer = null;
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          this.nodeSelectSpan?.complete(() => ({
            renderedNodeCount: this.host.cy?.nodes().length ?? 0,
            renderedEdgeCount: this.host.cy?.edges().length ?? 0,
            longestAnimationFrameMs:
              browserPerformanceCapture.longestAnimationFrameSince(
                selectionStartedAt,
              ),
          }));
          this.nodeSelectSpan = null;
        }),
      );
    }, 300);
  }

  destroy() {
    if (this.searchFocusListener) {
      window.removeEventListener(
        SEARCH_ENTITY_FOCUS_EVENT,
        this.searchFocusListener,
      );
      this.searchFocusListener = null;
    }
    this.clearNodeSelectTimer();
  }
  listenForSearchFocus = () => {
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
      this.host.pendingSearchFocus = {
        entityId: detail.entityId,
        zoom: detail.zoom ?? DEFAULT_SEARCH_ENTITY_ZOOM,
        timestamp: systemClock.now(),
      };
    };

    window.addEventListener(
      SEARCH_ENTITY_FOCUS_EVENT,
      this.searchFocusListener,
    );

    const bufferedSearchFocus = consumePendingSearchEntityFocus();
    if (bufferedSearchFocus) {
      this.host.pendingSearchFocus = {
        ...bufferedSearchFocus,
        timestamp: systemClock.now(),
      };
    }
  };

  clearNodeSelectTimer = () => {
    if (this.nodeSelectTimer !== null) {
      clearTimeout(this.nodeSelectTimer);
      this.nodeSelectTimer = null;
    }
    this.nodeSelectSpan?.cancel();
    this.nodeSelectSpan = null;
  };

  clearGraphSelection = () => {
    this.host.selectedId = null;
    this.clearNodeSelectTimer();
    if (this.host.cy) {
      this.host.cy.$("node:selected").unselect();
      this.host.applyFocus(null);
    }
  };

  applyFocus = (id: string | null) => {
    const currentCy = this.host.cy;
    if (!currentCy) return;
    try {
      currentCy.batch(() => {
        const allEles = currentCy.elements();
        const node = id ? currentCy.$id(id) : null;
        if (!node || node.length === 0) {
          allEles.removeClass("dimmed neighborhood secondary-neighborhood");
          return;
        }
        const firstLevel = node.closedNeighborhood();
        const firstLevelNodes = firstLevel.nodes();
        const secondLevelNodes = firstLevelNodes
          .neighborhood()
          .nodes()
          .not(firstLevelNodes);
        const secondLevelEdges = secondLevelNodes.edgesWith(firstLevelNodes);
        const secondLevel = secondLevelNodes.add(secondLevelEdges);
        allEles.addClass("dimmed");
        allEles.removeClass("neighborhood secondary-neighborhood");
        firstLevel.removeClass("dimmed");
        firstLevel.addClass("neighborhood");
        secondLevel.removeClass("dimmed");
        secondLevel.addClass("secondary-neighborhood");
      });
    } catch {
      /* ignore */
    }
  };
}
