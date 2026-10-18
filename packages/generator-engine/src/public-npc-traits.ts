/**
 * Semantic traits for the smart NPC generator (#2532).
 *
 * Kept beside `npcConfig` and `npcThemeConfig` so the existing option tables
 * stay plain strings and backwards compatible.
 *
 * Deliberately closed vocabulary: TypeScript catches typos before they silently break rules.
 */

export const NPC_TRAIT_VOCABULARY = [
  // Social standing & origin
  "noble",
  "underclass",
  "commoner",
  "outcast",
  "academic",
  "military",
  "religious",
  "mercantile",
  "maritime",
  "frontier",
  "corporate",
  "tribal",
  "synthetic",
  "alien",
  "esoteric",
  "criminal",
  "decadent",

  // Sphere & primary focus
  "martial",
  "covert",
  "social",
  "scholarly",
  "arcane",
  "technical",
  "survival",
  "medical",
  "leadership",
  "labor",
  "faith",

  // Temperament & mannerism
  "formal",
  "rough",
  "guarded",
  "intense",
  "affable",
  "cynical",
  "stoic",
  "eccentric",
  "feral",
  "weary",
  "zealous",
  "paranoid",

  // Moral posture & motivation
  "lawful",
  "altruistic",
  "pragmatic",
  "ruthless",
  "fanatical",
  "rebellious",
  "transactional",
  "honourable",

  // Vulnerabilities, stakes & leverage
  "greed",
  "family",
  "reputation",
  "loyalty",
  "debt",
  "exposure",
  "curse",
  "guilt",
  "ideology",
  "survival-need",
] as const;

export type NpcTrait = (typeof NPC_TRAIT_VOCABULARY)[number];

type TraitMap = Readonly<Record<string, readonly NpcTrait[]>>;

// ---------------------------------------------------------------------------
// Ancestry / Race Traits
// ---------------------------------------------------------------------------

export const NPC_ANCESTRY_TRAITS: TraitMap = {
  // Classic Fantasy
  Human: ["commoner", "social"],
  Elf: ["noble", "arcane", "formal"],
  Dwarf: ["labor", "martial", "stoic"],
  Halfling: ["commoner", "social", "affable"],
  Tiefling: ["outcast", "esoteric", "guarded"],
  "Half-Orc": ["outcast", "martial", "rough"],
  Orc: ["outcast", "martial", "rough", "tribal"],
  Gnome: ["scholarly", "technical", "eccentric"],
  Dragonborn: ["noble", "martial", "honourable", "formal"],

  // Pirate
  "Coastal Human": ["maritime", "commoner", "rough"],
  "Island Native": ["maritime", "tribal", "survival"],
  "Sea-Touched Human": ["maritime", "esoteric", "outcast"],
  "Ship-Born Wanderer": ["maritime", "survival", "cynical"],
  "Cursed Survivor": ["maritime", "outcast", "curse", "weary"],

  // Cyberpunk / Corporate
  "Street-Modified Human": ["underclass", "technical", "rough"],
  "Corporate Clone": ["corporate", "synthetic", "formal", "stoic"],
  "Synthetic Android": ["synthetic", "technical", "stoic"],
  "Uplifted Organism": ["outcast", "feral", "guarded"],

  // Vampire / Gothic Noir
  Dhampir: ["outcast", "martial", "guarded", "esoteric"],
  Revenant: ["outcast", "martial", "weary", "curse"],
  "Changed Mortal": ["underclass", "esoteric", "guarded"],
  Witchblood: ["esoteric", "arcane", "outcast"],

  // Cosmic Horror
  "Dream-Touched Human": ["esoteric", "eccentric", "guarded"],
  "Expedition-Born Survivor": ["frontier", "survival", "weary"],
  "Altered Witness": ["outcast", "paranoid", "weary"],
  "Unreliable Returnee": ["outcast", "guarded", "paranoid"],

  // Sci-Fi / Space Opera
  Android: ["synthetic", "technical", "stoic"],
  "Colony-Born": ["frontier", "survival", "labor"],
  "Alien Citizen": ["alien", "social", "formal"],
  "Augmented Pilot": ["technical", "military", "intense"],

  // Modern Conspiracy
  "Off-Grid Survivor": ["frontier", "survival", "paranoid"],
  "Enhanced Operative": ["military", "covert", "ruthless", "stoic"],
  Whistleblower: ["academic", "corporate", "guilt", "paranoid"],

  // Post-Apocalyptic
  "Survivor Human": ["survival", "rough", "pragmatic"],
  Mutant: ["outcast", "underclass", "rough"],
  "Scavenger-Born": ["survival", "underclass", "cynical"],
  "Vault Dweller": ["academic", "formal", "guarded"],
  "Wasteland Nomad": ["tribal", "frontier", "survival", "rough"],

  // Western / Frontier
  "Frontier Pioneer": ["frontier", "survival", "labor"],
  "Outlaw Scout": ["frontier", "criminal", "covert", "cynical"],
  "Town Native": ["commoner", "mercantile", "social"],
  Homesteader: ["frontier", "labor", "family"],

  // Steampunk
  "Clockwork Augmented": ["technical", "synthetic", "stoic"],
  "Aetheric Sensitive": ["arcane", "esoteric", "eccentric"],
  "Engineered Homunculus": ["synthetic", "outcast", "labor"],
  "Colonial Expatriate": ["noble", "formal", "mercantile"],

  // Lancer
  Khalida: ["tribal", "survival", "stoic"],
  Karrakin: ["noble", "formal", "leadership"],
  "Baronic Adherent": ["noble", "military", "formal"],
  "Long-Rim Born": ["frontier", "survival", "cynical"],
  Ungrateful: ["underclass", "rebellious", "rough"],

  // Space Opera Resistance
  "Alien Smuggler": ["alien", "criminal", "mercantile", "cynical"],
  "Frontier Native": ["alien", "frontier", "survival"],
  "Liberated Android": ["synthetic", "rebellious", "altruistic"],
  "Imperial Defector": ["military", "guilt", "guarded"],
  "Ancient Mystic": ["esoteric", "arcane", "stoic"],

  // Optimistic Exploration Sci-Fi
  "Human (United Earth)": ["academic", "altruistic", "formal"],
  "Logic-bound alien": ["alien", "scholarly", "stoic", "formal"],
  "Amorphous energy being": ["alien", "esoteric", "eccentric"],
  "Symbiotic species": ["alien", "social", "altruistic"],
  "Cybernetic collective escapee": ["synthetic", "paranoid", "guarded"],
  "Avian academic": ["alien", "scholarly", "formal"],
  "Amphibious diplomat": ["alien", "social", "formal", "affable"],

  // Space Western
  "Frontier Drifter": ["frontier", "survival", "rough", "cynical"],
  "Asteroid Belter": ["frontier", "labor", "rough", "survival"],
  "Scrap-Cyborg": ["synthetic", "technical", "underclass"],
  "Displaced Colonist": ["frontier", "survival", "weary"],
  "Desert Moon Native": ["frontier", "tribal", "survival"],
};

// ---------------------------------------------------------------------------
// Role Traits
// ---------------------------------------------------------------------------

export const NPC_ROLE_TRAITS: TraitMap = {
  // Classic Fantasy
  Mage: ["arcane", "scholarly", "formal"],
  Warrior: ["martial", "military", "stoic"],
  Rogue: ["covert", "criminal", "cynical"],
  Priest: ["faith", "religious", "formal", "altruistic"],
  Merchant: ["mercantile", "social", "transactional"],
  Noble: ["noble", "social", "leadership", "formal"],
  Scholar: ["scholarly", "academic", "formal"],
  Guard: ["military", "lawful", "martial"],
  Blacksmith: ["labor", "rough", "pragmatic"],
  Innkeeper: ["mercantile", "social", "affable"],

  // Pirate
  Captain: ["maritime", "leadership", "intense"],
  Quartermaster: ["maritime", "mercantile", "transactional", "pragmatic"],
  Boatswain: ["maritime", "labor", "rough", "military"],
  Navigator: ["maritime", "scholarly", "technical"],
  Gunner: ["maritime", "martial", "rough"],
  Surgeon: ["maritime", "medical", "weary"],
  Privateer: ["maritime", "military", "mercantile", "honourable"],
  Smuggler: ["maritime", "criminal", "covert", "cynical"],
  Shipwright: ["maritime", "labor", "technical"],
  "Treasure Hunter": ["maritime", "covert", "survival", "greed"],

  // Cyberpunk / Corporate
  Netrunner: ["technical", "covert", "eccentric"],
  "Street Fixer": ["criminal", "mercantile", "social", "transactional"],
  "Corporate Agent": ["corporate", "covert", "ruthless", "formal"],
  "Street Samurai": ["martial", "underclass", "honourable", "intense"],
  Techie: ["technical", "labor", "pragmatic"],
  "Gang Lieutenant": ["criminal", "underclass", "martial", "ruthless"],
  Medtech: ["medical", "technical", "weary"],
  Journalist: ["social", "scholarly", "reputation", "guarded"],

  // Vampire / Gothic Noir
  "Vampire Hunter": ["martial", "fanatical", "intense", "zealous"],
  Occultist: ["esoteric", "arcane", "scholarly", "eccentric"],
  "Corrupt Noble": ["noble", "ruthless", "social", "decadent"],
  "Private Detective": ["covert", "cynical", "weary", "scholarly"],
  "Fallen Clergy": ["religious", "guilt", "outcast", "weary"],
  "Criminal Enforcer": ["criminal", "underclass", "martial", "rough"],
  "Asylum Keeper": ["medical", "esoteric", "ruthless", "intense"],

  // Cosmic Horror
  Investigator: ["covert", "scholarly", "weary", "paranoid"],
  Antiquarian: ["scholarly", "academic", "esoteric", "formal"],
  "Field Researcher": ["scholarly", "academic", "survival"],
  "Disgraced Academic": ["academic", "outcast", "guarded", "cynical"],
  "Expedition Guide": ["frontier", "survival", "rough", "pragmatic"],
  "Dream Interpreter": ["esoteric", "eccentric", "guarded"],
  "Surviving Witness": ["outcast", "paranoid", "weary"],
  "Quarantine Officer": ["military", "lawful", "medical", "intense"],

  // Sci-Fi / Space Opera
  "Starship Pilot": ["technical", "military", "intense"],
  Engineer: ["technical", "labor", "pragmatic"],
  "Colonial Marine": ["military", "martial", "stoic", "rough"],
  Diplomat: ["social", "leadership", "formal", "altruistic"],
  "Free Trader": ["mercantile", "social", "transactional", "pragmatic"],
  Scientist: ["scholarly", "academic", "formal"],
  "AI Liaison": ["technical", "social", "formal", "stoic"],

  // Modern Conspiracy
  "Intelligence Agent": ["covert", "military", "ruthless", "guarded"],
  "Investigative Journalist": ["social", "scholarly", "rebellious", "guarded"],
  Fixer: ["mercantile", "criminal", "social", "transactional"],
  Activist: ["social", "rebellious", "altruistic", "zealous"],
  "Corporate Operative": ["corporate", "covert", "ruthless", "formal"],
  "Private Investigator": ["covert", "cynical", "weary"],

  // Post-Apocalyptic
  Scavenger: ["survival", "underclass", "pragmatic", "rough"],
  "Wasteland Warlord": ["martial", "leadership", "ruthless", "intense"],
  Medic: ["medical", "altruistic", "weary"],
  Trader: ["mercantile", "social", "transactional"],
  "Cult Enforcer": ["religious", "martial", "fanatical", "zealous"],
  Scout: ["survival", "covert", "frontier"],
  Mechanic: ["technical", "labor", "pragmatic"],

  // Western / Frontier
  Gunslinger: ["martial", "frontier", "intense", "stoic"],
  Sheriff: ["lawful", "military", "frontier", "honourable"],
  "Bounty Hunter": ["martial", "covert", "transactional", "cynical"],
  Outlaw: ["criminal", "frontier", "rebellious", "rough"],
  Prospector: ["frontier", "labor", "eccentric", "greed"],
  "Saloon Keeper": ["mercantile", "social", "affable"],
  Homesteader: ["frontier", "labor", "family"],
  "Railroad Agent": ["corporate", "mercantile", "ruthless", "formal"],
  "Town Doctor": ["medical", "scholarly", "weary", "altruistic"],

  // Steampunk
  Artificer: ["technical", "arcane", "scholarly"],
  "Sky Pilot": ["maritime", "military", "intense"],
  "Engine Wright": ["technical", "labor", "rough"],
  "Guild Factor": ["mercantile", "corporate", "formal", "transactional"],
  "Aetheric Scholar": ["arcane", "academic", "esoteric"],
  "Clockwork Spy": ["covert", "technical", "guarded"],
  "Press-Gang Officer": ["military", "underclass", "ruthless", "rough"],
  "Alchemical Surgeon": ["medical", "esoteric", "intense"],

  // Lancer
  "Mech Pilot": ["military", "martial", "technical", "intense"],
  "Union Administrator": ["leadership", "corporate", "formal", "lawful"],
  "Comp/Con Handler": ["technical", "scholarly", "stoic"],
  "Logistics Officer": ["military", "mercantile", "formal", "pragmatic"],
  "NHP Caseworker": ["esoteric", "scholarly", "guarded", "intense"],
  "Colonial Liaison": ["social", "leadership", "pragmatic"],
  "Bleed Researcher": ["academic", "esoteric", "eccentric"],
  "Mercenary Contractor": ["martial", "military", "transactional", "stoic"],

  // Space Opera Resistance
  "Rebel Pilot": ["military", "martial", "rebellious", "altruistic"],
  "Smuggler Captain": ["maritime", "criminal", "cynical", "leadership"],
  "Mystic Warrior": ["arcane", "martial", "stoic", "honourable"],
  "Resistance Leader": ["leadership", "rebellious", "altruistic", "intense"],
  "Imperial Officer": ["military", "noble", "formal", "ruthless"],
  "Underworld Fixer": ["criminal", "social", "transactional"],
  "Defector Operative": ["covert", "military", "guilt", "guarded"],

  // Optimistic Exploration Sci-Fi
  "Science Officer": ["scholarly", "academic", "formal"],
  "Chief Medical Officer": ["medical", "altruistic", "formal"],
  "Diplomatic Envoy": ["social", "leadership", "formal", "altruistic"],
  "Helm Officer": ["technical", "military", "formal"],
  "Engineering Chief": ["technical", "labor", "rough", "pragmatic"],
  "First Officer": ["leadership", "military", "formal", "honourable"],
  Xenobiologist: ["scholarly", "academic", "eccentric"],
  "Security Chief": ["military", "martial", "lawful", "stoic"],

  // Space Western
  "Grease-Monkey Engineer": ["technical", "labor", "rough", "pragmatic"],
  "Frontier Fixer": ["criminal", "social", "transactional", "cynical"],
  "Black Market Fence": ["criminal", "mercantile", "transactional", "guarded"],
  "Corrupt Customs Officer": [
    "frontier",
    "lawful",
    "transactional",
    "ruthless",
  ],
  "Outpost Marshal": ["lawful", "frontier", "martial", "stoic"],
  "Syndicate Enforcer": ["criminal", "martial", "ruthless", "intense"],
  "Drifter Scout": ["frontier", "survival", "covert", "weary"],
  "Ex-Soldier Mercenary": ["military", "martial", "transactional", "stoic"],

  // Delve Boss / Inhabitant Roles
  "Dungeon Mastermind": ["leadership", "martial", "ruthless", "intense"],
  "Bound Vault Guardian": ["martial", "stoic", "intense"],
  "Lair Boss": ["martial", "leadership", "ruthless", "intense"],
  "Outlaw Chief": ["criminal", "leadership", "frontier", "rough"],
  "Captive VIP": ["outcast", "guarded", "weary"],
  "Cursed Caretaker": ["esoteric", "curse", "weary"],
  "Delve Boss": ["leadership", "martial", "ruthless", "intense"],
  "Lair Guardian": ["martial", "stoic", "intense"],
  "Dungeon Inhabitant": ["survival", "underclass", "rough"],
  "Dungeon Hermit": ["esoteric", "eccentric", "outcast"],
};

// ---------------------------------------------------------------------------
// Alignment & Morality Traits
// ---------------------------------------------------------------------------

export const NPC_ALIGNMENT_TRAITS: TraitMap = {
  "Lawful Good": ["lawful", "altruistic", "honourable"],
  "Neutral Good": ["altruistic", "honourable"],
  "Chaotic Good": ["altruistic", "rebellious"],
  "Lawful Neutral": ["lawful", "stoic", "formal"],
  "True Neutral": ["pragmatic", "stoic"],
  "Chaotic Neutral": ["rebellious", "eccentric", "cynical"],
  "Lawful Evil": ["lawful", "ruthless", "formal"],
  "Neutral Evil": ["ruthless", "transactional"],
  "Chaotic Evil": ["ruthless", "feral", "intense"],

  // Classic Fantasy
  chivalric_code: ["lawful", "honourable", "formal"],
  common_good: ["altruistic", "commoner", "affable"],
  enlightened_balance: ["stoic", "scholarly", "formal"],
  mercenary_instinct: ["transactional", "pragmatic", "cynical"],
  zealous_crusade: ["fanatical", "zealous", "intense"],
  power_absolute: ["ruthless", "leadership", "intense"],

  // Pirate
  crew_loyalist: ["loyalty", "maritime", "rough"],
  freebooter_pragmatist: ["pragmatic", "transactional", "maritime"],
  privateer_honour: ["honourable", "military", "maritime"],
  superstitious_sailor: ["eccentric", "maritime", "paranoid"],
  mutiny_survivor: ["cynical", "guarded", "weary"],
  harbour_community_guardian: ["altruistic", "maritime", "commoner"],

  // Cyberpunk / Corporate
  corporate_loyalist: ["corporate", "lawful", "formal"],
  street_pragmatist: ["underclass", "survival", "pragmatic", "cynical"],
  ideological_radical: ["rebellious", "intense", "altruistic"],
  cold_professional: ["stoic", "pragmatic", "covert"],
  burned_out_cynic: ["cynical", "weary", "outcast"],
  predatory_opportunist: ["ruthless", "transactional", "intense"],

  // Vampire / Gothic Noir
  strict_ascetic: ["formal", "stoic", "guarded"],
  haunted_sympathizer: ["altruistic", "guilt", "weary"],
  cold_monster: ["ruthless", "stoic", "decadent"],
  obsessive_zealot: ["fanatical", "zealous", "intense"],
  decadent_hedonist: ["decadent", "cynical", "noble"],
  pragmatic_survivor: ["pragmatic", "guarded", "paranoid"],

  // Cosmic Horror
  evidence_bound: ["scholarly", "lawful", "formal"],
  forbidden_curiosity: ["academic", "esoteric", "eccentric"],
  protective_skeptic: ["scholarly", "altruistic", "guarded"],
  contaminated_witness: ["outcast", "paranoid", "weary"],
  merciful_containment: ["altruistic", "guarded", "esoteric"],

  // Sci-Fi / Space Opera
  system_loyalist: ["corporate", "lawful", "formal"],
  frontier_independent: ["frontier", "pragmatic", "rebellious"],
  zealous_visionary: ["fanatical", "zealous", "technical"],
  principled_pacifist: ["altruistic", "formal", "honourable"],
  opportunistic_trader: ["mercantile", "transactional", "social"],
  subversive_rebel: ["rebellious", "covert", "altruistic", "intense"],

  // Modern Conspiracy
  institutionalist: ["corporate", "lawful", "formal"],
  noble_transgressor: ["altruistic", "covert", "guarded"],
  fanatical_believer: ["fanatical", "zealous", "intense"],
  unprincipled_asset: ["transactional", "cynical", "covert"],
  haunted_insider: ["paranoid", "weary", "guilt"],
  machiavellian_player: ["ruthless", "social", "formal"],

  // Post-Apocalyptic
  collectivist: ["tribal", "loyalty", "survival"],
  tribal_xenophobe: ["tribal", "paranoid", "rough"],
  pure_scavenger: ["survival", "pragmatic", "cynical"],
  wasteland_zealot: ["fanatical", "zealous", "rough"],
  despotic_ruler: ["ruthless", "leadership", "intense"],
  utopian_builder: ["altruistic", "leadership", "formal"],

  // Western / Frontier
  code_of_the_west: ["honourable", "frontier", "stoic"],
  law_and_order: ["lawful", "frontier", "formal"],
  frontier_pragmatist: ["frontier", "pragmatic", "rough"],
  desperados_greed: ["greed", "criminal", "ruthless"],
  vigilante_justice: ["martial", "fanatical", "intense"],
  merciful_pioneer: ["altruistic", "frontier", "affable"],

  // Steampunk
  empire_loyalist: ["noble", "lawful", "formal"],
  guild_pragmatist: ["mercantile", "transactional", "formal"],
  aetheric_visionary: ["technical", "eccentric", "zealous"],
  underclass_rebel: ["underclass", "rebellious", "rough"],
  aristocratic_schemer: ["noble", "ruthless", "formal"],
  clockwork_cynic: ["technical", "cynical", "weary"],

  // Lancer
  union_idealist: ["altruistic", "lawful", "formal"],
  bleed_touched: ["esoteric", "eccentric", "weary"],
  colonial_pragmatist: ["frontier", "transactional", "cynical"],
  liberation_militant: ["rebellious", "martial", "intense"],
  nhp_adjacent: ["technical", "esoteric", "stoic"],
  contractor_mercenary: ["martial", "transactional", "stoic"],

  // Space Opera Resistance
  rebel_idealist: ["rebellious", "altruistic", "intense"],
  cynical_smuggler: ["criminal", "cynical", "transactional"],
  mystic_mentor: ["arcane", "stoic", "honourable"],
  imperial_loyalist: ["military", "noble", "formal", "ruthless"],
  ruthless_syndicate: ["criminal", "ruthless", "leadership"],
  broken_veteran: ["military", "weary", "cynical"],

  // Optimistic Exploration Sci-Fi
  diplomatic_idealist: ["social", "altruistic", "formal"],
  curious_scientist: ["scholarly", "academic", "eccentric"],
  pragmatic_officer: ["military", "pragmatic", "honourable"],
  jaded_veteran: ["military", "weary", "cynical"],
  eager_cadet: ["military", "formal", "affable"],
  enigmatic_observer: ["alien", "esoteric", "stoic"],

  // Space Western
  scoundrel_code: ["pragmatic", "loyalty", "rebellious", "honourable"],
  debt_bound_pragmatist: ["transactional", "pragmatic", "cynical", "weary"],
  frontier_lawman: ["lawful", "frontier", "stoic", "martial"],
  ruthless_profiteer: ["ruthless", "mercantile", "transactional", "formal"],
  weary_runaway: ["guarded", "paranoid", "weary", "outcast"],
  wildcat_rebel: ["rebellious", "frontier", "survival", "rough"],
};

// ---------------------------------------------------------------------------
// Mannerism Traits
// ---------------------------------------------------------------------------

export const NPC_MANNERISM_TRAITS: TraitMap = {
  "Speaks in a quiet, measured cadence, continuously evaluating the room.": [
    "formal",
    "guarded",
    "stoic",
  ],
  "Fidgets with a worn token or ring whenever answering a direct question.": [
    "guarded",
    "paranoid",
    "weary",
  ],
  "Speaks with abrupt efficiency, rarely using polite filler words.": [
    "rough",
    "military",
    "stoic",
  ],
  "Maintains intense, unblinking eye contact while listening.": [
    "intense",
    "fanatical",
    "ruthless",
  ],
  "Speaks in a gravelly whisper, leaning in close as if every word is contraband.":
    ["covert", "cynical", "underclass"],
  "Chuckles dryly before delivering bad news or complicated terms.": [
    "cynical",
    "transactional",
    "affable",
  ],
  "Always whispers when speaking to build dramatic tension.": [
    "eccentric",
    "esoteric",
  ],
  "Carries a pocket watch that runs backward but claims it is correct.": [
    "eccentric",
    "academic",
  ],
  "Extremely superstitious about black cats and wooden doors.": [
    "paranoid",
    "eccentric",
  ],
  "Has a collection of rare, dried flowers in their cloak pockets.": [
    "scholarly",
    "affable",
    "eccentric",
  ],
  "Never looks anyone directly in the eye, shifting their gaze constantly.": [
    "paranoid",
    "guarded",
  ],
  "Speaks in rhyming riddles when they become nervous or excited.": [
    "eccentric",
    "arcane",
  ],
  "Has a nervous twitch in their left hand when speaking about magic.": [
    "esoteric",
    "curse",
    "guarded",
  ],
  "Obsessed with cleanliness, frequently wiping down their gear.": [
    "formal",
    "military",
    "stoic",
  ],
};

// ---------------------------------------------------------------------------
// Motive Traits
// ---------------------------------------------------------------------------

export const NPC_MOTIVE_TRAITS: TraitMap = {
  "Amass enough wealth to buy back their family's lost ancestral estate.": [
    "noble",
    "family",
    "reputation",
  ],
  "Find a rare magical cure for their sibling's creeping arcane illness.": [
    "altruistic",
    "family",
    "medical",
  ],
  "Secure an appointment as high archivist by uncovering forgotten secrets.": [
    "scholarly",
    "academic",
    "reputation",
  ],
  "Avenge the slaughter of their mercenary company by a corrupt noble house.": [
    "martial",
    "military",
    "guilt",
  ],
  "Establish a quiet, protected sanctuary for war orphans and refugees.": [
    "altruistic",
    "commoner",
  ],
  "Pay off a crippling debt to a ruthless underworld crime syndicate.": [
    "underclass",
    "criminal",
    "debt",
  ],
  "Pay off the debt on their ship before the local syndicate repossesses it.": [
    "maritime",
    "debt",
    "transactional",
  ],
  "Uncover the lost coordinates to the Sunken Vault before a rival fleet does.":
    ["maritime", "greed", "covert"],
  "Secure an official letter of marque to operate legitimately in local waters.":
    ["maritime", "lawful", "reputation"],
  "Smuggle their family out of an occupied island settlement.": [
    "maritime",
    "family",
    "altruistic",
  ],
  "Extract revenge against the naval commodore who burned their home port.": [
    "maritime",
    "military",
    "ruthless",
  ],
  "Protect a hidden pirate cove from betrayal by an ambitious lieutenant.": [
    "maritime",
    "leadership",
    "loyalty",
  ],
};

// ---------------------------------------------------------------------------
// Secret Traits
// ---------------------------------------------------------------------------

export const NPC_SECRET_TRAITS: TraitMap = {
  "Is a secret spy for a rival merchant guild operating in the shadows.": [
    "covert",
    "mercantile",
    "exposure",
  ],
  "Possesses a cursed map that shows their exact death location, which is nearby.":
    ["esoteric", "curse", "paranoid"],
  "Accidentally poisoned their previous master and fled the crime scene.": [
    "guilt",
    "exposure",
    "underclass",
  ],
  "Is actually a shapechanger in hiding from an ancient wizard.": [
    "esoteric",
    "outcast",
    "exposure",
  ],
  "Stole a sacred relic from the local temple and keeps it in their boot.": [
    "criminal",
    "religious",
    "exposure",
  ],
  "Is deeply in debt to a vampire coven and pays in stolen supplies.": [
    "debt",
    "esoteric",
    "exposure",
  ],
  "Carries the bloodline of the overthrown royal dynasty in secret.": [
    "noble",
    "reputation",
    "exposure",
  ],
  "Murdered their former captain during a mutiny and framed another crewmate.":
    ["maritime", "guilt", "ruthless", "exposure"],
  "Knows the location of a sunken royal treasury ship but lacks the crew to dive it.":
    ["maritime", "greed", "covert"],
  "Is an undercover agent for the Imperial Navy operating aboard pirate vessels.":
    ["maritime", "military", "covert", "exposure"],
  "Carries a dormant deep-sea curse that flares during full moons.": [
    "maritime",
    "esoteric",
    "curse",
  ],
  "Sold navigational charts to a rival syndicate resulting in their fleet's ambush.":
    ["maritime", "guilt", "transactional", "exposure"],
};

// ---------------------------------------------------------------------------
// Faction Stance & Leverage Traits
// ---------------------------------------------------------------------------

export const NPC_FACTION_STANCE_TRAITS: TraitMap = {
  "Pragmatically cooperative with whoever holds local authority, deeply cynical about idealistic reformists.":
    ["lawful", "pragmatic", "cynical"],
  "Distrusts large centralized institutions; favors small, decentralized alliances and personal handshakes.":
    ["rebellious", "tribal", "pragmatic"],
  "Publicly obedient to ruling factions while privately hedging bets with independent operators.":
    ["covert", "cynical", "transactional"],
  "Harbors deep resentment toward bureaucratic oversight; loyal only to those who pay promptly.":
    ["underclass", "transactional", "cynical"],
  "Views competing factions as expendable pawns in a long-term survival game.":
    ["ruthless", "pragmatic", "intense"],
};

export const NPC_LEVERAGE_TRAITS: TraitMap = {
  "Can be bought with immunity or hard currency; breaks if their family or sanctuary is threatened.":
    ["family", "greed", "survival-need"],
  "Cooperation costs rare technical or arcane favors; folds under public exposure of their past debts.":
    ["debt", "exposure", "arcane"],
  "Requires guarantees of safe passage; folds under threats to their remaining personal network.":
    ["loyalty", "survival-need"],
  "Demands respect and reciprocal secrets; yields when their hidden patron is named.":
    ["reputation", "exposure", "formal"],
  "Works for exclusive trade rights or leverage; panics if their operational ledger is seized.":
    ["mercantile", "debt", "exposure"],
};

// ---------------------------------------------------------------------------
// Rules & Affinities
// ---------------------------------------------------------------------------

export const NPC_RULES: readonly {
  trait: NpcTrait;
  requiresTraitOf?: readonly NpcTrait[];
  excludesTraitOf?: readonly NpcTrait[];
}[] = [
  {
    trait: "noble",
    excludesTraitOf: ["underclass", "rough", "feral"],
  },
  {
    trait: "underclass",
    excludesTraitOf: ["noble", "formal"],
  },
  {
    trait: "feral",
    excludesTraitOf: ["formal", "noble", "academic"],
  },
  {
    trait: "fanatical",
    requiresTraitOf: ["ideology", "faith", "intense", "zealous"],
  },
  {
    trait: "stoic",
    excludesTraitOf: ["eccentric", "feral"],
  },
];

export const NPC_AFFINITIES: readonly {
  when: NpcTrait;
  favour: NpcTrait;
  multiplier: number;
}[] = [
  // Nobility & High Standing
  { when: "noble", favour: "formal", multiplier: 3 },
  { when: "noble", favour: "social", multiplier: 2.5 },
  { when: "noble", favour: "reputation", multiplier: 2 },

  // Underclass & Crime
  { when: "underclass", favour: "cynical", multiplier: 2.5 },
  { when: "underclass", favour: "guarded", multiplier: 2 },
  { when: "underclass", favour: "debt", multiplier: 2 },
  { when: "criminal", favour: "covert", multiplier: 3 },
  { when: "criminal", favour: "transactional", multiplier: 2.5 },

  // Scholarly & Academic
  { when: "scholarly", favour: "academic", multiplier: 3 },
  { when: "scholarly", favour: "formal", multiplier: 2 },
  { when: "scholarly", favour: "esoteric", multiplier: 1.8 },

  // Martial & Military
  { when: "martial", favour: "military", multiplier: 2.5 },
  { when: "martial", favour: "stoic", multiplier: 2 },
  { when: "martial", favour: "honourable", multiplier: 1.8 },

  // Faith & Religion
  { when: "faith", favour: "religious", multiplier: 3 },
  { when: "faith", favour: "altruistic", multiplier: 2 },
  { when: "faith", favour: "zealous", multiplier: 2 },

  // Frontier & Survival
  { when: "frontier", favour: "survival", multiplier: 3 },
  { when: "frontier", favour: "rough", multiplier: 2 },
  { when: "frontier", favour: "pragmatic", multiplier: 2 },

  // Corporate
  { when: "corporate", favour: "transactional", multiplier: 3 },
  { when: "corporate", favour: "formal", multiplier: 2 },
  { when: "corporate", favour: "ruthless", multiplier: 2 },

  // Synthetic & Alien
  { when: "synthetic", favour: "stoic", multiplier: 3 },
  { when: "synthetic", favour: "technical", multiplier: 2.5 },
];
