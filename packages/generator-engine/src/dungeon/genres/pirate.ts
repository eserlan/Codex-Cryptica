import type { DungeonGenreTables } from "../genre-types";

export const pirateTables: DungeonGenreTables = {
  hint: "Focus on sea caves and tidal coves, flooded smuggler holds, wrecked hulls driven into the rock, powder magazines, and shareout halls under a headland.",
  purposes: [
    "Pirate Cove & Smuggler's Hold",
    "Fortress & Citadel",
    "Prison & Vault",
    "Natural Cavern Network",
    "Tomb & Catacomb",
    "Mine & Shafts",
  ],
  currentStates: [
    "Occupied Stronghold",
    "Abandoned Ruins",
    "Overrun by Squatters",
    "Sealed Vault",
    "Active Monster Lair",
    "Buried & Forgotten",
  ],
  sampleTitles: [
    "The Drowned Anchorage of Gull's Teeth",
    "Blackwater Hold Beneath the Headland",
    "The Careening Caves of Mourn Reach",
    "Sunken Magazine of the Iron Tide",
    "The Shareout Hall of Cutter's Rest",
  ],
  builders: [
    "a captain who wanted somewhere the navy could not follow",
    "a smuggling consortium of three rival crews",
    "a shipwright's guild working well outside the law",
    "a mutinous fleet that never sailed home",
    "a harbourmaster taking coin from both sides",
  ],
  originalUses: [
    "a hidden anchorage for a fleet with no home port",
    "a powder magazine kept well away from any town",
    "a shareout hall where a season's plunder was divided",
    "a careening berth for hulls that could not be seen",
    "a bolt-hole stocked against the day the navy came",
  ],
  // Shared purpose wording assumes land campaigns and standing institutions;
  // reframe the borrowed purposes in nautical terms.
  originalUsesByPurpose: {
    "Fortress & Citadel": [
      "a shore battery covering the only safe approach",
      "a stronghold holding a channel no navy could force",
      "a fortified anchorage for a fleet with nowhere legitimate to berth",
      "a gun position sited to rake anything entering the bay",
    ],
    "Prison & Vault": [
      "a strongroom for a season's plunder, sealed between voyages",
      "a brig for prisoners worth more ransomed than drowned",
      "a lock-up for hostages awaiting a payment that was slow in coming",
      "a bullion store the crew trusted more than any bank ashore",
    ],
    "Tomb & Catacomb": [
      "a burial cave for crew who could not be given to the sea",
      "a captain's barrow above the tideline, cut by his own men",
      "an ossuary for a fleet's dead, filled one voyage at a time",
      "a grave-cut for those the articles said were owed better",
    ],
    "Mine & Shafts": [
      "a quarry cut for ballast stone and shot",
      "a working chasing a seam the crew hoped would fund a pardon",
      "a shaft driven for saltpetre to keep the magazine stocked",
      "a dig opened by a crew who had run out of ships to take",
    ],
    "Natural Cavern Network": [
      "a sea-cave system adapted into a hidden berth",
      "a tidal warren the crew learned to navigate blind",
      "a cavern chain sounded out and charted over three seasons",
      "a natural anchorage nobody ashore knew existed",
    ],
  },
  entrances: [
    "a sea cave passable only at low tide",
    "a cleft in the headland behind a curtain of spray",
    "a rotted jetty leading into the cliff face",
    "a wrecked hull driven bow-first into the rock",
    "a bilge hatch in a beached ship, half-buried in shingle",
  ],
  compositions: [
    "salt-eaten timber salvaged from a dozen broken ships",
    "sea-cave limestone hung with dripping weed",
    "ballast stone and tar, laid by hands that knew no masonry",
    "hulls scuttled deliberately and built over",
    "coral-crusted brick below the tideline, dry stone above",
  ],
  conditions: [
    "flooded to the knee at every high tide",
    "loud with surf echoing through the lower galleries",
    "crusted white with salt and picked over by gulls",
    "shored up with spars and rope by whoever holds it now",
    "listing where the sea has undercut its foundations",
  ],
  causes: [
    "a share-out that ended in knives",
    "a naval sweep that took half the crew and missed the rest",
    "a storm that closed the seaward entrance for a decade",
    "a captain who sailed off and simply never returned",
    "a betrayal for a pardon that was never honoured",
  ],
  sectors: [
    {
      name: "The Tidal Landing",
      description:
        "A slick stone quay that vanishes twice a day, hung with rusted mooring rings.",
    },
    {
      name: "The Shareout Hall",
      description:
        "A long chamber of trestle tables and tally-marks scored deep into the wood.",
    },
    {
      name: "The Powder Magazine",
      description:
        "A dry vault set apart from the rest, its door sheathed in copper against sparks.",
    },
    {
      name: "The Careening Berth",
      description:
        "A cavern dock where a half-stripped hull still rests on rotting cradles.",
    },
    {
      name: "The Drowned Gallery",
      description:
        "A flooded passage where the water never fully drains and something moves below it.",
    },
    {
      name: "The Captain's Quarter",
      description:
        "A panelled room prised out of a ship's stern and fitted into the rock.",
    },
  ],
  inhabitants: [
    "A crew that never left, grown feral and territorial in the dark.",
    "A smuggling ring using the cove exactly as its builders intended.",
    "A press-ganged remnant who murdered their officers and stayed.",
    "A colony of grasping deep-crabs nesting in the flooded galleries.",
    "A marooned quartermaster and the handful still loyal to him.",
  ],
  factionNames: [
    "the Tideless Crew",
    "the Blackwater Smugglers",
    "the Marooned Remnant",
    "the Gull's Teeth Wreckers",
    "the Press-Gang Deserters",
    "the Deep-Crab Swarm",
    "the Shareout Claimants",
    "the Revenue Men",
    "the Cutter's Rest Holdouts",
    "the Drowned Watch",
  ],
  secrets: [
    "The share-out was never completed — the largest portion is still walled up where it was hidden.",
    "The wreck in the careening berth is a navy vessel, and its loss was blamed on someone else entirely.",
    "The captain everyone believes drowned is alive, and holds the only chart out through the reef.",
    "A pardon signed for the whole crew was hidden rather than delivered, and it is still valid.",
    "The cove connects to a sea cave the navy has been searching for since the war.",
    "The articles the crew signed are still binding, and one signatory now sits on the admiralty board.",
    "The cove has a second mouth that opens only on a storm surge.",
    "The fleet's best navigator was murdered here; her charts were never found because she hid them well.",
  ],
  hazards: [
    "Galleries that flood without warning when the tide turns.",
    "Rotted decking laid over an open shaft to the water below.",
    "Damp powder kegs that will still take a spark.",
    "Barnacled rope-bridges over a surge channel.",
    "A collapsing sea-arch that groans with every swell.",
  ],
  treasures: [
    "A sea chest of mixed foreign coin, still under three separate locks.",
    "A chart marking a passage through the reef that no admiralty map shows.",
    "A cased pair of duelling pistols, silver-chased and unfired.",
    "A bolt of stolen silk, somehow kept dry for twenty years.",
    "A signed letter of marque that would make its bearer legitimate overnight.",
    "A whalebone boatswain's whistle that carries far further than it has any right to.",
    "A sealed ledger recording which ports took the crew's coin and asked nothing.",
    "A brass-bound spyglass ground finer than any naval issue.",
  ],
  hooks: [
    "A dying sailor sells directions to the cove for the price of his passage home.",
    "The revenue service is offering a share of anything recovered to whoever gets there first.",
    "A merchant wants a specific chest back and is not interested in the rest of it.",
    "Wreckers have been luring ships onto the reef, and the lights come from inside the headland.",
    "A pardoned pirate needs proof of her innocence, and it was left in the shareout hall.",
  ],
  signatureFeatures: [
    "The Tide Bell: A ship's bell mounted in the rock that rings on the incoming surge, whether anyone pulls it or not.",
    "The Grounded Stern: An entire ship's aftcastle driven into the cavern wall and repurposed as living quarters.",
    "The Reef Window: A gap in the sea cave through which the whole reef is visible, and every wreck on it.",
    "The Tally Wall: A cavern face scored with twenty years of shares owed, unpaid, and settled in blood.",
    "The Salt Chapel: A niche of bleached driftwood icons where a godless crew hedged its bets.",
  ],
};
