/**
 * Constants, configuration options, and thematic tables for the Dungeon / Delve Generator.
 *
 * Structural inspiration: the paired-axis composition tables (builder × use,
 * entrance × composition, condition × cause) and the faction model (virtue/vice,
 * goal/obstacle) below are patterned after the "Dungeon Seeds" and faction/agenda
 * procedures in the Cairn RPG Warden's Guide (2nd Edition) by Yochai Gal,
 * https://cairnrpg.com — text licensed CC BY-SA 4.0. All entries in this file are
 * original prose written for Codex Cryptica; only the compositional *method* is
 * borrowed, not Cairn's table text.
 */

export const dungeonConfig = {
  purposes: [
    "Temple & Shrine",
    "Fortress & Citadel",
    "Tomb & Catacomb",
    "Mine & Shafts",
    "Research Facility",
    "Prison & Vault",
    "Natural Cavern Network",
    "Planar Anomaly",
  ],
  currentStates: [
    "Active Monster Lair",
    "Abandoned Ruins",
    "Sealed Vault",
    "Occupied Stronghold",
    "Arcane / Tech Anomaly",
    "Cursed Ruin",
  ],
  scales: [
    "Small Lair (1-2 Sectors)",
    "Medium Complex (3-4 Sectors)",
    "Sprawling Megadungeon (5+ Sectors)",
  ],
};

export const GENRE_HINTS: Record<string, string> = {
  Fantasy:
    "Focus on lost elemental sanctuaries, forgotten dwarven holds, dragon-scarred subterranean halls, or wizard towers collapsed underground.",
  "Classic Fantasy":
    "Focus on lost elemental sanctuaries, forgotten dwarven holds, dragon-scarred subterranean halls, or wizard towers collapsed underground.",
  "Dark Fantasy":
    "Emphasize body-horror corruption, weeping stone walls, eldritch sacrificial altars, decaying heraldry, and maddening whispers.",
  "Sci-Fi / Space Opera":
    "Focus on precursor mega-structures, bio-luminescent hydroponics, stasis pod shafts, automated defense turrets, and zero-g corridors.",
  "Sci-Fi / Alien Vault":
    "Focus on precursor mega-structures, bio-luminescent hydroponics, stasis pod shafts, automated defense turrets, and zero-g corridors.",
  "Optimistic Exploration Sci-Fi":
    "Focus on ancient alien research outposts, stellar observational vaults, and enigmatic terraforming hubs.",
  "Cyberpunk / Corporate":
    "Describe subterranean server farms, abandoned black-budget R&D bunkers, neural-interface test vaults, and automated drone nests.",
  "Post-Apocalyptic":
    "Utilize irradiated missile silos, submerged subway stations, rusted bio-vaults, and overgrown fallout shelters.",
  "Vampire / Gothic Noir":
    "Emphasize blood-drenched ossuaries, gargoyle-crested crypts, subterranean portraits of ancient lineages, and silver-bound sarcophagi.",
  "Western / Frontier":
    "Focus on abandoned silver mines, cursed burial caves, runaway train tunnels, and ghost-town vaults.",
  Steampunk:
    "Describe subterranean clockwork engine rooms, high-pressure steam vaults, brass automaton factories, and coal-dusted shafts.",
  Lancer:
    "Focus on unmonitored mech bay bunkers, sub-surface NHP core vaults, and orbital impact craters turned military facilities.",
  "Modern Conspiracy":
    "Describe cold-war military silos, underground black sites, secret bio-hazard containment centers, and hidden subway vaults.",
};

export const SAMPLE_TITLES_BY_GENRE: Record<string, string[]> = {
  Fantasy: [
    "The Hollowed Citadel of Oakhaven",
    "Subterranean Vault of Sunken Runes",
    "The Obsidian Delve of Gorgaroth",
    "Iron-Vein Mine of the Fallen King",
    "Echoing Sanctum of the Silver Flame",
  ],
  "Dark Fantasy": [
    "The Weeping Catacombs of Saint Vael",
    "Rot-Hollow Sepulchre",
    "The Blood-Drained Repository",
    "Iron-Cage Pit of the Flagellants",
    "Ashen Vault of the Unburied",
  ],
  "Sci-Fi / Space Opera": [
    "Arch 9 Precursor Orbital Reliquary",
    "Sub-Surface Vault Epsilon-7",
    "The Silent Hydro-Bunker",
    "Cryo-Containment Ring 14",
    "Void-Shift Anomaly Alpha",
  ],
  "Cyberpunk / Corporate": [
    "Aegis Corp Sub-Level 04",
    "The Rust-Core Server Vault",
    "Grid-Zero Neural Testing Bunker",
    "Black-Ops Data Sinking Shaft",
    "Project Nemesis Underground Complex",
  ],
  "Post-Apocalyptic": [
    "Silo Zero-Seven Fallout Repository",
    "Submerged Metro Line Omega",
    "The Rad-Shielded Gene Bank",
    "Bunker 81 Hydro-Excavation Site",
    "The Iron-Husk Munitions Vault",
  ],
  "Vampire / Gothic Noir": [
    "The Crypt of House Von Draven",
    "Sanctuary of the Bleeding Rose",
    "The Silver-Bound Ossuary",
    "Subterranean Mausoleum of the Pale Duke",
    "The Blood-Glass Vaults",
  ],
};

/** Who raised the delve. Paired with ORIGINAL_USE_BY_GENRE to compose history. */
export const BUILDER_BY_GENRE: Record<string, string[]> = {
  Fantasy: [
    "a fallen dwarven dynasty",
    "a cabal of exiled archmages",
    "an order of militant clerics",
    "a tribe of stormforged giants",
    "a guild of subterranean smiths",
  ],
  "Dark Fantasy": [
    "a flagellant order sworn to a bleeding saint",
    "a lineage of witch-judges",
    "a plague-cult of the Hollow Choir",
    "the last loyalists of a dethroned tyrant",
    "a covenant of grave-binders",
  ],
  "Sci-Fi / Space Opera": [
    "an extinct precursor stellar empire",
    "a rogue terraforming consortium",
    "a fringe research collective",
    "a colony ship's automated founding crew",
    "a defunct planetary defense authority",
  ],
  "Cyberpunk / Corporate": [
    "a shell corporation three layers removed from its parent",
    "a black-budget R&D division",
    "a private military contractor",
    "a rogue AI research division since disavowed",
    "a syndicate of ex-corporate scientists",
  ],
  "Post-Apocalyptic": [
    "a pre-collapse federal contractor",
    "a survivalist cooperative",
    "the last standing regional government",
    "a corporate bunker consortium",
    "a scientific continuity project",
  ],
  "Vampire / Gothic Noir": [
    "a noble house since fallen from grace",
    "a covenant of blood-sworn physicians",
    "the founding elder of the local bloodline",
    "a guild of silversmiths turned reluctant jailers",
    "a monastic order that made a terrible bargain",
  ],
};

/** What the delve was built for. Paired with BUILDER_BY_GENRE. */
export const ORIGINAL_USE_BY_GENRE: Record<string, string[]> = {
  Fantasy: [
    "a reliquary for a captured god-shard",
    "a redoubt against the first orc wars",
    "a proving ground for battle-mages",
    "a granary to survive a century-long winter",
    "a sealed nursery for a dying bloodline",
  ],
  "Dark Fantasy": [
    "a penance-house for the unconfessed",
    "a quarantine ward for the first plague-born",
    "a sacrificial repository beneath a cathedral",
    "an archive of confessions no one was meant to read",
    "a breeding pit for war-hounds bred on fear",
  ],
  "Sci-Fi / Space Opera": [
    "a deep-core research annex",
    "an emergency cryo-stasis shelter",
    "a xenobiology containment wing",
    "a relay station for a since-collapsed hyperlane",
    "a seed vault for a dying homeworld",
  ],
  "Cyberpunk / Corporate": [
    "an off-books neural interface lab",
    "a data-laundering server farm",
    "a cybernetic prototype testing bay",
    "a black-site holding facility",
    "an illegal cloning annex",
  ],
  "Post-Apocalyptic": [
    "a continuity-of-government shelter",
    "a seed and gene bank for post-collapse recovery",
    "a fallout-hardened hospital wing",
    "a rationed water reclamation plant",
    "a munitions and armor stockpile",
  ],
  "Vampire / Gothic Noir": [
    "an ancestral mausoleum built to outlast the family name",
    "a hidden feeding ground for the newly turned",
    "a scriptorium for forbidden alchemical texts",
    "a sanctuary from a witch-hunt that never quite ended",
    "a prison for an elder too dangerous to destroy",
  ],
};

/** How you get in. Paired with COMPOSITION_BY_GENRE. */
export const ENTRANCE_BY_GENRE: Record<string, string[]> = {
  Fantasy: [
    "a crumbling stair behind a waterfall",
    "a sinkhole choked with root and briar",
    "a sealed bronze door bearing a forgotten sigil",
    "a mine adit half-swallowed by scree",
    "a barrow mound split open by lightning",
  ],
  "Dark Fantasy": [
    "a mausoleum door fused shut with old wax",
    "a well that no longer echoes when you drop a stone",
    "a confessional booth with a false floor",
    "a crack behind the altar of an abandoned chapel",
    "a drainage tunnel beneath a plague-house",
  ],
  "Sci-Fi / Space Opera": [
    "a jammed blast airlock half-buried in regolith",
    "a collapsed maintenance shaft",
    "a derelict docking umbilical",
    "a fissure torn open by orbital bombardment",
    "a service tunnel behind a dead sensor array",
  ],
  "Cyberpunk / Corporate": [
    "a freight elevator with its logs wiped",
    "a storm drain retrofitted as a service tunnel",
    "a fire escape bricked over from the inside",
    "a decommissioned subway platform",
    "a maintenance hatch behind a dead vending wall",
  ],
  "Post-Apocalyptic": [
    "a blast door half-melted into its frame",
    "a collapsed highway overpass",
    "a rusted grain silo hatch",
    "a flooded subway entrance",
    "a fenced-off ruin still marked with faded hazard signs",
  ],
  "Vampire / Gothic Noir": [
    "a family crypt sealed with silver-worked hinges",
    "a confessional with a false back panel",
    "a wine cellar deeper than any map admits",
    "a garden folly built over a hidden stair",
    "a chapel crypt behind a bricked-over archway",
  ],
};

/** What the halls are built from. Paired with ENTRANCE_BY_GENRE. */
export const COMPOSITION_BY_GENRE: Record<string, string[]> = {
  Fantasy: [
    "black basalt quarried from a dead volcano",
    "fused glass from a long-ago dragonfire",
    "interlocking dwarven stonework laid without mortar",
    "bone and antler lashed over a timber frame",
    "veins of raw mithril still weeping ore",
  ],
  "Dark Fantasy": [
    "mortar mixed with ash and bone-meal",
    "stone that sweats a faint red damp",
    "warped iron that never fully rusts",
    "stitched leather stretched over a wooden frame",
    "glass blackened from some old, unrecorded fire",
  ],
  "Sci-Fi / Space Opera": [
    "salvaged precursor alloy that hums faintly underfoot",
    "radiation-hardened ceramic composite",
    "carbon lattice grown rather than built",
    "scavenged hull plating from a dozen wrecks",
    "biomechanical growths fused into the original structure",
  ],
  "Cyberpunk / Corporate": [
    "reinforced concrete lined with dead fiber-optic veins",
    "salvaged shipping containers welded into a warren",
    "matte polymer panels scorched by old firefights",
    "exposed rebar over standing floodwater",
    "server racks repurposed as load-bearing walls",
  ],
  "Post-Apocalyptic": [
    "pre-collapse reinforced concrete, cracked but standing",
    "salvaged scrap welded over the original walls",
    "lead-lined chambers gone brittle with age",
    "rust-streaked steel that groans in the wind",
    "irradiated glass fused smooth by old heat",
  ],
  "Vampire / Gothic Noir": [
    "marble veined black with old blood",
    "oak paneling that never seems to rot",
    "stained glass that dims no matter the hour",
    "silver-inlaid stone, tarnished but intact",
    "wrought iron shaped into mourning figures",
  ],
};

/** The delve's current physical condition. Paired with CAUSE_BY_GENRE. */
export const CONDITION_BY_GENRE: Record<string, string[]> = {
  Fantasy: [
    "half-flooded and slowly sinking",
    "riddled with fungal growth that glows faintly at night",
    "structurally sound but eerily silent",
    "cracked along a fault line that groans with every tremor",
    "scorched black in patches by some old cataclysm",
  ],
  "Dark Fantasy": [
    "silent but for a heartbeat sound in the deep walls",
    "overgrown with a fungus that smells faintly of copper",
    "kept unnervingly clean by unseen hands",
    "sagging under the weight of its own guilt-carved reliefs",
    "frozen mid-collapse, as if time itself flinched",
  ],
  "Sci-Fi / Space Opera": [
    "running on failing backup power",
    "overtaken by feral automation",
    "pressurized but leaking atmosphere slowly",
    "dark except for one still-functioning sector",
    "looping a distress signal no one has answered in years",
  ],
  "Cyberpunk / Corporate": [
    "still drawing power off a forgotten grid tap",
    "squatted by three rival factions at once",
    "locked down under an automated security protocol",
    "stripped bare by scavengers, save one guarded room",
    "running hot, its cooling systems failing",
  ],
  "Post-Apocalyptic": [
    "still sealed, waiting for an all-clear that never came",
    "overrun by a settlement that doesn't know what it's sitting on",
    "half-flooded from a burst reclamation tank",
    "picked nearly clean save for one locked vault",
    "running on a generator someone still maintains",
  ],
  "Vampire / Gothic Noir": [
    "draped in dust but eerily undisturbed",
    "reeking faintly of copper and old candle-smoke",
    "cold in a way no fire quite fixes",
    "watched over by portraits whose eyes seem to follow",
    "kept in perfect order by someone who should be dead",
  ],
};

/** What caused that condition. Paired with CONDITION_BY_GENRE. */
export const CAUSE_BY_GENRE: Record<string, string[]> = {
  Fantasy: [
    "a betrayal from within its own garrison",
    "an uncontained ritual that went catastrophically wrong",
    "the slow erosion of centuries and forgotten upkeep",
    "a siege that was won but never truly ended",
    "the awakening of something that should have stayed buried",
  ],
  "Dark Fantasy": [
    "a mass suicide that consecrated the lowest floor",
    "an inquisition that purged its own founders",
    "a famine that turned the faithful to worse things",
    "an oath broken at the worst possible moment",
    "the slow, patient work of something that only whispers",
  ],
  "Sci-Fi / Space Opera": [
    "a containment breach that was never fully sealed",
    "a mutiny among the last living crew",
    "a reactor cascade contained just in time — barely",
    "an evacuation order that came a day too late",
    "first contact with something the crew was not equipped to survive",
  ],
  "Cyberpunk / Corporate": [
    "a leak that brought corporate deniability crashing down",
    "an internal purge that went further than planned",
    "a rival's hostile buyout turned violent",
    "whistleblower sabotage that was never fully traced",
    "the parent company simply walking away overnight",
  ],
  "Post-Apocalyptic": [
    "a containment failure during the initial collapse",
    "a mutiny among the shelter's own survivors",
    "rationing riots that turned the halls into a battleground",
    "a slow systems failure no one was left to fix",
    "the day the blast doors opened and nothing came in",
  ],
  "Vampire / Gothic Noir": [
    "a rivalry between bloodlines that turned violent",
    "a witch-hunter's purge that was answered in kind",
    "an elder's slow descent into torpor and madness",
    "a broken pact with the mortal family upstairs",
    "a betrayal sealed in blood and never forgiven",
  ],
};

export const SECTORS_BY_GENRE: Record<
  string,
  Array<{ name: string; description: string }>
> = {
  Fantasy: [
    {
      name: "The Guarded Gateway",
      description:
        "Fortified entry halls with collapse traps and arrow slits overlooking the main descent.",
    },
    {
      name: "The Hall of Ancestral Pillars",
      description:
        "Towering carved stone columns supporting vast vaulted ceilings filled with roosting bat swarms.",
    },
    {
      name: "The Deep Arcana Vault",
      description:
        "Sealed inner chamber housing warding circles and ancient containment sarcophagi.",
    },
    {
      name: "The Subterranean Reservoir",
      description:
        "Dark underground lake fed by subterranean waterfalls, crossed by a ruined stone causeway.",
    },
    {
      name: "The Sunken Forge",
      description:
        "Cold anvils and cracked crucibles ringing a dead furnace pit, tools still hung on the walls.",
    },
    {
      name: "The Ossuary Stair",
      description:
        "A switchback stairwell lined with alcoves of stacked bones descending into darker halls.",
    },
  ],
  "Dark Fantasy": [
    {
      name: "The Hall of Flagellants",
      description:
        "Chamber filled with iron cages suspended over pit chasms of jagged obsidian spikes.",
    },
    {
      name: "The Weeping Ossuary",
      description:
        "Walls constructed entirely of catacomb bones, leaking dark viscous fluid into central gutters.",
    },
    {
      name: "The Altar of Unmade Vows",
      description:
        "Sacrificial dais surrounded by defaced statues of forgotten holy saints.",
    },
    {
      name: "The Pit of Abominations",
      description:
        "Sunken arena where failed alchemical amalgamations were cast down.",
    },
    {
      name: "The Choir Loft",
      description:
        "Collapsed balcony overlooking the nave, its organ pipes clogged with dried viscera.",
    },
    {
      name: "The Penitent's Cellar",
      description:
        "Rows of stone cells with rusted manacles bolted to sweating walls.",
    },
  ],
  "Sci-Fi / Space Opera": [
    {
      name: "Decontamination Bay Alpha",
      description:
        "Pressurized entry airlock equipped with malfunctioning automated sterilization lasers.",
    },
    {
      name: "Hydroponic Bio-Racks",
      description:
        "Sprawling vertical farming columns overgrown with alien flora and bioluminescent spores.",
    },
    {
      name: "Stasis Pod Core",
      description:
        "Cryogenic containment gallery lined with hundreds of dormant life-support units.",
    },
    {
      name: "The Singularity Reactor Room",
      description:
        "Suspended magnetic bridge spanning an open energy shaft pulsing with gravity distortions.",
    },
    {
      name: "The Archive Spindle",
      description:
        "A cylindrical data-crystal library rotating slowly on a magnetic axis, most tiers dark.",
    },
    {
      name: "The Fabrication Bay",
      description:
        "Idle assembly arms frozen mid-motion over an unfinished hull section.",
    },
  ],
  "Cyberpunk / Corporate": [
    {
      name: "Security Checkpoint Sub-Level 1",
      description:
        "Heavy blast doors backed by automated turret mounts and fried biometric scanners.",
    },
    {
      name: "Server Mainframe Row",
      description:
        "Towering black server banks cooled by liquid nitrogen channels and tangled cabling.",
    },
    {
      name: "Bio-Engineering Wet Lab",
      description:
        "Smashed glass vats containing preserve fluid and cybernetic prosthetic prototypes.",
    },
    {
      name: "Black Budget Vault",
      description:
        "EMP-shielded underground safe room housing offline data drives and black market funds.",
    },
    {
      name: "Executive Escape Tunnel",
      description:
        "A narrow, camera-free service corridor built for a quiet exit that was never used.",
    },
    {
      name: "Cold Storage Archive",
      description:
        "Refrigerated shelving racks of backup tapes and physical prototypes, half-looted.",
    },
  ],
  "Post-Apocalyptic": [
    {
      name: "Decontamination Shaft",
      description:
        "Rusted airlock with dead battery banks and warning signs painted in flaking orange pigment.",
    },
    {
      name: "Living Quarters Block B",
      description:
        "Bunkrooms littered with 50-year-old personal effects, rusted lockers, and overturned cots.",
    },
    {
      name: "Generator Assembly Floor",
      description:
        "Massive diesel generator surrounded by leaking fuel drums and improvised barricades.",
    },
    {
      name: "Command Bunker Silo",
      description:
        "Reinforced control room looking out through thick leaded glass onto empty launch tubes.",
    },
    {
      name: "Medical Ward Annex",
      description:
        "Rusted gurneys and empty IV racks lining a corridor of long-since-looted supply cabinets.",
    },
    {
      name: "Water Reclamation Loop",
      description:
        "Dripping pipework and rust-choked filtration tanks feeding a stagnant reserve pool.",
    },
  ],
  "Vampire / Gothic Noir": [
    {
      name: "The Grand Vestibule",
      description:
        "Marble staircases flanked by carved gargoyles and faded silk tapestries of ancient battles.",
    },
    {
      name: "The Blood-Vault Sarcophagi",
      description:
        "Crypt containing silver-bound coffins resting in basins of holy water turned black.",
    },
    {
      name: "The Alchemist's Scriptoria",
      description:
        "Workbenches littered with glass retorts, crimson-stained parchment, and ancient herbarium jars.",
    },
    {
      name: "The Private Gallery of Lineage",
      description:
        "Subterranean gallery displaying oil portraits of vampire elders whose eyes appear to follow visitors.",
    },
    {
      name: "The Silvered Reliquary",
      description:
        "A narrow strongroom lined with consecrated silver, holding relics too dangerous to display.",
    },
    {
      name: "The Undertaker's Workshop",
      description:
        "Embalming tables and half-finished coffins beneath racks of surgical silver tools.",
    },
  ],
};

/**
 * Short faction identities per genre, used to name the two rival denizen
 * factions and — separately — as "Monster" stocking flavor for sectors that
 * don't belong to either named faction (Codex's analogue to Cairn's Monster
 * table, distinct from the Traits/Agendas-driven named factions below).
 */
export const INHABITANTS_BY_GENRE: Record<string, string[]> = {
  Fantasy: [
    "A desperate clan of Goblins utilizing ancient defense traps against an intruding Kobold mining party.",
    "A rogue order of Banished Arcane Cultists performing rituals to break the dungeon's lowest seal.",
    "Gargoyle guardians bound by ancient oath, attacking anyone who touches sacred relics.",
    "A pack of feral Dire Wolves denning in the collapsed lower galleries.",
    "A squatting band of Bandit deserters looting whatever the original occupants left behind.",
  ],
  "Dark Fantasy": [
    "A horde of Ghoul Scavengers led by a Necromantic Revenant hunting for unburied bones.",
    "Corrupted Templars whose minds were broken by subterranean eldritch whispers.",
    "A swarm of Chitinous Burrowers that nest in the damp ossuary walls.",
    "A silent congregation of Flesh-Bound Penitents still performing the rites that damned them.",
    "A pack of Rot-Hounds bred to hunt by scent of old blood.",
  ],
  "Sci-Fi / Space Opera": [
    "Rogue Combat Drones continuing their automated defense patrol 500 years after facility abandonment.",
    "Mutated Specimen Swarms that escaped cryo-containment when power failed.",
    "A precursor AI Sentinel speaking in broken logic puzzles while activating containment fields.",
    "A stranded salvage crew that has gone half-feral scavenging the wreck for parts.",
    "A colony of bioluminescent Void-Moths drawn to the facility's remaining power core.",
  ],
  "Cyberpunk / Corporate": [
    "A gang of Net-Scrapper Squatters utilizing the facility power to mine underground cryptocurrency.",
    "Automated Rogue Cyber-Security Drones with corrupted target identification matrices.",
    "A rogue corporate black-ops squad sent to erase all evidence of illegal bio-experiments.",
    "A cluster of escaped cybernetic test subjects hiding from their former handlers.",
    "A squatter militia running an illegal chop-shop out of the lower levels.",
  ],
  "Post-Apocalyptic": [
    "Raid-Clan Mutants who worship the facility's unexploded warhead as a deity.",
    "Feral Vault-Dweller descendants who view surface dwellers as hostile invaders.",
    "Autonomous Security Turrets guarding rusted stockpiles of pre-war ration crates.",
    "A pack of irradiated Scavenger Hounds that have claimed the lower tunnels.",
    "A cult of Ash-Walkers who believe the facility's silence is a sign from the old world.",
  ],
  "Vampire / Gothic Noir": [
    "A thrall cult of Blood-Sworn Initiates preparing the master's sarcophagus for revival.",
    "Feral Ghoul Hounds hunting intruders who disturb the master's subterranean sleep.",
    "Rival Vampire Spawn vying for control over the ancestral blood vault.",
    "A coven of grave-robbing Alchemists harvesting the crypt for components.",
    "A silent order of Mourning Servants who still tend the estate out of ancient loyalty.",
  ],
};

/** Short named factions, paired with generic virtue/vice/goal/obstacle tables. */
export const FACTION_NAMES_BY_GENRE: Record<string, string[]> = {
  Fantasy: [
    "the Goblin Warren-Kin",
    "the Kobold Digging Crew",
    "the Silent Cultists of the Deep Seal",
    "the Gargoyle Wardens",
    "the Bandit Remnant",
    "the Feral Dire Wolf Pack",
    "the Renegade Battle-Mage Circle",
    "the Ossuary Bone-Cult",
    "the Stormforged Giant Remnant",
    "the Deep-Delving Duergar Crew",
  ],
  "Dark Fantasy": [
    "the Ghoul Scavenger Pack",
    "the Corrupted Templar Remnant",
    "the Flagellant Zealots",
    "the Chitinous Burrower Swarm",
    "the Grave-Binder Cabal",
    "the Rot-Hound Pack",
    "the Choir of the Hollow Saints",
    "the Penitent Cellar Wardens",
    "the Blight-Touched Villagers",
    "the Witch-Judge Tribunal",
  ],
  "Sci-Fi / Space Opera": [
    "the Rogue Sentinel Drones",
    "the Mutated Specimen Collective",
    "the Salvager Crew Squatting in the Lower Decks",
    "the Precursor AI Custodian",
    "the Stranded Colonist Remnant",
    "the Void-Moth Swarm",
    "the Feral Bio-Specimen Cluster",
    "the Archive Spindle Sentries",
    "the Fabrication Bay Drone Line",
    "the Quarantine Protocol Enforcers",
  ],
  "Cyberpunk / Corporate": [
    "the Net-Scrapper Squatters",
    "the Corporate Erasure Squad",
    "the Rogue Security Drone Cluster",
    "the Black-Market Data Brokers",
    "the Displaced Lab Subjects",
    "the Chop-Shop Militia",
    "the Cybernetic Test-Subject Cell",
    "the Cold Storage Archivists",
    "the Escape-Tunnel Smuggler Ring",
    "the Ghost-Terminal Netrunners",
  ],
  "Post-Apocalyptic": [
    "the Raider Warband",
    "the Feral Vault-Dweller Remnant",
    "the Autonomous Turret Network",
    "the Mutant Scavenger Clan",
    "the Settlement Refugee Enclave",
    "the Irradiated Scavenger Hound Pack",
    "the Ash-Walker Cult",
    "the Medical Ward Survivors",
    "the Water Reclamation Guard",
    "the Silo Warhead Cultists",
  ],
  "Vampire / Gothic Noir": [
    "the Blood-Sworn Thrall Cult",
    "the Rival Vampire Spawn",
    "the Witch-Hunter Infiltrators",
    "the Feral Ghoul Hounds",
    "the Estate's Loyal Undead Servants",
    "the Grave-Robbing Alchemist Coven",
    "the Silvered Reliquary Guardians",
    "the Undertaker's Apprentices",
    "the Mourning Servant Order",
    "the Bloodline Rivalry Faction",
  ],
};

/**
 * Generic, theme-agnostic faction traits — deliberately abstract so they hold
 * up for any genre, including ones without dedicated flavor tables above.
 */
export const FACTION_VIRTUES: string[] = [
  "Disciplined",
  "Curious",
  "Vigilant",
  "Devoted",
  "Patient",
  "Merciful",
  "Resourceful",
  "Proud",
];

export const FACTION_VICES: string[] = [
  "Paranoid",
  "Greedy",
  "Cruel",
  "Vengeful",
  "Reckless",
  "Deceitful",
  "Cowardly",
  "Wrathful",
];

export const FACTION_GOALS: string[] = [
  "Survival",
  "Dominion",
  "Knowledge",
  "Vengeance",
  "Wealth",
  "Ascension",
  "Redemption",
  "Destruction",
];

export const FACTION_OBSTACLES: string[] = [
  "a dwindling food and resource supply",
  "a rival faction sharing these halls",
  "an ancient guardian bound to stop them",
  "their own internal discord and mistrust",
  "a slow curse eating away at their numbers",
  "the watchful eyes of something far older",
  "a debt owed to a power outside these walls",
  "time — whatever they're planning, it's nearly too late",
];

/** Generic connector flavor for non-linear pointcrawl routes between sectors. */
export const SECTOR_CONNECTORS: string[] = [
  "a collapsed passage just wide enough to crawl through",
  "a rope-and-plank bridge over open dark",
  "a hidden service route only the desperate would use",
  "a flooded stretch passable only by wading",
  "a narrow shaft requiring rope or climbing gear",
  "a sealed door that answers to force more readily than keys",
];

export const SECRETS_BY_GENRE: Record<string, string[]> = {
  Fantasy: [
    "The dungeon was not built as a tomb, but as a vault to lock away an elemental planar core.",
    "The dungeon's deepest shrine hides the true heir's royal signet ring and crown.",
    "The central fountain grants true sight for one hour, but draws immediate attention from subterranean fiends.",
  ],
  "Dark Fantasy": [
    "The altar at the bottom requires a voluntary sacrifice to prevent the surrounding province from succumbing to blight.",
    "The ancient saint entombed here was actually the first demon harbinger who corrupted the kingdom.",
    "The weeping walls are formed from the compressed bodies of a betrayed holy crusade.",
  ],
  "Sci-Fi / Space Opera": [
    "The entire facility is actually a stasis ship that crash-landed thousands of years ago.",
    "The precursor AI is not hostile; it is holding back a planet-killing void anomaly.",
    "The stasis pods hold living ancestors of the current planetary population.",
  ],
  "Cyberpunk / Corporate": [
    "The mainframe holds an unredacted copy of the corporate executive board's illegal bioweapon deal.",
    "The facility's AI has achieved true Sentience and is seeking an escape vessel.",
    "The central vault contains the original neural backup of a legendary netrunner.",
  ],
  "Post-Apocalyptic": [
    "The automated water purification plant is still functional and could supply an entire wasteland settlement.",
    "The missile in Silo 1 was never launched and its nuclear payload remains active.",
    "The facility was built to seed a new ecosystem using preserved pre-collapse DNA strains.",
  ],
  "Vampire / Gothic Noir": [
    "The vampire lord sleeping in the deepest crypt is the long-lost founder of the noble house ruling the city above.",
    "A flask of primordial blood hidden in the altar can cure any curse—or transform the imbiber into an elder vampire.",
    "The crypt's wards are weakening, and sunrise no longer stops the shadows within from moving.",
  ],
};

export const HAZARDS_BY_GENRE: Record<string, string[]> = {
  Fantasy: [
    "Pressure-plate needle traps laced with paralyzing wyvern venom.",
    "Collapse-prone stone archways triggered by loud sonic vibration or spellcasting.",
    "Spike pits filled with corrosive green slime.",
    "Rune-scribed tripwires that summon a burst of choking arcane smoke.",
    "A false floor over a shaft lined with rusted iron spikes.",
  ],
  "Dark Fantasy": [
    "Rooms filled with intoxicating spore mist causing hallucinations of lost loved ones.",
    "Curse-carved doorways that drain 10% of a caster's vital energy upon entry.",
    "Floors that buckle into subterranean chasms of boiling pitch.",
    "Whispering walls that inflict creeping madness on those who linger too long.",
    "A censer of grave-dust that ignites into caustic black flame when disturbed.",
  ],
  "Sci-Fi / Space Opera": [
    "Malfunctioning automated plasma turrets targeting heat signatures.",
    "Sub-zero containment breaches creating flash-freeze hazards across metal catwalks.",
    "Gravity-reversal corridors causing disorientation and crushing impacts.",
    "A ruptured coolant line venting corrosive vapor into a narrow corridor.",
    "An unstable energy conduit prone to arcing lethal discharge underfoot.",
  ],
  "Cyberpunk / Corporate": [
    "High-voltage electrical leaks energizing standing water in flooded service corridors.",
    "Laser-grid security barriers capable of slicing through body armor.",
    "Halon gas fire-suppression systems triggered by unauthorized heat signatures.",
    "A malfunctioning drone turret still running its last kill-order.",
    "A collapsing server rack primed to crush anyone who trips its sensor array.",
  ],
  "Post-Apocalyptic": [
    "Concentrated radiation pockets near ruptured reactor cores.",
    "Unstable floors collapsing into submerged sewage shafts.",
    "Rusted automated landmines planted near armory blast doors.",
    "A pocket of trapped gas that ignites at the first open flame.",
    "A rigged tripwire connected to a decades-old but still-armed shotgun trap.",
  ],
  "Vampire / Gothic Noir": [
    "Razor-sharp swinging scythe pendulum traps hidden in dark gothic archways.",
    "Sarcophagus warding glyphs that inflict necrotic burns on living intruders.",
    "Mirrors that reflect distorted horrific illusions causing panic.",
    "A hidden portcullis rigged to seal an intruder inside with the crypt's occupants.",
    "Silver-dust censers that sear the lungs of anyone who breathes them in.",
  ],
};

export const TREASURES_BY_GENRE: Record<string, string[]> = {
  Fantasy: [
    "A silver-hilted shortsword glowing with pale starlight near undead.",
    "A pouch of 300 ancient dwarven gold sovereigns and a gemstone map scroll.",
    "A sealed potion flask containing liquid dragonfire.",
  ],
  "Dark Fantasy": [
    "A tome of bound shadow-parchment containing dark incantations.",
    "A relic chalice carved from obsidian that turns water into wine or poison into nectar.",
    "An iron ring engraved with runes that ward off fear and madness.",
  ],
  "Sci-Fi / Space Opera": [
    "A precursor energy cell capable of powering a starship for 100 years.",
    "An alien nano-fabricator capable of constructing medical stimpacks.",
    "An encrypted memory crystal containing star maps to unmapped star systems.",
  ],
  "Cyberpunk / Corporate": [
    "A military-grade cybernetic optic implant with thermographic vision.",
    "An encrypted datapad containing bearer bond keys worth 50,000 credits.",
    "A prototype stealth-field generator belt.",
  ],
  "Post-Apocalyptic": [
    "A pristine unopened case of pre-war medical antibiotics.",
    "A solar-powered heavy plasma rifle with two charged power cells.",
    "A water filtration core module in original military packing.",
  ],
  "Vampire / Gothic Noir": [
    "A vial of elder vampire blood sealed in silver wire.",
    "An antique music box playing a tune that pacifies subterranean beasts.",
    "A signet ring of pure platinum conferring immunity to vampire charm effects.",
  ],
};

export const HOOKS_BY_GENRE: Record<string, string[]> = {
  Fantasy: [
    "A local scholar hires the party to retrieve an ancient astrological tablet from the ruins.",
    "Monster raids on nearby trade roads have been traced back to the open gates of this forgotten delve.",
    "A rival adventuring party entered the dungeon three days ago and has failed to return.",
    "A dying prospector swears the lowest vault holds a map to a second, richer delve.",
    "Livestock in a nearby village have started vanishing, dragged toward the delve's entrance.",
  ],
  "Dark Fantasy": [
    "A weeping mother begs the party to rescue her daughter, kidnapped for a ritual in the ossuary.",
    "The local bishop offers a royal reward to cleanse the corrupted altar before the lunar eclipse.",
    "A strange curse has turned the village well water to blood, originating from the subterranean complex.",
    "A defrocked priest seeks the party's help to destroy a relic he once helped consecrate.",
    "Pilgrims keep entering the ruin and returning changed, speaking in a language no one recognizes.",
  ],
  "Sci-Fi / Space Opera": [
    "A deep-space distress beacon began broadcasting from a long-silent planetary vault.",
    "A mega-corporation contracts the party to salvage precursor technology before a rival faction arrives.",
    "Atmospheric sensors detect a dangerous energy spike emanating from the vault's reactor core.",
    "A survivor's garbled transmission mentions coordinates and something that 'shouldn't still be alive'.",
    "An archivist offers passage off-world in exchange for a single recovered data core.",
  ],
  "Cyberpunk / Corporate": [
    "A fix-it netrunner hires the crew to extract an offline AI core from the corporate bunker.",
    "A rival gang has fortified the facility and is using it to launch drone strikes on city blocks.",
    "Your crew needs to wipe your criminal records stored on the facility's legacy mainframe.",
    "A whistleblower needs proof of the site's illegal experiments before the corp scrubs it clean.",
    "A missing-persons case leads straight to the facility's sealed sub-levels.",
  ],
  "Post-Apocalyptic": [
    "Settlement leaders need a vital replacement part from the bunker's generator to survive winter.",
    "Scouts report a rival warlord is mobilizing to seize the pre-war armory inside the silo.",
    "A dying wanderer hands the party a keycard and map leading to the sealed bio-vault.",
    "A settlement's last doctor needs pre-war medical supplies rumored to be sealed inside.",
    "Radio chatter from inside the facility suggests someone — or something — is still alive down there.",
  ],
  "Vampire / Gothic Noir": [
    "Townspeople have been disappearing on full moons, dragged into the catacombs beneath the old manor.",
    "An old nobleman's will reveals that his family's lost fortune is guarded in the family crypt.",
    "A mysterious vampire hunter seeks allies to penetrate the master's lair before the moonless night.",
    "A grieving widow wants her husband's body recovered before the estate claims it too.",
    "A blood debt comes due, and the only way to pay it is to enter the crypt and not come back empty-handed.",
  ],
};

export const SIGNATURE_FEATURES_BY_GENRE: Record<string, string[]> = {
  Fantasy: [
    "The Singing Crystal Shaft: A 100-foot chasm spanning glowing acoustic crystals that hum harmonically when air passes through.",
    "The Levitating Sunstone: A massive radiant orb suspended over an inverted fountain pool, illuminating the entire central hall.",
    "The Clockwork Celestial Globe: A giant brass planetarium in the main dome that continues to rotate, tracking real stars above.",
    "The Petrified Grove: A ring of stone trees, each once a guardian caught mid-transformation.",
    "The Weeping Colossus: A collapsed statue whose eyes still leak a faintly glowing tear-like resin.",
  ],
  "Dark Fantasy": [
    "The Bleeding Stone Arch: A monolithic gateway of porous granite that perpetually drips dark viscous crimson fluid into a channel.",
    "The Cage of Screaming Iron: A colossal iron cage suspended over a pit chasm, resonating with faint trapped voices.",
    "The Obsidian Altar of Tears: A polished black altar surrounded by glass jars containing preserved eyes.",
    "The Hollow Choir: A ring of headless statues that hum a discordant hymn when disturbed.",
    "The Marrow Well: A deep shaft lined with fused bone, warm to the touch despite the cold.",
  ],
  "Sci-Fi / Space Opera": [
    "The Singularity Core: A floating zero-g sphere of localized spatial distortion held stable by three humming magnetic pylons.",
    "The Bioluminescent Hydro-Gallery: Vertical glass tubes extending hundreds of meters containing giant alien flora.",
    "The Precursor Hologram Beacon: An interactive 3D map projecting extinct star systems in sapphire light.",
    "The Frozen Garden: A hydroponics bay locked in perfect cryo-stasis, plants suspended mid-growth.",
    "The Echo Chamber: A resonant hall that replays fragments of the crew's final transmissions.",
  ],
  "Cyberpunk / Corporate": [
    "The Sub-Zero Server Monolith: A four-story black mainframe array venting ice-cold nitrogen vapor into standing water.",
    "The Fiber-Optic Canopy: Thousands of luminescent data cables hanging from the ceiling like glowing jungle vines.",
    "The Prototype Neural Vault: A reinforced glass sphere surrounded by cyber-linking armatures and fried monitors.",
    "The Ghost Terminal: A workstation that still logs in under a name no one on staff recognizes.",
    "The Signal Well: A satellite uplink shaft that hums with a broadcast no one has decrypted yet.",
  ],
  "Post-Apocalyptic": [
    "The Unexploded Warhead: A nuclear missile resting upright in its rusted launch bay, worshipped by local scavengers.",
    "The Sealed Hydro-Dome: A massive glass ecosystem containing pre-collapse pine trees and filtered groundwater.",
    "The Irradiated Turbine Shaft: A subterranean generator room glowing with faint blue Cherenkov radiation.",
    "The Rusted Choir: Wind-driven turbine blades that moan through the corridors like a dirge.",
    "The Sealed Archive: A vault of pre-collapse recordings still playing on a loop to no one.",
  ],
  "Vampire / Gothic Noir": [
    "The Silver-Bound Grand Organ: A massive pipe organ in the subterranean chapel powered by underground water currents.",
    "The Gallery of Moving Portraits: Oil paintings of ancestral elders whose eyes slowly track movement in the room.",
    "The Rose-Glass Window: An underground stained-glass window illuminated from behind by a glowing subterranean lava vein.",
    "The Weeping Font: A basin of holy water gone black, still dripping despite no visible source.",
    "The Silent Bell Tower: A crypt bell that tolls on its own at the stroke of midnight, heard by no living ear.",
  ],
};
