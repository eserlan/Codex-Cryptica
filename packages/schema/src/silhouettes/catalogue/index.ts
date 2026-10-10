import { CHARACTER_SILHOUETTES } from "./characters";
import { CREATURE_SILHOUETTES } from "./creatures";
import { LOCATION_SILHOUETTES } from "./locations";
import { ITEM_SILHOUETTES } from "./items";
import { NOTE_SILHOUETTES } from "./notes";
import { FACTION_SILHOUETTES } from "./factions";
import { EVENT_SILHOUETTES } from "./events";
import type { SilhouetteDefinition } from "../types";

export {
  CHARACTER_SILHOUETTES,
  CREATURE_SILHOUETTES,
  LOCATION_SILHOUETTES,
  ITEM_SILHOUETTES,
  NOTE_SILHOUETTES,
  FACTION_SILHOUETTES,
  EVENT_SILHOUETTES,
};

/**
 * Curated library of crisp vector silhouettes for all entity types across multiple genres.
 * Designed with a normalized 100x100 viewport and fill="currentColor" for dynamic theme tinting.
 */
export const SILHOUETTES: SilhouetteDefinition[] = [
  ...CHARACTER_SILHOUETTES,
  ...CREATURE_SILHOUETTES,
  ...LOCATION_SILHOUETTES,
  ...ITEM_SILHOUETTES,
  ...NOTE_SILHOUETTES,
  ...FACTION_SILHOUETTES,
  ...EVENT_SILHOUETTES,
];

export const SILHOUETTE_MAP = new Map<string, SilhouetteDefinition>(
  SILHOUETTES.map((s) => [s.id, s]),
);
