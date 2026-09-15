/**
 * Shared Power Scale concept for the Superhero / Comic Book genre (#3103,
 * part of the #2288 epic).
 *
 * A street-level vigilante campaign and a cosmic super-team campaign are
 * effectively different genres despite sharing the "superhero" label — this
 * is the axis that tells them apart. Generators that want superhero content
 * to feel appropriately scaled (threats, jurisdictions, collateral
 * consequences, NPC/public reaction) should offer this as an option and
 * weave the matching hint into their prompt, the way `public-villain.ts`
 * does with `SUPERHERO_POWER_SCALE_HINTS`.
 *
 * Kept as its own module (not nested inside any one generator's config) so
 * every generator that wants it imports the same six values and the same
 * wording, rather than each coining its own near-duplicate scale.
 */

export const SUPERHERO_POWER_SCALES = [
  "Street",
  "City",
  "National",
  "Global",
  "Cosmic",
  "Multiversal",
] as const;

export type SuperheroPowerScale = (typeof SUPERHERO_POWER_SCALES)[number];

/**
 * One steering sentence per scale, meant to be dropped directly into a
 * prompt alongside the scale's name — not just a label, but enough guidance
 * that a model actually changes what it writes. Threats, jurisdictions,
 * headquarters, collateral consequences, and public/NPC reaction should all
 * track the chosen scale.
 */
export const SUPERHERO_POWER_SCALE_HINTS: Record<SuperheroPowerScale, string> =
  {
    Street:
      "A single neighbourhood or precinct. Threats are armed crime, local corruption, and personal vendettas; stakes are individual lives and small businesses; response is a beat cop or a worried landlord, not the National Guard.",
    City: "One metropolitan area. Threats can shut down transit, city hall, or a stadium; stakes are thousands of residents and the mayor's office; response includes local news crews and a city-wide manhunt.",
    National:
      "A country or federal jurisdiction. Threats target infrastructure, elections, or a capital; stakes are millions of people and national institutions; response includes federal agencies and possibly the military.",
    Global:
      "Planetary in reach. Threats span oceans and borders — climate weapons, pandemics, an invasion fleet in low orbit; stakes are entire nations and species; response is an international coalition or a UN-chartered team.",
    Cosmic:
      "Beyond one planet. Threats involve alien empires, dying stars, or forces indifferent to any single world; stakes are star systems or civilisations; response is whatever cosmic-scale power the setting allows, often arriving too late for anyone to feel in control.",
    Multiversal:
      "Across realities. Threats unravel timelines, merge or erase entire universes, or exploit the existence of alternate selves; stakes are the concept of continuity itself; response is rare, esoteric, and usually comes from someone who has already lost their own universe once.",
  };
