/**
 * Semantic traits for the settlement generator's option pools (#2341).
 *
 * Kept beside `settlementConfig` rather than inside it so the option tables stay
 * plain strings: `SettlementFormFields.svelte` reads them directly, and the
 * smart framework coerces bare strings into options anyway. Annotating here
 * means a genre can gain coherence one entry at a time with no churn in the
 * 1,200-line constants file.
 *
 * Keys are the option value itself. Values that repeat across genres share their
 * traits, which is the intent: a "Trading post" is about trade in the Western
 * and in the Post-Apocalyptic pool alike.
 */

/**
 * The shared trait vocabulary. Deliberately closed: with roughly 300 annotated
 * options a typo would silently disable a rule, so the type catches it instead.
 * The free-text lexicon (#2338) will map descriptions onto these same names.
 */
export const SETTLEMENT_TRAIT_VOCABULARY = [
  // Where it is
  "coastal",
  "riverine",
  "inland",
  "mountain",
  "forest",
  "desert",
  "swamp",
  "plains",
  "tropical",
  "arctic",
  "volcanic",
  "urban",
  "underground",
  "orbital",
  "ruined",
  "wasteland",
  "isolated",
  // What it does
  "trade",
  "maritime",
  "military",
  "religious",
  "mining",
  "industrial",
  "agrarian",
  "academic",
  "research",
  "criminal",
  "refuge",
  "transit",
  "administrative",
  "entertainment",
  "medical",
  // How it feels
  "cosy",
  "grim",
  "mysterious",
  "heroic",
  "decadent",
  "prosperous",
  "declining",
  "frontier",
  "oppressive",
  "lawless",
  "eerie",
  "desperate",
  "sterile",
  "vibrant",
  "bureaucratic",
  "hopeful",
  "defiant",
  // What is going wrong
  "war",
  "siege",
  "crime",
  "disease",
  "supernatural",
  "scarcity",
  "politics",
  "betrayal",
  "environmental",
  "labour",
  "technology",
  // Who is in charge
  "feudal",
  "elected",
  "oligarchic",
  "criminal-rule",
  "autocratic",
  "imperial",
  "tribal",
  "artificial",
  // How big
  "tiny",
  "small",
  "medium",
  "large",
] as const;

export type SettlementTrait = (typeof SETTLEMENT_TRAIT_VOCABULARY)[number];

type TraitMap = Readonly<Record<string, readonly SettlementTrait[]>>;

/** Environments, keyed by the exact option value in `environmentsByGenre`. */
export const ENVIRONMENT_TRAITS: TraitMap = {
  // Fantasy
  "Forest edge": ["forest", "inland"],
  "Coastal harbour": ["coastal", "maritime"],
  "River crossing": ["riverine", "inland", "transit"],
  "Mountain pass": ["mountain", "inland", "transit", "isolated"],
  "Open plains": ["plains", "inland"],
  "Desert oasis": ["desert", "inland", "isolated"],
  "Underground cavern": ["underground", "isolated"],
  Marshland: ["swamp", "inland"],
  // Pirate
  "Sheltered island cove": ["coastal", "isolated", "tropical"],
  "Storm-exposed harbour": ["coastal", "maritime"],
  "Coral atoll": ["coastal", "tropical", "isolated"],
  "Mangrove coast": ["coastal", "swamp", "tropical"],
  "Volcanic island": ["coastal", "volcanic", "isolated"],
  "Reef passage": ["coastal", "maritime", "transit"],
  // Dark Fantasy
  "Blighted forest": ["forest", "inland", "ruined"],
  "Corrupted river valley": ["riverine", "inland", "ruined"],
  "Cursed ruins": ["ruined", "inland", "isolated"],
  "Ash wastes": ["wasteland", "inland", "isolated"],
  "Plague-touched coast": ["coastal", "ruined"],
  "Shadowmere swamp": ["swamp", "inland", "isolated"],
  // Cyberpunk
  "Dense urban sprawl": ["urban"],
  "Corporate arcology district": ["urban", "industrial"],
  "Underground tunnel network": ["underground", "urban"],
  "Rooftop colony": ["urban", "isolated"],
  "Industrial wasteland": ["wasteland", "industrial", "urban"],
  "Flooded lower city": ["urban", "ruined", "coastal"],
  // Sci-Fi
  "Orbital station": ["orbital", "isolated"],
  "Asteroid mining colony": ["orbital", "mining", "isolated"],
  "Terraformed moon surface": ["orbital"],
  "Deep space waystation": ["orbital", "transit", "isolated"],
  "Generation ship district": ["orbital", "isolated"],
  "Subterranean habitat": ["underground", "isolated"],
  // Post-Apocalyptic
  "Ruined city centre": ["urban", "ruined"],
  "Fortified hilltop": ["mountain", "inland", "military"],
  "Underground bunker complex": ["underground", "military", "isolated"],
  "Irradiated zone border": ["wasteland", "isolated"],
  "Salvage fields": ["wasteland", "industrial"],
  "River delta refuge": ["riverine", "coastal", "refuge"],
  // Modern
  "Coastal town": ["coastal"],
  "Rural countryside": ["plains", "inland", "agrarian"],
  "Urban suburb": ["urban"],
  "Mountain community": ["mountain", "inland", "isolated"],
  "Island village": ["coastal", "isolated"],
  "Desert border town": ["desert", "inland", "transit"],
  // Horror
  "Remote valley": ["inland", "isolated"],
  "Misty moorland": ["plains", "inland", "isolated"],
  "Ancient forest": ["forest", "inland", "isolated"],
  "Coastal cliffs": ["coastal", "isolated"],
  "Underground catacombs": ["underground", "ruined"],
  "Decaying city district": ["urban", "declining"],
  // Cosmic Horror
  "Fog-bound coastline": ["coastal", "eerie"],
  "Highland observatory plateau": [
    "mountain",
    "inland",
    "research",
    "isolated",
  ],
  "Flooded river valley": ["riverine", "inland"],
  "Windswept island": ["coastal", "isolated"],
  "Forest around an old excavation": ["forest", "inland", "ruined"],
  "Industrial university quarter": ["urban", "academic", "industrial"],
  // Western
  "Desert plains": ["desert", "plains", "inland"],
  "Canyon river crossing": ["riverine", "inland", "transit"],
  "Mountain mining territory": ["mountain", "mining", "inland"],
  "Railroad junction": ["inland", "transit", "industrial"],
  "Frontier grassland": ["plains", "inland", "frontier"],
  "Border river town": ["riverine", "transit"],
  // Steampunk
  "Industrial river city": ["riverine", "urban", "industrial"],
  "Sky platform": ["isolated", "industrial"],
  "Underground rail hub": ["underground", "transit", "industrial"],
  "Coastal smog district": ["coastal", "urban", "industrial"],
  "Mountain factory town": ["mountain", "industrial", "inland"],
  "Imperial canal port": ["riverine", "maritime", "trade", "imperial"],
  // Space Opera Resistance
  "Desert wasteland": ["desert", "wasteland", "isolated"],
  "Ice planet": ["arctic", "isolated"],
  "Jungle moon": ["tropical", "forest", "isolated"],
  "Gas giant orbit": ["orbital", "isolated"],
  "Asteroid belt": ["orbital", "mining", "isolated"],
  "Volcanic world": ["volcanic", "wasteland"],
  // Optimistic Exploration Sci-Fi
  "Class M Planet": ["plains", "agrarian"],
  "Asteroid Belt": ["orbital", "mining", "isolated"],
  "Gas Giant Atmosphere": ["orbital", "isolated"],
  "Binary Star System": ["orbital", "research"],
  "Nebula Edge": ["orbital", "research", "isolated"],
};

/** Primary functions, keyed by the exact value in `primaryFunctionsByGenre`. */
export const FUNCTION_TRAITS: TraitMap = {
  // Fantasy
  "Trade hub": ["trade", "transit"],
  "Military fortress": ["military"],
  "Religious shrine": ["religious"],
  "Mining settlement": ["mining", "industrial"],
  "Noble seat": ["administrative", "feudal"],
  "Farming community": ["agrarian"],
  "Border checkpoint": ["military", "transit", "administrative"],
  "Pilgrimage town": ["religious", "transit"],
  "Academic city": ["academic", "research"],
  // Pirate
  "Free-trade harbour": ["trade", "maritime"],
  "Pirate haven": ["criminal", "maritime", "lawless"],
  "Ship repair and provisioning": ["maritime", "industrial"],
  "Smuggling exchange": ["criminal", "trade", "maritime"],
  "Naval resupply station": ["military", "maritime"],
  "Fishing and salvage community": ["maritime", "agrarian"],
  // Dark Fantasy
  "Cursed stronghold": ["military", "supernatural"],
  "Plague quarantine zone": ["medical", "disease"],
  "Necromancer's base": ["supernatural", "research"],
  "Warlord garrison": ["military", "autocratic"],
  "Desperate refuge": ["refuge"],
  "Fallen temple settlement": ["religious", "ruined"],
  // Cyberpunk
  "Corporate logistics hub": ["trade", "transit", "industrial"],
  "Black market district": ["criminal", "trade"],
  "Data brokerage centre": ["technology", "trade"],
  "Manufacturing zone": ["industrial"],
  "Entertainment district": ["entertainment"],
  "Gang headquarters": ["criminal"],
  "Refugee enclave": ["refuge"],
  // Sci-Fi
  "Resource extraction colony": ["mining", "industrial"],
  "Research station": ["research", "academic"],
  "Military outpost": ["military"],
  "Trade waystation": ["trade", "transit"],
  "Quarantine zone": ["medical", "disease"],
  "Administrative hub": ["administrative", "bureaucratic"],
  "Prison colony": ["military", "criminal"],
  // Post-Apocalyptic
  "Survivor refuge": ["refuge"],
  "Salvage base": ["industrial", "trade"],
  "Agricultural commune": ["agrarian"],
  "Trading post": ["trade", "transit"],
  "Fortified stronghold": ["military"],
  "Hidden sanctuary": ["refuge", "isolated"],
  "Cult community": ["religious", "supernatural"],
  // Modern
  "Tourist destination": ["entertainment", "trade"],
  "Administrative centre": ["administrative", "bureaucratic"],
  "Industrial town": ["industrial"],
  "Fishing community": ["maritime", "agrarian"],
  "University town": ["academic", "research"],
  // Horror
  "Isolated village": ["isolated", "agrarian"],
  "Hidden blood court": ["supernatural", "criminal"],
  "Cult commune": ["religious", "supernatural"],
  "Ancient pilgrimage site": ["religious", "ruined"],
  "Research facility": ["research", "academic"],
  "Crumbling estate settlement": ["declining", "feudal"],
  // Cosmic Horror
  "Astronomical observation post": ["research", "academic", "isolated"],
  "Expedition supply town": ["trade", "transit", "research"],
  "University research district": ["academic", "research", "urban"],
  "Quarantine checkpoint": ["medical", "disease", "administrative"],
  "Archive and rare-book centre": ["academic", "research"],
  "Deep-water fishing community": ["maritime", "agrarian"],
  // Western
  "Railroad depot": ["transit", "industrial"],
  "Mining claim town": ["mining", "industrial"],
  "Cattle drive waystation": ["agrarian", "transit"],
  "Border sheriff outpost": ["military", "administrative"],
  "Outlaw hideout": ["criminal", "lawless", "isolated"],
  // Steampunk
  "Factory and works district": ["industrial"],
  "Airship port": ["transit", "trade"],
  "Rail junction hub": ["transit", "industrial"],
  "Inventor's enclave": ["research", "technology"],
  "Imperial administration post": [
    "administrative",
    "imperial",
    "bureaucratic",
  ],
  "Smuggling harbour": ["criminal", "trade", "maritime"],
  // Space Opera Resistance
  "Smuggler haven": ["criminal", "trade", "lawless"],
  "Imperial garrison": ["military", "imperial"],
  "Moisture farm": ["agrarian", "isolated"],
  "Rebel listening post": ["military", "isolated", "defiant"],
  "Scrap yard and salvage": ["industrial", "trade"],
  "Spice mining facility": ["mining", "industrial"],
  "Ancient temple ruins": ["religious", "ruined"],
  // Optimistic Exploration Sci-Fi
  "Scientific Research": ["research", "academic"],
  "Diplomatic Hub": ["administrative", "politics"],
  "Fleet Resupply": ["military", "transit"],
  "Agricultural Breadbasket": ["agrarian"],
  "First Contact Staging Area": ["research", "administrative"],
};

/** Tones, keyed by the exact value in `tonesByGenre`. */
export const TONE_TRAITS: TraitMap = {
  // Fantasy
  "Cosy and welcoming": ["cosy", "hopeful"],
  "Grim and weathered": ["grim"],
  "Mysterious and secretive": ["mysterious"],
  "Heroic and proud": ["heroic"],
  "Decadent and corrupt": ["decadent", "prosperous"],
  "Frontier and rough": ["frontier"],
  // Pirate
  "Salt-worn and defiant": ["defiant", "grim"],
  "Rowdy but watchful": ["vibrant", "lawless"],
  "Storm-dark and superstitious": ["grim", "mysterious"],
  "Prosperous and lawless": ["prosperous", "lawless"],
  "Heroic and free-spirited": ["heroic", "vibrant"],
  // Dark Fantasy
  "Oppressive and doomed": ["oppressive", "grim"],
  "Grimdark and hopeless": ["grim", "desperate"],
  "Eerie and cursed": ["eerie", "supernatural"],
  "Desperate and violent": ["desperate", "lawless"],
  "Cold and ruthless": ["oppressive", "grim"],
  // Cyberpunk
  "Oppressive and surveilled": ["oppressive"],
  "Chaotic and vibrant": ["vibrant", "lawless"],
  "Desperate and hungry": ["desperate", "declining"],
  "Neon-soaked and decadent": ["decadent", "vibrant"],
  "Underground and defiant": ["defiant", "mysterious"],
  // Sci-Fi
  "Sterile and efficient": ["sterile", "bureaucratic"],
  "Isolated and claustrophobic": ["isolated", "grim"],
  "Frontier and optimistic": ["frontier", "hopeful"],
  "Corporate and controlled": ["oppressive", "bureaucratic"],
  "Decaying and neglected": ["declining", "grim"],
  // Post-Apocalyptic
  "Grim and survivalist": ["grim", "desperate"],
  "Hopeful but fragile": ["hopeful"],
  "Paranoid and militarised": ["oppressive", "military"],
  "Desperate and fractured": ["desperate"],
  "Eerily peaceful": ["eerie", "cosy"],
  // Modern
  "Quiet and overlooked": ["cosy", "isolated"],
  "Tense and divided": ["politics"],
  "Prosperous and complacent": ["prosperous"],
  "Declining and nostalgic": ["declining"],
  "Vibrant and contested": ["vibrant", "politics"],
  // Horror
  "Gothic and oppressive": ["oppressive", "eerie"],
  "Eerily quiet": ["eerie", "isolated"],
  "Outwardly normal but deeply wrong": ["eerie", "mysterious"],
  "Desperate and hunted": ["desperate"],
  "Ancient and unknowable": ["mysterious", "supernatural"],
  // Cosmic Horror
  "Methodical but uneasy": ["research", "eerie"],
  "Outwardly ordinary, quietly strained": ["eerie", "mysterious"],
  "Fog-muted and watchful": ["eerie", "isolated"],
  "Scholarly and secretive": ["academic", "mysterious"],
  "Remote and underprepared": ["isolated", "desperate"],
  // Western
  "Lawless and dangerous": ["lawless"],
  "Dusty and hardscrabble": ["frontier", "grim"],
  "Tense standoff": ["politics", "grim"],
  "Boom-and-bust optimistic": ["prosperous", "frontier"],
  "Frontier lonely": ["frontier", "isolated"],
  // Steampunk
  "Industrial and ambitious": ["industrial", "prosperous"],
  "Class-divided and smoggy": ["industrial", "politics"],
  "Clockwork and eccentric": ["technology", "vibrant"],
  "Imperial and bureaucratic": ["imperial", "bureaucratic"],
  "Rebellious and inventive": ["defiant", "technology"],
  // Space Opera Resistance
  "Oppressive and militarised": ["oppressive", "military"],
  "Scrappy and defiant": ["defiant", "desperate"],
  "Desolate and lonely": ["isolated", "grim"],
  "Ancient and mystical": ["mysterious", "supernatural"],
  "Lawless and chaotic": ["lawless"],
  // Optimistic Exploration Sci-Fi
  Utopian: ["hopeful", "prosperous"],
  Curious: ["research", "hopeful"],
  Bureaucratic: ["bureaucratic", "administrative"],
  Pioneering: ["frontier", "hopeful"],
  Tense: ["politics"],
};

/** Dominant tensions, keyed by the exact value in `mainTensionsByGenre`. */
export const TENSION_TRAITS: TraitMap = {
  // Fantasy
  "Succession crisis": ["politics"],
  "Religious schism": ["religious", "politics"],
  "Monster threat on the border": ["supernatural", "siege"],
  "Corrupt leadership": ["politics", "crime"],
  "Famine or drought": ["scarcity", "environmental"],
  "Trade route cut off": ["scarcity", "trade"],
  "Ancient curse awakening": ["supernatural"],
  // Pirate
  "Naval blockade tightening": ["siege", "military", "scarcity"],
  "Rival crews contesting the harbour": ["crime", "war"],
  "A mutiny spreading through anchored ships": ["betrayal", "labour"],
  "A cursed wreck washing ashore": ["supernatural", "maritime"],
  "Trade monopoly strangling local families": ["trade", "politics", "scarcity"],
  "Storm season arriving before repairs are finished": ["environmental"],
  // Dark Fantasy
  "Spreading corruption": ["supernatural", "disease"],
  "Warlord conquest": ["war", "siege"],
  "Plague outbreak": ["disease"],
  "Undead rising": ["supernatural"],
  "Dark pact unravelling": ["supernatural", "betrayal"],
  "Chosen champion gone wrong": ["betrayal", "supernatural"],
  // Cyberpunk
  "Labour unrest": ["labour", "politics"],
  "Corporate hostile takeover": ["politics", "trade"],
  "Gang war": ["crime", "war"],
  "Data breach": ["technology", "crime"],
  "AI malfunction": ["technology"],
  "Blackout threat": ["technology", "scarcity"],
  "Underground resistance rising": ["politics", "defiant"],
  // Sci-Fi
  "Life support failure": ["technology", "environmental"],
  "Communication blackout": ["technology", "isolated"],
  "Resource depletion": ["scarcity"],
  Mutiny: ["betrayal", "labour"],
  "First contact situation": ["politics", "research"],
  "Quarantine breach": ["disease", "medical"],
  "Corporate exploitation": ["labour", "politics"],
  // Post-Apocalyptic
  "Raider siege incoming": ["siege", "war"],
  "Resource scarcity": ["scarcity"],
  "Leadership collapse": ["politics"],
  "Contamination spreading": ["environmental", "disease"],
  "Faction civil war": ["war", "politics"],
  "Hidden betrayal": ["betrayal"],
  "Cult infiltration": ["religious", "betrayal"],
  // Modern
  "Political scandal": ["politics"],
  "Economic collapse": ["scarcity", "trade"],
  "Environmental threat": ["environmental"],
  "Crime wave": ["crime"],
  "Cultural conflict": ["politics"],
  "Hidden crime network": ["crime", "betrayal"],
  // Horror
  "Supernatural haunting": ["supernatural"],
  "Vampire feeding ring": ["supernatural", "crime"],
  "Ancient entity awakening": ["supernatural"],
  "Mass disappearances": ["supernatural", "crime"],
  "Forbidden ritual": ["supernatural", "religious"],
  "Hidden monster in plain sight": ["supernatural", "betrayal"],
  // Cosmic Horror
  "A survey team returned with one member missing from every photograph": [
    "supernatural",
    "research",
  ],
  "The town's tide tables now predict events on land": [
    "supernatural",
    "maritime",
  ],
  "A sealed archive has begun issuing requests for materials": [
    "supernatural",
    "academic",
  ],
  "Residents disagree about whether last week's eclipse happened": [
    "supernatural",
  ],
  "A quarantine order is hiding an anomaly rather than an illness": [
    "medical",
    "betrayal",
  ],
  // Western
  "Range war": ["war", "agrarian"],
  "Railroad company pressure": ["politics", "trade"],
  "Outlaw gang threat": ["crime"],
  "Sheriff corruption": ["crime", "politics"],
  "Water rights dispute": ["scarcity", "environmental"],
  "Mining claim fraud": ["crime", "mining"],
  // Steampunk
  "Labour strike turning violent": ["labour", "industrial"],
  "Imperial annexation": ["imperial", "politics", "war"],
  "Saboteur in the works": ["betrayal", "industrial"],
  "Inventor's experiment gone wrong": ["technology"],
  "Guild power struggle": ["politics", "labour"],
  "Airship piracy": ["crime", "transit"],
  // Space Opera Resistance
  "Imperial crackdown imminent": ["imperial", "oppressive", "siege"],
  "Syndicate gang war": ["crime", "war"],
  "Rebel cell compromised": ["betrayal", "politics"],
  "Ancient weapon discovered": ["technology", "war"],
  "Blockade causing starvation": ["siege", "scarcity"],
  "Bounty hunters searching the streets": ["crime"],
  // Optimistic Exploration Sci-Fi
  "Threat of a border skirmish": ["war", "politics"],
  "A failing planetary life support system": ["technology", "environmental"],
  "A diplomatic breakdown between two alien delegations": ["politics"],
  "A mysterious viral outbreak in the medical bay": ["disease", "medical"],
  "Sabotage of the main warp reactor": ["betrayal", "technology"],
};

/** Official authorities, keyed by the exact value in `authorityTypesByGenre`. */
export const AUTHORITY_TRAITS: TraitMap = {
  // Fantasy
  "Feudal lord": ["feudal", "autocratic"],
  "Elected council": ["elected"],
  "Merchant guild": ["oligarchic", "trade"],
  "Military commander": ["military", "autocratic"],
  "High priest / priestess": ["religious", "autocratic"],
  "Arcane council": ["academic", "supernatural"],
  "Tribal elders": ["tribal"],
  // Pirate
  "An elected harbour council": ["elected", "maritime"],
  "A pirate captain under shared articles": ["criminal-rule", "maritime"],
  "A merchant syndicate": ["oligarchic", "trade"],
  "A naval governor": ["military", "maritime", "imperial"],
  "A loose coalition of ship crews": ["elected", "maritime", "lawless"],
  // Dark Fantasy
  Warlord: ["military", "autocratic"],
  "Dark sorcerer": ["supernatural", "autocratic"],
  "Iron council": ["oligarchic", "oppressive"],
  Despot: ["autocratic", "oppressive"],
  "Cult master": ["religious", "autocratic"],
  "Undead overlord": ["supernatural", "autocratic"],
  // Cyberpunk
  "Corporate overseer": ["oligarchic", "bureaucratic"],
  "Gang boss": ["criminal-rule"],
  "AI system": ["artificial", "bureaucratic"],
  "Criminal syndicate": ["criminal-rule", "oligarchic"],
  // Sci-Fi
  "Station director": ["administrative", "autocratic"],
  "Colonial authority": ["administrative", "imperial"],
  "AI administrator": ["artificial", "bureaucratic"],
  "Military command": ["military"],
  "Corporate board": ["oligarchic", "bureaucratic"],
  // Post-Apocalyptic
  "Council of survivors": ["elected"],
  "Cult leader": ["religious", "autocratic"],
  "AI remnant": ["artificial", "ruined"],
  // Modern
  "Elected mayor": ["elected"],
  "Corporate management": ["oligarchic", "bureaucratic"],
  "Military governor": ["military", "autocratic"],
  "Criminal boss": ["criminal-rule"],
  "Traditional chief": ["tribal"],
  "Religious leader": ["religious"],
  // Horror
  "Ancient vampire lord": ["supernatural", "autocratic"],
  "Old family council": ["oligarchic", "feudal"],
  "Hidden entity's puppet": ["supernatural", "betrayal"],
  "Corrupt official": ["bureaucratic", "crime"],
  "Religious authority": ["religious"],
  // Cosmic Horror
  "University field director": ["academic", "research"],
  "Harbour and quarantine board": ["administrative", "maritime", "medical"],
  "Inherited town council": ["oligarchic", "feudal"],
  "Expedition sponsor's representative": ["oligarchic", "research"],
  "Archive custodian with emergency powers": ["academic", "autocratic"],
  // Western
  Sheriff: ["administrative", "military"],
  "Railroad company agent": ["oligarchic", "trade"],
  "Cattle baron": ["oligarchic", "agrarian"],
  "Outlaw boss": ["criminal-rule", "lawless"],
  "Town council": ["elected"],
  "Military fort commander": ["military"],
  // Steampunk
  "Guild master": ["oligarchic", "labour"],
  "Imperial administrator": ["imperial", "bureaucratic"],
  "Factory owner": ["oligarchic", "industrial"],
  "Elected alderman": ["elected"],
  "Inventor-patriarch": ["technology", "autocratic"],
  // Space Opera Resistance
  "Imperial Governor": ["imperial", "oppressive"],
  "Syndicate Boss": ["criminal-rule", "oligarchic"],
  "Rebel General": ["military", "defiant"],
  "Corrupt Prefect": ["imperial", "crime"],
  "Mystic Elder": ["religious", "supernatural"],
  "Frontier Mayor": ["elected", "frontier"],
  // Optimistic Exploration Sci-Fi
  "Station Commander": ["military", "administrative"],
  "Planetary Governor": ["administrative", "elected"],
  "Science Director": ["research", "academic"],
  "Fleet Admiral": ["military"],
  Ambassador: ["administrative", "politics"],
};

/**
 * Hard rules, expressed once against traits rather than repeated per option.
 * Deliberately few: the pools are already genre-scoped, so most contradictions
 * cannot arise, and a rule that fires too often just costs variety.
 */
export const SETTLEMENT_RULES: readonly {
  /** Applies to any option carrying this trait. */
  trait: SettlementTrait;
  /** The option is unavailable unless an earlier axis satisfies this. */
  requiresTraitOf?: readonly SettlementTrait[];
  /** The option is unavailable if an earlier axis carries one of these. */
  excludesTraitOf?: readonly SettlementTrait[];
}[] = [
  // A fishing fleet or a harbour board needs water to sit on.
  { trait: "maritime", requiresTraitOf: ["coastal", "riverine"] },
  // Nothing farms an orbital dock or an irradiated salvage field.
  {
    trait: "agrarian",
    excludesTraitOf: ["orbital", "underground", "wasteland"],
  },
];

/**
 * Soft coherence. An option carrying `favour` is weighted up when an
 * already-resolved axis carries `when`, which keeps settlements internally
 * plausible without ever forcing a single answer.
 */
export const SETTLEMENT_AFFINITIES: readonly {
  when: SettlementTrait;
  favour: SettlementTrait;
  multiplier: number;
}[] = [
  { when: "coastal", favour: "trade", multiplier: 2 },
  { when: "riverine", favour: "trade", multiplier: 1.5 },
  { when: "transit", favour: "trade", multiplier: 2 },
  { when: "isolated", favour: "refuge", multiplier: 2 },
  { when: "ruined", favour: "supernatural", multiplier: 2 },
  { when: "urban", favour: "criminal", multiplier: 1.5 },
  { when: "mining", favour: "industrial", multiplier: 2 },
  // Who ends up in charge follows what the place is for.
  { when: "trade", favour: "oligarchic", multiplier: 2.5 },
  { when: "military", favour: "military", multiplier: 2.5 },
  { when: "religious", favour: "religious", multiplier: 2.5 },
  { when: "criminal", favour: "criminal-rule", multiplier: 2.5 },
  { when: "academic", favour: "academic", multiplier: 2.5 },
  { when: "research", favour: "academic", multiplier: 2 },
  { when: "agrarian", favour: "tribal", multiplier: 1.5 },
  { when: "industrial", favour: "oligarchic", multiplier: 2 },
  // Tone follows circumstance.
  { when: "trade", favour: "prosperous", multiplier: 2 },
  { when: "isolated", favour: "frontier", multiplier: 2 },
  { when: "ruined", favour: "declining", multiplier: 2 },
  { when: "refuge", favour: "desperate", multiplier: 2 },
  { when: "imperial", favour: "oppressive", multiplier: 2 },
  { when: "criminal-rule", favour: "lawless", multiplier: 2 },
  // And the crisis follows the tone and the power structure.
  { when: "military", favour: "siege", multiplier: 2 },
  { when: "industrial", favour: "labour", multiplier: 2 },
  { when: "mining", favour: "labour", multiplier: 2 },
  { when: "criminal-rule", favour: "crime", multiplier: 2 },
  { when: "supernatural", favour: "supernatural", multiplier: 2.5 },
  { when: "medical", favour: "disease", multiplier: 2.5 },
  { when: "scarcity", favour: "scarcity", multiplier: 1.5 },
  { when: "politics", favour: "politics", multiplier: 2 },
];
