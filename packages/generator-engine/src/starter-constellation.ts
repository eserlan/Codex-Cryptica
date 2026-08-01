/**
 * Starter Constellation generator — produces a small (4-6 entity) interconnected
 * scenario web for a given theme, used by Guided Mode's Quick Start flow
 * (#1909). Framework-free: builds prompts and produces local deterministic
 * output; the web app owns the AI client and vault persistence.
 */

import { type Rng, defaultRng, pickFrom } from "./random-utils";
import { parseFencedJson } from "./llm-response-utils";
import type {
  ConstellationEntity,
  ConstellationRelationship,
  StarterConstellationConfig,
  StarterConstellationResult,
} from "./starter-constellation-types";

interface ThemeArchetypeSet {
  themeName: string;
  regionLabel: string;
  regionNames: string[];
  settlementLabel: string;
  settlementNames: string[];
  factionLabel: string;
  factionNames: string[];
  characterRoles: string[];
  threatLabel: string;
  threatNames: string[];
  flavor: string;
}

const DEFAULT_THEME_ID = "fantasy";

const THEME_ARCHETYPES: Record<string, ThemeArchetypeSet> = {
  fantasy: {
    themeName: "Classic Fantasy",
    regionLabel: "Region",
    regionNames: [
      "The Silverwood Vale",
      "The Ashmarch Reaches",
      "The Sunken Downs",
    ],
    settlementLabel: "Settlement",
    settlementNames: ["Oakhaven", "Thornbridge", "Millrest"],
    factionLabel: "Faction",
    factionNames: [
      "The Ember Wardens",
      "The Grey Concord",
      "The Hollow Circle",
    ],
    characterRoles: ["knight-errant", "hedge witch", "guild spymaster"],
    threatLabel: "Threat",
    threatNames: [
      "a stirring barrow-wight",
      "a fracturing ley-line",
      "a starving wyrm",
    ],
    flavor: "swords, sorcery, and the slow creep of ancient ruin",
  },
  scifi: {
    themeName: "Sci-Fi Terminal",
    regionLabel: "Sector",
    regionNames: [
      "Sector Halcyon-9",
      "The Drift Expanse",
      "Orbital Ring Meridian",
    ],
    settlementLabel: "Station",
    settlementNames: [
      "Station Vireo",
      "Lowdock Terminal",
      "New Meridian Habitat",
    ],
    factionLabel: "Consortium",
    factionNames: [
      "The Halcyon Consortium",
      "The Free Signal Union",
      "Vex Dynamics",
    ],
    characterRoles: [
      "systems operative",
      "rogue AI handler",
      "salvage captain",
    ],
    threatLabel: "Anomaly",
    threatNames: [
      "a corrupted station AI",
      "a derelict signal virus",
      "an unstable reactor core",
    ],
    flavor: "terminal interfaces, frontier stations, and quiet AI unease",
  },
  pirate: {
    themeName: "High Seas",
    regionLabel: "Sea",
    regionNames: ["The Widow's Strait", "The Coral Maw", "The Screaming Reach"],
    settlementLabel: "Port",
    settlementNames: ["Port Marrow", "Saltbrand Cove", "Gallowsend"],
    factionLabel: "Crew",
    factionNames: [
      "The Marrow Tide Crew",
      "The Gilded Compass Company",
      "The Drowned Flag",
    ],
    characterRoles: [
      "privateer captain",
      "harbor fence",
      "mutinous first mate",
    ],
    threatLabel: "Menace",
    threatNames: [
      "a rival privateer fleet",
      "a cursed derelict ship",
      "a kraken-haunted reef",
    ],
    flavor: "rum, rivalry, and the hunt for buried fortune",
  },
  modern: {
    themeName: "Modern Day",
    regionLabel: "District",
    regionNames: ["Riverside District", "The Old Mill Quarter", "Harborview"],
    settlementLabel: "Neighborhood",
    settlementNames: ["Elmwood", "Fairview Heights", "The Docklands"],
    factionLabel: "Organization",
    factionNames: [
      "The Riverside Collective",
      "Meridian Holdings",
      "The Nightshift Network",
    ],
    characterRoles: [
      "investigative journalist",
      "off-the-books fixer",
      "city council aide",
    ],
    threatLabel: "Complication",
    threatNames: [
      "a buried corporate scandal",
      "an escalating turf dispute",
      "a missing-persons case",
    ],
    flavor: "grounded intrigue just beneath an ordinary city surface",
  },
  cyberpunk: {
    themeName: "Cyberpunk",
    regionLabel: "Sprawl",
    regionNames: [
      "The Neon Sprawl",
      "Undercity Tier 3",
      "The Corporate Spires",
    ],
    settlementLabel: "District",
    settlementNames: ["Neon District", "Rustbelt Row", "Chrome Quarter"],
    factionLabel: "Corporation",
    factionNames: [
      "Kessler Dynamics",
      "The Iron Syndicate",
      "Neon Vipers Gang",
    ],
    characterRoles: ["net-runner", "corpo fixer", "street medic"],
    threatLabel: "Conflict",
    threatNames: [
      "a corporate net grid hijack",
      "an escalating gang turf war",
      "a rogue security AI",
    ],
    flavor: "chrome, static, and corporations that own the sky",
  },
  apocalyptic: {
    themeName: "Post-Apocalyptic",
    regionLabel: "Wasteland",
    regionNames: ["The Ashen Flats", "The Rustbelt Expanse", "The Glass Scar"],
    settlementLabel: "Enclave",
    settlementNames: ["Haven Enclave", "Ironhold Camp", "The Last Silo"],
    factionLabel: "Faction",
    factionNames: ["The Ashen Wardens", "The Scrap Kings", "The Silo Compact"],
    characterRoles: [
      "wasteland scavenger",
      "enclave marshal",
      "wandering medic",
    ],
    threatLabel: "Threat",
    threatNames: [
      "a raider convoy",
      "a failing water reclaimer",
      "a mutant swarm migration",
    ],
    flavor: "scarcity, survival, and the ruins of what came before",
  },
  horror: {
    themeName: "Gothic Horror",
    regionLabel: "Domain",
    regionNames: [
      "The Mourning Vale",
      "The Blackthorn Moor",
      "The Hollow Parish",
    ],
    settlementLabel: "Parish",
    settlementNames: ["Ravensbury", "Thornwick Parish", "Gravemoor"],
    factionLabel: "Circle",
    factionNames: [
      "The Blackthorn Circle",
      "The Hollow Clergy",
      "The Nightwatch Society",
    ],
    characterRoles: [
      "haunted physician",
      "reclusive occultist",
      "grieving nobleman",
    ],
    threatLabel: "Curse",
    threatNames: [
      "an unquiet ancestral curse",
      "a plague of restless dead",
      "a pact-bound entity",
    ],
    flavor: "candlelight, dread, and secrets the fog won't give up",
  },
  cosmic_horror: {
    themeName: "Cosmic Horror",
    regionLabel: "Expanse",
    regionNames: ["The Abyssal Shelf", "The Hushed Meridian", "The Black Reef"],
    settlementLabel: "Outpost",
    settlementNames: [
      "Morrow Station",
      "Tidewatch Point",
      "The Pelagic Archive",
    ],
    factionLabel: "Society",
    factionNames: [
      "The Meridian Society",
      "The Lantern Archive",
      "The Deep Survey",
    ],
    characterRoles: [
      "field investigator",
      "marine archaeologist",
      "disgraced astronomer",
    ],
    threatLabel: "Anomaly",
    threatNames: [
      "a signal from beneath the seabed",
      "an impossible tide",
      "a geometry that changes overnight",
    ],
    flavor:
      "forbidden research, alien scale, and the fragile limits of certainty",
  },
  fallout: {
    themeName: "Retro-Futurist Wasteland",
    regionLabel: "Wasteland",
    regionNames: ["The Cracked Basin", "The Irradiated Flats", "Vault Country"],
    settlementLabel: "Settlement",
    settlementNames: ["New Haven", "Junction City", "Vault Rest"],
    factionLabel: "Faction",
    factionNames: [
      "The Steel Brotherhood",
      "The Wasteland Raiders",
      "The Vault Consortium",
    ],
    characterRoles: [
      "vault dweller",
      "wasteland trader",
      "faction quartermaster",
    ],
    threatLabel: "Threat",
    threatNames: [
      "a mutant raider gang",
      "a failing vault reactor",
      "a radiation storm front",
    ],
    flavor: "atomic-age optimism curdled into irradiated ruin",
  },
  starwars: {
    themeName: "Galactic Space Opera",
    regionLabel: "System",
    regionNames: ["The Vareth System", "The Outer Reach", "Corellis Sector"],
    settlementLabel: "Outpost",
    settlementNames: ["Vareth Station", "Duskport", "The Corellis Yards"],
    factionLabel: "Faction",
    factionNames: [
      "The Vareth Remnant",
      "The Free Systems Alliance",
      "House Corellis",
    ],
    characterRoles: [
      "smuggler captain",
      "exiled officer",
      "force-sensitive drifter",
    ],
    threatLabel: "Threat",
    threatNames: [
      "an Imperial remnant fleet",
      "a bounty hunter contract",
      "a smuggling ring collapse",
    ],
    flavor: "blasters, star destroyers, and a galaxy on the edge of war",
  },
  startrek: {
    themeName: "Space Exploration",
    regionLabel: "System",
    regionNames: [
      "The Vasilek System",
      "The Nebular Frontier",
      "Deep Space Relay 9",
    ],
    settlementLabel: "Outpost",
    settlementNames: ["Starbase Vasilek", "Frontier Relay", "Colony Meridian"],
    factionLabel: "Faction",
    factionNames: [
      "The Federation Envoy Corps",
      "The Vasilek Trade Guild",
      "The Frontier Watch",
    ],
    characterRoles: [
      "science officer",
      "diplomatic envoy",
      "colony administrator",
    ],
    threatLabel: "Anomaly",
    threatNames: [
      "a first-contact misunderstanding",
      "an unstable spatial anomaly",
      "a colony resource crisis",
    ],
    flavor: "exploration, diplomacy, and the unknown just past the frontier",
  },
  lancer: {
    themeName: "Mech Warfare",
    regionLabel: "Territory",
    regionNames: [
      "The Karrakis Territory",
      "The Shattered Reach",
      "Union Frontier Line",
    ],
    settlementLabel: "Hardpoint",
    settlementNames: [
      "Karrakis Hardpoint",
      "Foundry Station",
      "Frontline Depot",
    ],
    factionLabel: "Union",
    factionNames: [
      "The Karrakis Union",
      "The Foundry Cartel",
      "The Free Pilots Compact",
    ],
    characterRoles: ["mech pilot", "field technician", "union commander"],
    threatLabel: "Threat",
    threatNames: [
      "a rogue mech incursion",
      "a cartel supply blockade",
      "a failing hardpoint shield",
    ],
    flavor: "chassis, hardsuits, and the grinding logistics of frontier war",
  },
  western: {
    themeName: "Frontier Western",
    regionLabel: "Territory",
    regionNames: [
      "The Dustbowl Territory",
      "Red Canyon Country",
      "The Silver Flats",
    ],
    settlementLabel: "Town",
    settlementNames: ["Dustwell", "Redemption Gulch", "Silver Flats Junction"],
    factionLabel: "Outfit",
    factionNames: [
      "The Dustwell Marshals",
      "The Red Canyon Outfit",
      "The Silverline Rail Company",
    ],
    characterRoles: [
      "frontier marshal",
      "gunslinger-for-hire",
      "rail baron's fixer",
    ],
    threatLabel: "Threat",
    threatNames: [
      "an outlaw gang riding in",
      "a range war over water rights",
      "a rail company land grab",
    ],
    flavor: "dust, grit, and a frontier where the law is thin",
  },
  steampunk: {
    themeName: "Steampunk",
    regionLabel: "Territory",
    regionNames: [
      "The Cogsmoor Territory",
      "The Brass Vale",
      "The Ashworks Reach",
    ],
    settlementLabel: "City",
    settlementNames: ["Cogsmoor City", "Brassgate", "Ashworks"],
    factionLabel: "Guild",
    factionNames: [
      "The Brassgate Engineers Guild",
      "The Ashworks Combine",
      "The Clockwork Concord",
    ],
    characterRoles: [
      "airship engineer",
      "guild inspector",
      "clockwork inventor",
    ],
    threatLabel: "Threat",
    threatNames: [
      "a runaway automaton uprising",
      "a guild sabotage plot",
      "a failing aether reactor",
    ],
    flavor: "brass, steam, and invention racing ahead of consequence",
  },
  "space-opera-resistance": {
    themeName: "Space Opera Resistance",
    regionLabel: "Sector",
    regionNames: ["The Veyra Sector", "The Occupied Reach", "The Free Belt"],
    settlementLabel: "Outpost",
    settlementNames: [
      "Veyra Station",
      "The Free Belt Yards",
      "Refuge Outpost 7",
    ],
    factionLabel: "Faction",
    factionNames: [
      "The Veyra Resistance",
      "The Occupying Dominion",
      "The Free Belt Compact",
    ],
    characterRoles: [
      "resistance cell leader",
      "defected officer",
      "smuggler-turned-rebel",
    ],
    threatLabel: "Crisis",
    threatNames: [
      "an occupying fleet crackdown",
      "a resistance cell compromised",
      "a refugee supply crisis",
    ],
    flavor: "occupation, quiet rebellion, and the cost of resisting",
  },
  workspace: {
    themeName: "Neutral Workspace",
    regionLabel: "Region",
    regionNames: [
      "The Northern Reach",
      "The Central Basin",
      "The Coastal Range",
    ],
    settlementLabel: "Settlement",
    settlementNames: ["Ashford", "Millhaven", "Rivergate"],
    factionLabel: "Organization",
    factionNames: [
      "The Ashford Council",
      "The Millhaven Compact",
      "The Rivergate Guild",
    ],
    characterRoles: ["local leader", "wandering agent", "guild representative"],
    threatLabel: "Threat",
    threatNames: [
      "a brewing local dispute",
      "a resource shortage",
      "an unexplained disturbance",
    ],
    flavor: "a flexible, setting-neutral backdrop",
  },
};

function getArchetypes(themeId: string): ThemeArchetypeSet {
  return THEME_ARCHETYPES[themeId] ?? THEME_ARCHETYPES[DEFAULT_THEME_ID];
}

function premiseFragment(premise?: string): string {
  const trimmed = premise?.trim();
  return trimmed ? ` Shaped by the seed premise: "${trimmed}."` : "";
}

/**
 * Local, AI-free starter constellation generator — the offline fallback and
 * default fast path. Deterministic given an `Rng`; produces 5 interconnected
 * entities (Region, Settlement, Faction, Character, Threat) themed to the
 * selected genre.
 */
export function generateStarterConstellationLocal(
  config: StarterConstellationConfig,
  rng: Rng = defaultRng,
): StarterConstellationResult {
  const themeId =
    config.themeId in THEME_ARCHETYPES ? config.themeId : DEFAULT_THEME_ID;
  const archetypes = getArchetypes(themeId);
  const premiseNote = premiseFragment(config.premise);

  const regionName = pickFrom(archetypes.regionNames, rng);
  const settlementName = pickFrom(archetypes.settlementNames, rng);
  const factionName = pickFrom(archetypes.factionNames, rng);
  const characterRole = pickFrom(archetypes.characterRoles, rng);
  const characterName = pickFrom(
    ["Aelric Vane", "Mira Solenne", "Kestrel Doyle", "Sable Renn", "Orin Vask"],
    rng,
  );
  const threatName = pickFrom(archetypes.threatNames, rng);

  const regionId = "region-1";
  const settlementId = "settlement-1";
  const factionId = "faction-1";
  const characterId = "character-1";
  const threatId = "threat-1";

  const entities: ConstellationEntity[] = [
    {
      id: regionId,
      title: regionName,
      type: "location",
      subtype: archetypes.regionLabel,
      summary: `A ${archetypes.regionLabel.toLowerCase()} defined by ${archetypes.flavor}.${premiseNote}`,
      content: `### Overview\n${regionName} is a ${archetypes.regionLabel.toLowerCase()} shaped by ${archetypes.flavor}.${premiseNote}\n\n### Notable Feature\nHome to ${settlementName}, its most consequential settlement.`,
      labels: ["starter-constellation", "location", themeId],
    },
    {
      id: settlementId,
      title: settlementName,
      type: "location",
      subtype: archetypes.settlementLabel,
      summary: `The central ${archetypes.settlementLabel.toLowerCase()} of ${regionName}, where ${factionName} holds sway.`,
      content: `### Overview\n${settlementName} is the central ${archetypes.settlementLabel.toLowerCase()} of ${regionName}. ${factionName} operates openly here, and ${characterName} is a fixture of daily life.\n\n### Current Tension\n${threatName} looms as an unresolved concern for everyone here.`,
      labels: ["starter-constellation", "location", themeId],
    },
    {
      id: factionId,
      title: factionName,
      type: "faction",
      subtype: archetypes.factionLabel,
      summary: `A ${archetypes.factionLabel.toLowerCase()} based in ${settlementName}, led by ${characterName}.`,
      content: `### Overview\n${factionName} is a ${archetypes.factionLabel.toLowerCase()} operating out of ${settlementName}, currently led by ${characterName}.\n\n### Agenda\nTheir influence over ${regionName} is being tested by ${threatName}.`,
      labels: ["starter-constellation", "faction", themeId],
    },
    {
      id: characterId,
      title: characterName,
      type: "character",
      subtype: characterRole,
      summary: `A ${characterRole} who leads ${factionName} from ${settlementName}.`,
      content: `### Overview\n${characterName} is a ${characterRole}, leading ${factionName} from ${settlementName}.\n\n### Motivation\nDetermined to resolve ${threatName} before it costs them everything they have built.`,
      labels: ["starter-constellation", "character", themeId],
    },
    {
      id: threatId,
      title: `${threatName[0].toUpperCase()}${threatName.slice(1)}`,
      type: "threat",
      subtype: archetypes.threatLabel,
      summary: `${archetypes.threatLabel} bearing down on ${settlementName} and ${regionName}.`,
      content: `### Overview\n${threatName[0].toUpperCase()}${threatName.slice(1)} threatens ${settlementName} and the wider ${regionName}.\n\n### Stakes\n${factionName}, led by ${characterName}, is the group best positioned to respond.`,
      labels: ["starter-constellation", "threat", themeId],
    },
  ];

  const relationships: ConstellationRelationship[] = [
    {
      sourceId: settlementId,
      targetId: regionId,
      relation: "located in",
      bidirectional: true,
    },
    {
      sourceId: factionId,
      targetId: settlementId,
      relation: "based in",
      bidirectional: true,
    },
    {
      sourceId: characterId,
      targetId: factionId,
      relation: "leads",
      bidirectional: true,
    },
    {
      sourceId: threatId,
      targetId: settlementId,
      relation: "threatens",
      bidirectional: true,
    },
  ];

  return {
    themeId,
    title: `${regionName}: ${archetypes.themeName} Constellation`,
    summary: `${settlementName} in ${regionName}, where ${factionName} (led by ${characterName}) contends with ${threatName}.${premiseNote}`,
    entities,
    relationships,
  };
}

export interface StarterConstellationPrompt {
  systemInstruction: string;
  userMessage: string;
}

/** Build the AI prompt for a starter constellation. */
export function buildStarterConstellationPrompt(
  config: StarterConstellationConfig,
): StarterConstellationPrompt {
  const archetypes = getArchetypes(config.themeId);
  const premiseLine = config.premise?.trim()
    ? `\n- Seed premise (weave in keywords, but prioritize the theme's atmosphere): "${config.premise.trim()}"`
    : "";

  const systemInstruction = `You are an expert RPG worldbuilder specializing in ${archetypes.themeName} settings (${archetypes.flavor}). You generate a compact, interconnected "starter constellation" of 4-6 entities in JSON format.

OUTPUT FORMAT — return ONLY a valid JSON object, no markdown fences:
{
  "title": "Overall scenario/world title",
  "summary": "One to two sentence scenario summary",
  "entities": [
    {
      "id": "short-kebab-id",
      "title": "Entity name",
      "type": "location" | "character" | "faction" | "event" | "item" | "threat",
      "subtype": "Theme-specific subtype label (e.g. 'District', 'Corporation', 'Gang')",
      "summary": "One sentence summary",
      "content": "Markdown body, 2-4 short paragraphs",
      "labels": ["2-4 lowercase labels"]
    }
  ],
  "relationships": [
    { "sourceId": "entity-id", "targetId": "entity-id", "relation": "short relation phrase e.g. 'leads', 'located in', 'threatens'", "bidirectional": true }
  ]
}

QUALITY RULES:
- Produce between 4 and 6 entities total, matching this theme's archetypes (e.g. Region/Settlement/Faction/Character/Threat for Fantasy; District/Corporation/Gang/Character/Conflict for Cyberpunk).
- Every entity must be referenced by at least one relationship so the constellation forms one connected web.
- Prioritize the theme's atmosphere and rules even if the premise suggests otherwise; weave in premise keywords without contradicting the theme.`;

  const userMessage = `Generate a starter constellation for the "${archetypes.themeName}" theme.${premiseLine}`;

  return { systemInstruction, userMessage };
}

/**
 * Parse the AI's JSON response into a {@link StarterConstellationResult}.
 * Throws on invalid/incomplete JSON so the caller can fall back to
 * {@link generateStarterConstellationLocal}.
 */
export function parseStarterConstellationResponse(
  text: string,
  config: StarterConstellationConfig,
): StarterConstellationResult {
  const data = parseFencedJson<Partial<StarterConstellationResult>>(text);

  if (!Array.isArray(data.entities) || data.entities.length < 4) {
    throw new Error("Starter constellation response missing required entities");
  }

  const entities: ConstellationEntity[] = data.entities.map((raw, index) => ({
    id: raw?.id || `entity-${index + 1}`,
    title: raw?.title || `Untitled Entity ${index + 1}`,
    type: raw?.type ?? "location",
    subtype: raw?.subtype || "Entity",
    summary: raw?.summary || "",
    content: raw?.content || "",
    labels: Array.isArray(raw?.labels) ? raw.labels : ["starter-constellation"],
  }));

  const validIds = new Set(entities.map((e) => e.id));
  const relationships: ConstellationRelationship[] = Array.isArray(
    data.relationships,
  )
    ? data.relationships
        .filter(
          (r) => r && validIds.has(r.sourceId) && validIds.has(r.targetId),
        )
        .map((r) => ({
          sourceId: r.sourceId,
          targetId: r.targetId,
          relation: r.relation || "related to",
          bidirectional: r.bidirectional ?? true,
        }))
    : [];

  return {
    themeId: config.themeId,
    title: data.title || "Starter Constellation",
    summary: data.summary || "",
    entities,
    relationships,
  };
}

export const STARTER_CONSTELLATION_THEME_IDS: readonly string[] =
  Object.keys(THEME_ARCHETYPES);
