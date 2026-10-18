/**
 * Curated outbound links for the `/resources/castle-floorplans` page.
 *
 * This is a link-out resource hub, not a mirror: no floorplan image is ever
 * copied or hotlinked here. Each entry only stores editorial context and a
 * link to the original publisher. Add a new source by appending an object to
 * `CASTLE_FLOORPLAN_RESOURCES`; nothing else needs to change for it to show
 * up on the page.
 */

export type FloorplanCategoryId =
  | "historical-castles"
  | "palaces-manor-houses"
  | "fortresses"
  | "keeps-and-towers"
  | "fantasy-scale-complexes";

export interface FloorplanCategory {
  id: FloorplanCategoryId;
  label: string;
  description: string;
}

export const FLOORPLAN_CATEGORIES: FloorplanCategory[] = [
  {
    id: "historical-castles",
    label: "Historical castles",
    description:
      "Defensive castles built as working fortifications, not just grand houses.",
  },
  {
    id: "palaces-manor-houses",
    label: "Palaces and manor houses",
    description:
      "Estates built to impress rather than to withstand a siege, useful for noble courts and heist targets alike.",
  },
  {
    id: "fortresses",
    label: "Fortresses",
    description:
      "Larger military strongholds, often with multiple wards, garrisons, and outworks.",
  },
  {
    id: "keeps-and-towers",
    label: "Keeps and towers",
    description:
      "Small, vertical strongholds, good models for a single dungeon location or a minor lord's seat.",
  },
  {
    id: "fantasy-scale-complexes",
    label: "Large fantasy-style complexes",
    description:
      "Sites large or strange enough to model a wizard's school, a dragon's hoard-hall, or another oversized fantasy set piece.",
  },
];

export type FloorplanComplexity =
  "compact" | "moderate" | "large" | "sprawling" | "directory";

export interface FloorplanResource {
  /** Stable slug for this entry, used as a DOM anchor. */
  id: string;
  /** Castle, house, or site name where one is identifiable. */
  name: string;
  category: FloorplanCategoryId;
  /** Direct link to the original source. Never rehosted. */
  url: string;
  /** Name of the publisher/site to credit. */
  sourceName: string;
  /**
   * Optional caveat about the source's own site structure (broken nav, no
   * working index, inconsistent categorisation). Shown next to attribution
   * so a reader isn't surprised when "visit the site" doesn't lead anywhere
   * useful beyond the page linked here.
   */
  sourceNote?: string;
  /** What the linked page actually contains. */
  description: string;
  /** Why a GM or worldbuilder would want this specific source. */
  whyUseful: string;
  complexity: FloorplanComplexity;
  complexityNote: string;
}

export const CASTLE_FLOORPLAN_RESOURCES: FloorplanResource[] = [
  {
    id: "neuschwanstein-castle",
    name: "Neuschwanstein Castle",
    category: "fantasy-scale-complexes",
    url: "http://randwulf.com/hogwarts/Bavaria.html",
    sourceName: "Randwülf Floorplans",
    sourceNote:
      "A personal floor-plan library with no working top-level index: each plan is its own page, linked directly here rather than through a hub URL.",
    description:
      "A hand-drawn floor plan of King Ludwig II's 19th-century Bavarian palace, the building that directly inspired Disney's fairytale castle. Covers the main tower, state rooms, and the hill-top footprint of a palace that was still unfinished at the king's death in 1886.",
    whyUseful:
      "This is the real building behind the generic 'fantasy castle' silhouette, so its floor plan is a shortcut past the cliché straight to specifics: a 213-foot main tower, a 426-foot footprint perched on a sheer 656-foot hill, and state rooms built for spectacle rather than defence. Useful as a direct model for a wizard's tower-palace or an eccentric noble's folly.",
    complexity: "large",
    complexityNote: "Main tower plus multiple state rooms",
  },
  {
    id: "biltmore-estate",
    name: "Biltmore Estate",
    category: "palaces-manor-houses",
    url: "http://randwulf.com/hogwarts/Biltmore.html",
    sourceName: "Randwülf Floorplans",
    sourceNote:
      "A personal floor-plan library with no working top-level index: each plan is its own page, linked directly here rather than through a hub URL.",
    description:
      "Hand-drawn floor plans covering all six levels of the Biltmore House in Asheville, North Carolina, split into a lower-three-floors and an upper-three-floors view.",
    whyUseful:
      "At 175,000 square feet and 250 rooms, Biltmore is the largest private home built in North America, and the plan lays out exactly how a household that size actually functions: 21 servant rooms on the fourth floor, and a basement holding the swimming pool, bowling alley, kitchen, scullery, and laundry. That servant-and-service layer is what most fantasy palace maps skip, and it is the detail that makes a noble estate feel staffed rather than staged.",
    complexity: "sprawling",
    complexityNote: "6 levels, roughly 250 rooms",
  },
  {
    id: "great-castles-directory",
    name: "Great Castles floor plan directory",
    category: "historical-castles",
    url: "https://great-castles.com/floorplans.html",
    sourceName: "Great Castles",
    description:
      "An index of floor plans for more than 200 castles and fortified houses across England, Scotland, Wales, Ireland, France, and Germany, including Dover, Edinburgh, Caernarfon, Chambord, Eltz, and Neuschwanstein. Each castle links out to its own page; check that page's own licensing and sourcing notes before reusing anything from it.",
    whyUseful:
      "Breadth is the point: instead of one plan, this is a starting shelf of real defensive layouts to browse by region until one matches the site a scene needs, from a compact border keep to a sprawling royal fortress.",
    complexity: "directory",
    complexityNote: "200+ linked castles",
  },
];

export function getResourcesByCategory(
  categoryId: FloorplanCategoryId,
): FloorplanResource[] {
  return CASTLE_FLOORPLAN_RESOURCES.filter(
    (resource) => resource.category === categoryId,
  );
}
