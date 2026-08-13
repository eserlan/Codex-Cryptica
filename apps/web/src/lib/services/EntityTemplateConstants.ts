/**
 * Default Entity Template Outline Constants.
 * Leveraged out of the box to pre-populate new world documents instantly.
 */

// GENERIC_TEMPLATES lives in the shared `schema` package so the importer's
// AI extraction prompt can reuse the same section structure. Re-exported
// here for existing consumers of this module.
import { GENERIC_TEMPLATES } from "schema";
export { GENERIC_TEMPLATES };

export const FANTASY_TEMPLATES: Record<string, string> = {
  character: `## Summary
A brief overview of who this character is in this fantasy setting.

## Lineage & Background
Origin, heritage, species, culture, or noble house.

## Appearance & Oaths
Physical description, armor, and active sacred oaths or geases.

## Personality & Voice
Behavioral traits, alignment, core guiding beliefs, speech rhythm, word choice, and in-character behavior rules.

## Knowledge & Expertise
What arcane lore, crafts, or scholarly disciplines does this character know well? What knowledge is beyond their reach — forbidden tomes, lost languages, or skills outside their station?

## Goals & Quests
Active quests they are pursuing or magical relics they seek.

## Magical Affinity
Connection to the arcane, active spells, magical talents, or patron deities.

## Relationships
Key bonds, rivalries, or allegiances to mystical guilds and realms.

## Secrets & Curses
Forbidden lore known, ancient curses, or dark family pacts.

## Story Hooks
Rumors at the local tavern, prophesied encounters, or guild contracts.`,

  faction: `## Summary
A brief overview of the noble house, wizardly guild, or knightly order.

## Creed & Ideology
The founding vows, religious devotion, or philosophical tenets.

## Leadership & Hierarchy
The ruling lords, grand archmages, or elder councils guiding the organization.

## Holdings & Castles
Castles, keeps, cathedral halls, or wizard towers under their control.

## Magical & Martial Resources
Fabled knights, ancient spellbooks, relics, or celestial alignments they command.

## Story Hooks
Quests offered, bounties posted, or dark plots suspected by other factions.`,

  location: `## Summary
A brief description of this kingdom, ancient dungeon, or magical domain.

## Geography & Magic
The climate, terrain, layout, and localized magical conditions (e.g., wild magic zones).

## Points of Interest
Dungeon depths, sacred shrines, royal chambers, or tavern landmarks.

## Local Powers
Which local lords, magical beasts, or dark cults rule this area?

## Lore & Prophecy
Legends, lost histories, or apocalyptic prophecies associated with this site.`,

  item: `## Summary
A brief description of this magical relic, blade, or divine artifact.

## Appearance & Runes
Craftsmanship, engravings, ancient runes, and sensory aura.

## Magical Abilities & Attunement
Spells granted, unique properties, and attunement requirements.

## Prophesied Owner
Legends concerning who is destined to wield this item and why.`,

  event: `## Summary
A brief overview of the legendary battle, coronation, or stellar alignment.

## Chronology & Celestial Phase
When it occurred, under what moon phase, and temporal significance.

## Legendary Figures
Kings, archmages, or dragons who turned the tide of the event.

## Mystical Consequences
How the event fractured empires, awakened ancient curses, or altered the magical leylines.`,

  creature: `## Summary
A brief description of this dragon, wild beast, or elemental spirit.

## Mystical Habitat & Ecology
Where they dwell, their diet (magic/blood), and seasonal behaviors.

## Supernatural Powers & Weaknesses
Breaths, spell resistances, weaknesses to silver/cold-iron, or vulnerability to specific rituals.

## Legends & Lore
The mythic tales told by bards or warning lessons of local rangers.`,

  note: `## Summary
A brief summary of scroll translations, wizard notes, or fables.`,
};

export const SCIFI_TEMPLATES: Record<string, string> = {
  character: `## Summary
A brief overview of this character's profile in the sci-fi expanse.

## Background & Origin
Homeworld, social class, education, or space-faring lineage.

## Appearance & Gear
Physical description, armor, standard loadout, and clothing style.

## Augmentations & Tech
Cybernetic implants, neural links, biotech enhancements, or specialized software.

## Personality & Voice
Behavioral profile, psychological file, philosophical or political alignments, speech rhythm, word choice, and in-character behavior rules.

## Knowledge & Expertise
What technical fields, corporate intelligence, or faction intel does this character have access to? What information is classified, outside their clearance, or simply unknown to them?

## Goals & Agenda
Corporate missions, smuggler runs, or personal vendettas.

## Faction Ties & Reputation
Reputation with megacorps, syndicate networks, rebel cells, or planetary law.

## Secrets
Classified logs, stolen server files, or corporate espionage liabilities.

## Story Hooks
Bounty board listings, encrypted distress signals, or job offers.`,

  faction: `## Summary
A brief overview of the megacorporation, star syndicate, or planetary republic.

## Corporate Charter / Ideology
The commercial goals, military mandates, or stellar philosophies driving them.

## Starships & Fleet Scale
Cruisers, battleships, or carrier fleets commanded.

## Assets & Stellar Holdings
Planetary outposts, space stations, asteroid mines, or corporate research labs.

## Tech Level & Leverage
Advanced weaponry, AI networks, cloning bays, or hyperdrive exclusive tech.`,

  location: `## Summary
A brief description of this planetary sector, space station, or stellar system.

## Orbital Coordinates & Environment
Sector coordinates, gravity Class, atmosphere composition, and terraforming progress.

## Sectors & Station Wards
Hangar bays, neon commercial strips, slums, or command bridges.

## Local Corporations & Syndicates
Who patrols the skies and who operates the black markets below.`,

  item: `## Summary
A brief overview of this stellar tech, starship, or weapons system.

## Manufacturer & Specs
The manufacturing corporation, model, fuel type, and power capacity.

## Integrated Systems & Software
Onboard AI, sensor modules, shields, or hacking suites.

## Maintenance Logs & Ownership
Past pilot profiles, repair status, and custom modifications.`,

  event: `## Summary
A brief overview of the orbital battle, corporate takeover, or hyperspace mishap.

## Stardate & Sector
Coordinates and galaxy timestamp of the event.

## Fleet Commanders
Admirals, corporate executives, or AI units involved in coordinating the event.

## Galactic Aftermath
How it shifted trade routes, violated treaties, or initiated corporate warfare.`,

  creature: `## Summary
A brief description of this alien fauna, space parasite, or cybernetic biomechanoid.

## Xenobiology & Planet
Planetary planet of origin, cellular makeup, and habitat requirements (e.g., zero-G).

## Morphology & Combat Potential
Natural armor, venom types, hunting tactics, and threat tier.

## Scientific Log Notes
Reports from Starfleet exploration logs or corporation research files.`,

  note: `## Summary
A brief overview of decrypted datshards, encrypted terminal logs, or logs.`,
};

export const MODERN_TEMPLATES: Record<string, string> = {
  character: `## Summary
A brief overview of this operative, detective, or criminal subject.

## Background & Cover Identities
Real name vs. active aliases, background, and security clearances.

## Psychological File
Personality, psychological assessments, weaknesses, and stress triggers.

## Personality & Voice
Conversational habits, speech rhythm, word choice, tells under pressure, and in-character behavior rules.

## Knowledge & Expertise
What specialized intelligence, field skills, or insider knowledge does this operative have? What is outside their clearance, or areas where they are deliberately kept in the dark?

## Gear & Assets
Standard firearms, surveillance gear, secure communication devices, and financial backing.

## Secrets & Liabilities
Blackmail records, hidden family ties, or past operations gone wrong.`,

  faction: `## Summary
A brief description of the intelligence agency, cartel, or global corporation.

## Agenda & Assets
Primary objectives, shell corporations, safehouses, and operational funds.

## Hierarchy & Cell Structure
The high-level directors, cell leaders, and local field agents.

## Surveillance & Tactical Capabilities
Infiltration squads, satellite access, hacking abilities, and armaments.`,

  location: `## Summary
A brief description of this city ward, corporate headquarters, or crime scene.

## Infrastructure & Crime
General crime rates, local law enforcement strength, and access points.

## Points of Interest
Safehouses, black markets, underground clubs, or secure server rooms.

## Forensic Log
Clues, wiretap transcripts, or security camera records associated with this place.`,

  item: `## Summary
A brief description of this modern item, classified document, or firearm.

## Specifications & Serial Number
Make, model, caliber/storage size, and serial/part tracking.

## Operational Utility
How it is deployed in field ops, surveillance, or tactical encounters.

## Chain of Custody
Tracking logs of past owners, handlers, or shipping manifests.`,

  event: `## Summary
A brief overview of the heist, political scandal, or tactical raid.

## Timestamp & Timeline
Detailed timeline of events leading up to, during, and after the occurrence.

## Investigators & Perpetrators
Law enforcement, cartel bosses, or secret agents involved.

## Media Cover-up & Spin
How the public was briefed vs. what actually occurred under the table.`,

  creature: `## Summary
A brief description of this urban legend, cryptid, or escaped bioweapon.

## Sightings & Habitat
Historical sightings, mapped encounters, and habitat (e.g., sewers, abandoned facilities).

## Anatomy & Combat Profiling
Physical traits, agility, hunting behavior, and tactical vulnerability.`,

  note: `## Summary
A brief overview of classified case files, wiretap transcripts, or notes.`,
};

export const CYBERPUNK_TEMPLATES: Record<string, string> = {
  character: `## Summary
A brief overview of this Netrunner, Street Samurai, or Fixer.

## Street Handle & Rep
Their street alias, faction reps, and active bounties on their head.

## Cyberware & Chrome
Neural links, cyberdecks, optic overlays, cyberarms, or boosterware installed.

## Loadout & Smartgear
Smart weapons, customized tactical gear, program suites, and armor.

## Net Architecture Exploits
Known icebreaker protocols, target subnets, or hacking backdoors they use.

## Personality & Voice
Street mannerisms, speech rhythm, slang, verbal tells, and in-character behavior rules.

## Knowledge & Expertise
What net architecture, corporate intel, or street knowledge does this character command? What data vaults are above their access tier, or skills they simply lack?

## Corporate Debts & Secrets
Corp contracts signed, active blackmail files, or trauma team plans.`,

  faction: `## Summary
A brief description of this megacorp division, street gang, or hacker collective.

## Corporate Mission / Turf
The corporate branch, market sector, or city turf they hold.

## Subnets & Net Infrastructure
Dedicated servers, customized ICE levels, rogue AI guardians, and hacker handles.

## Black Ops & Strike Teams
Solo mercenaries, specialized netrunners, or bio-drones on payroll.`,

  location: `## Summary
A brief description of this neon-drenched metropolis ward, corpo tower, or net node.

## Neon Atmosphere & Grid
Grid coordinates, corporate pollution, local neon styles, and subnet coverage.

## Local Gangs & Corps
Who patrols the streets and which corporate subsidiary claims ownership.

## Black Clinics & Netcafes
Locations of ripperdocs, netrunner dens, and black-market software merchants.`,

  item: `## Summary
A brief description of this cyberdeck, smart weapon, or illegal software.

## Brand, Model & Firmware
Brand name, deck memory capacity, processor speed, and custom operating system.

## Installed Programs & ICE
ICE, daemons, offensive scripts, or target encryption suites loaded.

## Black Market Origin
Which megacorp database it was stolen from and its street cost.`,

  event: `## Summary
A brief overview of this net breach, corporate raid, or cyberpsychosis outbreak.

## Epoch Timestamp
The millisecond UNIX timestamp and subnet coordinates of the event.

## Hacker Handles & Solos
The deck profiles and field mercs who coordinated the heist.

## Net/Physical Aftermath
How the hack crashed stocks, fried runner brains, or exposed corporate black files.`,

  creature: `## Summary
A brief description of this rogue AI, corporate bio-weapon, or combat drone.

## Code/Hardware Platform
Server node host, mainframe, or robotic chassis specs.

## Subroutines & Attack Scripts
Infiltration daemons, physical weapons, or target neural-frying scripts.`,

  note: `## Summary
A brief overview of datashards, encrypted logs, or hack notes.`,
};

export const APOCALYPTIC_TEMPLATES: Record<string, string> = {
  character: `## Summary
A brief description of this scavenger, mutant, or tribal leader.

## Survival Role & Scars
Survival specialty, mutations, physical scars, and physical condition.

## Scavenged Gear & Scrap
Main armor pieces, patched weaponry, and valuable trade scraps carried.

## Trust & Settlement Ties
Loyalties, reputation with factions, and trustworthiness rating (1-5).

## Personality & Voice
Temperament, survival instincts, speech rhythm, wasteland idioms, and in-character behavior rules.

## Knowledge & Expertise
What survival skills, wasteland geography, or pre-collapse knowledge does this character retain? What has been lost — sealed vaults, erased records, or expertise that died with the old world?`,

  faction: `## Summary
A brief description of this scavenger settlement, raider gang, or doomsday cult.

## Ideology & Survival Creeds
Ideals, tribal rituals, and doomsday philosophies.

## Strongholds & Scrap Forts
Ruined subways, converted vaults, or fortified junkyards occupied.

## Raiders & Scav Squads
Total fighters, combat vehicles, and scrap weapons available.`,

  location: `## Summary
A brief description of this ruined city center, fallout wasteland, or scrap outpost.

## Radiation & Hazards
Radiation tier, toxic conditions, physical anomalies, and natural hazards.

## Scavenge Potential
Unlooted ruins, abandoned military bunkers, or scrap value.

## Local Predators & Rad-Beasts
Territorial fauna, raider ambush points, and mutant hives.`,

  item: `## Summary
A brief description of this scavenged weapon, tool, or rations package.

## Condition & Patches
Wear percentage, modifications, and structural stability.

## Material Value
Raw materials obtained if salvaged (e.g., steel, electronic parts, fuel).`,

  event: `## Summary
A brief overview of this ash storm, raider assault, or vault opening.

## Season & Weather Patterns
The atmospheric conditions and fallout levels during the event.

## Casualties & Scrap Gains
Settlements lost, survivors gained, and resources/scrap gathered.`,

  creature: `## Summary
A brief description of this mutated beast, feral scourge, or radioactive horror.

## Mutation Profile
The genetic deviations, toxins, radiation emitted, and anatomy details.

## Combat Behavior & Tactics
Territorial triggers, combat aggression, and pack behavior.

## Harvestable Scrap
Valuable materials (meat, pelts, organs, irradiated marrow) obtained.`,

  note: `## Summary
A brief overview of rusted journals, survivor diaries, or scrap maps.`,
};

export const HORROR_TEMPLATES: Record<string, string> = {
  character: `## Summary
A brief overview of who this subject is and their place in the dark underbelly.

## Embrace & Origin
When they were embraced, their clan or lineage, and who embraced them (their Sire).

## Appearance
Their physical features, how they conceal their monstrous nature, and sensory hallmarks (e.g., cold touch, crimson eyes).

## Condition & Humanity
Their remaining connection to humanity, and their current beast or predation temperaments.

## Personality & Voice
Temperament, conversational habits, speech rhythm, predatory tells, and in-character behavior rules.

## Knowledge & Expertise
What occult lore, blood disciplines, or forbidden histories does this character know? What eldritch truths are still beyond them — concealed by elder kindred or sealed in untranslated grimoires?

## Disciplines & Powers
Supernatural abilities, blood magic, or physical gifts of the blood.

## Blood Bonds & Allies
Who is bound to them, their touchstones, or coterie ties.

## Secrets & Gehenna Signs
Dark occult secrets, hidden sins, or portents of the end.

## Story Hooks
Whispers at Elysium, suspicious nocturnal activities, or hunting ground disputes.`,

  faction: `## Summary
A brief overview of this dark coven, secret cult, or vampire coterie.

## Dark Agendas & Oaths
Unholy mission, blood oaths, and occult beliefs.

## Forbidden Archives & Relics
Cursed texts, blood gems, or unholy artifacts commanded.

## Rites & Blood Magic
Rituals performed, occult sacrifices, and seasonal ceremonies.`,

  location: `## Summary
A brief description of this gothic manor, flooded crypt, or dark alley.

## Sensory & Occult Atmosphere
Hallmarks (smells, cold spots), local ambient dread, and active magical wards.

## Hidden Altars & Crypts
Secret rooms, sacrificial chambers, and resting places of ancient evils.`,

  item: `## Summary
A brief description of this cursed relic, forbidden tome, or occult weapon.

## Curses & Dark Blessings
Supernatural properties, costs of usage, and ritual bonds.

## History of Bloodshed
Past sacrifices, notable owners, and tragic legends surrounding the item.`,

  event: `## Summary
A brief overview of this unholy ritual, demonic eclipse, or dark sacrifice.

## Stellar Alignment & Phase
The celestial positioning required for the event's success.

## Sequence of Rites
Step-by-step unholy rituals, incantations, and blood sacrifices.`,

  creature: `## Summary
A brief description of this demon, feral ghoul, or cosmic terror.

## Unholy classification
Eldritch category, origin plane, and banishment difficulty.

## Predatory Powers & Sins
Terror auras, mind-flaying spells, or necrotic touches.

## Methods of Banishment
Wards, sacred objects, or specific holy rituals required.`,

  note: `## Summary
A brief overview of bloodstained journals, occult symbols, or logs.`,
};

export const FALLOUT_TEMPLATES: Record<string, string> = {
  character: `## Summary
A brief overview of this survivalist's log entry.

## S.P.E.C.I.A.L. & Attributes
Strength, Perception, Endurance, Charisma, Intelligence, Agility, Luck.

## Background & Vault
Which vault or wasteland settlement did they originate from?

## Appearance & Loadout
Scavenged clothing, radiation scars, Pip-Boy model, and primary scavenged gear.

## Perks & Mutations
Unique survival traits, radiation-induced mutations, or cyberware.

## Personality & Voice
Temperament, conversational habits, speech rhythm, wasteland idioms, and in-character behavior rules.

## Knowledge & Expertise
What pre-war knowledge, wasteland survival skills, or faction intelligence does this character possess? What Vault-Tec experiments, classified Enclave data, or technical skills are beyond their reach?

## Faction Affiliation
Alignment with the Brotherhood, NCR, Enclave, Raiders, or local settlements.

## Secrets & Classified Logs
Vault experiment data, contraband locations, or pre-war knowledge.

## Story Hooks
Distress beacons, bounty posters, or rumors of clean water and un-looted vaults.`,

  faction: `## Summary
A brief description of this Brotherhood chapter, Raider gang, or Enclave detachment.

## Mission & Command Structure
Codename, military rank structure, and Vault-Tec or Enclave directives.

## Tech Level & Power Armor
Availability of T-51/X-01 Power Armor, plasma weapons, or pre-war schematics.

## Fortresses & Bunkers
Fortified bunkers, Vault outposts, or airships under command.`,

  location: `## Summary
A brief description of this ruined vault, wasteland settlement, or test site.

## Radiation & Vault Number
Geiger counter readings, Vault number, and original Vault-Tec experiment.

## Scavenge Potential & Junk
Scrap yield, pre-war loot, ammunition crates, and crafting recipes.`,

  item: `## Summary
A brief description of this holotape, weapon, or Nuka-Cola flavor.

## Condition & Weight
Scrap components required to repair, weapon damage, and weight.

## Radiation & Healing Profile
HP restored, Rads gained upon consumption, or active buffs/debuffs.`,

  event: `## Summary
A brief overview of this Great War event, Vault opening, or settlement raid.

## Nuclear Fallout Levels
Irradiation changes, ash storms, and weather patterns.

## Survivors & Holotapes Recovered
Names of survivors, audio logs, and logs found.`,

  creature: `## Summary
A brief description of this Deathclaw, Feral Ghoul, or Radscorpion.

## Mutation Tier & Rad Level
Radiation levels emitted, mutant scale, and biological traits.

## Harvestable Loot
Rad-free meat, chitin plates, scrap parts, or toxic glands.`,

  note: `## Summary
A brief overview of Pip-Boy terminal logs, holotape transcripts, or diaries.`,
};

export const STARWARS_TEMPLATES: Record<string, string> = {
  character: `## Summary
A brief overview of this Jedi, Sith, Bounty Hunter, or smuggler.

## Species & Homeworld
Planet of origin, alien species traits, and native language.

## Force Alignment & Midi-chlorians
Light/Dark affinity, Midi-chlorian count, and active Force powers.

## Lightsaber & Loadout
Lightsaber form, hilt design, kyber crystal, blaster model, and armor type.

## Starship & Astromech
Starship registration, class, and assigned astromech unit.

## Personality & Voice
Temperament, conversational habits, speech rhythm, galactic slang, and in-character behavior rules.

## Knowledge & Expertise
What Force lore, galactic history, or underworld intelligence does this character know? What is classified by the Empire or Jedi Order, or simply beyond their experience?

## Bounty Record & Guild Standing
Reputation with the Hutt Cartel, Bounty Hunters Guild, or Empire.`,

  faction: `## Summary
A brief description of this Rebel cell, Galactic Empire squad, or Smuggler cartel.

## Galactic Ideology & Vows
Ideals, imperial directives, or syndicate codes.

## Armada & Starfighters
Star Destroyers, Corellian corvettes, or X-Wing/TIE fleets.

## Sector Hubs & Bases
Hidden hangar bases, temple ruins, or planetary spaceports.`,

  location: `## Summary
A brief description of this Outer Rim planet, cantina, or orbital shipyard.

## Galactic Sector & Climate
Sector coordinates, weather class, terrain, and planet details.

## Spaceports & Cantinas
Hangar bays, trading posts, and local gathering holes.

## Imperial/New Republic Presence
Troop garrison strength, patrol starships, and local enforcement.`,

  item: `## Summary
A brief description of this lightsaber, Kyber crystal, or blaster rifle.

## Maker & Kyber Crystal
Hilt creator, crystal color, and Force attunement records.

## Modifications & Upgrades
Custom scopes, power cells, and integrated targeting computers.`,

  event: `## Summary
A brief overview of this space battle, Jedi trial, or planetary blockade.

## Galactic Date & Sector
Standard galactic calendar stardate and battle sectors.

## Fleet Commanders & Generals
Jedi generals, imperial admirals, or rebel pilots involved.

## Force Echoes & Ripples
Vibrations in the Force felt by practitioners during the event.`,

  creature: `## Summary
A brief description of this Rancor, Bantha, or Nexu.

## Planetary Origin
Planet of origin, planetary biology, and typical ecosystem role.

## Domestication & Hazard Rating
Riding utility, combat training potential, and galactic threat index.`,

  note: `## Summary
A brief overview of holocron recordings, bounty hunting logs, or files.`,
};

export const STARTREK_TEMPLATES: Record<string, string> = {
  character: `## Summary
A brief overview of this Starfleet officer, Vulcan, or Klingon warrior.

## Starfleet Serial & Rank
Ranks, serial number, specialized field, and department (Command/Science/Engineering).

## Species & Cultural Traits
Species background, special anatomy, and cultural philosophies (e.g., logic).

## Starship Assignment
Assigned starship, post role, and past mission logs.

## Technical Specialties
Specialized scientific systems, warp physics, or linguistic certifications.

## Personality & Voice
Temperament, conversational habits, speech rhythm, professional jargon, and in-character behavior rules.

## Knowledge & Expertise
What scientific disciplines, xenological studies, or Starfleet intelligence does this officer have access to? What is classified above their clearance or lies outside their field specialization?`,

  faction: `## Summary
A brief description of this United Federation fleet, Klingon House, or Romulan cell.

## Fleet Directives & Charters
The Prime Directive guidelines, military alliances, or treaty terms.

## Capital Starships
U.S.S. starships, Klingon birds-of-prey, or warbird fleets.

## Starbases & Sectors
Diplomatic outposts, starbases, and sectors under sovereign control.`,

  location: `## Summary
A brief description of this Class-M planet, anomalies sector, or quadrant.

## Stellar Quadrant & Planet Class
Alpha/Beta/Gamma/Delta quadrant, Planet Class (e.g., M-Class), gravity, and system.

## Starfleet Scan Diagnostics
Atmospheric scan readings, magnetic anomalies, and radiation levels.`,

  item: `## Summary
A brief description of this Tricorder, Phaser, or Warp core component.

## Manufacturer & Model
Type, model version, and Starfleet engineering specifications.

## Scanner/Phaser Frequencies
Phaser frequency range, modulation logs, and diagnostic scans.`,

  event: `## Summary
A brief overview of this First Contact, warp flight experiment, or space battle.

## Stardate & Sector
Starfleet stardate timestamp and system coordinates.

## Starfleet Command Logs
Captain's log entries, prime directive assessment files, and logs.`,

  creature: `## Summary
A brief description of this alien species, Gorn, or Tribble.

## Biology & Scans
Carbon/silicon biology, planet of origin, and sensor scan files.

## Intelligence & Language
Language class, warp capabilities, and communication logs.`,

  note: `## Summary
A brief overview of Captain's Logs, sensor records, or logs.`,
};

const THEME_TEMPLATE_MAP: Record<string, Record<string, string>> = {
  fantasy: FANTASY_TEMPLATES,
  scifi: SCIFI_TEMPLATES,
  modern: MODERN_TEMPLATES,
  cyberpunk: CYBERPUNK_TEMPLATES,
  apocalyptic: APOCALYPTIC_TEMPLATES,
  horror: HORROR_TEMPLATES,
  fallout: FALLOUT_TEMPLATES,
  starwars: STARWARS_TEMPLATES,
  startrek: STARTREK_TEMPLATES,
};

/**
 * Synchronous template resolution by entity type and optional theme ID.
 * Falls back to GENERIC_TEMPLATES if the theme has no entry for the type.
 * Safe to call from workers (no browser APIs).
 */
export function resolveTemplateSync(type: string, themeId?: string): string {
  const normalizedType = type.toLowerCase();
  const baseThemeId = (themeId || "")
    .toLowerCase()
    .replace(/_(light|dark)$/, "");
  const themeTemplates = THEME_TEMPLATE_MAP[baseThemeId];
  return (
    themeTemplates?.[normalizedType] ?? GENERIC_TEMPLATES[normalizedType] ?? ""
  );
}
