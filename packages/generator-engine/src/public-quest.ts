/**
 * Public Quest generator — framework-free port of the SEO quest generator
 * (`apps/web/src/lib/services/seo/generators/quest.ts`).
 *
 * Per the unification plan (#1351) this stays framework-free: no AI client, no
 * sessionStorage. The web page builds the prompt here, runs it through
 * aiClientManager, parses with parseQuestResponse, and falls back to
 * generateQuestLocal. Session context is injected as a string.
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
import { formatCampaignContextBlock } from "./campaign-context";
import { formatPublicScenarioConcept } from "./public-scenario-diversity";
import { INHABITANT_NAMES_BY_GENRE } from "./public-settlement-inhabitant-names";

export const themeToQuestGenre: Record<string, string> = {
  "Classic Fantasy": "Classic Fantasy",
  Pirate: "Pirate",
  "Cyberpunk / Corporate": "Cyberpunk",
  "Vampire / Gothic Noir": "Dark Fantasy",
  "Cosmic Horror": "Cosmic Horror",
  "Sci-Fi / Space Opera": "Sci-Fi",
  "Modern Conspiracy": "Political Intrigue",
  "Post-Apocalyptic": "Post-Apocalyptic",
  "Western / Frontier": "Western",
  Steampunk: "Steampunk",
  Lancer: "Lancer",
  "Space Opera Resistance": "Space Fantasy",
  "Optimistic Exploration Sci-Fi": "Optimistic Exploration Sci-Fi",
  "Space Western": "Space Western",
  "Superhero / Comic Book": "Superhero",
};

export function questGenreForTheme(theme: string): string {
  return themeToQuestGenre[theme] ?? theme;
}

/**
 * The themed pool for a quest genre. The themed records are keyed by vibe
 * label ("Cyberpunk / Corporate") while a quest carries its genre ("Cyberpunk"),
 * so the lookup goes through `questGenreForTheme`. Returns undefined when no
 * vibe maps to the genre, so callers fall back to the generic pool.
 */
export function themedQuestPool<T extends string>(
  record: Readonly<Record<string, readonly T[]>>,
  genre: string,
): readonly T[] | undefined {
  const key = Object.keys(record).find(
    (vibe) => questGenreForTheme(vibe) === genre,
  );
  return key ? record[key] : undefined;
}

export const questConfig = {
  genres: [
    "Classic Fantasy",
    "Pirate",
    "Dark Fantasy",
    "Political Intrigue",
    "Horror",
    "Cosmic Horror",
    "Comedy",
    "Steampunk",
    "Lancer",
    "Space Fantasy",
    "Optimistic Exploration Sci-Fi",
    "Space Western",
    "Superhero",
  ],
  tones: ["Heroic", "Gritty", "Mysterious", "Comedic", "Tragic"],
  tonesByTheme: {
    "Classic Fantasy": ["Heroic", "Gritty", "Mysterious", "Comedic", "Tragic"],
    Pirate: ["Swashbuckling", "Gritty", "Mysterious", "Heroic", "Ominous"],
    "Cyberpunk / Corporate": [
      "Noir",
      "Paranoid",
      "High-Octane",
      "Cynical",
      "Bleak",
    ],
    "Vampire / Gothic Noir": [
      "Dread",
      "Melancholic",
      "Sinister",
      "Brooding",
      "Tragic",
    ],
    "Sci-Fi / Space Opera": [
      "Epic",
      "Tense",
      "Mysterious",
      "Satirical",
      "Bleak",
    ],
    "Modern Conspiracy": ["Paranoid", "Tense", "Cynical", "Noir", "Bleak"],
    "Post-Apocalyptic": [
      "Gritty",
      "Desperate",
      "Bleak",
      "Defiant",
      "Melancholic",
    ],
    "Western / Frontier": [
      "Gritty",
      "Heroic",
      "Melancholic",
      "Tense",
      "Lawless",
    ],
    Steampunk: ["Intriguing", "Tense", "Grandiose", "Cynical", "Adventurous"],
    Lancer: ["Tense", "Bleak", "Desperate", "Clinical", "High-Octane"],
    "Space Opera Resistance": ["Heroic", "Desperate", "Pulpy", "Epic", "Tense"],
    "Optimistic Exploration Sci-Fi": [
      "Curious",
      "Diplomatic",
      "Philosophical",
      "Tense",
      "Utopian",
    ],
    "Cosmic Horror": [
      "Unsettling",
      "Investigative",
      "Dreamlike",
      "Claustrophobic",
      "Awe-struck",
    ],
    "Space Western": ["Gritty", "Desperate", "Lawless", "Tense", "Rowdy"],
    Superhero: [
      "Four-Color Heroic",
      "Street-Level Gritty",
      "Cynical & Cutting",
      "Cosmic & Epic",
      "Pulp Adventure",
    ],
  } as Record<string, string[]>,
  scopes: [
    "Local (village / district)",
    "Regional (kingdom / region)",
    "World-threatening",
  ],
  scopesByTheme: {
    "Classic Fantasy": [
      "Local (village / district)",
      "Regional (kingdom / region)",
      "World-threatening",
    ],
    Pirate: [
      "Single ship or port",
      "Island chain",
      "Regional sea",
      "Open-ocean route",
      "Naval theatre",
    ],
    "Cyberpunk / Corporate": [
      "Local (block / district)",
      "City-wide",
      "Corporate-scale",
    ],
    "Vampire / Gothic Noir": [
      "Local (neighbourhood / district)",
      "City-wide",
      "Ancient conspiracy",
    ],
    "Sci-Fi / Space Opera": [
      "Local (station / colony)",
      "Sector-wide",
      "Galaxy-threatening",
    ],
    "Modern Conspiracy": ["Local (city / district)", "National", "Global"],
    "Post-Apocalyptic": [
      "Local (settlement / zone)",
      "Regional (wasteland)",
      "Civilisation-scale",
    ],
    "Western / Frontier": [
      "Local (homestead / saloon)",
      "Town-wide (boomtown)",
      "Territory-scale (frontier)",
    ],
    Steampunk: ["Local (district / borough)", "City-wide", "Imperial-scale"],
    Lancer: [
      "Local (outpost / installation)",
      "Sector-wide (colonial theatre)",
      "Union-scale (interstellar mandate)",
    ],
    "Space Opera Resistance": [
      "Local (cantina / spaceport)",
      "Planetary (occupied world / system)",
      "Galactic (imperial-scale / rebellion)",
    ],
    "Optimistic Exploration Sci-Fi": [
      "Local (research outpost)",
      "System-wide (diplomatic dispute)",
      "Galaxy-spanning (precursor threat)",
    ],
    "Cosmic Horror": [
      "Single town or outpost",
      "Regional investigation",
      "Continental pattern",
      "Reality-threatening discovery",
    ],
    "Space Western": [
      "Local (settlement / saloon)",
      "Sector (asteroid belt / planetary system)",
      "Frontier-wide (inter-system conflict)",
    ],
    Superhero: [
      "Street-level (block / neighborhood)",
      "City-wide (metropolitan crisis)",
      "National (registration crisis)",
      "Global (crossover event)",
      "Cosmic (multiversal threat)",
    ],
  } as Record<string, string[]>,
  locationTypes: [
    "Ancient Dungeon",
    "Urban City",
    "Wilderness",
    "Cursed Ruin",
    "Coastal / Maritime",
    "Planar Realm",
  ],
  locationTypesByTheme: {
    "Classic Fantasy": [
      "Ancient Dungeon",
      "Cursed Ruin",
      "Wilderness",
      "Coastal / Maritime",
      "Feywild Crossing",
      "Dwarven Stronghold",
    ],
    Pirate: [
      "Dockside Port",
      "Hidden Cove",
      "Derelict Ship",
      "Island Ruin",
      "Naval Fort",
      "Storm-Wracked Sea",
    ],
    "Cyberpunk / Corporate": [
      "Corporate Tower",
      "Underground Market",
      "Abandoned Factory",
      "Neon District",
      "Off-Grid Settlement",
      "Server Farm",
    ],
    "Vampire / Gothic Noir": [
      "Gothic Cathedral",
      "Haunted Manor",
      "Ancient Crypt",
      "Fog-Shrouded Port",
      "Secret Society Hall",
      "Underground Passage",
    ],
    "Sci-Fi / Space Opera": [
      "Space Station",
      "Alien Planet",
      "Derelict Ship",
      "Research Outpost",
      "Jump Gate Hub",
      "Colony World",
    ],
    "Modern Conspiracy": [
      "Urban City",
      "Abandoned Warehouse",
      "Government Facility",
      "Safe House",
      "International Airport",
      "Dark Web Hub",
    ],
    "Post-Apocalyptic": [
      "Ruined City",
      "Wasteland Outpost",
      "Vault / Bunker",
      "Irradiated Zone",
      "Raider Stronghold",
      "Pre-War Archive",
    ],
    "Western / Frontier": [
      "Dusty Boomtown",
      "Abandoned Gold Mine",
      "Remote Homestead",
      "Canyon Hideout",
      "Frontier Fort",
      "Railroad Station",
    ],
    Steampunk: [
      "Airship Dock",
      "Factory Floor",
      "Aetheric Laboratory",
      "Guild Vault",
      "Imperial Dirigible",
      "Smog-Shrouded Tenement",
    ],
    Lancer: [
      "Mech Hangar",
      "Bleed Zone Perimeter",
      "Colonial Outpost",
      "Union Administrative Hub",
      "NHP Containment Facility",
      "Debris Field Salvage Site",
    ],
    "Space Opera Resistance": [
      "Smuggler Cantina",
      "Imperial Detention Block",
      "Hidden Rebel Base",
      "Ancient Mystic Temple",
      "Desert Moisture Farm",
      "Orbital Battle Station",
    ],
    "Optimistic Exploration Sci-Fi": [
      "Starship Bridge",
      "Alien Ruins",
      "Embassy Station",
      "Precursor Vault",
      "Research Laboratory",
      "Terraforming Colony",
    ],
    "Cosmic Horror": [
      "Remote Observatory",
      "Flooded Archive",
      "Isolated Coastal Town",
      "Abandoned Expedition Camp",
      "University Collection",
      "Impossible Ruin",
    ],
    "Space Western": [
      "Dust-Bowl Mining Camp",
      "Hollowed Asteroid Saloon",
      "Decommissioned Orbital Gantry",
      "Arid Canyon Hideout",
      "Smuggler Way-Station",
      "Volcanic Moon Caldera",
    ],
    Superhero: [
      "Skyscraper Headquarters",
      "Villain's Hidden Lair",
      "Press Conference Stage",
      "Disaster Zone",
      "Research Campus",
      "Hero Rooftop Network",
      "City Courthouse",
      "Orbital Platform",
    ],
  } as Record<string, string[]>,
  threats: [
    "Monstrous Creature",
    "Corrupt Villain",
    "Rival Faction",
    "Ancient Curse",
    "Natural Disaster",
    "Betrayal from Within",
  ],
  threatsByTheme: {
    "Classic Fantasy": [
      "Monstrous Creature",
      "Corrupt Noble",
      "Rival Adventuring Party",
      "Ancient Curse",
      "Undead Rising",
      "Dragon's Influence",
    ],
    Pirate: [
      "Rival Pirate Crew",
      "Naval Blockade",
      "Ghost Ship",
      "Sea Monster",
      "Mutiny",
      "Cursed Treasure",
    ],
    "Cyberpunk / Corporate": [
      "Rogue AI",
      "Corporate Extraction Team",
      "Street Gang",
      "Data Breach",
      "Corrupt Official",
      "Megacorp Rival",
    ],
    "Vampire / Gothic Noir": [
      "Elder Vampire",
      "Werewolf Pack",
      "Inquisitor",
      "Ancient Blood Curse",
      "Rival Bloodline",
      "Cult of the Damned",
    ],
    "Sci-Fi / Space Opera": [
      "Alien Threat",
      "Rogue AI",
      "Pirate Fleet",
      "Ancient Weapon System",
      "Galactic Bureaucracy",
      "Rival Faction",
    ],
    "Modern Conspiracy": [
      "Shadow Organisation",
      "Corrupt Official",
      "Intelligence Agency",
      "Assassin Cell",
      "Corporate Cover-Up",
      "Whistleblower Hunt",
    ],
    "Post-Apocalyptic": [
      "Raider Warlord",
      "Mutant Creature",
      "Resource War",
      "Faction Power Struggle",
      "Rogue Automaton",
      "Plague Outbreak",
    ],
    "Western / Frontier": [
      "Outlaw Gang",
      "Corrupt Sheriff",
      "Railroad Baron",
      "Rival Claim Jumper",
      "Bounty Hunter Turned Predator",
      "Desperate Homesteaders",
    ],
    Steampunk: [
      "Rogue Automaton",
      "Guild Conspiracy",
      "Imperial Suppression Force",
      "Sabotaged Aetheric Engine",
      "Rival Inventor",
      "Press-Gang Operation",
    ],
    Lancer: [
      "Cascaded NHP",
      "Corporate Extraction Force",
      "Colonial Insurgency",
      "Bleed Incursion",
      "Union Oversight Audit",
      "Rival Mech Lance",
    ],
    "Space Opera Resistance": [
      "Imperial Inquisitor",
      "Ruthless Bounty Hunter",
      "Syndicate Crime Boss",
      "Betrayal from Within",
      "Imperial Strike Fleet",
      "Ancient Dark Mystic",
    ],
    "Optimistic Exploration Sci-Fi": [
      "Misunderstood Alien Lifeform",
      "Rogue Artificial Intelligence",
      "Unstable Subspace Phenomenon",
      "Hostile Splinter Faction",
      "Ancient Planetary Defense System",
      "Temporal Distortion",
    ],
    "Cosmic Horror": [
      "Dream Contagion",
      "Missing Expedition",
      "Uncatalogued Artifact",
      "Impossible Geometry",
      "Secretive Research Society",
      "Tide-Bound Entity",
    ],
    Superhero: [
      "Supervillain Scheme",
      "Black-Ops Strike Team",
      "Rogue Former Ally",
      "Media Manipulation Campaign",
      "Cosmic-Scale Anomaly",
      "Corporate Power Grab",
      "Occult Collateral Ritual",
    ],
  } as Record<string, string[]>,
  hooks: [
    "A local official offers a reward to find a missing heir before a rival claims the title.",
    "Strange lights above the old tower have kept the village awake for three nights.",
    "A caravan was found empty on the road: no blood, no tracks, just silence.",
    "An imprisoned criminal offers the location of a cache in exchange for a pardon.",
    "A temple guardian collapses mid-ceremony, whispering a single forbidden name.",
    "A child wanders into town carrying an item that should not exist.",
  ],
  complications: [
    "The client is hiding their true motive: the real target is someone the party knows.",
    "The threat has already moved; the location the party was sent to is a decoy.",
    "A second party has been hired for the same job and has a head start.",
    "The threat is connected to a powerful patron who expects the party to look away.",
    "Completing the job requires breaking a law the party has respected until now.",
    "The reward will not be paid unless the job is done silently and officially denied.",
  ],
  twists: [
    "Villain is protecting something valuable",
    "Client's ally is the real enemy",
    "Location holds a campaign-changing secret",
    "Threat must be bargained with, not killed",
    "Party's own past caused this situation",
    "Two factions both claim the prize",
  ],
  twistsByTheme: {
    "Cosmic Horror": [
      "The evidence was planted by the phenomenon, not the antagonist",
      "The missing expedition returned before it left",
      "The anomaly is contained by a routine nobody understands",
      "The witness is accurate, but remembers a different version of the town",
      "Destroying the artefact removes the only warning before the next event",
      "The party's investigation is the final step in a long-running experiment",
    ],
    Superhero: [
      "The villain's demands turn out to rest on a legitimate grievance",
      "A secret identity nearly comes apart in front of the wrong witness",
      "The team's on-camera disagreement was staged to flush out a mole",
      "Rescuing every hostage means letting the real target escape",
      "A former ally resurfaces on the opposing side, and won't explain why",
      "The disaster was engineered specifically to force a hero's hand",
    ],
  } as Record<string, string[]>,
  rewards: [
    "Coin plus a local power's favor",
    "Deed to a useful property",
    "Access to a restricted archive",
    "A magic item from the site",
    "Valuable information from the client",
    "Respect from a previously hostile faction",
  ],
  rewardsByTheme: {
    "Classic Fantasy": [
      "Coin plus a noble's favour",
      "Deed to a useful property",
      "Access to a restricted archive",
      "A magic item from the site",
      "Valuable information from the client",
      "Respect from a previously hostile faction",
    ],
    Pirate: [
      "A share of recovered treasure and a safe harbour",
      "A ship's articles granting the crew a voice in its course",
      "A naval pardon or privateering charter",
      "A chart to an unclaimed island passage",
      "The loyalty of a rescued crew",
      "A relic recovered from a wreck beneath forbidden waters",
    ],
    "Cyberpunk / Corporate": [
      "Cred plus a fixer's contact",
      "Access codes to a restricted network",
      "Safe house deed",
      "Prototype gear from the site",
      "Intel on a powerful corp",
      "Street cred with a major gang",
    ],
    "Vampire / Gothic Noir": [
      "Gold and a blood-debt cleared",
      "A safe haven in the city",
      "Access to forbidden archives",
      "An artefact from the crypt",
      "Blackmail material on a noble",
      "Passage through enemy territory",
    ],
    "Cosmic Horror": [
      "The unredacted field report and the right to decide who reads it",
      "A calibrated instrument that detects the anomaly before it manifests",
      "Safe passage through a quarantined district",
      "Access to a sealed collection under strict custodial terms",
      "A survivor's testimony that resolves one critical contradiction",
      "A dependable contact in the archive or observatory",
    ],
    "Sci-Fi / Space Opera": [
      "Credits plus a nav contact",
      "Docking rights at a key station",
      "Access to a restricted database",
      "Salvaged tech from the site",
      "Intel on a rival faction",
      "Loyalty from a previously hostile crew",
    ],
    "Modern Conspiracy": [
      "Cash plus a government contact",
      "Access to a secure facility",
      "Safe identity documents",
      "Prototype tech from the site",
      "Intel on a shadow organisation",
      "Protection from a powerful agency",
    ],
    "Post-Apocalyptic": [
      "Supplies plus a settlement's protection",
      "Claim to a defensible location",
      "Access to pre-war tech",
      "Salvage rights to the site",
      "Intel on a raider stronghold",
      "Loyalty from a survivor faction",
    ],
    "Western / Frontier": [
      "Bounty gold plus a sheriff's favor",
      "Deed to a land claim or saloon",
      "Access to safe-passage routes",
      "Custom frontier gear or weapon",
      "Intel on an outlaw gang's stash",
      "Loyalty of a frontier community",
    ],
    Steampunk: [
      "Coin plus a guild factor's letter of introduction",
      "Patent licence to a useful device",
      "Access to a restricted aetheric archive",
      "A prototype engine component from the site",
      "Intel on a guild conspiracy",
      "Safe passage on a consortium airship",
    ],
    Lancer: [
      "Manna plus a Union logistics contact",
      "Salvage rights to a downed mech frame",
      "Access to a restricted NHP consultation archive",
      "Prototype licensed gear from the site",
      "Intel on a corporate extraction operation",
      "Union operational clearance for the next mission",
    ],
    "Space Opera Resistance": [
      "Credits and a smuggler's favor",
      "Coordinates to a hidden hyper-route",
      "An ancient mystic relic or crystal",
      "Stolen imperial clearance codes",
      "Intel on a critical imperial weakness",
      "A heavily modified blockade runner",
    ],
    "Optimistic Exploration Sci-Fi": [
      "Federation comms clearance",
      "Access to precursor databanks",
      "A permanent diplomatic envoy assignment",
      "Advanced sensor upgrades",
      "Safe passage through neutral space",
      "Alliance with a newly discovered species",
    ],
    Superhero: [
      "Public trust rebuilt, at least until the next headline",
      "A favor owed by someone with real institutional power",
      "Recovered villain tech too dangerous to sell but too useful to destroy",
      "An ally's loyalty, earned rather than assumed",
      "Access to a resource that raises the stakes for the next scheme",
      "A cleared name and a sealed incident report",
    ],
  } as Record<string, string[]>,
};

export interface QuestGeneratorOptions {
  genre?: string;
  tone?: string;
  scope?: string;
  locationType?: string;
  threat?: string;
  twist?: string;
  reward?: string;
  campaignContext?: string;
}

export interface ResolvedQuest {
  genre: string;
  tone: string;
  scope: string;
  locationType: string;
  threat: string;
  twist: string;
  reward: string;
  campaignContext?: string;
  npcName: string;
  questName: string;
}

export interface QuestHookPool {
  hooks: readonly string[];
  complications: readonly string[];
}

const PIRATE_HOOK_POOL: QuestHookPool = {
  hooks: [
    "A fragmented treasure chart has surfaced in a neutral port, but each piece is held by a different crew.",
    "A blockade has trapped a convoy of families and medicine ships behind a reef passage that only opens at low tide.",
    "A ghost vessel has returned without its crew, carrying a log that names the next ship it will claim.",
    "A captain was arrested under a false name, and the party must reach the prison island before the fleet sails.",
    "A mutiny is brewing aboard a ship whose articles protect both the crew and the captain who broke them.",
    "A sea-monster hunt is actually a rescue mission for sailors stranded on an island that appears only in storms.",
  ],
  complications: [
    "The chart is genuine, but following it violates a truce that keeps three ports from going to war.",
    "The naval officer offering the contract has quietly voided the crew's pardon.",
    "The rescued cargo belongs to a harbour community that cannot survive without it.",
    "A rival crew knows the party's route because one of the allies is trying to buy their own freedom.",
    "The apparent curse is tied to a real historical atrocity that the port's rulers want buried.",
    "The safest harbour is controlled by someone the party just betrayed at sea.",
  ],
};

const SUPERHERO_HOOK_POOL: QuestHookPool = {
  hooks: [
    "A live broadcast cuts to a villain's ultimatum that names the party by their civilian identities.",
    "A rescue goes right on camera, but the footage conveniently omits who caused the disaster in the first place.",
    "A rival hero team claims the case first, and their methods are not the party's own.",
    "An anonymous tip arrives with photographic proof of who really funded last month's catastrophe.",
    "A city council schedules an emergency vote on hero oversight, and someone wants the party's testimony tonight.",
    "A former mentor's costume turns up abandoned at the scene of a disaster no one has claimed.",
  ],
  complications: [
    "The villain's demands turn out to rest on a grievance the city has been ignoring for years.",
    "Stopping the scheme in public risks exposing a party member's secret identity for good.",
    "The press already has a narrative, and the truth does not fit it.",
    "Saving everyone in the building means letting the actual target walk away clean.",
    "The client offering the reward has their own reasons for wanting this handled quietly.",
    "A former ally turns up on the wrong side of the line, and refuses to explain why.",
  ],
};

const TECHNOLOGICAL_HOOK_POOL: QuestHookPool = {
  hooks: [
    "A corporate courier has gone dark with a shipment that the district's network is now hunting for.",
    "A city-wide outage has locked a client's vault, and the only person who can reopen it is a fugitive.",
    "An unregistered ship has docked at the relay station and is refusing every hail except one from the party's contact.",
    "A leaked memo names a dead engineer as the author of a system that is still running.",
    "The station's automated defences have started shutting down the wrong sectors, and no one can say why.",
    "A rival crew is selling stolen prototype drives, each carrying the same unfinished signal.",
  ],
  complications: [
    "The client who hired the party owns the company that built the system they are trying to disable.",
    "Every route off the station is watched, and the watchers report to the people the party is investigating.",
    "The engineer who could help is bound by a contract that forbids speaking to outsiders, and breaking it means a lethal implant.",
    "Fixing the fault will also switch off life support for an entire residential block.",
    "A second team has already copied the data and is offering to sell it to the party's rivals.",
    "The rescue signal is real, but it is being broadcast from a trap set to lure the party into a blackout.",
  ],
};

const OCCULT_HOOK_POOL: QuestHookPool = {
  hooks: [
    "A coven has asked the party to retrieve a relic from a vault that has not been opened since the last eclipse.",
    "Villagers who went into the old mine came out speaking in a voice that is not their own.",
    "A courier delivered a sealed box to the wrong address, and the recipient has not been seen since.",
    "A noble's portrait now shows a face that is slowly becoming the face of their heir.",
    "Every bell in the district rang at midnight, though the towers are empty and the bells were removed years ago.",
    "A cult member has confessed to a murder in a town that does not appear on any map.",
  ],
  complications: [
    "The ritual needs a living witness, and the only one who qualifies is someone the party has promised to protect.",
    "The relic is bound to the family that owns the vault, and breaking the seal will bring them back to claim it.",
    "The road the party is standing on was burned off every map last winter, so no one else will know to look for it.",
    "The patron seems calm about the danger because the danger is already inside the party's own camp.",
    "Attempting the rite in daylight costs the caster a year of memories, but the shadows only answer at dusk.",
    "The witnesses remember the event differently, and each version names a different party member as the culprit.",
  ],
};

const POLITICAL_HOOK_POOL: QuestHookPool = {
  hooks: [
    "A council vote on the disputed charter has been brought forward by three days, with no explanation given.",
    "A leaked letter shows that the city's treasurer has been paying a rival faction for information.",
    "A candidate for the regency was found dead in a locked carriage, and the coroner has since been replaced.",
    "The guild that keeps the harbour records has refused to release the ledgers from the last election.",
    "A journalist offers the party a dossier on the mayor, in exchange for proof that a key witness is still alive.",
    "A petition signed by every clerk in the guild names the party as the only intermediary they trust.",
  ],
  complications: [
    "The witness is protected by the same official the party needs to expose.",
    "Publishing the dossier would ruin an ally who funded the party's last job.",
    "Every faction in the city claims the evidence it wants the party to find is the one that will clear it.",
    "The clerks' petition is a trap set by the official who wants the ledgers to vanish.",
    "The party's contact on the council has been offered a seat if they stop asking questions.",
    "The vote is being rigged in plain sight, and calling it out could start a riot in the market.",
  ],
};

const FRONTIER_HOOK_POOL: QuestHookPool = {
  hooks: [
    "A stagecoach carrying a payroll box has not reached the next town, and its driver's horses came back alone.",
    "A rancher offers a reward for stolen cattle and warns the party not to ask the sheriff for help.",
    "A preacher has been raising money to rebuild a church that burned down a year ago.",
    "A railroad surveyor has vanished, and his last map shows a canyon the company says does not exist.",
    "Ranchers near the river are paying a toll to a gang that has no name and no horses.",
    "A bounty poster shows a face the party has met before, and the reward is larger than the town's annual tax.",
  ],
  complications: [
    "The sheriff is paid by the same people who want the party gone before the next election.",
    "The stolen cattle were sold to a company that the party's employer partly owns.",
    "The preacher's congregation believes the money was spent honestly and will fight anyone who says otherwise.",
    "The canyon exists, and the surveyor's crew is still inside, guarded by men who want the claim kept quiet.",
    "The toll gang has friends in every town on the route, and a stranger asking questions will be recognised by nightfall.",
    "The man on the bounty poster is innocent of the crime, but the only proof is in a town that has already burned.",
  ],
};

const WASTELAND_HOOK_POOL: QuestHookPool = {
  hooks: [
    "A water convoy from the old reservoir is overdue, and its escort has sent up only a flare.",
    "Scavengers have pried open a sealed shelter, and the air inside is still breathable.",
    "A settlement traded its last working generator for a map that promises a clean spring.",
    "A radio broadcast reads a list of names every night, and one belongs to someone who died in the first winter.",
    "A raider chief has taken a child from the market and asked for the party's medical kit in return.",
    "The old seed vault has reopened, and its keeper says the party are the first visitors she has seen in ten years.",
  ],
  complications: [
    "The water is poisoned at the source, and the only people who can clean it are the ones who poisoned it.",
    "The shelter was sealed on purpose, and whoever sealed it still has the keys.",
    "The clean spring on the map is already claimed by a settlement that will not share it.",
    "Every name on the broadcast belongs to someone who once owed the party a debt.",
    "The raider chief will trade the child for the kit, but a truce would leave the market to starve.",
    "The seed vault holds the last viable crop, and its keeper will share it only with someone who promises to stay.",
  ],
};

const STEAMPUNK_HOOK_POOL: QuestHookPool = {
  hooks: [
    "A pressure engine in the foundry district has begun exhaling steam that smells of burnt sugar.",
    "An airship bound for the northern reach has dropped out of the sky, and its last signal came from a dry lake.",
    "A clockwork guild has commissioned a mechanical courier, which keeps delivering letters to a house that burned down.",
    "A boiler explosion killed a foreman whose logbook records a second, unexplained engine on the same site.",
    "A mechanical tutor has started teaching children an address that does not exist, and its brass gears are warm to the touch.",
    "The city's steam mains have been diverted to a private estate, and the dockworkers want someone to stop it.",
  ],
  complications: [
    "The estate belongs to the guild that paid for the boiler inspection, and the inspector is the foreman's brother.",
    "The second engine powers the very airships the party's patron has invested in.",
    "Fixing the mains means cutting heat to the hospital wards for three nights.",
    "The mechanical courier was built to carry a message that the guild does not want read in public.",
    "The brass gears in the tutor are wired to a memory the guild has been trying to erase.",
    "Every workshop in the district holds a copy of the same faulty blueprint, and the guild will pay to keep it that way.",
  ],
};

const GENERIC_HOOK_POOL: QuestHookPool = {
  hooks: questConfig.hooks,
  complications: questConfig.complications,
};

/**
 * Hook and complication pools by quest genre. Vibes without an entry use the
 * generic fantasy pool, which is the right fit for Classic Fantasy and the
 * other fantasy vibes.
 */
export const QUEST_HOOK_POOLS: Readonly<Record<string, QuestHookPool>> = {
  Pirate: PIRATE_HOOK_POOL,
  Superhero: SUPERHERO_HOOK_POOL,
  Cyberpunk: TECHNOLOGICAL_HOOK_POOL,
  "Sci-Fi": TECHNOLOGICAL_HOOK_POOL,
  Lancer: TECHNOLOGICAL_HOOK_POOL,
  "Space Fantasy": TECHNOLOGICAL_HOOK_POOL,
  "Optimistic Exploration Sci-Fi": TECHNOLOGICAL_HOOK_POOL,
  "Space Western": TECHNOLOGICAL_HOOK_POOL,
  "Dark Fantasy": OCCULT_HOOK_POOL,
  "Cosmic Horror": OCCULT_HOOK_POOL,
  "Political Intrigue": POLITICAL_HOOK_POOL,
  Western: FRONTIER_HOOK_POOL,
  "Post-Apocalyptic": WASTELAND_HOOK_POOL,
  Steampunk: STEAMPUNK_HOOK_POOL,
};

/**
 * Person-name pool for the key NPC and the quest title. Genres with no pool of
 * their own are mapped to the nearest one, and anything else falls back to
 * Fantasy, so a Cyberpunk quest is not named like a fantasy village elder.
 */
const QUEST_NAME_POOL_ALIAS: Readonly<Record<string, string>> = {
  "Political Intrigue": "Modern",
  Lancer: "Sci-Fi",
  "Space Fantasy": "Sci-Fi",
};

function questNamePool(genre: string): readonly string[] {
  const key = QUEST_NAME_POOL_ALIAS[genre] ?? genre;
  const candidates = [
    key,
    key.replace(/^Classic /, ""),
    key.replace(/ \/ .*/, ""),
    key.split(" ")[0],
  ];
  for (const candidate of candidates) {
    const pool = INHABITANT_NAMES_BY_GENRE[candidate];
    if (pool) return pool;
  }
  return INHABITANT_NAMES_BY_GENRE.Fantasy;
}

/**
 * Lower-case a label for use mid-sentence, but keep all-caps acronyms such as
 * "AI" so "Rogue AI" does not read as "rogue ai".
 */
function lowerCaseKeepingAcronyms(label: string): string {
  return label
    .split(" ")
    .map((word) => (/^[A-Z]{2,}$/.test(word) ? word : word.toLowerCase()))
    .join(" ");
}

function withIndefiniteArticle(phrase: string): string {
  return `${/^[aeiou]/i.test(phrase) ? "an" : "a"} ${phrase}`;
}

function capitaliseFirst(phrase: string): string {
  return phrase.charAt(0).toUpperCase() + phrase.slice(1);
}

function resolveQuest(options: QuestGeneratorOptions, rng: Rng): ResolvedQuest {
  const genre = questGenreForTheme(
    options.genre || pickFrom(questConfig.genres, rng),
  );
  const pick = (
    chosen: string | undefined,
    themed: Readonly<Record<string, readonly string[]>>,
    generic: readonly string[],
  ) => chosen || pickFrom(themedQuestPool(themed, genre) ?? generic, rng);
  const npcName = pickFrom(questNamePool(genre), rng);
  return {
    genre,
    tone: pick(options.tone, questConfig.tonesByTheme, questConfig.tones),
    scope: pick(options.scope, questConfig.scopesByTheme, questConfig.scopes),
    locationType: pick(
      options.locationType,
      questConfig.locationTypesByTheme,
      questConfig.locationTypes,
    ),
    threat: pick(
      options.threat,
      questConfig.threatsByTheme,
      questConfig.threats,
    ),
    twist: pick(options.twist, questConfig.twistsByTheme, questConfig.twists),
    reward: pick(
      options.reward,
      questConfig.rewardsByTheme,
      questConfig.rewards,
    ),
    campaignContext: options.campaignContext?.trim() || undefined,
    npcName,
    questName: `${npcName}'s ${pickFrom(["Gambit", "Bargain", "Reckoning", "Shadow", "Legacy", "Trial"], rng)}`,
  };
}

export interface QuestPrompt {
  systemInstruction: string;
  userMessage: string;
  resolved: ResolvedQuest;
}

export function buildQuestPrompt(
  options: QuestGeneratorOptions = {},
  sessionContext = "",
  rng: Rng = defaultRng,
): QuestPrompt {
  const resolved = resolveQuest(options, rng);

  const userMessage = `Generate a detailed RPG quest hook in JSON format.
Options:
- Genre: ${resolved.genre}
- Tone: ${resolved.tone}
- Scope: ${resolved.scope}
- Location Type: ${resolved.locationType}
- Main Threat: ${resolved.threat}
- Twist: ${resolved.twist}
- Reward: ${resolved.reward}
${formatCampaignContextBlock(resolved.campaignContext)}
${formatPublicScenarioConcept(resolved.genre, resolved.tone, rng)}

You must return a valid JSON object matching the following structure exactly:
{
  "title": "A single evocative quest name (3-6 words)",
  "content": "A detailed multi-paragraph quest hook (markdown formatted) describing the situation, what the party is asked to do, the location, the key NPC involved, and how it fits the campaign context if provided.",
  "lore": "GM-only details (markdown formatted) with these sections: '### Core Fields' (bullet list with '**📍 Setting**' and '**📅 Threat**', each a vivid one-sentence description with proper nouns), '### Complication' (a concrete mechanical or narrative pressure), '### Key NPC' (bullet with '**👤 Name**': motivation and secret), '### The Twist' (a paragraph revealing the hidden truth, ideally tying back to the party's past or the campaign context), '### Reward' (a paragraph describing what is gained and why it matters to the larger campaign).",
  "labels": ["rpg-quest", "quest-generator", "imported-draft"]
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

export function parseQuestResponse(
  text: string,
  resolved: ResolvedQuest,
): PublicGeneratorOutput {
  const data = parseFencedJson(text);
  return {
    type: "event",
    title: data.title || resolved.questName,
    summary: data.summary || "",
    content: data.content || "",
    lore: data.lore || "",
    labels: Array.isArray(data.labels)
      ? data.labels
      : ["rpg-quest", "quest-generator", "imported-draft"],
    status: "active",
  };
}

export function generateQuestLocal(
  options: QuestGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const resolved = resolveQuest(options, rng);
  const pool = QUEST_HOOK_POOLS[resolved.genre] ?? GENERIC_HOOK_POOL;
  const hook = pickFrom(pool.hooks, rng);
  const complication = pickFrom(pool.complications, rng);
  const npcName = resolved.npcName;
  const locationName = `The ${generateName(rng)} ${resolved.locationType}`;

  const npcStakeVariants = [
    `Their stated reason for hiring the party is credible enough, but their personal stake runs deeper than they admit.`,
    `The official version of why they need the party is true as far as it goes. What they have not said is what makes it personal.`,
    `They present a clear, reasonable case for the party's involvement. The part they omit is the part that matters most.`,
    `Trustworthy enough to work with, not transparent enough to fully trust. Their investment in the outcome goes beyond what they have disclosed.`,
    `The party's first impression of ${npcName} will be of someone straightforward. That impression is accurate in the ways that do not matter.`,
  ] as const;

  const threatPhrase = withIndefiniteArticle(
    lowerCaseKeepingAcronyms(resolved.threat),
  );
  const ThreatPhrase = capitaliseFirst(threatPhrase);
  const threatVariants = [
    `The central danger is ${threatPhrase}. It has been active long enough to leave evidence, earn fear, and create a power vacuum that others are already trying to fill.`,
    `The threat is ${threatPhrase} that has already shaped local behavior: people are routing around it, not reporting it, and quietly adjusting their plans.`,
    `${ThreatPhrase} forms the core danger. The party will not be the first to notice it. They may be the first willing to do something about it.`,
    `The central danger, ${threatPhrase}, has been allowed to persist long enough that dealing with it now will create ripples beyond the immediate problem.`,
    `At the center of this is ${threatPhrase}. Its history in this place is longer than anyone has told the party yet.`,
  ] as const;

  const npcStake = pickFrom(npcStakeVariants, rng);
  const threatDesc = pickFrom(threatVariants, rng);

  const content = `### The Hook
${hook}

### Location
${locationName} serves as the primary setting, shaped by ${resolved.genre.toLowerCase()} conventions and a ${resolved.tone.toLowerCase()} atmosphere.

### Key NPC
**${npcName}** is the immediate contact, patron, or obstacle. ${npcStake}

### Threat
${threatDesc}`;

  const rewardClosers = [
    `Beyond its face value, it opens a door in the wider campaign: a contact, a route, or a secret the party could not otherwise reach.`,
    `The reward is real. What it enables matters more than what it is worth.`,
    `On its own terms it is fair. As a campaign asset, it is more valuable than it appears.`,
    `The party earns something tangible, and inherits something they will not fully understand until later.`,
    `Take the face value seriously. Then consider what having it changes about the party's position going forward.`,
  ] as const;

  const campaignSection = resolved.campaignContext
    ? `\n\n### Campaign Context\n${resolved.campaignContext}`
    : "";

  const lore = `### Core Fields
- **📍 Setting**: ${locationName}, shaped by ${resolved.genre.toLowerCase()} conventions and a ${resolved.tone.toLowerCase()} atmosphere.
- **📅 Threat**: ${threatDesc}
- **🧭 Scope**: ${resolved.scope}

### Complication
${complication}

### Key NPC
- **👤 ${npcName}**: The immediate contact, patron, or obstacle. ${npcStake}

### The Twist
${resolved.twist}. Reveal this only once the party is committed: it should recast earlier scenes in a new light.

### Reward
${resolved.reward}. ${pickFrom(rewardClosers, rng)}${campaignSection}`;

  return {
    type: "event",
    title: resolved.questName,
    summary: "",
    content,
    lore,
    labels: ["rpg-quest", "quest-generator", "imported-draft"],
    status: "active",
  };
}
