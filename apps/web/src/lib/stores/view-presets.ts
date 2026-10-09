import { systemClock, type Clock } from "$lib/utils/runtime-deps";
import type { TableColumnFilters } from "$lib/components/explorer/entityListFiltering";
import type { SortState } from "$lib/components/table/entityTableSort";

/**
 * Unified saved view presets: named filter & presentation states scoped per vault.
 * Presets bridge both the Graph view and Entity Table view ("Same content, different views").
 */
/**
 * Where each entity sat when a view was saved (#3456). Optional and per view:
 * it is applied on top of the vault's everyday arrangement only while that view
 * is open, and never rewrites it. Keyed by entity id, so a rename keeps a
 * position and a deleted entity's entry is simply never used.
 */
export interface ViewLayoutSnapshot {
  positions: Record<string, { x: number; y: number }>;
}

export interface ViewPresetState {
  /* ─── Shared Content Scope (applies to BOTH Graph & Table) ─── */
  activeLabels: string[];
  labelFilterMode: "AND" | "OR";
  activeCategories: string[];
  searchQuery?: string;
  showIncompleteOnly?: boolean;
  columnFilters?: TableColumnFilters;

  /* ─── Table-Specific Presentation ─── */
  tableSort?: SortState;

  /* ─── Graph-Specific Presentation ─── */
  showLabels?: boolean;
  showImages?: boolean;
  stableLayout?: boolean;
  timelineMode?: boolean;
  timelineAxis?: "x" | "y";
  timelineRange?: { start: number | null; end: number | null };
  timelineScale?: number;
  orbitMode?: boolean;
  centralNodeId?: string | null;
  viewport?: { pan: { x: number; y: number }; zoom: number };
  /** Optional saved arrangement. Absent for filter-only views. */
  layout?: ViewLayoutSnapshot;
}

export interface ViewPreset {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  state: ViewPresetState;
}

export const VIEW_PRESETS_KEY_PREFIX = "viewPresets:";
export const LEGACY_GRAPH_PRESETS_KEY_PREFIX = "graphViewPresets:";

export function viewPresetsSettingsKey(vaultId: string): string {
  return `${VIEW_PRESETS_KEY_PREFIX}${vaultId}`;
}

export function legacyGraphPresetsSettingsKey(vaultId: string): string {
  return `${LEGACY_GRAPH_PRESETS_KEY_PREFIX}${vaultId}`;
}

const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((s) => typeof s === "string");

const isFiniteNumber = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

function parseViewport(raw: unknown): ViewPresetState["viewport"] | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const v = raw as Record<string, any>;
  if (
    !isFiniteNumber(v.zoom) ||
    typeof v.pan !== "object" ||
    v.pan === null ||
    !isFiniteNumber(v.pan.x) ||
    !isFiniteNumber(v.pan.y)
  ) {
    return undefined;
  }
  return { pan: { x: v.pan.x, y: v.pan.y }, zoom: v.zoom };
}

/** Keys that must never become properties of a parsed positions map. */
const UNSAFE_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/**
 * Reads a saved layout, keeping only well-formed positions. Anything unreadable
 * gives `undefined`, so a damaged layout turns the view into a filter-only view
 * instead of breaking it.
 */
export function parseLayout(raw: unknown): ViewLayoutSnapshot | undefined {
  const positionsRaw = (raw as Record<string, unknown> | null)?.positions;
  if (typeof positionsRaw !== "object" || positionsRaw === null) {
    return undefined;
  }
  if (Array.isArray(positionsRaw)) return undefined;
  const positions: Record<string, { x: number; y: number }> = {};
  for (const [id, value] of Object.entries(positionsRaw)) {
    const point = UNSAFE_KEYS.has(id) ? undefined : parsePoint(value);
    if (point) positions[id] = point;
  }
  return Object.keys(positions).length > 0 ? { positions } : undefined;
}

function parsePoint(raw: unknown): { x: number; y: number } | undefined {
  const point = raw as { x?: unknown; y?: unknown } | null;
  return point && isFiniteNumber(point.x) && isFiniteNumber(point.y)
    ? { x: point.x, y: point.y }
    : undefined;
}

function parseTableSort(raw: unknown): SortState | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const s = raw as Record<string, any>;
  if (typeof s.key !== "string") return undefined;
  const validKeys = [
    "title",
    "type",
    "connections",
    "labels",
    "created",
    "modified",
  ];
  if (!validKeys.includes(s.key)) return undefined;
  const direction = s.direction === "desc" ? "desc" : "asc";
  return { key: s.key as any, direction };
}

export function parsePresetState(raw: unknown): ViewPresetState | null {
  if (typeof raw !== "object" || raw === null) return null;
  const s = raw as Record<string, any>;
  if (s.activeLabels !== undefined && !isStringArray(s.activeLabels)) {
    return null;
  }
  if (s.activeCategories !== undefined && !isStringArray(s.activeCategories)) {
    return null;
  }

  const result: ViewPresetState = {
    activeLabels: Array.isArray(s.activeLabels) ? s.activeLabels : [],
    labelFilterMode: s.labelFilterMode === "AND" ? "AND" : "OR",
    activeCategories: Array.isArray(s.activeCategories)
      ? s.activeCategories
      : [],
    showLabels: s.showLabels !== false,
    showImages: s.showImages !== false,
    stableLayout: s.stableLayout !== false,
    timelineMode: s.timelineMode === true,
    timelineAxis: s.timelineAxis === "y" ? "y" : "x",
    timelineRange: {
      start: isFiniteNumber(s.timelineRange?.start)
        ? s.timelineRange.start
        : null,
      end: isFiniteNumber(s.timelineRange?.end) ? s.timelineRange.end : null,
    },
    timelineScale: isFiniteNumber(s.timelineScale) ? s.timelineScale : 100,
    orbitMode: s.orbitMode === true,
    centralNodeId: typeof s.centralNodeId === "string" ? s.centralNodeId : null,
    viewport: parseViewport(s.viewport),
  };

  if (typeof s.searchQuery === "string") {
    result.searchQuery = s.searchQuery;
  }
  if (s.showIncompleteOnly === true) {
    result.showIncompleteOnly = true;
  }
  if (typeof s.columnFilters === "object" && s.columnFilters !== null) {
    result.columnFilters = s.columnFilters;
  }
  const layout = parseLayout(s.layout);
  if (layout) {
    result.layout = layout;
  }
  const parsedSort = parseTableSort(s.tableSort);
  if (parsedSort) {
    result.tableSort = parsedSort;
  }

  return result;
}

/**
 * Parses a persisted preset list, silently dropping malformed entries.
 */
export function parseViewPresets(
  raw: unknown,
  clock: Clock = systemClock,
): ViewPreset[] {
  if (!Array.isArray(raw)) return [];
  const presets: ViewPreset[] = [];
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) continue;
    const p = entry as Record<string, any>;
    if (typeof p.id !== "string" || p.id.length === 0) continue;
    const name = typeof p.name === "string" ? p.name.trim() : "";
    if (name.length === 0) continue;
    const state = parsePresetState(p.state);
    if (!state) continue;

    const createdAt = isFiniteNumber(p.createdAt)
      ? p.createdAt
      : isFiniteNumber(p.updatedAt)
        ? p.updatedAt
        : clock.now();
    const updatedAt = isFiniteNumber(p.updatedAt) ? p.updatedAt : createdAt;
    presets.push({ id: p.id, name, createdAt, updatedAt, state });
  }
  return presets;
}
