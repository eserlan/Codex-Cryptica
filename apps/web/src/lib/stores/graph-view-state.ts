import type { Entity } from "schema";
import type { ViewLayoutSnapshot, ViewPresetState } from "./view-presets";

const RECENT_LABEL_LIMIT = 5;

/** Puts `label` first in the recent list, drops any earlier copy, keeps five. */
export function pushRecentLabel(recent: string[], label: string): string[] {
  return [label, ...recent.filter((l) => l !== label)].slice(
    0,
    RECENT_LABEL_LIMIT,
  );
}

/** The graph fields a saved view records. */
export type ViewStateSource = {
  activeLabels: Set<string>;
  labelFilterMode: "AND" | "OR";
  activeCategories: Set<string>;
  showLabels: boolean;
  showImages: boolean;
  stableLayout: boolean;
  timelineMode: boolean;
  timelineAxis: "x" | "y";
  timelineRange: { start: number | null; end: number | null };
  timelineScale: number;
  orbitMode: boolean;
  centralNodeId: string | null;
};

export function captureViewState(
  source: ViewStateSource,
  viewport?: ViewPresetState["viewport"],
  layout?: ViewLayoutSnapshot,
): ViewPresetState {
  return {
    activeLabels: Array.from(source.activeLabels),
    labelFilterMode: source.labelFilterMode,
    activeCategories: Array.from(source.activeCategories),
    showLabels: source.showLabels,
    showImages: source.showImages,
    stableLayout: source.stableLayout,
    timelineMode: source.timelineMode,
    timelineAxis: source.timelineAxis,
    timelineRange: { ...source.timelineRange },
    timelineScale: source.timelineScale,
    orbitMode: source.orbitMode,
    centralNodeId: source.centralNodeId,
    viewport,
    // Only present when the user chose to keep the layout, so filter-only
    // views are saved exactly as they always were.
    ...(layout ? { layout } : {}),
  };
}

/**
 * The parts of a preset's filters that still exist in the vault. Labels,
 * categories and an orbit centre that were deleted since the view was saved
 * are dropped instead of failing (preset drift).
 */
export function resolveAvailableFilters(
  s: ViewPresetState,
  entities: Entity[],
) {
  let labels = s.activeLabels;
  let categories = s.activeCategories;
  let centralNodeId = s.centralNodeId;
  if (entities.length > 0) {
    const existingLabels = new Set<string>();
    const existingCategories = new Set<string>();
    const existingIds = new Set<string>();
    for (const e of entities) {
      existingIds.add(e.id);
      if (e.type) existingCategories.add(e.type);
      for (const l of e.labels ?? []) existingLabels.add(l.toLowerCase());
    }
    labels = labels.filter((l) => existingLabels.has(l.toLowerCase()));
    categories = categories.filter((c) => existingCategories.has(c));
    if (centralNodeId && !existingIds.has(centralNodeId)) {
      centralNodeId = null;
    }
  }
  return { labels, categories, centralNodeId };
}

/**
 * Everything a saved view puts back on the graph, with defaults for what an
 * older view did not store. Orbit only stays on when it still has a centre.
 */
export function resolvePresetView(s: ViewPresetState, entities: Entity[]) {
  const { labels, categories, centralNodeId } = resolveAvailableFilters(
    s,
    entities,
  );
  const centre = centralNodeId ?? null;
  return {
    activeLabels: new Set(labels),
    labelFilterMode: s.labelFilterMode,
    activeCategories: new Set(categories),
    showLabels: s.showLabels !== false,
    showImages: s.showImages !== false,
    stableLayout: s.stableLayout !== false,
    timelineAxis: s.timelineAxis === "y" ? ("y" as const) : ("x" as const),
    timelineRange: {
      start: s.timelineRange?.start ?? null,
      end: s.timelineRange?.end ?? null,
    },
    timelineScale: s.timelineScale ?? 100,
    timelineMode: s.timelineMode === true,
    centralNodeId: centre,
    orbitMode: s.orbitMode === true && centre !== null,
  };
}
