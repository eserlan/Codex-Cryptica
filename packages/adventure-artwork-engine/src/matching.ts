import type { ArtworkAsset } from "./catalogue";
import { normalizeArtworkCues } from "./cues";
export interface ArtworkCues {
  type: ArtworkAsset["type"];
  genre?: ArtworkAsset["genres"][number];
  primaryCues: readonly string[];
  settingCues?: readonly string[];
  moodCues?: readonly string[];
  timeCues?: readonly string[];
}
export function matchArtwork(
  assets: readonly ArtworkAsset[],
  cues: ArtworkCues,
): ArtworkAsset | null {
  const all = new Set(
    normalizeArtworkCues([
      ...cues.primaryCues,
      ...(cues.settingCues ?? []),
      ...(cues.moodCues ?? []),
      ...(cues.timeCues ?? []),
    ]),
  );
  let best: ArtworkAsset | null = null;
  let bestScore = -Infinity;
  for (const asset of assets) {
    if (
      asset.withdrawn ||
      asset.review.status !== "approved" ||
      asset.type !== cues.type ||
      !asset.genres.includes(cues.genre ?? "neutral") ||
      asset.excludes.some((value) => all.has(value))
    )
      continue;
    const primary = asset.primaryCues.filter(
      (value) => all.has(value) && cues.primaryCues.includes(value),
    ).length;
    if (!primary) continue;
    const unmatchedPrimary = asset.primaryCues.length - primary;
    const score =
      primary * 8 +
      asset.settingCues.filter((value) => all.has(value)).length * 4 +
      asset.moodCues.filter(
        (value) => all.has(value) && cues.moodCues?.includes(value),
      ).length +
      asset.timeCues.filter(
        (value) => all.has(value) && cues.timeCues?.includes(value),
      ).length -
      unmatchedPrimary;
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
