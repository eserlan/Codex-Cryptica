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

export interface SuperheroPowerScaleFallback {
  methods: string;
  resources: string;
  territory: string;
  planStages: readonly [string, string, string, string, string, string];
}

/**
 * Scale-aware material for the deterministic villain fallback. The fallback
 * must remain usable when AI is unavailable, so its scope cannot stop at the
 * selected label while the actual plan stays at street level.
 */
export const SUPERHERO_POWER_SCALE_FALLBACKS: Record<
  SuperheroPowerScale,
  SuperheroPowerScaleFallback
> = {
  Street: {
    methods:
      "Keep the operation inside one neighbourhood: pressure local gangs, protect witnesses, and turn residents or small businesses into leverage.",
    resources:
      "A trusted network of residents, a safehouse, and access to local cameras, patrol schedules, or street-level informants.",
    territory:
      "A neighbourhood whose alleys, rooftops, and community spaces let the villain move before outside help arrives.",
    planStages: [
      "**Stage 1: Mark the block** — Identify the people and businesses that control movement through the neighbourhood.",
      "**Stage 2: Remove local resistance** — Frighten, bribe, or discredit the first people who refuse to cooperate.",
      "**Stage 3: Control the routes** — Make safe passage, supplies, and information depend on the villain's permission.",
      "**Stage 4: Isolate the witnesses** — Cut off the one person or group that can unite the neighbourhood against them.",
      "**Stage 5: Claim the territory** — Turn practical control into a publicly recognised local order.",
      "**Stage 6: Enforce the finished order** — Make the neighbourhood's dependence permanent and punish any return to independence.",
    ],
  },
  City: {
    methods:
      "Work across one metropolitan area: manipulate transit, public services, media, and civic pressure until the city reacts on the villain's timetable.",
    resources:
      "A city-wide informant network, access to critical infrastructure, and allies inside local government, emergency services, or broadcasting.",
    territory:
      "A civic or infrastructure hub where transport, communications, and public attention converge across the city.",
    planStages: [
      "**Stage 1: Disrupt the city rhythm** — Create small failures that reveal which services and officials can be pressured.",
      "**Stage 2: Redirect public fear** — Make each disruption appear to come from a different local threat.",
      "**Stage 3: Capture the response** — Put the villain's allies in charge of the emergency measures the city now needs.",
      "**Stage 4: Break the civic coalition** — Turn districts, agencies, or public figures against the one group still organising resistance.",
      "**Stage 5: Take the city mandate** — Convert emergency control into an accepted city-wide authority.",
      "**Stage 6: Lock in the new order** — Use the city's dependence to make reversal costly for every district at once.",
    ],
  },
  National: {
    methods:
      "Target a country's infrastructure, elections, and national institutions through coordinated pressure that makes federal intervention serve the villain's agenda.",
    resources:
      "Agents across several regions, influence over national communications or infrastructure, and access to officials who can trigger a federal response.",
    territory:
      "A distributed national network rather than one fortress: regional safe sites connected to a command centre near the country's political heart.",
    planStages: [
      "**Stage 1: Test the institutions** — Apply separate pressures to regions, agencies, and public systems to find the weakest links.",
      "**Stage 2: Manufacture a national crisis** — Join those pressures into a single emergency that demands central action.",
      "**Stage 3: Direct the federal response** — Place loyal operators where national resources and information are allocated.",
      "**Stage 4: Split the opposition** — Make regions, parties, or agencies blame one another before they can coordinate.",
      "**Stage 5: Take the national mandate** — Use legal or popular authority to make the villain's control appear necessary.",
      "**Stage 6: Rebuild the country around dependence** — Make the institutions that could remove the villain rely on the new order.",
    ],
  },
  Global: {
    methods:
      "Coordinate pressure across borders: exploit international dependencies, climate or health emergencies, and rival national interests so no country can solve the threat alone.",
    resources:
      "Cells on several continents, access to global communications or supply routes, and a cause that can recruit allies faster than governments can coordinate.",
    territory:
      "A mobile international network anchored by a few strategic ports, orbital links, or diplomatic safe sites rather than a single national base.",
    planStages: [
      "**Stage 1: Find the global dependencies** — Identify the systems whose disruption will affect several countries at once.",
      "**Stage 2: Trigger linked emergencies** — Strike those dependencies in different regions so every government sees a separate crisis.",
      "**Stage 3: Offer the only coordination** — Make the villain's network the fastest route for aid, information, or protection.",
      "**Stage 4: Fracture the coalition** — Turn national priorities against the international response before it can act as one.",
      "**Stage 5: Set the global terms** — Force the remaining powers to accept the villain's conditions to restore stability.",
      "**Stage 6: Make resistance worldwide** — Connect enough institutions to the new order that no single country can undo it.",
    ],
  },
  Cosmic: {
    methods:
      "Operate beyond one planet: manipulate interplanetary routes, alien powers, or stellar phenomena so entire civilisations must respond to the villain's timetable.",
    resources:
      "Access to spacefaring technology or cosmic allies, knowledge of stellar-scale hazards, and agents able to act far beyond one world.",
    territory:
      "A hidden station, drifting vessel, or inhabited world positioned at a crossroads between star systems and their competing powers.",
    planStages: [
      "**Stage 1: Chart the systems** — Locate the stellar routes, civilisations, and cosmic forces that can be made to depend on one another.",
      "**Stage 2: Disturb the balance** — Create separate disturbances that each look like a local astronomical or political problem.",
      "**Stage 3: Claim the warnings** — Make the villain's network the only source able to predict or contain the disturbances.",
      "**Stage 4: Isolate the defenders** — Prevent worlds and civilisations from sharing enough knowledge to unite against the plan.",
      "**Stage 5: Reshape the system** — Use the accumulated crises to force a new balance of power across the affected stars.",
      "**Stage 6: Secure the cosmic order** — Anchor the finished arrangement before a larger power can arrive and reverse it.",
    ],
  },
  Multiversal: {
    methods:
      "Act across realities: exploit differences between timelines, recruit alternate selves, and make one universe's survival depend on choices made in another.",
    resources:
      "Reliable passages between realities, knowledge gathered from alternate histories, and allies who have already survived the collapse of their own universes.",
    territory:
      "A nexus between realities where divergent timelines can be observed and crossed, with no single universe serving as a permanent headquarters.",
    planStages: [
      "**Stage 1: Map the divergences** — Find the small differences between realities that can be turned into leverage across the whole structure.",
      "**Stage 2: Recruit the alternates** — Offer threatened versions of key people a way to save their own reality at another's expense.",
      "**Stage 3: Couple the timelines** — Make events in separate universes reinforce one another instead of remaining independent.",
      "**Stage 4: Erase the alternatives** — Remove the timelines and alternate selves most capable of exposing or resisting the pattern.",
      "**Stage 5: Choose the surviving continuity** — Force the remaining realities to accept the villain's preferred version of what exists.",
      "**Stage 6: Stabilise the new multiverse** — Seal the crossings around the villain's chosen continuity before resistance can reopen them.",
    ],
  },
};
