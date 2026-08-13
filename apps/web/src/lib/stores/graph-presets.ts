import { systemClock } from "$lib/utils/runtime-deps";
/**
 * Saved graph view presets: named visual states (filters, modes, display
 * toggles, optional camera) scoped per vault. Presets never contain entity
 * data or node coordinates — coordinates live in entity metadata.
 */

export interface GraphViewPresetState {
  activeLabels: string[];
  labelFilterMode: "AND" | "OR";
  activeCategories: string[];
  showLabels: boolean;
  showImages: boolean;
  stableLayout: boolean;
  timelineMode: boolean;
  timelineAxis: "x" | "y";
  timelineRange: { start: number | null; end: number | null };
  timelineScale: number;
  orbitMode: boolean;
  centralNodeId: string | null;
  viewport?: { pan: { x: number; y: number }; zoom: number };
}

export interface GraphViewPreset {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  state: GraphViewPresetState;
}

export const GRAPH_VIEW_PRESETS_KEY_PREFIX = "graphViewPresets:";

export function presetsSettingsKey(vaultId: string) {
  return `${GRAPH_VIEW_PRESETS_KEY_PREFIX}${vaultId}`;
}

const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((s) => typeof s === "string");

const isFiniteNumber = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

function parseViewport(
  raw: unknown,
): GraphViewPresetState["viewport"] | undefined {
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

function parsePresetState(raw: unknown): GraphViewPresetState | null {
  if (typeof raw !== "object" || raw === null) return null;
  const s = raw as Record<string, any>;
  if (!isStringArray(s.activeLabels) || !isStringArray(s.activeCategories)) {
    return null;
  }
  return {
    activeLabels: s.activeLabels,
    labelFilterMode: s.labelFilterMode === "AND" ? "AND" : "OR",
    activeCategories: s.activeCategories,
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
}

/**
 * Parses a persisted preset list, silently dropping malformed entries so one
 * corrupt record never breaks preset loading for the vault.
 */
export function parsePresets(raw: unknown): GraphViewPreset[] {
  if (!Array.isArray(raw)) return [];
  const presets: GraphViewPreset[] = [];
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) continue;
    const p = entry as Record<string, any>;
    if (typeof p.id !== "string" || p.id.length === 0) continue;
    const name = typeof p.name === "string" ? p.name.trim() : "";
    if (name.length === 0) continue;
    const state = parsePresetState(p.state);
    if (!state) continue;
    // Derive a missing timestamp from its sibling so createdAt <= updatedAt
    // holds even for partial records.
    const createdAt = isFiniteNumber(p.createdAt)
      ? p.createdAt
      : isFiniteNumber(p.updatedAt)
        ? p.updatedAt
        : systemClock.now();
    const updatedAt = isFiniteNumber(p.updatedAt) ? p.updatedAt : createdAt;
    presets.push({ id: p.id, name, createdAt, updatedAt, state });
  }
  return presets;
}
