/**
 * Public Creature / Monster generator (#2402) — framework-free generator
 * producing distinctive creatures, beasts, monsters, alien fauna, constructs,
 * undead, and mounts for tabletop campaigns.
 *
 * Produces coherent ecology, appearance, abilities, weaknesses, signs,
 * encounter tactics, harvestable materials, and adventure hooks rather than
 * narrow stat blocks or disjointed traits.
 */

import type { PublicGeneratorOutput } from "./public-generator-adapters";
import { NAME_BAN_PROMPT } from "./public-npc";
import { type Rng, defaultRng, pickFrom } from "./random-utils";
import { parseFencedJson } from "./llm-response-utils";
import {
  avoidNamesExcludingContext,
  formatCampaignContextBlock,
} from "./campaign-context";
import { factionConfig } from "./public-faction-constants";

export const creatureConfig = {
  genres: factionConfig.themes,
  categories: [
    "Random",
    "Natural Beast",
    "Magical Beast / Chimera",
    "Aberration / Eldritch Horror",
    "Undead / Reanimated",
    "Spirit / Extraplanar Entity",
    "Construct / Artificial Life",
    "Alien Fauna / Xenoform",
    "Engineered / Mutated Beast",
    "Swarm / Parasite Colony",
    "Colossal / Kaiju-Scale Titan",
  ],
  threatLevels: [
    "Random",
    "Harmless / Ambient",
    "Minor Nuisance / Scavenger",
    "Dangerous / Predator",
    "Apex Predator / Pack Threat",
    "Elite / Monstrous Hazard",
    "Legendary / Cataclysmic",
  ],
  sizes: [
    "Random",
    "Tiny / Diminutive",
    "Small",
    "Medium / Human-sized",
    "Large / Steed-sized",
    "Huge / Wagon-sized",
    "Gargantuan / Titanic",
  ],
  temperaments: [
    "Random",
    "Instinctual / Animal",
    "Cunning / Pack Mind",
    "Semi-Sapient / Tool-User",
    "Fully Sapient / Cultured",
    "Alien / Incomprehensible Mind",
  ],
  habitats: [
    "Random",
    "Subterranean / Caverns",
    "Dense Forest / Deep Jungle",
    "Mountain Peaks / Cliffs",
    "Swamps & Murky Wetlands",
    "Deserts & Arid Badlands",
    "Oceans & Deep Waters",
    "Urban Sewers & Ruins",
    "Derelict Spacecraft & Void",
    "Radioactive / Blighted Wastes",
    "Astral & Ethereal Planes",
  ],
  habitatByTheme: {
    "Classic Fantasy": [
      "Dense Forest / Deep Jungle",
      "Subterranean / Caverns",
      "Mountain Peaks / Cliffs",
      "Swamps & Murky Wetlands",
      "Deserts & Arid Badlands",
      "Oceans & Deep Waters",
    ],
    Pirate: [
      "Oceans & Deep Waters",
      "Swamps & Murky Wetlands",
      "Mountain Peaks / Cliffs",
      "Dense Forest / Deep Jungle",
    ],
    "Cyberpunk / Corporate": [
      "Urban Sewers & Ruins",
      "Subterranean / Caverns",
      "Radioactive / Blighted Wastes",
    ],
    "Vampire / Gothic Noir": [
      "Urban Sewers & Ruins",
      "Dense Forest / Deep Jungle",
      "Subterranean / Caverns",
      "Swamps & Murky Wetlands",
      "Astral & Ethereal Planes",
    ],
    "Cosmic Horror": [
      "Subterranean / Caverns",
      "Oceans & Deep Waters",
      "Astral & Ethereal Planes",
      "Swamps & Murky Wetlands",
    ],
    "Sci-Fi / Space Opera": [
      "Derelict Spacecraft & Void",
      "Deserts & Arid Badlands",
      "Subterranean / Caverns",
      "Oceans & Deep Waters",
    ],
    "Modern Conspiracy": [
      "Urban Sewers & Ruins",
      "Dense Forest / Deep Jungle",
      "Subterranean / Caverns",
    ],
    "Post-Apocalyptic": [
      "Radioactive / Blighted Wastes",
      "Deserts & Arid Badlands",
      "Urban Sewers & Ruins",
      "Swamps & Murky Wetlands",
    ],
    "Western / Frontier": [
      "Deserts & Arid Badlands",
      "Mountain Peaks / Cliffs",
      "Subterranean / Caverns",
    ],
    Steampunk: [
      "Urban Sewers & Ruins",
      "Subterranean / Caverns",
      "Mountain Peaks / Cliffs",
    ],
    Lancer: [
      "Radioactive / Blighted Wastes",
      "Derelict Spacecraft & Void",
      "Subterranean / Caverns",
    ],
    "Space Opera Resistance": [
      "Derelict Spacecraft & Void",
      "Deserts & Arid Badlands",
      "Subterranean / Caverns",
    ],
    "Optimistic Exploration Sci-Fi": [
      "Dense Forest / Deep Jungle",
      "Oceans & Deep Waters",
      "Derelict Spacecraft & Void",
    ],
  } as Record<string, string[]>,
  ecologicalRoles: [
    "Random",
    "Apex Predator",
    "Ambush Hunter",
    "Herbivore / Migratory Grazer",
    "Scavenger / Carrion Eater",
    "Territorial Guardian",
    "Parasite / Symbiote",
    "Mount / Domesticated Beast",
    "Familiar / Companion",
    "Environmental / Supernatural Hazard",
    "Social / Tribal Builder",
  ],
} as const;

export interface CreatureGeneratorOptions {
  genre?: string;
  category?: string;
  threatLevel?: string;
  size?: string;
  temperament?: string;
  habitat?: string;
  ecologicalRole?: string;
  campaignContext?: string;
  avoidNames?: string[];
}

export interface ResolvedCreature {
  genre: string;
  category: string;
  threatLevel: string;
  size: string;
  temperament: string;
  habitat: string;
  ecologicalRole: string;
  campaignContext?: string;
  creatureName: string;
}

export interface CreaturePrompt {
  systemInstruction: string;
  userMessage: string;
  resolved: ResolvedCreature;
}

function resolvePick(
  requested: string | undefined,
  options: readonly string[],
  rng: Rng,
): string {
  const real = options.filter((o) => o !== "Random");
  if (!requested || requested === "Random") return pickFrom(real, rng);
  return requested;
}

const CREATURE_NAME_PREFIXES = [
  "Mire",
  "Gloom",
  "Ash",
  "Iron",
  "Cinder",
  "Bramble",
  "Dusk",
  "Void",
  "Spire",
  "Chasm",
  "Frost",
  "Rust",
  "Silk",
  "Venom",
  "Bone",
  "Storm",
  "Silt",
  "Coral",
  "Obsidian",
  "Blight",
];

const CREATURE_NAME_ROOTS = [
  "Stalker",
  "Basilic",
  "Gorgon",
  "Crawler",
  "Strider",
  "Howler",
  "Skimmer",
  "Carapace",
  "Lurker",
  "Maw",
  "Gargoyle",
  "Wyrm",
  "Siphon",
  "Scuttler",
  "Behemoth",
  "Leech",
  "Wraith",
  "Gnasher",
  "Weaver",
  "Prowler",
];

export function resolveCreature(
  options: CreatureGeneratorOptions,
  rng: Rng = defaultRng,
): ResolvedCreature {
  const genre = options.genre || creatureConfig.genres[0];
  const habitatChoices =
    creatureConfig.habitatByTheme[genre] ?? creatureConfig.habitats;

  const category = resolvePick(
    options.category,
    creatureConfig.categories,
    rng,
  );
  const threatLevel = resolvePick(
    options.threatLevel,
    creatureConfig.threatLevels,
    rng,
  );
  const size = resolvePick(options.size, creatureConfig.sizes, rng);
  const temperament = resolvePick(
    options.temperament,
    creatureConfig.temperaments,
    rng,
  );
  const habitat = resolvePick(options.habitat, habitatChoices, rng);
  const ecologicalRole = resolvePick(
    options.ecologicalRole,
    creatureConfig.ecologicalRoles,
    rng,
  );

  const prefix = pickFrom(CREATURE_NAME_PREFIXES, rng);
  const root = pickFrom(CREATURE_NAME_ROOTS, rng);
  const creatureName = `${prefix}-${root}`;

  return {
    genre,
    category,
    threatLevel,
    size,
    temperament,
    habitat,
    ecologicalRole,
    campaignContext: options.campaignContext?.trim() || undefined,
    creatureName,
  };
}

const CONSISTENCY_PASS =
  "Before returning, run a consistency pass: the creature's appearance, size, and body plan must match its ecological role and habitat; its signature ability and weaknesses must directly reflect its classification and anatomy; combat behaviour must align with its temperament and threat level (e.g. herbivores, scavengers, or harmless fauna must not fight to the death as mindless predators; sapient creatures must have distinct communication methods, motives, and culture); harvestable materials must be biologically or magically justified rather than generic loot drops; and all signs/foreshadowing must logically result from the creature's physical traits, movement, or supernatural presence.";

export function buildCreaturePrompt(
  options: CreatureGeneratorOptions = {},
  sessionContext = "",
  rng: Rng = defaultRng,
): CreaturePrompt {
  const resolved = resolveCreature(options, rng);

  const avoidBlock =
    options.avoidNames && options.avoidNames.length > 0
      ? `\nAlready created or used this session — do NOT reuse these names or generate duplicate concepts:\n${avoidNamesExcludingContext(
          options.avoidNames,
          resolved.campaignContext,
        )
          .map((n) => `- ${n}`)
          .join("\n")}\n`
      : "";

  const systemInstruction =
    "You are an expert tabletop RPG creature and monster designer. Create evocative, internally consistent, and gameable creatures, beasts, horrors, alien fauna, constructs, spirits, or mounts. Faithfully respect the selected genre's tone, technology, and aesthetic. Write concrete, descriptive, system-neutral content (no game-system stat blocks or rules math). Return only valid JSON.";

  const userMessage = `Create a Creature / Monster Generator result.
Parameters:
- Genre / Theme: ${resolved.genre}
- Category / Origin: ${resolved.category}
- Threat Level: ${resolved.threatLevel}
- Size: ${resolved.size}
- Intelligence / Temperament: ${resolved.temperament}
- Habitat: ${resolved.habitat}
- Ecological Role: ${resolved.ecologicalRole}
${formatCampaignContextBlock(resolved.campaignContext)}
${avoidBlock}
Return a JSON object with:
{
  "title": "Evocative name of the creature (2-5 words)",
  "summary": "1-2 sentence core concept and ecological essence.",
  "content": "Player/table-facing markdown with sections: '### At a Glance' (bullet list with Classification, Size & Form, Habitat, Threat Level, Temperament / Sapience, Ecological Role), '### Appearance & Anatomy' (detailed physical form, color/texture, unusual anatomy, locomotion, sensory details), '### Signs & Foreshadowing' (3-5 concrete tracks, sounds, smells, environmental disturbances, or omens players encounter before the creature itself).",
  "lore": "GM-only markdown with sections: '### Core Concept & Ecology' (habitat range, diet/prey, hunting/foraging strategy, lifecycle/reproduction, social structure, wider ecological impact), '### Abilities & Defences' (signature ability, secondary powers, defences, movement, senses — descriptive and system-neutral), '### Weaknesses & Limitations' (exploitable vulnerabilities, environmental tells, behavioral limits), '### Combat & Encounter Behaviour' (how it acts when hunting, threatened, defending young, or injured; morale and retreat conditions), '### Harvest & Remains' (useful or dangerous salvage: venom, hide, organs, bio-tech, components; do not make every creature conveniently lootable), '### Lore & Rumours' (mixture of true, false, and distorted local beliefs), '### Adventure & Encounter Hooks' (2-4 distinct hooks beyond 'fight it', such as capturing, tracking, avoiding, researching, domesticating, harvesting, or bargaining if sapient)${
    resolved.temperament.includes("Sapient") ||
    resolved.temperament.includes("Alien")
      ? ", '### Sapience & Society' (communication style, motives, social hierarchy, relationship with nearby peoples/factions)"
      : ""
  }.",
  "labels": ["creature", "monster-generator"]
}
${CONSISTENCY_PASS}
${NAME_BAN_PROMPT}
${sessionContext ? `\n${sessionContext}` : ""}
Return only the JSON object. Do not include markdown code block formatting like \`\`\`json.`;

  return {
    systemInstruction,
    userMessage,
    resolved,
  };
}

export function parseCreatureResponse(
  text: string,
  resolved: ResolvedCreature,
): PublicGeneratorOutput {
  const data = parseFencedJson<Record<string, unknown>>(text);

  const labels = Array.isArray(data.labels)
    ? data.labels.filter((l): l is string => typeof l === "string")
    : ["creature", "monster-generator"];
  if (!labels.includes("creature")) labels.unshift("creature");
  if (!labels.includes("monster-generator")) labels.push("monster-generator");

  const title =
    typeof data.title === "string" && data.title.trim()
      ? data.title.trim()
      : resolved.creatureName;
  const summary =
    typeof data.summary === "string" && data.summary.trim()
      ? data.summary.trim()
      : "";
  const content =
    typeof data.content === "string" && data.content.trim()
      ? data.content.trim()
      : "";
  const lore =
    typeof data.lore === "string" && data.lore.trim() ? data.lore.trim() : "";

  if (!content || !lore) {
    throw new Error(
      "Creature response must include substantive content and lore.",
    );
  }

  return {
    type: "creature",
    kind: "creature",
    title,
    summary,
    content,
    lore,
    labels,
    status: "active",
  };
}

export function generateCreatureLocal(
  options: CreatureGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const r = resolveCreature(options, rng);

  const signatureTraits = [
    {
      ability: "Caustic Silt Spray",
      abilityDesc:
        "Exhales a blinding cone of mineral-heavy brine that irritates eyes and calcifies soft fabric upon drying.",
      weakness:
        "Sensitive gill-slits vulnerable to freshwater dilution or high-pitched sonic vibrations.",
      signs: [
        "Chalky white mineral crusts clinging to shoreline vegetation.",
        "A low, vibrating rhythmic rasping heard through stone walls at dusk.",
        "Scattered skeletons of river fowl stripped cleanly of cartilage.",
      ],
      salvage:
        "Intact glandular sac yielding a caustic desiccant solvent; petrified scale plates suitable for acid-resistant plating.",
    },
    {
      ability: "Bio-Electric Stun Discharge",
      abilityDesc:
        "Discharges a sudden arc of disruptive galvanic energy through conductive terrain, stunning nearby nervous systems.",
      weakness:
        "Insulated groundings and rubberized materials disperse its charge harmlessly; grounding spikes force its charge to misfire.",
      signs: [
        "Twitching, magnetized iron filings clinging to damp stones.",
        "Pungent ozone scent hanging heavy in stagnant low-lying air.",
        "Burnt scorch rings radiating outward from shallow burrows.",
      ],
      salvage:
        "Conductive dorsal filaments capable of storing galvanic charges; amber-tinted ocular lenses.",
    },
    {
      ability: "Chameleonic Refraction",
      abilityDesc:
        "Shifts dermal chromatophores to match surface textures and ambient light, becoming virtually invisible while motionless.",
      weakness:
        "Violent sudden vibrations or flour/powder coatings disrupt the optical alignment of its scales immediately.",
      signs: [
        "Unsettling optical mirages and shifting shadows in peripheral vision.",
        "Oddly parallel claw scrapes along high branch burls.",
        "Sudden cessation of all insect chirping when passing specific trees.",
      ],
      salvage:
        "Chromatophoric hide patches that retain light-bending qualities for several weeks if preserved in alcohol.",
    },
  ];

  const trait = pickFrom(signatureTraits, rng);

  const summary = `A ${r.size.toLowerCase()} ${r.category.toLowerCase()} that acts as a ${r.ecologicalRole.toLowerCase()} in ${r.habitat.toLowerCase()}, known for its ${trait.ability.toLowerCase()}.`;

  const content = `### At a Glance
- **Classification**: ${r.category}
- **Size & Form**: ${r.size}
- **Habitat**: ${r.habitat}
- **Threat Level**: ${r.threatLevel}
- **Temperament / Sapience**: ${r.temperament}
- **Ecological Role**: ${r.ecologicalRole}

### Appearance & Anatomy
The ${r.creatureName} possesses a dense, adapted physique tailored for survival in ${r.habitat.toLowerCase()}. Its outer layer displays mottled coloration suited for natural concealment, reinforced with fibrous sinew and hardened plates along its dorsal ridge. Movement is deliberate and efficient, conserving energy until an immediate need demands sudden bursts of speed.

### Signs & Foreshadowing
${trait.signs.map((s) => `- ${s}`).join("\n")}`;

  const isSapient =
    r.temperament.includes("Sapient") || r.temperament.includes("Alien");

  const sapientSection = isSapient
    ? `\n\n### Sapience & Society
- **Communication**: Communicates through complex tactile gestures, chemical pheromone markers, and resonant vocal thrums.
- **Motives & Culture**: Deeply territorial and clan-oriented; values reciprocal gift-giving and territorial pacts.
- **Outsider Relations**: Treats armed intruders as potential competition, but will negotiate trade when approached with respect and non-threatening tribute.`
    : "";

  const lore = `### Core Concept & Ecology
The ${r.creatureName} functions as a ${r.ecologicalRole.toLowerCase()} within ${r.habitat.toLowerCase()}. It establishes seasonal territory around natural food caches and migratory choke-points, patrolling its perimeter with predictable frequency. Its reproductive cycle is tied to environmental shifts, producing small clutches of resilient young that disperse within their first year.

### Abilities & Defences
- **${trait.ability}**: ${trait.abilityDesc}
- **Adaptive Mobility**: Navigates difficult terrain within ${r.habitat.toLowerCase()} without loss of momentum or balance.
- **Sensory Acuity**: Acute olfactory and vibrational perception, detecting encroaching entities long before visual contact.

### Weaknesses & Limitations
- **${trait.weakness}**
- **Behavioural Limitation**: Reluctant to cross open, exposed areas with bright light or strong drafts unless starved.

### Combat & Encounter Behaviour
When threatened, the creature adopts a defensive posture, issuing low warning signals to discourage confrontation. If cornered or defending its territory, it unleashes its **${trait.ability}** before maneuvering toward flanking angles. If reduced to severe injury or if its prey proves too resilient, it disengages rapidly into familiar crevices.

### Harvest & Remains
${trait.salvage}

### Lore & Rumours
- **Local Belief (True)**: The creature's warning calls reliably precede major atmospheric and seasonal changes.
- **Folklore (Distorted)**: Legends claim it is born from the concentrated malice of lost wanderers, though in reality it is simply an apex survivor of ancient stock.

### Adventure & Encounter Hooks
- **The Blocked Route**: A family of ${r.creatureName}s has claimed a crucial trade pass as their nesting territory, halting transit until they can be peacefully relocated or driven off.
- **The Harvester's Contract**: A local apothecary or researcher offers a substantial bounty for intact biological samples without killing the specimen.
- **The Omens Below**: Sightings of ${r.creatureName}s fleeing their native deep habitats suggest a far greater seismic or supernatural disturbance is waking beneath the region.${sapientSection}`;

  const labels = [
    "creature",
    "monster-generator",
    r.category.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    r.genre.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  ];

  return {
    type: "creature",
    kind: "creature",
    title: r.creatureName,
    summary,
    content,
    lore,
    labels,
    status: "active",
  };
}
