/**
 * Semantic traits for the faction, nomad clan, and vampire clan generators (#2531).
 *
 * Kept beside `factionConfig` rather than inside it so the option tables stay
 * plain strings and backwards compatible.
 *
 * Deliberately closed vocabulary: types catch typos before they silently break rules.
 */

export const FACTION_TRAIT_VOCABULARY = [
  // Function & Purpose
  "trade",
  "military",
  "religious",
  "academic",
  "research",
  "criminal",
  "maritime",
  "industrial",
  "agrarian",
  "administrative",
  "subversive",
  "technology",
  "medical",
  "esoteric",
  "salvage",
  "diplomatic",
  "exploration",

  // Structure & Governance
  "feudal",
  "oligarchic",
  "autocratic",
  "democratic",
  "corporate",
  "tribal",
  "syndicate",
  "coven",
  "cell",
  "clandestine",

  // Moral & Operational Stance
  "lawful",
  "ruthless",
  "idealistic",
  "pragmatic",
  "fanatical",
  "secretive",
  "protective",
  "opportunistic",
  "predatory",
  "feral",
  "rebellious",
  "violent",
  "survival",
  "decadent",
  "honourable",

  // Scale & Reach
  "local",
  "city",
  "regional",
  "global",
  "interstellar",
  "highway",
  "isolated",
  "orbital",
  "wasteland",
  "underground",

  // Vulnerabilities, Tensions & Crises
  "betrayal",
  "succession",
  "scarcity",
  "inquisition",
  "exposure",
  "taint",
  "rivalry",
  "oppression",
  "debt",
  "law-enforcement",

  // Assets & Powers
  "wealth",
  "violence-power",
  "information",
  "magic",
  "blood",
  "logistics",
  "fleet",
] as const;

export type FactionTrait = (typeof FACTION_TRAIT_VOCABULARY)[number];

type TraitMap = Readonly<Record<string, readonly FactionTrait[]>>;

// ---------------------------------------------------------------------------
// Standard Faction Trait Annotations
// ---------------------------------------------------------------------------

export const FACTION_TYPE_TRAITS: TraitMap = {
  // Classic Fantasy
  "Merchant Guild": ["trade", "oligarchic", "wealth"],
  "Secret Society": ["clandestine", "secretive", "information"],
  "Mercenary Company": ["military", "pragmatic", "violence-power"],
  "Temple Order": ["religious", "fanatical", "protective"],
  "Criminal Syndicate": ["criminal", "syndicate", "ruthless"],
  "Rebel Cell": ["subversive", "cell", "idealistic", "rebellious"],
  "Arcane Circle": ["academic", "magic", "esoteric", "research"],
  "Guild Cartel": ["trade", "oligarchic", "industrial", "wealth"],
  "Mystic Order": ["esoteric", "religious", "magic", "secretive"],
  "Thieves' Guild": ["criminal", "syndicate", "secretive"],
  "Noble House": ["feudal", "oligarchic", "wealth", "administrative"],
  "Knightly Order": ["military", "feudal", "honourable", "protective"],

  // Pirate
  "Pirate Crew": ["maritime", "criminal", "opportunistic", "violence-power"],
  "Privateer Fleet": ["maritime", "military", "pragmatic", "fleet"],
  "Pirate Smuggling Ring": ["maritime", "criminal", "trade", "clandestine"],
  "Port Authority": ["maritime", "administrative", "lawful"],
  "Sea Cult": ["maritime", "religious", "esoteric", "fanatical"],
  "Salvager Guild": ["maritime", "salvage", "trade"],
  "Mutineer Enclave": ["maritime", "rebellious", "subversive", "isolated"],

  // Cyberpunk / Corporate
  "Corporate Division": ["corporate", "oligarchic", "wealth", "ruthless"],
  "Hacker Collective": ["technology", "cell", "information", "clandestine"],
  "Street Gang": ["criminal", "local", "violent", "survival"],
  "Black Market Network": ["criminal", "trade", "syndicate", "wealth"],
  "Underclass Rebel Cell": ["subversive", "cell", "idealistic", "rebellious"],
  "Smuggler Syndicate": ["criminal", "trade", "logistics", "clandestine"],
  "Megacorp Subsidiary": ["corporate", "wealth", "technology", "ruthless"],
  "Intelligence Bureau": [
    "administrative",
    "information",
    "clandestine",
    "secretive",
  ],

  // Vampire / Gothic Noir
  "Vampire Court": ["feudal", "coven", "decadent", "predatory", "blood"],
  "Occult Order": ["esoteric", "magic", "secretive", "fanatical"],
  "Corrupt Nobility": ["feudal", "decadent", "ruthless", "wealth"],
  "Detective Agency": ["academic", "information", "lawful", "local"],
  "Cult of the Damned": ["religious", "fanatical", "esoteric", "predatory"],
  "Ecclesiastical Order": [
    "religious",
    "fanatical",
    "inquisition",
    "administrative",
  ],

  // Cosmic Horror
  "Research Society": ["academic", "research", "information"],
  "Forbidden Archive": ["academic", "information", "esoteric", "secretive"],
  "Antiquarian Circle": ["academic", "esoteric", "wealth"],
  "Coastal Cult": ["maritime", "religious", "esoteric", "fanatical"],
  "Expedition Trust": ["exploration", "academic", "wealth"],
  "University Department": ["academic", "research", "administrative"],
  "Esoteric Lodge": ["clandestine", "esoteric", "secretive", "oligarchic"],
  "Quarantine Authority": [
    "administrative",
    "military",
    "protective",
    "inquisition",
  ],

  // Sci-Fi / Space Opera
  "Imperial Intelligence Bureau": [
    "administrative",
    "information",
    "clandestine",
    "autocratic",
  ],
  "Resistance Cell": ["subversive", "cell", "rebellious", "idealistic"],
  "Planetary Guild": ["trade", "industrial", "global", "oligarchic"],
  "Federated Science Directorate": [
    "academic",
    "research",
    "technology",
    "democratic",
  ],
  "Planetary Council": ["administrative", "democratic", "global"],
  "Border System Power": ["military", "regional", "autocratic", "survival"],
  "Splinter Ideological Movement": [
    "subversive",
    "fanatical",
    "rebellious",
    "cell",
  ],
  "Corporate Extraction Crew": [
    "corporate",
    "industrial",
    "salvage",
    "ruthless",
  ],
  "Imperial Fleet": ["military", "autocratic", "fleet", "interstellar"],

  // Modern Conspiracy
  "Underground Network": ["clandestine", "cell", "information", "subversive"],
  "Corporate Lobby": ["corporate", "wealth", "administrative", "pragmatic"],
  "Militia Cell": ["military", "cell", "rebellious", "violent"],
  "Doomsday Cult": ["religious", "fanatical", "esoteric", "survival"],
  "Activist Cell": ["subversive", "cell", "idealistic", "democratic"],
  "Shadow Government": ["clandestine", "autocratic", "information", "global"],

  // Post-Apocalyptic
  "Scavenger Clan": ["salvage", "tribal", "survival", "wasteland"],
  "Raider Warband": ["criminal", "violent", "ruthless", "wasteland"],
  "Survivor Collective": ["protective", "democratic", "survival", "wasteland"],
  "Wasteland Cartel": ["syndicate", "trade", "ruthless", "wealth"],
  "Cult Commune": ["religious", "fanatical", "tribal", "survival"],
  "Trade Caravan": ["trade", "logistics", "pragmatic", "wasteland"],

  // Western / Frontier
  "Outlaw Gang": ["criminal", "violent", "opportunistic", "local"],
  "Frontier Trading Company": ["trade", "corporate", "wealth", "local"],
  "Land Barons' Syndicate": ["feudal", "oligarchic", "wealth", "ruthless"],
  "Railroad Trust": ["industrial", "corporate", "logistics", "wealth"],
  "Vigilante Committee": ["military", "local", "violent", "fanatical"],
  "Settler Militia": ["military", "local", "protective", "survival"],
  "Indigenous Resistance": ["tribal", "rebellious", "protective", "survival"],
  "Smuggler Ring": ["criminal", "trade", "clandestine"],
  "Lawmen's Association": ["administrative", "lawful", "military"],

  // Steampunk
  "Airship Consortium": ["industrial", "logistics", "trade", "fleet"],
  "Aetheric Research Order": ["academic", "research", "technology", "magic"],
  "Inventors' League": ["technology", "academic", "trade"],
  "Labor Union": ["subversive", "democratic", "protective", "industrial"],

  // Lancer
  "Union Rapid Response Unit": [
    "military",
    "administrative",
    "protective",
    "democratic",
  ],
  "Heterodox Mech Corps": [
    "military",
    "technology",
    "pragmatic",
    "violence-power",
  ],
  "NHP Research Consortium": ["academic", "technology", "research", "esoteric"],
  "Colonial Liberation Front": [
    "subversive",
    "rebellious",
    "cell",
    "idealistic",
  ],
  "Imperial Authority": [
    "autocratic",
    "administrative",
    "military",
    "oppression",
  ],

  // Space Opera Resistance
  "Guerrilla Warband": ["subversive", "military", "cell", "violent"],
  "Defector Cell": ["subversive", "cell", "clandestine", "information"],

  // Optimistic Exploration Sci-Fi
  "Diplomatic Corps": [
    "diplomatic",
    "administrative",
    "idealistic",
    "democratic",
  ],
  "Research Consortium": ["academic", "research", "technology", "democratic"],
  "Explorer's Union": ["exploration", "academic", "protective", "fleet"],
  "Medical Aid Network": ["medical", "protective", "idealistic"],
  "Cultural Exchange Program": [
    "diplomatic",
    "academic",
    "idealistic",
    "democratic",
  ],
  "Peacekeeping Force": ["military", "protective", "diplomatic", "lawful"],
  "Trade Alliance": ["trade", "diplomatic", "democratic", "wealth"],
};

export const FACTION_SCOPE_TRAITS: TraitMap = {
  // Classic Fantasy
  "Local district": ["local"],
  "Single city": ["city"],
  "Border region": ["regional"],
  "Trade route": ["regional", "trade", "logistics"],
  "Hidden stronghold": ["isolated", "clandestine"],
  "Kingdom-wide network": ["global"],

  // Pirate
  "Single ship or port": ["local", "maritime"],
  "Island chain": ["regional", "maritime", "isolated"],
  "Coastal region": ["regional", "maritime"],
  "Privateer theatre": ["regional", "maritime", "military"],
  "Open-sea confederacy": ["global", "maritime", "fleet"],

  // Cyberpunk
  "Single arcology block": ["local"],
  "City megaplex": ["city"],
  "Corporate sector": ["city", "corporate"],
  "Black market network": ["city", "criminal", "clandestine"],
  "Cross-city underground": ["regional", "clandestine"],
  "Multi-city corporate reach": ["global", "corporate"],

  // Vampire
  "Single city underbelly": ["city", "underground", "clandestine"],
  "Hidden manor & surrounds": ["isolated", "feudal"],
  "Shadow trade network": ["regional", "clandestine", "trade"],
  "Metropolitan high society": ["city", "oligarchic", "wealth"],
  "Regional shadow court": ["regional", "feudal", "clandestine"],
  "Continental blood compact": ["global", "feudal", "blood"],

  // Cosmic Horror
  "Single town or outpost": ["local", "isolated"],
  "Remote coast or valley": ["regional", "isolated", "maritime"],
  "University district": ["city", "academic"],
  "Regional expedition route": ["regional", "exploration"],
  "National occult network": ["global", "esoteric", "clandestine"],
  "Transcontinental research circle": ["global", "academic", "research"],

  // Sci-Fi
  "Single station or colony": ["local", "orbital", "isolated"],
  "Planetary surface": ["city", "regional"],
  "Star system": ["regional", "orbital"],
  "Trade lane corridor": ["regional", "logistics", "trade"],
  "Sector-wide network": ["global", "interstellar"],
  "Galactic fringe territory": ["global", "interstellar", "isolated"],

  // Modern Conspiracy
  "City borough": ["local"],
  "Metropolitan area": ["city"],
  "National network": ["global"],
  "Cross-border operation": ["regional", "clandestine"],
  "Dark web presence": ["global", "technology", "clandestine"],
  "Global shadow reach": ["global", "clandestine"],

  // Post-Apocalyptic
  "Single settlement": ["local", "wasteland"],
  "Wasteland outpost cluster": ["regional", "wasteland"],
  "Trade road corridor": ["regional", "highway", "logistics"],
  "Regional scavenger territory": ["regional", "salvage", "wasteland"],
  "Fortified stronghold zone": ["local", "military", "isolated"],
  "Multi-region survivor network": ["global", "survival", "wasteland"],

  // Western / Frontier
  "Single town": ["local"],
  "County territory": ["local", "regional"],
  "Trail corridor": ["regional", "highway", "logistics"],
  "River basin": ["regional", "maritime"],
  "Territorial expanse": ["regional"],
  "Cross-territory railroad reach": ["global", "industrial", "logistics"],

  // Steampunk
  "Single borough": ["local"],
  "Industrial district": ["city", "industrial"],
  "City-wide guild network": ["city", "trade"],
  "Trade route airway": ["regional", "logistics", "fleet"],
  "Empire-wide consortium": ["global", "corporate", "wealth"],
  "Cross-empire aetheric reach": ["global", "technology", "magic"],

  // Lancer
  "Single colony": ["local", "orbital"],
  "System jurisdiction": ["regional", "orbital"],
  "Long Rim corridor": ["regional", "highway", "isolated"],
  "Bleed border zone": ["regional", "military", "isolated"],
  "Union-wide theatre": ["global", "interstellar", "administrative"],

  // Space Opera Resistance
  "Single occupied world": ["local", "oppression"],
  "System cell network": ["regional", "cell", "clandestine"],
  "Sector resistance front": ["regional", "military", "subversive"],
  "Supply corridor": ["regional", "logistics"],
  "Cross-sector underground": ["global", "cell", "clandestine"],
  "Galaxy-wide insurgency": [
    "global",
    "interstellar",
    "subversive",
    "military",
  ],

  // Optimistic Exploration Sci-Fi
  "Single outpost": ["local", "orbital", "exploration"],
  "Colony world": ["regional", "exploration"],
  "Exploration corridor": ["regional", "exploration", "fleet"],
  "Federation region": ["global", "interstellar", "diplomatic"],
  "Multi-species alliance space": ["global", "interstellar", "diplomatic"],
};

export const FACTION_ALIGNMENT_TRAITS: TraitMap = {
  "Publicly lawful, privately ruthless": ["lawful", "ruthless", "clandestine"],
  "Idealistic but compromised": ["idealistic", "pragmatic", "subversive"],
  "Pragmatic and profit-driven": [
    "pragmatic",
    "trade",
    "opportunistic",
    "wealth",
  ],
  "Fanatical and secretive": [
    "fanatical",
    "secretive",
    "clandestine",
    "esoteric",
  ],
  "Protective of common folk": ["protective", "idealistic", "honourable"],
  "Opportunistic and divided": ["opportunistic", "rivalry", "betrayal"],
};

export const FACTION_GOAL_TRAITS: TraitMap = {
  // Classic Fantasy & Default Goals
  "Control a contested trade route before a rival power does.": [
    "trade",
    "logistics",
    "rivalry",
    "wealth",
  ],
  "Recover a forbidden relic buried beneath a civic landmark.": [
    "magic",
    "esoteric",
    "academic",
    "information",
  ],
  "Replace corrupt officials with loyal agents.": [
    "administrative",
    "clandestine",
    "subversive",
    "information",
  ],
  "Protect a hidden sanctuary from outside discovery.": [
    "protective",
    "isolated",
    "secretive",
    "clandestine",
  ],
  "Break an old treaty that limits their expansion.": [
    "rebellious",
    "military",
    "opportunistic",
    "feudal",
  ],
  "Expose a rival faction's crimes without revealing their own.": [
    "information",
    "rivalry",
    "clandestine",
    "ruthless",
  ],

  // Pirate
  "Claim a hidden harbour before a naval patrol discovers it.": [
    "maritime",
    "isolated",
    "rivalry",
    "clandestine",
  ],
  "Recover a fragmented chart to a lost prize and decide who deserves it.": [
    "maritime",
    "exploration",
    "wealth",
    "salvage",
  ],
  "Break a blockade without abandoning the vessels trapped behind it.": [
    "maritime",
    "military",
    "protective",
    "fleet",
  ],
  "Unite rival crews against a privateer fleet that has voided its charter.": [
    "maritime",
    "diplomatic",
    "rebellious",
    "rivalry",
  ],
  "Control the only safe passage through a storm-wracked strait.": [
    "maritime",
    "logistics",
    "trade",
    "wealth",
  ],
  "Expose a port authority selling crew manifests to press gangs.": [
    "maritime",
    "protective",
    "information",
    "oppression",
  ],

  // Cyberpunk / Corporate
  "Seize majority stake in a rival megacorp before the hostile takeover closes.":
    ["corporate", "wealth", "ruthless", "rivalry"],
  "Wipe a damning data trail from every server before the audit drops.": [
    "technology",
    "clandestine",
    "information",
    "exposure",
  ],
  "Install a puppet candidate in the upcoming corporate board election.": [
    "corporate",
    "administrative",
    "clandestine",
    "ruthless",
  ],
  "Monopolize the only clean water distribution network in the district.": [
    "corporate",
    "scarcity",
    "ruthless",
    "wealth",
  ],
  "Acquire the encryption keys to the city's surveillance backbone.": [
    "technology",
    "information",
    "clandestine",
    "autocratic",
  ],
  "Undercut a competitor's street supply chain and absorb their territory.": [
    "trade",
    "criminal",
    "ruthless",
    "rivalry",
  ],

  // Vampire / Gothic Noir
  "Blood-bind the city council before the rival clan gains a foothold.": [
    "blood",
    "administrative",
    "clandestine",
    "rivalry",
  ],
  "Recover the shattered tome that names every hidden bloodline in the region.":
    ["esoteric", "academic", "blood", "information"],
  "Monopolize the underground blood supply before winter cuts off deliveries.":
    ["blood", "scarcity", "trade", "predatory"],
  "Eliminate the inquisitor cell closing in on their primary haven.": [
    "inquisition",
    "violence-power",
    "protective",
    "clandestine",
  ],
  "Awaken a dormant elder whose knowledge could shift the balance of power.": [
    "esoteric",
    "feudal",
    "blood",
    "information",
  ],
  "Rewrite the Masquerade record to erase a recent, very public incident.": [
    "exposure",
    "clandestine",
    "information",
    "secretive",
  ],

  // Cosmic Horror
  "Secure every surviving copy of a field report before it reaches the public archive.":
    ["academic", "information", "secretive", "exposure"],
  "Contain an anomaly long enough to learn whether it can be moved safely.": [
    "academic",
    "research",
    "protective",
    "esoteric",
  ],
  "Recover a missing expedition's instruments before another team follows its route.":
    ["exploration", "academic", "research", "rivalry"],
  "Control access to an excavation whose geometry changes with the tide.": [
    "esoteric",
    "research",
    "maritime",
    "isolated",
  ],
  "Keep a university board from funding a public investigation into a private discovery.":
    ["academic", "administrative", "information", "secretive"],
  "Decide whether to warn a coastal community before the next recurrence.": [
    "maritime",
    "protective",
    "esoteric",
    "idealistic",
  ],

  // Sci-Fi / Space Opera
  "Claim the mining rights to an uncharted asteroid belt before the empire does.":
    ["trade", "industrial", "salvage", "wealth"],
  "Recover a derelict warship drifting in contested space.": [
    "salvage",
    "military",
    "fleet",
    "orbital",
  ],
  "Bribe a planetary governor into breaking their imperial trade agreement.": [
    "trade",
    "administrative",
    "clandestine",
    "wealth",
  ],
  "Establish a fuel depot in neutral space before the rival fleet arrives.": [
    "logistics",
    "military",
    "orbital",
    "rivalry",
  ],
  "Decrypt a distress beacon that may hold coordinates to a lost colony.": [
    "technology",
    "information",
    "exploration",
    "salvage",
  ],
  "Expose a rival corporation's illegal weapons testing on an inhabited moon.":
    ["information", "corporate", "protective", "rivalry"],

  // Modern Conspiracy
  "Suppress leaked documents before they reach a major news outlet.": [
    "information",
    "clandestine",
    "exposure",
    "secretive",
  ],
  "Place a sleeper agent inside the counterintelligence unit hunting them.": [
    "clandestine",
    "information",
    "inquisition",
    "ruthless",
  ],
  "Seize control of a city's financial clearing network.": [
    "wealth",
    "technology",
    "trade",
    "administrative",
  ],
  "Eliminate a whistleblower without triggering a federal investigation.": [
    "violence-power",
    "clandestine",
    "exposure",
    "ruthless",
  ],
  "Acquire a foreign biotech patent through a shell company acquisition.": [
    "corporate",
    "technology",
    "medical",
    "wealth",
  ],
  "Rig an election result in three swing districts simultaneously.": [
    "administrative",
    "clandestine",
    "democratic",
    "ruthless",
  ],

  // Post-Apocalyptic
  "Secure the only functioning water purifier in the region.": [
    "scarcity",
    "technology",
    "survival",
    "wealth",
  ],
  "Claim a pre-war cache of medicine before a raider warband reaches it.": [
    "medical",
    "salvage",
    "survival",
    "rivalry",
  ],
  "Bring a salvageable power plant online before winter.": [
    "industrial",
    "technology",
    "survival",
    "logistics",
  ],
  "Eliminate a rival settlement leader and absorb their followers.": [
    "violence-power",
    "ruthless",
    "rivalry",
    "autocratic",
  ],
  "Recover an encrypted pre-war map that shows every buried supply depot.": [
    "information",
    "salvage",
    "logistics",
    "survival",
  ],
  "Control the only functioning radio tower and its broadcast range.": [
    "technology",
    "information",
    "logistics",
    "autocratic",
  ],

  // Western / Frontier
  "Secure the land deed before the railroad company forecloses on it.": [
    "feudal",
    "trade",
    "wealth",
    "protective",
  ],
  "Drive a rival rancher off contested grazing territory.": [
    "agrarian",
    "violence-power",
    "rivalry",
    "ruthless",
  ],
  "Control the only safe river crossing in the territory.": [
    "logistics",
    "trade",
    "maritime",
    "wealth",
  ],
  "Bribe the territorial marshal before the next circuit court session.": [
    "administrative",
    "lawful",
    "clandestine",
    "wealth",
  ],
  "Find the outlaw who robbed their payroll shipment and make an example.": [
    "violence-power",
    "ruthless",
    "wealth",
    "rivalry",
  ],
  "Establish a trading post monopoly before a competing outfit arrives.": [
    "trade",
    "wealth",
    "rivalry",
    "logistics",
  ],

  // Steampunk
  "Acquire the patent on a revolutionary aetheric engine before a rival guild does.":
    ["technology", "industrial", "academic", "wealth"],
  "Sabotage a competitor's airship fleet before the imperial contract is awarded.":
    ["subversive", "fleet", "industrial", "rivalry"],
  "Install a loyal factory foreman and suppress the rising labor uprising.": [
    "industrial",
    "autocratic",
    "oppression",
    "ruthless",
  ],
  "Recover stolen schematics from a foreign intelligence bureau.": [
    "technology",
    "information",
    "clandestine",
    "salvage",
  ],
  "Corner the coal and aether supply chain across three industrial cities.": [
    "trade",
    "industrial",
    "wealth",
    "logistics",
  ],
  "Expose a rival guild's illegal automaton conscription program.": [
    "information",
    "industrial",
    "protective",
    "rivalry",
  ],

  // Lancer
  "Secure blink gate access rights before the corporate extraction crew arrives.":
    ["logistics", "technology", "orbital", "wealth"],
  "Recover a rogue NHP before Union Central authorizes a CASKET wipe.": [
    "technology",
    "esoteric",
    "research",
    "salvage",
  ],
  "Establish a forward operating base in contested Long Rim territory.": [
    "military",
    "logistics",
    "orbital",
    "isolated",
  ],
  "Expose a corebook violation in a rival contractor's operational record.": [
    "information",
    "administrative",
    "lawful",
    "rivalry",
  ],
  "Break a colonial extraction agreement before the next supply convoy lands.":
    ["subversive", "trade", "rebellious", "logistics"],
  "Recruit a heterodox mech corps before a rival Union faction absorbs them.": [
    "military",
    "violence-power",
    "rivalry",
    "technology",
  ],

  // Space Opera Resistance
  "Destroy an imperial listening post before the next fleet coordination cycle.":
    ["subversive", "military", "technology", "violence-power"],
  "Smuggle a resistance leader off an occupied world before extraction windows close.":
    ["subversive", "logistics", "clandestine", "protective"],
  "Sabotage the imperial shipyard's next capital-class launch.": [
    "subversive",
    "military",
    "industrial",
    "fleet",
  ],
  "Forge supply manifests to funnel weapons to a besieged cell.": [
    "logistics",
    "subversive",
    "violence-power",
    "clandestine",
  ],
  "Turn an imperial officer into a double agent before their loyalty review.": [
    "information",
    "clandestine",
    "betrayal",
    "subversive",
  ],
  "Establish a hidden base in an asteroid field outside patrol range.": [
    "isolated",
    "orbital",
    "clandestine",
    "military",
  ],

  // Optimistic Exploration Sci-Fi
  "Establish first contact protocols with a newly discovered species before military vessels arrive.":
    ["diplomatic", "exploration", "idealistic", "protective"],
  "Recover a damaged probe carrying irreplaceable xenobiological survey data.":
    ["academic", "research", "technology", "salvage"],
  "Mediate a resource dispute between two colony worlds before it turns violent.":
    ["diplomatic", "protective", "idealistic", "democratic"],
  "Chart a safe passage through an unstable nebula for the next exploration wave.":
    ["exploration", "logistics", "academic", "fleet"],
  "Secure a diplomatic treaty with a reclusive civilization before rivals do.":
    ["diplomatic", "idealistic", "rivalry", "democratic"],
  "Restore a failing terraforming station before the colony's survival window closes.":
    ["technology", "protective", "survival", "industrial"],
};

export const FACTION_CONFLICT_TRAITS: TraitMap = {
  "A splinter leader is selling secrets to an enemy.": [
    "betrayal",
    "information",
    "rivalry",
  ],
  "Their public mission conflicts with the methods they use at night.": [
    "clandestine",
    "exposure",
    "ruthless",
    "idealistic",
  ],
  "A recent victory created debts they cannot repay.": [
    "debt",
    "wealth",
    "scarcity",
  ],
  "Their patron has vanished, leaving rival lieutenants in charge.": [
    "succession",
    "rivalry",
    "feudal",
  ],
  "A hostage, ledger, or relic could unravel their legitimacy.": [
    "exposure",
    "information",
    "clandestine",
  ],
  "Their members disagree over whether the party is useful or dangerous.": [
    "rivalry",
    "clandestine",
    "pragmatic",
  ],
};

export const FACTION_HOOK_TRAITS: TraitMap = {
  "They hire the party for a simple delivery that is actually a loyalty test.":
    ["clandestine", "logistics", "pragmatic"],
  "They ask for protection during a meeting with a bitter rival.": [
    "protective",
    "rivalry",
    "diplomatic",
    "violence-power",
  ],
  "They offer information about a villain in exchange for public help.": [
    "information",
    "trade",
    "pragmatic",
  ],
  "They frame the party to force them into negotiation.": [
    "ruthless",
    "clandestine",
    "violence-power",
  ],
  "They need outsiders to enter a place their members are forbidden to visit.":
    ["secretive", "esoteric", "exploration", "isolated"],
  "They ask the party to choose between two bad successors.": [
    "succession",
    "feudal",
    "rivalry",
    "administrative",
  ],
};

// ---------------------------------------------------------------------------
// Nomad Clan Trait Annotations
// ---------------------------------------------------------------------------

export const NOMAD_ROLE_TRAITS: TraitMap = {
  "Family Convoy": ["protective", "tribal", "survival", "democratic"],
  "Smuggler Band": ["criminal", "trade", "logistics", "clandestine"],
  "Tech Scavengers": ["salvage", "technology", "trade"],
  "Wasteland Traders": ["trade", "logistics", "pragmatic", "wealth"],
  "Mercenary Riders": ["military", "violence-power", "pragmatic"],
  "Ex-Corporate Refugees": ["rebellious", "technology", "survival", "cell"],
  "Courier Network": ["logistics", "information", "highway"],
  "Raider-Adjacent": ["criminal", "violent", "ruthless", "opportunistic"],
  "Spiritual Road Cult": ["religious", "fanatical", "esoteric", "tribal"],
};

export const NOMAD_TONE_TRAITS: TraitMap = {
  "Grounded, gritty survival": ["survival", "pragmatic"],
  "Neon-punk, chrome and dust": ["technology", "rebellious"],
  "Weird and desperate": ["esoteric", "scarcity", "survival"],
  "Hopeful, tight-knit community": ["protective", "idealistic", "tribal"],
  "Violent, road-law rules": ["violent", "ruthless", "survival"],
};

export const NOMAD_TERRITORY_TRAITS: TraitMap = {
  "Highway corridors and fuel stops": ["highway", "logistics"],
  "Badlands and desert routes": ["wasteland", "isolated"],
  "Arcology outskirts and perimeter roads": ["local", "city", "highway"],
  "Flooded lowland transit zones": ["wasteland", "maritime", "isolated"],
  "Orbital scrapyards and drop-points": ["orbital", "salvage", "isolated"],
  "Ruined suburbs and ring-roads": ["wasteland", "city", "highway"],
  "Borderland checkpoints and no-man's-land": [
    "highway",
    "military",
    "isolated",
  ],
};

export const NOMAD_CONFLICT_TRAITS: TraitMap = {
  "Rival clan encroaching on their primary route": [
    "rivalry",
    "highway",
    "logistics",
  ],
  "Corporate pressure to surrender a cargo or a person": [
    "oppression",
    "corporate",
    "protective",
  ],
  "Fuel scarcity forcing dangerous detours": [
    "scarcity",
    "logistics",
    "survival",
  ],
  "Internal succession fracturing clan loyalty": [
    "succession",
    "rivalry",
    "tribal",
  ],
  "Lost cargo that someone will kill to recover": [
    "salvage",
    "violence-power",
    "exposure",
  ],
  "Cursed or experimental tech hidden in the convoy": [
    "technology",
    "esoteric",
    "taint",
  ],
  "Law enforcement crackdown closing key corridors": [
    "law-enforcement",
    "oppression",
    "highway",
  ],
  "Betrayal by a former ally who sold their route": [
    "betrayal",
    "highway",
    "rivalry",
  ],
};

export const NOMAD_GOAL_TRAITS: TraitMap = {
  "Secure the fuel depot before a rival clan claims squatter's rights.": [
    "scarcity",
    "rivalry",
    "logistics",
    "wealth",
  ],
  "Recover a clan member sold to a corporate labour farm.": [
    "protective",
    "oppression",
    "rebellious",
    "corporate",
  ],
  "Establish a new safe corridor after their primary route was compromised.": [
    "logistics",
    "highway",
    "survival",
    "exploration",
  ],
  "Prove the clan's code was broken by an insider and find the traitor.": [
    "betrayal",
    "honourable",
    "tribal",
    "information",
  ],
  "Acquire a vehicle capable of reaching the next settlement before the season closes.":
    ["salvage", "technology", "survival", "scarcity"],
  "Negotiate a truce with a rival clan before the corporate pressure destroys them both.":
    ["diplomatic", "rivalry", "survival", "corporate"],
};

export const NOMAD_HOOK_TRAITS: TraitMap = {
  "The clan needs an outsider to carry something across a checkpoint their faces are known at.":
    ["clandestine", "logistics", "law-enforcement"],
  "A clan member has gone missing at a waystation known for disappearances.": [
    "protective",
    "isolated",
    "information",
  ],
  "The clan's lead mechanic has decoded something hidden in recovered corporate salvage.":
    ["technology", "salvage", "information", "exposure"],
  "A dying rider names the party as witnesses to a debt the clan will honour — or dispute.":
    ["honourable", "debt", "tribal"],
  "The clan offers a safe convoy route in exchange for dealing with what is blocking it.":
    ["logistics", "highway", "trade", "violence-power"],
  "A corporate fixer is paying for intel on the clan's schedule — and they know it.":
    ["corporate", "information", "betrayal"],
};

// ---------------------------------------------------------------------------
// Vampire Clan Trait Annotations
// ---------------------------------------------------------------------------

export const VAMPIRE_ARCHETYPE_TRAITS: TraitMap = {
  "Aristocratic Court": ["feudal", "oligarchic", "decadent", "wealth"],
  "Occult Coven": ["coven", "esoteric", "magic", "secretive"],
  "Predatory Brood": ["feral", "predatory", "violent", "survival"],
  "Conspiring Syndicate": ["syndicate", "clandestine", "wealth", "trade"],
  "Rebel Anarchs": ["rebellious", "subversive", "cell", "violent"],
};

export const VAMPIRE_BLOODLINE_TRAITS: TraitMap = {
  "Sanguine Nobles (Charismatic Mind-Benders)": [
    "feudal",
    "decadent",
    "wealth",
    "oligarchic",
  ],
  "Shadow Stalkers (Nightmare Weavers)": [
    "clandestine",
    "secretive",
    "esoteric",
  ],
  "Blood Sorcerers (Occult Ritualists)": [
    "magic",
    "esoteric",
    "academic",
    "fanatical",
  ],
  "Bestial Ravagers (Feral Predator Shapeshifters)": [
    "feral",
    "predatory",
    "violent",
    "survival",
  ],
  "Melancholic Artists (Aesthetes of Decay)": [
    "decadent",
    "esoteric",
    "secretive",
  ],
};

export const VAMPIRE_FEEDING_TRAITS: TraitMap = {
  "High-Society Salons (Elite & Consent-based)": [
    "decadent",
    "oligarchic",
    "wealth",
    "feudal",
  ],
  "Street Predation (Slums & Forgotten Alleys)": [
    "predatory",
    "local",
    "violent",
    "clandestine",
  ],
  "Blood Trafficking (Black Market & Clinics)": [
    "trade",
    "criminal",
    "syndicate",
    "wealth",
  ],
  "Occult Sacraments (Ritualistic & Sacrificial)": [
    "religious",
    "esoteric",
    "fanatical",
    "coven",
  ],
  "Wild Wilderness Hunts (Deep Forests & Ruins)": [
    "feral",
    "predatory",
    "isolated",
    "survival",
  ],
};

export const VAMPIRE_WEAKNESS_TRAITS: TraitMap = {
  "Severe Sun Sensitivity (Burns instantly)": ["clandestine", "underground"],
  "Consecrated Ground Aversion (Cannot cross thresholds)": [
    "religious",
    "inquisition",
  ],
  "Mirror & Reflection Absence (Exposes their nature)": [
    "exposure",
    "secretive",
  ],
  "Decaying Physical Form (Needs fresh blood to look human)": [
    "taint",
    "predatory",
    "scarcity",
  ],
  "Silver & Wooden Vulnerability (Prevents regeneration)": [
    "violence-power",
    "inquisition",
  ],
};

export const VAMPIRE_SCOPE_TRAITS: TraitMap = {
  "Single city underbelly": ["city", "underground", "clandestine"],
  "Hidden castle & border valley": ["isolated", "feudal", "regional"],
  "Trade route shadow network": [
    "regional",
    "trade",
    "logistics",
    "clandestine",
  ],
  "Metropolitan high society": ["city", "oligarchic", "wealth", "decadent"],
  "Continental shadow court": ["global", "feudal", "coven", "oligarchic"],
};

export const VAMPIRE_ALIGNMENT_TRAITS: TraitMap = {
  "Strictly lawful, highly predatory": ["lawful", "predatory", "autocratic"],
  "Pragmatic and power-driven": ["pragmatic", "ruthless", "wealth"],
  "Feral, chaotic, and blood-fueled": ["feral", "violent", "predatory"],
  "Secretive and ritual-obsessed": [
    "secretive",
    "fanatical",
    "esoteric",
    "coven",
  ],
  "Rebellious, seeking freedom from elders": [
    "rebellious",
    "subversive",
    "idealistic",
  ],
};

export const VAMPIRE_GOAL_TRAITS: TraitMap = {
  "Infiltrate the city council and blood-bind key mortal leaders.": [
    "administrative",
    "clandestine",
    "oligarchic",
    "blood",
  ],
  "Exhume the sarcophagus of their dormant Progenitor.": [
    "esoteric",
    "feudal",
    "religious",
    "coven",
  ],
  "Monopolize the local blood bank distribution network.": [
    "medical",
    "trade",
    "scarcity",
    "corporate",
  ],
  "Wipe out a rival werewolf pack or vampire hunters' cell.": [
    "violence-power",
    "rivalry",
    "inquisition",
    "military",
  ],
  "Reconstruct a shattered ancient chronicle of blood magic.": [
    "academic",
    "magic",
    "esoteric",
    "research",
  ],
};

export const VAMPIRE_CONFLICT_TRAITS: TraitMap = {
  "The younger brood is planning a rebellion against the ancient elder.": [
    "rebellious",
    "succession",
    "rivalry",
    "feudal",
  ],
  "A feeding gone wrong has drawn the attention of mortal authorities.": [
    "exposure",
    "law-enforcement",
    "predatory",
  ],
  "A rogue member has stolen a ledger detailing the clan's human farms.": [
    "betrayal",
    "exposure",
    "information",
    "clandestine",
  ],
  "The blood supply is tainted by a mystical pathogen.": [
    "taint",
    "scarcity",
    "medical",
    "esoteric",
  ],
  "An inquisitor has successfully tracked their primary haven.": [
    "inquisition",
    "exposure",
    "clandestine",
  ],
};

export const VAMPIRE_HOOK_TRAITS: TraitMap = {
  "A mysterious patron hires the party to deliver a sealed urn, which is a vampire ashes decoy.":
    ["clandestine", "logistics", "esoteric"],
  "Locals ask the party to investigate a series of bloodless bodies found in the canal.":
    ["predatory", "exposure", "violent"],
  "A member of the clan offers to sell a list of high-profile vampire thralls in the city council.":
    ["information", "betrayal", "administrative", "trade"],
  "The clan captures the party and offers freedom in exchange for retrieving a relic from a sunlit temple.":
    ["esoteric", "religious", "ruthless"],
  "A dying vampire begs the party to protect their mortal family from their own sire.":
    ["protective", "betrayal", "feudal", "idealistic"],
};

// ---------------------------------------------------------------------------
// Base & Resource Trait Annotations
// ---------------------------------------------------------------------------

export const FACTION_BASE_TRAITS: TraitMap = {
  // Generic
  "A neutral facility whose access is controlled and whose records are not shared":
    ["clandestine", "administrative"],
  "A licensed premises that provides cover for activities conducted elsewhere":
    ["trade", "clandestine"],
  "A distributed network of locations with no single point of failure": [
    "cell",
    "clandestine",
  ],

  // Pirate
  "A crew-owned ship anchored in a neutral cove": [
    "maritime",
    "isolated",
    "fleet",
  ],
  "A floating camp that moves between safe harbours": [
    "maritime",
    "logistics",
    "fleet",
  ],
  "A hidden dockyard protected by shared articles": [
    "maritime",
    "clandestine",
    "industrial",
  ],
  "A chain of chandlers, warehouses, and discreet coves connected by coded manifests":
    ["maritime", "trade", "logistics"],
  "A portside network that moves people and cargo around customs patrols": [
    "maritime",
    "trade",
    "criminal",
  ],
  "A rotating set of safe houses whose owners only know one link in the route":
    ["maritime", "cell", "clandestine"],

  // Fantasy / Core
  "A bonded counting house whose ledgers are sealed by city charter": [
    "trade",
    "wealth",
    "administrative",
  ],
  "A licensed exchange hall at the centre of the trade district": [
    "trade",
    "city",
    "wealth",
  ],
  "A warehouse compound that no sheriff may enter without a writ": [
    "trade",
    "lawful",
    "industrial",
  ],
  "A private dining club whose membership list is never committed to paper": [
    "clandestine",
    "oligarchic",
    "wealth",
  ],
  "A decommissioned observatory reached through a hidden press in the library stacks":
    ["academic", "research", "clandestine"],
  "Rotating safe houses connected by messenger-drop protocols": [
    "cell",
    "clandestine",
    "information",
  ],
  "A fortified barracks compound outside the city walls": [
    "military",
    "violence-power",
  ],
  "A charted garrison holding neutral ground between two rival lords": [
    "military",
    "feudal",
    "diplomatic",
  ],
  "A licensed inn that doubles as a staging ground for contract work": [
    "military",
    "trade",
    "local",
  ],
  "A sanctified compound built above the sealed catacombs": [
    "religious",
    "esoteric",
    "underground",
  ],
  "A pilgrimage waystation that doubles as an intelligence hub": [
    "religious",
    "information",
    "logistics",
  ],
  "A charitable hospice whose basement holds restricted archives": [
    "religious",
    "medical",
    "academic",
    "clandestine",
  ],
  "A legitimate bathhouse with soundproofed rooms below street level": [
    "criminal",
    "clandestine",
    "underground",
  ],
  "A moneylender's office whose public ledgers contain a second set of books": [
    "criminal",
    "trade",
    "wealth",
  ],
  "A district of connected properties linked by sealed passages": [
    "criminal",
    "local",
    "underground",
  ],
  "A print-house running two sets of accounts": [
    "subversive",
    "information",
    "clandestine",
  ],
  "A disused chapel in a contested neighbourhood where records are rarely checked":
    ["subversive", "religious", "isolated"],
  "A network of sympathiser homes linked by a rotating code phrase": [
    "subversive",
    "cell",
    "clandestine",
  ],
  "A registered scholar's hall with warded inner chambers": [
    "academic",
    "magic",
    "research",
  ],
  "A cartographer's guild whose maps contain hidden notation systems": [
    "academic",
    "exploration",
    "information",
  ],
  "A canal barge anchored in a dock district where manifests go uninspected": [
    "maritime",
    "clandestine",
    "trade",
  ],

  // Sci-Fi / Cyberpunk / Others
  "A sealed corporate tower whose lower floors are open to the public and upper floors are not on any map":
    ["corporate", "wealth", "clandestine"],
  "A campus of linked facilities connected by private transit lines that bypass city checkpoints":
    ["corporate", "logistics", "city"],
  "A data-centre compound in a legally ambiguous special economic zone": [
    "corporate",
    "technology",
    "information",
  ],
  "A registered LLC with rotating directors and no fixed address": [
    "corporate",
    "trade",
    "clandestine",
  ],
  "A licensed private security firm that maintains offices in three jurisdictions simultaneously":
    ["military", "corporate", "lawful"],
  "A shell company whose registered seat is a post-box in a compliant offshore district":
    ["corporate", "wealth", "clandestine"],
  "A distributed mesh of rented server nodes and anonymous relay points": [
    "technology",
    "cell",
    "clandestine",
  ],
  "A legitimate ISP whose routing infrastructure doubles as a covert comms layer":
    ["technology", "information", "clandestine"],
  "Rotating physical dead-drops in public infrastructure — lockers, charging stations, transit hubs":
    ["technology", "cell", "logistics"],
  "A block of contested commercial units enforced by informal tax agreements": [
    "criminal",
    "local",
    "violence-power",
  ],
  "A series of interconnected basement spaces beneath a market district": [
    "criminal",
    "underground",
    "trade",
  ],
  "A community centre operating with city permits while the basement handles other business":
    ["criminal", "local", "protective"],
  "A sealed private estate whose deed has not changed hands in three centuries":
    ["feudal", "decadent", "wealth", "isolated"],
  "A licensed sanatorium whose patient records are never released to outside authorities":
    ["medical", "clandestine", "esoteric"],
  "A labyrinthine wine cellar beneath a respectable merchant's townhouse": [
    "feudal",
    "trade",
    "underground",
    "clandestine",
  ],
  "A fortified chapter-house adjacent to the civil courthouse": [
    "religious",
    "military",
    "lawful",
    "inquisition",
  ],
  "A mobile tribunal that establishes temporary jurisdiction wherever the investigation leads":
    ["religious", "inquisition", "administrative"],
  "A warded archive annexed to the city's oldest cathedral": [
    "religious",
    "academic",
    "esoteric",
    "magic",
  ],
  "A neutral space station positioned at a strategically contested transit point":
    ["orbital", "diplomatic", "logistics"],
  "A diplomatic compound on a contested colony world with extraterritorial status":
    ["diplomatic", "administrative", "orbital"],
  "A fleet of registered humanitarian vessels that doubles as a mobile command structure":
    ["diplomatic", "protective", "fleet"],
  "A nondescript government office building whose basement floors are not on the building plan":
    ["administrative", "clandestine", "information"],
  "A chain of legitimate consulting firms that share encrypted back-office infrastructure":
    ["administrative", "information", "corporate"],
  "An embassy annex operating under diplomatic immunity": [
    "administrative",
    "diplomatic",
    "clandestine",
  ],
  "A fortified salvage yard at the edge of a collapsed industrial zone": [
    "salvage",
    "industrial",
    "wasteland",
  ],
  "A mobile convoy that claims no fixed territory but controls key supply corridors":
    ["salvage", "logistics", "highway", "wasteland"],
  "A series of hidden caches spread across a hundred kilometres of dead highway":
    ["salvage", "highway", "isolated", "wasteland"],
  "A sealed compound built inside a pre-collapse water treatment facility": [
    "scarcity",
    "technology",
    "isolated",
    "wasteland",
  ],
  "A fortified hilltop site with sightlines across three days of travel in every direction":
    ["military", "isolated", "wasteland"],
  "A network of underground bunkers connected by service tunnels from before the collapse":
    ["underground", "survival", "isolated"],
  "A chartered Guildhall whose brass-plated doors are sealed by imperial writ":
    ["industrial", "trade", "administrative"],
  "A foundry complex whose steam vents obscure the entrances to private meeting chambers":
    ["industrial", "clandestine"],
  "A bonded patent office whose archive vaults hold the licensing papers for half the city's industry":
    ["industrial", "academic", "administrative"],
  "A mooring tower compound above the cloud line, accessible only by scheduled dirigible":
    ["fleet", "isolated", "industrial"],
  "A registered sky-dock with private bays where manifests are submitted only to consortium ledgers":
    ["fleet", "trade", "logistics"],
  "A floating platform anchored above international waters where no city ordinance applies":
    ["fleet", "isolated", "clandestine"],
  "A sealed laboratory annexe beneath the Imperial Institute of Applied Sciences":
    ["academic", "research", "technology", "clandestine"],
  "A decommissioned clocktower whose upper floors have been warded against surveillance":
    ["technology", "academic", "clandestine"],
  "A private scholarly estate whose library holds restricted aetheric formulae under charter lock":
    ["academic", "magic", "wealth"],
  "A nondescript government building whose sub-basement floors appear on no architectural plan":
    ["administrative", "clandestine", "information"],
  "A chain of post offices operating under Crown warrant with encrypted dispatch infrastructure":
    ["administrative", "logistics", "information"],
  "An embassy anteroom operating under diplomatic immunity with unrestricted cipher access":
    ["diplomatic", "clandestine", "information"],
  "A print shop running two sets of accounts behind a false boiler room wall": [
    "subversive",
    "industrial",
    "clandestine",
  ],
  "A disused engine hall in the smog district where census officers rarely venture":
    ["subversive", "industrial", "isolated"],
  "A network of tenement rooftops connected by signal lantern protocols": [
    "subversive",
    "cell",
    "information",
  ],
  "A hardened forward operating base embedded in a contested colonial settlement":
    ["military", "orbital", "logistics"],
  "A Union frigate holding geosynchronous orbit as a mobile command platform": [
    "military",
    "fleet",
    "orbital",
  ],
  "A decommissioned administrative compound repurposed under emergency Union charter":
    ["administrative", "military", "orbital"],
  "An unregistered hangar on the Long Rim operating under a shell licensing agreement":
    ["military", "salvage", "clandestine", "isolated"],
  "A salvage yard whose mech repair bays double as an unofficial tactical staging ground":
    ["salvage", "technology", "military"],
  "A mobile barge convoy that keeps no fixed port and answers no flag": [
    "fleet",
    "logistics",
    "isolated",
  ],
  "A shielded research station in a low-traffic transit corridor with restricted docking access":
    ["academic", "research", "orbital", "isolated"],
  "A distributed server architecture spread across three systems under academic charter":
    ["technology", "academic", "information"],
  "A sealed laboratory embedded within a Union university campus under dual-key access protocols":
    ["academic", "research", "technology"],
  "A network of sympathiser safe houses spread across a colonial outpost's residential district":
    ["subversive", "cell", "clandestine"],
  "A fortified position in a contested bleed zone where Union authority is ambiguous":
    ["subversive", "military", "isolated"],
  "A mobile cell structure with no fixed base and rotating comms encryption": [
    "subversive",
    "cell",
    "clandestine",
  ],
  "A legitimately registered subsidiary operating under a Union commercial licence":
    ["corporate", "trade", "administrative"],
  "A contracted security compound adjacent to a resource extraction site": [
    "corporate",
    "military",
    "industrial",
  ],
  "A private orbital platform registered to a shell entity in a non-Union jurisdiction":
    ["corporate", "orbital", "clandestine"],
  "A gleaming sector-command spire projecting force across the capital city": [
    "autocratic",
    "military",
    "administrative",
    "oppression",
  ],
  "A fortified garrison built on the ruins of the planet's previous democratic parliament":
    ["military", "autocratic", "oppression"],
  "A mobile orbital command station enforcing blockades and custom checks": [
    "military",
    "fleet",
    "orbital",
    "oppression",
  ],
  "An ancient, hidden temple carved into the cliffs of a remote desert world": [
    "religious",
    "esoteric",
    "isolated",
    "magic",
  ],
  "A meditation chamber disguised as a humble merchant's quarters": [
    "religious",
    "esoteric",
    "clandestine",
    "trade",
  ],
  "The ruins of a once-great academy now swallowed by the jungle": [
    "academic",
    "esoteric",
    "isolated",
    "salvage",
  ],
  "A crowded, lawless cantina built into a hollowed-out asteroid": [
    "criminal",
    "orbital",
    "trade",
    "isolated",
  ],
  "A modular docking bay that constantly changes configuration to confuse inspectors":
    ["criminal", "orbital", "logistics", "clandestine"],
  "A rusted freighter graveyard that hides a fully operational black market": [
    "criminal",
    "salvage",
    "orbital",
    "trade",
  ],
  "A massive dreadnought hanging ominously in the sky above the colony": [
    "military",
    "fleet",
    "orbital",
    "oppression",
  ],
  "A sprawling orbital shipyard strictly off-limits to civilian traffic": [
    "military",
    "fleet",
    "industrial",
    "orbital",
  ],
  "A blockade flotilla enforcing a quarantine over a restive system": [
    "military",
    "fleet",
    "orbital",
    "oppression",
  ],
  "A subterranean bunker beneath a bustling starport": [
    "subversive",
    "underground",
    "clandestine",
  ],
  "A repurposed deep-space communications relay hiding in plain sight": [
    "subversive",
    "technology",
    "information",
    "orbital",
  ],
  "A makeshift camp hidden within the wreckage of an old capital ship": [
    "subversive",
    "salvage",
    "orbital",
    "isolated",
  ],
  "A massive industrial processing plant where laborers toil under heavy surveillance":
    ["industrial", "oppression", "autocratic"],
  "The polished halls of a merchant consortium that dictates planetary trade laws":
    ["trade", "wealth", "oligarchic", "administrative"],
  "A tightly guarded mining colony built into the ice of a frozen moon": [
    "industrial",
    "isolated",
    "orbital",
    "scarcity",
  ],
};

export const FACTION_RESOURCE_TRAITS: TraitMap = {
  // Generic
  "Specialised knowledge or access that no other group in the region controls":
    ["information", "clandestine"],
  "A network of obligations, debts, and dependencies too entangled to cut cleanly":
    ["debt", "wealth", "information"],
  "Control of a single critical resource that everyone else needs to function":
    ["scarcity", "wealth", "trade"],

  // Pirate
  "A crew-owned vessel, shared articles, and trusted anchorages along the coast":
    ["maritime", "fleet", "logistics"],
  "Prize cargo, tide charts, and intelligence traded by dockworkers and sailors":
    ["maritime", "wealth", "information"],
  "A reputation that can open a free port or trigger a naval manhunt": [
    "maritime",
    "violence-power",
    "opportunistic",
  ],
  "Forged cargo manifests, hidden berths, and trusted contacts inside customs offices":
    ["maritime", "clandestine", "trade"],
  "Access to routes that bypass blockades and move people without exposing their identities":
    ["maritime", "logistics", "clandestine"],
  "A debt ledger binding captains, dockworkers, and merchants to mutual silence":
    ["maritime", "debt", "clandestine"],

  // Fantasy / Core
  "Exclusive trade licences, bonded debts, and letters of introduction that open every city gate":
    ["trade", "debt", "wealth", "administrative"],
  "Commodity price information days before it reaches the open market": [
    "trade",
    "information",
    "wealth",
  ],
  "Certified seals of provenance that determine what goods may legally change hands":
    ["trade", "lawful", "administrative"],
  "Compromising knowledge distributed in sealed fragments held by separate members":
    ["information", "clandestine", "secretive"],
  "A curated register of favours owed by officials, merchants, and clergy": [
    "debt",
    "information",
    "administrative",
  ],
  "Access to a network of false identities and safe-passage routes": [
    "clandestine",
    "logistics",
    "cell",
  ],
  "Contractual access to trained soldiers who ask no political questions": [
    "military",
    "violence-power",
    "pragmatic",
  ],
  "Neutral enforcement services hired by every side of every dispute": [
    "military",
    "violence-power",
    "diplomatic",
  ],
  "An archive of battlefield contracts that constitute decades of political leverage":
    ["military", "information", "administrative"],
  "Exclusive rights over burial rites, confessions, and civic oaths": [
    "religious",
    "administrative",
    "esoteric",
  ],
  "A pharmaceutical supply chain running through the charitable district": [
    "religious",
    "medical",
    "logistics",
  ],
  "Institutional immunity protecting their premises from search or seizure": [
    "religious",
    "administrative",
    "lawful",
  ],
  "Control over the city's informal credit markets and enforcement ecosystem": [
    "criminal",
    "wealth",
    "debt",
    "violence-power",
  ],
  "Detailed knowledge of every patrol route, informant, and magistrate's price":
    ["criminal", "information", "clandestine"],
  "A distribution network for restricted goods running through legitimate storefronts":
    ["criminal", "trade", "logistics"],
  "A verified printing and distribution network for prohibited materials": [
    "subversive",
    "information",
    "logistics",
  ],
  "Contacts embedded in the guard, the census office, and the merchant registry":
    ["subversive", "information", "administrative"],
  "Secure courier routes that move people, messages, and contraband past checkpoints":
    ["subversive", "logistics", "clandestine"],
  "Proprietary ritual techniques licensed to no outside practitioner": [
    "academic",
    "magic",
    "esoteric",
  ],
  "A sealed archive of magical precedents that defines what is legally permitted":
    ["academic", "magic", "administrative"],
  "Controlled access to rare components that no other supplier will touch": [
    "academic",
    "magic",
    "trade",
    "scarcity",
  ],

  // Sci-Fi / Cyberpunk / Others
  "Patent portfolios, regulatory capture, and the ability to rewrite local law through lobbying":
    ["corporate", "wealth", "administrative"],
  "A private security force larger than the city police and legally permitted to operate with fewer constraints":
    ["corporate", "military", "violence-power"],
  "Exclusive contracts with critical infrastructure — power, water, data, transit":
    ["corporate", "scarcity", "logistics", "wealth"],
  "Shell-company ownership of key residential and commercial properties across the district":
    ["corporate", "wealth", "trade"],
  "Leveraged debt held against every small business in the target sector": [
    "corporate",
    "debt",
    "wealth",
  ],
  "Proprietary logistics infrastructure that competitors cannot access without their permission":
    ["corporate", "logistics", "trade"],
  "Zero-day exploits, surveillance backdoors, and access to every networked system in the city":
    ["technology", "information", "clandestine"],
  "A distributed archive of intercepted communications from every major institution":
    ["technology", "information", "secretive"],
  "The ability to make anyone's digital identity disappear — or reappear differently":
    ["technology", "clandestine", "information"],
  "Control of informal economies: protection, distribution, and dispute resolution in three districts":
    ["criminal", "violence-power", "trade"],
  "Detailed knowledge of every surveillance blind spot, patrol schedule, and officer price":
    ["criminal", "information", "clandestine"],
  "Loyalty networks that extend into city maintenance, transit, and low-level civil service":
    ["criminal", "logistics", "administrative"],
  "Centuries of accumulated wealth, property, and blackmail material on every notable family":
    ["feudal", "wealth", "information", "decadent"],
  "The ability to alter memory, compel testimony, and move unseen through any social tier":
    ["esoteric", "blood", "clandestine", "magic"],
  "A network of thralls embedded in the city's legal, medical, and religious institutions":
    ["blood", "administrative", "medical", "religious"],
  "Legal authority to detain, interrogate, and seize assets without civil court oversight":
    ["religious", "inquisition", "administrative", "violence-power"],
  "An archive of confessions, heresies, and crimes dating back three generations":
    ["religious", "inquisition", "information"],
  "Jurisdiction that supersedes local law in matters defined — broadly — as spiritual threat":
    ["religious", "inquisition", "lawful", "administrative"],
  "Trade route licensing, customs authority, and the right to impose blockades under federation charter":
    ["diplomatic", "trade", "administrative", "fleet"],
  "A shared military asset pool that member states cannot individually match": [
    "diplomatic",
    "military",
    "fleet",
  ],
  "Diplomatic recognition that determines which colonies and stations are treated as sovereign":
    ["diplomatic", "administrative", "democratic"],
  "Surveillance infrastructure covering communications, financial transactions, and physical movement":
    ["administrative", "information", "technology"],
  "Classified leverage on every significant political, corporate, and criminal actor in the region":
    ["administrative", "information", "debt"],
  "The legal authority to classify, redact, and deny — which is effectively the power to erase events":
    ["administrative", "information", "autocratic"],
  "Access to pre-collapse technology caches and the knowledge to operate what others cannot":
    ["salvage", "technology", "survival"],
  "Control of the only reliable route through a stretch of dead territory": [
    "salvage",
    "logistics",
    "highway",
    "wasteland",
  ],
  "A repair and fabrication capability that no other group in the region can match":
    ["salvage", "technology", "industrial"],
  "Clean water, food stockpiles, and medical supplies — distributed exclusively to the faithful":
    ["scarcity", "religious", "medical", "survival"],
  "A coherent ideology that provides meaning in a world without institutions": [
    "religious",
    "fanatical",
    "survival",
  ],
  "Armed enforcers who believe completely in what they are protecting": [
    "religious",
    "fanatical",
    "violence-power",
    "military",
  ],
  "Imperial patent licences and the legal authority to shut down any non-licensed operation in the city":
    ["industrial", "administrative", "lawful"],
  "Exclusive access to aetheric components that no independent artificer can source elsewhere":
    ["industrial", "technology", "scarcity"],
  "A bonded ledger of guild debts and performance bonds that constitute leverage over every major manufacturer":
    ["industrial", "debt", "wealth"],
  "Control over the only viable air-freight routes connecting the major industrial cities":
    ["fleet", "logistics", "trade"],
  "A fleet of armed courier vessels whose cargo manifests are never opened by customs officers":
    ["fleet", "logistics", "clandestine"],
  "Exclusive mooring rights at key aetheric refuelling stations across the continent":
    ["fleet", "logistics", "wealth"],
  "Proprietary aetheric formulae that determine what weapons, engines, and medicines the Empire can produce":
    ["academic", "technology", "magic", "industrial"],
  "A sealed research archive whose contents the Imperial Ministry does not fully understand but cannot afford to lose":
    ["academic", "research", "technology", "information"],
  "Controlled access to refined aetheric ore — the fuel for every advanced engine in the known world":
    ["technology", "industrial", "scarcity", "wealth"],
  "Surveillance infrastructure covering telegram traffic, financial ledgers, and courier routes across the Empire":
    ["administrative", "information", "technology"],
  "Classified leverage on every significant guild factor, colonial administrator, and opposition figure":
    ["administrative", "information", "debt"],
  "The legal authority to classify, seal, and deny — which is effectively the power to erase inconvenient events":
    ["administrative", "information", "autocratic"],
  "A verified pamphlet and broadsheet distribution network that reaches every engine-district tenement":
    ["subversive", "information", "industrial"],
  "Contacts embedded in the factory floor, the census office, and the guild apprentice registry":
    ["subversive", "information", "industrial"],
  "Secure courier routes through the smog tunnels that move people, messages, and contraband past company checkpoints":
    ["subversive", "logistics", "clandestine", "underground"],
  "Union-backed supply chains, medical infrastructure, and legal authority that no colonial faction can legally refuse":
    ["administrative", "logistics", "medical", "democratic"],
  "Rapid deployment assets — carriers, mechs, and specialist personnel — that can be on-site within hours of authorisation":
    ["military", "violence-power", "fleet", "technology"],
  "The legal standing to classify, commandeer, and redefine the operational context of any contested situation":
    ["administrative", "military", "lawful"],
  "Unlicensed mech frames jury-rigged from salvage, running subsystems that Union doesn't officially recognise":
    ["military", "salvage", "technology"],
  "A roster of pilots with bleed tolerance above standard clearance and no intention of disclosing it":
    ["military", "violence-power", "clandestine"],
  "Supply contracts with three different factions, none of whom know about the other two":
    ["military", "trade", "clandestine", "debt"],
  "Cascaded NHP assets operating at the legal edge of Union containment protocols":
    ["technology", "esoteric", "research"],
  "Proprietary data on non-human cognition that no other institution in the sector has replicated":
    ["technology", "academic", "research"],
  "Leverage over every organisation that has ever quietly used their NHP consultation services":
    ["technology", "debt", "information"],
  "Deep roots in the local population — every safe house, every supply cache, every sympathiser is a local":
    ["subversive", "cell", "protective"],
  "Firsthand knowledge of Union administrative failures that make for devastating public documentation":
    ["subversive", "information", "administrative"],
  "Enough field-stripped and improvised hardware to make any contested zone expensive to hold":
    ["subversive", "salvage", "violence-power"],
  "Proprietary extraction technology and the contracts that legally entitle them to use it":
    ["corporate", "technology", "industrial"],
  "A Union-adjacent legal team whose job is to ensure every operation remains just inside the line":
    ["corporate", "administrative", "lawful"],
  "Leverage over the colonial administrator who approved the contract in the first place":
    ["corporate", "debt", "administrative"],
  "Absolute legal authority and the overwhelming military force required to back it up":
    ["autocratic", "military", "violence-power", "oppression"],
  "An expansive network of informants, spies, and surveillance drones": [
    "autocratic",
    "information",
    "technology",
    "clandestine",
  ],
  "Control over the planetary defense grid and all orbital traffic": [
    "autocratic",
    "military",
    "orbital",
    "oppression",
  ],
  "Ancient texts, relics, and lost techniques of an energy-manipulating discipline":
    ["religious", "magic", "esoteric", "salvage"],
  "A hidden network of sympathizers who revere the old ways": [
    "religious",
    "esoteric",
    "clandestine",
    "cell",
  ],
  "Deeply honed intuition and combat skills that defy modern weaponry": [
    "religious",
    "esoteric",
    "violence-power",
  ],
  "Secret hyper-routes and hyperdrive modifications that bypass imperial checkpoints":
    ["criminal", "logistics", "technology", "clandestine"],
  "Counterfeit clearance codes and bribed imperial customs officials": [
    "criminal",
    "administrative",
    "information",
    "clandestine",
  ],
  "A vast fleet of unregistered, heavily modified blockade runners": [
    "criminal",
    "fleet",
    "logistics",
    "salvage",
  ],
  "Capital ships capable of glassing a continent from orbit": [
    "military",
    "fleet",
    "violence-power",
    "oppression",
  ],
  "Endless waves of disciplined troopers and standardized fighter squadrons": [
    "military",
    "violence-power",
    "fleet",
  ],
  "Complete control over interstellar communications relays": [
    "military",
    "information",
    "technology",
    "oppression",
  ],
  "Stolen imperial codes, intercepted transmissions, and encrypted frequencies":
    ["subversive", "information", "technology", "clandestine"],
  "The fierce loyalty of the oppressed populace who provide safe harbor": [
    "subversive",
    "protective",
    "oppression",
  ],
  "Sabotage equipment, stolen ordnance, and a willingness to die for the cause":
    ["subversive", "violence-power", "fanatical"],
  "Exclusive control over the extraction and refinement of a rare hyper-fuel": [
    "trade",
    "industrial",
    "scarcity",
    "wealth",
  ],
  "Deep pockets and the ability to lobby or bribe imperial governors": [
    "trade",
    "wealth",
    "administrative",
    "corporate",
  ],
  "A monopoly on off-world transport for civilian goods": [
    "trade",
    "logistics",
    "wealth",
    "orbital",
  ],
};

// ---------------------------------------------------------------------------
// Rules & Affinities
// ---------------------------------------------------------------------------

/**
 * Hard constraints for factions (#2531).
 */
export const FACTION_RULES: readonly {
  trait: FactionTrait;
  requiresTraitOf?: readonly FactionTrait[];
  excludesTraitOf?: readonly FactionTrait[];
}[] = [
  // Maritime activities require coastal/island/ocean scope
  {
    trait: "maritime",
    requiresTraitOf: ["maritime", "local", "regional", "global"],
  },
];

/**
 * Soft affinities for standard factions.
 */
export const FACTION_AFFINITIES: readonly {
  when: FactionTrait;
  favour: FactionTrait;
  multiplier: number;
}[] = [
  // Faction type shaping alignment
  { when: "trade", favour: "pragmatic", multiplier: 2.5 },
  { when: "trade", favour: "wealth", multiplier: 2.5 },
  { when: "military", favour: "violence-power", multiplier: 2.5 },
  { when: "military", favour: "lawful", multiplier: 1.5 },
  { when: "religious", favour: "fanatical", multiplier: 2.5 },
  { when: "religious", favour: "protective", multiplier: 1.5 },
  { when: "criminal", favour: "ruthless", multiplier: 2 },
  { when: "criminal", favour: "opportunistic", multiplier: 2 },
  { when: "academic", favour: "academic", multiplier: 2.5 },
  { when: "research", favour: "information", multiplier: 2 },
  { when: "subversive", favour: "idealistic", multiplier: 2 },
  { when: "subversive", favour: "rebellious", multiplier: 2.5 },
  { when: "corporate", favour: "wealth", multiplier: 2.5 },
  { when: "corporate", favour: "pragmatic", multiplier: 2 },
  { when: "feudal", favour: "feudal", multiplier: 2 },
  { when: "feudal", favour: "wealth", multiplier: 1.5 },
  { when: "clandestine", favour: "secretive", multiplier: 2.5 },
  { when: "clandestine", favour: "information", multiplier: 2 },

  // Goal affinities based on type and alignment
  { when: "pragmatic", favour: "wealth", multiplier: 1.8 },
  { when: "ruthless", favour: "rivalry", multiplier: 1.8 },
  { when: "idealistic", favour: "protective", multiplier: 2 },
  { when: "fanatical", favour: "esoteric", multiplier: 2 },
  { when: "rebellious", favour: "subversive", multiplier: 2 },
  { when: "maritime", favour: "maritime", multiplier: 2.5 },
  { when: "salvage", favour: "salvage", multiplier: 2 },
  { when: "technology", favour: "technology", multiplier: 2 },

  // Conflict affinities
  { when: "corporate", favour: "oppression", multiplier: 2 },
  { when: "corporate", favour: "exposure", multiplier: 1.8 },
  { when: "criminal", favour: "law-enforcement", multiplier: 2 },
  { when: "criminal", favour: "rivalry", multiplier: 1.8 },
  { when: "subversive", favour: "betrayal", multiplier: 2 },
  { when: "feudal", favour: "succession", multiplier: 2.5 },
  { when: "trade", favour: "debt", multiplier: 2 },
  { when: "clandestine", favour: "exposure", multiplier: 2 },
];

/**
 * Soft affinities for Nomad Clans.
 */
export const NOMAD_CLAN_AFFINITIES: readonly {
  when: FactionTrait;
  favour: FactionTrait;
  multiplier: number;
}[] = [
  { when: "protective", favour: "protective", multiplier: 2.5 },
  { when: "salvage", favour: "technology", multiplier: 2 },
  { when: "salvage", favour: "salvage", multiplier: 2.5 },
  { when: "trade", favour: "wealth", multiplier: 2 },
  { when: "criminal", favour: "rivalry", multiplier: 2 },
  { when: "rebellious", favour: "corporate", multiplier: 2 },
  { when: "technology", favour: "technology", multiplier: 2 },
  { when: "highway", favour: "highway", multiplier: 2 },
  { when: "survival", favour: "scarcity", multiplier: 2 },
  { when: "tribal", favour: "tribal", multiplier: 2 },
];

/**
 * Soft affinities for Vampire Clans.
 */
export const VAMPIRE_AFFINITIES: readonly {
  when: FactionTrait;
  favour: FactionTrait;
  multiplier: number;
}[] = [
  { when: "feudal", favour: "feudal", multiplier: 2.5 },
  { when: "feudal", favour: "wealth", multiplier: 2 },
  { when: "feudal", favour: "decadent", multiplier: 2 },
  { when: "coven", favour: "coven", multiplier: 2.5 },
  { when: "coven", favour: "magic", multiplier: 2 },
  { when: "coven", favour: "esoteric", multiplier: 2 },
  { when: "feral", favour: "feral", multiplier: 3 },
  { when: "feral", favour: "predatory", multiplier: 2.5 },
  { when: "feral", favour: "isolated", multiplier: 2 },
  { when: "syndicate", favour: "trade", multiplier: 2.5 },
  { when: "syndicate", favour: "wealth", multiplier: 2 },
  { when: "rebellious", favour: "rebellious", multiplier: 3 },
  { when: "rebellious", favour: "subversive", multiplier: 2 },
  { when: "decadent", favour: "oligarchic", multiplier: 2 },
  { when: "predatory", favour: "predatory", multiplier: 2 },
  { when: "inquisition", favour: "inquisition", multiplier: 2 },
  { when: "exposure", favour: "exposure", multiplier: 2 },
];
