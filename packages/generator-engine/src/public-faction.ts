/**
 * Public Faction + Vampire Clan generators — framework-free port of the SEO
 * faction generator (`apps/web/src/lib/services/seo/generators/faction.ts`).
 *
 * Per the unification plan (#1351) this stays framework-free: no AI client, no
 * sessionStorage. The web page builds the prompt here, runs it through
 * aiClientManager, parses with the parse* helpers, and falls back to the
 * generate*Local helpers on failure. Session context is injected as a string.
 */

import type { PublicGeneratorOutput } from "./public-generator-adapters";
import { NAME_BAN_PROMPT } from "./public-npc";

export type Rng = () => number;
const defaultRng: Rng = () => Math.random();

function pickFrom<T>(arr: readonly T[], rng: Rng = defaultRng): T {
  return arr[Math.floor(rng() * arr.length)];
}

function generateName(rng: Rng = defaultRng): string {
  const prefixes = [
    "Ael",
    "Bran",
    "Cael",
    "Dax",
    "Kael",
    "Morg",
    "Thor",
    "Vael",
  ];
  const suffixes = ["dar", "wen", "ric", "mar", "thas", "gar", "rin", "on"];
  return `${pickFrom(prefixes, rng)}${pickFrom(suffixes, rng)}`;
}

// ---------------------------------------------------------------------------
// Config (ported verbatim from seo faction.ts)
// ---------------------------------------------------------------------------

export const factionConfig = {
  themes: [
    "Classic Fantasy",
    "Cyberpunk / Corporate",
    "Vampire / Gothic Noir",
    "Sci-Fi / Space Opera",
    "Modern Conspiracy",
    "Post-Apocalyptic",
    "Western / Frontier",
    "Steampunk",
    "Lancer",
    "Space Opera Resistance",
    "Optimistic Exploration Sci-Fi",
  ],
  types: [
    "Merchant Guild",
    "Secret Society",
    "Mercenary Company",
    "Temple Order",
    "Criminal Syndicate",
    "Rebel Cell",
    "Arcane Circle",
    "Guild Cartel",
    "Airship Consortium",
    "Aetheric Research Order",
    "Imperial Intelligence Bureau",
    "Underclass Rebel Cell",
    "Union Rapid Response Unit",
    "Heterodox Mech Corps",
    "NHP Research Consortium",
    "Colonial Liberation Front",
    "Corporate Extraction Crew",
    "Imperial Authority",
    "Mystic Order",
    "Smuggler Syndicate",
    "Imperial Fleet",
    "Resistance Cell",
    "Planetary Guild",
    "Federated Science Directorate",
    "Planetary Council",
    "Border System Power",
    "Splinter Ideological Movement",
  ],
  scopes: [
    "Local district",
    "Single city",
    "Border region",
    "Trade route",
    "Hidden stronghold",
    "Kingdom-wide network",
  ],
  alignments: [
    "Publicly lawful, privately ruthless",
    "Idealistic but compromised",
    "Pragmatic and profit-driven",
    "Fanatical and secretive",
    "Protective of common folk",
    "Opportunistic and divided",
  ],
  goals: [
    "Control a contested trade route before a rival power does.",
    "Recover a forbidden relic buried beneath a civic landmark.",
    "Replace corrupt officials with loyal agents.",
    "Protect a hidden sanctuary from outside discovery.",
    "Break an old treaty that limits their expansion.",
    "Expose a rival faction's crimes without revealing their own.",
  ],
  conflicts: [
    "A splinter leader is selling secrets to an enemy.",
    "Their public mission conflicts with the methods they use at night.",
    "A recent victory created debts they cannot repay.",
    "Their patron has vanished, leaving rival lieutenants in charge.",
    "A hostage, ledger, or relic could unravel their legitimacy.",
    "Their members disagree over whether the party is useful or dangerous.",
  ],
  hooks: [
    "They hire the party for a simple delivery that is actually a loyalty test.",
    "They ask for protection during a meeting with a bitter rival.",
    "They offer information about a villain in exchange for public help.",
    "They frame the party to force them into negotiation.",
    "They need outsiders to enter a place their members are forbidden to visit.",
    "They ask the party to choose between two bad successors.",
  ],
};

export const themeIdToLabel: Record<string, string> = {
  fantasy: "Classic Fantasy",
  fantasy_dark: "Classic Fantasy",
  cyberpunk: "Cyberpunk / Corporate",
  cyberpunk_light: "Cyberpunk / Corporate",
  horror: "Vampire / Gothic Noir",
  horror_light: "Vampire / Gothic Noir",
  scifi: "Sci-Fi / Space Opera",
  scifi_light: "Sci-Fi / Space Opera",
  modern: "Modern Conspiracy",
  modern_dark: "Modern Conspiracy",
  apocalyptic: "Post-Apocalyptic",
  apocalyptic_light: "Post-Apocalyptic",
  western: "Western / Frontier",
  western_dark: "Western / Frontier",
  steampunk: "Steampunk",
  steampunk_dark: "Steampunk",
  lancer: "Lancer",
  lancer_light: "Lancer",
  "optimistic-exploration-sci-fi": "Optimistic Exploration Sci-Fi",
  "optimistic-exploration-sci-fi_dark": "Optimistic Exploration Sci-Fi",
};

export const vampireConfig = {
  archetypes: [
    "Aristocratic Court",
    "Occult Coven",
    "Predatory Brood",
    "Conspiring Syndicate",
    "Rebel Anarchs",
  ],
  bloodlines: [
    "Sanguine Nobles (Charismatic Mind-Benders)",
    "Shadow Stalkers (Nightmare Weavers)",
    "Blood Sorcerers (Occult Ritualists)",
    "Bestial Ravagers (Feral Predator Shapeshifters)",
    "Melancholic Artists (Aesthetes of Decay)",
  ],
  feedingHabits: [
    "High-Society Salons (Elite & Consent-based)",
    "Street Predation (Slums & Forgotten Alleys)",
    "Blood Trafficking (Black Market & Clinics)",
    "Occult Sacraments (Ritualistic & Sacrificial)",
    "Wild Wilderness Hunts (Deep Forests & Ruins)",
  ],
  weaknesses: [
    "Severe Sun Sensitivity (Burns instantly)",
    "Consecrated Ground Aversion (Cannot cross thresholds)",
    "Mirror & Reflection Absence (Exposes their nature)",
    "Decaying Physical Form (Needs fresh blood to look human)",
    "Silver & Wooden Vulnerability (Prevents regeneration)",
  ],
  scopes: [
    "Single city underbelly",
    "Hidden castle & border valley",
    "Trade route shadow network",
    "Metropolitan high society",
    "Continental shadow court",
  ],
  alignments: [
    "Strictly lawful, highly predatory",
    "Pragmatic and power-driven",
    "Feral, chaotic, and blood-fueled",
    "Secretive and ritual-obsessed",
    "Rebellious, seeking freedom from elders",
  ],
  goals: [
    "Infiltrate the city council and blood-bind key mortal leaders.",
    "Exhume the sarcophagus of their dormant Progenitor.",
    "Monopolize the local blood bank distribution network.",
    "Wipe out a rival werewolf pack or vampire hunters' cell.",
    "Reconstruct a shattered ancient chronicle of blood magic.",
  ],
  conflicts: [
    "The younger brood is planning a rebellion against the ancient elder.",
    "A feeding gone wrong has drawn the attention of mortal authorities.",
    "A rogue member has stolen a ledger detailing the clan's human farms.",
    "The blood supply is tainted by a mystical pathogen.",
    "An inquisitor has successfully tracked their primary haven.",
  ],
  hooks: [
    "A mysterious patron hires the party to deliver a sealed urn, which is a vampire ashes decoy.",
    "Locals ask the party to investigate a series of bloodless bodies found in the canal.",
    "A member of the clan offers to sell a list of high-profile vampire thralls in the city council.",
    "The clan captures the party and offers freedom in exchange for retrieving a relic from a sunlit temple.",
    "A dying vampire begs the party to protect their mortal family from their own sire.",
  ],
};

const FACTION_THEME_VOICE: Record<string, string> = {
  "Classic Fantasy":
    "medieval fantasy — guilds, nobles, arcane orders, political intrigue in a world of swords and sorcery",
  "Cyberpunk / Corporate":
    "near-future cyberpunk — megacorporations, street gangs, hackers, corporate espionage, neon-lit dystopia",
  "Vampire / Gothic Noir":
    "gothic horror — vampire covens, inquisitions, decadent aristocracy, forbidden rites, candlelit conspiracies",
  "Sci-Fi / Space Opera":
    "science fiction space opera — stellar federations, alien factions, interstellar trade, colony politics, advanced technology",
  "Modern Conspiracy":
    "modern-day thriller — intelligence agencies, secret societies, corporate conspiracies, hidden influence networks",
  "Post-Apocalyptic":
    "post-apocalyptic survival — scavenger tribes, wasteland cults, resource wars, collapsed civilisation, desperate factions",
  "Western / Frontier":
    "weird west or classic frontier — outlaws, lawmen, boomtowns, gold rushes, and harsh survival on the edge of civilization",
  Steampunk:
    "Victorian-era steampunk — guild cartels, airship consortiums, aetheric research orders, press-gang syndicates, imperial intelligence bureaux, and underclass rebel cells",
  Lancer:
    "Lancer RPG — Union rapid-response units, heterodox mech corps, NHP research consortiums, colonial liberation fronts, and corporate extraction crews operating across the Long Rim",
  "Space Opera Resistance":
    "pulpy galactic rebellion — rebel cells, imperial authorities, smuggler syndicates, ancient mystic orders, frontier guilds, and imperial fleets operating across desert worlds and occupied systems",
  "Optimistic Exploration Sci-Fi":
    "optimistic exploration sci-fi — federated councils, scientific directorates, peaceful integration, and complex diplomatic tension over ethical principles",
};

const FACTION_NAMING_STYLES = [
  "Name this faction after a material, substance, or natural phenomenon twisted to their purpose.",
  "Name this faction after an abstract concept, virtue, or doctrine — not a person or place.",
  "Use a short stark one-word name or a tight two-word compound (e.g. 'The Writ', 'Iron Accord').",
  "Base the faction name on a specific local landmark, street, district, or geographic feature.",
  "Name the faction after their founding secret, hidden method, or signature act.",
  "Use a name that sounds like a legitimate civic institution but carries a sinister undertone.",
  "Name the faction after a historical event, failed uprising, or forgotten figure from the setting.",
  "Give the faction a name derived from an unusual profession, trade, or craft.",
  "Use an archaic or invented word that evokes the faction's cultural roots.",
  "Name the faction after a symbol, emblem, or recurring motif associated with their work.",
];

const FACTION_NPC_NAMING_STYLES = [
  "Give each NPC a name that sounds distinctly local — not generic fantasy.",
  `Each NPC name should have an unusual phonetic texture. ${NAME_BAN_PROMPT}`,
  "Give each NPC a short street name or title that hints at their role — invent an original one, do not reuse common examples.",
  "Use names that suggest a specific cultural or ethnic origin consistent with the setting.",
  "Each NPC should have a name that is easy to say aloud at a gaming table.",
];

function factionBase(type: string, rng: Rng = defaultRng): string {
  const map: Record<string, string[]> = {
    "Merchant Guild": [
      "A bonded counting house whose ledgers are sealed by city charter",
      "A licensed exchange hall at the centre of the trade district",
      "A warehouse compound that no sheriff may enter without a writ",
    ],
    "Secret Society": [
      "A private dining club whose membership list is never committed to paper",
      "A decommissioned observatory reached through a hidden press in the library stacks",
      "Rotating safe houses connected by messenger-drop protocols",
    ],
    "Mercenary Company": [
      "A fortified barracks compound outside the city walls",
      "A charted garrison holding neutral ground between two rival lords",
      "A licensed inn that doubles as a staging ground for contract work",
    ],
    "Temple Order": [
      "A sanctified compound built above the sealed catacombs",
      "A pilgrimage waystation that doubles as an intelligence hub",
      "A charitable hospice whose basement holds restricted archives",
    ],
    "Criminal Syndicate": [
      "A legitimate bathhouse with soundproofed rooms below street level",
      "A moneylender's office whose public ledgers contain a second set of books",
      "A district of connected properties linked by sealed passages",
    ],
    "Rebel Cell": [
      "A print-house running two sets of accounts",
      "A disused chapel in a contested neighbourhood where records are rarely checked",
      "A network of sympathiser homes linked by a rotating code phrase",
    ],
    "Arcane Circle": [
      "A registered scholar's hall with warded inner chambers",
      "A cartographer's guild whose maps contain hidden notation systems",
      "A canal barge anchored in a dock district where manifests go uninspected",
    ],
    "Megacorporation Megagroup": [
      "A sealed corporate tower whose lower floors are open to the public and upper floors are not on any map",
      "A campus of linked facilities connected by private transit lines that bypass city checkpoints",
      "A data-centre compound in a legally ambiguous special economic zone",
    ],
    "Corporate Syndicate": [
      "A registered LLC with rotating directors and no fixed address",
      "A licensed private security firm that maintains offices in three jurisdictions simultaneously",
      "A shell company whose registered seat is a post-box in a compliant offshore district",
    ],
    "Hacker Collective": [
      "A distributed mesh of rented server nodes and anonymous relay points",
      "A legitimate ISP whose routing infrastructure doubles as a covert comms layer",
      "Rotating physical dead-drops in public infrastructure — lockers, charging stations, transit hubs",
    ],
    "Street Gang Alliance": [
      "A block of contested commercial units enforced by informal tax agreements",
      "A series of interconnected basement spaces beneath a market district",
      "A community centre operating with city permits while the basement handles other business",
    ],
    "Vampire Coven": [
      "A sealed private estate whose deed has not changed hands in three centuries",
      "A licensed sanatorium whose patient records are never released to outside authorities",
      "A labyrinthine wine cellar beneath a respectable merchant's townhouse",
    ],
    "Inquisition Watch": [
      "A fortified chapter-house adjacent to the civil courthouse",
      "A mobile tribunal that establishes temporary jurisdiction wherever the investigation leads",
      "A warded archive annexed to the city's oldest cathedral",
    ],
    "Stellar Federation Alliance": [
      "A neutral space station positioned at a strategically contested transit point",
      "A diplomatic compound on a contested colony world with extraterritorial status",
      "A fleet of registered humanitarian vessels that doubles as a mobile command structure",
    ],
    "Intelligence Agency": [
      "A nondescript government office building whose basement floors are not on the building plan",
      "A chain of legitimate consulting firms that share encrypted back-office infrastructure",
      "An embassy annex operating under diplomatic immunity",
    ],
    "Scavenger Tribe": [
      "A fortified salvage yard at the edge of a collapsed industrial zone",
      "A mobile convoy that claims no fixed territory but controls key supply corridors",
      "A series of hidden caches spread across a hundred kilometres of dead highway",
    ],
    "Wasteland Cult": [
      "A sealed compound built inside a pre-collapse water treatment facility",
      "A fortified hilltop site with sightlines across three days of travel in every direction",
      "A network of underground bunkers connected by service tunnels from before the collapse",
    ],
    "Guild Cartel": [
      "A chartered Guildhall whose brass-plated doors are sealed by imperial writ",
      "A foundry complex whose steam vents obscure the entrances to private meeting chambers",
      "A bonded patent office whose archive vaults hold the licensing papers for half the city's industry",
    ],
    "Airship Consortium": [
      "A mooring tower compound above the cloud line, accessible only by scheduled dirigible",
      "A registered sky-dock with private bays where manifests are submitted only to consortium ledgers",
      "A floating platform anchored above international waters where no city ordinance applies",
    ],
    "Aetheric Research Order": [
      "A sealed laboratory annexe beneath the Imperial Institute of Applied Sciences",
      "A decommissioned clocktower whose upper floors have been warded against surveillance",
      "A private scholarly estate whose library holds restricted aetheric formulae under charter lock",
    ],
    "Imperial Intelligence Bureau": [
      "A nondescript government building whose sub-basement floors appear on no architectural plan",
      "A chain of post offices operating under Crown warrant with encrypted dispatch infrastructure",
      "An embassy anteroom operating under diplomatic immunity with unrestricted cipher access",
    ],
    "Underclass Rebel Cell": [
      "A print shop running two sets of accounts behind a false boiler room wall",
      "A disused engine hall in the smog district where census officers rarely venture",
      "A network of tenement rooftops connected by signal lantern protocols",
    ],
    "Union Rapid Response Unit": [
      "A hardened forward operating base embedded in a contested colonial settlement",
      "A Union frigate holding geosynchronous orbit as a mobile command platform",
      "A decommissioned administrative compound repurposed under emergency Union charter",
    ],
    "Heterodox Mech Corps": [
      "An unregistered hangar on the Long Rim operating under a shell licensing agreement",
      "A salvage yard whose mech repair bays double as an unofficial tactical staging ground",
      "A mobile barge convoy that keeps no fixed port and answers no flag",
    ],
    "NHP Research Consortium": [
      "A shielded research station in a low-traffic transit corridor with restricted docking access",
      "A distributed server architecture spread across three systems under academic charter",
      "A sealed laboratory embedded within a Union university campus under dual-key access protocols",
    ],
    "Colonial Liberation Front": [
      "A network of sympathiser safe houses spread across a colonial outpost's residential district",
      "A fortified position in a contested bleed zone where Union authority is ambiguous",
      "A mobile cell structure with no fixed base and rotating comms encryption",
    ],
    "Corporate Extraction Crew": [
      "A legitimately registered subsidiary operating under a Union commercial licence",
      "A contracted security compound adjacent to a resource extraction site",
      "A private orbital platform registered to a shell entity in a non-Union jurisdiction",
    ],
    "Imperial Authority": [
      "A gleaming sector-command spire projecting force across the capital city",
      "A fortified garrison built on the ruins of the planet's previous democratic parliament",
      "A mobile orbital command station enforcing blockades and custom checks",
    ],
    "Mystic Order": [
      "An ancient, hidden temple carved into the cliffs of a remote desert world",
      "A meditation chamber disguised as a humble merchant's quarters",
      "The ruins of a once-great academy now swallowed by the jungle",
    ],
    "Smuggler Syndicate": [
      "A crowded, lawless cantina built into a hollowed-out asteroid",
      "A modular docking bay that constantly changes configuration to confuse inspectors",
      "A rusted freighter graveyard that hides a fully operational black market",
    ],
    "Imperial Fleet": [
      "A massive dreadnought hanging ominously in the sky above the colony",
      "A sprawling orbital shipyard strictly off-limits to civilian traffic",
      "A blockade flotilla enforcing a quarantine over a restive system",
    ],
    "Resistance Cell": [
      "A subterranean bunker beneath a bustling starport",
      "A repurposed deep-space communications relay hiding in plain sight",
      "A makeshift camp hidden within the wreckage of an old capital ship",
    ],
    "Planetary Guild": [
      "A massive industrial processing plant where laborers toil under heavy surveillance",
      "The polished halls of a merchant consortium that dictates planetary trade laws",
      "A tightly guarded mining colony built into the ice of a frozen moon",
    ],
  };
  return pickFrom(
    map[type] ?? [
      "A neutral facility whose access is controlled and whose records are not shared",
      "A licensed premises that provides cover for activities conducted elsewhere",
      "A distributed network of locations with no single point of failure",
    ],
    rng,
  );
}

function factionResource(type: string, rng: Rng = defaultRng): string {
  const map: Record<string, string[]> = {
    "Merchant Guild": [
      "Exclusive trade licences, bonded debts, and letters of introduction that open every city gate",
      "Commodity price information days before it reaches the open market",
      "Certified seals of provenance that determine what goods may legally change hands",
    ],
    "Secret Society": [
      "Compromising knowledge distributed in sealed fragments held by separate members",
      "A curated register of favours owed by officials, merchants, and clergy",
      "Access to a network of false identities and safe-passage routes",
    ],
    "Mercenary Company": [
      "Contractual access to trained soldiers who ask no political questions",
      "Neutral enforcement services hired by every side of every dispute",
      "An archive of battlefield contracts that constitute decades of political leverage",
    ],
    "Temple Order": [
      "Exclusive rights over burial rites, confessions, and civic oaths",
      "A pharmaceutical supply chain running through the charitable district",
      "Institutional immunity protecting their premises from search or seizure",
    ],
    "Criminal Syndicate": [
      "Control over the city's informal credit markets and enforcement ecosystem",
      "Detailed knowledge of every patrol route, informant, and magistrate's price",
      "A distribution network for restricted goods running through legitimate storefronts",
    ],
    "Rebel Cell": [
      "A verified printing and distribution network for prohibited materials",
      "Contacts embedded in the guard, the census office, and the merchant registry",
      "Secure courier routes that move people, messages, and contraband past checkpoints",
    ],
    "Arcane Circle": [
      "Proprietary ritual techniques licensed to no outside practitioner",
      "A sealed archive of magical precedents that defines what is legally permitted",
      "Controlled access to rare components that no other supplier will touch",
    ],
    "Megacorporation Megagroup": [
      "Patent portfolios, regulatory capture, and the ability to rewrite local law through lobbying",
      "A private security force larger than the city police and legally permitted to operate with fewer constraints",
      "Exclusive contracts with critical infrastructure — power, water, data, transit",
    ],
    "Corporate Syndicate": [
      "Shell-company ownership of key residential and commercial properties across the district",
      "Leveraged debt held against every small business in the target sector",
      "Proprietary logistics infrastructure that competitors cannot access without their permission",
    ],
    "Hacker Collective": [
      "Zero-day exploits, surveillance backdoors, and access to every networked system in the city",
      "A distributed archive of intercepted communications from every major institution",
      "The ability to make anyone's digital identity disappear — or reappear differently",
    ],
    "Street Gang Alliance": [
      "Control of informal economies: protection, distribution, and dispute resolution in three districts",
      "Detailed knowledge of every surveillance blind spot, patrol schedule, and officer price",
      "Loyalty networks that extend into city maintenance, transit, and low-level civil service",
    ],
    "Vampire Coven": [
      "Centuries of accumulated wealth, property, and blackmail material on every notable family",
      "The ability to alter memory, compel testimony, and move unseen through any social tier",
      "A network of thralls embedded in the city's legal, medical, and religious institutions",
    ],
    "Inquisition Watch": [
      "Legal authority to detain, interrogate, and seize assets without civil court oversight",
      "An archive of confessions, heresies, and crimes dating back three generations",
      "Jurisdiction that supersedes local law in matters defined — broadly — as spiritual threat",
    ],
    "Stellar Federation Alliance": [
      "Trade route licensing, customs authority, and the right to impose blockades under federation charter",
      "A shared military asset pool that member states cannot individually match",
      "Diplomatic recognition that determines which colonies and stations are treated as sovereign",
    ],
    "Intelligence Agency": [
      "Surveillance infrastructure covering communications, financial transactions, and physical movement",
      "Classified leverage on every significant political, corporate, and criminal actor in the region",
      "The legal authority to classify, redact, and deny — which is effectively the power to erase events",
    ],
    "Scavenger Tribe": [
      "Access to pre-collapse technology caches and the knowledge to operate what others cannot",
      "Control of the only reliable route through a stretch of dead territory",
      "A repair and fabrication capability that no other group in the region can match",
    ],
    "Wasteland Cult": [
      "Clean water, food stockpiles, and medical supplies — distributed exclusively to the faithful",
      "A coherent ideology that provides meaning in a world without institutions",
      "Armed enforcers who believe completely in what they are protecting",
    ],
    "Guild Cartel": [
      "Imperial patent licences and the legal authority to shut down any non-licensed operation in the city",
      "Exclusive access to aetheric components that no independent artificer can source elsewhere",
      "A bonded ledger of guild debts and performance bonds that constitute leverage over every major manufacturer",
    ],
    "Airship Consortium": [
      "Control over the only viable air-freight routes connecting the major industrial cities",
      "A fleet of armed courier vessels whose cargo manifests are never opened by customs officers",
      "Exclusive mooring rights at key aetheric refuelling stations across the continent",
    ],
    "Aetheric Research Order": [
      "Proprietary aetheric formulae that determine what weapons, engines, and medicines the Empire can produce",
      "A sealed research archive whose contents the Imperial Ministry does not fully understand but cannot afford to lose",
      "Controlled access to refined aetheric ore — the fuel for every advanced engine in the known world",
    ],
    "Imperial Intelligence Bureau": [
      "Surveillance infrastructure covering telegram traffic, financial ledgers, and courier routes across the Empire",
      "Classified leverage on every significant guild factor, colonial administrator, and opposition figure",
      "The legal authority to classify, seal, and deny — which is effectively the power to erase inconvenient events",
    ],
    "Underclass Rebel Cell": [
      "A verified pamphlet and broadsheet distribution network that reaches every engine-district tenement",
      "Contacts embedded in the factory floor, the census office, and the guild apprentice registry",
      "Secure courier routes through the smog tunnels that move people, messages, and contraband past company checkpoints",
    ],
    "Union Rapid Response Unit": [
      "Union-backed supply chains, medical infrastructure, and legal authority that no colonial faction can legally refuse",
      "Rapid deployment assets — carriers, mechs, and specialist personnel — that can be on-site within hours of authorisation",
      "The legal standing to classify, commandeer, and redefine the operational context of any contested situation",
    ],
    "Heterodox Mech Corps": [
      "Unlicensed mech frames jury-rigged from salvage, running subsystems that Union doesn't officially recognise",
      "A roster of pilots with bleed tolerance above standard clearance and no intention of disclosing it",
      "Supply contracts with three different factions, none of whom know about the other two",
    ],
    "NHP Research Consortium": [
      "Cascaded NHP assets operating at the legal edge of Union containment protocols",
      "Proprietary data on non-human cognition that no other institution in the sector has replicated",
      "Leverage over every organisation that has ever quietly used their NHP consultation services",
    ],
    "Colonial Liberation Front": [
      "Deep roots in the local population — every safe house, every supply cache, every sympathiser is a local",
      "Firsthand knowledge of Union administrative failures that make for devastating public documentation",
      "Enough field-stripped and improvised hardware to make any contested zone expensive to hold",
    ],
    "Corporate Extraction Crew": [
      "Proprietary extraction technology and the contracts that legally entitle them to use it",
      "A Union-adjacent legal team whose job is to ensure every operation remains just inside the line",
      "Leverage over the colonial administrator who approved the contract in the first place",
    ],
    "Imperial Authority": [
      "Absolute legal authority and the overwhelming military force required to back it up",
      "An expansive network of informants, spies, and surveillance drones",
      "Control over the planetary defense grid and all orbital traffic",
    ],
    "Mystic Order": [
      "Ancient texts, relics, and lost techniques of an energy-manipulating discipline",
      "A hidden network of sympathizers who revere the old ways",
      "Deeply honed intuition and combat skills that defy modern weaponry",
    ],
    "Smuggler Syndicate": [
      "Secret hyper-routes and hyperdrive modifications that bypass imperial checkpoints",
      "Counterfeit clearance codes and bribed imperial customs officials",
      "A vast fleet of unregistered, heavily modified blockade runners",
    ],
    "Imperial Fleet": [
      "Capital ships capable of glassing a continent from orbit",
      "Endless waves of disciplined troopers and standardized fighter squadrons",
      "Complete control over interstellar communications relays",
    ],
    "Resistance Cell": [
      "Stolen imperial codes, intercepted transmissions, and encrypted frequencies",
      "The fierce loyalty of the oppressed populace who provide safe harbor",
      "Sabotage equipment, stolen ordnance, and a willingness to die for the cause",
    ],
    "Planetary Guild": [
      "Exclusive control over the extraction and refinement of a rare hyper-fuel",
      "Deep pockets and the ability to lobby or bribe imperial governors",
      "A monopoly on off-world transport for civilian goods",
    ],
  };
  return pickFrom(
    map[type] ?? [
      "Specialised knowledge or access that no other group in the region controls",
      "A network of obligations, debts, and dependencies too entangled to cut cleanly",
      "Control of a single critical resource that everyone else needs to function",
    ],
    rng,
  );
}

// ---------------------------------------------------------------------------
// Faction public API
// ---------------------------------------------------------------------------

export interface FactionGeneratorOptions {
  type?: string;
  scope?: string;
  alignment?: string;
  campaignContext?: string;
  theme?: string;
}

interface ResolvedFaction {
  theme: string;
  factionType: string;
  scope: string;
  alignment: string;
  campaignContext?: string;
  name: string;
}

function resolveFaction(
  options: FactionGeneratorOptions,
  rng: Rng,
): ResolvedFaction {
  return {
    theme: options.theme || factionConfig.themes[0],
    factionType: options.type || pickFrom(factionConfig.types, rng),
    scope: options.scope || pickFrom(factionConfig.scopes, rng),
    alignment: options.alignment || pickFrom(factionConfig.alignments, rng),
    campaignContext: options.campaignContext?.trim() || undefined,
    name: `${generateName(rng)} Compact`,
  };
}

export interface FactionPrompt {
  systemInstruction: string;
  userMessage: string;
  resolved: ResolvedFaction;
}

export function buildFactionPrompt(
  options: FactionGeneratorOptions = {},
  sessionContext = "",
  rng: Rng = defaultRng,
): FactionPrompt {
  const resolved = resolveFaction(options, rng);
  const { theme, factionType, scope, alignment, campaignContext } = resolved;
  const voice = FACTION_THEME_VOICE[theme] ?? "tabletop RPG";
  const chosenNamingStyle = pickFrom(FACTION_NAMING_STYLES, rng);
  const chosenNpcStyle = pickFrom(FACTION_NPC_NAMING_STYLES, rng);
  const varianceSeed = Math.floor(rng() * 99991) + 10;

  const systemInstruction = `You are an expert RPG campaign writer specialising in ${voice}. You generate detailed, original faction drafts for that setting in JSON format.

OUTPUT FORMAT — return ONLY a valid JSON object, no markdown fences:
{
  "title": "Faction name (follow the naming directive in the user message)",
  "summary": "One sentence: what this faction is and what makes them interesting (e.g. 'A sanitation cult-technocracy that controls clean water in a poisoned city.').",
  "content": "Markdown. Use exactly these four section headers in order: '### What they control', '### What they want', '### Why they are dangerous', '### How to use them at the table'. Each section: 2-4 tight sentences. Include campaign context if provided.",
  "lore": "Markdown. Use EXACTLY this structure with ### headers and '- **Label**: Value' list items:\\n### At the Table\\n- **📍 Base**: specific named location\\n- **Resource**: what they control that others need\\n- **Symbol**: identifying mark or emblem\\n- **Secret**: hidden truth that would destroy them\\n- **Immediate Hook**: one-sentence GM hook\\n### Notable NPCs\\n- **👤 Name**: one-line description (2-3 NPCs)\\n### Internal Conflict\\none paragraph\\n### Rival Faction\\n- **👥 Name**: one-line rivalry",
  "labels": ["2-5 lowercase tags for the faction's theme and activities, plus 'rpg-faction', 'faction-generator', 'imported-draft'"]
}

QUALITY RULES:
- Every generation must feel like a completely different faction — avoid repeating names, concepts, or structures from prior outputs.
- Avoid generic RPG naming clichés (no 'Gilded Ledger', 'Iron Brotherhood', 'Shadow Hand', etc.).
- ${NAME_BAN_PROMPT}
${sessionContext}
- Before finalising, silently critique for: name originality, internal consistency (NPCs don't contradict each other), logical alignment between public face and secret agenda. Rewrite if issues found.`;

  const userMessage = `Generate a faction. Variation seed: ${varianceSeed}.
- Theme/Genre: ${theme}
- Faction Type: ${factionType}
- Scope: ${scope}
- Moral Posture: ${alignment}${campaignContext ? `\n- Campaign Context: ${campaignContext}` : ""}
- Faction Naming Directive: ${chosenNamingStyle}
- NPC Naming Directive: ${chosenNpcStyle}`;

  return { systemInstruction, userMessage, resolved };
}

export function parseFactionResponse(
  text: string,
  resolved: ResolvedFaction,
): PublicGeneratorOutput {
  const cleanText = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/```$/, "")
    .trim();
  const data = JSON.parse(cleanText);
  return {
    type: "faction",
    title: data.title || resolved.name,
    summary: data.summary || "",
    content: data.content || "",
    lore: data.lore || "",
    labels: Array.isArray(data.labels)
      ? data.labels
      : ["rpg-faction", "faction-generator", "imported-draft"],
    status: "active",
  };
}

export function generateFactionLocal(
  options: FactionGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const { factionType, scope, alignment, campaignContext, name } =
    resolveFaction(options, rng);
  const goal = pickFrom(factionConfig.goals, rng);
  const conflict = pickFrom(factionConfig.conflicts, rng);
  const hook = pickFrom(factionConfig.hooks, rng);
  const rival = `${generateName(rng)} Covenant`;
  const leader = generateName(rng);
  const agent = generateName(rng);

  const summary = `A ${alignment.toLowerCase()} ${factionType.toLowerCase()} operating at the ${scope.toLowerCase()} level.`;

  const content = `### What they control
${name} is a ${factionType.toLowerCase()} with a firm grip on key resources across the ${scope.toLowerCase()}. Their reach is felt in every trade deal, guarded rumor, and carefully placed favor.${campaignContext ? ` In ${campaignContext}, they already have fingers in the most contested disputes.` : ""}

### What they want
${goal} Every action the faction takes, however charitable it appears, serves this underlying drive.

### Why they are dangerous
${conflict} Beyond their internal tensions, they will negotiate before striking — but they do not forget.

### How to use them at the table
Bring ${name} into play when the party needs leverage, pressure, a sponsor, or a rival who can operate in daylight. They reward players who deal in favors and punish those who make public enemies.`;

  const lore = `### At the Table
- **📍 Base**: ${factionBase(factionType, rng)}
- **Resource**: ${factionResource(factionType, rng)}
- **Symbol**: ${name.split(" ")[0]} iconography worn by inner-circle members
- **Secret**: ${conflict}
- **Immediate Hook**: ${hook}

### Notable NPCs
- **👤 ${leader}**: Public face who insists every deal serves the common good.
- **👤 ${agent}**: Field operative who knows where the faction buries its failures.

### Internal Conflict
${conflict}

### Rival Faction
- **👥 ${rival}**: Pursuing the same influence, relic, or route — and will reach it first if the party does nothing.`;

  return {
    type: "faction",
    title: name,
    summary,
    content,
    lore,
    labels: ["rpg-faction", "faction-generator", "imported-draft"],
    status: "active",
  };
}

// ---------------------------------------------------------------------------
// Vampire Clan public API
// ---------------------------------------------------------------------------

export interface VampireGeneratorOptions {
  archetype?: string;
  bloodline?: string;
  feedingHabit?: string;
  weakness?: string;
  scope?: string;
  alignment?: string;
  campaignContext?: string;
}

interface ResolvedVampire {
  archetype: string;
  bloodline: string;
  feedingHabit: string;
  weakness: string;
  scope: string;
  alignment: string;
  campaignContext?: string;
  name: string;
}

function resolveVampire(
  options: VampireGeneratorOptions,
  rng: Rng,
): ResolvedVampire {
  const prefixes = ["House ", "The ", "Covenant of ", "Order of ", "Clan "];
  const roots = [
    "Dracul",
    "Karnstein",
    "Von Carstein",
    "Orlok",
    "Bathory",
    "Tepes",
    "Morbius",
    "Sanguis",
    "Vargo",
    "Ruthven",
  ];
  return {
    archetype: options.archetype || pickFrom(vampireConfig.archetypes, rng),
    bloodline: options.bloodline || pickFrom(vampireConfig.bloodlines, rng),
    feedingHabit:
      options.feedingHabit || pickFrom(vampireConfig.feedingHabits, rng),
    weakness: options.weakness || pickFrom(vampireConfig.weaknesses, rng),
    scope: options.scope || pickFrom(vampireConfig.scopes, rng),
    alignment: options.alignment || pickFrom(vampireConfig.alignments, rng),
    campaignContext: options.campaignContext?.trim() || undefined,
    name: pickFrom(prefixes, rng) + pickFrom(roots, rng),
  };
}

export interface VampirePrompt {
  systemInstruction: string;
  userMessage: string;
  resolved: ResolvedVampire;
}

export function buildVampirePrompt(
  options: VampireGeneratorOptions = {},
  sessionContext = "",
  rng: Rng = defaultRng,
): VampirePrompt {
  const resolved = resolveVampire(options, rng);
  const {
    name,
    archetype,
    bloodline,
    feedingHabit,
    weakness,
    scope,
    alignment,
    campaignContext,
  } = resolved;

  const userMessage = `Generate a detailed RPG vampire clan/faction in JSON format.
Options:
- Name: ${name}
- Clan Archetype: ${archetype}
- Bloodline: ${bloodline}
- Feeding Habit: ${feedingHabit}
- Clan Weakness: ${weakness}
- Scope of Influence: ${scope}
- Moral Posture: ${alignment}
${campaignContext ? `- Campaign Context: ${campaignContext}` : ""}

You must return a valid JSON object matching the following structure exactly:
{
  "title": "A single string for the vampire clan/house name",
  "content": "A detailed multi-paragraph overview (markdown formatted) describing its history, public facade in mortal society, dark haven, and how it fits the campaign context if provided.",
  "lore": "Structured GM details (markdown formatted). Use EXACTLY this structure with ### headers and '- **Label**: Value' list items:\n### GM Reference Information\n- **Faction Type**: Vampire Clan (archetype)\n- **Bloodline**: bloodline summary\n- **Scope**: scope of influence\n- **Moral Posture**: moral posture\n- **Feeding Habit**: feeding habit\n- **Clan Weakness**: weakness\n- **Entity Type**: Faction\n\n### Dark Agenda\none paragraph\n\n### Internal Conflict\none paragraph\n\n### Notable NPCs\n- **👤 Sire Name**: one-line description\n- **👤 Thrall Name**: one-line description\n\n### Rival Faction\n- **👥 Rival Name**: one-line rivalry summary\n\n### Adventure Hook\none paragraph",
  "labels": ["rpg-faction", "vampire-clan", "imported-draft"]
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

export function parseVampireResponse(
  text: string,
  resolved: ResolvedVampire,
): PublicGeneratorOutput {
  const cleanText = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/```$/, "")
    .trim();
  const data = JSON.parse(cleanText);
  return {
    type: "faction",
    title: data.title || resolved.name,
    summary: data.summary || "",
    content: data.content || "",
    lore: data.lore || "",
    labels: Array.isArray(data.labels)
      ? data.labels
      : ["rpg-faction", "vampire-clan", "imported-draft"],
    status: "active",
  };
}

export function generateVampireLocal(
  options: VampireGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const {
    archetype,
    bloodline,
    feedingHabit,
    weakness,
    scope,
    alignment,
    campaignContext,
    name,
  } = resolveVampire(options, rng);
  const goal = pickFrom(vampireConfig.goals, rng);
  const conflict = pickFrom(vampireConfig.conflicts, rng);
  const hook = pickFrom(vampireConfig.hooks, rng);
  const rival = `${generateName(rng)} Inquisition`;
  const sire = generateName(rng);
  const thrall = generateName(rng);

  const content = `### Overview
${name} is a powerful vampire clan of the ${bloodline.toLowerCase()} lineage, operating as a ${archetype.toLowerCase()} across ${scope.toLowerCase()}. They hide their predatory activities behind a carefully crafted mortal facade, manipulating events from the dark.

${campaignContext ? `### Campaign Fit\nUse ${name} in ${campaignContext}. Their influence should touch the local halls of power, forgotten catacombs, or ongoing dark mysteries.\n` : ""}### Public Facade
To the mortal world, members of ${name} present themselves as wealthy philanthropists, eccentric scholars, or influential patrons. Very few suspect that behind this elegant mask lies a highly organized coven of undead hunters.

### Table Use
Introduce ${name} when the party enters high-society intrigue, investigates occult occurrences, or needs a powerful but dangerous ally who demands blood or secrets as currency.`;

  const lore = `### GM Reference Information
- **Faction Type**: Vampire Clan (${archetype})
- **Bloodline**: ${bloodline}
- **Scope**: ${scope}
- **Moral Posture**: ${alignment}
- **Feeding Habit**: ${feedingHabit}
- **Clan Weakness**: ${weakness}
- **Entity Type**: Faction

### Dark Agenda
${goal}

### Internal Conflict
${conflict}

### Notable NPCs
- **👤 Sire ${sire}**: The ancient leader of the clan who has survived centuries of inquisitions and power struggles.
- **👤 Thrall ${thrall}**: A high-ranking mortal puppet who manages the clan's daytime assets and legal matters.

### Rival Faction
- **👥 The ${rival}**: Seeks to expose, purge, or take control of the secrets and assets held by ${name}.

### Adventure Hook
${hook}`;

  return {
    type: "faction",
    title: name,
    summary: "",
    content,
    lore,
    labels: ["rpg-faction", "vampire-clan", "imported-draft"],
    status: "active",
  };
}
