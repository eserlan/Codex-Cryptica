/**
 * Generic (theme-agnostic) entity lore templates, shared across the app's
 * manual entity-creation/revision flow and the importer's AI extraction
 * prompt, so both produce lore with the same section structure.
 */
export const GENERIC_TEMPLATES: Record<string, string> = {
  character: `## Summary
A brief overview of who this character is and their place in the world.

## Appearance
Physical features, style of dress, distinctive markers, or mannerisms.

## Personality & Voice
Key behavioral traits, temperaments, core beliefs, speech rhythm, word choice, and in-character behavior rules.

## Knowledge & Expertise
What domains, skills, and subjects does this character know well? What are the limits of their knowledge — cultural blind spots, restricted access, or topics they are simply ignorant of?

## Goals
What do they actively strive to achieve or protect?

## Methods
How do they go about accomplishing their goals? What resources or skills do they rely on?

## Relationships
Key links and attitudes toward other characters, factions, or places.

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
