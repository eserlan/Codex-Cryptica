import type { DungeonGenreTables } from "../genre-types";

export const modernConspiracyTables: DungeonGenreTables = {
  hint: "Describe cold-war missile silos, unlisted black sites, bio-hazard containment centres, disused subway vaults, and records rooms that were supposed to have been incinerated.",
  purposes: [
    "Black Site",
    "Fallout Shelter",
    "Research Facility",
    "Bio-Containment Wing",
    "Data Vault & Archive",
    "Prison & Vault",
  ],
  currentStates: [
    "Sealed Vault",
    "Still Operational",
    "Abandoned Ruins",
    "Occupied Stronghold",
    "Buried & Forgotten",
    "Overrun by Squatters",
  ],
  sampleTitles: [
    "Facility 12-K, Decommissioned",
    "The Greyfield Records Annex",
    "Silo Complex Harrow, Unlisted",
    "Sub-Level Containment, Site Bramwell",
    "The Northgate Debriefing Station",
  ],
  builders: [
    "an agency that no longer appears in any organisational chart",
    "a defence contractor operating three shells deep",
    "a joint programme neither government has ever acknowledged",
    "a continuity-of-government office with an unlimited budget",
    "a research directorate that was formally dissolved twice",
  ],
  originalUses: [
    "a debriefing station for personnel officially listed as missing",
    "a records annex for files that were reported destroyed",
    "a containment wing for material recovered from a crash site",
    "a hardened shelter for a command structure that never convened",
    "an interrogation complex sited outside every applicable jurisdiction",
  ],
  entrances: [
    "a service elevator in a car park with one unmarked button",
    "a blast door behind a decommissioned pumping station",
    "a disused subway platform sealed off in the sixties",
    "a maintenance hatch under a municipal water tower",
    "a farmhouse cellar with a great deal more concrete than it needs",
  ],
  compositions: [
    "poured concrete two metres thick, rebar showing at the seams",
    "lead-lined panelling behind institutional green paint",
    "blast-rated steel bulkheads on hydraulic hinges",
    "acoustic tile and fluorescent housings, all of it identical",
    "copper mesh set into every wall to kill any signal",
  ],
  conditions: [
    "sealed since the programme was wound up",
    "still drawing municipal power on a line nobody audits",
    "stripped of hardware but not of paperwork",
    "kept at temperature by a system with no listed maintainer",
    "flooded at the lowest level where the sump pumps failed",
  ],
  causes: [
    "a congressional inquiry that got closer than anyone expected",
    "a containment event redacted out of every subsequent report",
    "a budget line that was quietly zeroed mid-fiscal-year",
    "a defection that compromised the entire programme in a weekend",
    "an order to sanitise the site that was only half carried out",
  ],
  sectors: [
    {
      name: "The Security Vestibule",
      description:
        "A double-gated airlock with a guard desk, its logbook open to a torn-out page.",
    },
    {
      name: "The Records Annex",
      description:
        "Compactor shelving on rails, most bays empty, a few still locked and full.",
    },
    {
      name: "The Observation Suite",
      description:
        "A row of one-way windows onto rooms that were never meant to be seen into.",
    },
    {
      name: "The Containment Cells",
      description:
        "Sealed chambers with feeding slots and drains, hosed clean and left open.",
    },
    {
      name: "The Server Room",
      description:
        "Racks of period hardware, half of them stripped, cooling still running.",
    },
    {
      name: "The Sump Level",
      description:
        "The lowest floor, ankle-deep and dark, where the pumps stopped decades ago.",
    },
  ],
  inhabitants: [
    "A skeleton caretaker crew still reporting to a chain of command that dissolved years ago.",
    "A cleanup team sent to finish the sanitisation and remove any witnesses.",
    "An investigative journalist and two sources, hiding somewhere on the lower levels.",
    "Automated security still enforcing a clearance list nobody alive is on.",
    "Something from the containment wing that was never successfully removed.",
  ],
  factionNames: [
    "the Caretaker Detail",
    "the Sanitisation Team",
    "the Greyfield Whistleblowers",
    "the Legacy Security System",
    "the Oversight Committee Investigators",
    "the Contractor's Retrieval Unit",
    "the Site Bramwell Subjects",
    "the Northgate Holdovers",
    "the Freelance Document Brokers",
    "the Unlisted Occupant",
  ],
  secrets: [
    "The programme was never shut down; it was moved, and this site is still feeding it data.",
    "The records annex holds the only surviving copy of an authorisation that implicates people still in office.",
    "The containment cells were built to hold people, and the paperwork calls them something else entirely.",
    "The caretaker crew were never told the programme ended, and have kept working for decades.",
    "The site sits directly above something older that the facility was really built to monitor.",
    "The facility appears on a current budget document under a different name.",
    "Every camera in the building is still recording, and the feed terminates somewhere.",
    "One subject listed as deceased has been sending postcards.",
  ],
  hazards: [
    "Blast doors on dead-man timers that seal a wing without warning.",
    "Legacy security turrets running an outdated clearance list.",
    "Asbestos and degraded lead shielding throughout the older wings.",
    "A halon suppression system that will dump on any heat signature.",
    "Standing water on the sump level, live with a shorted power feed.",
  ],
  treasures: [
    "A sealed file box of operational orders that were certified destroyed.",
    "A magnetic tape reel with the only recording of a briefing that never happened.",
    "A cased sidearm and credentials belonging to an officer declared dead abroad.",
    "A specimen container from the containment wing, still intact and still cold.",
    "A ledger of payments linking the programme to three sitting officials.",
    "A courier case under diplomatic seal with no listed origin.",
    "A photograph of six people, five publicly known and one who does not officially exist.",
    "An encryption key still valid on a network decommissioned in the nineties.",
  ],
  hooks: [
    "A journalist has gone dark after arranging to meet a source at the site.",
    "A dying former operative wants a file recovered before the record is buried for good.",
    "The site has started drawing power again, and the utility cannot explain the load.",
    "A cleanup contract has been issued, and the crew is already on the road.",
    "Someone is selling documents that could only have come from inside the records annex.",
  ],
  signatureFeatures: [
    "The Redacted Wall: A corridor-length organisational chart with every name blacked out but one.",
    "The Cold Room: A containment cell held at freezing by a system with no maintenance record and no off switch.",
    "The Faraday Chapel: A copper-meshed room where no signal, radio, or otherwise, has ever been detected leaving.",
    "The Standing Tape Deck: A reel-to-reel machine that rewinds and replays the same nine seconds, unattended.",
    "The Sealed Elevator: A lift shaft continuing well below the lowest floor on any surviving plan.",
  ],
};
