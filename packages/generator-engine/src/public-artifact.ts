/**
 * Public Artifact & Relic Generator — framework-free port for unique, named,
 * lore-heavy magical (or precursor, occult, frontier, or industrial) objects
 * that serve as worldbuilding anchors and campaign engines (#2387).
 */

import type { PublicGeneratorOutput } from "./public-generator-adapters";
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

export interface ResolvedArtifact {
  genre: string;
  form: string;
  originEra: string;
  powerTier: string;
  currentStatus: string;
  curseCost: string;
  campaignContext?: string;
  suggestedName: string;
}

export function resolveArtifact(
  options: ArtifactGeneratorOptions = {},
  rng: Rng = defaultRng,
): ResolvedArtifact {
  const genre = options.genre || pickFrom(artifactConfig.genres, rng);
  const themePool = namesByTheme[genre] ?? namesByTheme["Classic Fantasy"];
  const banned = new Set(options.avoidNames ?? []);

  let candidateName = "";
  for (let i = 0; i < 20; i++) {
    const adj = pickFrom(themePool.adjs, rng);
    const noun = pickFrom(themePool.nouns, rng);
    const candidate = `${adj} ${noun}`;
    if (!banned.has(candidate)) {
      candidateName = candidate;
      break;
    }
  }
  if (!candidateName) {
    candidateName = `${generateName(rng)}'s Relic`;
  }

  return {
    genre,
    form: options.form || pickFrom(artifactConfig.forms, rng),
    originEra: options.originEra || pickFrom(artifactConfig.originEras, rng),
    powerTier: options.powerTier || pickFrom(artifactConfig.powerTiers, rng),
    currentStatus:
      options.currentStatus || pickFrom(artifactConfig.currentStatuses, rng),
    curseCost: options.curseCost || pickFrom(artifactConfig.curseCosts, rng),
    campaignContext: options.campaignContext?.trim() || undefined,
    suggestedName: candidateName,
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
    userMessage,
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

export function generateArtifactLocal(
  options: ArtifactGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const resolved = resolveArtifact(options, rng);
  const {
    genre,
    form,
    originEra,
    powerTier,
    currentStatus,
    curseCost,
    suggestedName,
  } = resolved;

  const causality = getGenreCausality(genre);
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
      `The ${suggestedName} is a monolithic ${form.toLowerCase()} forged from a seamless, non-reflective black alloy that absorbs ambient light and laser scanning. Its surface feels chillingly cold to the touch, inscribed with microscopic fractal superconducting traces that pulse with a faint cerulean glow whenever a sentient observer approaches.`,
      `Engineered as a complex ${form.toLowerCase()}, the ${suggestedName} hovers weightlessly inside a magnetic containment cradle. Its outer chassis is composed of translucent diamondoid lattice housing a dense, swirling core of Bose-Einstein condensate.`,
    ],
    "western-frontier": [
      `The ${suggestedName} takes the form of a heavy, weather-beaten ${form.toLowerCase()}. Hammered from black meteoric iron and bound with cured buffalo rawhide and stamped brass bands, it carries the scent of mountain thunder and charred wood. Strange frontier brandings line its spine, radiating steady warmth even in winter gales.`,
      `Housed in an ironwood case with hand-cast pewter fittings, the ${suggestedName} is an ancient ${form.toLowerCase()} worn smooth by generations of trail dust, dried tobacco, and frontier river water.`,
    ],
    "steampunk-industrial": [
      `The ${suggestedName} is a towering masterpiece of clockwork and metallurgy in the shape of a grand ${form.toLowerCase()}. Polished brass bezels, oil-rubbed bronze dials, and sapphire jewel bearings enclose a hermetically sealed chamber filled with luminescent, pressurized aether.`,
      `Constructed from riveted boiler-plate steel and precision-cut platinum escapements, the ${suggestedName} hums with a deep, rhythmic mechanical heartbeat that resonates through floorboards.`,
    ],
    "post-apocalyptic": [
      `The ${suggestedName} is a battle-scarred pre-collapse ${form.toLowerCase()} recovered from deep within a sealed subterranean bunker. Its heavy military composite casing is scorched and pitted, yet its diagnostic status indicators remain defiantly lit in amber phosphor.`,
      `Assembled from heavy lead shielding, salvaged titanium rods, and sealed reactor components, the ${suggestedName} emits a soft, reassuring hum and a faint scent of hot circuit boards.`,
    ],
    occult: [
      `The ${suggestedName} is an unsettling ${form.toLowerCase()} carved from a dense, petrified bone-like mineral that seems warm and faintly supple. Dark, dried arterial veining runs across its contours, and in absolute silence, observers hear what sounds like quiet breathing.`,
      `Bound in blackened velvet and tarnished silver lace, the ${suggestedName} casts an unnatural shadow that does not align with ambient candles, leaving a scent of grave lilies and old copper in the room.`,
    ],
    magical: [
      `The ${suggestedName} is a legendary ${form.toLowerCase()} forged in the heart of a fallen star during the ${originEra.toLowerCase()}. It gleams with an unyielding celestial brilliance, inlaid with true-gold runes that hum with ancient harmonic resonance when drawn from its silk scabbard.`,
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

  const factions = [
    `**The Iron Hegemony / Crown Council**: Seeks to secure the artifact to cement their uncontested reign over the province.`,
    `**The Brotherhood of the Veil**: A secretive order of lorekeepers dedicated to finding and sealing the relic before it destroys society.`,
    `**An Itinerant Champion / Outlaw Lord**: Driven by personal vengeance to seize the artifact and strike down their former masters.`,
  ];

  const rumors = [
    `Common folk believe the artifact brings bountiful harvests, but in truth, it leeches fertility from neighboring lands to fuel its miracles.`,
    `Scholars debate whether the creator was a benevolent demigod or a mad sorcerer who doomed their entire civilization.`,
    `The relic's true power, so the story goes, only answers to someone who has lost everything they loved.`,
  ];

  const hooks = [
    `**The Heist**: The artifact has been locked in a high-security vault by a corrupt tyrant, and a rebel coalition hires the party to extract it.`,
    `**The Escort**: The party is entrusted with delivering the dormant relic across hostile territory to an ancient sanctuary before rival pursuers intercept them.`,
    `**The Purge**: The relic has begun awakening on its own, causing supernatural anomalies across the countryside; the party must find its hiding spot and neutralize it.`,
  ];

  const destruction = [
    `Must be plunged into the molten heart of the volcanic caldera where it was first forged, while quenched in the tears of a true sovereign.`,
    `Can only be unmade by striking it against its identical twin relic at the exact apex of a solar eclipse.`,
    `Must be dissolved in an alchemical vat of primeval dragon-bile over the course of seven days and seven nights without interruption.`,
  ];

  const content = `### Description
${pickFrom(appearances[causality], rng)}`;

  const powers = powersByCausality[causality];
  const attunement = pickFrom(attunements[causality], rng);
  const cost = pickFrom(costs[causality], rng);
  const destructionMethod = pickFrom(destruction, rng);

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
- **Ascendant / Zenith Powers**: ${powers.ascendant}

### Attunement & Awakening Requirements
${attunement}

### Cost, Curse, Corruption, or Taboo
${cost}

### Known History & Previous Keepers
Forged during the ${originEra.toLowerCase()} by master artisans whose names have been scrubbed from historical archives. Passed through the hands of three fallen dynasties, each of which collapsed shortly after tapping into its ascendant powers.

### Interested Factions & Pursuers
${factions.join("\n\n")}

### Rumours & Conflicting Legends
${rumors.map((r) => `- ${r}`).join("\n")}

### Adventure Hooks
${hooks.join("\n\n")}

### Destruction or Sealing Conditions
${destructionMethod}`;

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
