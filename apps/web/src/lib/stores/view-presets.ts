import { systemClock, type Clock } from "$lib/utils/runtime-deps";
import type { TableColumnFilters } from "$lib/components/explorer/entityListFiltering";
import type { SortState } from "$lib/components/table/entityTableSort";

/**
 * Unified saved view presets: named filter & presentation states scoped per vault.
 * Presets bridge both the Graph view and Entity Table view ("Same content, different views").
 */
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
