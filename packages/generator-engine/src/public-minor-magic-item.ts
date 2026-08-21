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
    "Peculiar Appetite or Craving (Craves salt, dislikes shadows, thirst for tea)",
    "Environmental Flavour (Open flames bend towards it, stray animals watch)",
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

const FALLBACK_THEME = "Classic Fantasy";

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

  const nameAdjectives = [
    "Cinder",
    "Glimmer",
    "Bramble",
    "Whisper",
    "Copper",
    "Marrow",
    "Dusk",
    "Drift",
    "Moth",
    "Gale",
    "Thorn",
    "Cobalt",
    "Hollow",
    "Tallow",
    "Flicker",
    "Ash",
    "Dew",
    "Silt",
    "Rust",
    "Gravel",
  ];

  const nameNouns = [
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
    "Draft",
    "Needle",
    "Sliver",
    "Wafer",
    "Knot",
    "Whistle",
    "Plume",
    "Flint",
    "Balm",
    "Tallow",
  ];

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

  const userMessage = `Generate a creative, minor, single-use or limited-use magic item (or technological curiosity/trinket) in JSON format.

Constraints & Tone:
- Genre/Theme: ${resolved.genre}
- Item Form: ${resolved.form}
- Usage Limit / Charges: ${resolved.usageLimit}
- Focus / Utility: ${resolved.utility}
- Activation Method: ${resolved.activation}
- Quirk / Side Effect: ${resolved.quirkSeverity}
${formatCampaignContextBlock(resolved.campaignContext)}

Key Design Principles:
1. Single Core Function: Keep each minor item centred on ONE core function. Avoid adding secondary effects such as memory alteration unless they are strictly integral to that function.
2. Physical Form Matters: Make the physical form matter directly to how the item is handled, activated, and used in play.
3. Independent Identity: Avoid automatically connecting newly generated items to lore, factions, or history from previous generations. Each item should stand on its own unless the provided campaign context explicitly requests a connection.
4. Accurate Quick Reference: In the Quick Reference section, **Primary Utility** must name ONLY the single specific function or effect actually present in this item (e.g. 'Water Source Detection' or 'Footstep Silencing'). Do NOT repeat the full parenthetical list of examples from the prompt.
5. Grounded Provenance Variety: Avoid recurring fantasy-generator clichés (no "ancient forgotten empires", "mad wizards who vanished", "burned-down apothecaries", or "mysterious cloaked strangers"). Provide a grounded, varied origin rooted in practical trade, municipal labor, navigation, craft guilds, salvage, or local folk customs.
6. Low Impact & Creative Utility: This is NOT an epic artifact, a +2 sword, or a high-tier armor set. It is a disposable tool, a clever charm, an emergency consumable, an alchemical preparation, or an evocative curiosity.
7. System-Agnostic: Avoid rigid numeric stat blocks or ruleset-specific keywords (no spell slots, D&D 5e DC formulas, or gold piece lists). Focus on concrete physical/narrative effects that any GM can interpret immediately.
8. Clear Limits: Ensure the item has a clear single-use, charge-based, or temporal expiration as requested.
9. Memorable Flavour: Include tactile details, sensory tells, and a small quirk or provenance note.

Before returning, run a consistency pass:
- The item is centred on one core function without extraneous secondary effects (such as memory alteration).
- In Quick Reference, **Primary Utility** describes ONLY the specific effect actually present in this item without extraneous parenthetical lists.
- The item form matches "${resolved.form}" and physically matters to its operation.
- The activation method matches "${resolved.activation}".
- The usage limit matches "${resolved.usageLimit}".
- The primary utility directly aligns with "${resolved.utility}".
- The quirk or limitation matches "${resolved.quirkSeverity}".
- The Provenance & Rumour section avoids generic generator tropes and gives a specific, grounded origin.
- The item stands on its own without forced links to prior generation lore.
- The item is evocative, tactile, and immediately playable.

You must return a valid JSON object matching this schema:
{
  "title": "Evocative Item Name",
  "content": "Markdown describing physical appearance, materials, tactile texture, markings, and sensory details when handled or inspected.",
  "lore": "Markdown formatted GM reference with the following exact headings:\\n\\n### Quick Reference\\n- **Item Form**: ${resolved.form}\\n- **Usage Limit**: ${resolved.usageLimit}\\n- **Activation**: ${resolved.activation}\\n- **Primary Utility**: Concise name of the specific effect actually present in this item (e.g. 'Water Direction Finding' — do NOT copy the full parenthetical list of examples)\\n\\n### Magical Effect & Mechanics\\nDetailed description of what happens upon activation, sensory effects, concrete narrative result, and duration.\\n\\n### Quirk or Drawback\\nThe minor quirk, odd sensory tell, aesthetic side effect, or subtle inconvenience.\\n\\n### Suggested Use in Play\\nTactical, investigative, social, or creative scenarios where this item shines.\\n\\n### Provenance & Rumour\\nA 1-2 sentence hook about who made it, how it found its way into circulation, or a local rumour.",
  "labels": ["minor-magic-item", "imported-draft"]
}
${avoidBlock}
${NAME_BAN_PROMPT}
${sessionContext}
Return only the JSON object. Do not include markdown code block formatting like \`\`\`json.`;

  return {
    systemInstruction:
      "You are an expert tabletop RPG designer specialising in evocative, system-agnostic minor magic items, curiosities, and consumable charms.",
    userMessage,
    resolved,
  };
}

export function parseMinorMagicItemResponse(
  text: string,
  resolved: ResolvedMinorMagicItem,
): PublicGeneratorOutput {
  const data = parseFencedJson(text);
  return {
    type: "item",
    title: data.title || resolved.suggestedName,
    summary: data.summary || "",
    content: data.content || "",
    lore: data.lore || "",
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

  const appearanceDetails = [
    `The ${suggestedName} takes the form of a modest ${form.toLowerCase()}. The craftsmanship is deliberate but unpretentious, showing the hand of an artisan who valued utility over ceremonial polish. When held in the palm, it carries a faint temperature gradient—distinctly cooler on one edge and subtly warm along the spine.`,
    `Crafted as a small ${form.toLowerCase()}, the ${suggestedName} is fashioned from local materials bound with fine cord and sealed with a thin layer of protective varnish. Subtle geometric etchings line its rim, catching the light only when tilted at an angle.`,
    `The ${suggestedName} is an unassuming ${form.toLowerCase()} that easily fits into a pouch or waistcoat pocket. Its surface bears minor handling marks and a faint, pleasant scent of dried herbs and ozone.`,
    `A pocket-sized ${form.toLowerCase()}, the ${suggestedName} is marked with a simple maker's notch near its base. It feels surprisingly lightweight for its composition, with a faint tactile hum that subsides when gripped firmly.`,
  ];

  const effectsByUtility: Record<string, string[]> = {
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
      `Upon ${activation.toLowerCase()}, the item projects a tiny, harmless illusion of a miniature songbird that perches on the user's finger, sings three cheerful notes, and dissolves into golden sparks after one minute.`,
      `When ${activation.toLowerCase()}, whatever drink or food the user touches over the next hour adopts the comforting flavour of their favourite childhood meal, regardless of its original taste.`,
      `Activating the item causes all shadows within thirty feet to dance and swirl in reverse for three minutes, creating a mesmerizing spectacle that captivates observers.`,
    ],
  };

  const selectedUtilityKey =
    Object.keys(effectsByUtility).find((k) => utility.startsWith(k)) ??
    "Sensory & Detection";
  const utilityEffectList =
    effectsByUtility[selectedUtilityKey] ??
    effectsByUtility["Sensory & Detection"];
  const effect = pickFrom(utilityEffectList, rng);

  const quirks = [
    `When used, the air within five feet smells briefly of crushed pine needles and fresh ozone.`,
    `The bearer's fingertips tingle with a mild static sensation for twenty minutes after activation.`,
    `Open candle flames within ten paces tilt slightly towards the item while its effect remains active.`,
    `The user experiences a brief, pleasant craving for warm honeyed tea immediately after using it.`,
    `A faint, musical chime resonates from the empty shell or remnant of the item as it expends its charge.`,
    `The user's eyes catch reflections with a momentary amber glimmer in dim light.`,
  ];
  const quirk = quirkSeverity.startsWith("None")
    ? "The item functions cleanly with no discernible side effect or telltale residue."
    : pickFrom(quirks, rng);

  const tacticalUses = [
    `Ideal for bypassing guard checkpoints or creating an escape route through crowded alleys.`,
    `Superb when dealing with tense social negotiations where a small edge in composure or distraction turns the tide.`,
    `Invaluable during wilderness survival situations where sudden weather or spoiled provisions threaten the expedition.`,
    `Useful as an unconventional opening move in an ambush, forcing opponents to react to unexpected conditions.`,
  ];
  const tactical = pickFrom(tacticalUses, rng);

  const origins = [
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

### Magical Effect & Mechanics
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
