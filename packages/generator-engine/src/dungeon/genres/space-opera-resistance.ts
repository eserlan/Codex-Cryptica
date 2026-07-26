import type { DungeonGenreTables } from "../genre-types";

export const spaceOperaResistanceTables: DungeonGenreTables = {
  hint: "Focus on hidden cell bases inside asteroids and moon crust, requisitioned imperial outposts, smuggled-supply caches, comms relays run on stolen codes, and safehouses one betrayal from being blown.",
  purposes: [
    "Fortress & Citadel",
    "Data Vault & Archive",
    "Prison & Vault",
    "Research Facility",
    "Mine & Shafts",
    "Natural Cavern Network",
  ],
  currentStates: [
    "Occupied Stronghold",
    "Overrun by Squatters",
    "Abandoned Ruins",
    "Sealed Vault",
    "Still Operational",
    "Buried & Forgotten",
  ],
  sampleTitles: [
    "Cell Base Ashfall, Third Moon",
    "The Requisitioned Relay at Korren Deep",
    "Cache Point Nine, Asteroid Belt Grey",
    "The Blown Safehouse of Tannic Reach",
    "Listening Post Ember, Off-Register",
  ],
  builders: [
    "a resistance cell that dug in and never expected to leave",
    "a defecting supply officer who diverted an entire shipment",
    "an occupied world's last legitimate government, going underground",
    "a smuggling ring who rented the space to the cause",
    "a mining crew who joined the fight and brought their equipment",
  ],
  originalUses: [
    "a cell base for a cadre that never numbered more than thirty",
    "a supply cache stocked from a single diverted convoy",
    "a comms relay running on codes stolen from the occupation",
    "a safehouse chain's last uncompromised node",
    "a field infirmary for casualties who could not go to a hospital",
  ],
  entrances: [
    "a mining bore repurposed and fitted with a false rock face",
    "a docking clamp on the shadowed side of an asteroid",
    "a cargo hatch beneath a legitimate freight depot",
    "a crawl-tube behind a decommissioned atmosphere processor",
    "a maintenance shaft under an occupation checkpoint, dug from below",
  ],
  compositions: [
    "raw asteroid rock sealed with sprayed polymer",
    "cargo containers welded end to end and buried",
    "requisitioned imperial prefab, insignia ground off every panel",
    "salvaged hull sections braced with mining scaffold",
    "compacted regolith lined with stolen radiation matting",
  ],
  conditions: [
    "still crewed and running at minimum emissions",
    "evacuated in an hour, with everything heavy left behind",
    "stripped by the occupation and left as a warning",
    "cold and dark on emergency power to stay off scanners",
    "reoccupied by people who have no idea what it was",
  ],
  causes: [
    "an informant who gave up the location for a family's passage out",
    "a raid that took the cadre and missed the archive",
    "a supply line that was cut and never re-established",
    "a leadership split that emptied the base in a week",
    "an orbital sweep that came close enough to force an evacuation",
  ],
  sectors: [
    {
      name: "The False Face",
      description:
        "An entry chamber disguised as worked-out mining, tools staged for inspection.",
    },
    {
      name: "The Cadre Bunkroom",
      description:
        "Stacked berths for thirty, personal effects still in most of the lockers.",
    },
    {
      name: "The Cipher Room",
      description:
        "Comms gear and one-time pads, a burn barrel in the corner half-used.",
    },
    {
      name: "The Diverted Cache",
      description:
        "Crates in imperial livery with the manifest seals carefully reapplied.",
    },
    {
      name: "The Infirmary",
      description:
        "Four beds, a surgical light, and a supply cabinet emptied of anything useful.",
    },
    {
      name: "The Scuttle Point",
      description:
        "A charge-rigged junction the cadre would have blown if there had been time.",
    },
  ],
  inhabitants: [
    "The surviving cadre, still holding and still transmitting.",
    "An occupation garrison using the base exactly as its builders did.",
    "Refugee families who found the door open and moved in.",
    "A bounty crew working from the informant's original tip.",
    "A rival cell that claimed the site and will not discuss the previous tenants.",
  ],
  factionNames: [
    "the Ashfall Cadre",
    "the Occupation Garrison",
    "the Tannic Reach Refugees",
    "the Informant's Bounty Crew",
    "the Rival Cell",
    "the Diverted Convoy Crew",
    "the Korren Deep Miners",
    "the Cipher Room Holdouts",
    "the Amnesty Negotiators",
    "the Scuttle Detail",
  ],
  secrets: [
    "The informant who blew this base is still with the movement, and still trusted.",
    "The cipher room holds working codes the occupation has not yet rotated.",
    "The cache was never fully inventoried, and part of it was diverted a second time.",
    "The cadre did not evacuate. They are still here, behind the scuttle point, and they will not open it.",
    "The base was never a resistance asset at all — it was run as a trap from the day it was dug.",
    "The cell's dead-drop is still live, and someone emptied it last week.",
    "The occupation knows about this base and has left it running to see who arrives.",
    "Half the cadre took the amnesty and are living openly two systems away.",
  ],
  hazards: [
    "Scuttle charges still armed on a dead-man circuit.",
    "Emissions discipline: light or heat above threshold calls down an orbital sweep.",
    "Failing seals where asteroid rock meets salvaged hull.",
    "Booby-trapped lockers rigged during the evacuation.",
    "An atmosphere processor running far past service life.",
  ],
  treasures: [
    "A crate of unrotated imperial cipher keys.",
    "A cadre roster naming every surviving cell in the sector.",
    "Medical supplies worth more than currency on an occupied world.",
    "A diverted convoy manifest proving who sold the shipment on.",
    "A functioning long-range transmitter, unregistered and untraceable.",
    "A forged transit authority good enough to move an entire family off-world.",
    "A cache of untraceable credits, split into amounts too small to flag.",
    "A recording of an occupation officer admitting to an order that was never officially given.",
  ],
  hooks: [
    "A cell has gone silent, and the last transmission was a partial evacuation code.",
    "The occupation is auctioning salvage rights to the site next month.",
    "A defector will trade the location of three more caches for extraction.",
    "Refugees living in the base have started disappearing one at a time.",
    "Someone is transmitting on the movement's old codes, and the traffic is wrong.",
  ],
  signatureFeatures: [
    "The Burn Barrel: A comms-room drum of half-charred documents, the top layer added far too recently.",
    "The Sealed Scuttle Point: A blast junction wired from the inside, its charges still showing green.",
    "The Ground-Off Insignia: Requisitioned imperial panelling where the crest has been filed away and still shows through.",
    "The Empty Roster Board: A wall of thirty name-slots with every card removed but one.",
    "The Listening Wall: A rock face fitted with contact microphones, still relaying the sound of the surface above.",
  ],
};
