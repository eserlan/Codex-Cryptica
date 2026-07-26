import type { DungeonGenreTables } from "../genre-types";

export const optimisticSciFiTables: DungeonGenreTables = {
  hint: "Focus on ancient alien research outposts, stellar observation vaults, terraforming hubs, first-contact archives, and derelicts that reward careful study rather than force.",
  purposes: [
    "Research Facility",
    "Data Vault & Archive",
    "Bio-Containment Wing",
    "Natural Cavern Network",
    "Planar Anomaly",
    "Fortress & Citadel",
  ],
  currentStates: [
    "Sealed Vault",
    "Still Operational",
    "Abandoned Ruins",
    "Arcane / Tech Anomaly",
    "Buried & Forgotten",
    "Occupied Stronghold",
  ],
  sampleTitles: [
    "The Long-Quiet Observatory at Kepler's Shoulder",
    "Terraforming Hub Verdance, Cycle Complete",
    "The First-Contact Archive Beneath Halo Flats",
    "Deep-Listening Vault, Station Anvil",
    "The Patient Garden of Outpost Lumen",
  ],
  builders: [
    "a precursor civilisation that left instructions rather than warnings",
    "a survey expedition that stayed longer than its charter allowed",
    "a joint scientific commission of three species",
    "a terraforming authority working on a thousand-year schedule",
    "a xenolinguistics team who built to be understood",
  ],
  originalUses: [
    "an observation vault for a star that was about to change",
    "an archive assembled so a later species could find it",
    "a terraforming hub seeding an atmosphere over centuries",
    "a quarantine garden for biology nobody wanted to lose",
    "a listening post aimed at a signal that took millennia to arrive",
  ],
  // The shared purpose table leans conspiratorial ("research that was
  // officially destroyed", "a study built to contain what it studied"), which
  // is exactly the wrong register for this genre.
  originalUsesByPurpose: {
    "Data Vault & Archive": [
      "an archive assembled so a later species would be able to read it",
      "a library deliberately built to outlast its own civilisation",
      "a record vault indexed in three scripts for whoever came next",
      "a repository of findings offered freely to anyone who arrived",
    ],
    "Research Facility": [
      "a laboratory sited where the observations would be clearest",
      "a shared research annex staffed by three species at once",
      "a field station built to study without disturbing",
      "an experimental hall designed to be handed on intact",
    ],
    "Bio-Containment Wing": [
      "a quarantine garden preserving a biology that had nowhere else to go",
      "a conservation wing for species whose homeworld was already lost",
      "an isolation suite built to protect the specimens from us",
      "a curated habitat maintained across a dozen generations",
    ],
    "Fortress & Citadel": [
      "a shelter hardened against a stellar event the crew knew was coming",
      "a refuge built to keep a research population safe for centuries",
      "a redoubt against the weather of a world still being terraformed",
      "a secure station sited where no rescue could reach quickly",
    ],
  },
  entrances: [
    "an iris valve that opens for anyone who approaches unarmed",
    "a landing apron overgrown with engineered lichen",
    "a transparent shaft descending through a sinkhole of blue ice",
    "a docking spine still broadcasting a welcome in nine languages",
    "a stair cut for legs that were not quite the right shape",
  ],
  compositions: [
    "a self-repairing ceramic that has never needed maintenance",
    "grown crystal lattice, warm and faintly translucent",
    "smooth alloy joined without a single visible seam",
    "living wood-analogue cultivated into load-bearing arches",
    "layered basalt fused by a process nobody has reproduced",
  ],
  conditions: [
    "perfectly preserved, lights rising as you enter",
    "quietly continuing a task begun before recorded history",
    "gently overgrown by the garden it was built to protect",
    "silent but intact, waiting to be asked the right question",
    "cycling a welcome sequence to an empty room",
  ],
  causes: [
    "a mission completing successfully and its crew moving on",
    "a scheduled dormancy that has simply run very long",
    "a stellar event the outpost was built to survive and did",
    "a handover to a successor species that never arrived",
    "a decision to wait, recorded plainly and never revisited",
  ],
  sectors: [
    {
      name: "The Welcome Hall",
      description:
        "A bright entry chamber with seating for several body plans and a still-running orientation display.",
    },
    {
      name: "The Observation Vault",
      description:
        "A domed room open to the sky, instruments tracking objects long since moved.",
    },
    {
      name: "The Patient Garden",
      description:
        "A terraced hydroponic terrace where engineered species have quietly kept growing.",
    },
    {
      name: "The Archive Stacks",
      description:
        "Crystal lattice storage arranged for a reader who has not arrived yet.",
    },
    {
      name: "The Atmosphere Works",
      description:
        "Vast slow machinery still adjusting a planetary mix by fractions of a percent.",
    },
    {
      name: "The Quiet Room",
      description:
        "An unlit chamber, deliberately empty, its purpose recorded nowhere.",
    },
  ],
  inhabitants: [
    "A caretaker intelligence delighted to finally have visitors.",
    "A survey team from a nearby colony, three months into a careful catalogue.",
    "Engineered fauna from the garden, curious and entirely unafraid.",
    "A salvage crew who have realised this is worth far more intact.",
    "The last of the original expedition, in dormancy and revivable.",
  ],
  factionNames: [
    "the Outpost Caretaker",
    "the Lumen Survey Team",
    "the Garden Fauna",
    "the Halo Flats Salvage Crew",
    "the Dormant Expedition",
    "the Xenolinguistics Commission",
    "the Colonial Science Council",
    "the Anvil Station Listeners",
    "the Terraforming Authority Remnant",
    "the First-Contact Delegation",
  ],
  secrets: [
    "The archive is not a record of the builders — it is a record of everyone who came before them.",
    "The signal the listening post was waiting for arrived, and the reply has already been sent.",
    "The garden contains a species deliberately preserved because its homeworld was lost.",
    "The dormant crew can be woken, and they left instructions on how to ask.",
    "The quiet room is empty because what it held was successfully released, exactly as planned.",
    "The outpost has been waiting for one specific question, and the answer is already prepared.",
    "The builders left because they succeeded, and the account of what they achieved is on the top shelf.",
    "The garden's caretaker systems have been quietly correcting our surveys for two decades.",
  ],
  hazards: [
    "Atmosphere mixes calibrated for lungs that are not human.",
    "Automated systems that firmly and non-violently escort you out of restricted wings.",
    "Gravity plating tuned to a heavier world in the lower levels.",
    "Engineered pollen that is harmless to the builders and emphatically not to you.",
    "A stellar observation aperture that opens onto unfiltered radiation on a schedule.",
  ],
  treasures: [
    "A crystal archive shard holding a complete xenolinguistic primer.",
    "A seed vault of engineered flora with the germination notes attached.",
    "An observation record of a stellar event no living astronomer witnessed.",
    "A self-repairing ceramic sample that has resisted every attempt at analysis.",
    "A welcome token, offered by the caretaker, that opens every door in the outpost.",
    "A teaching lattice that adapts its explanation to whoever is holding it.",
    "A star chart annotated with four other outposts, all of them still standing.",
    "A gift left explicitly for the first visitor, with a note apologising for the wait.",
  ],
  hooks: [
    "The outpost has begun broadcasting again after centuries, and it is using our languages.",
    "A survey team has stopped reporting, and their last message was simply 'we were wrong about this place'.",
    "A colony needs the atmosphere works restarted before its terraforming stalls.",
    "A salvage claim has been filed, and the science council wants the site protected first.",
    "The caretaker has requested a delegation by name, and nobody knows how it learned the names.",
  ],
  signatureFeatures: [
    "The Rising Light: An entry hall whose illumination gently brightens to match whoever walks in, adjusting for their eyes.",
    "The Open Dome: An observation vault with no visible roof, weather passing overhead without ever falling through.",
    "The Nine-Language Plaque: A welcome inscription in nine scripts, two of which have never been catalogued.",
    "The Slow Machine: Atmosphere works turning so gradually that a full cycle takes a human lifetime.",
    "The Waiting Table: A refectory set for a meal, the settings arranged for guests who were expected and never came.",
  ],
};
