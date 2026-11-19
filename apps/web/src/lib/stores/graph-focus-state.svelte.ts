import { isLargeGraphSize } from "graph-engine";
import { isEntityVisible, type Entity } from "schema";
import { browserPerformanceRecorder } from "#lib/services/performance/browser-performance-capture.js";
import type { sessionModeStore } from "#lib/stores/ui/session-mode.svelte.js";
import type { vault } from "./vault.svelte";
import {
  buildGraphElements,
  collectVisibleEntities,
  MIN_FOCUS_DEPTH,
  resolveFocalId,
  type FocusContext,
  type InboundConnections,
  type VisibleEntities,
} from "./graph-focus";

/**
 * The large-vault focus view. For large vaults the graph is culled to a
 * target-sized focus set by default (a big render win); the user can opt out
 * per session with "Show full graph", which renders everything with the cheap
 * perf styling.
 */
export class GraphFocusState {
  private getVault: () => typeof vault;
  private session: typeof sessionModeStore;

  showFullGraph = $state(false);
  /**
   * How much detail the focus view renders. Driven by zoom (zoom in -> more
   * detail) by the controller; starts with a bounded overview. See
   * MIN/MAX_FOCUS_DEPTH.
   */
  depth = $state(MIN_FOCUS_DEPTH);
  /** Stable membership root for a large-vault focus view, independent of selection. */
  rootId = $state<string | null>(null);

  constructor(getVault: () => typeof vault, session: typeof sessionModeStore) {
    this.getVault = getVault;
    this.session = session;
  }

  // Vault scale, measured from the raw entity/connection counts — deliberately
  // independent of `elements` so focus-view culling can't feed back into the
  // "is this a large vault?" decision and create a reactive cycle.
  fullGraphSize = $derived.by(() => {
    const entities = this.sourceEntities;
    let edgeCount = 0;
    const count = entities.length;
    for (let i = 0; i < count; i++) {
      edgeCount += entities[i].connections?.length ?? 0;
    }
    return { nodeCount: count, edgeCount };
  });

  get isLargeGraph() {
    return isLargeGraphSize(
      this.fullGraphSize.nodeCount,
      this.fullGraphSize.edgeCount,
    );
  }

  /** True when the graph is being culled to a target-sized focus set. */
  get active() {
    return this.isLargeGraph && !this.showFullGraph;
  }

  private get sourceEntities(): Entity[] {
    const vault = this.getVault() as any;
    return (vault.graphEntities ?? vault.allEntities) as Entity[];
  }

  private get structureVersion(): number {
    return (this.getVault() as any).graphStructureVersion ?? 0;
  }

  private collectVisible(allEntities: Entity[]): VisibleEntities {
    const settings = {
      sharedMode: this.session.sharedMode,
      defaultVisibility: this.getVault().defaultVisibility,
    };
    return collectVisibleEntities(
      allEntities,
      (entity) => this.session.isGuestMode || isEntityVisible(entity, settings),
    );
  }

  /** Reads the focus state lazily, so selection never rebuilds a settled view. */
  private context(): FocusContext {
    const vault = this.getVault();
    return {
      rootId: this.rootId,
      depth: this.depth,
      selectedId: () => vault.selectedEntityId ?? null,
      inbound: () => (vault.inboundConnections ?? {}) as InboundConnections,
    };
  }

  /** The graph's elements, culled around the focal node while the focus view is on. */
  computeElements() {
    const span = browserPerformanceRecorder.start("graph_focus_compute");
    void this.structureVersion;
    const allEntities = this.sourceEntities;
    const visible = this.collectVisible(allEntities);

    try {
      const { elements, renderedNodeCount } = buildGraphElements(
        visible,
        this.active ? this.context() : null,
      );
      span.complete(() => ({
        entityCount: allEntities.length,
        renderedNodeCount,
        renderedEdgeCount: elements.length - renderedNodeCount,
      }));
      return elements;
    } catch (error) {
      span.fail("unexpected");
      throw error;
    }
  }

  /** Establishes the initial focus root once the graph view is ready. */
  ensureRoot(): void {
    if (!this.active) return;
    const visible = this.collectVisible(this.sourceEntities);
    if (this.rootId && visible.ids.has(this.rootId)) return;

    // A deleted or no-longer-visible root must not fall back to the transient
    // selection: establish a new stable root for the current graph scope.
    this.rootId = resolveFocalId(visible, this.context());
  }

  /** Explicitly navigate a large focus view to an entity outside its set. */
  navigateTo(entityId: string): void {
    if (
      !this.active ||
      !this.getVault().entities[entityId] ||
      this.rootId === entityId
    )
      return;
    this.rootId = entityId;
  }

  /**
   * Toggles between the culled focus view and the full graph for large vaults.
   * Session-only (reset on vault switch); no-op on small vaults where the full
   * graph already renders.
   */
  toggleFullGraph() {
    this.showFullGraph = !this.showFullGraph;
  }

  /** Back to the bounded overview: used by a vault switch and by "reset view". */
  reset() {
    this.showFullGraph = false;
    this.depth = MIN_FOCUS_DEPTH;
    this.rootId = null;
  }
}
