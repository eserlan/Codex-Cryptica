import type { DungeonGenreTables } from "../genre-types";

export const lancerTables: DungeonGenreTables = {
  hint: "Focus on unmonitored mech bay bunkers, sub-surface NHP core vaults, printer bays, orbital impact craters turned military facilities, and hardpoint caches left behind by a withdrawn garrison.",
  purposes: [
    "Mech Bay & Hangar",
    "Fortress & Citadel",
    "Research Facility",
    "Data Vault & Archive",
    "Bio-Containment Wing",
    "Prison & Vault",
  ],
  currentStates: [
    "Sealed Vault",
    "Abandoned Ruins",
    "Occupied Stronghold",
    "Still Operational",
    "Overrun by Squatters",
    "Buried & Forgotten",
  ],
  sampleTitles: [
    "Hardpoint Cache Sigma-Nine",
    "The Mothballed Bay at Reach Station",
    "NHP Core Vault, Sub-Surface Four",
    "Impact Site Verrick, Repurposed",
    "The Cold Hangar Beneath Tamsin Ridge",
  ],
  builders: [
    "a corpro-state garrison that withdrew without unloading",
    "a Union survey detachment operating well past its mandate",
    "a private military contractor on a since-voided charter",
    "a colonial defence authority that ran out of funding mid-build",
    "a salvage cartel converting a crater into something permanent",
  ],
  originalUses: [
    "a maintenance bay for frames too large to service on the surface",
    "a core vault for NHPs that could not be safely shut down",
    "a printer bay supplying an offensive that was called off",
    "a hardpoint cache stocked against a siege that never came",
    "a debrief and quarantine wing for pilots returning off-book",
  ],
  entrances: [
    "a blast shutter jammed a metre open and drifted with dust",
    "a collapsed launch ramp still scored by thruster wash",
    "a crater fissure opening onto the upper hangar deck",
    "a personnel airlock cycling on a dying backup cell",
    "a printer feed tunnel wide enough to walk if you stoop",
  ],
  compositions: [
    "ablative plating salvaged from frames that did not come back",
    "printed structural foam gone brittle at the seams",
    "reinforced ferrocrete poured around an existing crater wall",
    "modular bulkheads bolted in and never finished",
    "compacted regolith faced with a thin shell of alloy",
  ],
  conditions: [
    "sealed under a hard vacuum lockdown that never lifted",
    "running on a reactor trickle nobody scheduled",
    "stripped of frames but not of their maintenance records",
    "cycling atmosphere on and off as the scrubbers fail and recover",
    "half-buried where the crater wall came down across the ramp",
  ],
  causes: [
    "a withdrawal order executed faster than the inventory could be cleared",
    "an NHP cascade that forced the whole level into lockdown",
    "a contract voided mid-deployment, stranding everything in place",
    "an orbital strike that closed the surface access in one pass",
    "a mutiny among the maintenance crews that nobody put in the log",
  ],
  sectors: [
    {
      name: "The Cold Bay",
      description:
        "A hangar of empty frame cradles, umbilicals still coiled where they were dropped.",
    },
    {
      name: "The Printer Deck",
      description:
        "Fabrication gantries frozen mid-run over a half-printed chassis limb.",
    },
    {
      name: "The Core Vault",
      description:
        "A shielded chamber of NHP casket housings, most dark, one indicator still amber.",
    },
    {
      name: "The Hardpoint Cache",
      description:
        "Racked ordnance in sealed crates, inventory seals unbroken.",
    },
    {
      name: "The Pilot Ready Room",
      description:
        "Lockers, couches, and a briefing screen paused on an operation that was cancelled.",
    },
    {
      name: "The Crater Breach",
      description:
        "Where the impact opened the facility to the surface, floored with fused glass.",
    },
  ],
  inhabitants: [
    "A salvage crew stripping the bay under a permit that does not cover any of this.",
    "Automated bay defences still enforcing a lockdown order from a dead command.",
    "An NHP running the facility alone and increasingly loosely.",
    "A stranded pilot cadre who have made the ready room a home.",
    "A rival contractor's retrieval team, already three levels ahead.",
  ],
  factionNames: [
    "the Reach Station Salvagers",
    "the Bay Defence Subroutine",
    "the Vault NHP",
    "the Stranded Pilot Cadre",
    "the Rival Retrieval Team",
    "the Verrick Crater Scavengers",
    "the Withdrawn Garrison's Rearguard",
    "the Union Survey Inspectors",
    "the Cartel Claim Crew",
    "the Printer Deck Technicians",
  ],
  secrets: [
    "The NHP in the core vault was never shut down, only told that it had been.",
    "The hardpoint cache is inventoried to a unit that was officially disbanded before it was stocked.",
    "The withdrawal was not a withdrawal — the garrison was ordered to abandon something specific and leave it sealed.",
    "The half-printed chassis on the deck is to a pattern that has never been licensed anywhere.",
    "The crater was not an impact. Something came out, and the facility was built to watch the hole.",
  ],
  hazards: [
    "Bay defence turrets tracking on an obsolete IFF list.",
    "Atmosphere cycling to vacuum without warning where the seals have failed.",
    "Printer gantries resuming their run the moment power reaches them.",
    "Unstable ordnance in crates that were never rated for this long in storage.",
    "Fused crater glass that gives way over a drop to the deck below.",
  ],
  treasures: [
    "A sealed hardpoint crate with ordnance no longer in production.",
    "An NHP shard casket, intact and legally unaccounted for.",
    "A licence key for a frame pattern worth more than the salvage.",
    "The garrison's full maintenance archive, naming every frame that left.",
    "A pilot's personalised control yoke, machined to a dead operator's hands.",
  ],
  hooks: [
    "A cartel is paying for anything recovered from the bay, no questions about provenance.",
    "Union wants the core vault audited before someone else opens it.",
    "A pilot's family wants her frame's flight recorder recovered.",
    "Signals traffic from the site resumed last week after forty years of silence.",
    "A rival retrieval team went in six days ago and has not reported since.",
  ],
  signatureFeatures: [
    "The Standing Frame: One chassis left in its cradle, fully assembled, its cockpit sealed from the inside.",
    "The Amber Casket: A single NHP housing still lit in a vault of dead ones, cycling a diagnostic no one requested.",
    "The Glass Floor: A crater breach floored in fused silica, the impact scar visible straight down through it.",
    "The Cancelled Briefing: A ready-room screen frozen on an operation map, timestamped the day of the withdrawal.",
    "The Half-Printed Limb: A fabrication run stopped mid-layer, the alloy still faintly warm to the touch.",
  ],
};
