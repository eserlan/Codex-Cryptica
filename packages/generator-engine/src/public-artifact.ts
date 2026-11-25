import { withPublicCreativeCue } from "./public-creative-diversity";
/**
 * Public Artifact & Relic Generator — framework-free port for unique, named,
 * lore-heavy magical (or precursor, occult, frontier, or industrial) objects
 * that serve as worldbuilding anchors and campaign engines (#2387).
 */

import type { PublicGeneratorOutput } from "./public-generator-types";
import { NAME_BAN_PROMPT } from "./public-npc";
import {
  type Rng,
  defaultRng,
  pickFrom,
  generatePlaceholderName as generateName,
} from "./random-utils";
import { parseFencedJson } from "./llm-response-utils";
import {
  avoidNamesExcludingContext,
  formatCampaignContextBlock,
} from "./campaign-context";
import { factionConfig } from "./public-faction-constants";

export const artifactConfig = {
  genres: factionConfig.themes,
  forms: [
    "Relic / Holy Symbol",
    "Weapon / Implement of War",
    "Crown / Regalia of Rule",
    "Tome / Sealed Archive",
    "Jewel / Heartstone",
    "Vessel / Urn",
    "Mechanism / Grand Apparatus",
    "Garment / Shroud",
    "Talisman / Idol",
  ],
  originEras: [
    "Primordial / Mythic Age",
    "Fallen Golden Age",
    "War of Extinction",
    "Ancient Dynasty",
    "Pre-Collapse Era",
    "Forged in Cataclysm",
    "Unknown / Outside Time",
  ],
  powerTiers: [
    "Heroic Wonder (Alters individuals & skirmishes)",
    "Regional Masterpiece (Dominates cities & provinces)",
    "Cataclysmic Power (Threatens nations & reality)",
  ],
  currentStatuses: [
    "Lost in Ruined Sanctuary",
    "Sealed in Royal / High-Security Vault",
    "Wielded by a Tyrant / Rival",
    "Dormant / Disguised as Common Wreckage",
    "Shattered into Shards",
    "Submerged in Deep Isolation",
  ],
  curseCosts: [
    "Sacrificial Price (Requires vital tribute/blood)",
    "Creeping Corruption (Gradual physical/spiritual decay)",
    "Strict Moral / Physical Taboo (Binds bearer's behavior)",
    "Supernatural Beacon (Attracts horrors & rivals)",
    "Psychic / Mental Strain (Erodes sanity & memories)",
    "None (Pure Burden of Custody)",
  ],
};

export type GenreCausality =
  | "magical"
  | "occult"
  | "technological"
  | "steampunk-industrial"
  | "western-frontier"
  | "post-apocalyptic";

export function getGenreCausality(genre: string): GenreCausality {
  if (
    [
      "Cyberpunk / Corporate",
      "Sci-Fi / Space Opera",
      "Modern Conspiracy",
      "Lancer",
      "Space Opera Resistance",
      "Optimistic Exploration Sci-Fi",
    ].includes(genre)
  ) {
    return "technological";
  }
  if (genre === "Western / Frontier") {
    return "western-frontier";
  }
  if (genre === "Steampunk") {
    return "steampunk-industrial";
  }
  if (genre === "Post-Apocalyptic") {
    return "post-apocalyptic";
  }
  if (["Vampire / Gothic Noir", "Cosmic Horror"].includes(genre)) {
    return "occult";
  }
  return "magical";
}

const namesByTheme: Record<string, { adjs: string[]; nouns: string[] }> = {
  "Classic Fantasy": {
    adjs: [
      "Solar",
      "Cinder",
      "Primordial",
      "Astral",
      "Crown-Breaker",
      "Dusk",
      "Radiant",
      "Sovereign",
      "World-Ender",
      "Glimmer",
      "Thorn",
      "Eternity",
    ],
    nouns: [
      "Blade",
      "Aegis",
      "Sceptre",
      "Tome",
      "Orb",
      "Chalice",
      "Crown",
      "Censer",
      "Eye",
      "Monolith",
      "Spire",
      "Sanctum",
    ],
  },
  Pirate: {
    adjs: [
      "Tide-Caller",
      "Leviathan",
      "Kraken",
      "Sunken",
      "Abyssal",
      "Ghost-Fleet",
      "Gilded",
      "Black-Iron",
      "Storm-Wrought",
      "Salt-Queen",
      "Sovereign",
      "Mutineer's",
    ],
    nouns: [
      "Astrolabe",
      "Cutlass",
      "Compass",
      "Figurehead",
      "Lantern",
      "Anchor",
      "Coin",
      "Spyglass",
      "Wheel",
      "Casket",
      "Bell",
      "Logbook",
    ],
  },
  "Cyberpunk / Corporate": {
    adjs: [
      "Zero-Day",
      "Neural",
      "Quantum",
      "Black-ICE",
      "Omni",
      "Synthetic",
      "Overclocked",
      "Redacted",
      "Sub-Zero",
      "Apex",
      "Black-Box",
      "Ghost-Process",
    ],
    nouns: [
      "Core",
      "Processor",
      "Cipher",
      "Matrix",
      "Node",
      "Terminal",
      "Implant",
      "Archive",
      "Protocol",
      "Drive",
      "Monolith",
      "Key",
    ],
  },
  "Sci-Fi / Space Opera": {
    adjs: [
      "Precursor",
      "Antimatter",
      "Event-Horizon",
      "Stellar",
      "Chronos",
      "Void-Warp",
      "Singularity",
      "Hyper-Spatial",
      "Progenitor",
      "Relic",
      "Solaris",
      "Genesis",
    ],
    nouns: [
      "Conduit",
      "Core",
      "Engine",
      "Prism",
      "Beacon",
      "Array",
      "Crucible",
      "Seed",
      "Relay",
      "Pillar",
      "Ark",
      "Nexus",
    ],
  },
  "Post-Apocalyptic": {
    adjs: [
      "Omega",
      "Bunker-Prime",
      "Fallout",
      "Last-Hope",
      "Irradiated",
      "Scrap-Forged",
      "Pre-War",
      "Sovereign",
      "Doomsday",
      "Wasteland",
      "Cinder",
      "Survivor's",
    ],
    nouns: [
      "Ignition-Key",
      "Purifier",
      "Generator",
      "Warhead",
      "Battery",
      "Beacon",
      "Chamber",
      "Transmitter",
      "Serum",
      "Engine",
      "Monolith",
      "Vault",
    ],
  },
  "Modern Conspiracy": {
    adjs: [
      "Classified",
      "Protocol-Zero",
      "Black-Site",
      "Anomalous",
      "Redacted",
      "Operation-Dusk",
      "Cabal",
      "Foundry",
      "Deep-State",
      "Apex",
      "Clandestine",
      "Omega",
    ],
    nouns: [
      "Archive",
      "Briefcase",
      "Codex",
      "Transmitter",
      "Keycard",
      "Specimen",
      "Ledger",
      "Cipher",
      "Apparatus",
      "Relic",
      "Seal",
      "Recorder",
    ],
  },
  "Vampire / Gothic Noir": {
    adjs: [
      "Blood-Father",
      "Sanguine",
      "Crimson",
      "Gothic",
      "Nocturne",
      "Moon-Cursed",
      "Ancestral",
      "Immortal",
      "Venomous",
      "Grave-Dirt",
      "Velvet",
      "Cenotaph",
    ],
    nouns: [
      "Chalice",
      "Cameo",
      "Dagger",
      "Tome",
      "Reliquary",
      "Coronet",
      "Urn",
      "Shroud",
      "Locket",
      "Monstrance",
      "Signet",
      "Censer",
    ],
  },
  "Cosmic Horror": {
    adjs: [
      "Non-Euclidean",
      "Sunless",
      "Abyssal",
      "Unspeakable",
      "Void-Stirred",
      "Elder",
      "Opaline",
      "Star-Spawned",
      "Nameless",
      "Grave-Singing",
      "Fractured",
      "Cyclopean",
    ],
    nouns: [
      "Idol",
      "Monolith",
      "Lens",
      "Codex",
      "Urn",
      "Shard",
      "Resonator",
      "Mirror",
      "Crown",
      "Bell",
      "Fetish",
      "Spindle",
    ],
  },
  "Western / Frontier": {
    adjs: [
      "Gallows",
      "Ghost-Dancer",
      "Sundown",
      "Iron-Spike",
      "Badlands",
      "Rattler-Bite",
      "Dust-Devil",
      "Frontier",
      "Silver-Vein",
      "Prospector's",
      "Treaty-Maker",
      "Outlaw's",
    ],
    nouns: [
      "Iron",
      "Peacemaker",
      "Spur",
      "Charter",
      "Medicine-Bag",
      "Dowser",
      "Watch",
      "Meteor-Stone",
      "Brand",
      "Carbine",
      "Token",
      "Anvil",
    ],
  },
  Steampunk: {
    adjs: [
      "Aether-Forged",
      "Grand-Orrery",
      "Clockwork",
      "Perpetual",
      "Galvanic",
      "Pneumatic",
      "Guild-Master",
      "Vapor-Bound",
      "Differential",
      "Brass-Heart",
      "Mercury",
      "Resonant",
    ],
    nouns: [
      "Engine",
      "Orrery",
      "Apparatus",
      "Chronometer",
      "Condenser",
      "Regulator",
      "Core",
      "Turbine",
      "Siphon",
      "Armillary",
      "Chamber",
      "Calculus",
    ],
  },
  Lancer: {
    adjs: [
      "NHP-Prime",
      "Blinkspace",
      "Omni-Class",
      "Deimos",
      "Sub-Metatunneled",
      "Castor",
      "Ablative",
      "Monist",
      "Anomalous",
      "Cataphract",
      "Sec-Zero",
      "Reactor",
    ],
    nouns: [
      "Casket",
      "Hardpoint",
      "Core",
      "Sarcophagus",
      "Weave",
      "Egress",
      "Array",
      "Engine",
      "Protocol",
      "Monolith",
      "Crucible",
      "Matrix",
    ],
  },
  "Space Opera Resistance": {
    adjs: [
      "Star-Rebel",
      "Imperial-Bane",
      "Freedom-Beacon",
      "Stolen-Sun",
      "Void-Spear",
      "Eclipse",
      "Liberator's",
      "Hyperdrive-Alpha",
      "Phoenix",
      "Red-Shift",
      "Galactic",
      "Guerrilla",
    ],
    nouns: [
      "Beacon",
      "Hyper-Core",
      "Cipher",
      "Transmitter",
      "Ark",
      "Standard",
      "Catalyst",
      "Array",
      "Key",
      "Blade",
      "Prism",
      "Relay",
    ],
  },
  "Optimistic Exploration Sci-Fi": {
    adjs: [
      "Genesis",
      "First-Contact",
      "Horizon",
      "Progenitor",
      "Discovery",
      "Cosmic-Dawn",
      "Federation-Prime",
      "Harmonic",
      "Biosphere",
      "Resonance",
      "Beacon",
      "Starlight",
    ],
    nouns: [
      "Probe",
      "Synthesizer",
      "Archive",
      "Core",
      "Prism",
      "Monolith",
      "Seed",
      "Transmitter",
      "Chamber",
      "Matrix",
      "Pillar",
      "Array",
    ],
  },
};

export interface ArtifactGeneratorOptions {
  genre?: string;
  form?: string;
  originEra?: string;
  powerTier?: string;
  currentStatus?: string;
  curseCost?: string;
  campaignContext?: string;
  avoidNames?: string[];
}

/** Names and prose nouns for each preset item form, so titles match the form. */
const FORM_NOUNS: Partial<Record<string, readonly string[]>> = {
  "Relic / Holy Symbol": ["Relic", "Sigil", "Reliquary"],
  "Weapon / Implement of War": ["Blade", "Spear", "Warhammer"],
  "Crown / Regalia of Rule": ["Crown", "Diadem", "Circlet"],
  "Tome / Sealed Archive": ["Tome", "Codex", "Grimoire"],
  "Jewel / Heartstone": ["Jewel", "Heartstone", "Gem"],
  "Vessel / Urn": ["Urn", "Vessel", "Ewer"],
  "Mechanism / Grand Apparatus": ["Engine", "Apparatus", "Mechanism"],
  "Garment / Shroud": ["Shroud", "Mantle", "Cloak"],
  "Talisman / Idol": ["Talisman", "Idol", "Amulet"],
};

export interface ResolvedArtifact {
  genre: string;
  form: string;
  formNoun: string;
  originEra: string;
  powerTier: string;
  currentStatus: string;
  curseCost: string;
  campaignContext?: string;
  suggestedName: string;
}

/** Picks an unused "Adjective Noun" name; the noun is fixed when a preset form has one. */
function pickArtifactName(
  themeNames: { adjs: readonly string[]; nouns: readonly string[] },
  presetNouns: readonly string[] | undefined,
  banned: ReadonlySet<string>,
  rng: Rng,
): string {
  const nouns = presetNouns?.length ? presetNouns : [undefined];
  for (const noun of nouns) {
    for (let i = 0; i < 20; i++) {
      const candidate = `${pickFrom(themeNames.adjs, rng)} ${noun ?? pickFrom(themeNames.nouns, rng)}`;
      if (!banned.has(candidate)) return candidate;
    }
  }
  return `${generateName(rng)}'s ${presetNouns?.[0] ?? "Relic"}`;
}

export function resolveArtifact(
  options: ArtifactGeneratorOptions = {},
  rng: Rng = defaultRng,
): ResolvedArtifact {
  const genre = options.genre || pickFrom(artifactConfig.genres, rng);
  const themePool = namesByTheme[genre] ?? namesByTheme["Classic Fantasy"];
  const form = options.form || pickFrom(artifactConfig.forms, rng);
  const presetNouns = FORM_NOUNS[form];
  const presetNoun = presetNouns ? pickFrom(presetNouns, rng) : undefined;

  return {
    genre,
    form,
    formNoun: presetNoun ?? form.toLowerCase(),
    originEra: options.originEra || pickFrom(artifactConfig.originEras, rng),
    powerTier: options.powerTier || pickFrom(artifactConfig.powerTiers, rng),
    currentStatus:
      options.currentStatus || pickFrom(artifactConfig.currentStatuses, rng),
    curseCost: options.curseCost || pickFrom(artifactConfig.curseCosts, rng),
    campaignContext: options.campaignContext?.trim() || undefined,
    suggestedName: pickArtifactName(
      themePool,
      presetNouns
        ? [presetNoun!, ...presetNouns.filter((noun) => noun !== presetNoun)]
        : undefined,
      new Set(options.avoidNames ?? []),
      rng,
    ),
  };
}

export interface ArtifactPrompt {
  systemInstruction: string;
  userMessage: string;
  resolved: ResolvedArtifact;
}

export function buildArtifactPrompt(
  options: ArtifactGeneratorOptions = {},
  sessionContext = "",
  rng: Rng = defaultRng,
): ArtifactPrompt {
  const resolved = resolveArtifact(options, rng);
  const causality = getGenreCausality(resolved.genre);

  const causalityNotes: Record<GenreCausality, string> = {
    technological:
      "Technological / Hard-Sci-Fi Precursor Causality: Ground capabilities in lost advanced physics, precursor engineering, self-repairing nanites, quantum computation, sub-atomic catalysis, or classified black-project tech. NEVER introduce supernatural spells or divine miracles unless explicitly requested in campaign context.",
    "western-frontier":
      "Western / Frontier Folk & Legend Causality: Ground the relic in frontier materials (lead, cold iron, stamped brass, meteor stone, frontier tallow, prairie sage, treaty blood, rail iron), folk magic, superstition, miraculous patent-medicine panaceas, or cursed outlaw lore. Avoid sci-fi or steampunk mechanisms (no optical projections, advanced micro-tech, synthetic vapours) unless the setting explicitly specifies Weird West.",
    "steampunk-industrial":
      "Steampunk / Clockwork Grand Apparatus Causality: Ground capabilities in masterwork differential clockwork, perpetual-motion escapements, pressurized aetheric steam valves, or galvanic super-conductors.",
    "post-apocalyptic":
      "Post-Apocalyptic Pre-Collapse Black-Box Causality: Ground capabilities in surviving pre-war doomsday technology, orbital command modules, terraforming seeds, and military-grade clean-room technology.",
    occult:
      "Occult / Gothic / Cosmic Horror Causality: Ground capabilities in dark bloodlines, sympathetic resonance, eldritch geometry, and mind-bending horrors from beyond.",
    magical:
      "Magical / Primordial Causality: Ground capabilities in god-forged regalia, ancient dragon-runes, primordial elemental hearts, and world-shaping enchantments.",
  };

  const powersHeading =
    causality === "technological"
      ? "Precursor Capabilities & Subroutines"
      : causality === "western-frontier"
        ? "Frontier Manifestations & Legend"
        : causality === "steampunk-industrial" ||
            causality === "post-apocalyptic"
          ? "Mechanical Operation & Grand Output"
          : "Artifact Powers & Manifestations";

  const extraAvoidedNames = avoidNamesExcludingContext(
    options.avoidNames ?? [],
    resolved.campaignContext,
  )
    .map((name) => name.trim())
    .filter(Boolean);

  const avoidBlock =
    extraAvoidedNames.length > 0
      ? `\nAlready created or used this session — do NOT reuse these artifact names or duplicate their concepts:\n${extraAvoidedNames.map((n) => `- ${n}`).join("\n")}\n`
      : "";

  const userMessage = `Generate a unique, named, campaign-shaping Major Artifact or Ancient Relic in JSON format.
This is not a simple +X bonus weapon or disposable trinket. It is a worldbuilding anchor and campaign engine with deep lore, multi-tier powers, consequential costs, pursuing factions, and adventure hooks.

Constraints & Tone:
- Genre/Theme: ${resolved.genre} (${causalityNotes[causality]})
- Item Form: ${resolved.form}
- Origin Era: ${resolved.originEra}
- Power Tier / Scope: ${resolved.powerTier}
- Current Status: ${resolved.currentStatus}
- Curse / Drawback / Cost: ${resolved.curseCost}
${formatCampaignContextBlock(resolved.campaignContext)}

Key Design Principles:
1. Genre-Appropriate Causal Logic: When a genre is selected (${resolved.genre}), adapt not only terminology and aesthetics but also the underlying causal logic. For Western themes, prefer frontier-era materials, folk legends, and period tools without defaulting to sci-fi/steampunk mechanisms. For technological themes, ground capabilities in advanced precursor physics rather than magic spells.
2. Enforce Required Output Sections: Every single generated artifact MUST include both the "### Quick Reference" and the full "### ${powersHeading}" section (covering Dormant, Awakened, and Ascendant tiers), as well as Attunement, Cost/Curse, History, Factions, Rumours, Hooks, and Destruction conditions.
3. Multi-Tiered Powers with Clear Scaling: Powers must be structured in three clear stages:
   - **Dormant / Passive State**: Subtle continuous benefits or sensory tells.
   - **Awakened State**: Active miraculous or devastating capabilities requiring deliberate action.
   - **Ascendant / Full Realisation**: Reality- or campaign-altering capabilities unlocked through great trial or sacrifice.
4. Consequential Costs & Taboos: Drawbacks must feel weighty and campaign-relevant (e.g. physical decay, moral prohibitions, psychic strain, or beacon-like attraction of rivals), never trivial cosmetic quirks.
5. Living Setting Connections: Provide 2–3 distinct factions, rulers, or rivals actively hunting or guarding the artifact, each with a different motivation.
6. Concrete Destruction / Sealing Conditions: State at least one difficult, legendary condition or ritual required to permanently destroy, unmake, or safely seal the artifact.
7. Section Length & Compression Guidelines: Maintain high evocative quality while compressing each section tightly:
   - Physical description: 2–3 paragraphs max
   - Powers: 1 compact paragraph or 2–3 bullets per tier (Dormant, Awakened, Ascendant)
   - Attunement: 1 short paragraph
   - Cost / Curse / Taboo: 1–2 paragraphs
   - History: 2–3 short paragraphs max
   - Interested Factions: 3 bullets, 1–2 sentences each
   - Rumours & Legends: 3 bullets
   - Adventure Hooks: 2–3 hooks, one sentence each
   - Destruction / Sealing: 1 compact paragraph
8. System-Agnostic: Focus on concrete narrative and physical effects that any GM can interpret immediately without relying on specific RPG rulesets or numeric stat blocks.

Before returning, run a consistency pass:
- Both "### Quick Reference" and the full "### ${powersHeading}" section are present with Dormant, Awakened, and Ascendant tiers clearly delineated.
- The underlying causal logic strictly matches "${resolved.genre}".
- The artifact form matches "${resolved.form}" and physical materials matter to its handling.
- The cost or curse matches "${resolved.curseCost}" with meaningful campaign stakes.
- Section lengths strictly adhere to the compression guidelines (Description: 2–3 paragraphs max; Powers: 1 compact paragraph or 2–3 bullets per tier; Attunement: 1 short paragraph; Cost: 1–2 paragraphs; History: 2–3 short paragraphs max; Factions: 3 bullets of 1–2 sentences; Rumours: 3 bullets; Hooks: 2–3 one-sentence hooks; Destruction: 1 compact paragraph).
- Factions, rumors, and adventure hooks provide immediate gameplay fuel for the GM.
- Destruction or sealing conditions are clear and legendary.

You must return a valid JSON object matching this schema:
{
  "title": "Evocative Artifact Name",
  "content": "2–3 paragraphs max describing physical appearance, materials, ancient craftsmanship, tactile texture, sensory aura, and visual details when inspected.",
  "lore": "Markdown formatted GM reference with the following exact headings:\\n\\n### Quick Reference\\n- **Item Form**: ${resolved.form}\\n- **Origin Era**: ${resolved.originEra}\\n- **Power Tier**: ${resolved.powerTier}\\n- **Current Status**: ${resolved.currentStatus}\\n- **Curse / Cost**: ${resolved.curseCost}\\n- **Setting / Theme**: ${resolved.genre}\\n\\n### ${powersHeading}\\n- **Dormant Powers**: 1 compact paragraph or 2–3 bullets of baseline subtle effects and sensory tells.\\n- **Awakened Powers**: 1 compact paragraph or 2–3 bullets of activated major abilities and world effects.\\n- **Ascendant / Zenith Powers**: 1 compact paragraph or 2–3 bullets of cataclysmic or campaign-scale powers.\\n\\n### Attunement & Awakening Requirements\\n1 short paragraph on what a mortal, hero, or engineer must do, sacrifice, or understand.\\n\\n### Cost, Curse, Corruption, or Taboo\\n1–2 paragraphs on the consequential price, taboo, or lingering corruption of wielding or keeping the artifact.\\n\\n### Known History & Previous Keepers\\n2–3 short paragraphs max covering ancient creators, milestones, and what became of previous wielders.\\n\\n### Interested Factions & Pursuers\\n3 bullets (1–2 sentences each) detailing interested factions, rivals, or rulers and their motives.\\n\\n### Rumours & Conflicting Legends\\n3 bullets of folk beliefs, false assumptions, or exaggerated tales.\\n\\n### Adventure Hooks\\n2–3 scenario hooks (one sentence each) for finding, stealing, protecting, or neutralizing the artifact.\\n\\n### Destruction or Sealing Conditions\\n1 compact paragraph describing the specific ritual, environment, or feat required to permanently destroy or seal it.",
  "labels": ["artifact", "relic", "imported-draft"]
}
${avoidBlock}
${NAME_BAN_PROMPT}
${sessionContext}
Return only the JSON object. Do not include markdown code block formatting like \`\`\`json.`;

  return {
    systemInstruction:
      "You are an expert tabletop RPG designer specialising in evocative, campaign-shaping major artifacts, ancient relics, and legendary worldbuilding objects.",
    userMessage: withPublicCreativeCue(userMessage, "object", rng),
    resolved,
  };
}

export function parseArtifactResponse(
  text: string,
  resolved: ResolvedArtifact,
): PublicGeneratorOutput {
  const data = parseFencedJson(text);
  const causality = getGenreCausality(resolved.genre);
  const powersHeading =
    causality === "technological"
      ? "Precursor Capabilities & Subroutines"
      : causality === "western-frontier"
        ? "Frontier Manifestations & Legend"
        : causality === "steampunk-industrial" ||
            causality === "post-apocalyptic"
          ? "Mechanical Operation & Grand Output"
          : "Artifact Powers & Manifestations";

  let lore = (data.lore || "").trim();

  // Enforce required Quick Reference section
  if (!lore.includes("### Quick Reference")) {
    lore =
      `### Quick Reference\n- **Item Form**: ${resolved.form}\n- **Origin Era**: ${resolved.originEra}\n- **Power Tier**: ${resolved.powerTier}\n- **Current Status**: ${resolved.currentStatus}\n- **Curse / Cost**: ${resolved.curseCost}\n- **Setting / Theme**: ${resolved.genre}\n\n${lore}`.trim();
  }

  // Enforce required Powers section
  const hasPowersHeading =
    lore.includes("### Artifact Powers & Manifestations") ||
    lore.includes("### Precursor Capabilities & Subroutines") ||
    lore.includes("### Frontier Manifestations & Legend") ||
    lore.includes("### Mechanical Operation & Grand Output") ||
    lore.includes("### Powers & Manifestations") ||
    lore.includes("### Core Powers");

  if (!hasPowersHeading) {
    const fallbackPowers =
      data.summary ||
      data.content ||
      "Possesses immense ancient power across dormant, awakened, and ascendant states.";
    lore =
      `${lore}\n\n### ${powersHeading}\n- **Dormant Powers**: Subtle environmental resonance.\n- **Awakened Powers**: ${fallbackPowers}\n- **Ascendant Powers**: Reality-altering output.`.trim();
  }

  return {
    type: "item",
    title: data.title || resolved.suggestedName,
    summary: data.summary || "",
    content: data.content || "",
    lore,
    labels: Array.isArray(data.labels)
      ? data.labels
      : ["artifact", "relic", "imported-draft"],
    status: "active",
  };
}

/** GM-notes section for the campaign context; empty when none is given. */
function campaignSectionFor(campaignContext?: string): string {
  return campaignContext ? `\n\n### Campaign Context\n${campaignContext}` : "";
}

/** Picks up to `count` different items, in random order. */
function pickDistinct<T>(items: readonly T[], count: number, rng: Rng): T[] {
  const pool = [...items];
  const picked: T[] = [];
  while (picked.length < count && pool.length > 0) {
    const index = Math.floor(rng() * pool.length);
    picked.push(...pool.splice(index, 1));
  }
  return picked;
}

/** Ascendant power at the heroic and regional tiers, in `powerTiers` order. */
const smallerReachAscendant: Record<GenreCausality, [string, string]> = {
  technological: [
    "Projects a short-range lattice shield that stops a single squad's gunfire for one minute.",
    "Locks every networked device in one district, shutting down traffic lights, doors and comms for an hour.",
  ],
  "western-frontier": [
    "Turns a single revolver's shots aside, so the bearer cannot be hit by bullets for a few heartbeats.",
    "Calls a dust storm over one town, blinding riders and holding a posse back for a full day.",
  ],
  "steampunk-industrial": [
    "Overcharges a single boiler, lifting a cart or carriage clear of the street for a minute.",
    "Stalls every steam engine in one district, leaving its factories silent until the relic is calmed.",
  ],
  "post-apocalyptic": [
    "Heals minor wounds and filters the air around the bearer, keeping them alive inside a poison cloud.",
    "Floods one settlement's wells with purifying light, cleansing contamination for a full season.",
  ],
  occult: [
    "Lets the bearer see one ghost in a room and speak with it briefly.",
    "Pulls the shadows of one village into a single night that lasts three days.",
  ],
  magical: [
    "Gives the bearer a brief glow of courage that steadies allies against fear and shock.",
    "Ends a drought over one county, so rain falls across the fields for a full season.",
  ],
};

/** Curse / cost lines, in `curseCosts` order. */
const CURSE_LINES: readonly string[] = [
  "Each use requires a measure of the bearer's blood, poured into the relic's cavity until the bearer grows weak.",
  "Each use spreads a grey rot through the bearer's skin and memories, slowly and without a known cure.",
  "The bearer must keep a strict taboo: they must never lie, break a vow, or refuse a plea for help.",
  "The relic's glow draws horrors and rival hunters to the bearer from every direction, wherever they travel.",
  "Each day in the bearer's keeping, a memory fades, while nightmares of the relic's old keepers grow sharper.",
  "The relic has no supernatural price, but it is heavy, hard to hide and must be guarded at all times.",
];

/** Hook for each `currentStatuses` entry, listed first in the hooks section. */
const STATUS_HOOKS: readonly string[] = [
  "**The Lost Sanctuary**: The relic lies in a ruined sanctuary, and the party must find a way in before its wardens return.",
  "**The Vault Break**: The relic is sealed in a high-security vault, and the party must open it without raising the alarm.",
  "**The Usurper**: A tyrant or rival holds the relic in open defiance, and the party has been hired to take it back.",
  "**The Hidden Relic**: The relic is disguised as ordinary wreckage, and the party must find it before a buyer does.",
  "**The Reforging**: The relic lies in shards across the region, and the party must recover every piece before someone reassembles it.",
  "**The Deep Find**: The relic lies submerged in a remote and dangerous place, and the party must reach it before the depths or rivals do.",
];

const factionsByCausality: Record<GenreCausality, string[]> = {
  technological: [
    "**The Ascendancy Directorate**: Seeks to lock the relic in corporate vaults to control the network it can override.",
    "**The Null Collective**: Anti-technology saboteurs who want the relic destroyed before it wakes the machines.",
    "**A Rogue Systems Architect**: Hunts the relic to rewrite its core code, and will kill for the source keys.",
  ],
  "western-frontier": [
    "**The Territorial Railroad Company**: Wants the relic for land claims along the new line and will hire gunmen to take it.",
    "**A Circuit Preacher's Flock**: Believes the relic is a holy sign and will guard it against outlaws and the government.",
    "**The Territory Marshal**: Wants the relic sealed away under the law before a rival gang can claim it.",
  ],
  "steampunk-industrial": [
    "**The Guild of Horologists**: Seeks to take the relic apart for its escapements and keep its secrets within the guild.",
    "**The Boiler Syndicate**: Industrial barons who want its pressurised aether to power a city's engines and crush their rivals.",
    "**A Luddite Brotherhood**: Smashes automata and wants the relic destroyed before it powers another war machine.",
  ],
  "post-apocalyptic": [
    "**The Bunker Warlord**: Holds the stronghold's reactors and wants the relic's power to rule the survivor settlements.",
    "**The Salvage Caravans**: Scavengers who will trade almost anything for the relic's pre-war parts and fuel.",
    "**The Sterile Priesthood**: Believes the relic's signal is a judgement and wants it switched off for good.",
  ],
  occult: [
    "**The Ash Cult of Veil-Keepers**: Seeks to bind the relic's shadows to their own rites, even at the cost of their lives.",
    "**The Night Inquisition**: Hunts the relic and its bearers, believing the whispers are a plague from beyond.",
    "**A Grave Heiress**: Desperate to reclaim her family's lost heirloom, and ready to bargain with the dead to get it.",
  ],
  magical: [
    "**The Sovereign's Oathbound**: Knights sworn to bring the relic to their king's throne before a rival can claim it.",
    "**The Order of the Sunflame**: Priests who seek to purify the relic in holy fire and return it to the temples.",
    "**A Dragon Lord in Exile**: Wants the relic to reclaim a fallen throne, and will burn anyone who stands in the way.",
  ],
};

const rumorsByCausality: Record<GenreCausality, string[]> = {
  technological: [
    "Dockworkers swear the relic hums in its sleep, and that its lights blink in time with the city's traffic signals.",
    "Scholars argue whether it was built by a lost corporate intelligence or by a people who left the stars behind.",
    "Some say the relic only obeys someone whose neural implant has been wiped clean.",
  ],
  "western-frontier": [
    "Drovers say the relic brings rain, but also that cattle die wherever it is carried.",
    "Some claim it was taken from a dead gunslinger who still rides the trail at night.",
    "Folk tales say it answers only to a bearer who has lost a family and still keeps riding.",
  ],
  "steampunk-industrial": [
    "Engineers claim the relic runs cooler in a clockmaker's hands and hotter in a banker's.",
    "Dock workers say its steam whistle warns of boiler explosions three days early.",
    "Some say the inventor who forged it vanished inside his own machine.",
  ],
  "post-apocalyptic": [
    "Survivors believe the relic's glow is a sign that the old world is about to return.",
    "Traders claim it can cure the sickness, though every healer who tried to use it has died.",
    "Some say the relic was once a weapon, and its builders kept it sealed for good reason.",
  ],
  occult: [
    "Villagers say the relic is a mirror of the dead, and anyone who looks too long sees their own grave.",
    "Scholars debate whether its maker was a fallen saint or a demon who pretended to be one.",
    "Old songs claim its shadow only fades when the bearer tells a true secret.",
  ],
  magical: [
    "Common folk believe the artifact brings bountiful harvests, but in truth, it leeches fertility from neighboring lands to fuel its miracles.",
    "Scholars debate whether the creator was a benevolent demigod or a mad sorcerer who doomed their entire civilization.",
    "The relic's true power, so the story goes, only answers to someone who has lost everything they loved.",
  ],
};

const hooksByCausality: Record<GenreCausality, string[]> = {
  technological: [
    "**The Data Heist**: The relic's keys are kept in a corporate server vault, and a rebel crew hires the party to steal them.",
    "**The Dead Signal**: The relic has begun broadcasting, and a city's machines are failing one by one. The party must find the source and cut it.",
    "**The Buyer**: A rival firm will pay well for the relic, and the party is asked to deliver it to a secret lab.",
  ],
  "western-frontier": [
    "**The Stagecoach Run**: The relic is being carried across the territory by a small escort, and the party must reach the fort first.",
    "**The Ghost Town**: The relic was hidden in an abandoned mining town, where the spirits of its old owners still guard it.",
    "**The Bounty**: A gang leader has put a price on the relic, and the party is hired to bring it in alive.",
  ],
  "steampunk-industrial": [
    "**The Foundry Raid**: The relic is locked in a guild foundry, and the party must break in before its engines are taken apart.",
    "**The Boiler Fire**: A pressurised relic is about to explode in the factory district, and someone must vent it safely.",
    "**The Auction**: The relic is to be sold at a secret auction, and the party must win it or steal it.",
  ],
  "post-apocalyptic": [
    "**The Bunker Run**: The relic's reactors are in a sealed bunker, and the party must breach it before the raiders do.",
    "**The Caravan Escort**: A salvage caravan carrying the relic is under attack, and the party must hold the road.",
    "**The Dead Reactor**: The relic's power core is failing, and the party must find fuel before the settlement goes dark.",
  ],
  occult: [
    "**The Crypt Vigil**: The relic lies in an unmarked crypt, and anyone who spends the night there may wake changed.",
    "**The Haunted Heir**: A grieving noble wants the relic back, but its spirits demand a bargain first.",
    "**The Mirror Hunt**: A cult has stolen the relic, and the party must follow the reflections to find it.",
  ],
  magical: [
    "**The Royal Heist**: The relic is locked in a royal treasury, and rebels hire the party to steal it.",
    "**The Sacred Escort**: The relic must reach a distant shrine before rival pursuers intercept it.",
    "**The Dragon's Demand**: A dragon has claimed the relic as a debt, and the party must pay it or fight.",
  ],
};

const destructionByCausality: Record<GenreCausality, string[]> = {
  technological: [
    "Must be fed into a plasma furnace until its core lattice melts, and the crucible sealed afterwards.",
    "Can only be unmade by overloading it with its own signal at the exact moment its twin relic is destroyed.",
    "Must be erased by a full cold reset of its source network, performed by someone who will not survive it.",
  ],
  "western-frontier": [
    "Must be buried in consecrated ground beneath a fresh grave, marked with iron and salt.",
    "Can only be broken by striking it with an iron cross blessed at dawn, in the open desert.",
    "Must be given to fire in a sacred ashpit while a hymn is sung through the night.",
  ],
  "steampunk-industrial": [
    "Must be sunk into the boiling core of the city's central furnace until its escapements melt.",
    "Can only be stopped by hammering its governor with a mercury hammer until the balance wheels seize.",
    "Must be dropped into a deep brine vent that drowns its pressurised aether.",
  ],
  "post-apocalyptic": [
    "Must be reburied in its sealed bunker, with the reactor shut down by hand, a task that costs one person their life.",
    "Can only be scrapped by melting its alloy in a salvage forge fired with pre-war fuel.",
    "Must be detonated in a dead zone, with the blast sealed inside a lead vault.",
  ],
  occult: [
    "Must be burned at the grave of its first keeper while the bearer speaks the true name of the thing that owns it.",
    "Can only be sealed by walling it into a crypt with the ashes of nine mourners.",
    "Must be drowned in running water at midnight, while its reflection is shattered.",
  ],
  magical: [
    "Must be plunged into the molten heart of the volcanic caldera where it was first forged, while quenched in the tears of a true sovereign.",
    "Can only be unmade by striking it against its identical twin relic at the exact apex of a solar eclipse.",
    "Must be dissolved in an alchemical vat of primeval dragon-bile over seven days and seven nights without interruption.",
  ],
};

export function generateArtifactLocal(
  options: ArtifactGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const resolved = resolveArtifact(options, rng);
  const {
    genre,
    form,
    formNoun,
    originEra,
    powerTier,
    currentStatus,
    curseCost,
    campaignContext,
    suggestedName,
  } = resolved;

  const causality = getGenreCausality(genre);
  const eraPhrase = originEra.toLowerCase().replace(" / ", " or ");
  const powersHeading =
    causality === "technological"
      ? "Precursor Capabilities & Subroutines"
      : causality === "western-frontier"
        ? "Frontier Manifestations & Legend"
        : causality === "steampunk-industrial" ||
            causality === "post-apocalyptic"
          ? "Mechanical Operation & Grand Output"
          : "Artifact Powers & Manifestations";

  const appearances: Record<GenreCausality, string[]> = {
    technological: [
      `The ${suggestedName} is a monolithic ${formNoun.toLowerCase()} forged from a seamless, non-reflective black alloy that absorbs ambient light and laser scanning. Its surface feels chillingly cold to the touch, inscribed with microscopic fractal superconducting traces that pulse with a faint cerulean glow whenever a sentient observer approaches.`,
      `Engineered as a complex ${formNoun.toLowerCase()}, the ${suggestedName} hovers weightlessly inside a magnetic containment cradle. Its outer chassis is composed of translucent diamondoid lattice housing a dense, swirling core of Bose-Einstein condensate.`,
    ],
    "western-frontier": [
      `The ${suggestedName} takes the form of a heavy, weather-beaten ${formNoun.toLowerCase()}. Hammered from black meteoric iron and bound with cured buffalo rawhide and stamped brass bands, it carries the scent of mountain thunder and charred wood. Strange frontier brandings line its spine, radiating steady warmth even in winter gales.`,
      `Housed in an ironwood case with hand-cast pewter fittings, the ${suggestedName} is an ancient ${formNoun.toLowerCase()} worn smooth by generations of trail dust, dried tobacco, and frontier river water.`,
    ],
    "steampunk-industrial": [
      `The ${suggestedName} is a towering masterpiece of clockwork and metallurgy in the shape of a grand ${formNoun.toLowerCase()}. Polished brass bezels, oil-rubbed bronze dials, and sapphire jewel bearings enclose a hermetically sealed chamber filled with luminescent, pressurized aether.`,
      `Constructed from riveted boiler-plate steel and precision-cut platinum escapements, the ${suggestedName} hums with a deep, rhythmic mechanical heartbeat that resonates through floorboards.`,
    ],
    "post-apocalyptic": [
      `The ${suggestedName} is a battle-scarred pre-collapse ${formNoun.toLowerCase()} recovered from deep within a sealed subterranean bunker. Its heavy military composite casing is scorched and pitted, yet its diagnostic status indicators remain defiantly lit in amber phosphor.`,
      `Assembled from heavy lead shielding, salvaged titanium rods, and sealed reactor components, the ${suggestedName} emits a soft, reassuring hum and a faint scent of hot circuit boards.`,
    ],
    occult: [
      `The ${suggestedName} is an unsettling ${formNoun.toLowerCase()} carved from a dense, petrified bone-like mineral that seems warm and faintly supple. Dark, dried arterial veining runs across its contours, and in absolute silence, observers hear what sounds like quiet breathing.`,
      `Bound in blackened velvet and tarnished silver lace, the ${suggestedName} casts an unnatural shadow that does not align with ambient candles, leaving a scent of grave lilies and old copper in the room.`,
    ],
    magical: [
      `The ${suggestedName} is a legendary ${formNoun.toLowerCase()} forged in the heart of a fallen star during the ${eraPhrase}. It gleams with an unyielding celestial brilliance, inlaid with true-gold runes that hum with ancient harmonic resonance when drawn from its silk scabbard.`,
      `Crafted from a single flawless shard of primordial crystal bound in dragon-gold filigree, the ${suggestedName} feels weightless in the hand of the worthy and unmovable as a mountain to the unjust.`,
    ],
  };

  const powersByCausality: Record<
    GenreCausality,
    { dormant: string; awakened: string; ascendant: string }
  > = {
    technological: {
      dormant: `Emits an omni-directional tactical scan that feeds predictive navigation and threat-tracking directly into the user's optical nerve.`,
      awakened: `Generates a localized phase-displacement field capable of deflecting hyper-velocity kinetic rounds and energy strikes for three minutes.`,
      ascendant: `Initiates a planetary broadcast pulse that overrides all machine infrastructure and orbital satellites within a five-hundred-kilometer radius.`,
    },
    "western-frontier": {
      dormant: `The bearer never loses their way under open sky, sensing the precise direction of water, shelter, and approaching riders over the horizon.`,
      awakened: `When brandished in a standoff, all firearms and deadly intent within sixty paces are bound; no hostile trigger can be pulled until words are spoken.`,
      ascendant: `Summons a cataclysmic dust storm and stampede of spirit-steeds that can sweep away a railroad company town or hostile cavalry regiment in an hour.`,
    },
    "steampunk-industrial": {
      dormant: `Regulates and doubles the energy efficiency of any boiler, mechanical engine, or workshop within a hundred paces.`,
      awakened: `Discharges a massive galvanic chain-arc that disables automated machinery and paralyzes biological nervous systems in a wide cone.`,
      ascendant: `Bends atmospheric air currents and barometric pressure across an entire metropolis, dispelling industrial smog or summoning a gale-force storm.`,
    },
    "post-apocalyptic": {
      dormant: `Instantly purifies and decontaminates food, soil, and water within fifty paces of radiation, heavy metals, and bioweapons.`,
      awakened: `Deploys an automated micro-forge subroutine capable of synthesizing ammunition, medicine, and critical replacement parts from raw scrap in minutes.`,
      ascendant: `Transmits an emergency override signal that reactivates a network of orbital terraforming mirrors, restoring fertility to an entire scorched wasteland.`,
    },
    occult: {
      dormant: `The wielder perceives ghosts, astral residue, and hidden bloodlines through mirrors and reflective surfaces.`,
      awakened: `Allows the wielder to command shadows and deceased spirits to spy on distant halls or strangle a target in their sleep.`,
      ascendant: `Tears open a veil to the outer abyss, blotting out the sun across a province and binding the dead to rise and serve.`,
    },
    magical: {
      dormant: `Surrounds the bearer with a ward of absolute clarity; magical deceptions, illusions, and mental intrusions cannot touch their mind.`,
      awakened: `Unleashes a torrent of primordial radiant fire that immolates supernatural monstrosities and mends the mortal wounds of all allies in sight.`,
      ascendant: `Rewrites local reality in accordance with an ancient sovereign oath, raising a citadel from bedrock or restoring life to a fallen kingdom.`,
    },
  };

  const attunements: Record<GenreCausality, string[]> = {
    technological: [
      `Requires a direct neural jack interface and enduring a 72-hour biometric synchronization process that burns out redundant memory engrams.`,
      `Must be initialized by inserting a verified Precursor cryptographic keycard while bathed in pure particle radiation.`,
    ],
    "western-frontier": [
      `Must be claimed through a blood oath sworn at midnight over an unmarked crossroads grave under a full moon.`,
      `Requires fasting alone in the desert badlands for three days until the spirit of the maker acknowledges the bearer's resolve.`,
    ],
    "steampunk-industrial": [
      `Must be calibrated by a Master Horologist using bespoke clockwork verniers and pure mercury balance weights.`,
      `Requires channeling five thousand foot-pounds of high-pressure steam through its intake manifolds without blowing the release valve.`,
    ],
    "post-apocalyptic": [
      `Must be authorized using a sealed biometric keycard and a DNA sample from an unmutated pre-war lineage.`,
      `Requires sacrificing a functional fusion battery core to jumpstart its long-dormant auxiliary systems.`,
    ],
    occult: [
      `The wielder must cut their own palm and let nine drops of arterial blood seep into the central cavity while reciting their true name backward.`,
      `Requires spending a night entombed in an ancient crypt without a light source or speaking a single word.`,
    ],
    magical: [
      `The bearer must demonstrate proven virtue or royal bloodline by holding the item over sacred flame without flinching.`,
      `Requires the blessing of three ancient high priests or slaying a creature of pure malice in single combat.`,
    ],
  };

  const costs: Record<GenreCausality, string[]> = {
    technological: [
      `Each use drains the bearer's cellular vitality, causing rapid premature aging and persistent neural micro-seizures.`,
      `Transmits a continuous high-frequency ping across orbital frequencies, attracting automated hunter-killer drone swarms.`,
    ],
    "western-frontier": [
      `The wielder can never rest under a roof; entering a saloon or home causes the structure's timbers to groan and crack until they depart.`,
      `Demands a blood debt: whenever drawn, it will not return to its scabbard or holster until it has drawn living blood.`,
    ],
    "steampunk-industrial": [
      `Vents volatile superheated aether gas that causes permanent respiratory damage and progressive metal-scale skin discoloration.`,
      `Demands constant maintenance with rare alchemical lubricants; neglecting it for one week causes it to violently backfire.`,
    ],
    "post-apocalyptic": [
      `Emits a low-level radiation signature that slowly renders the carrier sterile and leaves luminous footprints in the dark.`,
      `Its active power reserves deplete rapidly; once exhausted, it permanently shuts down unless refueled with rare reactor coolant.`,
    ],
    occult: [
      `The wielder slowly loses the ability to feel warmth, love, or empathy, viewing all living mortals as fleeting meat and blood.`,
      `Attracts eldritch shadows that whisper maddening cosmic truths in the bearer's ear whenever they attempt to sleep.`,
    ],
    magical: [
      `The wielder is bound by a strict chivalric taboo: they must never refuse hospitality, flee from a duel, or speak an untruth.`,
      `Every activation exacts a year of the wielder's mortal lifespan, turning locks of their hair silver with each dawn.`,
    ],
  };

  const factions = factionsByCausality[causality];
  const rumors = rumorsByCausality[causality];
  const hookPool = hooksByCausality[causality];
  const destructionPool = destructionByCausality[causality];

  const content = `### Description
${pickFrom(appearances[causality], rng)}`;

  const powers = powersByCausality[causality];
  const tierIndex = artifactConfig.powerTiers.indexOf(powerTier);
  const ascendant =
    tierIndex === 0 || tierIndex === 1
      ? smallerReachAscendant[causality][tierIndex]
      : powers.ascendant;
  const curseIndex = artifactConfig.curseCosts.indexOf(curseCost);
  const cost =
    curseIndex >= 0 ? CURSE_LINES[curseIndex] : pickFrom(costs[causality], rng);
  const statusIndex = artifactConfig.currentStatuses.indexOf(currentStatus);
  const hookLines =
    statusIndex >= 0
      ? [STATUS_HOOKS[statusIndex], ...pickDistinct(hookPool, 2, rng)]
      : pickDistinct(hookPool, 3, rng);
  const attunement = pickFrom(attunements[causality], rng);
  const destructionMethod = pickFrom(destructionPool, rng);
  const campaignSection = campaignSectionFor(campaignContext);

  const lore = `### Quick Reference
- **Item Form**: ${form}
- **Origin Era**: ${originEra}
- **Power Tier**: ${powerTier}
- **Current Status**: ${currentStatus}
- **Curse / Cost**: ${curseCost}
- **Setting / Theme**: ${genre}

### ${powersHeading}
- **Dormant Powers**: ${powers.dormant}
- **Awakened Powers**: ${powers.awakened}
- **Ascendant / Zenith Powers**: ${ascendant}

### Attunement & Awakening Requirements
${attunement}

### Cost, Curse, Corruption, or Taboo
${cost}

### Known History & Previous Keepers
Forged during the ${eraPhrase} by master artisans whose names have been scrubbed from historical archives. Passed through the hands of three fallen dynasties, each of which collapsed shortly after tapping into its ascendant powers.

### Interested Factions & Pursuers
${factions.join("\n\n")}

### Rumours & Conflicting Legends
${rumors.map((r) => `- ${r}`).join("\n")}

### Adventure Hooks
${hookLines.join("\n\n")}

### Destruction or Sealing Conditions
${destructionMethod}${campaignSection}`;

  return {
    type: "item",
    title: suggestedName,
    summary: "",
    content,
    lore,
    labels: ["artifact", "relic", "imported-draft"],
    status: "active",
  };
}
