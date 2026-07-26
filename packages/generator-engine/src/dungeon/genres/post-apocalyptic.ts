import type { DungeonGenreTables } from "../genre-types";

export const postApocalypticTables: DungeonGenreTables = {
  hint: "Utilize irradiated missile silos, submerged subway stations, rusted bio-vaults, and overgrown fallout shelters.",
  purposes: [
    "Fallout Shelter",
    "Research Facility",
    "Bio-Containment Wing",
    "Mine & Shafts",
    "Prison & Vault",
    "Fortress & Citadel",
    "Natural Cavern Network",
  ],
  currentStates: [
    "Overrun by Squatters",
    "Sealed Vault",
    "Abandoned Ruins",
    "Still Operational",
    "Active Monster Lair",
    "Occupied Stronghold",
    "Buried & Forgotten",
  ],
  sampleTitles: [
    "Silo Zero-Seven Fallout Repository",
    "Submerged Metro Line Omega",
    "The Rad-Shielded Gene Bank",
    "Bunker 81 Hydro-Excavation Site",
    "The Iron-Husk Munitions Vault",
  ],
  builders: [
    "a pre-collapse federal contractor",
    "a survivalist cooperative",
    "the last standing regional government",
    "a corporate bunker consortium",
    "a scientific continuity project",
  ],
  originalUses: [
    "a continuity-of-government shelter",
    "a seed and gene bank for post-collapse recovery",
    "a fallout-hardened hospital wing",
    "a rationed water reclamation plant",
    "a munitions and armor stockpile",
  ],
  entrances: [
    "a blast door half-melted into its frame",
    "a collapsed highway overpass",
    "a rusted grain silo hatch",
    "a flooded subway entrance",
    "a fenced-off ruin still marked with faded hazard signs",
  ],
  compositions: [
    "pre-collapse reinforced concrete, cracked but standing",
    "salvaged scrap welded over the original walls",
    "lead-lined chambers gone brittle with age",
    "rust-streaked steel that groans in the wind",
    "irradiated glass fused smooth by old heat",
  ],
  conditions: [
    "still sealed, waiting for an all-clear that never came",
    "overrun by a settlement that doesn't know what it's sitting on",
    "half-flooded from a burst reclamation tank",
    "picked nearly clean save for one locked vault",
    "running on a generator someone still maintains",
  ],
  causes: [
    "a containment failure during the initial collapse",
    "a mutiny among the shelter's own survivors",
    "rationing riots that turned the halls into a battleground",
    "a slow systems failure no one was left to fix",
    "the day the blast doors opened and nothing came in",
  ],
  sectors: [
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
  inhabitants: [
    "Raid-Clan Mutants who worship the facility's unexploded warhead as a deity.",
    "Feral Vault-Dweller descendants who view surface dwellers as hostile invaders.",
    "Autonomous Security Turrets guarding rusted stockpiles of pre-war ration crates.",
    "A pack of irradiated Scavenger Hounds that have claimed the lower tunnels.",
    "A cult of Ash-Walkers who believe the facility's silence is a sign from the old world.",
  ],
  factionNames: [
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
  secrets: [
    "The automated water purification plant is still functional and could supply an entire wasteland settlement.",
    "The missile in Silo 1 was never launched and its nuclear payload remains active.",
    "The facility was built to seed a new ecosystem using preserved pre-collapse DNA strains.",
    "The shelter's registry shows it was opened from the outside years before the all-clear was ever given.",
    "The seed vault was quietly emptied before the collapse, and the manifest names who took it.",
  ],
  hazards: [
    "Concentrated radiation pockets near ruptured reactor cores.",
    "Unstable floors collapsing into submerged sewage shafts.",
    "Rusted automated landmines planted near armory blast doors.",
    "A pocket of trapped gas that ignites at the first open flame.",
    "A rigged tripwire connected to a decades-old but still-armed shotgun trap.",
  ],
  treasures: [
    "A pristine unopened case of pre-war medical antibiotics.",
    "A solar-powered heavy plasma rifle with two charged power cells.",
    "A water filtration core module in original military packing.",
    "A working geiger-mapped survey of every clean water source within a hundred miles.",
    "A crate of pre-war fuel cells, still sealed and still holding charge.",
  ],
  hooks: [
    "Settlement leaders need a vital replacement part from the bunker's generator to survive winter.",
    "Scouts report a rival warlord is mobilizing to seize the pre-war armory inside the silo.",
    "A dying wanderer hands the party a keycard and map leading to the sealed bio-vault.",
    "A settlement's last doctor needs pre-war medical supplies rumored to be sealed inside.",
    "Radio chatter from inside the facility suggests someone — or something — is still alive down there.",
  ],
  signatureFeatures: [
    "The Unexploded Warhead: A nuclear missile resting upright in its rusted launch bay, worshipped by local scavengers.",
    "The Sealed Hydro-Dome: A massive glass ecosystem containing pre-collapse pine trees and filtered groundwater.",
    "The Irradiated Turbine Shaft: A subterranean generator room glowing with faint blue Cherenkov radiation.",
    "The Rusted Choir: Wind-driven turbine blades that moan through the corridors like a dirge.",
    "The Sealed Archive: A vault of pre-collapse recordings still playing on a loop to no one.",
  ],
};
