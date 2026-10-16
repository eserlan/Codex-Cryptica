/**
 * Genre and scale lookup tables for deterministic local Point Crawl generation
 * and granular per-node / per-route fallback (#2479, 177-point-crawl-generator).
 */

import type { PointCrawlGateKind } from "./point-crawl-state";

export interface ScaleVocabulary {
  travelTimes: readonly string[];
  terrains: readonly string[];
  signposts: readonly string[];
  risks: readonly string[];
  nodePrefixes: readonly string[];
}

export const SCALE_VOCABULARY: Record<string, ScaleVocabulary> = {
  Dungeon: {
    travelTimes: ["10 min", "15 min", "20 min", "30 min", "1 turn", "2 turns"],
    terrains: [
      "Flooded stone gallery",
      "Collapsed spiral stair",
      "Choked ventilation shaft",
      "Echoing ossuary colonnade",
      "Rusted chain-bridge over a chasm",
      "Slag-lined smelter flue",
      "Submerged cistern crawlway",
      "Mural-carved processional hall",
    ],
    signposts: [
      "Cold draft carrying the smell of wet iron and old tallow",
      "Fresh boot-scrapes in the calcified silt leading past a toppled brazier",
      "Faint rhythmic ticking echoing through the masonry joints",
      "Phosphorescent lichen trail marking handholds along the wall",
      "Half-burned rope tied to an iron ring beside a chiseled warning mark",
      "Trickle of amber resin leaking from the archway keystone",
    ],
    risks: [
      "Loose flagstones trigger a counterweight portcullis drop",
      "Roving lantern-patrol checks the corridor every ten minutes",
      "Pockets of choke-damp pool in the low steps",
      "Brittle timber shoring groans under heavy gear",
      "Scavenger beetles nest in the wall niches and swarm at open flame",
      "Waist-deep freezing water numbs limbs and ruins dry rations",
    ],
    nodePrefixes: [
      "Threshold Hall",
      "Sunken Cistern",
      "Furnace Nave",
      "Reliquary Vault",
      "Broken Belfry",
      "Alchemist's Sluice",
      "Chain-Hoist Gallery",
      "Watch-Post Alcove",
      "Bone-Script Archive",
      "Mirror-Lens Chamber",
      "Slag Pit Crossing",
      "Floodgate Control Room",
      "Penitent's Cellblock",
      "Subterranean Wharf",
      "Sanctum of the First Seal",
    ],
  },
  Settlement: {
    travelTimes: ["5 min", "10 min", "15 min", "25 min", "35 min"],
    terrains: [
      "Mud-rutted market lane",
      "Timber boardwalk over the mill-race",
      "Smokehouse back-alley",
      "Stone weir footbridge",
      "Tannery drainage ditch",
      "Orchard boundary wall path",
      "Roof-slate catwalk between granaries",
      "Sunken cellar tunnel",
    ],
    signposts: [
      "Chalk tally marks on a rain-barrel pointing toward the old mill",
      "Smell of vinegar,焦tar, and wet wool drifting from the dye-vats",
      "Hushed argument behind shuttered windows over the bailiff's levy",
      "Lantern hung with green glass signalling the night-watch shift change",
      "Wheelbarrow ruts deep with fresh river-clay",
      "Stray hound barking at a padlocked cellar hatch",
    ],
    risks: [
      "Bailiff's tax-collectors stop strangers to inspect packs",
      "Slick moss on the weir planks above the churning waterwheel",
      "A local feud spills into the lane with thrown cobbles",
      "Loose roof-tiles clatter down and alert the courtyard mastiffs",
      "Curfew bell rings, drawing lantern-wardens to the main crossroad",
      "Rotten floorboards over the cess-trench give way under weight",
    ],
    nodePrefixes: [
      "South Gate Tollhouse",
      "Old Mill Weir",
      "Tanner's Yard",
      "Bell-Founder's Shed",
      "Sunken Tithe-Barn",
      "Boatman's Landing",
      "Apothecary's Glasshouse",
      "Parish Ossuary",
      "Smuggler's Salt-Cellar",
      "Blacksmith's Forge-Court",
      "WatchtowerCistern",
      "Drover's Paddock",
      "Alderman's Manor",
      "Abandoned Lime-Kiln",
      "High Bailiff's Strongroom",
    ],
  },
  City: {
    travelTimes: ["20 min", "35 min", "45 min", "1 hr", "90 min"],
    terrains: [
      "Foggy canal barge-way",
      "Elevated viaduct walkway",
      "Undercity brick sewer main",
      "Crowded guildhall arcade",
      "Rooftop laundry-line span",
      "Abandoned tramway cut",
      "Customs-wharf crane gantry",
      "Catacomb service stair",
    ],
    signposts: [
      "Painted guild-stencils on the brickwork marking safe passage",
      "Steam-whistle blasts from the foundry district three bridges down",
      "Street-crier hawking broadsheets about a quarantine at the docks",
      "Flickering gas-lamp with a brass tag tied to its post",
      "Oily canal water carrying crates stamped with the syndicate seal",
      "Gargoyle downspout propping open a rusted iron service grate",
    ],
    risks: [
      "Ward-constables demand stamped transit papers at the bridgehead",
      "Cutpurse lookouts whistle signals from the awning scaffolds",
      "High tide floods the lower towpath to chest height",
      "Rival syndicate enforcers collect a heavy toll in coin or blood",
      "Runaway dray-cart blocks the narrow arch and draws a crowd",
      "Toxic coal-smog reduces visibility to ten paces",
    ],
    nodePrefixes: [
      "Blackwater Wharf",
      "Clockwork Exchange",
      "Glassblowers' Arcade",
      "Sunken Undercroft",
      "Bridge of Seven Chains",
      "Lazaretto Island",
      "Foundry Sluice-Gate",
      "Censor's Archive",
      "Rooftop Aviary",
      "Old Mint Vaults",
      "Canal Lock-House",
      "Night-Market Rotunda",
      "Dead-Letter Posthouse",
      "Grand Conduit Station",
      "High Spire Observatory",
    ],
  },
  Wilderness: {
    travelTimes: ["1 hr", "2 hrs", "3 hrs", "4 hrs", "1 watch", "6 hrs"],
    terrains: [
      "Wind-scoured ridge trail",
      "Sunken bog plank-causeway",
      "Rushing gorge rope-bridge",
      "Thorn-choked limestone ravine",
      "Ancient paved courier road",
      "Shale scree slope",
      "Beaver-flooded alder bottoms",
      "Collapsed aqueduct ridge",
    ],
    signposts: [
      "Cairn of white quartz stones stacked beside a split lightning-pine",
      "Circling carrion crows above a column of greasy black smoke",
      "Fresh cloven tracks pressed into the creek-bank mud",
      "Carved ranger-runes on a weathered boundary menhir",
      "Faint smell of woodsmoke and roasting mutton carried on the wind",
      "Tattered banner fluttering from a rusted lance in the heather",
    ],
    risks: [
      "Sudden flash-mist rolls across the mire, hiding sinkholes",
      "Rockslide loosens from the upper crag at loud noises",
      "Territorial ridge-stalkers shadow the party from the brush",
      "Frayed hemp cables on the bridge snap under more than two crossers",
      "Swollen ford sweeps pack-animals downstream toward the rapids",
      "Outlaw lookouts signal from the watch-crag with polished mirrors",
    ],
    nodePrefixes: [
      "Ranger's Waystation",
      "Split-Pine Cairn",
      "Drowned Abbey Ruins",
      "Wurm-Bone Ravine",
      "Smuggler's Ford",
      "Signal-Fire Tor",
      "Bog-Iron Pit",
      "Hermit's Cliff-Shrine",
      "Broken Aqueduct Camp",
      "Whispering Menhir Circle",
      "Bandit Toll-Palisade",
      "Sulfur Hot-Springs",
      "Petrified Grove",
      "Sunken Watchtower",
      "Citadel of the High Pass",
    ],
  },
  Region: {
    travelTimes: ["1 day", "2 days", "3 days", "4 days", "5 days"],
    terrains: [
      "Imperial stone highway",
      "High mountain switchback pass",
      "Silted river-barge channel",
      "Salt-flat caravan track",
      "Coastal cliff-ledge road",
      "Badlands canyon floor",
      "Fenland dike path",
      "Old borderland trench-line",
    ],
    signposts: [
      "Weathered milestone pillar defaced with rebel charcoal slogans",
      "Refugee wagons heading the opposite way with tales of a closed pass",
      "Beacon-tower smoke signals repeating along the distant horizon",
      "Bleached pack-mule bones beside a dry cistern",
      "Border-patrol pennants planted along a ridge of ancient earthworks",
      "Merchant-guild ferry bell ringing across the reed beds",
    ],
    risks: [
      "Mercenary deserters man a makeshift barricade at the defile",
      "Unseasonable gale-squall strips tents and spoils dry provisions",
      "Fever-quarantine cordon blocks the main bridge for three leagues",
      "Predator packs trail the caravan between watering holes",
      "Washout forces afull day's detour through unstable shale bluffs",
      "Local warlord's outriders demand tribute or conscripted labour",
    ],
    nodePrefixes: [
      "Borderland Post",
      "Crossroads Caravanserai",
      "Sunken Salt-Pan",
      "Old Imperial Fortress",
      "Ferryman's Reed-Port",
      "Pilgrim's Mountain Hospice",
      "Quarantine Bridgehead",
      "Abandoned Silver-Mine",
      "Beacon-Ridge Keep",
      "Wind-Carved Monolith",
      "Rebel Supply-Cache",
      "Drowned Valley Causeway",
      "Canyon Cistern-Oasis",
      "Ruined Observatory Dome",
      "Throne-Crag Sanctuary",
    ],
  },
  "Planet / System": {
    travelTimes: ["4 hrs", "12 hrs", "1 day", "3 days", "1 jump", "2 jumps"],
    terrains: [
      "Debris-strewn orbital transfer lane",
      "High-radiation dust-ring corridor",
      "Decommissioned mass-driver vector",
      "Gravity-well slingshot trajectory",
      "Uncharted Lagrange drift-path",
      "Ice-hauler convoy beacon route",
      "Sub-surface lava-tube transit rail",
      "Ion-storm shadow channel",
    ],
    signposts: [
      "Repeating automated distress telemetry on an obsolete naval frequency",
      "Faint Cherenkov exhaust plume trailing toward the outer moon",
      "Drifting cargo pods bearing scorched syndicate hull-markings",
      "Navigation buoy blinking an encrypted quarantine checksum",
      "Gravitational shear readings echoing from a cloaked mass",
      "Scrap-tug transponder ping offering salvage coordinates for fuel",
    ],
    risks: [
      "Micrometeoroid swarm pits hull plating and fouls sensor arrays",
      "Automated customs picket scans transponders for contraband signatures",
      "Solar flare surge scrambles unshielded navigation computers",
      "Corsair gunship waits cold-running in the asteroid radar shadow",
      "Coolant-line pressure spike forces a hard burn or emergency drift",
      "Derelict defense drone grid wakes when active radar pings the sector",
    ],
    nodePrefixes: [
      "Relay Anchor-01",
      "Slag-Moon Refinery",
      "Derelict Hulk 'Vesper'",
      "Ice-Mine Habitat",
      "Lagrange Free-Port",
      "Quarantine Listening Post",
      "Orbital Drydock Wreck",
      "Radiation-Belt Vault",
      "Comet-Tail Fuel Depot",
      "Hollowed Asteroid Shrine",
      "Blockade Picket Station",
      "Sub-Glacial Lab",
      "Gravity-Well Beacon",
      "Ghost-Fleet Graveyard",
      "Core-Command Dyson Node",
    ],
  },
};

export interface GateRequirementTemplate {
  kind: PointCrawlGateKind;
  requirement: string;
  clueSnippet: string;
}

export const GATE_TEMPLATES_BY_GENRE: Record<
  string,
  readonly GateRequirementTemplate[]
> = {
  "Classic Fantasy": [
    {
      kind: "key",
      requirement: "the Stamped Bronze Sluice-Key",
      clueSnippet:
        "Holds the Stamped Bronze Sluice-Key hanging from a drowned warden's belt.",
    },
    {
      kind: "clue",
      requirement: "the Three-Bell Toll Sequence (Low, High, Low)",
      clueSnippet:
        "A soot-stained ledger records the Three-Bell Toll Sequence (Low, High, Low) used by the watch.",
    },
    {
      kind: "tool",
      requirement: "an Alchemical Frost-Wedge",
      clueSnippet:
        "Contains a crate of intact Alchemical Frost-Wedges capable of cracking rusted counterweights.",
    },
    {
      kind: "clearance",
      requirement: "the Abbot's Wax-Sealed Ivory Tally",
      clueSnippet:
        "The Abbot's Wax-Sealed Ivory Tally rests inside the reliquary coffer.",
    },
  ],
  "Sci-Fi / Space Opera": [
    {
      kind: "key",
      requirement: "Docking Override Cypher 'KESTREL-9'",
      clueSnippet:
        "The flight recorder stores Docking Override Cypher 'KESTREL-9' in cleartext.",
    },
    {
      kind: "tool",
      requirement: "a Magnetic Plasma-Torch Cutter",
      clueSnippet:
        "A charged Magnetic Plasma-Torch Cutter is racked in the maintenance locker.",
    },
    {
      kind: "clearance",
      requirement: "a Biometric Harbour-Master Transponder",
      clueSnippet:
        "Yields a working Biometric Harbour-Master Transponder from the wrecked shuttle.",
    },
    {
      kind: "guide",
      requirement: "Pilot-Navigator Orin's Drift-Charts",
      clueSnippet:
        "Pilot-Navigator Orin's Drift-Charts are etched onto a titanium data-slate here.",
    },
  ],
  "Cyberpunk / Corporate": [
    {
      kind: "key",
      requirement: "Sub-Level Mag-Keycard 'OMNI-04'",
      clueSnippet:
        "A fried sec-rig still clutches Sub-Level Mag-Keycard 'OMNI-04'.",
    },
    {
      kind: "clue",
      requirement: "Handshake Passcode 'GLASS-CICADA'",
      clueSnippet:
        "An air-gapped terminal displays Handshake Passcode 'GLASS-CICADA'.",
    },
    {
      kind: "tool",
      requirement: "an Industrial Fibre-Optic Splicer",
      clueSnippet:
        "A technician's rig here holds an Industrial Fibre-Optic Splicer.",
    },
  ],
  "Cosmic Horror": [
    {
      kind: "key",
      requirement: "the Star-Lead Astrolabe Disk",
      clueSnippet:
        "Resting on the altar is the Star-Lead Astrolabe Disk that fits the recessed door.",
    },
    {
      kind: "clue",
      requirement: "the Backward Vespers Chant ('Nox Ante Lucem')",
      clueSnippet:
        "Marginalia in the parish register spells out the Backward Vespers Chant ('Nox Ante Lucem').",
    },
    {
      kind: "tool",
      requirement: "a Jar of Quicklime & Silver Filings",
      clueSnippet:
        "Apothecary shelves hold a sealed Jar of Quicklime & Silver Filings.",
    },
  ],
};

export function getScaleVocabulary(scale: string): ScaleVocabulary {
  return SCALE_VOCABULARY[scale] ?? SCALE_VOCABULARY.Wilderness;
}

export function getGateTemplates(
  genre: string,
): readonly GateRequirementTemplate[] {
  for (const [key, templates] of Object.entries(GATE_TEMPLATES_BY_GENRE)) {
    if (genre.toLowerCase().includes(key.split(" ")[0].toLowerCase())) {
      return templates;
    }
  }
  if (/sci-fi|lancer|space/i.test(genre)) {
    return GATE_TEMPLATES_BY_GENRE["Sci-Fi / Space Opera"];
  }
  if (/cyber|modern/i.test(genre)) {
    return GATE_TEMPLATES_BY_GENRE["Cyberpunk / Corporate"];
  }
  if (/horror|vampire|dark/i.test(genre)) {
    return GATE_TEMPLATES_BY_GENRE["Cosmic Horror"];
  }
  return GATE_TEMPLATES_BY_GENRE["Classic Fantasy"];
}
