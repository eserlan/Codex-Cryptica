import type { RegionRefusal } from "hex-crawl-engine";

/** Plain-language text for each reason a region cannot be proposed. */
export const REFUSAL_TEXT: Record<RegionRefusal, string> = {
  "nothing-to-generate": "There is nothing to generate here.",
  "too-large": "That area is too large.",
  "invalid-radius": "Pick a radius from 1 to 12.",
  "centre-off-map": "That hex is off the map.",
  "no-terrain-available":
    "Every terrain is set to None, so nothing can be proposed.",
};
