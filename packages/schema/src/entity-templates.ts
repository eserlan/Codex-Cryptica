/**
 * Generic (theme-agnostic) entity lore templates, shared across the app's
 * manual entity-creation/revision flow and the importer's AI extraction
 * prompt, so both produce lore with the same section structure.
 */
export const GENERIC_TEMPLATES: Record<string, string> = {
  character: `## Summary
A brief overview of who this character is and their place in the world.

## First Impression & Mannerisms
Physical appearance, clothing, distinctive vocal cadence, and a memorable physical habit or behavioral quirk.

## Personality & Stances
- **Core Drive**: What primary motive drives their daily actions.
- **Opinions & Biases**: 2–3 sharp, biased stances on local factions, institutions, or rival groups.
- **The Line**: The moral taboo or boundary they will never cross.

## Leverage & Pressure Points
- **What Buys Them**: The favor, coin, or guarantee needed to secure their cooperation.
- **What Breaks Them**: Their deepest fear, vulnerability, or pressure point.

## Knowledge & Expertise
What domains, skills, and subjects does this character know well? What are the limits of their knowledge — cultural blind spots, restricted access, or topics they are simply ignorant of?

## Relationships & Allegiances
Key links, debts owed, and attitudes toward other characters, factions, or places.

## Secrets
Hidden motives, buried pasts, or vulnerabilities known only to a few.

## Story Hooks
Interesting plot hooks or rumors to pull characters into their sphere.`,

  faction: `## Summary
A brief overview of the organization, its reputation, and scale.

## Purpose
The primary mission, ideology, or founding core of the faction.

## Leadership
Who guides this group, and what is their style of governance?

## Members
Types of people recruited, hierarchy structure, and prominent subgroups.

## Resources
Assets, strongholds, magical forces, financial backing, or technological leverage.

## Methods
Typical operations, tactics, and how they exert influence in the world.

## Allies and Enemies
Key diplomatic alignments and bitter conflicts.

## Internal Tensions
Fault lines, rival factions, or ideological rifts within the organization.

## Story Hooks
How players or other entities might interact with or be recruited by this group.`,

  location: `## Summary
A brief description of this location's significance and general atmosphere.

## Geography
Climate, terrain, physical boundaries, and sensory hallmarks.

## Districts & Layout
Notable subdivisions, wards, or sectors of the location.

## Points of Interest
Important landmarks, structures, or historical sites.

## Local Factions
Which organizations or gangs hold sway in this area?

## Lore & History
How did this place come to be, and what major events happened here?`,

  ship: `## Ship Profile
The vessel's name, class, role, condition, and the impression it makes on approach.

## Command, Crew & Passengers
Who commands the ship, who keeps it running, and the loyalties or tensions aboard.

## Key Zones
Important decks, cargo spaces, systems, and places where trouble can unfold.

## Cargo, Capability & Constraints
What the vessel can do, what it carries, and the limits imposed by fuel, repairs, armament, or missing parts.

## Ownership, Debts & Allegiances
Who owns, claims, finances, or is looking for the ship — including any obligations that shape its next job.

## Complication
The immediate operational problem threatening the ship or crew.

## Secret
A hidden history, illicit modification, previous owner, or dangerous cargo.

## Adventure Hooks
Concrete jobs, disputes, or discoveries that draw the crew into play.`,

  item: `## Summary
A brief overview of what this object is and who possesses it.

## Appearance
Physical dimensions, materials, wear, craftsmanship, and sensory details.

## Abilities
Magical properties, technological functions, or physical utility.

## Origin
Who created this item, where, and for what purpose?

## History & Lore
Notable past owners and legendary events surrounding this object.`,

  event: `## Summary
A brief overview of the occurrence and why it matters in history.

## Date & Chronology
When did this take place? Duration and temporal markers.

## Key Participants
Individual instigators, factions involved, and crucial witnesses.

## Sequence of Events
A chronological breakdown of how the occurrence unfolded.

## Aftermath & Legacy
Immediate consequences and long-term historical ripple effects.`,

  creature: `## Summary
A brief overview of the creature, its classification, and danger level.

## Ecology & Habitat
Where do they live? Diet, life cycle, and role in the ecosystem.

## Appearance
Anatomy, size, distinct markings, and sensory impressions.

## Behavior
Social structures, hunting patterns, intelligence level, and temperament.

## Abilities & Combat
Defensive mechanisms, natural weapons, magical features, and tactical vulnerabilities.

## Lore
Myths, rumors, utility, or history of interactions with civilized peoples.`,

  note: `## Summary
A brief description of what these general notes are about.`,
};
