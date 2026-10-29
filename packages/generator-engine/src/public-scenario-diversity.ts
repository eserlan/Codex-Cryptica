import { formatConceptBlock, rollConcept } from "./concept-dimensions";
import { defaultRng, pickFrom, type Rng } from "./random-utils";

/** A shared starting point for public scenario prompts, subordinate to user choices. */
export function formatPublicScenarioConcept(
  genre: string,
  tone: string,
  rng: Rng = defaultRng,
  multipleItems = false,
): string {
  const block = formatConceptBlock(rollConcept(genre, tone, rng));
  return `${block}
Explicit user selections, instructions and established facts take precedence over these suggestions.${multipleItems ? "\nSpread these choices across the items rather than repeating the same concept in each one." : ""}`;
}

/** Optional variation cues for scenarios anchored to a specific user premise. */
export function formatPublicAnchoredScenarioCue(
  kind: "puzzle" | "plot-twist",
  rng: Rng = defaultRng,
): string {
  const cues =
    kind === "puzzle"
      ? [
          "Use a mechanism involving movement or spatial relationships.",
          "Use a mechanism involving sound, timing, or sequence.",
          "Use a mechanism involving weight, balance, or physical materials.",
          "Use a mechanism involving social cues or cooperation.",
        ]
      : [
          "Consider a reversal of incentives or obligations.",
          "Consider a mistaken interpretation of a true observation.",
          "Consider an overlooked consequence of an earlier choice.",
          "Consider a conflict between two legitimate priorities.",
        ];
  return `Optional variation cue: ${pickFrom(cues, rng)} Use it only if compatible with the user's choices, premise and established facts; these take precedence.`;
}
