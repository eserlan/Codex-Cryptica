/**
 * Constants, configuration options, and thematic tables for the Dungeon / Delve Generator.
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

export const HISTORIES_BY_GENRE: Record<string, string[]> = {
  Fantasy: [
    "Originally built 800 years ago as a sacred dwarven sanctuary, the delve was abandoned during the Dragon War and subsequently overrun by subterranean beasts.",
    "Constructed as a high-security vault by an ancient archmage, the complex fell into ruin after a miscast spell shattered its warding anchors.",
  ],
  "Dark Fantasy": [
    "Erected as a holy catacomb for honored martyrs, the site was desecrated during a bloody siege and transformed into a horrific sacrificial tomb.",
    "Once a prosperous underground iron mine, the miners delved too deep and breached a pit of darkness that consumed the entire settlement.",
  ],
  "Sci-Fi / Space Opera": [
    "Built 5,000 years ago by an extinct precursor civilization as a planetary research station, it entered emergency stasis when the star system collapsed.",
    "Constructed as an off-world bio-containment facility, an automated quarantine protocol permanently locked down all airlocks after a specimen breach.",
  ],
  "Cyberpunk / Corporate": [
    "Built by Aegis Dynamics for black-budget neural interface testing, the bunker was scrubbed from official corporate maps following an internal purge.",
    "Originally an underground automated server farm, it was abandoned during the Net collapse and left under the control of legacy defense routines.",
  ],
  "Post-Apocalyptic": [
    "Constructed before the Great Collapse as a military command bunker, its inhabitants survived for three generations before life-support systems failed.",
    "Built as a nuclear missile silo and fallout shelter, the blast doors were welded shut from the outside during the initial strikes.",
  ],
  "Vampire / Gothic Noir": [
    "Commissioned in the 14th century by Duke Von Draven as an ancestral mausoleum, it became the covert seat of an elder vampire bloodline.",
    "Built as a subterranean monastery for an ascetic order, the monks were gradually turned or slaughtered by a shadow creature sealed in the cellar.",
  ],
};

export const SIGNATURE_FEATURES_BY_GENRE: Record<string, string[]> = {
  Fantasy: [
    "The Singing Crystal Shaft: A 100-foot chasm spanning glowing acoustic crystals that hum harmonically when air passes through.",
    "The Levitating Sunstone: A massive radiant orb suspended over an inverted fountain pool, illuminating the entire central hall.",
    "The Clockwork Celestial Globe: A giant brass planetarium in the main dome that continues to rotate, tracking real stars above.",
  ],
  "Dark Fantasy": [
    "The Bleeding Stone Arch: A monolithic gateway of porous granite that perpetually drips dark viscous crimson fluid into a channel.",
    "The Cage of Screaming Iron: A colossal iron cage suspended over a pit chasm, resonating with faint trapped voices.",
    "The Obsidian Altar of Tears: A polished black altar surrounded by glass jars containing preserved eyes.",
  ],
  "Sci-Fi / Space Opera": [
    "The Singularity Core: A floating zero-g sphere of localized spatial distortion held stable by three humming magnetic pylons.",
    "The Bioluminescent Hydro-Gallery: Vertical glass tubes extending hundreds of meters containing giant alien flora.",
    "The Precursor Hologram Beacon: An interactive 3D map projecting extinct star systems in sapphire light.",
  ],
  "Cyberpunk / Corporate": [
    "The Sub-Zero Server Monolith: A four-story black mainframe array venting ice-cold nitrogen vapor into standing water.",
    "The Fiber-Optic Canopy: Thousands of luminescent data cables hanging from the ceiling like glowing jungle vines.",
    "The Prototype Neural Vault: A reinforced glass sphere surrounded by cyber-linking armatures and fried monitors.",
  ],
  "Post-Apocalyptic": [
    "The Unexploded Warhead: A nuclear missile resting upright in its rusted launch bay, worshipped by local scavengers.",
    "The Sealed Hydro-Dome: A massive glass ecosystem containing pre-collapse pine trees and filtered groundwater.",
    "The Irradiated Turbine Shaft: A subterranean generator room glowing with faint blue Cherenkov radiation.",
  ],
  "Vampire / Gothic Noir": [
    "The Silver-Bound Grand Organ: A massive pipe organ in the subterranean chapel powered by underground water currents.",
    "The Gallery of Moving Portraits: Oil paintings of ancestral elders whose eyes slowly track movement in the room.",
    "The Rose-Glass Window: An underground stained-glass window illuminated from behind by a glowing subterranean lava vein.",
  ],
};

export const CONFLICTS_BY_GENRE: Record<string, string[]> = {
  Fantasy: [
    "An invading Kobold mining crew has broken into the lower sectors, sparking a turf war with the resident Goblin clan.",
    "Arcane cultists are attempting a ritual to break the dungeon's lowest seal, while garrisoned guardians attempt to stop them.",
    "Rising subterranean water levels threaten to flood the lower vaults and drown the treasures hidden within.",
  ],
  "Dark Fantasy": [
    "A horde of starved ghouls is trying to breach the inner sanctum where corrupted knight-revenants stand guard.",
    "Eldritch whispers emanating from the lowest pit are driving the resident bandit gang into violent madness.",
    "A plague of corpse-rot spores is spreading through the upper sectors, threatening nearby surface villages.",
  ],
  "Sci-Fi / Space Opera": [
    "Automated security drones are engaged in a fire-fight against rogue bio-specimens that broke out of cryo-stasis.",
    "A power fluctuation is causing the containment field around the central singularity to decay, risking spatial collapse.",
    "A rival corporate mercenary team is already inside, attempting to steal precursor datadrives before your arrival.",
  ],
  "Cyberpunk / Corporate": [
    "Net-scrapper squatters are battling automated corporate security turrets to gain control of the mainframe.",
    "A rogue AI has locked down the sublevels and is threatening to purge oxygen unless its demands are met.",
    "A black-ops erasure squad has entered the facility with orders to incinerate all evidence and eliminate witnesses.",
  ],
  "Post-Apocalyptic": [
    "Wasteland raiders are laying siege to a group of peaceful vault-dweller descendants trapped in the living quarters.",
    "Leaking radiation from a breached reactor core is forcing the resident mutant tribe to expand into upper sectors.",
    "Scavengers are attempting to dismantle the main generator, which would shut down the settlement's water filter nearby.",
  ],
  "Vampire / Gothic Noir": [
    "Rival vampire spawn are fighting for possession of the master's sarcophagus while the elder reawakens.",
    "A fanatic order of witch-hunters has penetrated the upper vestibule, laying silver traps and burning coffins.",
    "Blood-sworn cultists are sacrificing hostages to fuel a ritual, while feral ghoul hounds roam the corridors.",
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
  ],
};

export const INHABITANTS_BY_GENRE: Record<string, string[]> = {
  Fantasy: [
    "A desperate clan of Goblins utilizing ancient defense traps against an intruding Kobold mining party.",
    "A rogue order of Banished Arcane Cultists performing rituals to break the dungeon's lowest seal.",
    "Gargoyle guardians bound by ancient oath, attacking anyone who touches sacred relics.",
  ],
  "Dark Fantasy": [
    "A horde of Ghoul Scavengers led by a Necromantic Revenant hunting for unburied bones.",
    "Corrupted Templars whose minds were broken by subterranean eldritch whispers.",
    "A swarm of Chitinous Burrowers that nest in the damp ossuary walls.",
  ],
  "Sci-Fi / Space Opera": [
    "Rogue Combat Drones continuing their automated defense patrol 500 years after facility abandonment.",
    "Mutated Specimen Swarms that escaped cryo-containment when power failed.",
    "A precursor AI Sentinel speaking in broken logic puzzles while activating containment fields.",
  ],
  "Cyberpunk / Corporate": [
    "A gang of Net-Scrapper Squatters utilizing the facility power to mine underground cryptocurrency.",
    "Automated Rogue Cyber-Security Drones with corrupted target identification matrices.",
    "A rogue corporate black-ops squad sent to erase all evidence of illegal bio-experiments.",
  ],
  "Post-Apocalyptic": [
    "Raid-Clan Mutants who worship the facility's unexploded warhead as a deity.",
    "Feral Vault-Dweller descendants who view surface dwellers as hostile invaders.",
    "Autonomous Security Turrets guarding rusted stockpiles of pre-war ration crates.",
  ],
  "Vampire / Gothic Noir": [
    "A thrall cult of Blood-Sworn Initiates preparing the master's sarcophagus for revival.",
    "Feral Ghoul Hounds hunting intruders who disturb the master's subterranean sleep.",
    "Rival Vampire Spawn vying for control over the ancestral blood vault.",
  ],
};

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
  ],
  "Dark Fantasy": [
    "Rooms filled with intoxicating spore mist causing hallucinations of lost loved ones.",
    "Curse-carved doorways that drain 10% of a caster's vital energy upon entry.",
    "Floors that buckle into subterranean chasms of boiling pitch.",
  ],
  "Sci-Fi / Space Opera": [
    "Malfunctioning automated plasma turrets targeting heat signatures.",
    "Sub-zero containment breaches creating flash-freeze hazards across metal catwalks.",
    "Gravity-reversal corridors causing disorientation and crushing impacts.",
  ],
  "Cyberpunk / Corporate": [
    "High-voltage electrical leaks energizing standing water in flooded service corridors.",
    "Laser-grid security barriers capable of slicing through body armor.",
    "Halon gas fire-suppression systems triggered by unauthorized heat signatures.",
  ],
  "Post-Apocalyptic": [
    "Concentrated radiation pockets near ruptured reactor cores.",
    "Unstable floors collapsing into submerged sewage shafts.",
    "Rusted automated landmines planted near armory blast doors.",
  ],
  "Vampire / Gothic Noir": [
    "Razor-sharp swinging scythe pendulum traps hidden in dark gothic archways.",
    "Sarcophagus warding glyphs that inflict necrotic burns on living intruders.",
    "Mirrors that reflect distorted horrific illusions causing panic.",
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
  ],
  "Dark Fantasy": [
    "A weeping mother begs the party to rescue her daughter, kidnapped for a ritual in the ossuary.",
    "The local bishop offers a royal reward to cleanse the corrupted altar before the lunar eclipse.",
    "A strange curse has turned the village well water to blood, originating from the subterranean complex.",
  ],
  "Sci-Fi / Space Opera": [
    "A deep-space distress beacon began broadcasting from a long-silent planetary vault.",
    "A mega-corporation contracts the party to salvage precursor technology before a rival faction arrives.",
    "Atmospheric sensors detect a dangerous energy spike emanating from the vault's reactor core.",
  ],
  "Cyberpunk / Corporate": [
    "A fix-it netrunner hires the crew to extract an offline AI core from the corporate bunker.",
    "A rival gang has fortified the facility and is using it to launch drone strikes on city blocks.",
    "Your crew needs to wipe your criminal records stored on the facility's legacy mainframe.",
  ],
  "Post-Apocalyptic": [
    "Settlement leaders need a vital replacement part from the bunker's generator to survive winter.",
    "Scouts report a rival warlord is mobilizing to seize the pre-war armory inside the silo.",
    "A dying wanderer hands the party a keycard and map leading to the sealed bio-vault.",
  ],
  "Vampire / Gothic Noir": [
    "Townspeople have been disappearing on full moons, dragged into the catacombs beneath the old manor.",
    "An old nobleman's will reveals that his family's lost fortune is guarded in the family crypt.",
    "A mysterious vampire hunter seeks allies to penetrate the master's lair before the moonless night.",
  ],
};
