import type { Core } from "cytoscape";
import type {
  LayoutManager,
  GraphImageManager,
  CommunityHullOverlay,
  LayoutRequest,
} from "graph-engine";
import type { graph as graphStore } from "#lib/stores/graph.svelte.js";
import type { vault as vaultStore } from "#lib/stores/vault.svelte.js";
import type { debugStore as debugStoreType } from "#lib/stores/debug.svelte.js";
import type { layoutUIStore as layoutUIStoreType } from "#lib/stores/ui/layout-ui.svelte.js";
import type { connectionModeStore as connectionModeStoreType } from "#lib/stores/ui/connection-mode.svelte.js";
import type { modalUIStore as modalUIStoreType } from "#lib/stores/ui/modal-ui.svelte.js";
import type { Clock } from "#lib/utils/runtime-deps.js";

export type LoadPhase = "idle" | "elements" | "finalized" | "ready";

export interface GraphViewDependencies {
  clock?: Clock;
  graph: typeof graphStore;
  vault: typeof vaultStore;
  debugStore: typeof debugStoreType;
  layoutUIStore: typeof layoutUIStoreType;
  connectionModeStore: typeof connectionModeStoreType;
  modalUIStore: typeof modalUIStoreType;
}

/** Reactive state stays on the facade; collaborators receive the live host. */
export interface GraphViewHost {
  cy: Core | undefined;
  layoutManager: LayoutManager | undefined;
  imageManager: GraphImageManager | undefined;
  communityHulls: CommunityHullOverlay | undefined;
  isSuspended: boolean;
  isLayoutRunning: boolean;
  loadPhase: LoadPhase;
  selectedId: string | null;
  hoveredEntityId: string | null;
  hoverPosition: { x: number; y: number } | null;
  editingEdge: {
    source: string;
    target: string;
    label: string;
    type: string;
  } | null;
  pendingSearchFocus: {
    entityId: string;
    zoom: number;
    timestamp: number;
  } | null;
  applyCurrentLayout(req: LayoutRequest): Promise<void>;
  applyFocus(id: string | null): void;
  clearGraphSelection(): void;
}
