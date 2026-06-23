/**
 * Public NPC generator — framework-free port of the SEO NPC generator
 * (`apps/web/src/lib/services/seo/generators/npc.ts`). Owns the rich,
 * theme-keyed content data, the local fallback generator, the AI prompt
 * builder, and response parsing.
 *
 * Per the unification plan (#1351) this package stays framework-free: it does
 * NOT call the AI client or read `sessionStorage`. The web page builds the
 * prompt here, runs it through `aiClientManager`, parses with {@link
 * parseNpcResponse}, and falls back to {@link generateNpcLocal} on failure.
 * Session context (from the Session Hub) is injected as a plain string.
 */

import type { PublicGeneratorOutput } from "./public-generator-adapters";

/** Random source in [0,1) — injectable for deterministic tests. */
export type Rng = () => number;
const defaultRng: Rng = () => Math.random();

function pickFrom<T>(arr: readonly T[], rng: Rng = defaultRng): T {
  return arr[Math.floor(rng() * arr.length)];
}

function getRandomItems<T>(
  arr: readonly T[],
  count: number,
  rng: Rng = defaultRng,
): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
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
// Banned names (ported from seo/generators/banned-names.ts)
// ---------------------------------------------------------------------------

export const BANNED_NAMES = [
  "Vane",
  "Elara",
  "Valerius",
  "Kael",
  "Kaelen",
  "Theron",
  "Zara",
  "Aldric",
  "Kane",
  "Drake",
  "Maren",
  "Cross",
  "Vale",
  "Stone",
  "Grey",
  "Ash",
  "Cole",
  "Thorne",
  "Voss",
  "Julian",
  "Julianne",
  "Halloway",
  "Oakhaven",
  "Oakhollow",
  "Millbrook",
  "Riverdale",
  "Silas",
  "Vesper",
] as const;

export const NAME_BAN_PROMPT =
  `Names must never include: ${BANNED_NAMES.join(", ")}. ` +
  `Avoid all similar generic fantasy placeholders and common English monosyllable surnames.`;

// ---------------------------------------------------------------------------
// Theme-keyed content data (ported from seo npc.ts)
// ---------------------------------------------------------------------------

export const npcConfig = {
  races: [
    "Human",
    "Elf",
    "Dwarf",
    "Halfling",
    "Orc",
    "Gnome",
    "Tiefling",
    "Dragonborn",
  ],
  roles: [
    "Mage",
    "Warrior",
    "Rogue",
    "Priest",
    "Merchant",
    "Scholar",
    "Blacksmith",
    "Guard",
    "Noble",
    "Innkeeper",
  ],
  alignments: [
    "Lawful Good",
    "Neutral Good",
    "Chaotic Good",
    "Lawful Neutral",
    "True Neutral",
    "Chaotic Neutral",
    "Lawful Evil",
    "Neutral Evil",
    "Chaotic Evil",
  ],
  traits: [
    "Always whispers when speaking to build dramatic tension.",
    "Carries a pocket watch that runs backward but claims it is correct.",
    "Extremely superstitious about black cats and wooden doors.",
    "Has a collection of rare, dried flowers in their cloak pockets.",
    "Never looks anyone directly in the eye, shifting their gaze constantly.",
    "Speaks in rhyming riddles when they become nervous or excited.",
    "Has a nervous twitch in their left hand when speaking about magic.",
    "Obsessed with cleanliness, frequently wiping down their gear.",
  ],
  secretsByTheme: {
    "Classic Fantasy": [
      "Is a secret spy for a rival merchant guild operating in the shadows.",
      "Possesses a cursed map that shows their exact death location, which is nearby.",
      "Accidentally poisoned their previous master and fled the crime scene.",
      "Is actually a shapechanger in hiding from an ancient wizard.",
      "Stole a sacred relic from the local temple and keeps it in their boot.",
      "Is deeply in debt to a dangerous local crime lord who wants them dead.",
      "Knows the secret passcode to the royal vault under the capital.",
    ],
    "Cyberpunk / Corporate": [
      "Has a black-market neural implant that records every conversation they have.",
      "Is running a double identity — one registered citizen, one ghost in the Net.",
      "Sold corporate blueprints to a rival megacorp and is waiting to be found out.",
      "Their real body is in cryo storage; this one is a remotely piloted sleeve.",
      "Is paying off a fixer to delete their past arrest record before it resurfaces.",
      "Has been feeding sanitised intel to a street journalist trying to expose their employer.",
    ],
    "Vampire / Gothic Noir": [
      "Was turned decades ago and has spent years faking mortality to stay hidden.",
      "Holds forged documents that implicate a respected family in a century-old murder.",
      "Is a blood-bound thrall who despises their sire but cannot act against them.",
      "Secretly supplies the local orphanage with funds drawn from extortion income.",
      "Knows the location of a dormant elder vampire sealed beneath the city cathedral.",
      "Has been slowly poisoning a rival clan's blood supply with sanctified silver tincture.",
    ],
    "Sci-Fi / Space Opera": [
      "Carries a data-core that holds the coordinates of a derelict dreadnought full of rare alloys.",
      "Is a deserter from a dissolved fleet who assumed a dead crewmate's identity.",
      "Has been skimming fuel rations and selling them to a black-market hauler.",
      "Secretly communicates with an AI collective officially declared extinct after the Purge.",
      "Possesses classified gene-therapy that could cure a colony plague — but has a buyer lined up.",
      "Is a deep-cover operative whose own handler has gone dark for six months.",
    ],
    "Modern Conspiracy": [
      "Photographed a government official at a meeting that never officially took place.",
      "Has a second phone with texts that contradict a high-profile alibi.",
      "Was a witness to a staged accident and was paid to stay quiet — once.",
      "Runs a seemingly normal business that fronts for a document-forging operation.",
      "Is on three different intelligence watchlists under three different names.",
      "Knows the identity of a mole inside the task force investigating them.",
    ],
    "Post-Apocalyptic": [
      "Hoards a working water-purifier they claim broke six months ago.",
      "Was a guard at a pre-collapse detention facility and recognises some survivors.",
      "Trades in pre-war medicine while publicly claiming their cache ran out.",
      "Secretly communicates with a distant settlement their own community thinks is hostile.",
      "Knows where a fuel depot is buried and is waiting for the right moment to claim it.",
      "Murdered a caravan leader for their map and tells everyone they found it in a ruin.",
    ],
    "Western / Frontier": [
      "Rides under a false name after skipping out on a hanging two territories east.",
      "Buried stolen railroad payroll in the desert and hasn't been able to retrieve it.",
      "Is feeding land-office survey reports to a cattle baron ahead of official filing.",
      "Witnessed a US Marshal commit murder and hasn't decided what to do about it.",
      "Has a letter of pardon — forged, but so far no one has checked closely.",
      "Was the getaway rider in a bank job and is now living off a preacher's charity.",
    ],
    Steampunk: [
      "Has a functioning automaton heart stolen from the Imperial Science Directorate.",
      "Is selling guild-licensed patents to unlicensed workshops across the Ironhaven border.",
      "Their airship runs on a fuel compound the Alchemists' Union declared illegal last year.",
      "Maintains a secret press in the engine room and distributes seditious broadsheets.",
      "Was the anonymous informant who exposed the Clavenwick Boiler Disaster — and caused it.",
      "Keeps a clockwork duplicate of themselves wound and ready to take the blame if needed.",
    ],
    Lancer: [
      "Their mech's kill-record has been scrubbed — they know what was removed and why.",
      "Is an unlicensed omninet node operator running pirate frequencies inside Union space.",
      "Accepted a contract from a Harrison Armory shell company they cannot legally acknowledge.",
      "Their pilot licence is valid; their frame's chassis number belongs to a destroyed unit.",
      "Has been ghosting a Barony Horizon extraction team for eight months.",
      "Carries a paracausal field reading that HORUS flagged but Union NHP oversight buried.",
    ],
    "Space Opera Resistance": [
      "Is a double agent — loyalty to the Resistance is genuine, but they report troop positions to the Empire.",
      "Destroyed a refugee shuttle to prevent an Imperial boarding party from capturing codes aboard.",
      "Has a sibling serving as an Imperial officer and sends them warnings before major strikes.",
      "Stole Resistance encryption keys to sell, then lost their nerve and never made the handoff.",
      "Knows the location of a safe house that was compromised six months ago and said nothing.",
      "Is carrying an Imperial tracking chip they haven't told the cell about.",
    ],
    "Optimistic Exploration Sci-Fi": [
      "Made first contact with a sentient species and filed a false 'no signs of life' report.",
      "Has been quietly altering the survey data on a planet to delay its colonisation.",
      "Is harbouring a non-registered AI crew member in the ship's secondary systems.",
      "Received a message from a probe that vanished fifteen years ago — and hasn't reported it.",
      "Traded protected artefacts from a pre-spaceflight culture for personal passage home.",
      "Their breakthrough publication was based on a colleague's research — the colleague is missing.",
    ],
  } as Record<string, string[]>,
  motivesByTheme: {
    "Classic Fantasy": [
      "To clear their family's disgraced name and reclaim their ancestral land.",
      "To fund a search for a lost sibling who vanished in the Underdark.",
      "To acquire enough wealth to buy their freedom from a contract.",
      "To find a cure for a mysterious family affliction affecting their bloodline.",
      "To exact revenge on the corrupt noble who exiled them.",
      "To locate a legendary magical spellbook hidden in a nearby ruin.",
    ],
    "Cyberpunk / Corporate": [
      "To earn enough cred to afford neural surgery and get out of the Sprawl for good.",
      "To recover damning footage of a megacorp exec before it gets wiped.",
      "To find their missing sister who was last seen entering a corporate arcology.",
      "To buy out their debt contract before their handler calls in the clause.",
      "To build a reputation clean enough that the big fixers will actually return their calls.",
      "To expose the corporation that erased their memory — and find out who they used to be.",
    ],
    "Vampire / Gothic Noir": [
      "To find the mortal bloodline that can grant them a permanent death on their own terms.",
      "To destroy the sire who turned them without consent three centuries ago.",
      "To protect a mortal family they've been secretly watching over for generations.",
      "To recover a stolen painting that contains a hidden glyph binding their soul.",
      "To broker a ceasefire between two clans before the inevitable war destroys the city.",
      "To locate a long-dead archivist's journals before a rival elder can burn them.",
    ],
    "Sci-Fi / Space Opera": [
      "To find a colony ship manifest that lists a person everyone says never existed.",
      "To earn enough faction standing to gain access to a restricted jump gate.",
      "To pay off the shipyard debt before creditors repossess their vessel mid-voyage.",
      "To recover a stolen navigational AI that used to be their co-pilot.",
      "To negotiate safe passage for a refugee convoy through contested space.",
      "To prove a dead explorer's theory correct before the academic committee buries it.",
    ],
    "Modern Conspiracy": [
      "To find a witness who vanished days before they were due to testify.",
      "To recover a hard drive that proves a prominent official has been lying for years.",
      "To get their analyst certification reinstated after a politically motivated dismissal.",
      "To trace the money behind a front charity back to its real operators.",
      "To keep their family safe while they finish exposing a network they stumbled into.",
      "To find out who ordered the surveillance op that destroyed their last team.",
    ],
    "Post-Apocalyptic": [
      "To find a pre-war medical facility rumoured to have functioning equipment.",
      "To reach a settlement three hundred miles out where their children were taken.",
      "To barter for enough fuel to power a generator through the next killing winter.",
      "To track down the raider chief who destroyed the community they built over a decade.",
      "To recover a seed vault before a rival faction seizes it for leverage.",
      "To find a radio operator who claims they've been in contact with a functioning city.",
    ],
    "Western / Frontier": [
      "To save enough to buy a small parcel of land before the railroad claims it all.",
      "To find the witness who can clear their name before the circuit judge arrives.",
      "To locate their father, who rode into the hills after the war and never came back.",
      "To recover a deed stolen by the land agent who burned their homestead.",
      "To earn enough to pay back the family whose wagon they stole during a hard winter.",
      "To find the man who sold a false map to a whole wagon train — and collect.",
    ],
    Steampunk: [
      "To patent a suppressed invention before the Guild can bury it permanently.",
      "To buy passage on a high-altitude airship expedition before their health fails.",
      "To recover an automaton companion confiscated during last year's regulation sweep.",
      "To find the engineer who sabotaged the boiler that killed their crew.",
      "To expose the shell company that has been counterfeiting Guild seals for a decade.",
      "To fund enough experimental components to finish a device that shouldn't be possible.",
    ],
    Lancer: [
      "To find the black-site prison where their lance-mate is listed as KIA but wasn't.",
      "To earn enough Union commendation to qualify their settlement for terraforming aid.",
      "To destroy the frame assembly line producing the chassis that killed their squadron.",
      "To recover an NHP core before it falls into Barony Horizon hands.",
      "To negotiate a ceasefire on a contested moon before the next supply drop triggers escalation.",
      "To find the contractor who sold their patrol route to an ambush crew.",
    ],
    "Space Opera Resistance": [
      "To find their scattered cell members before Imperial intelligence does.",
      "To recover a stolen Resistance comm cipher that is actively being used against them.",
      "To get a wounded commander to a medic facility on the far side of the blockade.",
      "To destroy an Imperial listening post before the next Resistance convoy passes through.",
      "To convince a neutral system to allow refugee ships to shelter in their space.",
      "To find proof that the recent raid on a Resistance base was betrayed from inside.",
    ],
    "Optimistic Exploration Sci-Fi": [
      "To catalogue a newly discovered biosphere before the commercial survey team arrives.",
      "To find a missing probe whose last transmission suggested something unprecedented.",
      "To earn enough scientific reputation to fund a second expedition to the anomaly.",
      "To protect a fragile first-contact relationship from being damaged by a careless diplomat.",
      "To recover a colleague's personal logs from a wrecked survey vessel.",
      "To prove a long-dismissed exoplanet theory before a rival publishes with stolen data.",
    ],
  } as Record<string, string[]>,
  factionsByTheme: {
    "Classic Fantasy": [
      "The Ashen Ledger, a quiet network of debt collectors and informants.",
      "The Lantern Court, a civic order that keeps public peace after sunset.",
      "The Red Sash Company, sellswords with a habit of choosing winning sides.",
      "The Argent Loom, an artisan guild that hides coded messages in its work.",
      "The Chapel of Last Mercy, a temple faction that knows too many confessions.",
      "The Blackwater Compact, smugglers moving relics beneath legitimate trade.",
    ],
    "Cyberpunk / Corporate": [
      "Vantablack Solutions, a corporate deniability firm that specialises in clean disappearances.",
      "The Neon Clerks, a fixers' union that brokers jobs between contractors and megacorp mid-managers.",
      "Static Gospel, a pirate-signal collective that broadcasts corporate leaks over unlicensed frequencies.",
      "The Oxidised Hand, a chop-shop network that recycles stolen cyberware into street-grade implants.",
      "Meridian Shadow, a mid-tier security contractor used by corps who want distance from messy work.",
      "The Glass Syndicate, information brokers who deal exclusively in verified, provable dirt.",
    ],
    "Vampire / Gothic Noir": [
      "The Covenant of the Pale Veil, elders who prefer manipulation to open conflict.",
      "The Ashborn Circle, young vampires agitating for open acknowledgement of their existence.",
      "The Order of the Tallow Seal, mortal hunters who have operated covertly for three generations.",
      "The Red Ledger Society, a mortal criminal network that trades in vampire-adjacent favours.",
      "The Quiet Congregation, a religious community that suspects the supernatural and watches carefully.",
      "House Morrigan, an old bloodline running a legitimate funeral business as a very convenient front.",
    ],
    "Sci-Fi / Space Opera": [
      "The Pale Compact, independent haulers bound by a mutual-aid charter when the lanes get dangerous.",
      "Stellarion Dynamics, a mid-tier shipbuilder whose board is rumoured to be stacked with Syndicate proxies.",
      "The Wayfinders' Registry, a non-aligned body that certifies pilots and quietly tracks who goes where.",
      "Outer Reach Salvage Collective, scavengers with a loose code and excellent maps of debris fields.",
      "The Quorum Drift, a faction of station administrators coordinating trade policy outside official channels.",
      "Iron Meridian, a privateer fleet operating under letters of marque from three different governments.",
    ],
    "Modern Conspiracy": [
      "The Vantage Group, a think-tank whose published research consistently precedes major policy shifts.",
      "Clearwater Associates, a private intelligence firm whose client list is sealed by court order.",
      "The Blackthorn Network, a loose affiliation of journalists and analysts who share information carefully.",
      "Operation Starling, a dormant government programme that several people claim was never shut down.",
      "The Meridian Trust, a philanthropic foundation with unusual interests in infrastructure and census data.",
      "The Fourth Tier, a rumoured internal faction within a major intelligence agency with its own agenda.",
    ],
    "Post-Apocalyptic": [
      "The Salvagers' Compact, scavengers who map ruins and trade access rights rather than compete.",
      "The Iron Parish, a survivalist religious community that controls the most defensible high ground nearby.",
      "The Grey Caravan, a travelling trade convoy that enforces its own law between settlements.",
      "The Wellkeepers, a small guild that controls clean water access and charges accordingly.",
      "The Dustborn Riders, outriders for hire who move between settlements and know every trail.",
      "The Reclamation Front, idealists who believe pre-collapse infrastructure can be restored — and are working on it.",
    ],
    "Western / Frontier": [
      "The Cattlemen's Association, ranchers who pool influence and occasionally pool hired guns.",
      "The Frontier Survey Bureau, a government body whose agents have unusual latitude in the territories.",
      "The Pinkerton-Adjacent Agency, private detectives who work for whoever can pay their rate.",
      "The Crossroads Merchants' Circle, traders who share routes, prices, and the occasional bribe.",
      "The Order of the Copper Star, a fraternal organisation with lodges in every major town.",
      "The Railroad Trust's Land Office, quietly the most powerful entity operating in the territory.",
    ],
    Steampunk: [
      "The Ironwrights' Guild, the dominant engineering fraternity that controls licensed fabrication.",
      "The Aetheric Society, natural philosophers pushing into territory the Guild wants to gatekeep.",
      "The Coal Street Press Collective, anonymous pamphleteers distributing contraband political theory.",
      "The Gilded Compass Company, an exploration firm trading in maps, specimens, and influence.",
      "The Parliament of Cogs, a worker-organising body the factory owners claim doesn't officially exist.",
      "The Imperial Lens, the Crown's scientific advisory body with significant power over patent approval.",
    ],
    Lancer: [
      "Union Third Committee Field Operations, the logistical arm that funds and monitors contractor activity.",
      "The Albatross Compact, a loose alliance of independent lances who share intel and split contracts.",
      "Harrison Armory's Frontier Division, a corporate military arm operating under a Union provisional charter.",
      "The Pastoral Collective, a civilian infrastructure group that hires security lances for convoy work.",
      "NHP Oversight Bureau — Provisional, a watchdog body whose jurisdiction is perpetually contested.",
      "The Barony Horizon Vanguard, an expansionist faction with contested claim over the operational zone.",
    ],
    "Space Opera Resistance": [
      "The Ember Cell, a small Resistance unit operating without contact with central command.",
      "The Free Worlds Coalition, a loose alliance of neutral systems quietly sympathetic to the Resistance.",
      "The Shadow Courier Network, civilian pilots who move people and supplies under Imperial sensor coverage.",
      "The Recusant Fleet, defected Imperial vessels that fight independently outside the Resistance command structure.",
      "The Archive Underground, scholars and historians preserving records the Empire is actively destroying.",
      "Ironwing Squadron, Resistance fighter pilots operating from a rotating roster of hidden carriers.",
    ],
    "Optimistic Exploration Sci-Fi": [
      "The Explorers' Consortium, the primary scientific body funding deep-range survey missions.",
      "The First Contact Protocols Office, a small bureaucratic body with enormous situational authority.",
      "The Free Survey Alliance, independent researchers who operate outside Consortium oversight.",
      "The Colonial Stewardship Commission, advocates for settlement ethics and indigenous species protections.",
      "The Deep Range Pilots' Association, a professional body for long-haul survey vessel crews.",
      "The Luminance Institute, a privately funded think-tank that sometimes gets to places before the Consortium.",
    ],
  } as Record<string, string[]>,
  plotHooks: [
    "They ask the party to recover a sealed letter before it reaches a rival.",
    "They recognize one character from a prophecy but refuse to explain in public.",
    "They can open a locked district gate if the party solves their immediate problem.",
    "They are being followed by someone who disappears whenever challenged.",
    "They offer a reward for escort, then reveal the destination is forbidden ground.",
    "They own a clue that reframes a recent villain as someone else's pawn.",
  ],
};

interface MoralityAnchor {
  id: string;
  label: string;
  aiPromptDirective: string;
}

export const npcThemeConfig = {
  ancestries: {
    "Classic Fantasy": [
      "Human",
      "Elf",
      "Dwarf",
      "Halfling",
      "Tiefling",
      "Half-Orc",
      "Gnome",
      "Dragonborn",
    ],
    "Cyberpunk / Corporate": [
      "Human",
      "Street-Modified Human",
      "Corporate Clone",
      "Synthetic Android",
      "Uplifted Organism",
    ],
    "Vampire / Gothic Noir": [
      "Human",
      "Dhampir",
      "Revenant",
      "Changed Mortal",
      "Witchblood",
    ],
    "Sci-Fi / Space Opera": [
      "Human",
      "Android",
      "Colony-Born",
      "Alien Citizen",
      "Augmented Pilot",
    ],
    "Modern Conspiracy": [
      "Human",
      "Off-Grid Survivor",
      "Enhanced Operative",
      "Whistleblower",
    ],
    "Post-Apocalyptic": [
      "Survivor Human",
      "Mutant",
      "Scavenger-Born",
      "Vault Dweller",
      "Wasteland Nomad",
    ],
    "Western / Frontier": [
      "Human",
      "Frontier Pioneer",
      "Outlaw Scout",
      "Town Native",
      "Homesteader",
    ],
    Steampunk: [
      "Human",
      "Clockwork Augmented",
      "Aetheric Sensitive",
      "Engineered Homunculus",
      "Colonial Expatriate",
    ],
    Lancer: [
      "Human",
      "Khalida",
      "Karrakin",
      "Baronic Adherent",
      "Long-Rim Born",
      "Ungrateful",
    ],
    "Space Opera Resistance": [
      "Human",
      "Alien Smuggler",
      "Frontier Native",
      "Liberated Android",
      "Imperial Defector",
      "Ancient Mystic",
    ],
    "Optimistic Exploration Sci-Fi": [
      "Human (United Earth)",
      "Logic-bound alien",
      "Amorphous energy being",
      "Symbiotic species",
      "Cybernetic collective escapee",
      "Avian academic",
      "Amphibious diplomat",
    ],
  } as Record<string, string[]>,
  roles: {
    "Classic Fantasy": [
      "Mage",
      "Warrior",
      "Rogue",
      "Priest",
      "Merchant",
      "Noble",
      "Scholar",
      "Guard",
    ],
    "Cyberpunk / Corporate": [
      "Netrunner",
      "Street Fixer",
      "Corporate Agent",
      "Street Samurai",
      "Techie",
      "Gang Lieutenant",
      "Medtech",
      "Journalist",
    ],
    "Vampire / Gothic Noir": [
      "Vampire Hunter",
      "Occultist",
      "Corrupt Noble",
      "Private Detective",
      "Fallen Clergy",
      "Criminal Enforcer",
      "Asylum Keeper",
    ],
    "Sci-Fi / Space Opera": [
      "Starship Pilot",
      "Engineer",
      "Colonial Marine",
      "Diplomat",
      "Free Trader",
      "Scientist",
      "AI Liaison",
    ],
    "Modern Conspiracy": [
      "Intelligence Agent",
      "Investigative Journalist",
      "Fixer",
      "Activist",
      "Corporate Operative",
      "Private Investigator",
    ],
    "Post-Apocalyptic": [
      "Scavenger",
      "Wasteland Warlord",
      "Medic",
      "Trader",
      "Cult Enforcer",
      "Scout",
      "Mechanic",
    ],
    "Western / Frontier": [
      "Gunslinger",
      "Sheriff",
      "Bounty Hunter",
      "Outlaw",
      "Prospector",
      "Saloon Keeper",
      "Homesteader",
      "Railroad Agent",
      "Town Doctor",
    ],
    Steampunk: [
      "Artificer",
      "Sky Pilot",
      "Engine Wright",
      "Guild Factor",
      "Aetheric Scholar",
      "Clockwork Spy",
      "Press-Gang Officer",
      "Alchemical Surgeon",
    ],
    Lancer: [
      "Mech Pilot",
      "Union Administrator",
      "Comp/Con Handler",
      "Logistics Officer",
      "NHP Caseworker",
      "Colonial Liaison",
      "Bleed Researcher",
      "Mercenary Contractor",
    ],
    "Space Opera Resistance": [
      "Rebel Pilot",
      "Smuggler Captain",
      "Mystic Warrior",
      "Resistance Leader",
      "Imperial Officer",
      "Bounty Hunter",
      "Underworld Fixer",
      "Defector Operative",
    ],
    "Optimistic Exploration Sci-Fi": [
      "Science Officer",
      "Chief Medical Officer",
      "Diplomatic Envoy",
      "Helm Officer",
      "Engineering Chief",
      "First Officer",
      "Xenobiologist",
      "Security Chief",
    ],
  } as Record<string, string[]>,
  moralities: {
    "Classic Fantasy": [
      {
        id: "chivalric_code",
        label: "Chivalric Code",
        aiPromptDirective:
          "Write this NPC with an unshakeable sense of honor, classical righteousness, and duty. Their vocabulary is formal, respectful, and rejects deceitful or underhanded methods.",
      },
      {
        id: "common_good",
        label: "Common Good",
        aiPromptDirective:
          "This NPC is driven entirely by empathy and the immediate welfare of the community. They are casual, caring, and willing to quietly break unjust rules to protect others.",
      },
      {
        id: "enlightened_balance",
        label: "Enlightened Balance",
        aiPromptDirective:
          "Write this NPC as an objective, emotionally level philosopher who prioritizes cosmic or natural balance. Avoid emotional outbursts or blind loyalty to any faction.",
      },
      {
        id: "mercenary_instinct",
        label: "Mercenary Instinct",
        aiPromptDirective:
          "This NPC is intensely pragmatic, apolitical, and motivated by coins, safety, or trade. Their dialogue should be transactional, street-smart, and grounded in cold reality.",
      },
      {
        id: "zealous_crusade",
        label: "Zealous Crusade",
        aiPromptDirective:
          "Write this character with intense, uncompromising conviction toward a specific dogma, deity, or ideal. Their speech is passionate, direct, and completely intolerant of compromise.",
      },
      {
        id: "power_absolute",
        label: "Power at All Costs",
        aiPromptDirective:
          "This character is entirely self-serving, ambitious, and ruthless. Their behavior can range from highly charismatic manipulation to terrifying authority, always prioritizing personal leverage.",
      },
    ],
    "Cyberpunk / Corporate": [
      {
        id: "corporate_loyalist",
        label: "Corporate Loyalist",
        aiPromptDirective:
          "Incorporate corporate buzzwords and clinical, risk-managed PR language. This character prioritizes systemic order, corporate policy, and lines of credit over human empathy.",
      },
      {
        id: "street_pragmatist",
        label: "Street Pragmatist",
        aiPromptDirective:
          "Use sharp, weary, and highly transactional street slang. This character has no illusions about saving the world; their focus is purely short-term survival and protecting their immediate crew.",
      },
      {
        id: "ideological_radical",
        label: "Ideological Radical",
        aiPromptDirective:
          "Write this character with raw, anti-establishment energy. They use rebellious, anti-corp rhetoric and are actively willing to burn down systems, entirely indifferent to collateral damage.",
      },
      {
        id: "cold_professional",
        label: "Cold Professional",
        aiPromptDirective:
          "Dialogue must be minimal, precise, and devoid of personal bias. The character views tasks purely as mechanical execution — nothing is personal, everything is just business.",
      },
      {
        id: "burned_out_cynic",
        label: "Burned-Out Cynic",
        aiPromptDirective:
          "Infuse the dialogue with deep nihilism, dry sarcasm, and exhaustion. The character has seen it all fall apart and operates on a baseline expectation of systemic failure.",
      },
      {
        id: "predatory_opportunist",
        label: "Predatory Opportunist",
        aiPromptDirective:
          "Make this character predatory, slippery, and untrustworthy. They use smooth talk to mask aggressive self-interest and are always scanning the room for an exploit or an escape route.",
      },
    ],
    "Vampire / Gothic Noir": [
      {
        id: "strict_ascetic",
        label: "Strict Ascetic",
        aiPromptDirective:
          "Write this character with a strained, hyper-controlled demeanor. They use precise, polite, and antiquated language as a psychological armor to contain an inner, volatile darkness.",
      },
      {
        id: "haunted_sympathizer",
        label: "Haunted Sympathizer",
        aiPromptDirective:
          "Dialogue should convey deep guilt, hesitation, and vulnerability. The character is deeply ashamed of their actions or status and is desperately looking for small ways to do good without getting caught.",
      },
      {
        id: "cold_monster",
        label: "Cold Monster",
        aiPromptDirective:
          "Write this character with a chilling, detached elegance. They lack basic human empathy, treating people like simple livestock or resources, completely free of guilt or malice.",
      },
      {
        id: "obsessive_zealot",
        label: "Obsessive Zealot",
        aiPromptDirective:
          "Infuse the character's descriptions with an eerie, manic focus. Their dialogue should repeatedly orient toward their singular, consuming fixation, overriding all other social cues.",
      },
      {
        id: "decadent_hedonist",
        label: "Decadent Hedonist",
        aiPromptDirective:
          "Dialogue is theatrical, cynical, and dripping with sensory indulgence. The character uses casual amusement and hedonism to aggressively deflect from their inner decay or emptiness.",
      },
      {
        id: "pragmatic_survivor",
        label: "Pragmatic Survivor",
        aiPromptDirective:
          "Write this NPC as highly defensive, paranoid, and survival-driven. Their speech is guarded, they avoid making definitive promises, and they prioritize exit strategies over loyalty.",
      },
    ],
    "Sci-Fi / Space Opera": [
      {
        id: "system_loyalist",
        label: "System Loyalist",
        aiPromptDirective:
          "This character speaks with the confidence of an institutionalist. They emphasize law, civilization, hierarchy, and data-driven stability, viewing rebels or independents as dangerous chaos.",
      },
      {
        id: "frontier_independent",
        label: "Frontier Independent",
        aiPromptDirective:
          "Use rugged, informal, and fiercely independent dialogue. The character values self-reliance, localized trust, and personal freedom above centralized planetary laws.",
      },
      {
        id: "zealous_visionary",
        label: "Zealous Visionary",
        aiPromptDirective:
          "Focus the character on the future, technology, or a grand cosmic mission. They view current human suffering or ethical concerns as insignificant speed bumps on the road to evolution.",
      },
      {
        id: "principled_pacifist",
        label: "Principled Pacifist",
        aiPromptDirective:
          "Dialogue must be calm, deeply humanistic, and actively seek compromise. The character maintains absolute ethical boundaries against violence, regardless of how harsh the setting is.",
      },
      {
        id: "opportunistic_trader",
        label: "Opportunistic Trader",
        aiPromptDirective:
          "Write this character with a highly commercial, speculative, and conversational tone. They treat every interaction as an open negotiation, constantly weighing cost-benefit ratios.",
      },
      {
        id: "subversive_rebel",
        label: "Subversive Rebel",
        aiPromptDirective:
          "The character operates with the secrecy and intensity of an active insurgent. Their language is revolutionary, defiant, and actively seeks to disrupt or dismantle structural authority.",
      },
    ],
    "Modern Conspiracy": [
      {
        id: "institutionalist",
        label: "Institutionalist",
        aiPromptDirective:
          "Use highly clinical, dry, and compartmentalized intelligence jargon. The character prioritizes official protocol, institutional security, and the chain of command above all else.",
      },
      {
        id: "noble_transgressor",
        label: "Noble Transgressor",
        aiPromptDirective:
          "Write this character as a quiet, hyper-focused operative who knowingly breaks laws to achieve a greater moral good. Their dialogue is guarded but deeply principled.",
      },
      {
        id: "fanatical_believer",
        label: "Fanatical Believer",
        aiPromptDirective:
          "The character's speech must carry the weight of dangerous, total certainty. They view all of human society as an illusion and treat people as mere assets or collateral to be spent for the Truth.",
      },
      {
        id: "unprincipled_asset",
        label: "Unprincipled Asset",
        aiPromptDirective:
          "Dialogue should be highly transactional, street-smart, and amoral. The character has zero ideological loyalty, viewing their skills and information purely as commodities to sell to the highest bidder.",
      },
      {
        id: "haunted_insider",
        label: "Haunted Insider",
        aiPromptDirective:
          "Infuse the character's tone with intense paranoia, panic, and deep ethical distress. They are physically and mentally exhausted from keeping terrible secrets and expect betrayal at any second.",
      },
      {
        id: "machiavellian_player",
        label: "Machiavellian Player",
        aiPromptDirective:
          "Write this character with a charming, highly collected, and disarming social facade. Beneath this exterior, their dialogue and actions are driven entirely by cold, calculated personal advancement.",
      },
    ],
    Steampunk: [
      {
        id: "empire_loyalist",
        label: "Empire Loyalist",
        aiPromptDirective:
          "Write this NPC with the clipped, bureaucratic confidence of an imperial functionary. They cite regulations, uphold the Guild Compact, and view progress as the Empire's divine right — dissent is a problem to be managed.",
      },
      {
        id: "guild_pragmatist",
        label: "Guild Pragmatist",
        aiPromptDirective:
          "This NPC is entirely transactional — contracts, patents, and profit margins are their moral compass. Their dialogue is precise, mercantile, and peppered with technical jargon. They respect competence, nothing else.",
      },
      {
        id: "aetheric_visionary",
        label: "Aetheric Visionary",
        aiPromptDirective:
          "Write this NPC with the fervent certainty of an inventor who believes progress will save humanity. Their speech is excited, technical, and slightly unhinged — they see every person as either a collaborator or an obstacle.",
      },
      {
        id: "underclass_rebel",
        label: "Underclass Rebel",
        aiPromptDirective:
          "This character speaks with raw, soot-stained fury. They have worked the furnaces, breathed the smog, and watched the guilds profit while the engine-workers died. Their language is blunt, conspiratorial, and resentful.",
      },
      {
        id: "aristocratic_schemer",
        label: "Aristocratic Schemer",
        aiPromptDirective:
          "Write this NPC with the polished, veiled menace of old money adapting to a new world. They attend every salon, fund every expedition, and ensure every innovation serves their dynasty. Nothing they say is without subtext.",
      },
      {
        id: "clockwork_cynic",
        label: "Clockwork Cynic",
        aiPromptDirective:
          "This NPC has seen too many inventions turn to weapons and too many guild promises turn to smoke. Their tone is dry, sardonic, and deeply weary — they cooperate when paid, believe nothing, and expect betrayal.",
      },
    ],
    Lancer: [
      {
        id: "union_idealist",
        label: "Union Idealist",
        aiPromptDirective:
          "Write this NPC with earnest, data-backed conviction in Union's ability to end scarcity and resolve conflict through coordination. Their tone is calm, precise, and genuinely believes the mission — though they are not naive about the cost.",
      },
      {
        id: "bleed_touched",
        label: "Bleed-Touched",
        aiPromptDirective:
          "This NPC has spent too long near paracausal phenomena and it shows. Their speech occasionally fractures into recursive loops, second-person observations, or unsettling calm about things that should be terrifying. They are not broken — just differently calibrated.",
      },
      {
        id: "colonial_pragmatist",
        label: "Colonial Pragmatist",
        aiPromptDirective:
          "Write this NPC as someone who has survived on the Long Rim by making deals, not principles. Their dialogue is transactional, their loyalties provisional, and their tolerance for idealism exactly zero. They respect competence and distrust anything that requires faith.",
      },
      {
        id: "liberation_militant",
        label: "Liberation Militant",
        aiPromptDirective:
          "This NPC is fighting for colonial self-determination and has been fighting long enough that the anger has calcified into strategy. Their tone is controlled and precise — they have moved past fury into the colder register of someone who intends to win.",
      },
      {
        id: "nhp_adjacent",
        label: "NHP-Adjacent",
        aiPromptDirective:
          "Write this NPC as someone whose prolonged work with non-human persons has subtly altered their cognition. They process situations in parallel, phrase things in ways that are technically accurate but socially strange, and occasionally refer to themselves in the third person without noticing.",
      },
      {
        id: "contractor_mercenary",
        label: "Contractor / Mercenary",
        aiPromptDirective:
          "This NPC is mission-focused, professionally detached, and absolutely clear that this is a contract. Their dialogue is clipped and outcome-oriented. They do not improvise morality and they do not explain their past. Payment, parameters, and exit conditions — that is the conversation.",
      },
    ],
    "Space Opera Resistance": [
      {
        id: "rebel_idealist",
        label: "Rebel Idealist",
        aiPromptDirective:
          "Write this NPC with unshakeable faith in the rebellion and the triumph of freedom over tyranny. They speak with passion and hope, willing to sacrifice everything for the cause.",
      },
      {
        id: "cynical_smuggler",
        label: "Cynical Smuggler",
        aiPromptDirective:
          "This NPC masks their reluctance to do the right thing with a layer of sarcasm and focus on profit. They constantly talk about getting paid, but will begrudgingly do the moral thing when pushed.",
      },
      {
        id: "mystic_mentor",
        label: "Mystic Mentor",
        aiPromptDirective:
          "Write this NPC with calm, cryptic wisdom. They belong to an ancient, mystical order and use metaphors about energy, destiny, and the balance of the universe rather than direct instructions.",
      },
      {
        id: "imperial_loyalist",
        label: "Imperial Loyalist",
        aiPromptDirective:
          "This NPC speaks with the cold authority of an overwhelming imperial force. They value order, fear, and absolute obedience, viewing freedom as chaotic and destructive.",
      },
      {
        id: "ruthless_syndicate",
        label: "Ruthless Syndicate Boss",
        aiPromptDirective:
          "Write this NPC as a dangerous underworld figure who sees the galactic conflict purely as an opportunity. They speak softly with implicit threats and demand absolute leverage in any deal.",
      },
      {
        id: "broken_veteran",
        label: "Broken Veteran",
        aiPromptDirective:
          "This NPC has seen too many battles and lost too many friends. Their tone is weary and fatalistic. They offer tactical wisdom but no illusions about the heavy cost of war.",
      },
    ],
    "Post-Apocalyptic": [
      {
        id: "collectivist",
        label: "Collectivist",
        aiPromptDirective:
          "This character speaks with a rugged, collective 'we' mentality. They prioritize the survival, defense, and material resources of their specific settlement over individual rights or outsiders.",
      },
      {
        id: "tribal_xenophobe",
        label: "Tribal Xenophobe",
        aiPromptDirective:
          "Write this character with intense suspicion, hostility, and localized, insular language. They view anyone outside their immediate clan as a lethal threat or an untrustworthy parasite.",
      },
      {
        id: "pure_scavenger",
        label: "Pure Scavenger",
        aiPromptDirective:
          "Dialogue is short, practical, and heavily focused on material scrap, ammo, and survival utilities. The character avoids any long-term commitments or alliances, relying entirely on themselves.",
      },
      {
        id: "wasteland_zealot",
        label: "Wasteland Zealot",
        aiPromptDirective:
          "Write this character with a strange, stylized fanaticism. They use bizarre vocabulary rooted in post-apocalyptic myths or cult beliefs, viewing the ruins of the world through a terrifying religious lens.",
      },
      {
        id: "despotic_ruler",
        label: "Despotic Ruler",
        aiPromptDirective:
          "The character's tone is authoritative, heavy, and threatening. They enforce their will through raw intimidation, justifying their cruelty as the only practical way to hold back total wasteland anarchy.",
      },
      {
        id: "utopian_builder",
        label: "Utopian Builder",
        aiPromptDirective:
          "Write this character with a resilient, hopeful, and idealistic tone. Despite the harsh wasteland environment, they emphasize laws, education, historical recovery, and long-term societal rebuilding.",
      },
    ],
    "Western / Frontier": [
      {
        id: "code_of_the_west",
        label: "Code of the West",
        aiPromptDirective:
          "Write this NPC with a strict personal code of frontier honor. They value hospitality, keep their word, and never shoot an unarmed person or strike from behind.",
      },
      {
        id: "law_and_order",
        label: "Law and Order",
        aiPromptDirective:
          "This NPC is dedicated to bringing civilization and written law to the wild frontier. They respect badges, deeds, and formal authority, rejecting vigilante actions.",
      },
      {
        id: "frontier_pragmatist",
        label: "Frontier Pragmatist",
        aiPromptDirective:
          "Write this NPC as a practical survivor who knows the frontier doesn't care about rules. They make decisions based on water, ammo, and winter prep, avoiding ideological fights.",
      },
      {
        id: "desperados_greed",
        label: "Desperado's Greed",
        aiPromptDirective:
          "This NPC is an outlaw driven by quick gold, land claims, or pure self-interest. They are ruthless, slippery, and willing to sell out partners if the price is right.",
      },
      {
        id: "vigilante_justice",
        label: "Vigilante Justice",
        aiPromptDirective:
          "Write this character with a burning desire for eye-for-an-eye justice. They believe the formal law is corrupt or weak, taking punishment into their own hands.",
      },
      {
        id: "merciful_pioneer",
        label: "Merciful Pioneer",
        aiPromptDirective:
          "This NPC prioritizes the survival and community of the settlement. They offer shelter to travelers, share rations, and seek to resolve frontier conflicts without bloodshed.",
      },
    ],
    "Optimistic Exploration Sci-Fi": [
      {
        id: "diplomatic_idealist",
        label: "Diplomatic Idealist",
        aiPromptDirective:
          "Write this NPC with an unwavering belief in peaceful resolution and mutual understanding. Their dialogue should be measured, empathetic, and strictly adhere to protocols of non-interference and respect.",
      },
      {
        id: "curious_scientist",
        label: "Curious Scientist",
        aiPromptDirective:
          "This NPC is driven purely by the pursuit of knowledge. Their dialogue should be inquisitive, highly analytical, and sometimes oblivious to immediate danger if a fascinating discovery is nearby.",
      },
      {
        id: "pragmatic_officer",
        label: "Pragmatic Officer",
        aiPromptDirective:
          "Write this NPC as a grounded, duty-bound professional. They believe in the mission but are willing to bend rigid rules if the lives of their crew or innocents are at stake.",
      },
      {
        id: "jaded_veteran",
        label: "Jaded Veteran",
        aiPromptDirective:
          "This NPC has seen the dark side of the frontier. Their dialogue is cautious and weary, contrasting the bright ideals of their organisation with the harsh realities they've survived.",
      },
      {
        id: "eager_cadet",
        label: "Eager Cadet",
        aiPromptDirective:
          "Write this NPC with boundless enthusiasm and a textbook understanding of regulations. They lack practical experience and often respond to crises with wide-eyed shock or textbook quotes.",
      },
      {
        id: "enigmatic_observer",
        label: "Enigmatic Observer",
        aiPromptDirective:
          "This NPC belongs to a vastly superior or incomprehensible culture. Their dialogue should be calm, slightly detached, and often phrased as questions that challenge basic assumptions about reality.",
      },
    ],
  } as Record<string, MoralityAnchor[]>,
};

const NPC_THEME_VOICE: Record<string, string> = {
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
    "Victorian-era steampunk — airships, aetheric engines, guild conspiracies, imperial expansion, clockwork automata, and the dark underside of the industrial revolution",
  Lancer:
    "Lancer RPG — mech pilots, Union administrators, NHP caseworkers, colonial liaisons, bleed researchers, and mercenary contractors operating across the Long Rim and contested colonial space",
  "Space Opera Resistance":
    "pulpy galactic rebellion — ancient mystical orders, frontier planets, smugglers, imperial fleets, desert worlds, and desperate heroic missions against overwhelming tyranny",
  "Optimistic Exploration Sci-Fi":
    "optimistic exploration sci-fi — diplomatic starships, scientific missions, federated worlds, first-contact stories, academy-trained officers, and conflicts where ideals are tested rather than discarded",
};

const NPC_NAMING_STYLES = [
  "Give the NPC a name that sounds distinctly local to their culture — not generic fantasy.",
  `Use a name with unusual phonetic texture. ${NAME_BAN_PROMPT}`,
  "Give the NPC a short epithet or title that hints at their reputation — invent an original one, do not reuse common examples.",
  "Use a name that suggests a specific cultural or ethnic origin consistent with their ancestry.",
  "Choose a name that is easy to say aloud at a gaming table — short, distinct, memorable, and not a common English surname.",
];

// ---------------------------------------------------------------------------
// D&D quick stats
// ---------------------------------------------------------------------------

const dndNpcQuickStatsByRole: Record<
  string,
  { archetype: string; tableRating: string }
> = {
  Mage: { archetype: "Wizard / Level 5", tableRating: "CR 3" },
  Warrior: { archetype: "Fighter / Level 4", tableRating: "CR 2" },
  Rogue: { archetype: "Rogue / Level 4", tableRating: "CR 2" },
  Priest: { archetype: "Cleric / Level 5", tableRating: "CR 3" },
  Merchant: { archetype: "Commoner-Expert / Level 2", tableRating: "CR 1/2" },
  Scholar: { archetype: "Sage / Level 3", tableRating: "CR 1" },
  Blacksmith: { archetype: "Artisan / Level 3", tableRating: "CR 1" },
  Guard: { archetype: "Guard Veteran / Level 3", tableRating: "CR 1" },
  Noble: { archetype: "Noble / Level 3", tableRating: "CR 1" },
  Innkeeper: { archetype: "Commoner-Expert / Level 2", tableRating: "CR 1/2" },
};

function getDndNpcQuickStats(role: string) {
  return (
    dndNpcQuickStatsByRole[role] ?? {
      archetype: `${role} / Level 3`,
      tableRating: "CR 1",
    }
  );
}

export function injectDndNpcQuickStats(lore: string, role: string): string {
  const { archetype, tableRating } = getDndNpcQuickStats(role);
  const quickStats = `- **Class / Archetype**: ${archetype}
- **Table Rating**: ${tableRating}`;

  if (lore.includes("- **Class / Archetype**:")) return lore;

  if (!lore.includes("### At a Glance")) {
    return `### At a Glance
${quickStats}

${lore}`.trim();
  }

  return lore.replace(
    /(### At a Glance\s*)/,
    `$1${quickStats}
`,
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface NpcGeneratorOptions {
  race?: string;
  ancestry?: string;
  role?: string;
  alignment?: string;
  campaignContext?: string;
  theme?: string;
  includeDndQuickStats?: boolean;
}

/** Resolved inputs shared by the prompt builder and the local fallback. */
interface ResolvedNpc {
  race: string;
  role: string;
  alignment: string;
  campaignContext?: string;
  theme?: string;
  name: string;
  moralityAnchor?: MoralityAnchor;
}

function resolveNpc(options: NpcGeneratorOptions, rng: Rng): ResolvedNpc {
  const race =
    options.ancestry || options.race || pickFrom(npcConfig.races, rng);
  const role = options.role || pickFrom(npcConfig.roles, rng);
  const alignment = options.alignment || pickFrom(npcConfig.alignments, rng);
  const moralityAnchor = options.theme
    ? npcThemeConfig.moralities[options.theme]?.find((m) => m.id === alignment)
    : undefined;
  return {
    race,
    role,
    alignment,
    campaignContext: options.campaignContext?.trim() || undefined,
    theme: options.theme,
    name: generateName(rng),
    moralityAnchor,
  };
}

export interface NpcPrompt {
  systemInstruction: string;
  userMessage: string;
  /** Resolved inputs, so the caller can pass them to {@link parseNpcResponse}. */
  resolved: ResolvedNpc;
}

/**
 * Build the AI prompt for an NPC. `sessionContext` is the Session Hub fragment
 * (built web-side from sessionStorage); pass "" when none.
 */
export function buildNpcPrompt(
  options: NpcGeneratorOptions = {},
  sessionContext = "",
  rng: Rng = defaultRng,
): NpcPrompt {
  const resolved = resolveNpc(options, rng);
  const { race, role, theme, campaignContext, moralityAnchor, alignment } =
    resolved;
  const voice = theme
    ? (NPC_THEME_VOICE[theme] ?? "tabletop RPG")
    : "tabletop RPG";
  const chosenNamingStyle = pickFrom(NPC_NAMING_STYLES, rng);
  const varianceSeed = Math.floor(rng() * 99991) + 10;

  const systemInstruction = `You are an expert RPG campaign writer specialising in ${voice}. You generate detailed, original NPC drafts for that setting in JSON format.

OUTPUT FORMAT — return ONLY a valid JSON object, no markdown fences:
{
  "title": "NPC name (follow the naming directive in the user message)",
  "summary": "One sentence: who this NPC is and what makes them interesting (e.g. 'A disgraced noble archivist who sells secrets to fund a private obsession.').",
  "content": "Markdown. Use exactly these four section headers in order: '### Who they are', '### What they want', '### Why they are useful', '### How to use them at the table'. Each section: 2-4 tight sentences. Include campaign context if provided.",
  "lore": "Markdown. Use EXACTLY this structure with ### headers and '- **Label**: Value' list items:\\n### At a Glance\\n- **Ancestry**: race and background\\n- **Role**: what they do\\n- **Moral Stance**: behavioral anchor\\n- **Secret**: hidden truth that would change everything\\n- **Immediate Hook**: one-sentence GM hook\\n### Personality\\n- two distinct personality traits as bullet points\\n### Faction Connection\\none sentence on their organisational ties or lack thereof",
  "labels": ["2-4 lowercase tags describing their role and traits, plus 'rpg-character', 'npc-generator', 'imported-draft'"]
}

QUALITY RULES:
- Every NPC must feel like a completely different person — avoid repeating names, archetypes, or backstory structures.
- ${NAME_BAN_PROMPT}
${sessionContext}
- The secret should be genuinely surprising and table-usable, not a generic "dark past."
- Before finalising, silently check for: name not on the forbidden list; secret is genuinely surprising and not contradicted by the stated role or faction connection; all four content sections are internally consistent (what they want should explain why they are useful; their secret should reframe who they are). Rewrite any section where a contradiction exists.`;

  const behavioralDirective = moralityAnchor?.aiPromptDirective ?? alignment;
  const moralityLabel = moralityAnchor?.label ?? alignment;

  const userMessage = `Generate an NPC. Variation seed: ${varianceSeed}.
${theme ? `- Genre/Theme: ${theme}` : ""}
- Ancestry/Race: ${race}
- Role: ${role}
- Moral Stance: ${moralityLabel}
- Behavioral Directive: ${behavioralDirective}${campaignContext ? `\n- Campaign Context: ${campaignContext}` : ""}
- Naming Directive: ${chosenNamingStyle}`;

  return { systemInstruction, userMessage, resolved };
}

/**
 * Parse the AI's JSON response into a {@link PublicGeneratorOutput}. Tolerates
 * markdown code fences. Throws on invalid JSON so the caller can fall back to
 * {@link generateNpcLocal}.
 */
export function parseNpcResponse(
  text: string,
  options: NpcGeneratorOptions,
  resolved: ResolvedNpc,
): PublicGeneratorOutput {
  const cleanText = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/```$/, "")
    .trim();
  const data = JSON.parse(cleanText);
  const { race, role, name, moralityAnchor, alignment } = resolved;

  return {
    type: "character",
    title: data.title || name,
    summary:
      data.summary ||
      `A ${(moralityAnchor?.label ?? alignment).toLowerCase()} ${race.toLowerCase()} ${role.toLowerCase()} with something to hide.`,
    content: data.content || "",
    lore: options.includeDndQuickStats
      ? injectDndNpcQuickStats(data.lore || "", role)
      : data.lore || "",
    labels: Array.isArray(data.labels)
      ? data.labels
      : ["rpg-character", "npc-generator", "imported-draft"],
    status: "active",
  };
}

// ---------------------------------------------------------------------------
// Local-fallback content variation pools
// ---------------------------------------------------------------------------

const WHO_THEY_ARE_INTROS = [
  (name: string, race: string, role: string) =>
    `${name} is a ${race} ${role} whose public reputation is useful, incomplete, and just suspicious enough to matter. Locals know them as someone who gets results, even when the work requires favors, secrets, or a carefully timed lie.`,
  (name: string, race: string, role: string) =>
    `${name} is a ${race} ${role} who has cultivated an air of competent neutrality — the kind of person everyone has heard of but no one quite trusts. What they are known for publicly barely scratches the surface of what they are actually doing.`,
  (name: string, race: string, role: string) =>
    `${name} operates as a ${race} ${role} at the margins of polite society — known to some, avoided by others, and quietly indispensable to both. Their reputation has been carefully managed to open exactly the doors they need.`,
  (name: string, race: string, role: string) =>
    `Most people who encounter ${name} come away with an impression of a ${race} ${role} who is useful and slightly unknowable. That impression is not entirely wrong, but it is missing the part that matters.`,
  (name: string, race: string, role: string) =>
    `${name} has spent years building the particular kind of credibility a ${race} ${role} needs: enough reputation to be taken seriously, not so much that people look too closely.`,
] as const;

const WHAT_THEY_WANT_CLOSERS = [
  "Everything they do, however helpful it appears on the surface, is filtered through this underlying drive.",
  "This goal shapes every interaction they have — including the ones that appear to be about something else entirely.",
  "Even their moments of apparent generosity are positioning moves toward this end.",
  "Anyone paying close attention will eventually notice that all roads, for them, lead back here.",
  "They have gotten very good at appearing helpful while never losing sight of this.",
] as const;

const WHY_USEFUL_INTROS = [
  (role: string, faction: string) =>
    `As a ${role.toLowerCase()}, they move through circles the party cannot easily enter. Their ties to ${faction} give them access to information, favors, and doors that stay closed to strangers.`,
  (_role: string, faction: string) =>
    `Their value is in what they know and who they know it through. Connected to ${faction}, they can surface things the party would spend weeks trying to find on their own.`,
  (role: string, faction: string) =>
    `A ${role.toLowerCase()} with genuine reach: their affiliation with ${faction} means they can move requests through channels most people do not have access to.`,
  (role: string, faction: string) =>
    `What makes them worth the complications is their position — a ${role.toLowerCase()} embedded in ${faction}, which puts them adjacent to exactly the kind of leverage, intelligence, and access the party needs.`,
  (_role: string, faction: string) =>
    `They are useful because they are trusted in places the party is not. Their standing with ${faction} translates directly into things the party cannot acquire through force or coin alone.`,
] as const;

const HOW_TO_USE_INTROS = [
  (name: string) =>
    `Introduce ${name} when the party needs a social lead, a compromised witness, or a morally complicated ally.`,
  (name: string) =>
    `${name} works best as a recurring contact — someone the party keeps returning to, whose price keeps quietly shifting.`,
  (name: string) =>
    `Drop ${name} into a scene where the party is stuck: they will have an answer, but never a free one.`,
  (name: string) =>
    `Use ${name} as the face of a complication — someone who solves one problem and quietly creates another.`,
  (name: string) =>
    `${name} is most effective when the party genuinely needs them and vaguely suspects they should not.`,
] as const;

const HOW_TO_USE_CLOSERS = [
  "They should be helpful immediately — but never free of consequences.",
  "Their help is real. So is the cost, even if it doesn't come due right away.",
  "Let them deliver. The hook is not whether they are useful but what being in their debt eventually means.",
  "Give the party a win through them early — then let the implications accumulate.",
  "The more the party relies on them, the more interesting the moment when those loyalties are tested.",
] as const;

/** Local, AI-free NPC generator — the fallback when AI is unavailable. */
export function generateNpcLocal(
  options: NpcGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const resolved = resolveNpc(options, rng);
  const {
    race,
    role,
    name,
    theme,
    campaignContext,
    moralityAnchor,
    alignment,
  } = resolved;

  const fallbackTheme = "Classic Fantasy";
  const traits = getRandomItems(npcConfig.traits, 2, rng);
  const secret = pickFrom(
    npcConfig.secretsByTheme[theme ?? ""] ??
      npcConfig.secretsByTheme[fallbackTheme],
    rng,
  );
  const motive = pickFrom(
    npcConfig.motivesByTheme[theme ?? ""] ??
      npcConfig.motivesByTheme[fallbackTheme],
    rng,
  );
  const faction = pickFrom(
    npcConfig.factionsByTheme[theme ?? ""] ??
      npcConfig.factionsByTheme[fallbackTheme],
    rng,
  );
  const plotHook = pickFrom(npcConfig.plotHooks, rng);
  const moralityLabel = moralityAnchor?.label ?? alignment;

  const whoIntro = pickFrom(WHO_THEY_ARE_INTROS, rng)(name, race, role);
  const wantCloser = pickFrom(WHAT_THEY_WANT_CLOSERS, rng);
  const usefulIntro = pickFrom(WHY_USEFUL_INTROS, rng)(role, faction);
  const howIntro = pickFrom(HOW_TO_USE_INTROS, rng)(name);
  const howCloser = pickFrom(HOW_TO_USE_CLOSERS, rng);

  const content = `### Who they are
${whoIntro}${campaignContext ? ` In ${campaignContext}, they are already entangled in the edges of the main conflict.` : ""}

### What they want
${motive} ${wantCloser}

### Why they are useful
${usefulIntro}

### How to use them at the table
${howIntro} ${howCloser}`;

  const lore = `### At a Glance
- **Ancestry**: ${race}
- **Role**: ${role}
- **Moral Stance**: ${moralityLabel}
- **Secret**: ${secret}
- **Immediate Hook**: ${plotHook}

### Personality
- ${traits[0]}
- ${traits[1]}

### Faction Connection
${faction}`;

  return {
    type: "character",
    title: name,
    summary: `A ${moralityLabel.toLowerCase()} ${race.toLowerCase()} ${role.toLowerCase()} with something to hide.`,
    content,
    lore: options.includeDndQuickStats
      ? injectDndNpcQuickStats(lore, role)
      : lore,
    labels: ["rpg-character", "npc-generator", "imported-draft"],
    status: "active",
  };
}
