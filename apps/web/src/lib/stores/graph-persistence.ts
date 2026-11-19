import type { Era } from "schema";
import { getDB } from "../utils/idb";

export type CommunityMode = "off" | "soft" | "strong";
export type LabelFilterMode = "AND" | "OR";

export const nextCommunityMode = (mode: CommunityMode): CommunityMode =>
  mode === "off" ? "soft" : mode === "soft" ? "strong" : "off";

/** The graph settings that survive a reload. A missing value keeps its default. */
export interface PersistedGraphState {
  eras?: Era[];
  showLabels?: boolean;
  showImages?: boolean;
  communityMode?: CommunityMode;
  stableLayout?: boolean;
  recentLabels?: string[];
  labelFilterMode?: LabelFilterMode;
}

/**
 * Saves one setting. The screen has already changed by the time this runs, so
 * a failed write is logged rather than thrown.
 */
export async function persistGraphSetting(
  key: string,
  value: unknown,
): Promise<void> {
  try {
    const db = await getDB();
    await db.put("settings", value, key);
  } catch (error) {
    console.error(`[GraphStore] Failed to persist ${key}:`, error);
  }
}

export async function loadPersistedGraphState(): Promise<PersistedGraphState> {
  const db = await getDB();
  const state: PersistedGraphState = {};

  const eras = await db.getAll("world_eras");
  if (eras) state.eras = eras;

  const [labels, images, mode, legacy] = await Promise.all([
    db.get("settings", "graphShowLabels"),
    db.get("settings", "graphShowImages"),
    db.get("settings", "graphCommunityMode"),
    // Before there were three states this was a plain on/off flag.
    db.get("settings", "graphShowCommunities"),
  ]);
  if (labels !== undefined) state.showLabels = labels;
  if (images !== undefined) state.showImages = images;
  const savedMode = mode ?? (legacy === false ? "off" : undefined);
  if (savedMode === "off" || savedMode === "soft" || savedMode === "strong") {
    state.communityMode = savedMode;
  }

  const stableLayout = await db.get("settings", "graphStableLayout");
  if (stableLayout !== undefined) state.stableLayout = stableLayout;

  const recentLabels = await db.get("settings", "graphRecentLabels");
  if (recentLabels !== undefined) state.recentLabels = recentLabels;

  const labelFilterMode = await db.get("settings", "graphLabelFilterMode");
  if (labelFilterMode !== undefined) state.labelFilterMode = labelFilterMode;

  return state;
}

/** Replaces every stored era with `eras`. */
export async function saveEras(eras: Era[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("world_eras", "readwrite");
  await tx.store.clear();
  for (const era of eras) {
    await tx.store.put(era);
  }
  await tx.done;
}
