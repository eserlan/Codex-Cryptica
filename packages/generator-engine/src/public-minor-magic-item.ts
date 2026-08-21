/**
 * Public Minor / Single-Use Magic Item generator — framework-free port following the
 * public-quest.ts / public-villain.ts shape (#2386).
 *
 * Produces small-scale, flavourful, low-impact, consumable, or limited-use magic
 * items (charms, potions, talismans, inscribed seals, oddities, disposable devices)
 * that are system-agnostic and focus on memorable utility, sensory quirks, and
 * creative problem-solving rather than numerical +X bonuses or major campaign artefacts.
 */

import type { PublicGeneratorOutput } from "./public-generator-adapters";
import { NAME_BAN_PROMPT } from "./public-npc";
import { type Rng, defaultRng, pickFrom } from "./random-utils";
import { parseFencedJson } from "./llm-response-utils";
import {
  formatCampaignContextBlock,
  avoidNamesExcludingContext,
} from "./campaign-context";
import { factionConfig } from "./public-faction-constants";

export const minorMagicItemConfig = {
  genres: factionConfig.themes,
  formsByTheme: {
    "Classic Fantasy": [
      "Charm / Talisman",
      "Potion / Draught / Phial",
      "Inscribed Scroll / Seal",
      "Enchanted Ammunition",
      "Coin / Token / Bauble",
      "Minor Curio / Trinket",
      "Disposable Wand / Feather",
      "Incense / Scented Wax",
      "Temporary Ward / Amulet",
      "Powder / Alchemical Dust",
    ],
    "Cyberpunk / Corporate": [
      "Single-Use Stim / Injector",
      "Burner Soft / Subroutine Chip",
      "Disposable Drone / Nanite Capsule",
      "Overclock Patch / Biomonitor Seal",
      "Scrambler Coin / Spoof Beacon",
      "Tactical Chem-Vial",
      "Monofilament Snare / Wire",
      "Temporary Biocloak Strip",
    ],
    "Vampire / Gothic Noir": [
      "Blood-Sealed Talisman",
      "Grave-Dirt Phial",
      "Haunted Trinket / Cameo",
      "Black Candle / Scented Wax",
      "Silvered Token",
      "Bone Rune / Ossuary Shard",
      "Whispering Lock / Locket",
      "Alchemical Tincture",
    ],
    "Sci-Fi / Space Opera": [
      "One-Shot Xenotech Capsule",
      "Disposable Holo-Emitter",
      "Thermal Gel Canister",
      "Pre-Collapse Nanite Dose",
      "Miniaturized Energy Cell",
      "Stasis-Wrapped Pellet",
      "Emergency Signal Dart",
      "Biogel Patch",
    ],
    "Modern Conspiracy": [
      "Redacted Pill / Compound",
      "Anomalous Coin / Token",
      "Memory-Scrambler Flash",
      "Classified Sensor Beacon",
      "Tamper-Evident Seal",
      "Miniature Bio-Filter",
      "Disavowed Prototype Chip",
      "Audio-Scrambling Trinket",
    ],
    "Post-Apocalyptic": [
      "Wasteland Tonic / Stasis Brew",
      "Jury-Rigged Battery Spark",
      "Salvaged Glow-Stick / Flare",
      "Chem-Coated Slag / Bullet",
      "Rattling Bone Charm",
      "Pre-War Injector",
      "Scrap-Metal Focus / Whistle",
      "Purifying Charcoal Filter",
    ],
    "Western / Frontier": [
      "Snake-Oil Remedy",
      "Notched Lucky Coin",
      "Spirit-Tied Feather / Knot",
      "Enchanted Cartridge / Bullet",
      "Glow-Ash / Dust Pouch",
      "Hanging Hex-Bag",
      "Dowsing Pendulum",
      "Silvered Salve",
    ],
    Steampunk: [
      "Clockwork Fuse / Capsule",
      "Aetheric Ampoule",
      "Pneumatic Dart / Capsule",
      "Flash-Powder Vial",
      "Tuned Resonator Disk",
      "Conductive Grease / Salve",
      "Steam-Charged Valve Charm",
      "Galvanic Sparker",
    ],
    "Cosmic Horror": [
      "Twisted Driftwood Fetish",
      "Opaline Powder Phial",
      "Unmarked Lead Coin",
      "Wax-Sealed Parchment Fragment",
      "Curious Glass Lens",
      "Drying Herb Bundle",
      "Salt-Crusted Shell",
      "Resonant Tuning Stone",
    ],
    Pirate: [
      "Sailor's Luck Charm",
      "Bottled Sea-Breeze",
      "Lodestone Shard",
      "Kraken-Ink Scrip",
      "Smuggler's Hollow Coin",
      "Brine-Soaked Match",
      "Bone Die / Astrolabe Token",
      "Rum-Infused Alchemical Draught",
    ],
    Lancer: [
      "Single-Burn Overclock Injector",
      "Expendable ECM Dart",
      "NHP Sub-Echo Crystal",
      "Ablative Gel Pack",
      "Micro-Beacon Flare",
      "Emergency Coolant Slug",
      "Scrap-Shield Node",
      "Sensor Foil Packet",
    ],
    "Space Opera Resistance": [
      "Contraband Data-Spike",
      "Disposable Comm-Jammer",
      "Stolen Imperial Stim",
      "Thermal Scrambler Patch",
      "Disguise Holo-Tag",
      "Subversive Audio-Talisman",
      "Rebel Cipher Token",
      "Concealed Siphon Spike",
    ],
    "Optimistic Exploration Sci-Fi": [
      "Standard Survey Probe",
      "Nutrient-Enriched Field Ration",
      "Disposable Atmosphere Purifier",
      "First-Contact Gesture Bead",
      "Bio-Luminescent Glow Capsule",
      "Mini-Sensor Node",
      "Field Medical Patch",
      "Micro-Analysis Strip",
    ],
  } as Record<string, string[]>,
  usageLimits: [
    "Single Use (Breaks / Consumed on Activation)",
    "Fragile Charges (1d4+1 uses, breaks on last)",
    "Until Next Sunrise / Sunset",
    "Persistent Minor Effect (Breaks on Mishap / High Stress)",
    "Dormant Until Triggered, Then Dissolves",
    "Exhausts After One Scene / Encounter",
  ],
  utilities: [
    "Sensory & Detection (Finding water, detecting lies, seeing warmth, hearing whispers)",
    "Infiltration & Stealth (Muffling sound, masking scent, creating distraction, dimming light)",
    "Exploration & Travel (Sure footing, temporary heat, purification, climbing grip)",
    "Social & Persuasion (Minor glamour, soothing aura, catching attention, voice resonance)",
    "Combat Utility & Escape (Smoke cloud, sudden flash, slick surface, minor kinetic shove)",
    "Crafting & Utility (Quick weld, instant stain removal, fire-starting, drying gear)",
    "Oddity & Whimsy (Bizarre sensory phenomenon, harmless curiosity, strange illusion)",
  ],
  activations: [
    "Snapping / Crushing in hand",
    "Drinking / Ingesting / Inhaling",
    "Speaking a whisper / command word",
    "Tossing / Impact on a hard surface",
    "Smearing / Applying to skin, weapon, or surface",
    "Lighting with flame / Burning",
    "Peeling a seal or unwinding a cord",
    "Holding aloft with focused intent",
  ],
  quirkSeverities: [
    "Harmless Sensory Tell (Ozone smell, faint chime, spark of light)",
    "Minor Cosmetic Effect (Skin tint, glowing eyes, echoing whisper)",
    "Subtle Functional Drawback (Slightly attracts minor insects, leaves faint luminous residue, temporary chill)",
    "Environmental Reaction (Faint thermal ripple, localized draft, subtle surface vibration)",
    "Emotional Resonance (Brief wave of nostalgia or sudden boldness)",
    "Mild Inconvenience (Leaves chalky residue, sticky fingers, slight static shock)",
    "None (Clean, quiet, functional)",
  ],
};

export interface MinorMagicItemGeneratorOptions {
  genre?: string;
  form?: string;
  usageLimit?: string;
  utility?: string;
  activation?: string;
  quirkSeverity?: string;
  campaignContext?: string;
  avoidNames?: string[];
}

export interface ResolvedMinorMagicItem {
  genre: string;
  form: string;
  usageLimit: string;
  utility: string;
  activation: string;
  quirkSeverity: string;
  campaignContext?: string;
  suggestedName: string;
}

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

const FALLBACK_THEME = "Classic Fantasy";

const namesByTheme: Record<string, { adjs: string[]; nouns: string[] }> = {
  "Classic Fantasy": {
    adjs: [
      "Cinder",
      "Glimmer",
      "Bramble",
      "Whisper",
      "Copper",
      "Marrow",
      "Dusk",
      "Drift",
      "Thorn",
      "Flicker",
      "Ash",
      "Dew",
    ],
    nouns: [
      "Charm",
      "Phial",
      "Token",
      "Pebble",
      "Cord",
      "Vane",
      "Lozenge",
      "Spindle",
      "Bead",
      "Seal",
      "Needle",
      "Knot",
    ],
  },
  "Cyberpunk / Corporate": {
    adjs: [
      "Ghost",
      "Overclock",
      "Pulse",
      "Null",
      "Static",
      "Trace",
      "Zero",
      "Proxy",
      "Glitch",
      "Cipher",
      "Siphon",
      "Burner",
    ],
    nouns: [
      "Patch",
      "Chip",
      "Stim",
      "Injector",
      "Node",
      "Spike",
      "Tag",
      "Relay",
      "Vial",
      "Filter",
      "Strip",
      "Jack",
    ],
  },
  "Sci-Fi / Space Opera": {
    adjs: [
      "Quantum",
      "Plasma",
      "Aero",
      "Sub-Harmonic",
      "Kinetic",
      "Stasis",
      "Beacon",
      "Thermal",
      "Vector",
      "Grav",
      "Ablative",
      "Flux",
    ],
    nouns: [
      "Cell",
      "Capsule",
      "Emitter",
      "Canister",
      "Slug",
      "Patch",
      "Dart",
      "Node",
      "Foil",
      "Filter",
      "Beacon",
      "Core",
    ],
  },
  "Modern Conspiracy": {
    adjs: [
      "Blackout",
      "Redacted",
      "Covert",
      "Surveillance",
      "Cipher",
      "Ghost",
      "Dead-Drop",
      "Trace",
      "Burner",
      "Anomalous",
      "Clean",
      "Signal",
    ],
    nouns: [
      "Seal",
      "Token",
      "Beacon",
      "Filter",
      "Chip",
      "Capsule",
      "Plug",
      "Pill",
      "Strobe",
      "Wire",
      "Tab",
      "Patch",
    ],
  },
  "Post-Apocalyptic": {
    adjs: [
      "Scrap",
      "Lead",
      "Rust",
      "Glow",
      "Char",
      "Rad",
      "Filter",
      "Ash",
      "Slag",
      "Bury",
      "Grit",
      "Spike",
    ],
    nouns: [
      "Sparker",
      "Fuse",
      "Canister",
      "Charm",
      "Patch",
      "Flask",
      "Slug",
      "Rattle",
      "Whistle",
      "Strip",
      "Filter",
      "Plug",
    ],
  },
  "Western / Frontier": {
    adjs: [
      "Copperhead",
      "Tallow",
      "Frontier",
      "Notched",
      "Prairie",
      "Dust",
      "Flint",
      "Lead",
      "Grit",
      "Silver",
      "Bramble",
      "Rattler",
    ],
    nouns: [
      "Token",
      "Cartridge",
      "Salve",
      "Liniment",
      "Slug",
      "Feather",
      "Coin",
      "Pouch",
      "Whistle",
      "Notch",
      "Remedy",
      "Needle",
    ],
  },
  Steampunk: {
    adjs: [
      "Galvanic",
      "Aetheric",
      "Clockwork",
      "Brass",
      "Pneumatic",
      "Steam",
      "Tuned",
      "Mercury",
      "Resonant",
      "Vapor",
      "Phosphor",
      "Solder",
    ],
    nouns: [
      "Ampoule",
      "Capsule",
      "Escapement",
      "Vial",
      "Regulator",
      "Fuse",
      "Disk",
      "Sparker",
      "Nozzle",
      "Valve",
      "Spring",
      "Needle",
    ],
  },
  "Cosmic Horror": {
    adjs: [
      "Opaline",
      "Salt-Crusted",
      "Driftwood",
      "Whispering",
      "Lead",
      "Hollow",
      "Marrow",
      "Dusk",
      "Cold-Iron",
      "Sunless",
      "Pale",
      "Fractured",
    ],
    nouns: [
      "Fetish",
      "Lens",
      "Token",
      "Shard",
      "Phial",
      "Stone",
      "Shell",
      "Fragment",
      "Resonator",
      "Spindle",
      "Needle",
      "Vane",
    ],
  },
  "Vampire / Gothic Noir": {
    adjs: [
      "Silvered",
      "Obsidian",
      "Blood-Bound",
      "Grave-Dirt",
      "Velvet",
      "Crematory",
      "Ash",
      "Marrow",
      "Pale",
      "Ossuary",
      "Tallow",
      "Shadow",
    ],
    nouns: [
      "Cameo",
      "Locket",
      "Tincture",
      "Phial",
      "Shard",
      "Token",
      "Candle",
      "Rune",
      "Needle",
      "Seal",
      "Vane",
      "Spindle",
    ],
  },
  Pirate: {
    adjs: [
      "Scurvy",
      "Brine",
      "Lodestone",
      "Kraken",
      "Trade-Wind",
      "Sea-Glass",
      "Coral",
      "Driftwood",
      "Grog",
      "Barnacle",
      "Copper",
      "Tidal",
    ],
    nouns: [
      "Charm",
      "Scrip",
      "Coin",
      "Match",
      "Die",
      "Token",
      "Draught",
      "Vane",
      "Shard",
      "Pebble",
      "Needle",
      "Knot",
    ],
  },
  Lancer: {
    adjs: [
      "Overclock",
      "Ablative",
      "Sub-Echo",
      "ECM",
      "Thermal",
      "Reactor",
      "Sensor",
      "Kinetic",
      "Hardpoint",
      "Feedback",
      "Flash",
      "Scrap",
    ],
    nouns: [
      "Slug",
      "Dart",
      "Pack",
      "Flare",
      "Node",
      "Foil",
      "Pin",
      "Injector",
      "Cell",
      "Capsule",
      "Patch",
      "Relay",
    ],
  },
  "Space Opera Resistance": {
    adjs: [
      "Contraband",
      "Data-Spike",
      "Cipher",
      "Siphon",
      "Stealth",
      "Rebel",
      "Scrambler",
      "Underground",
      "Burner",
      "Disavowed",
      "Ghost",
      "Surplus",
    ],
    nouns: [
      "Tag",
      "Jammer",
      "Stim",
      "Patch",
      "Spike",
      "Token",
      "Cell",
      "Node",
      "Filter",
      "Strip",
      "Dart",
      "Foil",
    ],
  },
  "Optimistic Exploration Sci-Fi": {
    adjs: [
      "Survey",
      "Analysis",
      "Atmospheric",
      "Bio-Glow",
      "Field",
      "First-Contact",
      "Telemetry",
      "Eco",
      "Stabilizer",
      "Sensor",
      "Purifier",
      "Resonance",
    ],
    nouns: [
      "Probe",
      "Bead",
      "Patch",
      "Strip",
      "Capsule",
      "Node",
      "Core",
      "Cell",
      "Sampler",
      "Beacon",
      "Pill",
      "Tag",
    ],
  },
};

export function resolveMinorMagicItem(
  options: MinorMagicItemGeneratorOptions = {},
  rng: Rng = defaultRng,
): ResolvedMinorMagicItem {
  const genre =
    options.genre &&
    minorMagicItemConfig.formsByTheme[options.genre] !== undefined
      ? options.genre
      : FALLBACK_THEME;

  const formPool =
    minorMagicItemConfig.formsByTheme[genre] ??
    minorMagicItemConfig.formsByTheme[FALLBACK_THEME];

  const form =
    options.form && formPool.includes(options.form)
      ? options.form
      : pickFrom(formPool, rng);

  const usageLimit =
    options.usageLimit &&
    minorMagicItemConfig.usageLimits.includes(options.usageLimit)
      ? options.usageLimit
      : pickFrom(minorMagicItemConfig.usageLimits, rng);

  const utility =
    options.utility && minorMagicItemConfig.utilities.includes(options.utility)
      ? options.utility
      : pickFrom(minorMagicItemConfig.utilities, rng);

  const activation =
    options.activation &&
    minorMagicItemConfig.activations.includes(options.activation)
      ? options.activation
      : pickFrom(minorMagicItemConfig.activations, rng);

  const quirkSeverity =
    options.quirkSeverity &&
    minorMagicItemConfig.quirkSeverities.includes(options.quirkSeverity)
      ? options.quirkSeverity
      : pickFrom(minorMagicItemConfig.quirkSeverities, rng);

  const themeNames = namesByTheme[genre] ?? namesByTheme[FALLBACK_THEME];
  const nameAdjectives = themeNames.adjs;
  const nameNouns = themeNames.nouns;

  let suggestedName = `${pickFrom(nameAdjectives, rng)} ${pickFrom(nameNouns, rng)}`;
  if (options.avoidNames && options.avoidNames.length > 0) {
    const avoidedSet = new Set(
      options.avoidNames.map((n) => n.trim().toLowerCase()),
    );
    for (let attempts = 0; attempts < 10; attempts++) {
      if (!avoidedSet.has(suggestedName.toLowerCase())) break;
      suggestedName = `${pickFrom(nameAdjectives, rng)} ${pickFrom(nameNouns, rng)}`;
    }
  }

  return {
    genre,
    form,
    usageLimit,
    utility,
    activation,
    quirkSeverity,
    campaignContext: options.campaignContext,
    suggestedName,
  };
}

export interface MinorMagicItemPrompt {
  systemInstruction: string;
  userMessage: string;
  resolved: ResolvedMinorMagicItem;
}

export function buildMinorMagicItemPrompt(
  options: MinorMagicItemGeneratorOptions = {},
  sessionContext = "",
  rng: Rng = defaultRng,
): MinorMagicItemPrompt {
  const resolved = resolveMinorMagicItem(options, rng);
  const causality = getGenreCausality(resolved.genre);

  const causalityNotes: Record<GenreCausality, string> = {
    technological:
      "Technological / Hard-Sci-Fi Causality: All mechanisms, activations, effects, and limitations MUST be grounded in plausible electronics, software subroutines, pharmacology, nanotech, chemical reactions, optics, or micro-mechanics. NEVER introduce supernatural spells, enchantments, or mystical forces unless explicitly requested in campaign context.",
    "western-frontier":
      "Western / Frontier Causality: Prefer frontier-era materials (lead, stamped brass, tallow, black powder, beeswax, flint, prairie herbs, pine pitch), folk magic/superstition, mechanical tricks, surveyor/gunsmith/railroad tools, gambler's sleights, and patent-medicine oddities. Avoid defaulting to sci-fi/steampunk mechanisms (such as optical projections, advanced micro-tech, synthetic vapours, clockwork computers, or abstract energy fields) unless the selected setting explicitly supports Weird West technology. Adapt causal logic to the chosen frontier setting.",
    "steampunk-industrial":
      "Steampunk / Clockwork Causality: Ground mechanisms in clockwork gears, escapement springs, pressurized steam/gas valves, galvanic sparkers, or aetheric distillations.",
    "post-apocalyptic":
      "Post-Apocalyptic / Wasteland Causality: Ground mechanisms in salvaged pre-collapse hardware, jury-rigged batteries, scrap chemistry, or survivalist improvisations.",
    occult:
      "Occult / Gothic / Cosmic Causality: Ground effects in dark alchemy, blood-binding, sympathetic relics, or sanity-straining eldritch resonance.",
    magical:
      "Magical / Folkloric Causality: Ground effects in traditional charms, runes, elemental distillations, herbal draughts, or minor enchantments.",
  };

  const mechanicsHeading =
    causality === "technological"
      ? "Technical Effect & Mechanism"
      : causality === "steampunk-industrial" || causality === "post-apocalyptic"
        ? "Mechanical Effect & Operation"
        : causality === "western-frontier"
          ? "Frontier Effect & Mechanics"
          : "Magical Effect & Mechanics";

  const extraAvoidedNames = avoidNamesExcludingContext(
    options.avoidNames ?? [],
    resolved.campaignContext,
  )
    .map((name) => name.trim())
    .filter(Boolean);

  const avoidBlock =
    extraAvoidedNames.length > 0
      ? `\nAlready created or used this session — do NOT reuse these item names or generate an item with the same concept/function:\n${extraAvoidedNames.map((n) => `- ${n}`).join("\n")}\n`
      : "";

  const userMessage = `Generate a creative, minor, single-use or limited-use magic item (or technological curiosity/tool) in JSON format.

Constraints & Tone:
- Genre/Theme: ${resolved.genre} (${causalityNotes[causality]})
- Item Form: ${resolved.form}
- Usage Limit / Charges: ${resolved.usageLimit}
- Focus / Utility: ${resolved.utility}
- Activation Method: ${resolved.activation}
- Quirk / Side Effect: ${resolved.quirkSeverity}
${formatCampaignContextBlock(resolved.campaignContext)}

Key Design Principles:
1. Genre-Appropriate Causal Logic: When a genre is selected (${resolved.genre}), adapt not only terminology and aesthetics but also the underlying causal logic. Effects, activations, limitations, failure modes, provenance, and item forms must make plausible sense within this genre. For Western themes, avoid defaulting to sci-fi/steampunk mechanisms (such as optical projection, advanced micro-tech, synthetic vapours, or abstract fields) unless the selected setting explicitly supports Weird West technology; prefer frontier-era materials, folk magic, superstition, mechanical tricks, surveyor/gunsmith/railroad tools, and patent-medicine oddities.
2. Enforce Required Output Sections: Every single generated item MUST include both the "### Quick Reference" and the full "### ${mechanicsHeading}" section. Flavour sections (Description, Suggested Use in Play, Provenance) must NEVER replace, condense, or omit the core mechanical sections.
3. Single Core Function: Keep each minor item centred on ONE core function. Avoid adding secondary effects such as memory alteration or information-gathering (e.g. mood detection, aura sensing, or heartbeat tracking) unless they are strictly integral to that primary function.
4. Prioritise Practical, Gameable Utility: Even for strange, odd, or whimsical items, the core effect must have clear, immediate practical or gameable utility (e.g. distraction, navigation, infiltration, environmental protection, or creative problem-solving). A player holding this item should immediately understand its concrete use and feel tempted to deploy it. Avoid cosmetic novelties that have no table application.
5. Physical Form Matters: Make the physical form matter directly to how the item is handled, activated, and used in play.
6. Restrained Drawbacks & Tells: Keep quirks and drawbacks strictly restrained to one or two subtle, relevant tells (e.g. slight temperature shift, brief static tingle, faint mineral scent, minor physical residue). Avoid setting-specific assumptions such as common animals, open hearths, or candle flames unless they strictly fit the chosen genre and context.
7. Independent Identity: Avoid automatically connecting newly generated items to lore, factions, or history from previous generations. Each item should stand on its own unless the provided campaign context explicitly requests a connection.
8. Accurate Quick Reference: In the Quick Reference section, **Primary Utility** must name ONLY the single specific function or effect actually present in this item (e.g. 'Water Source Detection' or 'Footstep Silencing'). Do NOT repeat the full parenthetical list of examples from the prompt.
9. Grounded Provenance Variety: Avoid recurring fantasy-generator clichés (no "ancient forgotten empires", "mad wizards who vanished", "burned-down apothecaries", or "mysterious cloaked strangers"). Provide a grounded, varied origin rooted in practical trade, municipal labor, navigation, craft guilds, salvage, or local folk customs.
10. Low Impact & Creative Utility: This is NOT an epic artifact, a +2 sword, or a high-tier armor set. It is a disposable tool, a clever charm, an emergency consumable, an alchemical preparation, or an evocative curiosity.
11. System-Agnostic: Avoid rigid numeric stat blocks or ruleset-specific keywords (no spell slots, D&D 5e DC formulas, or gold piece lists). Focus on concrete physical/narrative effects that any GM can interpret immediately.
12. Clear Limits: Ensure the item has a clear single-use, charge-based, or temporal expiration as requested.
13. Memorable Flavour: Include tactile details, sensory tells, and a small quirk or provenance note.

Before returning, run a consistency pass:
- Both "### Quick Reference" and the core mechanics section ("### ${mechanicsHeading}") are present in full with clear, concrete mechanics and have not been replaced or omitted by flavour text.
- The underlying causal logic strictly matches "${resolved.genre}" (${causalityNotes[causality]}).
- The item's core utility is immediately understandable, practical, and tempting to a player to use at the table (even for whimsical/strange items).
- The item is centred on one core function without extraneous secondary effects (such as memory alteration, mood sensing, or aura detection).
- In Quick Reference, **Primary Utility** describes ONLY the specific effect actually present in this item without extraneous parenthetical lists.
- The item form matches "${resolved.form}" and physically matters to its operation.
- The activation method matches "${resolved.activation}".
- The usage limit matches "${resolved.usageLimit}".
- The primary utility directly aligns with "${resolved.utility}".
- Quirks and drawbacks are restrained to 1-2 subtle, relevant tells without setting-specific assumptions like open flames or stray animals unless appropriate to the genre.
- The Provenance & Rumour section avoids generic generator tropes and gives a specific, grounded origin.
- The item stands on its own without forced links to prior generation lore.
- The item is evocative, tactile, and immediately playable.

You must return a valid JSON object matching this schema:
{
  "title": "Evocative Item Name",
  "content": "Markdown describing physical appearance, materials, tactile texture, markings, and sensory details when handled or inspected.",
  "lore": "Markdown formatted GM reference with the following exact headings:\\n\\n### Quick Reference\\n- **Item Form**: ${resolved.form}\\n- **Usage Limit**: ${resolved.usageLimit}\\n- **Activation**: ${resolved.activation}\\n- **Primary Utility**: Concise name of the specific effect actually present in this item (e.g. 'Water Direction Finding' — do NOT copy the full parenthetical list of examples)\\n\\n### ${mechanicsHeading}\\nDetailed description of what happens upon activation, sensory effects, concrete narrative result, and duration.\\n\\n### Quirk or Drawback\\nThe minor quirk, odd sensory tell, aesthetic side effect, or subtle inconvenience.\\n\\n### Suggested Use in Play\\nTactical, investigative, social, or creative scenarios where this item shines.\\n\\n### Provenance & Rumour\\nA 1-2 sentence hook about who made it, how it found its way into circulation, or a local rumour.",
  "labels": ["minor-magic-item", "imported-draft"]
}
${avoidBlock}
${NAME_BAN_PROMPT}
${sessionContext}
Return only the JSON object. Do not include markdown code block formatting like \`\`\`json.`;

  return {
    systemInstruction:
      "You are an expert tabletop RPG designer specialising in evocative, system-agnostic minor items, curiosities, technological tools, and consumable charms.",
    userMessage,
    resolved,
  };
}

export function parseMinorMagicItemResponse(
  text: string,
  resolved: ResolvedMinorMagicItem,
): PublicGeneratorOutput {
  const data = parseFencedJson(text);
  const causality = getGenreCausality(resolved.genre);
  const mechanicsHeading =
    causality === "technological"
      ? "Technical Effect & Mechanism"
      : causality === "steampunk-industrial" || causality === "post-apocalyptic"
        ? "Mechanical Effect & Operation"
        : causality === "western-frontier"
          ? "Frontier Effect & Mechanics"
          : "Magical Effect & Mechanics";

  let lore = (data.lore || "").trim();

  // Enforce required Quick Reference section
  if (!lore.includes("### Quick Reference")) {
    const conciseUtility = resolved.utility.replace(/\s*\([^)]*\)/, "").trim();
    lore =
      `### Quick Reference\n- **Item Form**: ${resolved.form}\n- **Usage Limit**: ${resolved.usageLimit}\n- **Activation**: ${resolved.activation}\n- **Primary Utility**: ${conciseUtility}\n- **Setting / Theme**: ${resolved.genre}\n\n${lore}`.trim();
  }

  // Enforce required Effect & Mechanics section
  const hasMechanicsHeading =
    lore.includes("### Magical Effect & Mechanics") ||
    lore.includes("### Technical Effect & Mechanism") ||
    lore.includes("### Mechanical Effect & Operation") ||
    lore.includes("### Frontier Effect & Mechanics") ||
    lore.includes("### Effect & Mechanics") ||
    lore.includes("### Core Effect & Mechanics");

  if (!hasMechanicsHeading) {
    const fallbackEffect =
      data.summary || data.content || "Activates with the designated effect.";
    lore = `${lore}\n\n### ${mechanicsHeading}\n${fallbackEffect}`.trim();
  }

  return {
    type: "item",
    title: data.title || resolved.suggestedName,
    summary: data.summary || "",
    content: data.content || "",
    lore,
    labels: Array.isArray(data.labels)
      ? data.labels
      : ["minor-magic-item", "imported-draft"],
    status: "active",
  };
}

export function generateMinorMagicItemLocal(
  options: MinorMagicItemGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const resolved = resolveMinorMagicItem(options, rng);
  const {
    genre,
    form,
    usageLimit,
    utility,
    activation,
    quirkSeverity,
    suggestedName,
  } = resolved;

  const causality = getGenreCausality(genre);
  const mechanicsHeading =
    causality === "technological"
      ? "Technical Effect & Mechanism"
      : causality === "steampunk-industrial" || causality === "post-apocalyptic"
        ? "Mechanical Effect & Operation"
        : causality === "western-frontier"
          ? "Frontier Effect & Mechanics"
          : "Magical Effect & Mechanics";

  const appearanceDetails =
    causality === "technological"
      ? [
          `The ${suggestedName} takes the form of a compact ${form.toLowerCase()}. The casing is matte composite with exposed grounding pins and a recessed status diode. When held, it feels dense and subtly warm near its internal power cell.`,
          `Fabricated as a streamlined ${form.toLowerCase()}, the ${suggestedName} is sealed in anti-static polymer with micro-etched serial designations along its connector strip.`,
          `An unadorned ${form.toLowerCase()} designed for field deployment, the ${suggestedName} easily fits into a flight suit pocket or tactical webbing with zero exterior branding.`,
        ]
      : causality === "western-frontier"
        ? [
            `The ${suggestedName} takes the form of a rugged ${form.toLowerCase()}. Fashioned from stamped sheet brass, weathered saddle leather, and whittled pine, it carries the distinct patina of a frontier trail kit and the faint scent of linseed oil and prairie sage.`,
            `Housed in a small tin canister with an amber beeswax seal, the ${suggestedName} bears the paper label of a frontier apothecary and a handwritten batch number.`,
            `An unassuming ${form.toLowerCase()} carried by railway surveyors and prospectors, crafted from notched copper and bound with waxed rawhide cord.`,
          ]
        : causality === "steampunk-industrial" ||
            causality === "post-apocalyptic"
          ? [
              `The ${suggestedName} takes the form of a rugged ${form.toLowerCase()}. Constructed from machined brass and oiled steel, its seams are sealed with vulcanized rubber and stamped with a workshop proof-mark.`,
              `Crafted as a sturdy ${form.toLowerCase()}, the ${suggestedName} combines utilitarian metalwork with a protective cord wrap, built to endure vibration and weather.`,
              `An unassuming ${form.toLowerCase()} showing clean artisan lathe-work, with a subtle balance in the hand that indicates precise internal weighting.`,
            ]
          : [
              `The ${suggestedName} takes the form of a modest ${form.toLowerCase()}. The craftsmanship is deliberate but unpretentious, showing the hand of an artisan who valued utility over ceremonial polish. When held in the palm, it carries a faint temperature gradient—distinctly cooler on one edge and subtly warm along the spine.`,
              `Crafted as a small ${form.toLowerCase()}, the ${suggestedName} is fashioned from local materials bound with fine cord and sealed with a thin layer of protective varnish. Subtle geometric etchings line its rim, catching the light only when tilted at an angle.`,
              `The ${suggestedName} is an unassuming ${form.toLowerCase()} that easily fits into a pouch or waistcoat pocket. Its surface bears minor handling marks and a faint, pleasant scent of dried herbs and ozone.`,
              `A pocket-sized ${form.toLowerCase()}, the ${suggestedName} is marked with a simple maker's notch near its base. It feels surprisingly lightweight for its composition, with a faint tactile hum that subsides when gripped firmly.`,
            ];

  const effectsByUtility: Record<string, string[]> =
    causality === "technological"
      ? {
          "Sensory & Detection": [
            `Upon ${activation.toLowerCase()}, the device's micro-sensor array scans for environmental signatures for ten minutes. It emits directional haptic pulses guiding the user toward the nearest source of clean air or potable water within one hundred meters.`,
            `When ${activation.toLowerCase()}, the directional audio-pickup filters ambient noise for five minutes, isolating subtle footsteps and quiet voices within ten meters through clear directional audio feedback.`,
            `Activating the unit sweeps the immediate area for residual thermal traces, displaying living contact signatures from the past hour via a brief phosphor overlay for three minutes.`,
          ],
          "Infiltration & Stealth": [
            `Upon ${activation.toLowerCase()}, the module discharges a localized acoustic dampening field for three minutes, suppressing footstep vibrations and gear clicks within a two-meter radius.`,
            `When ${activation.toLowerCase()}, the canister vents an ionized particulate cloud that scatters optical and infrared tracking across a five-meter sphere for ninety seconds.`,
            `Activating the strip disrupts thermal and chemical tracking signatures, masking the user's biological trail with a neutral ambient profile for thirty minutes.`,
          ],
          "Exploration & Travel": [
            `Upon ${activation.toLowerCase()}, micro-adhesive polymer pads deploy across the user's boot soles and palms for ten minutes, providing reliable grip on sheer metal or wet surfaces.`,
            `When ${activation.toLowerCase()}, the thermal regulation cell generates continuous, thermostatically controlled warmth for six hours, protecting the carrier from severe hypothermia.`,
            `Activating the cartridge purifies up to twenty liters of stagnant or contaminated water through rapid catalytic filtration in seconds.`,
          ],
          "Social & Persuasion": [
            `Upon ${activation.toLowerCase()}, the unit projects a low-frequency biometric harmonic for five minutes that subtly lowers heart rates and de-escalates hostility during tense face-to-face negotiations.`,
            `When ${activation.toLowerCase()}, the speech modulation filter adds vocal resonance and subtle frequency stabilization to the user's voice for one conversation, eliminating stress micro-tremors.`,
            `Activating the device emits a localized frequency chirp that triggers harmless audio feedback in nearby comms and sensor relays, creating a five-second distraction.`,
          ],
          "Combat Utility & Escape": [
            `Upon ${activation.toLowerCase()}, the canister discharges a dense aerosol screen filling a six-meter radius in two seconds, completely blocking visual and laser targeting for one minute.`,
            `When ${activation.toLowerCase()}, the optical emitter releases a blinding flash of strobe luminescence that dazzles and disorients anyone facing it within twenty paces.`,
            `Activating the unit sprays a low-viscosity fluoropolymer sheen across a three-meter zone for two minutes, causing pursuing personnel to lose footing immediately.`,
          ],
          "Crafting & Utility": [
            `Upon ${activation.toLowerCase()}, the micro-torch generates a pinpoint plasma arc for sixty seconds, sufficient to weld broken metal fittings or sever structural cables.`,
            `When ${activation.toLowerCase()}, the solvent charge dissolves adhesive bonds, grease, and corrosive residue across one square meter within seconds without harming base metal.`,
            `Activating the repair kit injects structural epoxy into a fractured composite tool, curing under ambient pressure into a rigid bond within thirty seconds.`,
          ],
          "Oddity & Whimsy": [
            `Upon ${activation.toLowerCase()}, the unit broadcasts a synthetic telemetry decoy thirty meters away, creating a false ping that draws automated sensors and patrol drones away for ten seconds.`,
            `When ${activation.toLowerCase()}, the catalytic filter neutralizes bitter and unpalatable taste profiles in field rations or chemical tonics for one hour.`,
            `Activating the unit projects an undulating refractive field that bends light within ten paces for three minutes, creating visual interference that covers a rapid withdrawal.`,
          ],
        }
      : causality === "western-frontier"
        ? {
            "Sensory & Detection": [
              `Upon ${activation.toLowerCase()}, the balanced dowsing pendulum or tallow-treated needle pulls with a steady magnetic tug toward the nearest sweet spring, water seep, or shallow well within one hundred paces for ten minutes.`,
              `When ${activation.toLowerCase()}, the user's hearing tunes acutely to low ground vibrations traveling through trail dirt and railway iron for five minutes, picking up approaching riders or footsteps half a mile off.`,
              `Activating the charcoal powder or coin reveals recent disturbances in trail dust, illuminating fresh horse tracks or boot prints from the past hour with a dim luminescence for three minutes.`,
            ],
            "Infiltration & Stealth": [
              `Upon ${activation.toLowerCase()}, rubbing the tallow salve or shaking the pouch muffles the squeak of saddle leather, boot spurs, and holster friction for three minutes, allowing silent passage across dry brush or loose floorboards.`,
              `When ${activation.toLowerCase()}, the dried cedar-and-sulfur pouch releases a dense, low-hanging cloud of alkali smoke that blinds lanterns and obscures sight across a twenty-foot yard for one minute.`,
              `Activating the salve masks the scent of saddle sweat and trail grime with the neutral aroma of dry alkali dust and mountain juniper for thirty minutes, preventing tracking dogs from catching the scent.`,
            ],
            "Exploration & Travel": [
              `Upon ${activation.toLowerCase()}, pine-pitch wax applied to boot soles and stirrups provides unyielding friction across slick river rock, wet timber bridges, or scree slopes for ten minutes without slipping.`,
              `When ${activation.toLowerCase()}, the liniment produces a penetrating, sustained muscle warmth that prevents frostbite and numb extremities in freezing mountain passes for six hours.`,
              `Activating the mineral tablet or charcoal filter cleanses two gallons of alkali-fouled or muddy creek water into crisp, potable water in seconds.`,
            ],
            "Social & Persuasion": [
              `Upon ${activation.toLowerCase()}, the patent-tonic tincture or silver pocket token settles racing pulses and eases hand tremors, providing an unreadable poker face and steady eye during tense showdowns or saloon disputes.`,
              `When ${activation.toLowerCase()}, the patent-medicine lozenge clears trail gravel from the throat, giving the speaker's voice an authoritative, resonant timbre that commands quiet in a rowdy bunkhouse for one conversation.`,
              `Activating the trick coin or pocket whistle creates a sharp, ringing diversion—like a dropped silver dollar or distant train whistle—drawing eyes away for five crucial seconds.`,
            ],
            "Combat Utility & Escape": [
              `Upon ${activation.toLowerCase()}, the modified blasting cartridge or flash-paper bursts in a dazzling sulfur flare and thunderous crack, blinding anyone in the saloon or alley for ten paces and buying seconds to duck behind cover.`,
              `When ${activation.toLowerCase()}, the powder flask expels a stinging cloud of fine prairie-pepper dust that causes pursuing riders or brawlers to cough and drop back for ninety seconds.`,
              `Activating the grease pellet coats a doorway or boardwalk in slick axle tallow, causing charging opponents to lose balance immediately.`,
            ],
            "Crafting & Utility": [
              `Upon ${activation.toLowerCase()}, the miniature friction fuse burns with intense white-hot heat for thirty seconds, fusing severed bridle rings or heating iron rivets red-hot in the field.`,
              `When ${activation.toLowerCase()}, the solvent salve dissolves rust, gummed black powder fouling, and axle grease from locks or revolver cylinders in thirty seconds.`,
              `Activating the hide-glue compound mends cracked rifle stocks or torn harness traces under hand pressure in two minutes.`,
            ],
            "Oddity & Whimsy": [
              `Upon ${activation.toLowerCase()}, the trick cartridge or whistle throws an eerie, echoing coyote howl or distant train horn thirty paces down the gulch, diverting night watchmen for ten seconds.`,
              `When ${activation.toLowerCase()}, a pinch of the patent powder completely masks the foul bite of bad rotgut whiskey or tainted trail rations for one hour.`,
              `Activating the folk charm causes dust devils and trail smoke to swirl in confusing eddies around the user for two minutes, obscuring their tracks.`,
            ],
          }
        : {
            "Sensory & Detection": [
              `Upon ${activation.toLowerCase()}, the item pulses with a soft resonance for ten minutes. During this time, the user senses the precise direction of the nearest source of clean running water or breathable air within one hundred paces, perceived as a gentle tug in the back of the throat.`,
              `When ${activation.toLowerCase()}, the user gains the ability to hear faint whispers carried on drafts of air for up to five minutes. Ordinary ambient noise dims slightly, bringing hidden murmurs or footsteps within thirty feet into clear focus.`,
              `Activating the item reveals recent temperature changes in the immediate area. Footprints or handholds warm from living contact within the past hour illuminate with a dim, violet luminescence for three minutes.`,
            ],
            "Infiltration & Stealth": [
              `Upon ${activation.toLowerCase()}, all footfalls and gear clatter produced by the user are completely silenced for three minutes. Dropped metal or heavy boots strike the floor with no louder sound than falling down feathers.`,
              `When ${activation.toLowerCase()}, the item emits a cloud of translucent, clinging mist that dampens ambient light and diffuses shadows in a fifteen-foot sphere for five minutes, making silent passage effortless.`,
              `Activating the item masks the user's natural scent and thermal footprint, replacing it with the neutral aroma of damp stone and cool earth for thirty minutes. Tracking beasts and automated sensors overlook the user unless visually confronted.`,
            ],
            "Exploration & Travel": [
              `Upon ${activation.toLowerCase()}, the soles of the user's boots or palms adhere firmly to slippery, sheer, or icy surfaces for ten minutes, allowing safe traversal across frozen ledges or wet slate roofs without slipping.`,
              `When ${activation.toLowerCase()}, the item produces steady, soothing warmth equivalent to a small hearth fire for six hours, protecting the carrier from hypothermia in freezing winds without producing smoke or flame.`,
              `Activating the item instantly purifies up to five gallons of fouled, brackish, or mildly poisoned liquid, converting it into sweet, potable water with a faint mineral finish.`,
            ],
            "Social & Persuasion": [
              `Upon ${activation.toLowerCase()}, the user is enveloped in a subtle aura of reassuring calm for ten minutes. Bystanders find the user approachable and trustworthy, lowering initial hostility in tense negotiations.`,
              `When ${activation.toLowerCase()}, the user's voice takes on a resonant, melodic timbre for one conversation. Deceptions spoken during this period carry no telltale hesitation, and the listener is left with a warm impression of the speaker.`,
              `Activating the item creates a brief, harmless sensory distraction—such as the distant scent of baking bread or the phantom chiming of a carriage bell—drawing curious eyes away for five crucial seconds.`,
            ],
            "Combat Utility & Escape": [
              `Upon ${activation.toLowerCase()}, the item bursts into a dense, non-toxic smoke screen that expands to fill a twenty-foot radius within two seconds, extinguishing small open flames and obscuring line of sight for one minute.`,
              `When ${activation.toLowerCase()}, the item releases a sharp, dazzling flash of silver light that disorients and momentarily blinds anyone looking directly at it within twenty paces, buying precious seconds for retreat.`,
              `Activating the item coats the ground in a ten-foot circle with an impossibly slick, frictionless sheen that lasts for two minutes. Any creature attempting to sprint or turn abruptly across it loses balance immediately.`,
            ],
            "Crafting & Utility": [
              `Upon ${activation.toLowerCase()}, the item generates an intense, pinpoint heat for ninety seconds, sufficient to soften metal rivets, ignite damp tinder, or cleanly weld a broken iron link without an anvil.`,
              `When ${activation.toLowerCase()}, the item instantly lifts stains, grime, blood, and corrosive residue from up to ten square feet of cloth, leather, or steel, leaving the material clean, dry, and supple.`,
              `Activating the item mends a single non-magical object weighing up to five pounds that has suffered a clean break or tear, fusing the fracture seamlessly as though whole.`,
            ],
            "Oddity & Whimsy": [
              `Upon ${activation.toLowerCase()}, the item projects a vibrant, auditory-and-visual decoy spark that darts up to thirty paces away, emitting a sharp chattering sound that draws guard attention away for ten seconds before dissolving.`,
              `When ${activation.toLowerCase()}, whatever drink or food the user touches over the next hour has all bitter, spoiled, or tainted flavours masked with a neutral, crisp finish, allowing fouled rations or bitter medicines to be consumed without reaction.`,
              `Activating the item causes all shadows within thirty feet to stretch and sway erratically in reverse for three minutes, disorienting observers and providing visual confusion that covers an escape.`,
            ],
          };

  const selectedUtilityKey =
    Object.keys(effectsByUtility).find((k) => utility.startsWith(k)) ??
    "Sensory & Detection";
  const utilityEffectList =
    effectsByUtility[selectedUtilityKey] ??
    effectsByUtility["Sensory & Detection"];
  const effect = pickFrom(utilityEffectList, rng);

  const quirks =
    causality === "technological"
      ? [
          `Leaves a faint smell of warm ozone and a pulsing amber indicator LED as internal capacitors drain.`,
          `The user's fingers experience mild static tingling for five minutes after cycling the circuit.`,
          `Emits a low, descending electronic tone when its stored charge is fully depleted.`,
          `Nearby optical displays display a brief horizontal scanline artifact at the instant of activation.`,
          `The casing vents a small wisp of inert heat-dissipation vapor upon exhausting its chemical matrix.`,
        ]
      : causality === "western-frontier"
        ? [
            `Leaves a faint smell of woodsmoke, sulfur, and dried sage in the air for a few moments after use.`,
            `Leaves a thin dusting of fine white alkali chalk on the user's palms.`,
            `The user's fingers feel a brief, pleasant warmth, like handling a freshly fired brass shell casing.`,
            `A faint ringing chime, like a silver coin dropping onto hardwood, echoes as the item finishes its work.`,
          ]
        : [
            `When used, the air within five feet smells briefly of crushed pine needles and fresh ozone.`,
            `The bearer's fingertips tingle with a mild static sensation for twenty minutes after activation.`,
            `A brief, localized draft or subtle temperature drop occurs within arm's reach during activation.`,
            `A fine, non-staining veil of grey chalk clings to the user's fingers for several minutes after handling.`,
            `A faint, musical chime resonates from the empty shell or remnant of the item as it expends its charge.`,
            `The user's eyes catch reflections with a momentary amber glimmer in dim light.`,
          ];
  const quirk = quirkSeverity.startsWith("None")
    ? "The item functions cleanly with no discernible side effect or telltale residue."
    : pickFrom(quirks, rng);

  const tacticalUses =
    causality === "technological"
      ? [
          `Ideal for bypassing electronic security checkpoints or securing an exit through monitored corridors.`,
          `Superb when dealing with tense negotiations where a localized biometric or audio edge shifts leverage.`,
          `Invaluable during off-grid operations where environmental hazards or equipment breakdowns threaten mission success.`,
          `Useful as a tactical breach-and-clear asset, forcing hostiles to react to sudden sensory degradation.`,
        ]
      : causality === "western-frontier"
        ? [
            `Ideal for getting the upper hand in a dusty saloon standoff or slipping past border sentries.`,
            `Superb when bluffing high-stakes games or buying crucial seconds during a train or stagecoach hold-up.`,
            `Invaluable during dry desert treks or high mountain crossings where foul water or harsh exposure threatens survival.`,
            `Useful as an emergency edge during a midnight trail ambush, forcing attackers to hesitate.`,
          ]
        : [
            `Ideal for bypassing guard checkpoints or creating an escape route through crowded alleys.`,
            `Superb when dealing with tense social negotiations where a small edge in composure or distraction turns the tide.`,
            `Invaluable during wilderness survival situations where sudden weather or spoiled provisions threaten the expedition.`,
            `Useful as an unconventional opening move in an ambush, forcing opponents to react to unexpected conditions.`,
          ];
  const tactical = pickFrom(tacticalUses, rng);

  const origins =
    causality === "technological"
      ? [
          `Manufactured in limited runs by an independent contractor for corporate security teams requiring untraceable emergency gear.`,
          `Found in an uncataloged shipping locker at a transit terminal, packaged with industrial desiccant.`,
          `Fabricated in a back-alley hardware bay using repurposed industrial drone components and military-grade firmware.`,
          `Standard-issue emergency provision formerly supplied to hazardous-environment maintenance technicians.`,
          `Scavenged from a decommissioned research orbital before its orbit decayed into the upper atmosphere.`,
          `Smuggled off a production line by orbital dockworkers who trade them as high-value currency in black markets.`,
          `Produced as an evaluation prototype by an engineering startup that lost its funding before full deployment.`,
        ]
      : causality === "western-frontier"
        ? [
            `Brewed in small batches by a traveling snake-oil merchant and sold out of the back of an itinerant prairie wagon.`,
            `Hand-turned by a frontier gunsmith for stagecoach guards crossing hazardous badlands.`,
            `A folk charm woven from rawhide and river gravel by a frontier homesteader during a seasonal drought.`,
            `Recovered from an abandoned prospector's cabin deep in the canyon country, wrapped in waxed canvas.`,
            `Carried by pony express riders as an emergency contingency for forced night rides across uncharted territories.`,
            `Crafted by a railway line mechanic to keep survey transits calibrated in fluctuating desert heat.`,
            `Confiscated from a cardsharp's boot heel by a county sheriff after a disputed faro game in a border town.`,
          ]
        : [
            `Manufactured in small batches for riverboat navigators and canal locksmen, who carry them in waxed pouches to handle seasonal squalls.`,
            `Found packed in dry grain husks inside an unmarked shipping crate impounded at a municipal tollgate.`,
            `Crafted by a guild surveyor as an emergency field measure during an unmapped tunnel expansion project.`,
            `Standard-issue emergency provision once distributed to night watchmen and lantern-tenders along the outer wall.`,
            `Pressed and cured by a rural herbalist cooperative as a practical seasonal trade good for traveling shearers.`,
            `Salvaged from the tool locker of an abandoned drydock crane, still wrapped in oiled canvas.`,
            `Traded by itinerant tinkerers who forge them from melted-down brass fittings and residual alchemical dross.`,
            `Carried by courier runners as a lightweight contingency for forced marches across rugged borderlands.`,
            `Sold from a back-alley apothecary stall specializing in practical domestic charms for cellar mold and hearth drafts.`,
            `A surplus custom commission produced for an expeditionary quartermaster who cancelled the order before departure.`,
            `Folk charm traditionally woven by coastal fisherfolk before venturing into deep seasonal fog banks.`,
            `Produced in modest quantities by an eccentric clockmaker who used tension springs to store transient charges.`,
            `Confiscated from a street gambler's sleeve by market inspectors and later auctioned off as forfeited sundries.`,
            `Stitched into the lining of an old cavalry saddlebag bought third-hand at an estate clearance.`,
            `Fabricated by a mine engineer to provide crews with a reliable non-flame signal in gas-heavy coal seams.`,
            `A journeyman exercise from an alchemical workshop, demonstrating clean material binding without precious metal gilding.`,
            `Traded among caravan drovers at desert waystations as an indispensable survival precaution.`,
            `Pawned by an out-of-work stage actor who used it to manage stage lighting cues during traveling plays.`,
            `Recovered from a flooded basement archive where it had been used as an improvised paperweight for decades.`,
            `Assembled by a tracklayer mechanic to quickly test insulation continuity on electrified rail conduits.`,
          ];
  const provenance = pickFrom(origins, rng);
  const conciseUtility =
    utility.replace(/\s*\([^)]*\)/, "").trim() || selectedUtilityKey;

  const content = `### Description
${pickFrom(appearanceDetails, rng)}`;

  const lore = `### Quick Reference
- **Item Form**: ${form}
- **Usage Limit**: ${usageLimit}
- **Activation**: ${activation}
- **Primary Utility**: ${conciseUtility}
- **Setting / Theme**: ${genre}

### ${mechanicsHeading}
${effect}

### Quirk or Drawback
${quirk}

### Suggested Use in Play
${tactical}

### Provenance & Rumour
${provenance}`;

  return {
    type: "item",
    title: suggestedName,
    summary: "",
    content,
    lore,
    labels: ["minor-magic-item", "imported-draft"],
    status: "active",
  };
}
