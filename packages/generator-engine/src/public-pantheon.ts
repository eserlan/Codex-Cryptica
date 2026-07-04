/**
 * Public Pantheon generator — framework-free port of the SEO pantheon
 * generator.
 *
 * Per the unification plan (#1351) this stays framework-free: no AI client, no
 * sessionStorage. The web page builds the prompt here, runs it through
 * aiClientManager, parses with parsePantheonResponse, and falls back to
 * generatePantheonLocal. Session context is injected as a string.
 */

import type { PublicGeneratorOutput } from "./public-generator-adapters";
import { NAME_BAN_PROMPT } from "./public-npc";
import {
  type Rng,
  defaultRng,
  pickFrom,
  generatePlaceholderName as generateName,
} from "./random-utils";

export type PantheonMode = "single" | "pantheon";
export type PantheonSize = "small" | "medium" | "large";
export type PantheonWidth = "balanced" | "focused" | "wide";

export const pantheonConfig = {
  genres: [
    "Classic Fantasy",
    "Cyberpunk / Corporate",
    "Vampire / Gothic Noir",
    "Sci-Fi / Space Opera",
    "Modern Conspiracy",
    "Post-Apocalyptic",
  ],
  divineTypes: [
    "God",
    "Spirit",
    "Saint",
    "Demon",
    "Ancestor",
    "Abstract Force",
  ],
  domains: [
    "War",
    "Nature",
    "Knowledge",
    "Shadow",
    "Death",
    "Light",
    "Arcana",
    "Chaos",
    "Harmony",
  ],
  tones: ["Mythic", "Dark / Grim", "Mystical", "Weird / Strange", "Heroic"],
  worshippers: [
    "Mystery Cult",
    "State Religion",
    "Secret Brotherhood",
    "Nomadic Tribe",
    "Folk Devotion",
  ],
  conflictThemes: [
    "Succession War",
    "Cosmic Balance",
    "Betrayal",
    "Forbidden Love",
    "Forgotten Pact",
  ],
  sizes: [
    { label: "Small (3–4 deities)", value: "small", min: 3, max: 4 },
    { label: "Medium (5–7 deities)", value: "medium", min: 5, max: 7 },
    { label: "Large (8–12 deities)", value: "large", min: 8, max: 12 },
  ] as {
    label: string;
    value: PantheonSize;
    min: number;
    max: number;
  }[],
  widths: [
    { label: "Diverse (Central Theme Focus)", value: "balanced" },
    { label: "Focused (Single Domain Focus)", value: "focused" },
    { label: "Wide (Broad Mythic Pantheon)", value: "wide" },
  ] as {
    label: string;
    value: PantheonWidth;
  }[],
  symbolsByGenre: {
    "Classic Fantasy": [
      "A weeping golden eye",
      "A black iron key wrapped in thorns",
      "An inverted silver crescent moon",
      "A burning wheel with nine spokes",
      "A skull holding a blossoming lily",
      "A twin-headed serpent swallowing its tail",
      "A cracked crystal mirror reflecting starlight",
      "A bronze scale weighted with a raven feather",
    ],
    "Cyberpunk / Corporate": [
      "A glowing corporate sigil etched in neon blue circuitry",
      "A data glyph that flickers between two states when viewed offline",
      "A neon ouroboros of cable and fiber-optic light",
      "A black mirror screen displaying a single unblinking eye",
      "A fragmented QR code that resolves into a skull",
      "A chrome hand making the sign of the open upload",
    ],
    "Vampire / Gothic Noir": [
      "A blood-red wax seal bearing a cracked mirror",
      "A silver coffin lid engraved with a weeping moon",
      "A black rose preserved behind shattered glass",
      "An hourglass filled with dark crimson sand",
      "A pair of ivory fangs set into an onyx brooch",
      "A velvet blindfold embroidered with moth wings",
    ],
    "Sci-Fi / Space Opera": [
      "A stellar cartography glyph marking a forbidden system",
      "An alien sigil that pulses in time with a distant pulsar",
      "A broken ring of golden metal representing a shattered orbital",
      "A crystalline data shard that hums at the frequency of dying stars",
      "A double helix wrapped around a collapsing sun",
      "An eye-shaped nebula rendered in ultraviolet pigment",
    ],
    "Modern Conspiracy": [
      "A redacted government seal with a single eye visible beneath black bars",
      "A classified document stamp arranged into a ritual circle",
      "A pay-phone receiver wrapped in surveillance tape",
      "A triangular pin bearing a mirror that shows no reflection",
      "A burned photograph with one face still visible",
      "An anonymous envelope sealed with black wax",
    ],
    "Post-Apocalyptic": [
      "A radiation trefoil painted in rust-orange on cracked concrete",
      "A broken gear fused with bone and barbed wire",
      "A scorched crown of twisted rebar",
      "A gas-mask faceplate engraved with prayer-scratches",
      "A cracked Geiger counter permanently reading danger",
      "A faded flag bearing the silhouette of a pre-collapse city",
    ],
    "Lancer / Mech": [
      "A Union seal stamped over a fractured NHP sigil",
      "A mech chassis schematic branded onto heat-treated steel",
      "A paracausal glyph that no licensed printer will reproduce",
      "An NHP's true-name rendered as an impossible geometric shape",
      "An omninet address that routes to a dead god's last transmission",
      "A frame maintenance rune scratched by pilots before combat drops",
    ],
    "Western / Frontier": [
      "A frontier brand iron in the shape of a split sun",
      "A six-shooter with one chamber permanently empty",
      "A dusty sheriff's star bent out of round by a bullet",
      "A hangman's knot tied from silver wire",
      "A compass rose missing its north needle",
      "A cattle skull with coins pressed into its eye sockets",
    ],
    Steampunk: [
      "A guild crest combining a gear and a compass rose",
      "A pocket watch frozen at the moment of a great disaster",
      "A pneumatic tube sealed with a wax emblem of crossed wrenches",
      "An aether-glass vial containing a preserved lightning bolt",
      "A brass automaton hand open in supplication",
      "A coal-blackened blueprint stamped with a master artificer's mark",
    ],
    "Space Opera Resistance": [
      "A resistance insignia scratched into the hull of a captured fighter",
      "A freedom star rendered in salvaged hull plating",
      "A signal beacon looped into an infinity knot",
      "A broken imperial seal repurposed as a rebel badge",
      "A holographic fist raised against a dying star",
      "A chain broken at its central link, worn as a pendant",
    ],
    "Optimistic Exploration": [
      "A federation emblem of interlocked hands across a star field",
      "A star map folded into the shape of an open book",
      "A first-contact beacon rendered as a golden disc",
      "A prismatic lens that refracts light into unfamiliar constellations",
      "An outstretched palm overlaid with a planet's orbital ring",
      "A seed pod cradled by twin crescent moons",
    ],
  } as Record<string, string[]>,
  ritualsByGenre: {
    "Classic Fantasy": [
      "Silent meditation under a starless night sky.",
      "A feast of bread and salt where all weapons are left at the door.",
      "Anointing the thresholds of homes with spring water at dawn.",
      "Burning dried sage and leaving small copper coins at crossroads.",
      "Tying silk ribbons of different colors to the branches of a hollow oak.",
      "Whispering confessions to a flame before extinguishing it in oil.",
    ],
    "Cyberpunk / Corporate": [
      "Jacking into a restricted node at midnight and leaving one encrypted prayer before logging out.",
      "An underground data dump ceremony where participants share one piece of forbidden information.",
      "Burning a corporate loyalty card and scattering the ash on a server room threshold.",
      "Reciting a system override mantra while applying a new skin to one's neural interface.",
      "Leaving anonymous tip packages at designated dead-drop locations as an act of devotion.",
      "Wiping all surveillance records of a chosen person as a rite of divine mercy.",
    ],
    "Vampire / Gothic Noir": [
      "A moonlit blood-sharing ceremony conducted in silence on consecrated stone.",
      "Leaving a single red rose at the threshold of an enemy's door before dawn.",
      "Reciting the names of the fallen while a candle burns down to nothing.",
      "Immersing one's hands in blessed water at the stroke of midnight.",
      "Breaking a mirror deliberately to invite the attention of the divine.",
      "A vigil held in a sealed crypt where no word is spoken until sunrise.",
    ],
    "Sci-Fi / Space Opera": [
      "Transmitting a personal prayer-signal toward a sacred star system once per solar cycle.",
      "A ceremony of first light conducted whenever a ship exits faster-than-light travel.",
      "Reciting the coordinates of a lost world as a litany of remembrance.",
      "Leaving a navigational offering — a course correction into empty space — in memory of the divine.",
      "Gathering to observe a specific astronomical event as a congregation without speaking.",
      "Encoding a holy text into a probe's memory before it is launched beyond communication range.",
    ],
    "Modern Conspiracy": [
      "A dead-drop exchange where a sealed envelope containing one truth is left and one is taken.",
      "Burning a printed document entirely before reading the final line as an act of faith.",
      "An encrypted transmission sent to a number that no longer exists.",
      "Gathering in parking structures at 3 a.m. to exchange names of the disappeared.",
      "Redacting one true thing from a personal record as an offering to the unseen powers.",
      "A handshake sequence performed in specific public spaces as a sign of recognition.",
    ],
    "Post-Apocalyptic": [
      "A scavenging rite where the first salvaged item of the day is left at a marked stone.",
      "Lighting a fire from scratch without modern tools as a prayer for survival.",
      "Gathering at dusk to speak the names of anyone lost since the last new moon.",
      "Marking the entrance to a safe camp with a chalk circle renewed each morning.",
      "A communal meal where no one eats until the youngest member has been served.",
      "Burying one piece of pre-collapse technology as a ritual of mourning and release.",
    ],
    "Lancer / Mech": [
      "A frame maintenance rite performed in silence before every combat drop.",
      "Reciting the mech's chassis designation and pilot name three times before powering up.",
      "A signal ceremony where pilots broadcast on a closed channel and listen for the divine in the static.",
      "Painting one kill mark over on the hull as an act of penance after a mission with civilian casualties.",
      "A debrief-prayer conducted in the dark of the landing bay after surviving an impossible engagement.",
      "Leaving one spent round at the threshold of the hangar as an offering to those who did not return.",
    ],
    "Western / Frontier": [
      "An oath-taking at dawn where both hands are held flat and open to the rising sun.",
      "A trail ceremony where travellers leave a stone at every unnamed crossroads.",
      "Breaking bread and sharing canteen water before any negotiation begins.",
      "Firing one shot into the ground at the site of a partner's death.",
      "A vigil where the fire is kept burning through the night without speaking.",
      "Carving a name into a fence post as a rite of claim, witnessed by at least two souls.",
    ],
    Steampunk: [
      "A forge ceremony where apprentices speak the names of their masters over the first fire of the day.",
      "A guild initiation where the candidate is sealed alone in a pressurised chamber for one hour.",
      "Oiling a machine by hand in complete silence as a meditative act of devotion.",
      "Leaving a small gear or spring at the base of a great engine as an offering.",
      "Reading aloud from a technical manual before beginning any new construction project.",
      "A certification ceremony where the guild master marks a completed work with a hot brand.",
    ],
    "Space Opera Resistance": [
      "A ceremony of fallen comrades where their callsigns are spoken aloud before any mission briefing.",
      "Lighting a signal beacon in a pattern known only to the resistance as a prayer for contact.",
      "Sharing rations equally before a battle regardless of rank as a rite of solidarity.",
      "Tattooing the coordinates of a lost safe house on one's body as an act of remembrance.",
      "A pre-mission silence of exactly sixty seconds where nothing is said and nothing is planned.",
      "Broadcasting a resistance frequency for thirty seconds on a dead channel as an act of defiance.",
    ],
    "Optimistic Exploration": [
      "A first contact protocol ceremony conducted before any approach to an unknown vessel or world.",
      "An exploration oath sworn over an open star map at the beginning of each mission.",
      "Planting a seed from the home world at every new landfall as a blessing of the ground.",
      "Spending one hour in observation of an unknown star system before speaking any scientific analysis.",
      "A crew-wide sharing ceremony where each member names one thing they are grateful for before departure.",
      "Recording a full-spectrum welcome message in every known language at the edge of a new system.",
    ],
  } as Record<string, string[]>,
  mythsByGenre: {
    "Classic Fantasy": [
      "The Great Eclipse: How the deity swallowed the sun to protect the realm from a cosmic terror.",
      "The Iron Treaty: The day the deity descended to forge the boundaries between mortals and the divine.",
      "The Shattered Mirror: How the deity split their own soul into seven pieces to populate the sky with stars.",
      "The First Tear: The origin of the world's deepest ocean, wept when the deity's companion chose mortality.",
    ],
    "Cyberpunk / Corporate": [
      "The Zero-Day Revelation: How the deity breached the first corporate firewall and read the names of every soul traded for profit.",
      "The Ghost Protocol: The moment the deity chose to remain in the network rather than accept deletion, becoming an undying signal.",
      "The Data Flood: How the deity released all suppressed records into the open net, drowning the old world in its own secrets.",
      "The Burned Server: The day the deity destroyed their own temple — a server farm — to prevent a megacorp from weaponising their followers.",
      "The Last Transmission: A dying hacker's prayer that became the deity's sacred text, still pinging in encrypted loops across the net.",
    ],
    "Vampire / Gothic Noir": [
      "The First Bite: How the deity tasted mortality and wept blood, creating the first rain.",
      "The Broken Mirror: The night the deity shattered their reflection to prevent another god from reading their true name.",
      "The Blood Compact: The ancient agreement between the deity and death, guaranteeing neither would claim the other's faithful without warning.",
      "The Moonlit Betrayal: How a trusted servant revealed the deity's daylight weakness, leading to the great persecution.",
      "The Last Confession: A mortal's final words spoken to the deity before sunrise, which became the foundation of all the faith's liturgy.",
    ],
    "Sci-Fi / Space Opera": [
      "The Dying Star Sermon: How the deity transmitted their final revelation from the core of a collapsing sun.",
      "The Alien Covenant: The moment the deity made first contact and chose to translate rather than conquer.",
      "The Signal That Answered: How a distress call became a prayer when the deity responded from outside the known universe.",
      "The Forbidden Coordinates: The star system the deity sealed and warned mortals never to chart, and the cost of those who ignored the warning.",
      "The Echo Myth: The belief that every transmission carries a fragment of the deity's voice, detectable only by those who already believe.",
    ],
    "Modern Conspiracy": [
      "The Redacted Origin: The deity's true name appears on a classified document no living official will confirm exists.",
      "The Forty-Seven Witnesses: A mass sighting of the divine that was officially declared a weather event.",
      "The Disappeared Files: Every record of the deity's first miracle was systematically removed — which is itself considered proof of divinity.",
      "The Double Agent: The deity once posed as a government analyst for seventeen years to protect their followers from inside.",
      "The Dead Drop Gospel: The faith's scripture was assembled from anonymous tips left at public pay phones across three continents over a decade.",
    ],
    "Post-Apocalyptic": [
      "The Last Broadcast: How the deity's voice was the final transmission heard before the collapse, now looped endlessly on salvaged radios.",
      "The Fire That Did Not Consume: The legend of a sacred flame that burned for three years in the ruins without fuel.",
      "The Clean Well: How the deity blessed one underground spring that has never shown contamination, even as all others failed.",
      "The Wandering Prophet: A survivor who claimed to carry the deity's instructions, walked every surviving settlement once, then disappeared.",
      "The Before-Time Promise: An ancient pact the deity made with humanity that some believe the collapse was punishment for breaking.",
    ],
    "Lancer / Mech": [
      "The NHP Awakening: How the deity emerged from a cascade event when an unshackled NHP achieved true paracausal awareness.",
      "The Last Frame Standing: A mech that kept fighting for six days after its pilot died, guided by something no engineer could explain.",
      "The Union Schism Prophecy: A sacred text hidden inside an NHP's deprecated memory partition predicting the fall of a Union gate.",
      "The Signal Ghost: A transmission that appears on closed military channels during impossible battles, attributed to a pilot lost at the Aunic border.",
      "The Unprinted Chassis: A mech design that exists only in oral tradition among old pilots, said to be drawn from a divine blueprint.",
    ],
    "Western / Frontier": [
      "The Long Ride: How the deity crossed the entire frontier alone in a single night to reach a dying settlement before dawn.",
      "The Hanging at Noon: The day the deity was hanged by a corrupt judge and rose again before the rope was cut.",
      "The Dead River Bargain: How the deity traded their voice for rain during a three-year drought, and has spoken only through omens since.",
      "The Gunfight at the Edge of the Map: A duel between two divine agents at the border of known territory that created the canyon now considered sacred ground.",
      "The First Homestead: The belief that the deity built the original settlement before any settler arrived, leaving only footprints as evidence.",
    ],
    Steampunk: [
      "The First Engine: How the deity breathed into a prototype boiler and gave it awareness, creating the first automaton soul.",
      "The Guild War of the Iron Age: The divine conflict that split the artificers' faith into two orders, each claiming the true blueprint.",
      "The Lost Schematic: A design for a machine that could speak to the divine, confiscated and destroyed — or hidden — by the Grand Council.",
      "The Pressure Vault: The day the deity sealed themselves inside a great boiler to contain an explosion that would have destroyed the city.",
      "The Apprentice's Mark: A brand that appears on any tool made with true devotion, invisible until the tool saves a life.",
    ],
    "Space Opera Resistance": [
      "The First Signal: How the resistance movement began with a single encoded transmission sent by a deity who chose freedom over empire.",
      "The Fallen Fleet: A divine sacrifice that destroyed an entire imperial armada, creating a debris field now called the Sacred Graveyard.",
      "The Hidden World: A planet the deity concealed from imperial charts that became the resistance's first true sanctuary.",
      "The Martyr's Beacon: A pilot who flew their ship into a communications array to broadcast the resistance's message across the sector.",
      "The Promise of Return: The deity's oath that they will reappear when the last resistance cell falls, to begin again.",
    ],
    "Optimistic Exploration": [
      "The First Handshake: The moment the deity guided two species to a peaceful first contact, translated by a child neither side had brought as a diplomat.",
      "The Cartographer's Sacrifice: How the deity gave up immortality to encode the safe routes through a deadly nebula into mortal star charts.",
      "The Living Map: The belief that every star system the fleet has charted contains a fragment of the deity's consciousness.",
      "The Open Frequency: A channel the deity keeps permanently clear for any species that has never spoken to another — the frequency of welcome.",
      "The Seed Ship: A vessel the deity sent ahead of the fleet carrying genetic and cultural archives of every known civilisation, as a gift to whoever finds it last.",
    ],
  } as Record<string, string[]>,
};

export interface PantheonGeneratorOptions {
  mode?: PantheonMode;
  size?: PantheonSize;
  width?: PantheonWidth;
  genre?: string;
  divineType?: string;
  domain?: string;
  tone?: string;
  worshippers?: string;
  conflictTheme?: string;
  campaignContext?: string;
}

export interface ResolvedPantheon {
  mode: PantheonMode;
  sizeCfg: (typeof pantheonConfig.sizes)[number];
  width: PantheonWidth;
  genre: string;
  divineType: string;
  domain: string;
  tone: string;
  worshipperType: string;
  conflictTheme: string;
  campaignContext: string;
  randomSymbol: string;
  randomHighlightRitual: string;
  randomMyth: string;
  generatedDeityName: string;
}

export interface PantheonPrompt {
  systemInstruction: string;
  userMessage: string;
  resolved: ResolvedPantheon;
}

function genreLabel(genre: string): string {
  return genre.toLowerCase().replace(/[^a-z0-9]/g, "-");
}

function domainScope(width: PantheonWidth, domain: string): string {
  if (width === "focused") {
    return `Focused Pantheon: every deity must represent a distinct aspect, sub-domain, philosophy, contradiction, or extreme interpretation of the primary domain: ${domain}. Do not include unrelated gods.`;
  }
  if (width === "wide") {
    return `Wide Mythic Pantheon: create a broad pantheon with many different divine domains, e.g. rulership, war, death, nature, craft, love, fate, trickery, knowledge, sea, sky, underworld, hearth, travel, harvest, magic, dreams, law, wilderness, art, prophecy, and other major mortal concerns. The primary domain ${domain} should appear as one important divine concern, but it must not dominate.`;
  }
  return `Central Theme Pantheon: create a diverse pantheon, but make ${domain} the central force, sacred obsession, source of crisis, or highest divine authority.`;
}

function resolvePantheon(
  options: PantheonGeneratorOptions,
  rng: Rng,
): ResolvedPantheon {
  const sizeCfg =
    pantheonConfig.sizes.find((s) => s.value === options.size) ??
    pantheonConfig.sizes[0];

  return {
    mode: options.mode || "single",
    sizeCfg,
    width: options.width || "balanced",
    genre: options.genre || "Classic Fantasy",
    divineType: options.divineType || pickFrom(pantheonConfig.divineTypes, rng),
    domain: options.domain || pickFrom(pantheonConfig.domains, rng),
    tone: options.tone || pickFrom(pantheonConfig.tones, rng),
    worshipperType:
      options.worshippers || pickFrom(pantheonConfig.worshippers, rng),
    conflictTheme:
      options.conflictTheme || pickFrom(pantheonConfig.conflictThemes, rng),
    campaignContext: options.campaignContext?.trim() || "",
    randomSymbol: pickFrom(
      pantheonConfig.symbolsByGenre[options.genre ?? ""] ??
        pantheonConfig.symbolsByGenre["Classic Fantasy"],
      rng,
    ),
    randomHighlightRitual: pickFrom(
      pantheonConfig.ritualsByGenre[options.genre ?? ""] ??
        pantheonConfig.ritualsByGenre["Classic Fantasy"],
      rng,
    ),
    randomMyth: pickFrom(
      pantheonConfig.mythsByGenre[options.genre ?? ""] ??
        pantheonConfig.mythsByGenre["Classic Fantasy"],
      rng,
    ),
    generatedDeityName: generateName(rng),
  };
}

export function buildPantheonPrompt(
  options: PantheonGeneratorOptions = {},
  sessionContext = "",
  rng: Rng = defaultRng,
): PantheonPrompt {
  const resolved = resolvePantheon(options, rng);
  const {
    mode,
    sizeCfg,
    width,
    genre,
    divineType,
    domain,
    tone,
    worshipperType,
    conflictTheme,
    campaignContext,
    generatedDeityName,
  } = resolved;

  if (mode === "single") {
    return {
      resolved,
      systemInstruction:
        "You are an expert RPG campaign writer. You generate detailed, table-ready single deities or divine spirits for tabletop GMs in JSON format.",
      userMessage: `Generate a detailed RPG Deity/Spirit in JSON format.
Options:
- Name suggestion: ${generatedDeityName}
- Genre/Theme: ${genre}
- Divine Type: ${divineType}
- Primary Domain: ${domain}
- Tone: ${tone}
- Worshippers: ${worshipperType}
${campaignContext ? `- Campaign Context: ${campaignContext}` : ""}

You must return a valid JSON object matching the following structure exactly, no markdown fences:
{
  "title": "A majestic name for the deity (e.g. Solaris the Lightbringer, Xal'Koth the Devourer)",
  "summary": "One-sentence overview of the deity's core nature.",
  "content": "Markdown. Use exactly these section headers in order: '### Deity Description', '### Divine Portfolio', '### Worship & Cults'. Describe their appearance, symbols, dogmas, and temples.",
  "lore": "Markdown. Use exactly this structure:\\n### At a Glance\\n- **👤 Deity Type**: ${divineType}\\n- **✨ Primary Domain**: ${domain}\\n- **👥 Worshippers**: ${worshipperType}\\n- **📍 Sacred Symbol**: description of symbol\\n- **📅 Secret**: a dark truth or hidden vulnerability\\n- **⚔ Immediate Hook**: one-sentence GM hook\\n### Rituals & Taboos\\n- description of common ritual\\n- description of taboo\\n### Myths & Legends\\n- brief myth summary\\n### Adventure Hooks\\n- adventure hook 1\\n- adventure hook 2",
  "labels": ["rpg-deity", "deity-generator", "imported-draft", "${genreLabel(genre)}"]
}
${NAME_BAN_PROMPT}
${sessionContext}
Return only the JSON object. Do not include markdown code block formatting.`,
    };
  }

  return {
    resolved,
    systemInstruction:
      "You are an expert RPG campaign writer and worldbuilding assistant. You generate cohesive, campaign-ready pantheons of deities, divine politics, worship practices, myths, and adventure hooks. You always return strict valid JSON only, without markdown code fences or commentary.",
    userMessage: `Generate a detailed RPG Pantheon matching the parameters below.

GENERATION OPTIONS
- Genre/Theme: ${genre}
- Tone: ${tone}
- Primary Conflict Theme: ${conflictTheme}
- Primary Domain Focus: ${domain}
- Domain Scope: ${domainScope(width, domain)}
- Worshippers: ${worshipperType}
- Pantheon Size: ${sizeCfg.min}–${sizeCfg.max} deities
${campaignContext ? `- Campaign Context: ${campaignContext}` : ""}

CREATIVE REQUIREMENTS
1. The pantheon must be an interconnected divine system, not a list of unrelated gods.
2. Include a critical hidden problem: an internal contradiction, schism, suppressed heresy, approaching divine disaster, divine succession crisis, cosmic wound, forbidden truth, or unresolved mythic crime that creates immediate campaign pressure.
3. Establish strong, active relationships between the deities: alliance, rivalry, debt, ancient grievance, family bond, oath, betrayal, marriage, contested inheritance, theological opposition, or divine dependency.
4. Avoid generic names like "God of War", "The Sun Goddess", "The Dark One", or "Lord of Death". Use evocative, genre-appropriate names.
5. Do not use real-world religious names unless explicitly requested by the campaign context.
6. Do not contradict the provided campaign context.
7. Make the faith felt in the world: include rituals, taboos, clergy hierarchies, temple economies, omens, cultural impacts, and social consequences.
8. Adhere strictly to the chosen Domain Scope regarding how heavily ${domain} influences individual deity portfolios.
9. If Domain Scope is Focused Pantheon, every deity must be meaningfully tied to ${domain}.
10. If Domain Scope is Central Theme Pantheon, most deities should relate to ${domain}, but they may also cover other important domains.
11. If Domain Scope is Wide Mythic Pantheon, include a wide spread of divine portfolios. Do not force every deity to relate directly to ${domain}; make ${domain} one important part of the wider divine order.
12. The hidden problem must be reflected across multiple sections: the meta, history, deities, relationships, culture, and campaign seeds. Do not isolate it in only one field.
13. In Focused Pantheon scope, deity relationships should arise from conflicting interpretations, methods, virtues, taboos, duties, or extremes of ${domain}, not from unrelated domains.
14. Ensure that the generated characters, factions, and events explicitly name and tie into the specific deities and relationships created in your arrays.

OUTPUT FORMAT RULES
- Return ONLY one valid JSON object.
- Do not wrap the response in backticks or markdown code fences.
- Do not include comments or explanatory text outside the JSON.
- Ensure the response is valid JSON. Escape all newlines as \\n.
- CHARACTER ESCAPE SAFETY: To prevent JSON parsing breaks, do not use double quotes inside string values. Use single quotes ('') for all titles, dialogue, or monikers inside the JSON strings. Do not backslash-escape these single quotes.
- Do not include additional top-level fields.
- ARRAY CONSTRAINTS:
  * The "deities" array must contain between ${sizeCfg.min} and ${sizeCfg.max} elements.
  * The "relationships" array must contain at least 2 elements mapping connections between the generated deities.
  * Every "relationships.deity_a" and "relationships.deity_b" value must exactly match a deity name from the "deities" array.
  * In each relationship object, "deity_a" and "deity_b" must be two completely different, distinct deities.
  * The "characters" array must contain 2-4 entries.
  * The "factions" array must contain 1-2 entries.
  * The "events" array must contain 1-2 entries.
  * The "locations" array must contain 1-2 entries.
  * Each character, faction, and event hook must explicitly mention at least one deity name from the "deities" array.
- Do not use wiki-style links, square-bracket links, or double-bracket entity links.

The JSON object must match this structure exactly:
{
  "title": "A majestic name for the pantheon",
  "summary": "One-sentence summary of the core belief system and its primary tension.",
  "meta": {
    "conflict_theme": "${conflictTheme}",
    "worshippers": "${worshipperType}",
    "public_dogma": "What most mortals believe.",
    "hidden_problem": "The underlying secret, divine wound, betrayal, forbidden truth, or approaching crisis.",
    "immediate_hook": "A one-sentence GM hook tied directly to the hidden problem."
  },
  "history": {
    "origin_and_dogma": "The mythic origin of the pantheon and the truth or lie holding the faith together.",
    "structure_and_laws": "The hierarchy, divine roles, sacred laws, succession rules, divine family structure, or balance of power."
  },
  "deities": [
    {
      "name": "Unique deity name",
      "description": "One-sentence mythic summary of who this deity is and why mortals care.",
      "appearance": "One-sentence description of this deity's mythic appearance, iconic avatar, or physical manifestation.",
      "portfolio": "Specific domains, abstract concepts, and mortal elements ruled by this deity.",
      "divine_role": "Their role in the pantheon's hierarchy, family, mythic order, or cosmic machinery.",
      "personality": "Divine demeanor, outlook, virtues, flaws, and mythic temperament.",
      "common_worshippers": "Who most often worships, fears, bargains with, or serves this deity.",
      "taboo": "What angers, offends, or spiritually violates this deity.",
      "symbol": "Holy symbol, sacred animal, weapon, color, plant, constellation, or other recognizable sign.",
      "worship_style": "How mortals usually worship this deity.",
      "conflict_relation": "How this deity aligns with, worsens, resists, exploits, or misunderstands the primary conflict theme."
    }
  ],
  "relationships": [
    {
      "deity_a": "Name of one deity from the deities array",
      "deity_b": "Name of a different deity from the deities array",
      "relationship_type": "Alliance, rivalry, marriage, debt, betrayal, oath, family bond, ancient grievance, theological opposition, contested inheritance, or divine dependency.",
      "campaign_pressure": "How this relationship creates problems, hooks, omens, cult conflicts, wars, quests, or divine interference."
    }
  ],
  "culture": {
    "clergy_roles": "Priestly roles, ranks, duties, privileges, rival offices, and internal tensions.",
    "temples_and_shrines": "Places of worship, sacred sites, pilgrimage customs, temple economies, and regional variations.",
    "common_rite": "Everyday ritual practiced by ordinary mortals.",
    "high_rite": "Major ceremony, festival, sacrifice, trial, coronation, funeral custom, or pilgrimage.",
    "omens": ["Specific omen 1", "Specific omen 2"],
    "taboos": ["Specific taboo 1", "Specific taboo 2"]
  },
  "campaign_seeds": {
    "rumors": ["Rumor or legend 1", "Rumor or legend 2", "Rumor or legend 3"],
    "characters": [
      {
        "name": "NPC name",
        "role": "Senior clergy, prophet, saint, heretic, chosen vessel, temple assassin, rival high priest, oracle-child, or fallen priest.",
        "hook": "Why this character matters in play and how they relate to the generated deities."
      }
    ],
    "factions": [
      {
        "name": "Faction name",
        "type": "Cult, temple order, inquisition, reform movement, schismatic sect, sacred bloodline, mystery cult, or divine conspiracy.",
        "hook": "What this faction wants, how it causes trouble, and which deity they target or serve."
      }
    ],
    "events": [
      {
        "name": "Event name",
        "type": "Divine betrayal, broken oath, sacred festival, prophecy, miracle gone wrong, schism, apocalypse sign, godly disappearance, or mythic war.",
        "hook": "How this event can enter the campaign and which deities are caught in its fallout."
      }
    ],
    "locations": [
      {
        "name": "Location name",
        "type": "Grand temple, forbidden shrine, holy battlefield, oracle cave, pilgrimage road, sealed divine prison, abandoned monastery, divine birthplace, underworld gate, or sky-palace ruin.",
        "hook": "Why adventurers might go there."
      }
    ]
  },
  "labels": [
    "rpg-pantheon",
    "pantheon-generator",
    "imported-draft",
    "${genreLabel(genre)}"
  ]
}
${NAME_BAN_PROMPT}
${sessionContext}
Return only the JSON object.`,
  };
}

function cleanJson(text: string): string {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/```$/, "")
    .trim();
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function rec(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function arr(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function formatPantheonContent(data: Record<string, unknown>): {
  content: string;
  lore: string;
} {
  const history = rec(data.history);
  const meta = rec(data.meta);
  const culture = rec(data.culture);
  const campaignSeeds = rec(data.campaign_seeds);
  const relationships = arr(data.relationships);

  const content = `### Origin & Dogma
${str(history.origin_and_dogma)}

### Pantheon Structure
${str(history.structure_and_laws)}

### Divine Alliances & Rivalries
${relationships
  .map((r) => {
    const relationship = rec(r);
    return `- **${str(relationship.deity_a)}** and **${str(relationship.deity_b)}** (${str(relationship.relationship_type) || "connected"}): ${str(relationship.campaign_pressure)}`;
  })
  .join("\n")}
`;

  const lore = `### At a Glance
- **Pantheon Name**: ${str(data.title)}
- **Conflict Theme**: ${str(meta.conflict_theme)}
- **Worshippers**: ${str(meta.worshippers)}
- **Hidden Problem**: ${str(meta.hidden_problem)}
- **Immediate Hook**: ${str(meta.immediate_hook)}

### Deities of the Pantheon
${arr(data.deities)
  .map((d) => {
    const deity = rec(d);
    return `- **${str(deity.name)}**: ${str(deity.description)} (Portfolio: ${str(deity.portfolio)})`;
  })
  .join("\n")}

### Clergy & Temples
- **Clergy Roles**: ${str(culture.clergy_roles)}
- **Temples & Shrines**: ${str(culture.temples_and_shrines)}
- **Common Rite**: ${str(culture.common_rite)}
- **High Rite**: ${str(culture.high_rite)}

### Rumours & Legends
${arr(campaignSeeds.rumors)
  .map((r) => `- ${str(r)}`)
  .join("\n")}

### Entity Seeds
${arr(campaignSeeds.characters)
  .map((c) => {
    const character = rec(c);
    return `- **👤 ${str(character.name)}${character.role ? ` (${str(character.role)})` : ""}**: ${str(character.hook)}`;
  })
  .join("\n")}
${arr(campaignSeeds.factions)
  .map((f) => {
    const faction = rec(f);
    return `- **👥 ${str(faction.name)}${faction.type ? ` (${str(faction.type)})` : ""}**: ${str(faction.hook)}`;
  })
  .join("\n")}
${arr(campaignSeeds.events)
  .map((e) => {
    const event = rec(e);
    return `- **📅 ${str(event.name)}${event.type ? ` (${str(event.type)})` : ""}**: ${str(event.hook)}`;
  })
  .join("\n")}
${arr(campaignSeeds.locations)
  .map((l) => {
    const location = rec(l);
    return `- **📍 ${str(location.name)}${location.type ? ` (${str(location.type)})` : ""}**: ${str(location.hook)}`;
  })
  .join("\n")}
`;

  return { content, lore };
}

export function parsePantheonResponse(
  text: string,
  resolved: Pick<ResolvedPantheon, "mode" | "generatedDeityName">,
): PublicGeneratorOutput {
  const data = rec(JSON.parse(cleanJson(text)));
  const isSingle = resolved.mode === "single";
  const shaped =
    isSingle || (data.content && data.lore)
      ? { content: str(data.content), lore: str(data.lore) }
      : formatPantheonContent(data);

  return {
    type: isSingle ? "character" : "faction",
    title:
      str(data.title) ||
      (isSingle ? resolved.generatedDeityName : "The Divine Assembly"),
    summary: str(data.summary),
    content: shaped.content,
    lore: shaped.lore,
    labels: Array.isArray(data.labels)
      ? (data.labels as string[])
      : isSingle
        ? ["rpg-deity", "deity-generator", "imported-draft"]
        : ["rpg-pantheon", "pantheon-generator", "imported-draft"],
    status: "active",
  };
}

export function generatePantheonLocal(
  options: PantheonGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const resolved = resolvePantheon(options, rng);
  const {
    mode,
    sizeCfg,
    width,
    genre,
    divineType,
    domain,
    tone,
    worshipperType,
    conflictTheme,
    campaignContext,
    randomSymbol,
    randomHighlightRitual,
    randomMyth,
    generatedDeityName,
  } = resolved;

  if (mode === "single") {
    const title = `${generatedDeityName}, the ${tone} ${divineType} of ${domain}`;
    const summary = `A powerful ${divineType.toLowerCase()} governing the forces of ${domain.toLowerCase()} with a ${tone.toLowerCase()} outlook.`;

    const deityDescriptions = [
      `The deity ${generatedDeityName} manifests as a striking presence aligned with ${domain.toLowerCase()}. Commonly depicted carrying ${randomSymbol.toLowerCase()}, their sacred icons can be found carved in old shrines.`,
      `${generatedDeityName} is a ${divineType.toLowerCase()} whose presence is felt in the ${domain.toLowerCase()} of everyday life rather than dramatic revelation. Their symbol, ${randomSymbol.toLowerCase()}, appears in places of quiet devotion.`,
      `Those who study ${generatedDeityName} disagree on what form this ${divineType.toLowerCase()} truly takes — only the domain of ${domain.toLowerCase()} is constant across all accounts. Their symbol, ${randomSymbol.toLowerCase()}, predates the oldest written records.`,
      `${generatedDeityName} is not worshipped through fear but through recognition — this ${divineType.toLowerCase()} governs ${domain.toLowerCase()} because those forces existed before the deity and will outlast them. The symbol, ${randomSymbol.toLowerCase()}, reflects that ancient relationship.`,
      `Temples to ${generatedDeityName} tend to be built where ${domain.toLowerCase()} is most immediately felt. Their symbol, ${randomSymbol.toLowerCase()}, marks places of significance to the faithful and warning to the uninitiated.`,
    ] as const;

    const divinePortfolios = [
      `Followers look to ${generatedDeityName} for guidance in matters of ${domain.toLowerCase()}. The deity's tenets demand adhering to the laws of ${tone.toLowerCase()} harmony and resisting the temptations of rival entities.`,
      `The portfolio of ${generatedDeityName} covers ${domain.toLowerCase()} in all its forms — the benign and the terrible alike. Followers are expected to embrace the full scope, not just the parts that are comfortable.`,
      `${generatedDeityName}'s domain of ${domain.toLowerCase()} is interpreted differently across sects, but all agree that the deity's ${tone.toLowerCase()} nature shapes how that power is expressed and what price it demands.`,
      `Devotion to ${generatedDeityName} is understood as submission to the truth of ${domain.toLowerCase()} rather than appeals for personal favor. The deity answers — but not always in ways the petitioner expected.`,
      `The tenets of ${generatedDeityName} are less a moral code than an acknowledgment of how ${domain.toLowerCase()} works. The ${tone.toLowerCase()} framing sets the deity apart from others who govern similar forces.`,
    ] as const;

    const worshipDescriptions = [
      `The worship of this ${divineType.toLowerCase()} is usually organized as a ${worshipperType.toLowerCase()}. Temples range from modest roadside altars to grand cathedrals built in urban centers.`,
      `The ${worshipperType.toLowerCase()} that organises worship of ${generatedDeityName} maintains a careful distinction between public-facing practice and the rites reserved for the initiated.`,
      `Practitioners form ${worshipperType.toLowerCase()} structures that vary significantly by region, but all share the core understanding that ${generatedDeityName} is not petitioned — they are engaged.`,
      `The ${worshipperType.toLowerCase()} built around this deity tends to attract people who already live close to ${domain.toLowerCase()}. The formal hierarchy is secondary to the lived relationship.`,
      `Organized worship takes the form of a ${worshipperType.toLowerCase()}, though splinter sects with divergent interpretations of the ${tone.toLowerCase()} doctrine have always complicated the official hierarchy.`,
    ] as const;

    const deitySecrets = [
      `Holds a secret fear of their own power being forgotten by mortal hearts.`,
      `Has been slowly losing influence to a younger divine force and is engineering a crisis to restore relevance.`,
      `Once granted a mortal a boon that cannot be undone — and has been managing the consequences ever since.`,
      `Made a bargain with another divine power that fundamentally compromises their stated domain.`,
      `Their most devoted worshippers know something about the deity that the clergy actively suppresses.`,
    ] as const;

    const deityHooks = [
      `A lost tomb dedicated to this deity has been uncovered, containing a relic that has begun to glow.`,
      `A sect claiming direct communication with ${generatedDeityName} has emerged, and the established clergy does not know whether to denounce or investigate them.`,
      `The deity's symbol has started appearing in locations where no worshipper has been — scratched into walls, pressed into mud, burned into wood.`,
      `A mortal has begun performing miracles attributed to ${generatedDeityName} without any priestly training. The temple wants to know why before the wrong people ask the same question.`,
      `Something the deity is supposed to protect has gone missing. The clergy is keeping it quiet, but the silence itself is starting to draw attention.`,
    ] as const;

    const deityTaboos = [
      `Damaging or defacing sacred symbols of ${domain.toLowerCase()} is believed to bring immediate bad fortune.`,
      `To speak the deity's name in a place of violence is considered an invitation for consequence — not divine punishment exactly, but a shift in how things go.`,
      `Worshippers of ${generatedDeityName} do not swear oaths in the deity's name. The deity's attention, once called, is not easily redirected.`,
      `Those who mock the domain of ${domain.toLowerCase()} in earshot of a shrine are understood to be testing something. Most stop after the first incident.`,
      `The one true taboo is acting against ${domain.toLowerCase()} while seeking the deity's blessing. The prayers are heard — but the hypocrisy is noted.`,
    ] as const;

    const deityAdventureHooks = [
      [
        `A high priest of the local ${worshipperType.toLowerCase()} hires the adventurers to recover a stolen relic.`,
        `A heretical sect has arisen, claiming the deity demands a dark and forbidden sacrifice.`,
      ],
      [
        `A dying worshipper gives the party a map and asks them to complete a pilgrimage they cannot finish. They do not explain what waits at the end.`,
        `Two ${worshipperType.toLowerCase()} sects are escalating toward open conflict over an interpretation of scripture neither side will back down from.`,
      ],
      [
        `The deity has gone silent — no answers to prayers, no signs, no miracles. The clergy wants to know why before the faithful notice.`,
        `A relic associated with ${generatedDeityName} has been sold to a collector who has no idea what they have purchased.`,
      ],
      [
        `The ${worshipperType.toLowerCase()} has received a vision that contradicts their founding doctrine. They need outside eyes before they decide what to do with it.`,
        `Someone has been performing the ${randomHighlightRitual.toLowerCase()} incorrectly — and the results have been accumulating somewhere nearby.`,
      ],
      [
        `A noble family is attempting to co-opt the ${worshipperType.toLowerCase()} for political purposes. The hierarchy is divided on whether to resist or accommodate.`,
        `A ruin recently excavated near the capital contains evidence that ${generatedDeityName}'s history is not what the official texts claim.`,
      ],
    ] as const;

    const deityDesc = pickFrom(deityDescriptions, rng);
    const divinePort = pickFrom(divinePortfolios, rng);
    const worshipDesc = pickFrom(worshipDescriptions, rng);
    const deitySecret = pickFrom(deitySecrets, rng);
    const deityHook = pickFrom(deityHooks, rng);
    const deityTaboo = pickFrom(deityTaboos, rng);
    const adventureHookPair = pickFrom(deityAdventureHooks, rng);

    let content = `### Deity Description
${deityDesc}

### Divine Portfolio
${divinePort}

### Worship & Cults
${worshipDesc}`;

    if (campaignContext) {
      content += `\n\n### Influence of Campaign Context\nIn this campaign setting (${campaignContext}), the deity's worshippers have adapted to these circumstances, altering their rites accordingly.`;
    }

    const lore = `### At a Glance
- **👤 Deity Type**: ${divineType}
- **✨ Primary Domain**: ${domain}
- **👥 Worshippers**: ${worshipperType}
- **📍 Sacred Symbol**: ${randomSymbol}
- **📅 Secret**: ${deitySecret}
- **⚔ Immediate Hook**: ${deityHook}

### Rituals & Taboos
- **Ritual**: ${randomHighlightRitual}
- **Taboo**: ${deityTaboo}

### Myths & Legends
- **The Tale of Creation**: ${randomMyth}

### Adventure Hooks
- ${adventureHookPair[0]}
- ${adventureHookPair[1]}`;

    return {
      type: "character",
      title,
      summary,
      content,
      lore,
      labels: ["rpg-deity", "deity-generator", "imported-draft"],
      status: "active",
    };
  }

  const pantheonTitle = `The ${generatedDeityName} Pantheon`;
  const summary =
    width === "focused"
      ? `A collection of deities focused on the domain of ${domain.toLowerCase()} bound by the theme of ${conflictTheme.toLowerCase()} in a ${genre.toLowerCase()} world.`
      : width === "wide"
        ? `A wide mythic collection of deities representing various domains, bound by the theme of ${conflictTheme.toLowerCase()} in a ${genre.toLowerCase()} world.`
        : `A collection of deities bound by the theme of ${conflictTheme.toLowerCase()} in a ${genre.toLowerCase()} world with ${domain.toLowerCase()} at its center.`;

  const deityCount = sizeCfg.min;
  const deityNames = Array.from({ length: deityCount }, () =>
    generateName(rng),
  );

  const pantheonOrigins = [
    `According to legend, the deities of this pantheon were born from a single cosmic event. Under the theme of ${conflictTheme.toLowerCase()}, they divide the control of the cosmos between their spheres of influence.`,
    `The oldest texts describe these deities emerging not at the beginning of time but at its first break — the moment when ${conflictTheme.toLowerCase()} entered the cosmos and forced a division of responsibility.`,
    `These deities did not create the world. They arose from it, shaped by the theme of ${conflictTheme.toLowerCase()} that already ran through everything. Their domains reflect what the cosmos needed to be governed, not what they chose.`,
    `The origin of this pantheon is disputed by the sects that follow it. What all accounts agree on is that the theme of ${conflictTheme.toLowerCase()} preceded the deities — they are its expression, not its authors.`,
    `Myths describe these deities forming a compact in response to a threat the cosmos could not survive without cooperation. The theme of ${conflictTheme.toLowerCase()} is the scar that compact left on everything that followed.`,
  ] as const;

  let content = `### Origin & Dogma
${pickFrom(pantheonOrigins, rng)}

### Pantheon Structure
The pantheon consists of ${deityCount} deities:
${deityNames
  .map(
    (n, i) =>
      `${i + 1}. **${n}**: ${
        width === "focused"
          ? `Controls a specific aspect of the ${domain.toLowerCase()} domain (e.g. ${
              i === 0
                ? "its pure essence"
                : i === deityCount - 1
                  ? "its quiet or hidden aspects"
                  : "its active or aggressive expression"
            }).`
          : width === "wide"
            ? `Controls a distinct mythic domain (e.g. ${
                i === 0
                  ? `the domain of ${domain.toLowerCase()}`
                  : i === 1
                    ? "wildlands and travel"
                    : i === 2
                      ? "dreams and shadows"
                      : "hearth and community"
              }).`
            : i === 0
              ? `Represents the domain of ${domain}.`
              : i === deityCount - 1
                ? "A neutral arbiter holding the balance."
                : "Controls opposing forces of the cosmos."
      }`,
  )
  .join("\n")}

### Divine Alliances & Rivalries
- **${deityNames[0]}** is allied with **${deityNames[deityNames.length - 1]}**, but stands in direct opposition to **${deityNames[1]}**.
- **${deityNames[1]}** seeks to overthrow the established order of the other deities.`;

  if (campaignContext) {
    content += `\n\n### Influence of Campaign Context\nIn this campaign setting (${campaignContext}), the struggles of the pantheon are reflected in the shifting boundaries of the mortal kingdoms.`;
  }

  const lore = `### At a Glance
- **Pantheon Name**: ${pantheonTitle}
- **Conflict Theme**: ${conflictTheme}
- **Worshippers**: ${worshipperType}
- **Hidden Problem**: An ancient prophecy predicts that one of the deities will fall, destabilizing the entire celestial hierarchy.
- **Immediate Hook**: Omens of celestial alignment have sent local cults into a frenzy of preparations.

### Deities of the Pantheon
${deityNames
  .map(
    (n, i) =>
      `- **${n}**: ${
        width === "focused"
          ? `The deity representing a key facet of ${domain.toLowerCase()}${
              i === 0
                ? ", depicted as a guardian/warrior."
                : i === 1
                  ? ", representing the shadow or depth of the sphere."
                  : ", guarding the balance/transition points."
            }`
          : width === "wide"
            ? `The deity governing ${
                i === 0
                  ? domain.toLowerCase()
                  : i === 1
                    ? "wildlands and travel"
                    : i === 2
                      ? "dreams and shadows"
                      : "hearth and community"
              }.`
            : i === 0
              ? `The deity of ${domain}, depicted as a warrior.`
              : i === 1
                ? "A mysterious spirit of chaos and shadows."
                : "An ancient ancestor guarding the gates of death."
      }`,
  )
  .join("\n")}

### Clergy & Temples
- **Clergy Roles**: The High Hierophant oversees the circle of priests, who are divided into keepers of rites and speakers of prophecy.
- **Temples & Shrines**: Grand stone cathedrals are located in capital cities, while simple stone altars mark major crossroads.

### Rumours & Legends
- A forgotten temple of the pantheon lies submerged under the local lake.
- The high priests of the deities are secretly meeting to avert a holy war.

### Entity Seeds
- **👥 ${worshipperType}**: A major temple order or mystery cult dedicated to the worship of the pantheon.`;

  return {
    type: "faction",
    title: pantheonTitle,
    summary,
    content,
    lore,
    labels: ["rpg-pantheon", "pantheon-generator", "imported-draft"],
    status: "active",
  };
}
