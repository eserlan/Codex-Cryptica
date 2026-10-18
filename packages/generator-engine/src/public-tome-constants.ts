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
    {
      description:
        "A passage scraped away beneath a second coat of red pigment",
      unit: "passage",
      count: 1,
    },
    {
      description: "Seven pages darkened by smoke without any material removed",
      unit: "pages",
      count: 7,
    },
    {
      description: "The lower margin of a diagram abraded by repeated folding",
      unit: "margin",
      count: 1,
    },
    {
      description: "One additional leaf inserted by a later annotator",
      unit: "leaf",
      count: 1,
    },
  ],
  damageProfilesByFormat: {
    roll: [
      {
        description:
          "The final handspan of the parchment strip torn away at a join",
        unit: "strip",
        count: 1,
      },
      {
        description: "Three lines scraped from the outer winding of the roll",
        unit: "lines",
        count: 3,
      },
      {
        description:
          "Two stitched parchment panels scorched but still attached",
        unit: "panels",
        count: 2,
      },
      {
        description:
          "A later vellum strip stitched over the original closing formula",
        unit: "strip",
        count: 1,
      },
    ],
    tablets: [
      {
        description:
          "One wax tablet erased and recut, leaving the original strokes faintly visible",
        unit: "tablet",
        count: 1,
      },
      {
        description: "A snapped hinge connecting the third and fourth tablets",
        unit: "hinge",
        count: 1,
      },
      {
        description: "A later layer of wax concealing four original lines",
        unit: "layer",
        count: 1,
      },
    ],
    sheaves: [
      {
        description: "Two loose sheets missing from the numbered sheaf",
        unit: "sheets",
        count: 2,
      },
      {
        description: "Three sheets out of sequence with conflicting foliation",
        unit: "sheets",
        count: 3,
      },
      {
        description: "A forged replacement sheet inserted into the bundle",
        unit: "sheet",
        count: 1,
      },
    ],
  },
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
          "The amended third chapter instructs the celebrant to pour consecrated water onto a newly sealed river-clay spirit vessel",
        deception:
          "The temple censor substituted a washing rite for the original dry-curing instruction; consecrated water ruptures the vessel",
        truth:
          "Shape the vessel from virgin river-clay, leave it to cure in open air for two nights, and seal the name on the third",
        clue: "A scorch beside the amended line overlays pale clay residue and a scratched instruction to let the vessel dry",
      },
      {
        claim:
          "The centrefold labyrinth map tells entrants to follow its printed lateral turns exactly",
        deception:
          "The guild cartographer reflected the passage plan across the north-south axis, exchanging east and west while preserving north and south",
        truth:
          "Keeping north and south fixed, exchange every east and west turn to avoid the deadfalls along the false route",
        clue: "The margin's compass preserves the north and south labels but visibly exchanges east and west; a surviving survey line confirms the reflection",
      },
      {
        claim:
          "The royal mortuary register records that the last heir was cremated at the winter solstice",
        deception:
          "The officiant forged the cremation certificate to conceal an heir raised under an unrelated family name",
        truth:
          "The heir survived and was fostered beyond the court's jurisdiction; the true identity can be proven from matching birthmarks and dated service rolls",
        clue: "The charcoal purchase entry for the cremation is dated two weeks after the listed funeral, while a nurse's signed ledger records the child's departure",
      },
      {
        claim:
          "An apothecary's manuscript asserts that powdered moonstone cures the river-plague",
        deception:
          "The physician swapped the names of the curative and poisonous minerals to protect a commercial monopoly",
        truth:
          "Only the grey shale infusion calms the fever; the silver moonstone powder causes temporary paralysis",
        clue: "The original herbarium illustration shows an unmistakable dark shale vein beneath a scraped silver caption",
      },
      {
        claim:
          "The abbey's tide calendar declares the causeway traversable at the sixth evening bell",
        deception:
          "An abbot moved the reference bell by one watch to keep strangers from reaching the island shrine",
        truth:
          "The passage is exposed only during the previous watch's falling tide, and the sixth bell now sounds after the path floods",
        clue: "A centuries-old bell schedule and barnacle marks on the old milepost disagree with the later annotated tide table",
      },
      {
        claim:
          "The siege chronicle claims the western bastion fell to enemy mining",
        deception:
          "The engineer hid a deliberate structural failure ordered by the royal chamberlain",
        truth:
          "The bastion was sabotaged from inside to close an escape tunnel used by the palace household",
        clue: "The masonry cut marks point outward and the expense ledger pays the chamberlain's quarrymen after the siege",
      },
      {
        claim:
          "A liturgical commentary teaches that the bound guardian must be addressed by its ceremonial title",
        deception:
          "A copyist reversed the order of the guardian's oath and its release formula, giving the title the force of a command",
        truth:
          "The guardian recognises its original service name before the oath, and the ceremonial title awakens its defence instead",
        clue: "A marginal acrostic records the older name and predates the corrected rubric in noticeably different ink",
      },
      {
        claim:
          "The pilgrim's star atlas places the forgotten sanctuary beneath the winter constellation",
        deception:
          "A priest transposed the names of the summer and winter sky sectors to hide the sanctuary's location",
        truth:
          "The sanctuary lies beneath the summer rising of the same asterism; following the winter bearings leads to an empty ridge",
        clue: "A dated eclipse observation could only have been made under summer skies at the recorded latitude",
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
