/**
 * Public Magic Item generator — framework-free port of the SEO magic-item
 * generator (`apps/web/src/lib/services/seo/generators/magic-item.ts`).
 *
 * Framework-free per the unification plan (#1351): no AI client, no
 * sessionStorage. The web page builds the prompt here, runs it through
 * aiClientManager, parses with parseMagicItemResponse, and falls back to
 * generateMagicItemLocal. Session context is injected as a string.
 */

import type { PublicGeneratorOutput } from "./public-generator-adapters";
import { NAME_BAN_PROMPT } from "./public-npc";

export type Rng = () => number;
const defaultRng: Rng = () => Math.random();

function pickFrom<T>(arr: readonly T[], rng: Rng = defaultRng): T {
  return arr[Math.floor(rng() * arr.length)];
}

const FALLBACK_THEME = "Classic Fantasy";

export const magicItemConfig = {
  typesByTheme: {
    "Classic Fantasy": [
      "Weapon",
      "Armor",
      "Wand",
      "Ring",
      "Amulet",
      "Potion",
      "Scroll",
      "Wondrous Item",
    ],
    "Cyberpunk / Corporate": [
      "Weapon Mod",
      "Neural Implant",
      "Encrypted Chip",
      "Prototype Device",
      "Black Market Augment",
      "Corporate Prototype",
    ],
    "Vampire / Gothic Noir": [
      "Cursed Antique",
      "Bloodline Relic",
      "Occult Seal",
      "Bound Artifact",
      "Dark Talisman",
    ],
    "Sci-Fi / Space Opera": [
      "Weapon",
      "Armor",
      "Xenotech Device",
      "Energy Core",
      "Navigation Module",
      "Alien Artifact",
    ],
    "Modern Conspiracy": [
      "Anomalous Object",
      "Classified Prototype",
      "Government Artifact",
      "Black Site Device",
      "Redacted Asset",
    ],
    "Post-Apocalyptic": [
      "Salvaged Weapon",
      "Pre-War Tech",
      "Jury-Rigged Device",
      "Wasteland Artifact",
      "Military Surplus",
    ],
    "Western / Frontier": [
      "Weapon",
      "Pioneer Gear",
      "Outlaw Relic",
      "Frontier Medicine",
      "Cursed Trinket",
    ],
    Steampunk: [
      "Weapon",
      "Aetheric Device",
      "Clockwork Gadget",
      "Inventor Prototype",
      "Guild Instrument",
      "Pneumatic Tool",
    ],
    Lancer: [
      "Weapon",
      "Mech Component",
      "Union-Issue Gear",
      "Long Rim Salvage",
      "NHP-Adjacent Hardware",
      "Frame Module",
    ],
    "Space Opera Resistance": [
      "Weapon",
      "Stolen Imperial Tech",
      "Resistance Mod",
      "Signal Jammer",
      "Contraband Device",
    ],
    "Optimistic Exploration Sci-Fi": [
      "Survey Instrument",
      "Federation Kit",
      "Xenobiological Specimen",
      "Diplomatic Gift",
      "Exploration Device",
    ],
  } as Record<string, string[]>,
  generatorLabelByTheme: {
    "Classic Fantasy": "Magic Item",
    "Cyberpunk / Corporate": "Tech Artifact",
    "Vampire / Gothic Noir": "Cursed Relic",
    "Sci-Fi / Space Opera": "Tech Artifact",
    "Modern Conspiracy": "Anomalous Object",
    "Post-Apocalyptic": "Salvage Find",
    "Western / Frontier": "Rare Item",
    Steampunk: "Aetheric Device",
    Lancer: "Salvage",
    "Space Opera Resistance": "Contraband Tech",
    "Optimistic Exploration Sci-Fi": "Federation Equipment",
  } as Record<string, string>,
  rarities: ["Common", "Uncommon", "Rare", "Very Rare", "Legendary"],
  propertiesByTheme: {
    "Classic Fantasy": [
      "Glows faintly in the presence of undead, flashing red when danger is close.",
      "Whispers ancient prophecies to the wearer in their sleep, which are usually vague.",
      "Allows the user to speak with small forest animals, but they only talk about food.",
      "Increases the user's running speed, but leaves a trail of harmless sparks.",
      "Can store a single memory to be retrieved later by touching the surface.",
      "Grants resistance to cold, but the wearer always feels slightly chilly inside.",
      "Hums softly when pointed toward the nearest source of potable water.",
      "Casts a dim circle of silver light that attracts moths and fireflies at dusk.",
      "Becomes warm to the touch whenever a lie is spoken within thirty feet.",
    ] as string[],
    "Cyberpunk / Corporate": [
      "Contains an encrypted subroutine that runs passive surveillance on nearby wireless signals.",
      "Neural feedback loop amplifies reflex speed by 12 ms, but causes occasional phantom limb itch.",
      "Broadcasts a spoofed corporate employee ID that passes most automated checkpoints.",
      "Houses a black-market biofilter that scrubs common street-grade toxins from the bloodstream.",
      "Stores up to three terabytes of data in an unindexed partition invisible to standard forensic scans.",
      "Emits a low-frequency pulse that disrupts cheap drone optics within a five-meter radius.",
      "Auto-negotiates payment routing through three shell accounts to obfuscate transaction origin.",
    ] as string[],
    "Vampire / Gothic Noir": [
      "Feeds on the wielder's regret, growing heavier with each decision left unmade.",
      "Reflects a version of the world as it appeared one hundred years ago.",
      "Seals a minor oath spoken over it, turning cold and black if the vow is broken.",
      "Emits a low resonance audible only to those carrying inherited bloodline curses.",
      "Tarnishes in the presence of sanctified ground and polishes itself in graveyards.",
      "Preserves a faint whisper of the last person who wept while holding it.",
      "Grants its bearer the unsettling ability to sense the exact moment of a nearby creature's death.",
    ] as string[],
    "Sci-Fi / Space Opera": [
      "Draws on residual xenotech power cells that can be recharged at any standard starport.",
      "Projects a translation overlay readable only through compatible optical implants.",
      "Resonates with derelict ship hulls, humming louder the closer it gets to pre-Collapse alloys.",
      "Emits a tight-beam energy pulse that disrupts standard-issue deflector screens for 0.8 seconds.",
      "Contains a dormant alien biological sample sealed in stasis resin of unknown origin.",
      "Interfaces with navigation beacons to pinpoint the nearest inhabited system within two parsecs.",
      "Reacts to gravitational anomalies by vibrating at frequencies imperceptible without enhancement.",
    ] as string[],
    "Modern Conspiracy": [
      "Tagged with a classified asset identifier that triggers silent alarms in three government databases.",
      "Emits a low-level EM signature that scrambles nearby consumer-grade recording devices.",
      "Carries a residual psychometric imprint from its last authorized user, detectable by sensitive individuals.",
      "Contains a micro-etched serial number that has been redacted from all public procurement records.",
      "Reacts to proximity with certain pharmaceutical compounds in ways the documentation does not explain.",
      "Appears as a mundane object on all standard imaging equipment regardless of actual composition.",
      "Has documented anomalous behavior that twelve separate internal reports have failed to explain.",
    ] as string[],
    "Post-Apocalyptic": [
      "Jury-rigged from pre-war military components; functional but prone to jamming in heavy rain.",
      "Contains a sealed canister of pre-collapse medicine worth more than most people earn in a year.",
      "Wrapped in salvaged heat tape from a bunker armory, still faintly stamped with a government seal.",
      "Makeshift but lethal — crafted by a wasteland smith who left no instructions and no survivors.",
      "Runs on reclaimed battery cells; the charge indicator is broken and has been for decades.",
      "Reinforced with rebar and scrap plating that makes it heavier than it looks and harder to break.",
      "Carries blast scoring from the war that ended civilization; it was on the winning side.",
    ] as string[],
    "Western / Frontier": [
      "Rumored to have been carried by an outlaw who was hanged twice and survived once.",
      "Engraved with the name of a town that no longer exists on any map published after 1887.",
      "Blessed by a circuit-riding preacher whose congregation was entirely composed of the already dead.",
      "Frontier-made medicine kit containing three treatments proven effective and one that definitely is not.",
      "Notched once for every confirmed kill; no one agrees on the correct count.",
      "Said to grow warm when the owner is within a day's ride of their enemies.",
      "Handed down through three generations of lawmen, each of whom died in the line of duty.",
    ] as string[],
    Steampunk: [
      "Powered by a miniaturized aetheric coil that needs rewinding every eighteen hours.",
      "Houses a clockwork memory drum that records the last four minutes of ambient sound.",
      "Fitted with pressure regulators that emit a soft hiss when the internal mechanism is stressed.",
      "Designed by an inventor who filed seventeen patents in a single week before disappearing.",
      "Contains a gyroscopic stabilizer so precise that it corrects for the rotation of the earth.",
      "Equipped with a retractable pneumatic injector that can deliver any fluid loaded into the reservoir.",
      "Engraved with guild marks from three separate artificer societies, two of which are rivals.",
    ] as string[],
    Lancer: [
      "Union-issue gear stamped with a RA serial that predates the current administrative charter by forty years.",
      "Stripped from a HORUS-adjacent mech frame; the component has opinions and occasionally expresses them.",
      "Long Rim salvage of uncertain provenance — functional, unregistered, and technically ungovernable.",
      "NHP-adjacent hardware that passed all compliance checks but makes licensed technicians uncomfortable.",
      "Mech-scale component miniaturized for frame-external use by an omni-tool engineering team on a deadline.",
      "Carries a soft IFF tag that identifies it as destroyed in a battle that officially never occurred.",
      "Harrison Armory surplus rated for conditions that do not exist anywhere in the Orion Arm.",
    ] as string[],
    "Space Opera Resistance": [
      "Stripped from an imperial garrison post and re-keyed to resist standard imperial override commands.",
      "Modified by resistance engineers to broadcast on frequencies the empire stopped monitoring two years ago.",
      "Signal jammer built into a form factor that passes visual inspection as standard civilian equipment.",
      "Carries stolen imperial encryption keys that were valid as of the last intelligence drop.",
      "Weapon bearing impact marks from the assault on Relay Station Verandis, which the empire calls a maintenance accident.",
      "Coalition-marked and coalition-modified — built to outlast the empire that funded the original design.",
      "Fitted with a dead-man broadcast that transmits the bearer's location to resistance cells if it goes dark.",
    ] as string[],
    "Optimistic Exploration Sci-Fi": [
      "Federation-issue exploration kit certified for contact with pre-warp civilizations under strict protocols.",
      "Xenobiological specimen preserved in a federation-standard stasis field pending full classification.",
      "Diplomatic gift from the Velhari Conclave, whose gifting customs require the item to carry a minor obligation.",
      "Survey instrument capable of mapping subterranean structures at a resolution of thirty centimeters.",
      "Awarded upon completion of a first-contact mission that the crew agreed never to discuss in detail.",
      "Contains a universal translator matrix updated with seventeen newly documented language families.",
      "Built to federation safety standards so rigorous that it has outlasted the civilization that wrote them.",
    ] as string[],
  } as Record<string, string[]>,
  historiesByTheme: {
    "Classic Fantasy": [
      "Forged in the heart of a dying star by ancient dwarven smiths of old.",
      "Recovered from the hoard of a red dragon that ravaged the northern kingdoms.",
      "Worn by a legendary paladin who fell during the Siege of Shadowkeep.",
      "Discovered inside a hollow tree trunk deep within the Feywild.",
      "Created by a mad wizard who vanished into their own pocket dimension.",
      "Carried across three continents by a merchant who swore it was worthless and refused to sell it.",
    ] as string[],
    "Cyberpunk / Corporate": [
      "Prototype lifted from a MegaCorp R&D floor during a blackout that killed seventeen security feeds.",
      "Traded through six black-market intermediaries; the original manufacturer has been dissolved and reincorporated twice.",
      "Commissioned by a mid-tier executive who disappeared before the delivery date and was never reported missing.",
      "Recovered from a corporate wet-team extraction gone wrong; everyone else on that team is unaccounted for.",
      "Listed as destroyed on a decommission manifest signed by a VP who was terminated three days later.",
    ] as string[],
    "Vampire / Gothic Noir": [
      "Passed through the estates of four noble families, each of which ended in tragedy within a generation.",
      "Sealed inside a reliquary for eighty years by a cardinal who refused to explain why.",
      "Belonged to a detective who solved forty-one cases and vanished on the forty-second.",
      "Found in the possession of a woman who claimed to be twenty-three years old for sixty consecutive years.",
      "Donated to a museum anonymously; the curator who accepted it quit without notice the following morning.",
    ] as string[],
    "Sci-Fi / Space Opera": [
      "Recovered from the wreck of the DSV Perihelion, lost with all hands on a survey run that was never publicly filed.",
      "Catalogued as alien tech of unknown manufacture; three expert panels have disagreed on its planet of origin.",
      "Seized from a derelict station in the Null Belt that showed no signs of habitation and extensive signs of struggle.",
      "Traded across twelve systems before a freelancer acquired it without realizing what the core actually contained.",
      "Originally retrieved as scrap; the salvager sold it cheap because it kept turning on by itself at 0300.",
    ] as string[],
    "Modern Conspiracy": [
      "Appears in a redacted DoD procurement log from 1987 under a budget line that no longer officially exists.",
      "Documented in three separate whistleblower filings, none of which resulted in any official acknowledgment.",
      "Recovered from a site that does not appear on commercial mapping services and is surrounded by keep-out markers.",
      "Last known location was a government evidence lockup that suffered a catastrophic filing error six months ago.",
      "Connected to an incident that seventeen news organizations have independently stopped investigating.",
    ] as string[],
    "Post-Apocalyptic": [
      "Stamped with a manufacture date from before the war; everything made that year is worth killing for.",
      "Pulled from a bunker that had been sealed from the inside; the remains inside were never identified.",
      "Carried by a raider queen who ruled the Eastern Corridor for nine years before someone managed to take it.",
      "Found in a pre-war time capsule buried by people who expected to dig it up themselves.",
      "Last used during the battle for Checkpoint Sixteen, which nobody who was there talks about.",
    ] as string[],
    "Western / Frontier": [
      "Belonged to a marshal who cleaned up four territories before vanishing somewhere past the ridge line.",
      "Won in a card game by a gambler who swore he didn't cheat and was believed by no one.",
      "Left behind by a traveling stranger who paid for one night's lodging and was gone before dawn.",
      "Found on the body of an outlaw whose wanted poster listed a completely different name.",
      "Carried west in a covered wagon by a family that never arrived at their destination.",
    ] as string[],
    Steampunk: [
      "Exhibited at the Grand Exposition of 1887 before being stolen on the closing night.",
      "Designed by an inventor who published no papers, filed no patents, and left no heirs.",
      "Recovered from the wreck of an airship that, according to official records, was never built.",
      "Commissioned by a guild that dissolved under unexplained circumstances before the order was delivered.",
      "Last documented in the workshop of an artificer who was found at her bench, unharmed, and unresponsive.",
    ] as string[],
    Lancer: [
      "Logged as destroyed after the Fall of Evergreen; the chassis it came from was never recovered.",
      "Issued to a lancers unit that was administratively dissolved mid-deployment for reasons still classified.",
      "Pulled off a ghost frame operating in the Long Rim without IFF, crew, or mission parameters.",
      "Union provenance paperwork is spotless and internally consistent and almost certainly fabricated.",
      "Last registered to a pilot whose license was revoked following an incident that the official report describes as a calibration error.",
    ] as string[],
    "Space Opera Resistance": [
      "Taken from an imperial officer during a supply interdiction that the resistance officially denies conducting.",
      "Smuggled through four imperial checkpoints by a courier who memorized the route and then burned the maps.",
      "Built in a hidden workshop that was operational for six months before the empire found it and found nothing.",
      "Recovered from a destroyed resistance cell; the item was the only thing still functioning in the wreckage.",
      "Carried by a defector whose intel proved accurate and whose motives have never been fully explained.",
    ] as string[],
    "Optimistic Exploration Sci-Fi": [
      "Presented to the crew of the EFS Meridian upon first contact with the Selhari, who have not been heard from since.",
      "Catalogued on Expedition Forty-Seven, the only mission in the program to return without a complete crew.",
      "Federation archives list it as a gift exchanged during negotiations that ultimately succeeded despite everything.",
      "Recovered from a survey drone that returned seventeen years late, on course, with no record of the delay.",
      "Issued to a xenobiologist whose field notes are required reading and whose final entry remains under review.",
    ] as string[],
  } as Record<string, string[]>,
};

export interface MagicItemGeneratorOptions {
  type?: string;
  rarity?: string;
  theme?: string;
}

interface ResolvedMagicItem {
  itemType: string;
  rarity: string;
  name: string;
  theme: string;
}

function resolveMagicItem(
  options: MagicItemGeneratorOptions,
  rng: Rng,
): ResolvedMagicItem {
  const theme =
    options.theme &&
    magicItemConfig.propertiesByTheme[options.theme] !== undefined
      ? options.theme
      : FALLBACK_THEME;
  const typePool =
    magicItemConfig.typesByTheme[theme] ??
    magicItemConfig.typesByTheme[FALLBACK_THEME];
  const itemType = options.type || pickFrom(typePool, rng);
  const rarity = options.rarity || pickFrom(magicItemConfig.rarities, rng);

  const namePrefixes = [
    "Dread",
    "Aether",
    "Frost",
    "Shadow",
    "Soul",
    "Solar",
    "Storm",
    "Whisper",
    "Rune",
  ];
  const nameSuffixes = [
    "bringer",
    "weaver",
    "ward",
    "shard",
    "reaper",
    "binder",
    "heart",
    "caller",
  ];
  const baseName = pickFrom(namePrefixes, rng) + pickFrom(nameSuffixes, rng);

  return { itemType, rarity, name: `${baseName} (${itemType})`, theme };
}

export interface MagicItemPrompt {
  systemInstruction: string;
  userMessage: string;
  resolved: ResolvedMagicItem;
}

export function buildMagicItemPrompt(
  options: MagicItemGeneratorOptions = {},
  sessionContext = "",
  rng: Rng = defaultRng,
): MagicItemPrompt {
  const resolved = resolveMagicItem(options, rng);
  const { name, itemType, rarity, theme } = resolved;

  const userMessage = `Generate a detailed RPG Magic Item in JSON format.
Options:
- Name: ${name}
- Type: ${itemType}
- Rarity: ${rarity}
- Genre/Theme: ${theme}

You must return a valid JSON object matching the following structure exactly:
{
  "title": "A single string for the magic item name",
  "content": "A detailed description (markdown formatted) describing the item's appearance, materials, and passive feelings when held.",
  "lore": "Structured GM details (markdown formatted) detailing its magical properties, rarity, curse (if any), and legendary backstory.",
  "labels": ["rpg-item", "imported-draft"]
}
${NAME_BAN_PROMPT}
${sessionContext}
Return only the JSON object. Do not include markdown code block formatting like \`\`\`json.`;

  return {
    systemInstruction:
      "You are an assistant that generates detailed RPG campaign elements in JSON format.",
    userMessage,
    resolved,
  };
}

export function parseMagicItemResponse(
  text: string,
  resolved: ResolvedMagicItem,
): PublicGeneratorOutput {
  const cleanText = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/```$/, "")
    .trim();
  const data = JSON.parse(cleanText);
  return {
    type: "item",
    title: data.title || resolved.name,
    summary: data.summary || "",
    content: data.content || "",
    lore: data.lore || "",
    labels: Array.isArray(data.labels)
      ? data.labels
      : ["rpg-item", "imported-draft"],
    status: "active",
  };
}

export function generateMagicItemLocal(
  options: MagicItemGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const { itemType, rarity, name, theme } = resolveMagicItem(options, rng);
  const themeProperties =
    magicItemConfig.propertiesByTheme[theme] ??
    magicItemConfig.propertiesByTheme[FALLBACK_THEME];
  const themeHistories =
    magicItemConfig.historiesByTheme[theme] ??
    magicItemConfig.historiesByTheme[FALLBACK_THEME];
  const property = pickFrom(themeProperties, rng);
  const history = pickFrom(themeHistories, rng);

  const content = `### Description
The ${name} is a uniquely crafted ${itemType.toLowerCase()} that displays a high degree of precision in its construction. Made from materials rare to this region, it feels slightly warm or cool to the touch depending on the active wielder's alignment.`;

  const lore = `### GM Reference Information
- **Type**: ${itemType}
- **Rarity**: ${rarity}
- **Theme**: ${theme}

### Magical Properties
- **Passive Effect**: ${property}

### Lore & History
${history}`;

  return {
    type: "item",
    title: name,
    summary: "",
    content,
    lore,
    labels: ["rpg-item", "imported-draft"],
    status: "active",
  };
}
