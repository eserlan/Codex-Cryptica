import type { ArtworkAsset } from "./catalogue";
import {
  isNpcAncestryCue,
  isNpcGenericRoleCue,
  normalizeArtworkCues,
} from "./cues";
export interface ArtworkCues {
  type: ArtworkAsset["type"];
  genre?: ArtworkAsset["genres"][number];
  primaryCues: readonly string[];
  settingCues?: readonly string[];
  moodCues?: readonly string[];
  timeCues?: readonly string[];
}

function scoreNpcPrimaryMatch(cue: string): number {
  if (isNpcAncestryCue(cue)) return 8;
  if (isNpcGenericRoleCue(cue)) return 64;
  return 128;
}

function isAssetEligible(
  asset: ArtworkAsset,
  cues: ArtworkCues,
  allCues: ReadonlySet<string>,
): boolean {
  if (asset.withdrawn || asset.review.status !== "approved") return false;
  if (asset.type !== cues.type) return false;
  if (!asset.genres.includes(cues.genre ?? "neutral")) return false;
  return !asset.excludes.some((value) => allCues.has(value));
}

function scoreAsset(
  asset: ArtworkAsset,
  type: ArtworkAsset["type"],
  sets: {
    primary: ReadonlySet<string>;
    all: ReadonlySet<string>;
    mood: ReadonlySet<string>;
    time: ReadonlySet<string>;
  },
): number | null {
  const matchedPrimary = asset.primaryCues.filter((value) =>
    sets.primary.has(value),
  );
  if (matchedPrimary.length === 0) return null;
  const unmatchedPrimary = asset.primaryCues.length - matchedPrimary.length;
  const primaryScore =
    type === "npc"
      ? matchedPrimary.reduce(
          (total, cue) => total + scoreNpcPrimaryMatch(cue),
          0,
        )
      : matchedPrimary.length * 8;
  return (
    primaryScore +
    asset.settingCues.filter((value) => sets.all.has(value)).length * 4 +
    asset.moodCues.filter((value) => sets.mood.has(value)).length +
    asset.timeCues.filter((value) => sets.time.has(value)).length -
    unmatchedPrimary
  );
}

export function matchArtwork(
  assets: readonly ArtworkAsset[],
  cues: ArtworkCues,
): ArtworkAsset | null {
  const primary = new Set(normalizeArtworkCues(cues.primaryCues));
  const mood = new Set(normalizeArtworkCues(cues.moodCues ?? []));
  const time = new Set(normalizeArtworkCues(cues.timeCues ?? []));
  const all = new Set([
    ...primary,
    ...normalizeArtworkCues(cues.settingCues ?? []),
    ...mood,
    ...time,
  ]);
  const sets = { primary, all, mood, time };
  let best: ArtworkAsset | null = null;
  let bestScore = -Infinity;
  for (const asset of assets) {
    if (!isAssetEligible(asset, cues, all)) continue;
    const score = scoreAsset(asset, cues.type, sets);
    if (score === null) continue;
    if (
      score > bestScore ||
      (score === bestScore && best && asset.id < best.id)
    ) {
      best = asset;
      bestScore = score;
    }
  }
  return best;
}
