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
};
