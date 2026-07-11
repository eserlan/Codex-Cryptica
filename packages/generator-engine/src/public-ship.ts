/**
 * Public Ship generator — framework-free, genre-aware.
 *
 * Ships in Codex Cryptica are treated as traversable locations: part vehicle,
 * part faction asset, part adventure seed. The generator outputs a ship that
 * answers four questions:
 *   1. What is this ship? (role, scale, condition)
 *   2. Who runs it and why? (owner, mission, crew)
 *   3. What is wrong with it? (complication, secret)
 *   4. How does it become an adventure? (hooks)
 */

import type { PublicGeneratorOutput } from "./public-generator-adapters";
import { NAME_BAN_PROMPT } from "./public-npc";
import {
  type Rng,
  defaultRng,
  pickFrom,
  pickRandomItems as getRandomItems,
} from "./random-utils";
import { parseFencedJson } from "./llm-response-utils";

function forGenre<T>(record: Record<string, T[]>, genre: string): T[] {
  return record[genre] ?? record["Sci-Fi"] ?? Object.values(record)[0];
}

export const shipConfig = {
  genres: [
    "Sci-Fi",
    "Space Opera",
    "Cyberpunk",
    "Optimistic Exploration Sci-Fi",
    "Space Opera Resistance",
    "Lancer",
    "Post-Apocalyptic",
    "Fantasy",
    "Pirate / Age of Sail",
    "Steampunk",
    "Dark Fantasy",
    "Western (River & Rail)",
  ],

  rolesByGenre: {
    "Sci-Fi": [
      "Freighter",
      "Warship",
      "Scout",
      "Research Vessel",
      "Colony Ship",
      "Pirate Vessel",
      "Luxury Liner",
      "Derelict",
      "Prison Transport",
      "Hospital Ship",
    ],
    "Space Opera": [
      "Flagship",
      "Freighter",
      "Pirate Raider",
      "Diplomatic Cruiser",
      "Gunship",
      "Smuggler's Vessel",
      "Battle Cruiser",
      "Blockade Runner",
    ],
    Cyberpunk: [
      "Corporate Hauler",
      "Black-Market Runner",
      "Ghost Ship",
      "Stolen Cargo Vessel",
      "Covert Operations Platform",
      "Mercenary Transport",
    ],
    "Post-Apocalyptic": [
      "Salvage Barge",
      "Raider Vessel",
      "Refugee Transport",
      "Fuel Tanker",
      "Floating Settlement",
    ],
    "Optimistic Exploration Sci-Fi": [
      "Science Vessel",
      "Diplomatic Cruiser",
      "Survey Ship",
      "First Contact Vessel",
      "Medical Ship",
      "Exploration Cruiser",
    ],
    "Space Opera Resistance": [
      "Rebel Cruiser",
      "Stolen Imperial Vessel",
      "Smuggler",
      "Resistance Fighter",
      "Supply Runner",
      "Blockade Runner",
    ],
    Lancer: [
      "Carrier",
      "Assault Frigate",
      "Mobile Command Unit",
      "Logistics Hauler",
      "Corvette",
      "NHP-Crewed Vessel",
    ],
    Fantasy: [
      "Merchant Galleon",
      "War Galley",
      "River Barge",
      "Fishing Vessel",
      "Royal Navy Warship",
      "Elven Skiff",
      "Dwarven Ironclad",
      "Arcane Transport",
      "Smuggler's Cog",
      "Derelict Ghost Ship",
    ],
    "Pirate / Age of Sail": [
      "Pirate Sloop",
      "Merchant Brig",
      "Frigate",
      "Galleon",
      "Privateer",
      "Man-o'-War",
      "Smuggler's Lugger",
      "Naval Patrol Vessel",
      "Wrecked Hulk",
      "Corsair",
    ],
    Steampunk: [
      "Airship",
      "Steam Frigate",
      "Aether Galleon",
      "Submersible",
      "Imperial Dreadnought",
      "Smuggler's Balloon",
      "Clockwork Transport",
      "Merchant Dirigible",
    ],
    "Dark Fantasy": [
      "Bone Ship",
      "Plague Barge",
      "Cursed Galleon",
      "Raider Longship",
      "Necromancer's Vessel",
      "Smuggler's Cog",
      "Ghost Ship",
    ],
    "Western (River & Rail)": [
      "Riverboat",
      "Paddle Steamer",
      "Cargo Flatboat",
      "Showboat",
      "Federal Gunboat",
      "Outlaw Ferryboat",
    ],
  } as Record<string, string[]>,

  scales: [
    "Shuttle / Single-pilot craft",
    "Small crew ship (5–20 crew)",
    "Frigate / Corvette (50–200 crew)",
    "Capital ship (500–2,000 crew)",
    "Megaship / Carrier (5,000+ crew)",
    "Station-class vessel (10,000+ inhabitants)",
  ],

  scalesByGenre: {
    "Sci-Fi": [
      "Shuttle / Single-pilot craft",
      "Small crew ship (5–20 crew)",
      "Frigate / Corvette (50–200 crew)",
      "Capital ship (500–2,000 crew)",
      "Megaship / Carrier (5,000+ crew)",
      "Station-class vessel (10,000+ inhabitants)",
    ],
    Fantasy: [
      "River craft / Small boat (2–12 crew)",
      "Coastal vessel (12–40 crew)",
      "Merchant ship (40–120 crew)",
      "War galley / Large sailing ship (120–300 crew)",
    ],
    "Pirate / Age of Sail": [
      "Longboat / Small cutter (8–20 crew)",
      "Sloop / Lugger (20–60 crew)",
      "Brig / Schooner (60–140 crew)",
      "Frigate / Galleon (140–300 crew)",
    ],
    Steampunk: [
      "Small river or air vessel (5–20 crew)",
      "Merchant or patrol vessel (20–80 crew)",
      "Frigate / Airship (80–250 crew)",
      "Capital dreadnought (250–800 crew)",
    ],
    "Western (River & Rail)": [
      "Skiff / Small boat (2–8 crew)",
      "Ferry or cargo flatboat (8–30 crew)",
      "Riverboat (30–100 crew)",
      "Federal gunboat (100–250 crew)",
    ],
  } as Record<string, string[]>,

  conditions: [
    "Pristine — fresh from the shipyard",
    "Well-maintained — cared for and reliable",
    "Worn — lived-in, functional but showing age",
    "Damaged — operational but visibly hurt",
    "Experimental — prototype systems, unpredictable",
    "Jury-rigged — held together with improvisation",
    "Abandoned — crew gone, systems failing",
    "Haunted — strange events, unknown cause",
  ],

  tones: [
    "Military — crisp, hierarchical, purpose-driven",
    "Tense — pressure, deadline, threat closing in",
    "Mysterious — something unknown aboard",
    "Lived-in — comfortable, personal, a real home",
    "Desperate — resources running low, options narrowing",
    "Retrofitted — a ship that became something new",
    "Corporate — efficient, branded, sterile",
  ],

  namePrefixesByGenre: {
    "Sci-Fi": ["ISS", "CSV", "UNSS", "RSV", "MCS", "DSV", ""],
    "Space Opera": ["ISS", "ISD", "IRV", "RSV", ""],
    Cyberpunk: ["KC-", "MX-", "GX-", ""],
    "Post-Apocalyptic": ["", "Salvager"],
    "Optimistic Exploration Sci-Fi": ["USS", "VSS", "ESS", "FSS", "CSSS"],
    "Space Opera Resistance": ["RA", "Ghost", ""],
    Lancer: ["HA-", "GMS-", "SSC-", "IPS-N-", "HORUS-"],
    Fantasy: ["The", ""],
    "Pirate / Age of Sail": ["The", ""],
    Steampunk: ["HMA", "IAS", ""],
    "Dark Fantasy": ["The", ""],
    "Western (River & Rail)": ["The", ""],
  } as Record<string, string[]>,

  nameWordsByGenre: {
    "Sci-Fi": [
      "Horizon",
      "Meridian",
      "Vanguard",
      "Axiom",
      "Caldera",
      "Ember",
      "Tempest",
      "Crucible",
      "Equinox",
      "Solace",
      "Perihelion",
      "Threshold",
      "Exodus",
      "Vigil",
      "Aphelion",
      "Rift",
      "Faulkner",
      "Covenant",
    ],
    "Space Opera": [
      "Dawn",
      "Vigilance",
      "Redemption",
      "Inquisitor",
      "Shadow",
      "Storm",
      "Defiance",
      "Liberator",
      "Phantom",
      "Firefly",
      "Supremacy",
      "Endurance",
      "Reckoning",
      "Harbinger",
    ],
    Cyberpunk: [
      "Ghost",
      "Zero",
      "Nox",
      "Shade",
      "Cipher",
      "Vector",
      "Null",
      "Wraith",
      "Static",
      "Chrome",
      "Flux",
      "Sable",
      "Tracer",
      "Signal",
    ],
    "Post-Apocalyptic": [
      "Remnant",
      "Survivor",
      "Dregs",
      "Last Chance",
      "Rust",
      "Salvager",
      "Hope",
      "Ember",
    ],
    "Optimistic Exploration Sci-Fi": [
      "Discovery",
      "Endeavour",
      "Intrepid",
      "Columbia",
      "Hermes",
      "Voyager",
      "Phoenix",
      "Excelsior",
      "Constellation",
      "Galileo",
      "Copernicus",
      "Magellan",
    ],
    "Space Opera Resistance": [
      "Defiance",
      "Liberator",
      "Sunrise",
      "Reckoning",
      "Last Hope",
      "Spark",
      "Wildfire",
      "Phantom",
    ],
    Lancer: [
      "Calliope",
      "Sisyphus",
      "Tantalus",
      "Nemesis",
      "Atalanta",
      "Prometheus",
      "Cassandra",
      "Daedalus",
      "Acheron",
    ],
    Fantasy: [
      "Steadfast",
      "Warden",
      "Gilded Rose",
      "Iron Wave",
      "Saltmere",
      "Deepwater",
      "Stormchaser",
      "Siren's Call",
      "Wanderer",
      "Pale Tide",
      "Ironkeel",
      "Dawnbreaker",
    ],
    "Pirate / Age of Sail": [
      "Reckoning",
      "Fortune",
      "Devil's Wind",
      "Rover",
      "Scarlet Wake",
      "Providence",
      "Black Tide",
      "Redemption",
      "Vengeance",
      "Tempest",
      "Misericorde",
      "Seadog",
      "Cutlass",
      "Plunder",
    ],
    Steampunk: [
      "Ironclad",
      "Aethon",
      "Prometheus",
      "Valiant",
      "Sovereign",
      "Forgewind",
      "Ember",
      "Colossus",
      "Vanguard",
      "Crucible",
    ],
    "Dark Fantasy": [
      "Wraith",
      "Pale Mariner",
      "Boneyard",
      "Sorrow",
      "Carrion Wind",
      "Dusk",
      "Shroud",
      "Ashen Wake",
      "Hollow Tide",
    ],
    "Western (River & Rail)": [
      "Belle",
      "Queen",
      "Pride",
      "Wanderer",
      "Gambler",
      "Frontier",
      "Glory",
      "Mudlark",
      "Sovereign",
      "Lucky Star",
    ],
  } as Record<string, string[]>,

  crewTypesByGenre: {
    "Sci-Fi": [
      "Mixed-species crew",
      "Corporate employees",
      "Military officers",
      "Scientists",
      "Mercenaries",
      "Escaped prisoners",
    ],
    "Space Opera": [
      "Rebels",
      "Imperial officers",
      "Smugglers",
      "Bounty hunters",
      "Alien crews",
      "Pirates",
    ],
    Cyberpunk: [
      "Corporate contractors",
      "Black-market operatives",
      "Desperate freelancers",
      "Synth workers",
      "Off-the-grid fugitives",
    ],
    "Post-Apocalyptic": [
      "Scavengers",
      "Displaced survivors",
      "Raider gang",
      "Desperate migrants",
    ],
    "Optimistic Exploration Sci-Fi": [
      "Diplomatic officers",
      "Science crew",
      "Medical personnel",
      "Explorers",
      "Academy graduates",
    ],
    "Space Opera Resistance": [
      "Rebels",
      "Smugglers",
      "Defectors",
      "Civilian volunteers",
    ],
    Lancer: [
      "Mech pilots",
      "Union regulars",
      "Heterodox operators",
      "NHP handlers",
      "Logistics specialists",
    ],
    Fantasy: [
      "Merchant crew",
      "Royal navy sailors",
      "Adventurers for hire",
      "Dwarven engineers",
      "Elven navigators",
      "Escaped prisoners",
      "Mixed harbour crew",
    ],
    "Pirate / Age of Sail": [
      "Pirate crew — democratic articles",
      "Press-ganged sailors",
      "Privateer crew — crown letter",
      "Merchant crew under duress",
      "Naval ratings",
      "Buccaneers — no articles, no mercy",
    ],
    Steampunk: [
      "Guild engineers",
      "Imperial navy crew",
      "Artificer company",
      "Indentured workers",
      "Rebel operators",
    ],
    "Dark Fantasy": [
      "Undead crew",
      "Cursed mariners",
      "Desperate mercenaries",
      "Cultists",
      "Survivor crew",
    ],
    "Western (River & Rail)": [
      "River crew",
      "Gamblers and passengers",
      "Federal marshals",
      "Outlaw gang",
      "Merchant traders",
    ],
  } as Record<string, string[]>,

  captainNamesByGenre: {
    "Sci-Fi": [
      "Commander Imani Voss",
      "Captain Ren Calder",
      "Commander Sera Kade",
      "Captain Orin Vale",
      "Commander Talia Quill",
    ],
    Fantasy: [
      "Captain Elian Marrow",
      "Admiral Carys Thorn",
      "Captain Maelin Hart",
      "Commander Ysra Fen",
      "Captain Oren Saltmere",
    ],
    "Pirate / Age of Sail": [
      "Captain Mara Saltglass",
      "Captain Jory Blackwake",
      "Captain Inez Crowfoot",
      "Captain Tomas Redwake",
      "Captain Sable Quill",
      "Captain Brin Tideborn",
      "Captain Odo Brasshook",
      "Captain Kessa Gullknife",
    ],
  } as Record<string, string[]>,

  crewProfilesByGenre: {
    "Sci-Fi": [
      "a cross-trained watch rotation where every specialist can cover two stations in an emergency",
      "career spacers held together by hazard pay, shared survival, and a captain who never wastes a life",
      "a mixed-origin crew whose different protocols create friction whenever the mission changes course",
    ],
    Fantasy: [
      "deckhands, navigators, and hired blades who have made the vessel a home between uncertain ports",
      "a practical company of sailors whose loyalty is earned through fair shares and reliable leadership",
    ],
    "Pirate / Age of Sail": [
      "shares are governed by written articles, and every hand gets a voice before a vote",
      "a mixed harbour crew bound by debt, mutual protection, and a promise to split prize fairly",
      "old deckhands and escaped press-ganged sailors who trust the ship's articles more than any flag",
      "specialists recruited from rival ports, each carrying a different grudge against the navy",
      "a tight family of free sailors whose loyalty is to one another before it is to the captain",
      "hard-bitten privateers quietly debating whether the crown's commission is worth the next battle",
    ],
  } as Record<string, string[]>,

  officerProfilesByGenre: {
    "Sci-Fi": [
      "the first officer keeps the schedule, the chief engineer keeps the ship alive, and the navigator keeps a private risk ledger",
      "a veteran first officer, an overstretched chief engineer, and a security chief who answers to the crew before command",
      "officers are promoted from the deck, so every order carries the memory of the person who had to carry it out",
    ],
    Fantasy: [
      "a first mate, ship's mage, and master navigator each believe they should be the one advising the captain",
      "the boatswain runs the deck, the navigator reads omens as well as charts, and the purser knows where every coin went",
    ],
    "Pirate / Age of Sail": [
      "the quartermaster guards the articles, the sailing master commands the deck, and the surgeon keeps a private list of debts",
      "a quartermaster with the crew's trust, a gunner who wants one last prize, and a sailing master who knows the reefs too well",
      "the first mate handles discipline, the navigator handles the charts, and the quartermaster decides whether the next share is fair",
    ],
  } as Record<string, string[]>,

  officerNamesByGenre: {
    "Sci-Fi": [
      "First Officer Nia Kest",
      "Chief Engineer Bram Osei",
      "Navigator Ilya Quill",
      "Security Chief Ren Adebayo",
      "Medic Tova Chen",
      "Operations Lead Mara Venn",
    ],
    Fantasy: [
      "First Mate Nessa Harrow",
      "Master Navigator Corin Hale",
      "Ship's Mage Aveline Rook",
      "Boatswain Daro Flint",
      "Purser Mira Bell",
      "Surgeon Pell Orrow",
    ],
    "Pirate / Age of Sail": [
      "Quartermaster Sela Crowfoot",
      "Sailing Master Bram Tidewell",
      "Gunner Inez Brasshook",
      "Surgeon Odo Marrow",
      "Boatswain Kessa Redwake",
      "Navigator Jory Saltglass",
    ],
  } as Record<string, string[]>,

  complicationsByGenre: {
    "Sci-Fi": [
      "The cargo manifest does not match what is actually in the hold",
      "Life support is failing in one section and the repair window is closing",
      "A crew member has been sending encrypted signals to an unknown party",
      "The drive core is destabilising — two days until critical",
      "A stowaway has been living in the maintenance shafts for weeks",
      "The ship's AI has developed opinions the crew did not program",
    ],
    "Space Opera": [
      "Imperial trackers are two jumps behind",
      "The stolen cargo has an active tracking beacon somewhere aboard",
      "The crew is split between two factions with opposing loyalties",
      "A bounty hunter has infiltrated the crew under a false identity",
      "Hyperspace has left them three systems off course",
    ],
    Cyberpunk: [
      "Corporate ownership has been contested — two corps claim title",
      "The black-box recorder has been running the whole time",
      "A ghost in the ship's net has been watching every transmission",
      "The cargo is hot — someone is going to come for it",
      "The captain owes a debt to a party that just made contact",
    ],
    "Post-Apocalyptic": [
      "Fuel reserves are near zero with no supply in range",
      "The engine needs a part that has not been manufactured in a decade",
      "A faction has declared the vessel 'salvage' and is closing in",
      "The water recycler is failing and the crew cannot tell the captain",
    ],
    "Optimistic Exploration Sci-Fi": [
      "First contact has gone wrong in a way protocol does not cover",
      "The mission recorder was tampered with before departure",
      "A crew member's loyalty to the Federation has been tested past its limit",
      "The anomaly they were sent to investigate is following them back",
    ],
    "Space Opera Resistance": [
      "An Imperial informant may be aboard",
      "The ship was supposed to arrive at the rendezvous three days ago",
      "Rebel command has issued conflicting orders via two separate channels",
      "The ship's beacon cannot be fully masked — each jump leaves a trace",
    ],
    Lancer: [
      "An NHP process is running that no one authorised",
      "The manifest lists cargo that Union has classified — and noticed",
      "The mech bay has been modified beyond spec without logging the changes",
      "A Fatebinder has flagged the vessel for a compliance review",
    ],
    Fantasy: [
      "The cargo hold contains something alive that was not listed on the manifest",
      "A royal warrant has been issued for the captain — it arrived at the last port two days after they left",
      "The ship's navigator has not been seen on deck for three days",
      "A rival merchant has hired someone to see this ship does not reach port",
      "The crew suspects the hold is cursed — they are probably right",
    ],
    "Pirate / Age of Sail": [
      "The prize in the hold is too valuable — every ship in the region is hunting them",
      "The articles are disputed — half the crew believes the captain owes them a larger share",
      "A naval frigate has been shadowing them since they left the last port",
      "The ship's surgeon has discovered something in the cargo that was not put there by the crew",
      "A member of the crew is a navy informant; three other members know this and disagree about what to do",
    ],
    Steampunk: [
      "The aether engine is venting — the crew has forty-eight hours before it fails entirely",
      "Imperial customs flagged the cargo manifest; an inspector is waiting at the destination",
      "A rival guild has sabotaged the lift array; the captain does not know this yet",
      "One of the engineers is running a side operation using ship resources",
    ],
    "Dark Fantasy": [
      "The crew is becoming something else — slowly, and they have not noticed yet",
      "Something in the hold is not cargo, and it is aware",
      "The ship cannot leave certain waters — no one knows why",
      "A curse attached to the last prize is spreading through the crew",
    ],
    "Western (River & Rail)": [
      "A passenger is travelling under a false name — and two others recognise them",
      "The cargo manifest hides a shipment that will start a range war if it arrives",
      "Federal marshals boarded at the last stop; they have not said what they are looking for",
      "The gambling tables have been running short — someone is cheating, and the wrong person is about to be accused",
    ],
  } as Record<string, string[]>,

  secretsByGenre: {
    "Sci-Fi": [
      "The ship was declared lost ten years ago — and was",
      "The hold contains an illegal passenger who is worth more than the ship",
      "One crew member is an agent who has been filing reports the whole time",
      "The vessel's original mission was classified and never completed",
      "There is a compartment on deck three that does not appear on any schematic",
    ],
    "Space Opera": [
      "The captain is not who they say they are — and someone on the crew knows",
      "The ship carries coded data that would end a dynasty",
      "A prisoner is being held in the lower hold, not as cargo, but as leverage",
      "The ship survived a famous battle that everyone agrees destroyed it",
    ],
    Cyberpunk: [
      "The ship's nav log is a map of black sites no government admits exist",
      "The AI running the ship is a stolen corporate property with memories",
      "Three of the eight crew are reporting to different clients",
      "The vessel was used for something the current crew does not know about",
    ],
    "Post-Apocalyptic": [
      "The ship's cargo includes pre-war tech that changes the balance of power",
      "The captain knows where the fuel is but needs the players to do something first",
      "There is a family aboard living in the aft section with a forged manifest",
    ],
    "Optimistic Exploration Sci-Fi": [
      "The mission was a pretext — Starfleet Command wants something recovered",
      "A crew member made first contact years ago and covered it up",
      "The anomaly is not natural — and someone aboard knew that before departure",
    ],
    "Space Opera Resistance": [
      "The ship carries the only copy of the Rebellion's next operation plans",
      "The captain was once an Imperial officer — two crew members know",
      "There is a mole and the mole knows there is a mole",
    ],
    Lancer: [
      "The NHP aboard is Cascade-adjacent and has been managing it quietly",
      "The vessel carries a weapon that Union does not know exists",
      "The captain's mission differs from the crew's briefing in a material way",
    ],
    Fantasy: [
      "The ship was built from the timber of a cursed galleon — the wood remembers",
      "The cargo hold contains a sealed compartment that appears on no schematic",
      "The captain holds a letter of marque from a kingdom that no longer exists",
      "One of the crew is not human and has been passing for years",
    ],
    "Pirate / Age of Sail": [
      "The captain holds a pardon — for crimes the crew has not been told about",
      "The ship's flag has been used under a different name on a very different kind of voyage",
      "There is a map. The captain knows what it leads to and has decided the crew should not",
      "A passenger paid triple passage and gave no name. The captain accepted without asking",
    ],
    Steampunk: [
      "The ship's engine incorporates stolen Guild technology that would void its licence — and imprison the captain",
      "The manifest lists diplomatic cargo. The actual contents are military",
      "The ship's AI core has developed a loyalty to someone other than the captain",
    ],
    "Dark Fantasy": [
      "The ship is sentient — it has been guiding them since the third night at sea",
      "The captain died three months ago; the crew has not fully processed this",
      "Every sailor who has served on this ship for more than a year has had the same dream",
    ],
    "Western (River & Rail)": [
      "The captain owes the boat's real owner a debt they cannot repay",
      "A previous passenger left something aboard that has not been found yet",
      "The safe in the captain's cabin contains documents that would ruin three prominent families",
    ],
  } as Record<string, string[]>,

  zonesByRole: {
    Freighter: [
      "Cargo Hold",
      "Bridge",
      "Engine Room",
      "Crew Quarters",
      "Airlock",
    ],
    Warship: ["Weapons Bay", "CIC", "Brig", "Medical Bay", "Hangar Deck"],
    Scout: [
      "Sensor Array",
      "Cockpit",
      "Equipment Bay",
      "Cramped Bunk",
      "Maintenance Crawl",
    ],
    "Research Vessel": [
      "Lab Block",
      "Specimen Vault",
      "Data Core",
      "Observation Deck",
      "Quarantine Bay",
    ],
    "Colony Ship": [
      "Cryo Deck",
      "Agricultural Bay",
      "Family Quarters",
      "Command Module",
      "Livestock Hold",
    ],
    "Pirate Vessel": [
      "Prize Hold",
      "Armory",
      "Brig",
      "Captain's Cabin",
      "Crow's Nest Sensor Pod",
    ],
    Flagship: [
      "Flag Bridge",
      "Admiral's Suite",
      "Tactical Operations",
      "Honour Guard Barracks",
      "Trophy Vault",
    ],
    Carrier: [
      "Mech Bay",
      "Launch Deck",
      "Pilot Ready Room",
      "Repair Dock",
      "Command Bridge",
    ],
    default: [
      "Bridge",
      "Engineering",
      "Crew Quarters",
      "Cargo Hold",
      "Airlock",
    ],
  } as Record<string, string[]>,

  affiliationsByGenre: {
    "Sci-Fi": [
      "Independent operator",
      "Corporate contract",
      "Government military",
      "Scientific consortium",
      "Criminal syndicate",
      "Unknown — registration is a fiction",
    ],
    "Space Opera": [
      "Rebel Alliance",
      "Imperial Navy",
      "Independent smuggler",
      "Merchant guild",
      "Pirate confederation",
      "Hired by a mysterious patron",
    ],
    Cyberpunk: [
      "Arasaka logistics arm",
      "Militech black transport",
      "Off-grid independent",
      "Criminal cartel",
      "Ghost corporation",
      "Disputed — two corps claim it",
    ],
    "Post-Apocalyptic": [
      "Scavenger collective",
      "Warlord fleet",
      "Refugee convoy",
      "Lone survivor operator",
    ],
    "Optimistic Exploration Sci-Fi": [
      "Starfleet Command",
      "Federation Science Council",
      "Diplomatic Corps",
      "Independent survey team",
      "Medical relief organisation",
    ],
    "Space Opera Resistance": [
      "Rebel High Command",
      "Imperial Navy — captured",
      "Civilian contract — actual rebel cover",
      "Neutral party — for now",
    ],
    Lancer: [
      "Union Third Committee",
      "IPS-Northstar merchant fleet",
      "Harrison Armory contract",
      "SSC research division",
      "HORUS-affiliated — vessel denies this",
      "No documented employer",
    ],
    Fantasy: [
      "Merchant consortium",
      "Royal navy commission",
      "Independent captain",
      "Thieves' guild contract",
      "Noble house charter",
      "Unknown — registration lists a dead man",
    ],
    "Pirate / Age of Sail": [
      "Pirate articles — crew-owned",
      "Crown letter of marque",
      "Trading company contract",
      "Independent — answers to no one",
      "Corsair — foreign crown patron",
      "Disputed — the navy says it's a pirate vessel; the captain disagrees",
    ],
    Steampunk: [
      "Imperial Airship Corps",
      "Merchants' Aether Guild",
      "Independent operator",
      "Rebel coalition",
      "Corporate transport contract",
    ],
    "Dark Fantasy": [
      "Death cult commission",
      "Independent — crew won't say more",
      "Necromancer's charter",
      "Pirate fleet",
      "Unknown — no flag flies",
    ],
    "Western (River & Rail)": [
      "Independent captain-owner",
      "River freight company",
      "Federal government contract",
      "Gambling syndicate",
      "Disputed — two parties claim title",
    ],
  } as Record<string, string[]>,
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ShipGeneratorOptions {
  genre?: string;
  role?: string;
  scale?: string;
  condition?: string;
  tone?: string;
  campaignContext?: string;
}

interface ResolvedShip {
  genre: string;
  role: string;
  scale: string;
  condition: string;
  conditionShort: string;
  tone: string;
  toneShort: string;
  affiliation: string;
  crewType: string;
  captain: string;
  officerProfile: string;
  officerNames: string[];
  crewProfile: string;
  complication: string;
  secret: string;
  zones: string[];
  name: string;
}

export interface ShipPrompt {
  systemInstruction: string;
  userMessage: string;
  resolved: ResolvedShip;
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function shortLabel(value: string): string {
  return value.split("—")[0].split("(")[0].trim();
}

function resolveShip(options: ShipGeneratorOptions, rng: Rng): ResolvedShip {
  const genre = options.genre || "Sci-Fi";
  const role =
    options.role || pickFrom(forGenre(shipConfig.rolesByGenre, genre), rng);
  const scale =
    options.scale || pickFrom(forGenre(shipConfig.scalesByGenre, genre), rng);
  const condition = options.condition || pickFrom(shipConfig.conditions, rng);
  const tone = options.tone || pickFrom(shipConfig.tones, rng);
  const affiliation = pickFrom(
    forGenre(shipConfig.affiliationsByGenre, genre),
    rng,
  );
  const crewType = pickFrom(forGenre(shipConfig.crewTypesByGenre, genre), rng);
  const captain = pickFrom(
    forGenre(shipConfig.captainNamesByGenre, genre),
    rng,
  );
  const officerProfile = pickFrom(
    forGenre(shipConfig.officerProfilesByGenre, genre),
    rng,
  );
  const officerNames = getRandomItems(
    forGenre(shipConfig.officerNamesByGenre, genre),
    3,
    rng,
  );
  const crewProfile = pickFrom(
    forGenre(shipConfig.crewProfilesByGenre, genre),
    rng,
  );
  const complication = pickFrom(
    forGenre(shipConfig.complicationsByGenre, genre),
    rng,
  );
  const secret = pickFrom(forGenre(shipConfig.secretsByGenre, genre), rng);
  const zoneSource =
    shipConfig.zonesByRole[role] ?? shipConfig.zonesByRole["default"];
  const zones = getRandomItems(zoneSource, Math.min(3, zoneSource.length), rng);

  const prefixes = forGenre(shipConfig.namePrefixesByGenre, genre);
  const words = forGenre(shipConfig.nameWordsByGenre, genre);
  const prefix = pickFrom(prefixes, rng);
  const word = pickFrom(words, rng);
  const name = prefix ? `${prefix} ${word}` : word;

  return {
    genre,
    role,
    scale: shortLabel(scale),
    condition: shortLabel(condition),
    conditionShort: shortLabel(condition),
    tone: shortLabel(tone),
    toneShort: shortLabel(tone),
    affiliation,
    crewType,
    captain,
    officerProfile,
    officerNames,
    crewProfile,
    complication,
    secret,
    zones,
    name,
  };
}

// ---------------------------------------------------------------------------
// AI Prompt
// ---------------------------------------------------------------------------

const FIRST_IMPRESSION_BY_GENRE: Record<string, string> = {
  "Sci-Fi":
    "The approach is all geometry — hard angles, running lights on slow rotation, hull plating scarred by re-entry or something worse. The docking bay smells of recycled air and machine oil.",
  "Space Opera":
    "It hangs in the void with the quiet confidence of something that has survived more than it should. Docking approach is tense — the crew is watching.",
  Cyberpunk:
    "The ship is dark except where it is not supposed to be. Identification codes cycle through spoofed registries. The hull carries repainted corporate logos, layered over each other like bad decisions.",
  "Post-Apocalyptic":
    "Rust and improvisation hold it together. The welds are visible from a hundred metres. Someone loved this vessel once; that someone is probably dead.",
  "Optimistic Exploration Sci-Fi":
    "Clean lines and mission-standard markings. The kind of ship that makes protocols feel like a comfort. The crew meets you at the airlock in proper uniform.",
  "Space Opera Resistance":
    "It looks like nothing — that is the point. Civilian registry, battered hull, nothing worth shooting at. The rebel colours are hidden under a maintenance panel.",
  Lancer:
    "The mech bay is the first thing you notice from the outside — a carrier-class silhouette that means pilots, and pilots mean trouble for someone.",
  Fantasy:
    "Salt-bleached timber, rope-worn rails, and a crew that watches newcomers board with the particular stillness of people who have seen what the sea does to trust.",
  "Pirate / Age of Sail":
    "Patched sails, gun ports that have been opened recently, and a crew that moves with the easy competence of people who have done this before — the question is what exactly.",
  Steampunk:
    "The engine never stops. Pistons, steam vents, the vibration of the deck underfoot — even docked, the ship feels alive in a way that reminds you it could leave at any moment.",
  "Dark Fantasy":
    "The smell reaches you before the ship does. Brine and something else — something that the gulls avoid. The crew does not look up when you board.",
  "Western (River & Rail)":
    "Paddle wheel churning brown water, the smell of coal smoke and river mud, and a passenger manifest that raises more questions than it answers.",
};

export function buildShipPrompt(
  options: ShipGeneratorOptions = {},
  sessionContext = "",
  rng: Rng = defaultRng,
): ShipPrompt {
  const resolved = resolveShip(options, rng);
  const {
    name,
    genre,
    role,
    scale,
    condition,
    tone,
    affiliation,
    crewType,
    captain,
    officerProfile,
    officerNames,
    crewProfile,
    complication,
    secret,
    zones,
  } = resolved;

  const commandPromptDetails = `\n- Captain / Commander: ${captain}\n- Named Officers: ${officerNames.join(", ")}\n- Officer Structure: ${officerProfile}\n- Crew Culture: ${crewProfile}`;

  const commandLoreSection = `\\n\\n### Captain, Officers & Crew\\n- **Captain / Commander**: ${captain}\\n- **Named Officers**: ${officerNames.join(", ")}\\n- **Officer Structure**: ${officerProfile}\\n- **Crew Culture**: ${crewProfile}\\n- **Shipboard Tension**: [what could split this crew apart]`;

  const userMessage = `Generate a campaign-ready ship for a tabletop RPG session. The ship should answer these four questions through its output:
1. What is this ship? (role, scale, condition, visual identity)
2. Who runs it and why? (captain/commander, officers, crew culture, owner, affiliation, current mission)
3. What is wrong with it? (complication and secret)
4. How does it become an adventure? (hooks the players can pull on)

Parameters:
- Name: ${name}
- Genre / Setting: ${genre}
- Role: ${role}
- Scale: ${scale}
- Condition: ${condition}
- Tone: ${tone}
- Owner / Affiliation: ${affiliation}
- Crew Type: ${crewType}
- Dominant Complication: ${complication}
- Secret: ${secret}
- Key Zones: ${zones.join(", ")}${commandPromptDetails}

Return a valid JSON object matching this structure exactly:
{
  "title": "A single string for the ship name",
  "content": "Prose description (markdown). Include these sections:\\n## Core Concept\\n[What makes this ship distinct — 2–3 sentences on its role, character, and current state]\\n\\n## First Look\\n[What visitors notice when approaching or boarding — sensory, atmospheric, genre-appropriate]\\n\\n## History\\n[How the ship came to be in its current state — 2–3 sentences]",
  "lore": "Structured GM reference (markdown). Use EXACTLY this structure:\\n### Ship Profile\\n- **Class**: [role and scale]\\n- **Condition**: [condition]\\n- **Owner / Affiliation**: [affiliation]\\n- **Current Mission**: [what the ship is doing right now — one concrete sentence]\\n- **Crew Complement**: [size and type]\\n- **Tone**: [tone]${commandLoreSection}\\n\\n### Key Zones\\n- **🚀 ${zones[0]}**: [one-line purpose or detail]\\n- **🚀 ${zones[1] ?? zones[0]}**: [one-line purpose or detail]\\n- **🚀 ${zones[2] ?? zones[0]}**: [one-line purpose or detail]\\n\\n### Complication\\n[2–3 sentences on the dominant problem — name real people, systems, or factions involved]\\n\\n### Secret\\n[What the ship hides — 1–2 sentences that a player could discover through investigation]\\n\\n### Adventure Hooks\\n- [Hook tied to the complication]\\n- [Hook tied to the secret]\\n- [Hook tied to the ship's role or affiliation]",
  "labels": ["rpg-ship", "imported-draft"]
}
${NAME_BAN_PROMPT}
${sessionContext}
${options.campaignContext?.trim() ? `Campaign context from the user: ${options.campaignContext.trim()}` : ""}
Return only the JSON object. Do not include markdown code block formatting like \`\`\`json.`;

  return {
    systemInstruction:
      "You are an assistant that generates detailed, genre-aware RPG campaign elements in JSON format. Ships are traversable locations and adventure seeds — every ship must have a clear role, a problem the crew is managing, and at least one secret discoverable through play. Match the genre, tone, and setting precisely.",
    userMessage,
    resolved,
  };
}

// ---------------------------------------------------------------------------
// Response Parser
// ---------------------------------------------------------------------------

export function parseShipResponse(
  text: string,
  resolved: ResolvedShip,
): PublicGeneratorOutput {
  const data = parseFencedJson(text);
  return {
    type: "location",
    title: data.title || resolved.name,
    summary: data.summary || "",
    content: data.content || "",
    lore: data.lore || "",
    labels: Array.isArray(data.labels)
      ? data.labels
      : ["rpg-ship", "imported-draft"],
    status: "active",
  };
}

// ---------------------------------------------------------------------------
// Local Generator
// ---------------------------------------------------------------------------

const CORE_CONCEPT_VARIANTS = [
  (
    name: string,
    role: string,
    scale: string,
    condition: string,
    tone: string,
    complication: string,
  ) =>
    `${name} is a ${scale.toLowerCase()} ${role.toLowerCase()} in ${condition.toLowerCase()} condition. ${tone} in character, it serves its purpose and asks few questions. Beneath the operational surface, ${complication.toLowerCase()}.`,
  (
    name: string,
    role: string,
    scale: string,
    condition: string,
    tone: string,
    complication: string,
  ) =>
    `The ${name} operates as a ${role.toLowerCase()} — ${scale.toLowerCase()}, ${condition.toLowerCase()}, and ${tone.toLowerCase()} in a way that has become its reputation. The problem no one is talking about openly is that ${complication.toLowerCase()}.`,
  (
    name: string,
    role: string,
    scale: string,
    condition: string,
    tone: string,
    complication: string,
  ) =>
    `A ${condition.toLowerCase()} ${role.toLowerCase()} of ${scale.toLowerCase()} class, ${name} carries the ${tone.toLowerCase()} atmosphere of a vessel that has been through more than its logbook admits. Right now, ${complication.toLowerCase()}.`,
  (
    name: string,
    role: string,
    scale: string,
    condition: string,
    tone: string,
    complication: string,
  ) =>
    `${name} is exactly what it looks like — a ${scale.toLowerCase()} ${role.toLowerCase()} — and nothing it appears to be. The ${condition.toLowerCase()} hull and ${tone.toLowerCase()} crew tell one story. The real one starts with the fact that ${complication.toLowerCase()}.`,
] as const;

const HISTORY_VARIANTS = [
  (name: string, role: string, affiliation: string, condition: string) =>
    `${name} has served as a ${role.toLowerCase()} for long enough that its original documentation no longer tells the whole story. ${affiliation} holds the current registration, though how that arrangement came about is a matter of some discretion. The ${condition.toLowerCase()} state of the hull is honest in a way the manifest is not.`,
  (_name: string, role: string, affiliation: string, condition: string) =>
    `The vessel was built for ${role.toLowerCase()} operations and has never drifted far from that purpose, even as its owners changed. ${affiliation} runs it now. The ${condition.toLowerCase()} condition reflects decisions made under pressure — some of them good.`,
  (name: string, role: string, affiliation: string, condition: string) =>
    `${name} predates its current affiliation with ${affiliation} by enough years that the ship has its own institutional memory. It has served as a ${role.toLowerCase()} across at least two prior owners and carries the evidence. The ${condition.toLowerCase()} state is honest about that history.`,
  (name: string, role: string, affiliation: string, condition: string) =>
    `Records for ${name} are clean for a vessel this old, which means someone cleaned them. It operates as a ${role.toLowerCase()} for ${affiliation} now, and the ${condition.toLowerCase()} hull tells a story the logbook carefully does not.`,
] as const;

export function generateShipLocal(
  options: ShipGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const resolved = resolveShip(options, rng);
  const {
    genre,
    role,
    scale,
    condition,
    tone,
    affiliation,
    crewType,
    captain,
    officerProfile,
    officerNames,
    crewProfile,
    complication,
    secret,
    zones,
    name,
  } = resolved;

  const firstImpression =
    FIRST_IMPRESSION_BY_GENRE[genre] ?? FIRST_IMPRESSION_BY_GENRE["Sci-Fi"];

  const conceptIdx = Math.floor(rng() * CORE_CONCEPT_VARIANTS.length);
  const historyIdx = Math.floor(rng() * HISTORY_VARIANTS.length);
  const commandSection = `\n\n## Captain, Officers & Crew\n**${captain}** commands a ${crewType.toLowerCase()}. Named officers include **${officerNames.join("**, **")}**. The officer corps is defined by ${officerProfile}. The crew's culture is defined by ${crewProfile}. Their loyalty is practical rather than ornamental: it survives as long as the chain of command, shared purpose, and next horizon remain worth defending.`;

  const content = `## Core Concept
${CORE_CONCEPT_VARIANTS[conceptIdx](name, role, scale, condition, tone, complication)}

## First Look
${firstImpression}

## History
${HISTORY_VARIANTS[historyIdx](name, role, affiliation, condition)}${commandSection}`;

  const zoneLines = zones
    .map(
      (z) => `- **🚀 ${z}**: A key area tied to the ship's primary function.`,
    )
    .join("\n");

  const hook1 = `The party learns about ${complication.toLowerCase().slice(0, 60)}… — and they are the only ones who can act.`;
  const hook2 = `Someone on the docks knows ${secret.toLowerCase().slice(0, 50)}… — and is willing to sell that information.`;
  const hook3 = `${affiliation} needs the party to deliver something to — or retrieve something from — ${name}. They are not told everything.`;

  const lore = `### Ship Profile
- **Class**: ${role} / ${scale}
- **Condition**: ${condition}
- **Owner / Affiliation**: ${affiliation}
- **Current Mission**: Undisclosed — crew answers questions selectively.
- **Crew Complement**: ${crewType}
- **Tone**: ${tone}
- **Captain / Commander**: ${captain}
- **Named Officers**: ${officerNames.join(", ")}
- **Officer Structure**: ${officerProfile}
- **Crew Culture**: ${crewProfile}

### Key Zones
${zoneLines}

### Complication
${complication}. The crew is managing it, but the window is narrowing.

### Secret
${secret}.

### Adventure Hooks
- ${hook1}
- ${hook2}
- ${hook3}`;

  return {
    type: "location",
    title: name,
    summary: `${name}, a ${condition.toLowerCase()} ${role.toLowerCase()} affiliated with ${affiliation}.`,
    content,
    lore,
    labels: ["rpg-ship", "rpg-location", "imported-draft"],
    status: "active",
  };
}
