/** Public catalogue vocabulary. Add terms deliberately alongside reviewed assets. */
export const ARTWORK_CUES = [
  "forest",
  "woodland",
  "mountain",
  "hills",
  "plains",
  "desert",
  "swamp",
  "river",
  "coast",
  "ocean",
  "island",
  "tundra",
  "snow",
  "cave",
  "ruins",
  "village",
  "town",
  "city",
  "harbour",
  "road",
  "castle",
  "temple",
  "tavern",
  "market",
  "farm",
  "space-station",
  "starship",
  "laboratory",
  "industrial",
  "urban",
  "rural",
  "wilderness",
  "interior",
  "exterior",
  "traveller",
  "merchant",
  "guard",
  "scholar",
  "explorer",
  "worker",
  "quiet",
  "busy",
  "ominous",
  "hopeful",
  "mysterious",
  "day",
  "night",
  "dawn",
  "dusk",
  "rain",
  "fog",
  "winter",
  "summer",
] as const;
const allowed = new Set<string>(ARTWORK_CUES);
export function isArtworkCue(value: string): boolean {
  return allowed.has(value);
}
/** Bound and filter already player-visible structured cues, never raw narration. */
export function normalizeArtworkCues(values: readonly string[]): string[] {
  const result: string[] = [];
  for (const value of values) {
    if (isArtworkCue(value) && !result.includes(value)) result.push(value);
    if (result.length === 24) break;
  }
  return result;
}
