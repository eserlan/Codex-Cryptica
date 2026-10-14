/**
 * Shared constants for the Tome / Forbidden Book generator.
 * Used by both the public SEO surface and the in-vault AI generator.
 */

export const tomeConfig = {
  tomeTypes: [
    "Grimoire / Spellbook",
    "Occult Treatise / Cosmology",
    "Personal Diary / Journal",
    "Research Log / Field Notes",
    "Historical Chronicle / Heresy",
    "Ritual Manual / Liturgy",
    "Anomalous / Alien Codex",
  ],
  tomeTypesByTheme: {
    "Classic Fantasy": [
      "Grimoire / Spellbook",
      "Arcane Compendium",
      "Lost Religious Liturgy",
      "Wizard's Research Journal",
    ],
    Pirate: [
      "Navigator's Forbidden Rutier",
      "Cursed Captain's Log",
      "Smuggler's Coded Almanac",
      "Witch-Doctor's Grimoire",
    ],
    "Cyberpunk / Corporate": [
      "Leaked Research Log",
      "Black-Clinic Patient Ledger",
      "Cryptographic Manifesto",
      "CEO's Personal Datapad",
    ],
    "Vampire / Gothic Noir": [
      "Family Confession & Journal",
      "Inherited Bloodline Chronicle",
      "Forbidden Correspondence",
      "Coroner's Suppressed Diary",
    ],
    "Cosmic Horror": [
      "Blasphemous Translation",
      "Astronomical Heresy",
      "Cult Liturgy & Rites",
      "Madman's Field Notebook",
    ],
    "Sci-Fi / Space Opera": [
      "Precursor Data-Slate",
      "Derelict Telemetry Log",
      "Anomalous Biology Atlas",
      "Banned Cybernetic Schematic",
    ],
    "Modern Conspiracy": [
      "Classified Research Dossier",
      "Suppressed Academic Thesis",
      "Surveillance Logs & Coded Memos",
      "Cult Pamphlet & Testimonies",
    ],
    "Post-Apocalyptic": [
      "Pre-Collapse Survival Journal",
      "Bunker Maintenance Log",
      "Irradiated Field Atlas",
      "Prophet's Scrapbook",
    ],
    "Western / Frontier": [
      "Surveyor's Expedition Diary",
      "Ghost Town Ledger",
      "Outlaw's Coded Journal",
      "Preacher's Heretical Testament",
    ],
    Steampunk: [
      "Disgraced Inventor's Blueprints",
      "Aetheric Research Folio",
      "Forbidden Mechanist Journal",
      "Royal Society Blacklist",
    ],
    Lancer: [
      "Corpro-State Black Project File",
      "Subaltern Maintenance Protocol",
      "Non-Human Telemetry Transcript",
      "Decommissioned Pilot's Journal",
    ],
    "Space Opera Resistance": [
      "Rebel Cryptographic Codices",
      "Imperial Suppression Records",
      "Astrogator's Smuggled Charts",
      "Dissident's Manifesto",
    ],
    "Optimistic Exploration Sci-Fi": [
      "First Contact Sensor Archive",
      "Expedition Scientific Log",
      "Xenobotanical Field Sketchbook",
      "Survey Mission Debriefing",
    ],
  } as Record<string, string[]>,
  formats: [
    "Illuminated Vellum Folio",
    "Leather-bound Quarto",
    "Pocket Field Notebook",
    "Bound Loose-leaf Sheaves",
    "Redacted Printed Octavo",
    "Scorched Parchment Roll",
  ],
  rarities: [
    "Unique Original Manuscript",
    "Suppressed Pirated Edition",
    "Corrupted Fragmentary Translation",
    "Censored Institutional Copy",
    "One of Three Known Survivors",
  ],
  custodians: [
    "Private Collector's Vault",
    "University Restricted Archive",
    "Forgotten Estate Attic",
    "Active Cult / Secret Society",
    "Cathedral / Temple Undercroft",
    "Estate Sale / Black Market Auction",
  ],
  /**
   * Theme-specific overrides for lists that otherwise carry real-world
   * material (printed editions, universities, Greek manuscripts). A theme
   * without an entry uses the shared list above.
   */
  formatsByTheme: {
    "Classic Fantasy": [
      "Illuminated Vellum Folio",
      "Leather-bound Quarto",
      "Hand-copied Pilgrim's Codex",
      "Bound Loose-leaf Sheaves",
      "Scorched Parchment Roll",
      "Wax-tablet Ledger",
    ],
  } as Record<string, string[]>,
  raritiesByTheme: {
    "Classic Fantasy": [
      "Unique Original Manuscript",
      "Unlicensed Scriptorium Copy",
      "Corrupted Fragmentary Translation",
      "Censored Temple Copy",
      "One of Three Known Survivors",
    ],
  } as Record<string, string[]>,
  custodiansByTheme: {
    "Classic Fantasy": [
      "Private Collector's Vault",
      "Chartered Library of a Free City",
      "Forgotten Estate Attic",
      "Active Cult / Secret Society",
      "Cathedral / Temple Undercroft",
      "Smugglers' Auction House",
    ],
  } as Record<string, string[]>,
  languagesByTheme: {
    "Classic Fantasy": [
      "Old High Elvish",
      "Court Cipher of the Fallen Crown",
      "Temple Liturgical Tongue",
      "Dwarven Rune-script",
      "Obscure Cipher / Shorthand",
      "Parallel Dual-Language Translation",
    ],
  } as Record<string, string[]>,
  primaryHazards: [
    "Physical / Environmental Hazard",
    "Social / Investigation Risk",
    "Mental / Obsessive Toll",
    "Supernatural / Entity Attraction",
  ],
  languages: [
    "Archaic Latin",
    "High Gothic / Old Vernacular",
    "Classical Greek / Byzantine",
    "Obscure Cipher / Shorthand",
    "Parallel Dual-Language Translation",
    "Precursor / Alien Glyphs",
  ],
  sampleTitlesByTheme: {
    "Classic Fantasy": [
      "The Seven Keys of the Ashen Sovereign",
      "Compendium of Transmuted Soils",
      "The Liturgy of the Unwept Queen",
      "Treatise on the Third Gate",
    ],
    "Cosmic Horror": [
      "The Drowned Liturgy of Saint Jude-in-the-Fens",
      "Astronomical Notes on the Void Behind Aldebaran",
      "Testament of the Silt Covenant",
      "De Vermis Subterraneis (Fragmentary 1684 Octavo)",
    ],
    "Vampire / Gothic Noir": [
      "The Confessions of Julian Blackwood (1812)",
      "Anatomical Studies of the House of Valois",
      "The Redacted Diary of Sister Beatrice",
      "Ledger of the Forgotten Bloodlines",
    ],
    "Modern Conspiracy": [
      "Operation Deep Threshold: Field Debriefing (1967)",
      "Project Chiron: Suppressed Neurological Findings",
      "The Coded Papers of Dr. Henry Mercer",
      "Transcript of the November Interrogations",
    ],
    "Sci-Fi / Space Opera": [
      "Telemetry from Derelict Beacon Echo-7",
      "Anomalous Translation of the Cygnus Monolith",
      "The Archival Core of the Voidfarer",
      "Precursor Biological Substrates: Specimen Atlas",
    ],
  } as Record<string, string[]>,
  damageProfiles: [
    {
      description:
        "Three leaves excised with a sharp blade from the second quire",
      unit: "leaves",
      count: 3,
    },
    {
      description:
        "A single missing gathering (eight leaves) removed from the centre of the volume",
      unit: "gathering",
      count: 1,
    },
    {
      description:
        "Four consecutive pages scraped down to the vellum and overwritten in later red ink",
      unit: "pages",
      count: 4,
    },
    {
      description:
        "Two detached leaves removed before the binding was restitched by a later owner",
      unit: "leaves",
      count: 2,
    },
    {
      description:
        "One severed signature of twelve leaves missing from the third section",
      unit: "signature",
      count: 1,
    },
  ],
  locationsByTheme: {
    "Cosmic Horror": [
      "The drowned chancel of Saint Jude-in-the-Fens",
      "The subterranean cistern beneath Saint Orra's Undercroft",
      "The abandoned salt-wharf at Blackwater Reach",
      "The solitary bell-tower on Monk's Ridge",
    ],
    "Classic Fantasy": [
      "The crypt beneath the High Keep of Morvath",
      "The sunken reliquary of the Ashen Abbey",
      "The collapsed observatory in the Crag of Weeping",
      "The submerged library of Old Vorst",
    ],
    "Vampire / Gothic Noir": [
      "The sealed mausoleum of the House of Valois",
      "The flooded charnel house behind Saint Jude's Chapel",
      "The bricked-up cellar of Blackwood Manor",
      "The anatomical theatre at the Old Infirmary",
    ],
    "Modern Conspiracy": [
      "The decommissioned radar bunker at Site 14",
      "Sub-basement Level 4 of the Mercer Institute",
      "The sealed archival wing of the County Sanatorium",
      "The cold storage vault beneath the rail terminal",
    ],
    "Sci-Fi / Space Opera": [
      "The derelict telemetry bay of Station Echo-7",
      "Sub-deck 19 of the colony seed-ship Nadir",
      "The pressurised airlock chamber on Asteroid 414",
      "The submerged datavault on Kepler-IV",
    ],
    Steampunk: [
      "The sub-level boiler chamber of the Royal Mechanical Mint",
      "The flooded clocktower mechanism at the Grand Viaduct",
      "The abandoned galvanic laboratory beneath Iron Wharf",
      "The sealed pneumatics gallery at the Brass Exchange",
    ],
    "Western / Frontier": [
      "The collapsed mine shaft at Dead Mule Gulch",
      "The scorched vestry of the border mission chapel",
      "The cellar beneath the abandoned stagecoach way-station",
      "The dry wash cave above Arroyo Seco",
    ],
    "Post-Apocalyptic": [
      "The reinforced fallout vault beneath Sector 9",
      "The irradiated control silo at Beacon Ridge",
      "The flooded drainage tunnels of the pre-war reservoir",
      "The sealed preservation chamber inside the Old Library",
    ],
    Pirate: [
      "The sea-cave beneath Dead Man's Point",
      "The sunken hold of the galleon San Cristóbal",
      "The quarantined lazaretto on Isla de la Niebla",
      "The smuggler's cove at Smuggler's Cut",
    ],
    "Cyberpunk / Corporate": [
      "The abandoned cleanroom at Sub-Level 6 of the corporate sprawl",
      "The black-clinic operating suite beneath Neon Alley",
      "The chilled server vault inside the decommissioned transit station",
      "The penthouse records room of the former Ren-Shen Tower",
    ],
    Lancer: [
      "The derelict subaltern cradle at Outpost Karrakin-7",
      "The unmapped sub-ventilation shaft of the blink gate anchor",
      "The cold storage bay of the abandoned Harrison Armory depot",
      "The scorched cockpit module inside Crater Basin",
    ],
    "Space Opera Resistance": [
      "The smuggling alcove inside Asteroid Mining Bay 9",
      "The false maintenance conduit behind Imperial Docking Arm 3",
      "The decommissioned comms relay in the Outer Kuiper Belt",
      "The hidden sub-level of the provincial fuel depot",
    ],
    "Optimistic Exploration Sci-Fi": [
      "The survey laboratory module on Planetary Outpost Alpha",
      "The botanical specimen habitat in Biosphere 3",
      "The planetary core seismic sensor station",
      "The ancient communication monolith on Valley Floor 2",
    ],
  } as Record<string, string[]>,
  deceptionProfilesByTheme: {
    "Cosmic Horror": [
      {
        claim:
          "Page 68 asserts that the tenth seal is the final ward securing the subterranean threshold",
        deception:
          "The tenth seal is an authorising release trigger, not a restraining ward",
        truth:
          "Nine wards bind the threshold; breaking the tenth dissolves the barrier and frees the entity entirely",
        clue: "A marginal note in faded red ochre noting an author error between the parish register and the chapter heading",
      },
      {
        claim:
          "The text directs the celebrant to invert the final prayer chant to appease the presence beneath the chancel",
        deception:
          "Inverting the liturgical verses inverts the sealing, pacifying the entity for only an hour while drawing it closer to the surface",
        truth:
          "The entity cannot be appeased by prayer; it must be turned aside by cold iron and salt-flame",
        clue: "The author's journal records three deaths on the exact evening he claimed the ritual succeeded",
      },
      {
        claim:
          "The cipher notes across pages 41-44 list the names of historical funeral witnesses",
        deception:
          "The names were tipped in by a later ecclesiastical censor to mask a set of celestial coordinates",
        truth:
          "Counting the syllables in the third name yields the true calendar date of the equinoctial conjunction",
        clue: "One listed funeral witness died twenty years after the manuscript was officially accessioned",
      },
    ],
    "Classic Fantasy": [
      {
        claim:
          "The third chapter instructs the caster to quench the soul-forged blade in consecrated water",
        deception:
          "Consecrated water violently shatters the containment matrix and releases the bound spirit into the room",
        truth:
          "The vessel requires virgin river-clay and slow air-cooling over three nights",
        clue: "A scorch mark on page 42 where the author's previous apprentice attempted the quenching",
      },
      {
        claim:
          "The labyrinth map on the centerfold shows the only safe route through the lower vaults",
        deception:
          "The map was deliberately mirrored by the guild architect to trap unauthorised intruders",
        truth:
          "Reversing all left and right turns navigates the true gallery without tripping the deadfall traps",
        clue: "The compass rose in the margin points west rather than north",
      },
    ],
    "Vampire / Gothic Noir": [
      {
        claim:
          "The family chronicle states that the direct bloodline perished without heirs during the winter epidemic",
        deception:
          "The lineage was concealed by the family physician who falsified the parish mortality roll",
        truth:
          "The sole surviving heir was placed in the care of the county orphanage under an assumed maternal surname",
        clue: "A tipped-in baptismal leaf whose wax seal was applied over scraped, bleached parchment",
      },
    ],
    "Modern Conspiracy": [
      {
        claim:
          "The inquiry report concludes that the telemetry blackout was caused by an unexpected cooling pump failure",
        deception:
          "The telemetry record was rewritten during the inquiry to cover a deliberate containment purge order",
        truth:
          "Sub-routine 04-Delta executed a remote system lock six hours before the installation went silent",
        clue: "A twelve-minute gap between the digital timestamp on the log and the duty officer's signed manifest",
      },
    ],
    "Sci-Fi / Space Opera": [
      {
        claim:
          "The navigational chart marks Sector 9 as barren debris unsuitable for orbital survey",
        deception:
          "The navigational data was corrupted by corporate cartographers to hide an intact precursor transit ring",
        truth:
          "Approaching the sector along the solar ecliptic reveals the dormant jump gate intact",
        clue: "A checksum error in the sensor log indicating manual data injection prior to archive transfer",
      },
    ],
    Pirate: [
      {
        claim:
          "The navigator's rutier marks a deep-water passage through the reef at high tide",
        deception:
          "The passage was charted during an exceptional spring flood and grounds vessels drawing more than eight feet",
        truth:
          "The true channel lies two hundred yards west through the breakers marked by the sea-arch",
        clue: "A salinity reading recorded in the captain's log that contradicts the chart's depth markings",
      },
    ],
    "Cyberpunk / Corporate": [
      {
        claim:
          "The clinic ledger reports that the neural implant trial had zero neurological fatalities",
        deception:
          "The patient mortality records were scrubbed by the project director and moved to an offline ledger",
        truth:
          "Nine test subjects suffered total cortical burn within forty-eight hours of installation",
        clue: "A sequential gap between patient identification numbers 1404 and 1414",
      },
    ],
    Lancer: [
      {
        claim:
          "The telemetry transcript attributes the mech frame cascade to pilot combat psychosis",
        deception:
          "The frame's non-human sub-entity overrode manual controls to trigger an unlogged blink jump",
        truth:
          "The pilot attempted a manual reactor scram that was countermanded by corpro firmware",
        clue: "A cycle-count discrepancy of two microseconds on the black-box clock",
      },
    ],
    "Space Opera Resistance": [
      {
        claim:
          "The smuggled codex lists seven operational resistance cells active across the sector",
        deception:
          "Two of the listed cells were established as honey-traps by Imperial counter-intelligence",
        truth:
          "Only five cells are genuine; contacting the two traps triggers an automated arrest beacon",
        clue: "The call-signs for the false cells use an Imperial phonetic alphabet instead of regional dialect",
      },
    ],
    "Optimistic Exploration Sci-Fi": [
      {
        claim:
          "The survey log classifies the crystalline flora as non-sentient organic mineral formations",
        deception:
          "The flora responds actively to sonic resonance and radio emissions from exploration gear",
        truth:
          "The flora forms a distributed planetary neural network that shifts growth toward survey camps",
        clue: "A marginal spectral analysis note recording rhythmic bio-luminescent pulses during night cycles",
      },
    ],
  } as Record<
    string,
    Array<{
      claim: string;
      deception: string;
      truth: string;
      clue: string;
    }>
  >,
};
