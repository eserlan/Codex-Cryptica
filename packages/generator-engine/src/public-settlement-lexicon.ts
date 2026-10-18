/**
 * Settlement-specific phrases layered on the shared vocabulary (#2338).
 *
 * Deliberately short. Almost everything a person types about a settlement is
 * already in `BASE_LEXICON`, because "coastal" or "run by merchants" means the
 * same thing whichever generator it is aimed at. What belongs here is the
 * wording that only makes sense for places.
 */

import { BASE_LEXICON, mergeLexicons, type Lexicon } from "./smart";

export const SETTLEMENT_LEXICON: Lexicon = mergeLexicons(BASE_LEXICON, [
  { trait: "coastal", phrases: ["cove", "atoll", "reef", "lagoon", "bay"] },
  { trait: "maritime", phrases: ["fleet", "boats", "trawlers"] },
  { trait: "underground", phrases: ["catacombs", "undercity", "warren"] },
  { trait: "orbital", phrases: ["spaceport", "starport", "habitat"] },
  { trait: "trade", phrases: ["trading post", "warehouse", "exchange"] },
  { trait: "mining", phrases: ["claim", "pit", "dig"] },
  { trait: "religious", phrases: ["pilgrims", "chapel", "abbey"] },
  { trait: "refuge", phrases: ["hideout", "safehouse", "bolthole"] },
  { trait: "academic", phrases: ["observatory", "campus"] },
  { trait: "eerie", phrases: ["fog bound", "foggy", "too quiet"] },
  { trait: "frontier", phrases: ["homestead", "settler", "settlers"] },
  { trait: "industrial", phrases: ["mill", "refinery", "shipyards"] },
]);
