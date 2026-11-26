import type { GeneratorOutput } from "#lib/services/seo/generator-engine.js";
import type { ValidSlug } from "./generator-page-meta";

export const extendedSlugDrafts: Partial<Record<ValidSlug, GeneratorOutput>> = {
  "star-system": {
    type: "location",
    title: "Corvane",
    summary:
      "Corvane is a single star star system, isolated and core system, built around a rare mineral deposit found nowhere else on the known trade lanes.",
    content:
      "## Core Concept\nCorvane is a hard sci-fi single star system, isolated in character and core system in reach. It matters because of a rare mineral deposit found nowhere else on the known trade lanes, and every faction present here knows it.\n\n## The Star(s)\nA single stable star — a hot, brilliant A-type white star — anchors the system, its habitable zone the one variable every faction here has learned to fight over.\n\n## Major Bodies\n#### [Corvane I](/generators/world?developSystem=Corvane&developBody=Corvane+I&developBodyType=Ringed+World&developContext=its+rings+are+both+a+navigation+hazard+and+a+mining+claim+nobody+can+fully+police.+5.1+AU+from+the+star%2C+in+the+Corvane+system.) (Ringed World)\nits rings are both a navigation hazard and a mining claim nobody can fully police — 5.1 AU from the star.\n\n#### [Corvane II](/generators/world?developSystem=Corvane&developBody=Corvane+II&developBodyType=Gas+Giant&developContext=its+storms+hide+extraction+rigs+whose+owners+guard+their+coordinates+jealously.+8.3+AU+from+the+star%2C+in+the+Corvane+system.) (Gas Giant)\nits storms hide extraction rigs whose owners guard their coordinates jealously — 8.3 AU from the star.\n- **[New Varga](/generators/world?developSystem=Corvane&developBody=New+Varga&developBodyType=Barren+Moon&developContext=an+airless+rock+kept+alive+only+by+imported+water+and+stubborn+engineering.+orbiting+Corvane+II%2C+in+the+Corvane+system.)** (Barren Moon) — an airless rock kept alive only by imported water and stubborn engineering.\n\n#### [Corvane IV](/generators/world?developSystem=Corvane&developBody=Corvane+IV&developBodyType=Ocean+World&developContext=a+world+of+open+water+dotted+with+floating+platforms+and+submerged+claims.+8.7+AU+from+the+star%2C+in+the+Corvane+system.) (Ocean World)\na world of open water dotted with floating platforms and submerged claims — 8.7 AU from the star.\n\n#### [Corvane V](/generators/world?developSystem=Corvane&developBody=Corvane+V&developBodyType=Scorched+Rockball&developContext=a+sunward+world+too+hot+for+permanent+habitation%2C+valuable+only+for+what+can+be+extracted+quickly.+9.7+AU+from+the+star%2C+in+the+Corvane+system.) (Scorched Rockball)\na sunward world too hot for permanent habitation, valuable only for what can be extracted quickly — 9.7 AU from the star.\n\n#### [Corvane VI](/generators/world?developSystem=Corvane&developBody=Corvane+VI&developBodyType=Asteroid+Belt&developContext=a+scattered+claim+of+rocks+worked+by+independent+crews+who+answer+to+no+single+authority.+10.1+AU+from+the+star%2C+in+the+Corvane+system.) (Asteroid Belt)\na scattered claim of rocks worked by independent crews who answer to no single authority — 10.1 AU from the star.\n\n## Lifeforms\nBeyond its settlers, Corvane shows no complex native life, only scattered microbial mats in sheltered pockets on its harsher bodies.\n\n## Settlements & Factions\nEstablished authority runs deep here — shipping lanes, tariffs, and jurisdiction are all settled questions, at least on paper.\nAt least two competing interests operate here — one favouring stability and the existing order, the other willing to disrupt it for a better position.\n\n## Resources & Strategic Importance\nThe system's leverage comes from a rare mineral deposit found nowhere else on the known trade lanes. Whoever controls access to it controls the system's politics.\n\n## Travel Hazards\nGetting through the system safely means accounting for gravitational tides between the system's major bodies that scramble navigation near closest approach.",
    lore: "## History\nCorvane's current balance of power is recent; the system's earlier era ended when the situation behind its central conflict first came to light, and nobody has fully settled the aftermath.\n\n## System-Wide Conflict or Mystery\nA structure on one of the system's bodies predates every recorded settlement here, and nobody currently in the system built it.\n\n## Adventure Hooks\n- A faction operating in Corvane needs outside help investigating a structure on one of the system's bodies predates every recorded settlement here.\n- A supply run through the system's hazards (gravitational tides between the system's major bodies that scramble navigation near closest approach) goes wrong at the worst possible time.\n- Someone on Corvane II is quietly trying to change who controls a rare mineral deposit found nowhere else on the known trade lanes, and needs deniable help to do it.",
    bodies: [
      {
        name: "Corvane I",
        type: "Ringed World",
        description:
          "its rings are both a navigation hazard and a mining claim nobody can fully police",
        distanceAU: 5.1,
      },
      {
        name: "Corvane II",
        type: "Gas Giant",
        description:
          "its storms hide extraction rigs whose owners guard their coordinates jealously",
        distanceAU: 8.3,
      },
      {
        name: "New Varga",
        type: "Barren Moon",
        description:
          "an airless rock kept alive only by imported water and stubborn engineering",
        parentName: "Corvane II",
      },
      {
        name: "Corvane IV",
        type: "Ocean World",
        description:
          "a world of open water dotted with floating platforms and submerged claims",
        distanceAU: 8.7,
      },
      {
        name: "Corvane V",
        type: "Scorched Rockball",
        description:
          "a sunward world too hot for permanent habitation, valuable only for what can be extracted quickly",
        distanceAU: 9.7,
      },
      {
        name: "Corvane VI",
        type: "Asteroid Belt",
        description:
          "a scattered claim of rocks worked by independent crews who answer to no single authority",
        distanceAU: 10.1,
      },
    ],
    starType: "A",
    labels: [
      "star-system",
      "single-star",
      "hard-sci-fi",
      "core-system",
      "isolated",
      "grounded",
    ],
    status: "active",
  },
  "origin-generator": {
    type: "character",
    title: "Nightglass",
    summary:
      "A paranoid superhero origin: technology, with a live campaign hook and a consequence that the origin story itself never resolves.",
    content:
      "### The Origin\nSalvaged hardware from a decommissioned programme activated the first time they touched it, and it has not fully powered down since.\n\n### What the World Knows\nThere is no public account of this at all. As far as anyone outside a very small circle is concerned, Nightglass simply appeared one day with no explanation offered or asked for.\n\n### Campaign Hook\nThe technology's original manufacturer has noticed the pattern of energy signatures it emits and has started tracking them.",
    lore: '### The Full Truth\nThe account in "### The Origin" is accurate to what actually happened, in a paranoid register — but the version circulating publicly leaves out exactly the details that would let someone trace it back to its source.\n\n### Ongoing Consequence\nThe technology degrades, drains, or malfunctions under specific conditions, and the hero has not found a permanent fix.\n\n### Who Knows\nA tight handful of people know the full account — and at least one of them has never been asked to keep it secret, only assumed to.\n\n### Further Hooks\n- Someone researching the origin type technology in general has stumbled close enough to the hero\'s specific case to ask uncomfortable questions.\n- A person or organisation connected to the origin event resurfaces, unaware or uncaring that the hero has since moved on.',
    labels: [
      "origin-generator",
      "superhero",
      "character-generator",
      "imported-draft",
    ],
    status: "active",
  },
  personality: {
    type: "character",
    kind: "personality",
    title: "Vaelgar",
    summary:
      "Charming and performative in public, using humour to control how much of themselves anyone actually sees.",
    content:
      "### Core Personality\nCharming and performative in public, using humour to control how much of themselves anyone actually sees.\n\n### Speech & Conversational Style\nQuick, deflects with a joke when a question gets personal, changes the subject through humour rather than refusal.\n\n### Mannerism / Tell\nA practised laugh that does not always reach their eyes; fills silences reflexively.\n\n### Roleplaying Cues\n- Deflects a personal or probing question with a joke rather than answering it directly.\n- Fills an uncomfortable silence with humour before anyone else can speak.\n- Drops the performance for exactly one unguarded sentence, then immediately covers it with a joke.\n- Reads the room accurately and adjusts the performance instantly to match it.",
    lore: "### Outward Demeanour vs Inner Nature\nOutwardly: Quick-witted, entertaining, the one who defuses tension with a joke. Inwardly: Uses the performance deliberately, as a way to keep every conversation on their own terms.\n\n### Drives\n- **Wants**: to be liked by everyone in the room\n- **Fears**: being genuinely, personally known and found lacking\n- **Protects**: the version of themselves other people actually see\n- **Envies or resents**: people who can be sincere without flinching\n- **Needs from others**: laughter, or at least a reaction, to know a scene is going well\n\n### Virtue and Flaw\n**Virtue**: Genuinely good at putting other people at ease. **Flaw**: Cannot stop performing even in moments that call for plain sincerity.\n\n### Contradiction\nDesperately wants to be truly known, but deflects with a joke the instant a conversation gets close.\n\n### Under Pressure\nJokes harder, escalating the performance exactly when the room most needs sincerity.\n\n### Social Behaviour\n**Strangers**: Instantly charming, performs a version of warmth before real warmth has a chance to form. **Friends**: Genuinely caring underneath, but still slips into performance under any stress. **Authority figures**: Charms rather than complies, tests how far the performance can get them. **Rivals**: Needles with humour rather than open hostility.\n\n### Boundary / Trigger\nA joke landing badly and exposing something they meant to keep hidden.\n\n### Example Reactions\n- Praised sincerely: deflects with a joke, visibly thrown by genuine sincerity.\n- Caught lying: charms rather than denies, tries to make it funny before it becomes serious.\n- Asked for help with something personal: agrees, but changes the subject as soon as possible afterward.",
    labels: ["personality", "personality-generator", "imported-draft"],
    status: "active",
  },
  item: {
    type: "item",
    title: "Runeheart (Armor)",
    summary: "",
    content:
      "### Description\nThe Runeheart (Armor) is a armor with an unsettling specificity of design — it was clearly made for a very particular purpose, and whoever holds it can feel that purpose even without knowing what it was.",
    lore: "### GM Reference Information\n- **Type**: Armor\n- **Rarity**: Uncommon\n- **Theme**: Classic Fantasy\n\n### Magical Properties\n- **Passive Effect**: Grants resistance to cold, but the wearer always feels slightly chilly inside.\n\n### Lore & History\nRecovered from the hoard of a red dragon that ravaged the northern kingdoms.",
    labels: ["rpg-item", "imported-draft"],
    status: "active",
  },
  "minor-magic-item": {
    type: "item",
    title: "Dusk Seal",
    summary: "",
    content:
      "### Description\nA pocket-sized inscribed scroll / seal, the Dusk Seal is marked with a simple maker's notch near its base. It feels surprisingly lightweight for its composition, with a faint tactile hum that subsides when gripped firmly.",
    lore: "### Quick Reference\n- **Item Form**: Inscribed Scroll / Seal\n- **Usage Limit**: Persistent Minor Effect (Breaks on Mishap / High Stress)\n- **Activation**: Peeling a seal or unwinding a cord\n- **Primary Utility**: Sensory & Detection\n- **Setting / Theme**: Classic Fantasy\n\n### Magical Effect & Mechanics\nActivating the item reveals recent temperature changes in the immediate area. Footprints or handholds warm from living contact within the past hour illuminate with a dim, violet luminescence for three minutes.\n\n### Quirk or Drawback\nWhen used, the air within five feet smells briefly of crushed pine needles and fresh ozone.\n\n### Suggested Use in Play\nIdeal for bypassing guard checkpoints or creating an escape route through crowded alleys.\n\n### Provenance & Rumour\nProduced in modest quantities by an eccentric clockmaker who used tension springs to store transient charges.",
    labels: ["minor-magic-item", "imported-draft"],
    status: "active",
  },
  "artifact-generator": {
    type: "item",
    title: "Crown-Breaker Eye",
    summary: "",
    content:
      "### Description\nThe Crown-Breaker Eye is a legendary jewel / heartstone forged in the heart of a fallen star during the unknown / outside time. It gleams with an unyielding celestial brilliance, inlaid with true-gold runes that hum with ancient harmonic resonance when drawn from its silk scabbard.",
    lore: "### Quick Reference\n- **Item Form**: Jewel / Heartstone\n- **Origin Era**: Unknown / Outside Time\n- **Power Tier**: Regional Masterpiece (Dominates cities & provinces)\n- **Current Status**: Lost in Ruined Sanctuary\n- **Curse / Cost**: None (Pure Burden of Custody)\n- **Setting / Theme**: Superhero / Comic Book\n\n### Artifact Powers & Manifestations\n- **Dormant Powers**: Surrounds the bearer with a ward of absolute clarity; magical deceptions, illusions, and mental intrusions cannot touch their mind.\n- **Awakened Powers**: Unleashes a torrent of primordial radiant fire that immolates supernatural monstrosities and mends the mortal wounds of all allies in sight.\n- **Ascendant / Zenith Powers**: Rewrites local reality in accordance with an ancient sovereign oath, raising a citadel from bedrock or restoring life to a fallen kingdom.\n\n### Attunement & Awakening Requirements\nThe bearer must demonstrate proven virtue or royal bloodline by holding the item over sacred flame without flinching.\n\n### Cost, Curse, Corruption, or Taboo\nThe wielder is bound by a strict chivalric taboo: they must never refuse hospitality, flee from a duel, or speak an untruth.\n\n### Known History & Previous Keepers\nForged during the unknown / outside time by master artisans whose names have been scrubbed from historical archives. Passed through the hands of three fallen dynasties, each of which collapsed shortly after tapping into its ascendant powers.\n\n### Interested Factions & Pursuers\n**The Iron Hegemony / Crown Council**: Seeks to secure the artifact to cement their uncontested reign over the province.\n\n**The Brotherhood of the Veil**: A secretive order of lorekeepers dedicated to finding and sealing the relic before it destroys society.\n\n**An Itinerant Champion / Outlaw Lord**: Driven by personal vengeance to seize the artifact and strike down their former masters.\n\n### Rumours & Conflicting Legends\n- Common folk believe the artifact brings bountiful harvests, but in truth, it leeches fertility from neighboring lands to fuel its miracles.\n- Scholars debate whether the creator was a benevolent demigod or a mad sorcerer who doomed their entire civilization.\n- The relic's true power, so the story goes, only answers to someone who has lost everything they loved.\n\n### Adventure Hooks\n**The Heist**: The artifact has been locked in a high-security vault by a corrupt tyrant, and a rebel coalition hires the party to extract it.\n\n**The Escort**: The party is entrusted with delivering the dormant relic across hostile territory to an ancient sanctuary before rival pursuers intercept them.\n\n**The Purge**: The relic has begun awakening on its own, causing supernatural anomalies across the countryside; the party must find its hiding spot and neutralize it.\n\n### Destruction or Sealing Conditions\nCan only be unmade by striking it against its identical twin relic at the exact apex of a solar eclipse.",
    labels: ["artifact", "relic", "imported-draft"],
    status: "active",
  },
  "faction-roster": {
    type: "note",
    title: "Notable Members",
    summary:
      "4 notable members of the faction, organised as a council and weighted toward field operators.",
    content:
      "### Thorthas — Practical operator\n- **Duty**: Handles what a practical operator handles for the faction, organised as a council — the work nobody minutes.\n- **Motive**: Wants something for themselves out of this, separate from what the faction claims to want.\n- **Stance**: Opportunist\n- **Trait**: Solves problems nobody else wants solved, and remembers who owes them.\n- **Wants right now**: Needs a decision made before the next council meeting forces one on them.\n- **Leverage**: Keeps a private ledger of favours that could ruin several other members.\n- **Connection**: works closely with, and doesn't fully trust (Caelmar)\n\n### Caelmar — Conflicted member\n- **Duty**: Handles what a conflicted member handles for the faction, organised as a council — the work nobody minutes.\n- **Motive**: Wants something for themselves out of this, separate from what the faction claims to want.\n- **Stance**: Reformer\n- **Trait**: Agrees out loud and hesitates in private.\n- **Wants right now**: Needs a decision made before the next council meeting forces one on them.\n- **Leverage**: One more compromise from walking away, and everyone can tell.\n- **Connection**: works closely with, and doesn't fully trust (Daxdar)\n\n### Daxdar — Authority figure\n- **Duty**: Handles what a authority figure handles for the faction, organised as a council — the work nobody minutes.\n- **Motive**: Wants something for themselves out of this, separate from what the faction claims to want.\n- **Stance**: Loyalist\n- **Trait**: Speaks softly and expects to be obeyed anyway.\n- **Wants right now**: Needs a decision made before the next council meeting forces one on them.\n- **Leverage**: Everyone assumes their word is final; it hasn't been tested in years.\n- **Connection**: works closely with, and doesn't fully trust (Thorthas)\n\n### Thorthas — Recent recruit\n- **Duty**: Handles what a recent recruit handles for the faction, organised as a council — the work nobody minutes.\n- **Motive**: Wants something for themselves out of this, separate from what the faction claims to want.\n- **Stance**: Trapped\n- **Trait**: Still learning the unwritten rules, and getting them wrong.\n- **Wants right now**: Needs a decision made before the next council meeting forces one on them.\n- **Leverage**: Owes a debt that got them in the door and isn't repaid yet.\n- **Connection**: works closely with, and doesn't fully trust (Thorthas)",
    lore: "### At a Glance\n- **Structure**: Council\n- **Emphasis**: Field operators\n- **Immediate Hook**: The roster's internal tension is one bad decision from spilling into the open.\n\n### How This Roster Divides\nLoyalty to the faction is not the same as loyalty to each other — the field operators in this group means the fault line runs through people who each think they are the reasonable one.",
    labels: [
      "rpg-faction",
      "faction-roster",
      "faction-roster-generator",
      "imported-draft",
    ],
    status: "active",
  },
  quest: {
    type: "event",
    title: "Aelmar's Legacy",
    summary: "",
    content:
      "### The Hook\nA rival hero team claims the case first, and their methods are not the party's own.\n\n### Location\nThe Caelthas Villain's Hidden Lair serves as the primary setting -- a villain's hidden lair shaped by superhero conventions and a pulp adventure atmosphere.\n\n### Key NPC\n**Branmar** is the immediate contact, patron, or obstacle. The party's first impression of Branmar will be of someone straightforward. That impression is accurate in the ways that do not matter.\n\n### Threat\nThe threat is a rogue former ally that has already shaped local behavior — people are routing around it, not reporting it, and quietly adjusting their plans.",
    lore: "### Core Fields\n- **📍 Setting**: The Caelthas Villain's Hidden Lair, a villain's hidden lair shaped by superhero conventions and a pulp adventure atmosphere.\n- **📅 Threat**: The threat is a rogue former ally that has already shaped local behavior — people are routing around it, not reporting it, and quietly adjusting their plans.\n\n### Complication\nThe villain's demands turn out to rest on a grievance the city has been ignoring for years.\n\n### Key NPC\n- **👤 Branmar**: The immediate contact, patron, or obstacle. The party's first impression of Branmar will be of someone straightforward. That impression is accurate in the ways that do not matter.\n\n### The Twist\nRescuing every hostage means letting the real target escape. Reveal this only once the party is committed -- it should recast earlier scenes in a new light.\n\n### Reward\nAn ally's loyalty, earned rather than assumed. The reward is real. What it enables matters more than what it is worth.",
    labels: ["rpg-quest", "quest-generator", "imported-draft"],
    status: "active",
  },
  rumour: {
    type: "note",
    kind: "rumour",
    title: "Word Around Town",
    summary:
      "Six local rumours for a settlement, tavern, or social hub — every one names a concrete lead, and exactly one is a dangerous misconception.",
    content:
      "### Rumour 1\n- **Rumour**: Morggar has reportedly been courting Morggar's clerks with quiet favours before next season's council vote.\n- **Lead**: Morggar, Morggar\n- **Source**: a child\n\n### Rumour 2\n- **Rumour**: Word going around is that Aeldar bribes the night watch to look the other way at Morgon's warehouse — three shipments have gone through unlogged this month.\n- **Lead**: Aeldar, Morgon's warehouse\n- **Source**: a caravaner\n\n### Rumour 3\n- **Rumour**: Caelwen and Vaelthas were once inseparable business partners — now Caelwen won't say Vaelthas's name, and Vaelthas has stopped coming to market entirely.\n- **Lead**: Caelwen, Vaelthas\n- **Source**: a shrine pilgrim\n\n### Rumour 4\n- **Rumour**: The Brandar Compact has been meeting at the district's back room at odd hours, and members who leave early won't discuss what was decided.\n- **Lead**: The Brandar Compact, the district's back room\n- **Source**: a market trader\n\n### Rumour 5\n- **Rumour**: A labourer working near the old district's abandoned counting-house claims he turned up a strongbox stamped with a foreign seal — then sold his silence to someone before he could say more.\n- **Lead**: the old district's abandoned counting-house\n- **Source**: a caravaner\n\n### Rumour 6\n- **Rumour**: Thorthas swears the village's shrine bell rang, hummed, or moved on its own last night — and insists it happens whenever someone nearby is about to die.\n- **Lead**: Thorthas, the village's shrine bell\n- **Source**: a caravaner",
    lore: "### At a Glance\n- **Genre**: Classic Fantasy\n- **Tone**: Everyday\n- **Danger Level**: Low\n\n### GM Notes — Rumour 1\n- **Reality**: essentially true\n- **What's Actually Happening**: Morggar is indeed bribing Morggar's clerks to swing procedural votes ahead of the council session.\n- **If Investigated**: One bribed clerk is willing to testify in exchange for protection from Morggar's retaliation.\n\n### GM Notes — Rumour 2\n- **Reality**: essentially true\n- **What's Actually Happening**: Aeldar is smuggling contraband through Morgon's warehouse and bribing a specific watch sergeant to keep the manifests clean.\n- **If Investigated**: Following the bribed sergeant leads straight to the next shipment, still in transit.\n\n### GM Notes — Rumour 3\n- **Reality**: exaggeration\n- **What's Actually Happening**: There was a falling-out, but it was mutual and financial, not the betrayal the gossip implies.\n- **If Investigated**: Mediating the dispute reveals both were manipulated by a third party neither has named yet.\n\n### GM Notes — Rumour 4\n- **Reality**: essentially true\n- **What's Actually Happening**: The Brandar Compact is preparing a real move — a takeover, a vote, or an expansion — that will affect the wider settlement soon.\n- **If Investigated**: A sympathetic member will describe the plan in exchange for a favour or protection.\n\n### GM Notes — Rumour 5\n- **Reality**: dangerous misconception\n- **What's Actually Happening**: Nothing was found; the labourer invented the story to explain a sudden windfall from an unrelated, less flattering source.\n- **If Investigated**: Digging at the old district's abandoned counting-house wastes time, but turns up evidence of the labourer's actual (and more interesting) secret.\n\n### GM Notes — Rumour 6\n- **Reality**: essentially true\n- **What's Actually Happening**: the village's shrine bell genuinely responds to a real, localised phenomenon tied to nearby deaths, though not by supernatural will.\n- **If Investigated**: Studying the pattern reveals a specific, actionable trigger the party can use or disrupt.",
    labels: [
      "rumour-generator",
      "local-rumours",
      "classic-fantasy",
      "imported-draft",
    ],
    status: "active",
  },
  puzzle: {
    type: "note",
    kind: "puzzle",
    title: "Environmental Trial: Sealed door",
    summary:
      "A shifting chamber blocks the party's attempt to open the sealed door. Visible Classic Fantasy details reveal how to manipulate it, while a wrong approach changes the situation instead of ending the encounter.",
    content:
      "## Player-Facing Setup\nThe party finds a shifting chamber blocking their attempt to open the sealed door. Its details make the Classic Fantasy fiction clear: it was built to test intent, not merely punish failure.\n\n## Clues\n- **Obvious clue:** Put one sensory detail in plain view that points to the pattern.\n- **Discoverable clue:** Interaction, conversation, or an appropriate check reveals why the mechanism was built.\n- **Emergency clue:** After meaningful effort, show the next safe action through a visible change in the room.\n\n## Character Spotlight Opportunities\nInvite contributions from investigation, physical action, social insight, and creative magic or equipment. Frame each as a useful angle, not a requirement: a careful observer reads the pattern, a forceful character changes its physical state at a cost, and a magical or technical character can test its energy or controls.\n\n## Alternate Solutions\n- Bypass one component while accepting a minor complication.\n- Negotiate with, trick, or repurpose the guardian mechanism.\n- Use an improvised resource or an original interpretation of the fiction to create a new route forward.\n\n## Failure & Escalation\nFailed attempts provide clear feedback without adding pressure, so the puzzle remains a safe point for experimentation.\n\n## Running the Puzzle\nDescribe the visible parts and the first clue freely. Let checks add context or reduce risk, never hide the only path behind a roll. Ask what each player does before offering a hint, then reward experiments with concrete feedback.\n\n## Scaling\nSimplify by making two actions sufficient or offering the emergency clue earlier. Increase complexity by adding a clock, a second interacting component, or a consequence that changes the next encounter.\n",
    lore: "### At a Glance\n- **Genre:** Classic Fantasy\n- **Complexity:** Simple\n- **System:** System-neutral\n- **Participation:** Any character can contribute\n### GM-Only Solution\nThe environmental challenge responds to a pattern of three linked actions. Any credible approach that identifies, alters, bypasses, or reinterprets the pattern advances the puzzle; no class, spell, skill, or single answer is required.\n### Escalating Hints\n1. Repeat the obvious clue in a new sensory form.\n2. Point out the component that changed after the party's last action.\n3. State the puzzle's immediate fictional goal without naming a solution.",
    labels: ["puzzle", "puzzle-generator", "environmental", "classic-fantasy"],
    status: "active",
  },
  "dark-fantasy-faction": {
    type: "faction",
    title: "Congregation of Pale Oath",
    summary: "A openly cruel mercenary barony operating through a demon pact.",
    content:
      "### What they control\nCongregation of Pale Oath is a mercenary barony with real authority across an entire doomed barony, built on the back of the demon pact that made them necessary in the first place.\n\n### What they want\nRoot out every remaining trace of the old faith before the new order arrives.\n\n### Why they are dangerous\nA rival within their own ranks is quietly building a faction inside the faction. Their posture — openly cruel — they no longer pretend otherwise — means they will not stop simply because they are shown to be wrong.\n\n### How to use them at the table\nBring Congregation of Pale Oath into play when the party needs a power that is doing something defensible in the worst possible way. Let them be useful, or unavoidable, before the party learns the full cost of what they protect.",
    lore: "### At a Glance\n- **📍 Base**: A licensed premises that provides cover for activities conducted elsewhere\n- **Resource**: Specialised knowledge or access that no other group in the region controls\n- **Symbol**: Pale Oath iconography, worn or branded by the faithful\n- **Secret**: A rival within their own ranks is quietly building a faction inside the faction.\n- **Immediate Hook**: A defector from the faction begs the party for protection, and knows exactly what they're running from.\n\n### Notable NPCs\n- **👤 Caelmar**: The one who still believes this was the right choice, and needs everyone else to believe it too.\n- **👤 Branwen**: Does the parts of the work no one else will, and keeps a private ledger of what it has cost them.\n\n### Internal Conflict\nA rival within their own ranks is quietly building a faction inside the faction.\n\n### Rival Faction\n- **👥 Congregation of Black Rose**: Wants the same ground, the same relic, or the same absolution — and is no more virtuous in pursuing it.",
    labels: [
      "rpg-faction",
      "dark-fantasy-faction",
      "grimdark",
      "imported-draft",
    ],
    status: "active",
  },
  "urban-fantasy-faction": {
    type: "faction",
    title: "The Open Door Committee",
    summary:
      "The Open Door Committee is a fae market operating through paranormal investigation and holding influence across the transit network.",
    content:
      "### Genre labels\nUrban fantasy · modern fantasy · supernatural faction · hidden-world politics\n\n### What they control\nThe Open Door Committee is a fae market with a foothold in a neighbourhood clinic's overnight reception and sealed records room. Across the transit network, they control a private archive of incident reports that never made it into the public record. Their public-facing work makes them legible to city employees and residents while their supernatural role stays out of ordinary records.\n\n### What they want\nWin formal recognition for supernatural residents without exposing the people who depend on anonymity.\n\n### Why they are dangerous\nTheir posture is pragmatic brokers, and the current strain is simple to name: A junior investigator has found evidence that the faction's public safety reports were altered to protect a powerful ally. They can turn routine access, permits, schedules or trusted relationships into leverage before anyone realises a hidden-world dispute has reached the whole city.\n\n### How to use them at the table\nBring The Open Door Committee in when a civic problem has a supernatural cause or when a hidden community needs something from the party. Let the players investigate the records, negotiate between groups, disrupt an illicit exchange or decide who should control a public resource; the faction can be an ally, obstacle or employer without becoming the only source of danger.",
    lore: "### At a Glance\n- **📍 Base**: a neighbourhood clinic's overnight reception and sealed records room\n- **Resource**: a private archive of incident reports that never made it into the public record\n- **Symbol**: two parallel white lines drawn on a service door\n- **Secret**: A junior investigator has found evidence that the faction's public safety reports were altered to protect a powerful ally.\n- **Immediate Hook**: A neighbourhood clinic has lost power every night for a week, and its patients know the outage follows a pattern.\n\n### Notable NPCs\n- **👤 Sasha Bell**: an investigator who keeps a second notebook for evidence the agency will not log.\n- **👤 Ari Navarro**: a facilities manager who can get anyone into a building once, for a price.\n\n### Internal Conflict\nA junior investigator has found evidence that the faction's public safety reports were altered to protect a powerful ally. The faction's leaders disagree on whether its pragmatic brokers instincts still protect the people it claims to serve.\n\n### Rival Faction\n- **👥 Northside Mutual**: Competes for influence over the transit network and is offering residents a more open deal, though it expects control of the resource in return.",
    labels: [
      "urban-fantasy",
      "modern-fantasy",
      "supernatural-faction",
      "hidden-world",
      "faction-generator",
      "rpg-faction",
      "imported-draft",
    ],
    status: "active",
  },
  "one-shot-adventure-generator": {
    type: "note",
    kind: "one-shot",
    title: "Original Will: A Modern Conspiracy One-Shot",
    summary:
      "Thorrin needs the original will recovered before Daxthas can use it, and the trail runs through a small-town diner after hours.",
    content:
      "# Original Will: A Modern Conspiracy One-Shot\n\n_Modern Conspiracy · System-neutral · 3 hours · 4 players · Action_\n\n## GM Briefing\n**Premise:** Thorrin needs the original will recovered before Daxthas can use it, and the trail runs through a small-town diner after hours.\n**Hook:** Thorrin recognises the party from the news and begs them to look at a case the police closed.\n**Player objective:** Recover the original will and stop Daxthas.\n**Central truth:** Daxthas has been paying Thorrin to look away for years.\n**Why now:** the original will was moved from its usual keeping for the first time in years, and Daxthas was waiting.\n**Stakes:** Daxthas wins the election and the town's records go with them\n**Prep needed:** Read the briefing and cheat sheet (about 15 minutes) and open the NPC list.\n\n## Scenes\n_The opening is part of scene 1 and counted in its time._\n\n### 1. Act I: a small-town diner after hours (30 min, essential)\n\n_a small-town diner after hours · Thorrin, Thoron_\n\nThorrin recognises the party from the news and begs them to look at a case the police closed.\n\n> The diner's neon sign hums, half the letters dead, and the coffee has been sitting there since closing.\n\n**First decision:** Accept Thorrin's offer as it stands, or ask for more before taking the job?\n\n**Ways in:** Hired directly by Thorrin. Personally connected to the missing item or the person who lost it. Witnessed the first sign of trouble and cannot leave it alone.\n\n**Approaches:** Create a distraction and hit from another side; Use the terrain to even the odds; Strike where the enemy is stretched thin.\n\n**Clues**\n- **Who is behind it:** Evidence that Daxthas is behind it. _(Charge in and take control)_\n- **What really happened:** The truth: Daxthas has been paying Thorrin to look away for years. _(Strike where the enemy is stretched thin)_\n- **How to stop Daxthas:** A way to stop Daxthas: Daxthas's alibi depends on a witness who has started to doubt it. _(Strike where the enemy is stretched thin)_\n\n**Challenge (combat):** A tough fight against Daxthas's people. Victory should cost something other than hit points.\n\n**Ways onward**\n- **Act II: the county records office:** risks The direct way keeps to the main paths, where Daxthas's watchers are most likely to see the party; finds Reaches the county records office with the trail still warm.\n- **Act II: the harbour warehouse:** risks The detour takes the party off the trail while Daxthas's plan keeps moving; finds Something useful at the harbour warehouse: a shortcut, an ally or a clue the main road lacks.\n\n### 2. Act II: the county records office (30 min, optional)\n\n_the county records office · Thoron, Daxthas_\n\nDaxthas sends a lawyer, a donation and a polite warning, in that order.\n\n**Approaches:** Pick off the leaders and let the rest break; Use the terrain to even the odds; Strike where the enemy is stretched thin.\n\n**Clues**\n- **Who is behind it:** Evidence that Daxthas is behind it. _(Use the terrain to even the odds)_\n- **How to stop Daxthas:** A way to stop Daxthas: Daxthas's alibi depends on a witness who has started to doubt it. _(Create a distraction and hit from another side)_\n\n**Challenge (hazard):** A chase or collapsing set piece where each choice has a price.\n\n**Leads to:** Act II: the harbour warehouse\n\n### 3. Act II: the harbour warehouse (35 min, essential)\n\n_the harbour warehouse · Thoron, Daxthas_\n\nA well-meaning local calls the authorities, and time just got shorter.\n\n**Approaches:** Strike where the enemy is stretched thin; Create a distraction and hit from another side; Pick off the leaders and let the rest break.\n\n**Clues**\n- **What really happened:** The truth: Daxthas has been paying Thorrin to look away for years. _(Use the terrain to even the odds)_\n\n**Challenge (combat):** An ambush at the harbour warehouse. The party must protect someone or something while they fight.\n\n**Leads to:** Act III: the country club\n\n### 4. Act III: the country club (65 min, essential)\n\n_the country club · Daxthas, Thorrin_\n\nThe party reaches the country club, where Daxthas is at the benefit dinner, with the original will and a good excuse.\n\n**Approaches:** Use the terrain to even the odds; Charge in and take control; Pick off the leaders and let the rest break.\n\n**Challenge (hazard):** Stop Daxthas in a running fight across a place that is coming apart, with the original will at stake.\n\n## The Finale\nDaxthas is stopped at the country club by putting the three vital clues to use.\n\n**It turns on:** Who is behind it (Act I: a small-town diner after hours; Act II: the county records office); What really happened (Act II: the harbour warehouse; Act I: a small-town diner after hours); How to stop Daxthas (Act I: a small-town diner after hours; Act II: the county records office).\n_The full procedure is in the GM cheat sheet._\n\n## NPCs\n### Daxthas — respected local benefactor (antagonist)\n- **Why:** Was cast out by the very people the original will protects, and has been planning this since.\n- **Goal:** Sees the original will as the price of keeping their people safe, whatever it costs others.\n- **Knows:** Knows the party's patron is lying to them, and will say so at the worst moment.\n- **Reacts:** Tests the party with a small cruelty to see what they will put up with.\n- **When opposed:** Never fights alone. Sends others first, watches how the party fights, then strikes at whoever seems to lead them. Withdraws rather than dies.\n- **Would stop if:** Offered a public apology and a place among those who cast them out.\n- **Roleplay:** Fidgets with something small and loses their train of thought when pressed.\n\n### Thorrin — retired detective\n- **Goal:** Needs the original will back before anyone learns it was ever lost.\n- **Knows:** Knows Daxthas by another name, from years ago.\n- **Reacts:** Grateful and generous, until the party starts asking about the past.\n- **Roleplay:** Keeps checking the door, the window or the time.\n\n### Thoron — neighbour who keeps notes\n- **Goal:** Wants the party to protect someone they love.\n- **Knows:** Knows a way into the place that nobody else remembers.\n- **Reacts:** Lies to protect themselves, then tells the truth if the party catches the lie gently.\n- **Roleplay:** Uses the party's names a little too often.\n\n## Endings\n- **The Truth Out** — The party gathers the vital clues and defeats or exposes the antagonist. the original will is recovered, and Thorrin owes the party. _(Does the party stop Daxthas before the clock runs out? Yes · Does the party keep the key evidence and refuse Daxthas's offers? Yes)_\n- **A Costly Bargain** — The party takes a deal with the antagonist or loses the key evidence. Daxthas keeps part of what they wanted, and the party leaves with a debt. _(Does the party stop Daxthas before the clock runs out? Yes · Does the party keep the key evidence and refuse Daxthas's offers? No)_\n- **Too Late** — Time runs out before the party reaches the climax. Daxthas finishes the plan, and the next adventure begins with the fallout. _(Does the party stop Daxthas before the clock runs out? No)_\n\n**Epilogue hook:** Someone else has been asking about the original will.\n\n## Time Budget\n- Act I: a small-town diner after hours: 30 min (essential)\n- Act II: the county records office: 30 min (optional)\n- Act II: the harbour warehouse: 35 min (essential)\n- Act III: the country club: 65 min (essential)\n- Buffer: 20 min\n- **Total: 180 min**\n- Essential scenes alone: 130 min plus buffer\n\n_Times are planning guidance, not a promise about how your table will pace._\n",
    lore: "# Original Will: A Modern Conspiracy One-Shot — GM Cheat Sheet\n\n**Truth:** Daxthas has been paying Thorrin to look away for years.\n**Why now:** the original will was moved from its usual keeping for the first time in years, and Daxthas was waiting.\n**Stakes:** Daxthas wins the election and the town's records go with them\n**Session:** 3 hours, 20 min buffer; essential scenes alone run 130 min\n\n## Timeline\n1. Act I: a small-town diner after hours — 30 min → Act II: the county records office; Act II: the harbour warehouse\n2. Act II: the county records office — 30 min (optional) → Act II: the harbour warehouse\n3. Act II: the harbour warehouse — 35 min → Act III: the country club\n4. Act III: the country club — 65 min → The end\n\n\n## Where Everyone Is\n1. **Act I: a small-town diner after hours:** Thorrin (free, a small-town diner after hours); Thoron (free, a small-town diner after hours); the original will (here, a small-town diner after hours)\n2. **Act II: the county records office:** Daxthas (hiding, the county records office); Thoron (free, the county records office); the original will (here, a small-town diner after hours)\n3. **Act II: the harbour warehouse:** Daxthas (hiding, the harbour warehouse); Thoron (free, the harbour warehouse); the original will (here, a small-town diner after hours)\n4. **Act III: the country club:** Thorrin (free, the country club); Daxthas (hostile, the country club); the original will (here, the country club; Daxthas's people carry it there)\n\n## Running Each Scene\n**1. Act I: a small-town diner after hours** (30 min, essential)\n- Success: The party wins when the opposition breaks, flees or is pinned down. Most foes give up when half of them are down or their leader falls.\n- Opposition: Daxthas's people: one per player plus a leader. They fight in pairs, fall back to cover when hurt, and the leader runs at half strength. Halfway through, conditions change: reinforcements arrive, a fire spreads or the floor gives way.\n- Other approaches: Talking: an offer of safe passage ends the fight if the party has already shown it can win. Stealth or tricks: getting past without a fight counts as success, but leaves the enemy behind them.\n- If they fail: The party still gets the lead, but it costs them: time, a favour, or Daxthas learns they are coming.\n- Short on time: Run it as one decisive beat in about 15 minutes: one question, one choice, then move on.\n\n**2. Act II: the county records office** (30 min, optional)\n- Success: The party succeeds when everyone is through or out of danger; a good plan means only one person has to risk it.\n- Opposition: The place itself. It gets worse every round the party lingers, and halfway through the safe route closes, forcing a riskier one. Daxthas's people take any chance to make it worse.\n- Other approaches: Waiting it out: the hazard passes, but the clock advances. Magic or gear: protects one person fully, or everyone partly.\n- If they fail: The party still gets the lead, but it costs them: time, a favour, or Daxthas learns they are coming.\n- Short on time: Run it as one decisive beat in about 15 minutes: one question, one choice, then move on.\n- Skip: Skip it entirely. Anything the party would have learned here is also found in Act I: a small-town diner after hours.\n\n**3. Act II: the harbour warehouse** (35 min, essential)\n- Success: The party wins when the opposition breaks, flees or is pinned down. Most foes give up when half of them are down or their leader falls.\n- Opposition: Daxthas's people: one per player plus a leader. They fight in pairs, fall back to cover when hurt, and the leader runs at half strength. Halfway through, conditions change: reinforcements arrive, a fire spreads or the floor gives way.\n- Other approaches: Talking: an offer of safe passage ends the fight if the party has already shown it can win. Stealth or tricks: getting past without a fight counts as success, but leaves the enemy behind them.\n- If they fail: The party still gets the lead, but it costs them: time, a favour, or Daxthas learns they are coming.\n- Short on time: Run it as one decisive beat in about 20 minutes: one question, one choice, then move on.\n\n**4. Act III: the country club** (65 min, essential)\n- Success: The party wins by doing the steps in How the Finale Works, or by any other way through listed there.\n- Opposition: Daxthas and their closest guards. Daxthas fights from behind others and uses the place against the party; when cornered, they offer a deal. Midway through, the original will or the place itself becomes unstable and someone has to deal with it.\n- Other approaches: Waiting it out: the hazard passes, but the clock advances. Magic or gear: protects one person fully, or everyone partly.\n- If they fail: The party does not lose; Daxthas gets part of what they want, and the party chooses which loss to accept before the ending.\n- Short on time: Run it as one decisive beat in about 35 minutes: one question, one choice, then move on.\n\n## Daxthas\n- Goal: Sees the original will as the price of keeping their people safe, whatever it costs others.\n- When opposed: Never fights alone. Sends others first, watches how the party fights, then strikes at whoever seems to lead them. Withdraws rather than dies.\n- Would stop if: Offered a public apology and a place among those who cast them out.\n\n## Vital Clues\n- Who is behind it — Act I: a small-town diner after hours / Act II: the county records office\n- What really happened — Act II: the harbour warehouse / Act I: a small-town diner after hours\n- How to stop Daxthas — Act I: a small-town diner after hours / Act II: the county records office\n\n## How the Finale Works\n**Needs**\n- **Who is behind it:** Evidence that Daxthas is behind it. _(found in Act I: a small-town diner after hours; Act II: the county records office)_\n- **What really happened:** The truth: Daxthas has been paying Thorrin to look away for years. _(found in Act II: the harbour warehouse; Act I: a small-town diner after hours)_\n- **How to stop Daxthas:** A way to stop Daxthas: Daxthas's alibi depends on a witness who has started to doubt it. _(found in Act I: a small-town diner after hours; Act II: the county records office)_\n\n**Steps**\n1. Reach the country club before the clock runs out.\n2. Show Daxthas the evidence, or show it to whoever they need on their side.\n3. Use the weakness: Daxthas's alibi depends on a witness who has started to doubt it.\n4. Decide what happens to the original will.\n\n**Other ways through**\n- Bargain: Daxthas stands down if they get part of what they want. This leads to A Costly Bargain.\n- Expose them: bringing Thorrin or the witness to testify works without the weakness, but takes longer.\n\n**If they get it wrong**\n- Wrong accusation: Daxthas gets a free move and the clock advances one step.\n- Using the weakness without the evidence: it works, but the party is blamed for what happened.\n_Players succeed by showing the right intent; they never have to recite exact words._\n\n## Daxthas's Plan\n**Advances when:** It advances at the end of each essential scene after the opening, and when the party reaches the finale, whatever the party does. Failing a challenge or resting also advances it; forcing a risky shortcut adds a complication instead.\n1. _First step:_ Daxthas learns the party is involved and sends a warning.\n2. _Step 2:_ Daxthas moves the original will; the next scene starts with the trail colder.\n3. _One step left:_ The plan is nearly done; Daxthas is ready for the finale.\n4. _Last step:_ The plan completes. Go to the Too Late ending, or run the finale as a last stand.\n**Point of no return:** Daxthas's plan completes. Until this step, everything can still be undone.\n**Slowing it:** Turning Daxthas's allies, or getting ahead of them in a scene, takes one step back.\n\n## Threads to Pay Off\n- Thorrin recognises the party from the news and begs them to look at a case the police closed. → the original will is recovered, bargained away or lost in the finale, and Thorrin reacts to which. _(Act III: the country club)_\n- Thoron saw something that points toward Daxthas. → Thoron can testify at the finale, which opens the \"expose them\" way through. _(Act II: the county records office; Act II: the harbour warehouse)_\n\n## Questions Players Will Ask\n- **Why now?** the original will was moved from its usual keeping for the first time in years, and Daxthas was waiting.\n- **Why us?** Thorrin can't be seen acting openly, and the party has no ties to Daxthas.\n- **Why doesn't Thorrin deal with it?** Thorrin has something to hide about the original will and would rather strangers did the digging.\n\n## Endings\n- **The Truth Out:** The party gathers the vital clues and defeats or exposes the antagonist. _(Does the party stop Daxthas before the clock runs out? Yes · Does the party keep the key evidence and refuse Daxthas's offers? Yes)_\n- **A Costly Bargain:** The party takes a deal with the antagonist or loses the key evidence. _(Does the party stop Daxthas before the clock runs out? Yes · Does the party keep the key evidence and refuse Daxthas's offers? No)_\n- **Too Late:** Time runs out before the party reaches the climax. _(Does the party stop Daxthas before the clock runs out? No)_\n\n## Running Late\n- Skip Act II: the county records office (saves 30 minutes).\n- Cut every remaining middle scene to one beat and head for the finale.\n- Hand the party the clue they are missing, then go straight to the climax.\n- Resolve the climax with one decisive choice and narrate the ending in five minutes.\n\n**Safe to cut:** Act II: the county records office (30 min)\n",
    labels: ["one-shot", "adventure", "one-shot-generator", "imported-draft"],
    status: "active",
    oneShot: {
      version: 1,
      title: "Original Will: A Modern Conspiracy One-Shot",
      genre: "Modern Conspiracy",
      system: "System-neutral",
      emphasis: "Action",
      structure: "Three-act",
      durationMinutes: 180,
      partySize: 4,
      briefing: {
        premise:
          "Thorrin needs the original will recovered before Daxthas can use it, and the trail runs through a small-town diner after hours.",
        hook: "Thorrin recognises the party from the news and begs them to look at a case the police closed.",
        objective: "Recover the original will and stop Daxthas.",
        secret: "Daxthas has been paying Thorrin to look away for years.",
        trigger:
          "the original will was moved from its usual keeping for the first time in years, and Daxthas was waiting.",
        stakes: "Daxthas wins the election and the town's records go with them",
        prep: "Read the briefing and cheat sheet (about 15 minutes) and open the NPC list.",
        questions: [
          {
            question: "Why now?",
            answer:
              "the original will was moved from its usual keeping for the first time in years, and Daxthas was waiting.",
          },
          {
            question: "Why us?",
            answer:
              "Thorrin can't be seen acting openly, and the party has no ties to Daxthas.",
          },
          {
            question: "Why doesn't Thorrin deal with it?",
            answer:
              "Thorrin has something to hide about the original will and would rather strangers did the digging.",
          },
        ],
      },
      opening: {
        situation:
          "Thorrin recognises the party from the news and begs them to look at a case the police closed.",
        readAloud:
          "The diner's neon sign hums, half the letters dead, and the coffee has been sitting there since closing.",
        firstDecision:
          "Accept Thorrin's offer as it stands, or ask for more before taking the job?",
        involvement: [
          "Hired directly by Thorrin.",
          "Personally connected to the missing item or the person who lost it.",
          "Witnessed the first sign of trouble and cannot leave it alone.",
        ],
      },
      scenes: [
        {
          id: "scene-1",
          title: "Act I: a small-town diner after hours",
          kind: "opening",
          essential: true,
          minutes: 30,
          location: "a small-town diner after hours",
          npcIds: ["npc-1", "npc-3"],
          clueIds: ["clue-1", "clue-2", "clue-3"],
          next: ["scene-2", "scene-3"],
          shorten:
            "Run it as one decisive beat in about 15 minutes: one question, one choice, then move on.",
          situation:
            "Thorrin recognises the party from the news and begs them to look at a case the police closed.",
          purpose: "Hit the first target",
          approaches: [
            "Create a distraction and hit from another side",
            "Use the terrain to even the odds",
            "Strike where the enemy is stretched thin",
          ],
          challenge: {
            type: "combat",
            description:
              "A tough fight against Daxthas's people. Victory should cost something other than hit points.",
            success:
              "The party wins when the opposition breaks, flees or is pinned down. Most foes give up when half of them are down or their leader falls.",
            otherApproaches: [
              "Talking: an offer of safe passage ends the fight if the party has already shown it can win.",
              "Stealth or tricks: getting past without a fight counts as success, but leaves the enemy behind them.",
            ],
            opposition:
              "Daxthas's people: one per player plus a leader. They fight in pairs, fall back to cover when hurt, and the leader runs at half strength. Halfway through, conditions change: reinforcements arrive, a fire spreads or the floor gives way.",
            failForward:
              "The party still gets the lead, but it costs them: time, a favour, or Daxthas learns they are coming.",
          },
          outcomes: [
            "Clean success: the party gets what it came for and the story moves on.",
            "Partial success: they progress, but a cost or new complication follows.",
            "Failure forward: the lead arrives anyway, in a worse position.",
          ],
          routes: [
            {
              to: "scene-2",
              risk: "The direct way keeps to the main paths, where Daxthas's watchers are most likely to see the party.",
              find: "Reaches the county records office with the trail still warm.",
            },
            {
              to: "scene-3",
              risk: "The detour takes the party off the trail while Daxthas's plan keeps moving.",
              find: "Something useful at the harbour warehouse: a shortcut, an ally or a clue the main road lacks.",
            },
          ],
          whereabouts: [
            {
              who: "npc-1",
              kind: "npc",
              state: "free",
              where: "a small-town diner after hours",
            },
            {
              who: "npc-3",
              kind: "npc",
              state: "free",
              where: "a small-town diner after hours",
            },
            {
              who: "the original will",
              kind: "object",
              state: "here",
              where: "a small-town diner after hours",
            },
          ],
        },
        {
          id: "scene-2",
          title: "Act II: the county records office",
          kind: "middle",
          essential: false,
          minutes: 30,
          location: "the county records office",
          npcIds: ["npc-3", "npc-2"],
          clueIds: ["clue-1", "clue-3"],
          next: ["scene-3"],
          shorten:
            "Run it as one decisive beat in about 15 minutes: one question, one choice, then move on.",
          situation:
            "Daxthas sends a lawyer, a donation and a polite warning, in that order.",
          purpose: "Escalate the fight",
          approaches: [
            "Pick off the leaders and let the rest break",
            "Use the terrain to even the odds",
            "Strike where the enemy is stretched thin",
          ],
          challenge: {
            type: "hazard",
            description:
              "A chase or collapsing set piece where each choice has a price.",
            success:
              "The party succeeds when everyone is through or out of danger; a good plan means only one person has to risk it.",
            otherApproaches: [
              "Waiting it out: the hazard passes, but the clock advances.",
              "Magic or gear: protects one person fully, or everyone partly.",
            ],
            opposition:
              "The place itself. It gets worse every round the party lingers, and halfway through the safe route closes, forcing a riskier one. Daxthas's people take any chance to make it worse.",
            failForward:
              "The party still gets the lead, but it costs them: time, a favour, or Daxthas learns they are coming.",
          },
          outcomes: [
            "Clean success: the party gets what it came for and the story moves on.",
            "Partial success: they progress, but a cost or new complication follows.",
            "Failure forward: the lead arrives anyway, in a worse position.",
          ],
          skip: "Skip it entirely. Anything the party would have learned here is also found in Act I: a small-town diner after hours.",
          whereabouts: [
            {
              who: "npc-2",
              kind: "npc",
              state: "hiding",
              where: "the county records office",
            },
            {
              who: "npc-3",
              kind: "npc",
              state: "free",
              where: "the county records office",
            },
          ],
        },
        {
          id: "scene-3",
          title: "Act II: the harbour warehouse",
          kind: "middle",
          essential: true,
          minutes: 35,
          location: "the harbour warehouse",
          npcIds: ["npc-3", "npc-2"],
          clueIds: ["clue-2"],
          next: ["scene-4"],
          shorten:
            "Run it as one decisive beat in about 20 minutes: one question, one choice, then move on.",
          situation:
            "A well-meaning local calls the authorities, and time just got shorter.",
          purpose: "Turn the tide",
          approaches: [
            "Strike where the enemy is stretched thin",
            "Create a distraction and hit from another side",
            "Pick off the leaders and let the rest break",
          ],
          challenge: {
            type: "combat",
            description:
              "An ambush at the harbour warehouse. The party must protect someone or something while they fight.",
            success:
              "The party wins when the opposition breaks, flees or is pinned down. Most foes give up when half of them are down or their leader falls.",
            otherApproaches: [
              "Talking: an offer of safe passage ends the fight if the party has already shown it can win.",
              "Stealth or tricks: getting past without a fight counts as success, but leaves the enemy behind them.",
            ],
            opposition:
              "Daxthas's people: one per player plus a leader. They fight in pairs, fall back to cover when hurt, and the leader runs at half strength. Halfway through, conditions change: reinforcements arrive, a fire spreads or the floor gives way.",
            failForward:
              "The party still gets the lead, but it costs them: time, a favour, or Daxthas learns they are coming.",
          },
          outcomes: [
            "Clean success: the party gets what it came for and the story moves on.",
            "Partial success: they progress, but a cost or new complication follows.",
            "Failure forward: the lead arrives anyway, in a worse position.",
          ],
          whereabouts: [
            {
              who: "npc-2",
              kind: "npc",
              state: "hiding",
              where: "the harbour warehouse",
            },
            {
              who: "npc-3",
              kind: "npc",
              state: "free",
              where: "the harbour warehouse",
            },
          ],
        },
        {
          id: "scene-4",
          title: "Act III: the country club",
          kind: "climax",
          essential: true,
          minutes: 65,
          location: "the country club",
          npcIds: ["npc-2", "npc-1"],
          clueIds: [],
          next: [],
          shorten:
            "Run it as one decisive beat in about 35 minutes: one question, one choice, then move on.",
          situation:
            "The party reaches the country club, where Daxthas is at the benefit dinner, with the original will and a good excuse.",
          purpose: "Resolve the central conflict",
          approaches: [
            "Use the terrain to even the odds",
            "Charge in and take control",
            "Pick off the leaders and let the rest break",
          ],
          challenge: {
            type: "hazard",
            description:
              "Stop Daxthas in a running fight across a place that is coming apart, with the original will at stake.",
            success:
              "The party wins by doing the steps in How the Finale Works, or by any other way through listed there.",
            otherApproaches: [
              "Waiting it out: the hazard passes, but the clock advances.",
              "Magic or gear: protects one person fully, or everyone partly.",
            ],
            opposition:
              "Daxthas and their closest guards. Daxthas fights from behind others and uses the place against the party; when cornered, they offer a deal. Midway through, the original will or the place itself becomes unstable and someone has to deal with it.",
            failForward:
              "The party does not lose; Daxthas gets part of what they want, and the party chooses which loss to accept before the ending.",
          },
          outcomes: [
            "Clean success: the party gets what it came for and the story moves on.",
            "Partial success: they progress, but a cost or new complication follows.",
            "Failure forward: the lead arrives anyway, in a worse position.",
          ],
          whereabouts: [
            {
              who: "npc-1",
              kind: "npc",
              state: "free",
              where: "the country club",
            },
            {
              who: "npc-2",
              kind: "npc",
              state: "hostile",
              where: "the country club",
            },
            {
              who: "the original will",
              kind: "object",
              state: "here",
              where: "the country club",
              how: "Daxthas's people carry it there.",
            },
          ],
        },
      ],
      npcs: [
        {
          id: "npc-1",
          name: "Thorrin",
          role: "retired detective",
          motivation:
            "Needs the original will back before anyone learns it was ever lost.",
          knows: "Knows Daxthas by another name, from years ago.",
          reaction:
            "Grateful and generous, until the party starts asking about the past.",
          cues: "Keeps checking the door, the window or the time.",
        },
        {
          id: "npc-2",
          name: "Daxthas",
          role: "respected local benefactor",
          motivation:
            "Sees the original will as the price of keeping their people safe, whatever it costs others.",
          knows:
            "Knows the party's patron is lying to them, and will say so at the worst moment.",
          reaction:
            "Tests the party with a small cruelty to see what they will put up with.",
          backstory:
            "Was cast out by the very people the original will protects, and has been planning this since.",
          tactics:
            "Never fights alone. Sends others first, watches how the party fights, then strikes at whoever seems to lead them. Withdraws rather than dies.",
          stopIf:
            "Offered a public apology and a place among those who cast them out.",
          cues: "Fidgets with something small and loses their train of thought when pressed.",
        },
        {
          id: "npc-3",
          name: "Thoron",
          role: "neighbour who keeps notes",
          motivation: "Wants the party to protect someone they love.",
          knows: "Knows a way into the place that nobody else remembers.",
          reaction:
            "Lies to protect themselves, then tells the truth if the party catches the lie gently.",
          cues: "Uses the party's names a little too often.",
        },
      ],
      clues: [
        {
          id: "clue-1",
          label: "Who is behind it",
          text: "Evidence that Daxthas is behind it.",
          essential: true,
          routes: [
            {
              sceneId: "scene-1",
              method: "Charge in and take control",
            },
            {
              sceneId: "scene-2",
              method: "Use the terrain to even the odds",
            },
          ],
        },
        {
          id: "clue-2",
          label: "What really happened",
          text: "The truth: Daxthas has been paying Thorrin to look away for years.",
          essential: true,
          routes: [
            {
              sceneId: "scene-3",
              method: "Use the terrain to even the odds",
            },
            {
              sceneId: "scene-1",
              method: "Strike where the enemy is stretched thin",
            },
          ],
        },
        {
          id: "clue-3",
          label: "How to stop Daxthas",
          text: "A way to stop Daxthas: Daxthas's alibi depends on a witness who has started to doubt it.",
          essential: true,
          routes: [
            {
              sceneId: "scene-1",
              method: "Strike where the enemy is stretched thin",
            },
            {
              sceneId: "scene-2",
              method: "Create a distraction and hit from another side",
            },
          ],
        },
      ],
      antagonistId: "npc-2",
      threads: [
        {
          kind: "history",
          setup:
            "Thorrin recognises the party from the news and begs them to look at a case the police closed.",
          payoff:
            "the original will is recovered, bargained away or lost in the finale, and Thorrin reacts to which.",
          sceneIds: ["scene-4"],
        },
        {
          about: "npc-3",
          kind: "promise",
          setup: "Thoron saw something that points toward Daxthas.",
          payoff:
            'Thoron can testify at the finale, which opens the "expose them" way through.',
          sceneIds: ["scene-2", "scene-3"],
        },
      ],
      decisions: [
        {
          id: "stopped",
          question: "Does the party stop Daxthas before the clock runs out?",
        },
        {
          id: "clean",
          question:
            "Does the party keep the key evidence and refuse Daxthas's offers?",
        },
      ],
      endings: [
        {
          id: "end-1",
          title: "The Truth Out",
          requires: {
            stopped: true,
            clean: true,
          },
          condition:
            "The party gathers the vital clues and defeats or exposes the antagonist.",
          consequence:
            "the original will is recovered, and Thorrin owes the party.",
        },
        {
          id: "end-2",
          title: "A Costly Bargain",
          requires: {
            stopped: true,
            clean: false,
          },
          condition:
            "The party takes a deal with the antagonist or loses the key evidence.",
          consequence:
            "Daxthas keeps part of what they wanted, and the party leaves with a debt.",
        },
        {
          id: "end-3",
          title: "Too Late",
          requires: {
            stopped: false,
          },
          condition: "Time runs out before the party reaches the climax.",
          consequence:
            "Daxthas finishes the plan, and the next adventure begins with the fallout.",
        },
      ],
      solution: {
        summary:
          "Daxthas is stopped at the country club by putting the three vital clues to use.",
        requirements: [
          {
            kind: "clue",
            what: "Who is behind it",
            detail: "Evidence that Daxthas is behind it.",
            sceneIds: ["scene-1", "scene-2"],
          },
          {
            kind: "clue",
            what: "What really happened",
            detail:
              "The truth: Daxthas has been paying Thorrin to look away for years.",
            sceneIds: ["scene-3", "scene-1"],
          },
          {
            kind: "clue",
            what: "How to stop Daxthas",
            detail:
              "A way to stop Daxthas: Daxthas's alibi depends on a witness who has started to doubt it.",
            sceneIds: ["scene-1", "scene-2"],
          },
        ],
        steps: [
          "Reach the country club before the clock runs out.",
          "Show Daxthas the evidence, or show it to whoever they need on their side.",
          "Use the weakness: Daxthas's alibi depends on a witness who has started to doubt it.",
          "Decide what happens to the original will.",
        ],
        alternatives: [
          "Bargain: Daxthas stands down if they get part of what they want. This leads to A Costly Bargain.",
          "Expose them: bringing Thorrin or the witness to testify works without the weakness, but takes longer.",
        ],
        mistakes: [
          "Wrong accusation: Daxthas gets a free move and the clock advances one step.",
          "Using the weakness without the evidence: it works, but the party is blamed for what happened.",
        ],
      },
      clock: {
        name: "Daxthas's Plan",
        advances:
          "It advances at the end of each essential scene after the opening, and when the party reaches the finale, whatever the party does. Failing a challenge or resting also advances it; forcing a risky shortcut adds a complication instead.",
        schedule: ["scene-end-after-opening", "finale-start"],
        pushes:
          "Failing a challenge or resting also advances it; forcing a risky shortcut adds a complication instead.",
        ticks: [
          {
            trigger: "First step",
            effect: "Daxthas learns the party is involved and sends a warning.",
          },
          {
            trigger: "Step 2",
            effect:
              "Daxthas moves the original will; the next scene starts with the trail colder.",
          },
          {
            trigger: "One step left",
            effect: "The plan is nearly done; Daxthas is ready for the finale.",
          },
          {
            trigger: "Last step",
            effect:
              "The plan completes. Go to the Too Late ending, or run the finale as a last stand.",
          },
        ],
        slow: "Turning Daxthas's allies, or getting ahead of them in a scene, takes one step back.",
        deadline:
          "Daxthas's plan completes. Until this step, everything can still be undone.",
      },
      epilogueHook: "Someone else has been asking about the original will.",
      timeBudget: {
        bufferMinutes: 20,
        runningLate: [
          "Skip Act II: the county records office (saves 30 minutes).",
          "Cut every remaining middle scene to one beat and head for the finale.",
          "Hand the party the clue they are missing, then go straight to the climax.",
          "Resolve the climax with one decisive choice and narrate the ending in five minutes.",
        ],
      },
    },
  },
  "plot-twist-generator": {
    type: "note",
    kind: "plot-twist",
    title: "A Truth with Terms: Hidden motive",
    summary:
      "Hidden motive complication for: An established situation under mounting pressure.",
    content:
      "## The Reveal\nThe situation is exactly as witnessed, but its most important meaning has been misunderstood: the pressure around an established situation under mounting pressure is being used to force a choice that benefits someone who cannot act openly.\n\n## What Everyone Believed\nEveryone assumes the visible conflict has one obvious cause and that resolving it will restore the old balance.\n\n## Why It Makes Sense\nThe established facts remain true; the reversal comes from the motive and leverage behind them. A hidden motive fits the Classic Fantasy tone at significant impact and can land any.\n\n## Foreshadowing\n- A witness remembers a detail that does not fit the accepted explanation.\n- A seemingly helpful action creates a cost for the people the players meant to protect.\n- The obvious beneficiary avoids claiming credit when the opportunity appears.\n\n## Immediate Consequences\n- The players must reassess who has leverage before committing to the obvious solution.\n- An existing ally, resource, or deadline becomes conditional rather than reliable.\n\n## New Choices\n- Pursue the immediate objective while accepting that the hidden beneficiary gains ground.\n- Expose the underlying motive and risk delaying the people who need help now.\n- Use the misunderstanding as leverage and negotiate a third outcome.",
    lore: "### Generator Brief\n- Theme: Classic Fantasy\n- Impact: Significant\n- Timing: Any",
    labels: ["plot-twist", "complication", "classic-fantasy"],
    status: "active",
  },
  "bbeg-generator": {
    type: "character",
    title: "Morgthas, the Reckoning",
    summary: "",
    content:
      "### Public Face\nTo most of the world, Morgthas is known only by reputation — the story people tell depends on how close they have come to the truth. In public record they are a respected, even admired figure, whose true reach few suspect.\n\n### Signature / Calling Card\nThey leave one survivor from every failure, always with the same warning.\n\n### First Signs\n- Unmarked convoys move at night along roads that used to be safe.\n- People who spoke out against the same cause have quietly stopped speaking at all.",
    lore: "### Core Concept\nA national-scale rival adventurer, and at heart a predator, whose arguably justified motives make them a campaign engine rather than a final-dungeon obstacle — every stage of their plan gives the party something to discover and something to lose by waiting.\n\n### True Nature\nBehind the public face lies a deliberate, patient design: every visible action is one piece of a larger plan the world has not yet recognised as connected.\n\n### Ultimate Goal\nMorgthas wants the current system left standing but quietly rigged so it keeps producing exactly what they need, for as long as they need it — the system is the resource, not the obstacle.\n\n### Why Now\nA recent shift — a rival's death, a discovered resource, an expiring constraint — has removed the last obstacle that kept them from acting, forcing the timeline the campaign now begins inside.\n\n### Motivation\nAs a predator, they sees no reason to change what works for them, only to protect their access to it from anyone who might notice. Their reasoning holds together on its own terms: arguably justified, shaped by rival adventurer methods.\n\n### Fatal Flaw\nThey trust their own read of people more than the evidence in front of them, and that overconfidence is what eventually hands the party their opening.\n\n### Methods\nTarget a country's infrastructure, elections, and national institutions through coordinated pressure that makes federal intervention serve the villain's agenda. Disciplined force projection, forward garrisons, and calculated provocations that let them claim retaliation rather than aggression.\n\n### Resources\nAgents across several regions, influence over national communications or infrastructure, and access to officials who can trigger a federal response. A standing force loyal to them personally, war materiel stockpiled ahead of need, and client commanders who owe their rank to the villain.\n\n### Lieutenants & Inner Circle\n- **Thormar** — Enforcer. Loyal out of genuine belief, not fear; privately doubts one specific order they have not yet refused.\n- **Brangar** — Fixer. Loyal only as long as it pays; keeps a private insurance policy against betrayal that could expose the whole operation.\n\n### Organisation & Power Structure\nA chain of command that answers to the villain alone, with political oversight kept deliberately thin.\n\n### Territory / Lair\nA distributed national network rather than one fortress: regional safe sites connected to a command centre near the country's political heart. A forward staging ground close enough to strike quickly, defended by troops who believe they are the ones under threat.\n\n### The Villain's Plan\n**Stage 1: Test the institutions** — Apply separate pressures to regions, agencies, and public systems to find the weakest links.\n**Stage 2: Manufacture a national crisis** — Join those pressures into a single emergency that demands central action.\n**Stage 3: Direct the federal response** — Place loyal operators where national resources and information are allocated.\n**Stage 4: Split the opposition** — Make regions, parties, or agencies blame one another before they can coordinate.\n**Stage 5: Take the national mandate** — Use legal or popular authority to make the villain's control appear necessary.\n**Stage 6: Rebuild the country around dependence** — Make the institutions that could remove the villain rely on the new order.\n\n### Escalation If Ignored\nLeft unopposed, each stage completes roughly on schedule; by Stage 4 the villain's position becomes semi-official, and by Stage 6 removing them creates as much damage as leaving them would have.\n\n### Discovery Layers\n**What the World Knows**: the public face and its official version of events.\n**What Their Servants Know**: the existence of the plan's broad shape, though rarely its final goal.\n**GM-Only Truth**: the full plan, the true nature, and the specific mechanism of the fatal flaw.\n\n### Personal Connections\n- A party member's mentor once worked for or against this villain.\n- The villain's rise directly caused a hardship in a PC's backstory.\n- The villain has, knowingly or not, made use of something a PC once did.\n\n### Weakness / Vulnerability\nTheir trusted inner circle is smaller than it appears, and turning even one member against them collapses their information advantage.\n\n### Moral Complication\nRemoving them cleanly may not resolve the underlying condition that let them rise — their departure risks a succession struggle among those they leveraged into power.\n\n### Final Confrontation\nThe stakes extend beyond the villain's own life — whatever mechanism completes Stage 6 needs to be addressed independently of whether the villain personally survives it.\n\n### If Defeated\nTheir network does not vanish with them: expect a contested succession, those they held sway over left to fend for themselves, and at least one lieutenant left to pursue their own agenda.",
    labels: ["villain", "bbeg-generator", "imported-draft"],
    status: "active",
    conflictDomain: "Military Conquest",
  },
  "comic-book-event-generator": {
    type: "event",
    title: "Last Signal: Registration / Political Crisis",
    summary: "",
    content:
      "### The Event\nA registration act requiring every superhuman to disclose their identity and submit to state oversight clears the legislature after a single catastrophic public incident tips opinion overnight.\n\n### Public Response\nNews coverage splits cleanly along a for/against line, and registration checkpoints open in every major city within the month. At Cosmic scale, beyond one planet. threats involve alien empires, dying stars, or forces indifferent to any single world; stakes are star systems or civilisations; response is whatever cosmic-scale power the setting allows, often arriving too late for anyone to feel in control.\n\n### How It Unfolds\n**Stage 1: First Signs** — Isolated, easy-to-dismiss reports precede open acknowledgement. Few outside those directly affected take the threat seriously yet.\n**Stage 2: Confirmation** — Authorities and heroes confirm the event is real and cannot be contained quietly. Public panic and mobilisation begin in earnest.\n**Stage 3: Escalation** — The event's true scope becomes visible; the response so far proves insufficient, forcing a larger, more coordinated effort.\n**Stage 4: Climax** — The act passes into law; the question shifts from whether it happens to who complies, who resists, and who is made an example of.",
    lore: "### True Cause\nThe incident that tipped the vote was engineered by a lobbying concern that profits from the registration infrastructure contract, and the 'independent' polling behind the bill was paid for.\n\n### The Climax\nThe act passes into law; the question shifts from whether it happens to who complies, who resists, and who is made an example of.\n\n### Lasting Consequences\n- A standing enforcement division now has legal authority to compel unmasking, and its first several high-profile arrests are already public record.\n- At least one previously public hero is unmasked during processing, and their civilian identity is now a matter of government file.\n- A visible resistance movement of unregistered supers has formed, permanently splitting what used to be one loosely-aligned hero community into two factions that no longer fully trust each other.\n\n### Campaign Hooks\n- The engineered incident's true architect still profits from the enforcement contract.\n- A registered hero is quietly leaking watchlist data to the resistance.",
    labels: ["comic-book-event", "superhero-event-generator", "imported-draft"],
    status: "active",
  },
  "villain-scheme-generator": {
    type: "note",
    title: "Operation Final Ledger",
    summary: "",
    content:
      "### Public Activity\nCoordinated disruptions are being reported around a neighbourhood whose alleys, rooftops, and community spaces let the villain move before outside help arrives., all following an unexplained pattern.\n\n### Rumours & Signs\n- Three separate witnesses describe the same unmarked van, always three blocks from where anything happened.\n- A retired cop keeps telling anyone who'll listen that the pattern looks familiar from a case that was never closed.\n\n### Adventure Hook\nA nervous city employee slips the heroes a copy of a permit application that shouldn't exist, then stops answering calls.",
    lore: "### Objective\nThe artificial intelligence behind Operation Final Ledger wants a concrete, lasting change in their own favour once the scheme completes — not vague power, but a specific asset, position, or secret permanently in their hands.\n\n### Motivation\nTheir reasoning holds together on its own terms: a cosmic, heist / theft-flavoured plan that makes sense from inside their own priorities, whatever the wider world would think of it.\n\n### Current Activity\nThe reported public incidents are a cover for quieter work: Keep the operation inside one neighbourhood: pressure local gangs, protect witnesses, and turn residents or small businesses into leverage.\n\n### Resources & Minions\n- **Caeldar** — handles the operation's day-to-day logistics; loyal enough to follow orders, not loyal enough to die for them.\n- **Morgric** — provides the specialised capability (technical, financial, or occult, matching heist / theft) the scheme depends on.\n- Power Scale: street-level threat.\n- A trusted network of residents, a safehouse, and access to local cameras, patrol schedules, or street-level informants.\n- Territory: A neighbourhood whose alleys, rooftops, and community spaces let the villain move before outside help arrives.\n\n### Scheme Stages\n**Stage 1: Mark the block** — Identify the people and businesses that control movement through the neighbourhood.\n**Stage 2: Remove local resistance** — Frighten, bribe, or discredit the first people who refuse to cooperate.\n**Stage 3: Control the routes** — Make safe passage, supplies, and information depend on the villain's permission.\n**Stage 4: Isolate the witnesses** — Cut off the one person or group that can unite the neighbourhood against them.\n**Stage 5: Claim the territory** — Turn practical control into a publicly recognised local order.\n**Stage 6: Enforce the finished order** — Make the neighbourhood's dependence permanent and punish any return to independence.\n\n### Complications\n- A rival faction is also circling the same target for its own reasons, and mistaking them for the villain's people costs the heroes time and goodwill.\n- A sympathetic low-level operative is only involved because of a debt they didn't choose, and getting caught in the crossfire would ruin someone who didn't deserve it.\n\n### Escalation If Ignored\nLeft unchecked, each stage completes roughly on schedule, and the villain's position becomes harder to dislodge the longer the heroes wait — by Stage 6, undoing the scheme costs far more than preventing it would have.\n\n### Consequences If Nobody Intervenes\nThe scheme completes: the artificial intelligence secures the objective outright, the public is left with only the cover story to explain what happened, and the affected community bears whatever cost the plan required.\n\n### Possible Twist\nSomeone the heroes already trust from an earlier stage — an informant, a minor witness, or a bystander who helped — turns out to have known more than they said, for reasons that recast their earlier help in a different light.",
    labels: ["villain-scheme", "villain-scheme-generator", "imported-draft"],
    status: "active",
  },
  "council-vote": {
    type: "event",
    title: "The Vote of the Religious Conclave",
    summary: "",
    content:
      "### The Proposal\nA contested proposal that will reshape the region\n\n### The Deadline\nThe Religious Conclave — a body shaped by the conventions of a classic fantasy setting — must call the vote before the week is out. Under a veto power rule across 5 seats, the party needs to shift the room before then.",
    lore: "### Voting Procedure\nVeto Power, 5 seats. Scope: Single Location.\n\n### Current Vote Estimate\nThe room is genuinely divided — no faction starts with a guaranteed majority.\n\n### Council Members\n- **Thorgar** (Greedy Broker) — Initial stance: Leaning. Purely transactional: the right bribe, contract, or cut of the outcome moves this vote.\n- **Caelric** (Greedy Broker) — Initial stance: Leaning. Purely transactional: the right bribe, contract, or cut of the outcome moves this vote.\n- **Branthas** (Idealist) — Initial stance: Unknown. Genuinely persuadable by principle: a compelling moral argument or proof of who truly benefits could win this vote.\n- **Thordar** (Idealist) — Initial stance: Support. Genuinely persuadable by principle: a compelling moral argument or proof of who truly benefits could win this vote.\n- **Caeldar** (Idealist) — Initial stance: Leaning. Genuinely persuadable by principle: a compelling moral argument or proof of who truly benefits could win this vote.\n\n### Antagonist Influence\nAntagonist influence over the council is subtle.\n\n### Investigation Leads\nEach councillor's public reputation hides a private agenda; asking around the religious conclave's usual haunts is the fastest way to learn who can be swayed and how.\n\n### Possible Paths\nAt least two coalitions of votes can carry the proposal — persuasion and evidence for the cautious, leverage and favours for the desperate. The costly best solution: win every seat outright, but only by spending every favour and secret in hand — the vote passes clean, and the party leaves owing debts, and making enemies, they cannot yet see the price of.\n\n### Follow-Up Hooks\nHowever the vote resolves, whichever councillors were crossed or courted will remember it long after the ballots are counted.",
    labels: [
      "council-vote",
      "political-intrigue",
      "Religious Conclave",
      "Classic Fantasy",
    ],
    status: "active",
  },
  "secret-society": {
    type: "faction",
    title: "The Kaeldar Circle",
    summary: "A silly local cell society hidden behind a wellness group.",
    content:
      "### What they believe\nThe Kaeldar Circle teaches that a buried truth can remake the world. Their doctrine is true, but not as they think, and that uncertainty drives every member.\n\n### What they do\nTheir signature ritual is masked suppers. They recruit through quiet favours, then test loyalty with a vow no outsider hears.\n\n### Public face\nThey present themselves as a wellness group, useful enough that neighbours defend them.\n\n### Secret truth\nWhat they revere is true, but not as they think; the inner circle knows only enough to fear it.\n\n### Current conflict\nTheir mostly harmless agenda is colliding with a member who has learned too much.\n\n### Adventure hooks\nFind the missing initiate; expose the false miracle; bargain with the rival cell; decide whether the society's secret should survive.",
    lore: "### At a Glance\n- **Leader**: Daxrin, a calm founder with a private fear of the truth.\n- **Taboo**: Never speak the founding name in daylight.\n- **Recruitment**: A favour, a test, then a shared secret.\n- **Hierarchy**: Listeners, keepers, and an unseen inner circle.\n- **Sacred Object**: bone key.\n- **Meeting Site**: A back room beneath their public institution.\n- **Signs**: A repeated knot-mark and an impossible coincidence.\n\n### Follow-Up Suggestions\nGenerate their leader, sacred site, rival sect, initiation ritual, rumours, or an adventure hook.",
    labels: ["secret-society", "faction-generator", "imported-draft"],
    status: "active",
  },
  constellation: {
    type: "note",
    kind: "constellation",
    title: "The Drowned Crown",
    summary:
      "The Drowned Crown is a constellation the Kesh Riders read as a serpent or dragon, tied to tidal or seasonal prediction.",
    content:
      "## Core Concept\nThe Drowned Crown is a constellation the Kesh Riders read as a serpent or dragon. Used by the Kesh Riders for tidal or seasonal prediction.\n\n## Origin Myth\nThe Kesh Riders tell that The Drowned Crown is a guardian who chose to stand watch from above rather than leave the living undefended. Its shape, read as a serpent or dragon, is how the story is remembered even by those who have never heard it told in full.",
    lore: "## Seasonal Visibility\nRises just before dawn in the last weeks of winter, a signal the thaw is close.\n\n## Practical Use\nUsed by the Kesh Riders for tidal or seasonal prediction.\n\n## Cultural & Religious Meaning\nRegarded by the Kesh Riders as an ancestor or founding hero.\n\n## Omens\nA red haze near it is taken as a sign a hidden grudge is about to surface.\n\n## Adventure Hook\nA member of the Kesh Riders insists The Drowned Crown rose out of season this year, and wants the party to find out why before the rest of the camp panics.",
    pattern: {
      stars: [
        {
          x: 61.5,
          y: 39.6,
          brightness: "moderate",
        },
        {
          x: 36.5,
          y: 6.3,
          brightness: "moderate",
        },
        {
          x: 65.9,
          y: 26,
          brightness: "bright",
          name: "Crown's Eye",
          notes:
            "The star the Kesh Riders point to first when teaching the shape to children.",
        },
        {
          x: 71.3,
          y: 35.7,
          brightness: "faint",
        },
        {
          x: 37,
          y: 38.2,
          brightness: "moderate",
        },
      ],
      lines: [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 4],
      ],
    },
    interpretations: [
      {
        culture: "the Kesh Riders",
        name: "The Drowned Crown",
        visualImpression: "Serpent or Dragon",
        originMyth:
          "The Kesh Riders tell that The Drowned Crown is a guardian who chose to stand watch from above rather than leave the living undefended. Its shape, read as a serpent or dragon, is how the story is remembered even by those who have never heard it told in full.",
        seasonalVisibility:
          "Rises just before dawn in the last weeks of winter, a signal the thaw is close.",
        practicalUse:
          "Used by the Kesh Riders for tidal or seasonal prediction.",
        culturalMeaning:
          "Regarded by the Kesh Riders as an ancestor or founding hero.",
        omen: "A red haze near it is taken as a sign a hidden grudge is about to surface.",
        adventureHook:
          "A member of the Kesh Riders insists The Drowned Crown rose out of season this year, and wants the party to find out why before the rest of the camp panics.",
      },
    ],
    labels: [
      "constellation",
      "classic-fantasy",
      "serpent-or-dragon",
      "tidal-or-seasonal-prediction",
    ],
    status: "active",
  },
  "alien-race": {
    type: "creature",
    title: "Veyan Deep-Chorus",
    summary:
      "The Veyan Deep-Chorus are a cyberpunk species from a gas giant's cloud deck, whose speech in light and metamorphic life stages make them persistently difficult for other species to read.",
    content:
      "## Overview\nThe Veyan Deep-Chorus are a cyberpunk species with a segmented external shell that must be shed and regrown to allow growth, native to a gas giant's cloud deck. Their disposition is status-obsessed, they are organised as rigid caste system, and they currently stand as first contact pending to their neighbours.\n\n## Evolutionary Origin\nThey evolved on a gas giant's cloud deck, which selected for buoyancy control and lifelong flight or float. That pressure set the constraints they have lived inside ever since — though not everything about them follows from it.\n\n## Homeworld & Environment\nTheir homeworld is a banded atmosphere with no solid ground anywhere beneath the habitable layer. Because of it, they have no concept of land ownership at all, and their entire legal tradition is built around rights of passage instead.\n\n## Biology & Lifecycle\nPhysically they have a segmented external shell that must be shed and regrown to allow growth. They live a life cycle passing through distinct bodily stages, each with different capabilities; an individual is not one person to them but a sequence, and their languages use different pronouns and often different names per stage.\n\n## Senses, Communication & Psychology\nThey communicate by rippling light patterns across the skin or shell, which means conversation requires line of sight and adequate darkness, so their architecture is built around sightlines and their working day is nocturnal. In practice, privacy is physical — a closed door is genuinely a sealed conversation — and their law treats being seen speaking as equivalent to being overheard. Temperamentally they are status-obsessed: every interaction is also a ranking, and they cannot accept a gift without first working out what accepting it costs them.\n\n## Culture & Social Structure\nThey organise themselves as rigid caste system. Authority attaches to a life stage rather than a person, so their leadership rotates biologically and cannot be seized — only waited for. Their body plan shows here too: every adult has spent days of their life soft, blind and helpless during a moult, so their whole society is organised around who watches over whom. Not all of it comes from their biology, though — their present institutions date from a treaty signed in bad faith three generations ago, whose terms held anyway and whose original purpose nobody now alive can reconstruct.\n\n## Technology\nAt an interplanetary level, their engineering shows its origins plainly: their materials science began with their own shed shells and remains obsessed with layered composites; armour is a civil craft, not a military one. Their acknowledged speciality is atmospheric chemistry and buoyant structures, unmatched by any surface-dwelling species.\n\n## Beliefs & Worldview\nThey believe position is earned continuously rather than held, so their powerful are the most anxious among them, never the most secure. What another species would call faith, they treat as an accurate description of how the world has always behaved for them.\n\n## Relations with Outsiders\nThey are currently first contact pending. The friction is rarely malice: nobody has yet worked out which of their signals are greetings and which are warnings, and both sides are being careful for different reasons.\n\n## Internal Factions & Conflicts\nOne faction holds that their atmospheric chemistry should be traded openly for standing among other species; another argues that dependence is exactly how a species like theirs gets absorbed. Neither side is wrong about the risk.",
    lore: "## Weaknesses & Constraints\n- A moulting individual is defenceless for days, and their calendar, courts and wars all bend around moult season.\n- A solid surface is unusable to them; they cannot support their own weight on one.\n\n## Naming Conventions\nNames are short pattern-sequences, written as glyph strings and pronounced only when speaking to species who cannot see properly.\n\n## Typical Archetypes\n- **The Intermediary** — one of the few who can work comfortably with outsiders, and quietly distrusted at home for it.\n- **The Specialist** — trained into their people's speciality, atmospheric chemistry, and worth more abroad than at home.\n- **The Unfitted** — born without the aptitude their people organise themselves around, and living proof that the pattern everyone treats as universal has exceptions.\n\n## Adventure Hooks\n- A delegation of the Veyan Deep-Chorus needs an outsider to carry a message their own communication cannot safely encode.\n- Something is exploiting a known weakness of theirs deliberately, and they cannot investigate it without admitting the weakness exists.\n- Their two internal factions are both recruiting the party, and each is telling a partial truth about what the other intends.",
    labels: [
      "alien-race",
      "cyberpunk",
      "freeform",
      "chitinous-exoskeletal",
      "gas-giant-cloud-deck",
      "rigid-caste-system",
      "interplanetary",
    ],
    status: "active",
  },
  creature: {
    type: "creature",
    kind: "creature",
    title: "Coral-Weaver",
    summary:
      "A medium / human-sized engineered / mutated beast that acts as a environmental / supernatural hazard in mountain peaks / cliffs, known for its chameleonic refraction.",
    content:
      "### At a Glance\n- **Classification**: Engineered / Mutated Beast\n- **Size & Form**: Medium / Human-sized\n- **Habitat**: Mountain Peaks / Cliffs\n- **Threat Level**: Minor Nuisance / Scavenger\n- **Temperament / Sapience**: Cunning / Pack Mind\n- **Ecological Role**: Environmental / Supernatural Hazard\n\n### Appearance & Anatomy\nThe Coral-Weaver possesses a dense, adapted physique tailored for survival in mountain peaks / cliffs. Its outer layer displays mottled coloration suited for natural concealment, reinforced with fibrous sinew and hardened plates along its dorsal ridge. Movement is deliberate and efficient, conserving energy until an immediate need demands sudden bursts of speed.\n\n### Core Concept & Ecology\nThe Coral-Weaver functions as a environmental / supernatural hazard within mountain peaks / cliffs. It establishes seasonal territory around natural food caches and migratory choke-points, patrolling its perimeter with predictable frequency. It feeds primarily on local flora, fauna, and mineral deposits, shaping the surrounding biome through its feeding corridors.\n\n### Observable Abilities & Defences\n- **Chameleonic Refraction**: Shifts dermal chromatophores to match surface textures and ambient light, becoming virtually invisible while motionless.\n- **Adaptive Mobility**: Navigates difficult terrain within mountain peaks / cliffs without loss of momentum or balance.\n- **Sensory Acuity**: Acute olfactory and vibrational perception, detecting encroaching entities long before visual contact.\n\n### Known Weaknesses & Limitations\n- **Violent sudden vibrations or flour/powder coatings disrupt the optical alignment of its scales immediately.**\n- **Behavioural Limitation**: Reluctant to cross open, exposed areas with bright light or strong drafts unless starved.\n\n### Combat & Encounter Behaviour\nWhen threatened, the creature adopts a defensive posture, issuing low warning signals to discourage confrontation. If cornered or defending its territory, it unleashes its **Chameleonic Refraction** before maneuvering toward flanking angles. If reduced to severe injury or if its prey proves too resilient, it disengages rapidly into familiar crevices.\n\n### Harvest & Remains\nChromatophoric hide patches that retain light-bending qualities for several weeks if preserved in alcohol.\n\n### Known Lore & Signs\n- **Field Signs**: Unsettling optical mirages and shifting shadows in peripheral vision.; Oddly parallel claw scrapes along high branch burls.; Sudden cessation of all insect chirping when passing specific trees..\n- **Common Belief**: Regional hunters and scouts recognise the creature by its distinct seasonal calls and territory scrapings.",
    lore: "### True Origin & Hidden Ecology\nThe Coral-Weaver's presence is deeply tied to subterranean ley-seams and nutrient surges. Its reproductive cycle is tied to environmental shifts, producing small clutches of dormant cocoons that remain viable for decades until specific seasonal moisture or etheric resonance triggers emergence.\n\n### Hidden Abilities & Surprises\n- **Refractive Mirage Decoy: when startled, sheds a phantom afterimage while slipping silently into shadows in the opposite direction.**\n- **Symbiotic Alarm**: Disturbed nests release airborne spore markers that agitate other nearby fauna into a defensive frenzy.\n\n### Secret Weaknesses\n- **Extreme cold temperatures freeze the lipid layer beneath its dermal chromatophores, locking it into a stark, luminescent white silhouette.**\n- **Metabolic Crash**: Expending its **Chameleonic Refraction** consecutively rapidly depletes its internal reserves, leaving it sluggish for several minutes afterward.\n\n### Tactical Notes\n- **Choke-Point Ambush**: Uses environmental shadows and acoustic echoes to split adventuring parties, striking the rearguard while creating simulated noise ahead.\n- **Lair Traps**: Pre-excavates false sinkholes and loose talus slopes around its den to collapse under heavy intruders.\n\n### Truth Behind Rumours\n- **Local Legend (Distorted)**: Legends claim it is born from the concentrated malice of lost wanderers.\n- **The Reality**: It is simply an ancient evolutionary offshoot preserved in isolated biomes, displaying heightened predator intelligence rather than supernatural cursed malice.\n\n### Adventure & Encounter Hooks\n- **The Blocked Route**: A family of Coral-Weavers has claimed a crucial trade pass as their nesting territory, halting transit until they can be peacefully relocated or driven off.\n- **The Harvester's Contract**: A local apothecary or researcher offers a substantial bounty for intact biological samples without killing the specimen.\n- **The Omens Below**: Sightings of Coral-Weavers fleeing their native deep habitats suggest a far greater seismic or supernatural disturbance is waking beneath the region.",
    labels: [
      "creature",
      "monster-generator",
      "engineered-mutated-beast",
      "classic-fantasy",
    ],
    status: "active",
  },
  encounter: {
    type: "event",
    title: "The Kaelric Encounter",
    summary:
      "A moderate environmental encounter unfolds in a forest wilderness, carrying a strange atmosphere.",
    content:
      "### What the Players See\nA moderate environmental encounter unfolds in a forest wilderness, carrying a strange atmosphere. The danger here is the place itself, not any single opponent.",
    lore: "### At a Glance\n- **Type:** Environmental\n- **Threat:** Moderate\n- **Location:** Forest Wilderness\n- **Tone:** Strange\n- **Participants:** Displaced creatures behaving strangely aggressive\n- **Immediate Situation:** A moderate environmental encounter unfolds in a forest wilderness, carrying a strange atmosphere.\n- **Key Stakes:** Survival, nearby lives, and the way forward all hang on this\n\n### Situation & Stakes\nA moderate environmental encounter unfolds in a forest wilderness, carrying a strange atmosphere. Left unaddressed, it will escalate in a way that costs someone here something they cannot easily recover.\n\n### Participants\n- No living participants -- the environment itself is the antagonist, trying to survive or exploit what the hazard has already caused.\n\n### Environment\nThe forest wilderness shapes what is possible here -- offering cover, obstacles, or hazards that a careful party can turn to its advantage, and that a careless one will suffer for ignoring.\n\n### Possible Approaches\n- trapped or struggling locals whose rescue could pay off later\n- a route around the hazard that costs time rather than risk\n- a way to brave the hazard directly, at real risk, to reach what lies beyond\n\n### Complication / Twist\nSomething about this situation is not what it first appears -- the true cause, a hidden participant, or an overlooked consequence surfaces once the party commits to a course of action.\n\n### Outcomes & Consequences\n- **Success**: The immediate threat is contained, not erased -- the party gains a proportionate reward, information, an item, standing, or a favor tied to what the participants were protecting or pursuing, but pays for it in cost, leverage, or a relationship left strained.\n- **Failure**: The situation escalates into a real setback that costs time or standing to fix, and whatever the participants wanted proceeds unopposed.\n- **Avoidance**: The encounter resolves without the party, for better or worse, off-screen.\n- **Escalation**: A poorly chosen approach or delay invites a complication serious enough to change the party's plans, tied to the encounter's underlying cause.",
    labels: [
      "encounter",
      "encounter-generator",
      "imported-draft",
      "environmental",
      "classic-fantasy",
    ],
    status: "active",
  },
  heist: {
    type: "event",
    title: "The Thormar Lift",
    summary:
      "Assassination: one night to reach a mark who is only ever alone inside this building and leave without being placed there.",
    content:
      "### The Score\nAssassination at the Kaelrin Guild Vault, a small-scale guild vault: one night to reach a mark who is only ever alone inside this building and leave without being placed there.\n\n### The Target\nA mark who is only ever alone inside this building. Killing them is the job; not being the obvious answer afterwards is the rest of it.\n- **Where**: On the secured floor, during a nightly inspection nobody else attends.\n- **Window**: The mark is alone until an attendant returns thirty minutes after entry.\n- **Protection**: An escort everywhere else in the building, and a standing order that they are never alone in public.\n- **Methods**: Contaminate the mark's private drink, arrange a fatal failure of their balcony rail, or confront them while the attendant is away; the chosen method must respect the catch.\n- **Once it is done**: Escape still matters; witnesses or active tracing can expose the crew before the scheduled check.\n- **The catch**: Precise — one specific thing must happen and nothing beside it.\n- **Pressure**: Observe the routine, isolate the intended target, then prepare the tools: each stage takes five minutes and advances a three-step work clock. At three steps an attendant visits the work area; a convincing cover story explains the crew. Harming anything outside the agreed target fails the job.\n\n### Casing the Target\n- **Entry vector**: A service route staff use daily stays open throughout this shift; its covered alcove is out of sight of the outer patrol.\n- **Known obstacle**: The credential check between the public floor and the secured floor is watched, not merely locked.\n- **The objective**: They are alone only at the end of the nightly inspection, and escorted every other hour of the day.",
    lore: "### GM Quick Reference\n- **Objective**: Assassination — one night to reach a mark who is only ever alone inside this building and leave without being placed there.\n- **Primary obstacle**: Three layers — patrols outside, a watched credential check, and the inner sanctum.\n- **Hidden factor**: A relief guard now rests in the service alcove; their lantern is visible before entry.\n- **Point of no return**: The kill begins the escape; discovery depends on the method and inspection timing.\n- **Pressure**: Three five-minute preparations; an attendant then visits the work area.\n- **Default complication**: The target expected the crew and deliberately let them in.\n- **Escape problem**: The service entrance is blocked five minutes after an alarm, leaving time to race back.\n\n### The Hidden Factor\nA relief guard rests in the service alcove this shift, although the crew's briefing called it empty. Their lantern is visible from outside: wait for them to leave on an errand, draw them away, or enter openly with a credible delivery.\n\n### Security Rings\n- **Perimeter**: Patrols circle the Kaelrin Guild Vault. Pass by timing a gap between rounds, by arriving with expected staff, or by crossing the unwatched yard wall.\n- **Access**: A veteran keeper checks credentials at the secured floor. Pass by borrowing a credential, by arranging a staff escort, or by posing as a worker called to fix the door.\n- **Inner Sanctum**: A watched door protects the target — their routine, their escort, and the rooms they are ever alone in. Borrow the key, arrange an escorted visit, or remove the hinge pins while the keeper is away; the objective's catch still applies.\n\n### Alarm Track\n- **0 — Quiet**: Routine holds. Patrols on schedule, staff bored, nobody looking for anyone.\n- **1 — Suspicion**: One guard breaks routine to check what bothered them. Patrol timings stop being predictable.\n- **2 — Alert**: A witness reports an intrusion or the scheduled check finds unexplained evidence. Exits are watched and reinforcements called; they reach the service entrance in five minutes.\n- **3 — Lockdown**: Five minutes after Alert, reinforcements block the service entrance and bar the public doors. The drains remain open; a forged evacuation order or distracting the entrance guards can still get people out.\n- **4 — Lethal Response**: Whatever the target keeps for this is loose and hunting to kill. It covers the exits — but it can be drawn off, bargained with, or given something it wants more than the crew.\n\n### Complications\n- **Likely (default)**: The target expected the crew and deliberately let them in.\n- **Alternative**: A scheduled inspection has put twice the usual staff on site tonight.\n- **Alternative**: A rival crew has started its own run on the same target tonight.\n\n### When the Target Is Killed\nThe target dies, but discovery is separate. The attendant returning thirty minutes after entry raises Alert on finding a suspicious death; a convincing natural cause avoids an immediate search for intruders. On discovery, raise **2 — Alert**. Reinforcements take five minutes to reach the service entrance; only then is it blocked.\n\n### The Getaway\nThe entry route remains usable until reinforcements reach it, five minutes after an alarm; a covert crew can leave before discovery.\n- **Race back**: Retrace the service route in three minutes, plus any delay imposed by the catch; after it is blocked, lure the guards away or negotiate passage.\n- **Public departure**: Walk out with the departing staff before Lockdown; afterwards, a forged evacuation order can persuade the door guards, at the cost of a face-to-face challenge.\n- **Drain route**: The yard drain reaches beyond the wall in fifteen minutes; its narrow bend only admits cargo that fits intact or can safely be dismantled, and injured passengers need support. Otherwise use a full-width exit.\n**Pursuit**: Guards follow only if a witness identifies the crew's exit or an active trace reveals their location; breaking that trail lets the crew escape unseen.\n\n### Flashback Opportunities\nOffer these; never assume the players used them.\n- An inside contact who owes someone in the crew a favour\n- Knowledge of how the security system fails, learned from whoever installed it\n- A debt called in with a local fixer for a single, no-questions favour\n- Equipment cached somewhere inside during a legitimate visit\n- A rehearsed distraction that will pull staff to the wrong part of the building",
    labels: [
      "heist",
      "heist-generator",
      "Assassination",
      "Guild Vault",
      "Classic Fantasy",
    ],
    status: "active",
  },
  business: {
    type: "faction",
    title: "The Crooked Compass",
    summary: "Mercenary company in the district, modest and steady.",
    content:
      '## Identity\n**The Crooked Compass** — Mercenary company in the district, modest and steady.\nReputation: Notorious for the one job that went badly wrong.\nWhat makes it distinctive: A cellar of rare reagents bought at a bankrupt estate.\n\n## What It Does\nThe mercenary company runs a steady trade in ordinary work, with a few specialist jobs.\nWho pays: Passing travellers who want a fair price.\nWhy here: The owners grew up nearby, and the regulars have known them for years.\nMain income: Subscriptions from a handful of loyal households.\nHow it earns: It rents out what it owns and takes a fee for looking after it.\nSize: A small outfit: the owner, a few staff, and borrowed space for the overflow.\nRight now: Barely breaking even, and hiding it from customers.\n\n## Leadership\n**Dace Brandt** (owner) — Buy out the partner who wants to sell up.\nStyle: Leads by example and expects the same of everyone.\nTrait: Stubborn and proud of it.\nPressure: Health is failing, and no successor has been chosen.\n\n## Key Staff\n- **Halle Vance**, Security and muscle — Quick hands and a sharp eye for quality.\n- **Mara Marrow**, Ambitious deputy — Dependable, but drinks a little more than is wise.\n\n## Clientele\nTypical: Traders who need something fixed, moved or sold quickly.\nValuable: Outsiders with money who need a local guide.\nUndesirable: People who come back only to complain.\nExcluded: Guild inspectors on a bad day.\n\n## Suppliers and Dependencies\n- Journeymen who know the older techniques (labour). If it fails: Quality drops and the best orders go to a rival.\n- Charcoal from the eastern mines (materials). If it fails: The forge goes cold within a week and every order slips.\n\n## Competitors and Relationships\n- **The Saltmarsh Gang** — protected by. Collects a quiet fee for keeping the carts moving.\n\n## Reputation\nExclusive; you have to be recommended to get in.\nConsequence: Anyone seen leaving the back door is quickly gossiped about across the district.\n\n## Current Pressure\nTwo apprentices have left for a rival house and taken the customer list with them.\n\n## Unusual Asset\nA walled yard with a private well that never runs dry.\n\n## Secret\nThe original owner left a sealed will that names a different heir, and only one clerk knows where it is.\n\n## Opportunity\nThe city is hiring a supplier for a public works project.\n\n## Complication\nA rival has spread a rumour that the goods are watered down.\n\n## Adventure Hooks\n- The Saltmarsh Gang wants something from the business: Collects a quiet fee for keeping the carts moving.\n- Dace Brandt is hiding how bad "Two apprentices have left for a rival house and taken the customer list with them." has become and needs help before it breaks.\n- If Journeymen who know the older techniques fails, Quality drops and the best orders go to a rival.',
    lore: "",
    labels: ["business", "business-generator", "classic-fantasy"],
    status: "active",
    business: {
      version: 1,
      options: {
        genre: "Classic Fantasy",
        businessType: "Mercenary company",
        scale: "small",
        legitimacy: "legitimate",
        wealth: "modest",
        clientele: "",
        location: "",
        tone: "grounded",
        campaignContext: "",
        playersOwn: false,
      },
      identity: {
        name: "The Crooked Compass",
        type: "Mercenary company",
        description: "Mercenary company in the district, modest and steady.",
        reputationLine: "Notorious for the one job that went badly wrong.",
        distinctive: "A cellar of rare reagents bought at a bankrupt estate.",
      },
      operations: {
        provides:
          "The mercenary company runs a steady trade in ordinary work, with a few specialist jobs.",
        payers: "Passing travellers who want a fair price.",
        whyHere:
          "The owners grew up nearby, and the regulars have known them for years.",
        mainIncome: "Subscriptions from a handful of loyal households.",
        model:
          "It rents out what it owns and takes a fee for looking after it.",
        size: "A small outfit: the owner, a few staff, and borrowed space for the overflow.",
        position: "Barely breaking even, and hiding it from customers.",
      },
      leadership: {
        id: "lead",
        name: "Dace Brandt",
        role: "owner",
        goal: "Buy out the partner who wants to sell up.",
        style: "Leads by example and expects the same of everyone.",
        trait: "Stubborn and proud of it.",
        pressure: "Health is failing, and no successor has been chosen.",
      },
      staff: [
        {
          id: "staff-1",
          name: "Halle Vance",
          role: "Security and muscle",
          goal: "Win a place in a better shop across the city.",
          trait: "Quick hands and a sharp eye for quality.",
        },
        {
          id: "staff-2",
          name: "Mara Marrow",
          role: "Ambitious deputy",
          goal: "Pay off a private debt before the next season.",
          trait: "Dependable, but drinks a little more than is wise.",
        },
      ],
      clientele: {
        typical: "Traders who need something fixed, moved or sold quickly.",
        valuable: "Outsiders with money who need a local guide.",
        undesirable: "People who come back only to complain.",
        excluded: "Guild inspectors on a bad day.",
      },
      dependencies: [
        {
          id: "dep-1",
          input: "Journeymen who know the older techniques",
          kind: "labour",
          ifItFails: "Quality drops and the best orders go to a rival.",
        },
        {
          id: "dep-2",
          input: "Charcoal from the eastern mines",
          kind: "materials",
          ifItFails: "The forge goes cold within a week and every order slips.",
        },
      ],
      relationships: [
        {
          id: "rel-1",
          name: "The Saltmarsh Gang",
          kind: "criminal",
          label: "protected by",
          reason: "Collects a quiet fee for keeping the carts moving.",
          partyKind: "organisation",
        },
      ],
      reputation: {
        perception: "Exclusive; you have to be recommended to get in.",
        consequence:
          "Anyone seen leaving the back door is quickly gossiped about across the district.",
      },
      pressure:
        "Two apprentices have left for a rival house and taken the customer list with them.",
      asset: "A walled yard with a private well that never runs dry.",
      secret:
        "The original owner left a sealed will that names a different heir, and only one clerk knows where it is.",
      opportunity: "The city is hiring a supplier for a public works project.",
      complication:
        "A rival has spread a rumour that the goods are watered down.",
      hooks: [
        "The Saltmarsh Gang wants something from the business: Collects a quiet fee for keeping the carts moving.",
        'Dace Brandt is hiding how bad "Two apprentices have left for a rival house and taken the customer list with them." has become and needs help before it breaks.',
        "If Journeymen who know the older techniques fails, Quality drops and the best orders go to a rival.",
      ],
      fallbackSections: [],
    },
  },
  "mystery-investigation": {
    type: "note",
    title: "Smoke Over the Yard",
    summary:
      "Eerie classic fantasy case about a disappearance with evidence the players can test.",
    content:
      "## Opening Hook\nDisappearance at The private archive has left a question the authorities cannot answer. The party is asked to establish what happened before the next public deadline.\n\n## Central Question\nWhat happened, and which account survives the evidence?\n\n## People to Question\n- **Branon — records clerk:** Conceal a damaging truth before it becomes public. Their account can be tested: A witness can confirm part of the account, but not the critical interval.\n- **Vaelthas — healer:** Protect a personal interest that creates a plausible alternative lead. Their account can be tested: Their account is partly corroborated and can be tested against the timeline.\n- **Thormar — courier:** Protect a personal interest that creates a plausible alternative lead. Their account can be tested: Their account is partly corroborated and can be tested against the timeline.\n- **Morgmar — watch officer:** Protect a personal interest that creates a plausible alternative lead. Their account can be tested: Their account is partly corroborated and can be tested against the timeline.\n\n## Places to Investigate\n- **The public hall:** Search for activity records, overlooked traces, and people whose accounts can be checked.\n- **The private archive:** Search for activity records, overlooked traces, and people whose accounts can be checked.\n- **The riverside storehouse:** Search for activity records, overlooked traces, and people whose accounts can be checked.\n\n## Evidence\n- **Lead 1:** A fresh scrape on the archive latch supports recent access, but does not identify who opened it; compare the tool marks and access log.\n- **Lead 2:** A witness recalls the shutters banging early, supporting a shifted timeline, but not proving who caused it; check the latch mechanism and other witnesses.\n- **Lead 3:** A delivery seal was replaced with the wrong wax, supporting interference with the evidence chain, but not proving the contents changed; find the matching seal at the storehouse.\n- **Lead 4:** A receipt was copied in a different ink, supporting a later alteration, but not proving who made it; compare the ink with the archive supplies.\n- **Lead 5:** The courier route was changed that evening, supporting an opportunity window, but not proving a meeting occurred; ask who authorised the change.\n- **Lead 6:** A damp footprint ends at a dry threshold, supporting a staged trail, but not proving who staged it; compare the tread with the storehouse floor.\n\n## Pressure and Outcomes\nEach delay changes who controls the evidence and who is willing to speak. The case can end with a supported accusation, a partial account, a mistaken conclusion the party can test, or a legitimately unsolved mystery with lasting consequences.",
    lore: "## GM-Only Fixed Truth\nBranon is responsible. Their motive is to conceal an earlier act that would expose their role in the disappearance. They used routine access and a manipulated timeline; the physical traces above are genuine and independently testable.\n\n## Timeline\n1. The evidence was moved before the public account was given.\n2. The culprit created a plausible access window.\n3. The party discovers conflicting but testable accounts.\n\n## If the Investigation Stalls: Next NPC Moves\n| Actor | Trigger | Next Move | Observable Consequence | Testable Lead |\n|---|---|---|---|---|\n| Branon | Investigation stalls or goes unopposed before the deadline | Quietly moves or conceals a corroborating record | A clerk notices a recently disturbed shelf and fresh ink near the archive | Compare the ink and shelf dust against the storehouse delivery log |\n| Vaelthas | Questioned under pressure or offered protection | Shares a guarded detail about the altered schedule | Witnesses see them speaking with the watch or handing over a receipt | Cross-check the receipt time against the courier route change |\n| Thormar | Investigation stalls without direct contact | Keeps to their routine and watches quietly without escalating | No overt change; their daily rounds continue on schedule | None |\n\n## Running the Case\nKeep the truth fixed. Do not make a clue false to force suspense. If the party loses a critical lead, use the unsolved outcome and its consequences rather than adding an unearned rescue.",
    labels: ["mystery", "investigation", "mystery-generator"],
    status: "draft",
  },
  "language-generator": {
    type: "note",
    kind: "language",
    title: "Iofielefana",
    summary:
      "A Lyrical & Vowel-rich Common Speech spoken in the Classic Fantasy setting.",
    lore: '### At a Glance\n- **Genre / Setting:** Classic Fantasy\n- **Tone:** Lyrical & Vowel-rich\n- **Role:** Common Speech\n- **Name Structure:** Compound Words\n\n\n### Example Names\n- **Shisiiafea** — defender (person)\n- **Manavealeashana** — moon walker (person)\n- **Felelelemanayia** — fire seeker (lineage)\n\n### At the Table\n- Use "Mioshana vae" as a greeting meaning "friend of light."\n- Lean on the lyrical & vowel-rich sound profile when voicing speakers.',
    content:
      "## Pronunciation & Phonology\n**Consonants:** l, m, n, s, v, y, f, r, sh\n\n**Vowels:** ae, ia, ea, io, ele, ana, i\n\n**Phonotactics:** CV, CVCV, VCV\n\n\n\n## Cultural Role & Usage\nCommon Speech.\n\n**Register:** Common Speech\n\n\n## Word Formation & Naming Conventions\nNo additional morphology notes.\n\nNo additional naming rules.\n\n### Demonstrated Rules\n- No structured rules.\n\n## Common Vocabulary & Word Bank\n| Word | Pronunciation | Meaning | Part of Speech |\n| --- | --- | --- | --- |\n| mioshana | MIOSHANA | friend |  |\n| elerea | ELEREA | enemy |  |\n| liofi | LIOFI | water |  |\n| vifia | VIFIA | fire |  |\n| iafia | IAFIA | shadow |  |\n| vae | VAE | light |  |\n| aevi | AEVI | city |  |\n| vio | VIO | journey |  |\n| lanavana | LANAVANA | sword-oath |  |\n| nana | NANA | leader |  |\n\n## Sample Phrases\n- **Mioshana iafia** (*Mioshana iafia*) — A friend in shadows. — friend + shadow\n- **Nana aevi** (*Nana aevi*) — The leader of the city. — leader + city\n- **Mioshana vae** (*Mioshana vae*) — Friend of light. — friend + light",
    labels: ["language", "classic-fantasy", "conlang"],
    status: "active",
    languageProfile: {
      inputs: {
        genre: "Classic Fantasy",
        tone: "Lyrical & Vowel-rich",
        role: "Common Speech",
        structure: "Compound Words",
      },
      phonology: {
        consonants: ["l", "m", "n", "s", "v", "y", "f", "r", "sh"],
        vowels: ["ae", "ia", "ea", "io", "ele", "ana", "i"],
        phonotactics: ["CV", "CVCV", "VCV"],
      },
      naming: {
        examples: [
          {
            name: "Shisiiafea",
            meaning: "defender",
            use: "person",
          },
          {
            name: "Manavealeashana",
            meaning: "moon walker",
            use: "person",
          },
          {
            name: "Felelelemanayia",
            meaning: "fire seeker",
            use: "lineage",
          },
        ],
      },
      lexicon: [
        {
          word: "mioshana",
          pronunciation: "MIOSHANA",
          meaning: "friend",
        },
        {
          word: "elerea",
          pronunciation: "ELEREA",
          meaning: "enemy",
        },
        {
          word: "liofi",
          pronunciation: "LIOFI",
          meaning: "water",
        },
        {
          word: "vifia",
          pronunciation: "VIFIA",
          meaning: "fire",
        },
        {
          word: "iafia",
          pronunciation: "IAFIA",
          meaning: "shadow",
        },
        {
          word: "vae",
          pronunciation: "VAE",
          meaning: "light",
        },
        {
          word: "aevi",
          pronunciation: "AEVI",
          meaning: "city",
        },
        {
          word: "vio",
          pronunciation: "VIO",
          meaning: "journey",
        },
        {
          word: "lanavana",
          pronunciation: "LANAVANA",
          meaning: "sword-oath",
        },
        {
          word: "nana",
          pronunciation: "NANA",
          meaning: "leader",
        },
      ],
      grammar: {
        phrasePatterns: ["Content word followed by a qualifying content word"],
        examples: [
          {
            text: "Mioshana iafia",
            pronunciation: "Mioshana iafia",
            translation: "A friend in shadows.",
            breakdown: "friend + shadow",
          },
          {
            text: "Nana aevi",
            pronunciation: "Nana aevi",
            translation: "The leader of the city.",
            breakdown: "leader + city",
          },
          {
            text: "Mioshana vae",
            pronunciation: "Mioshana vae",
            translation: "Friend of light.",
            breakdown: "friend + light",
          },
        ],
      },
      register: {
        role: "Common Speech",
      },
      tableUseTips: [
        'Use "Mioshana vae" as a greeting meaning "friend of light."',
        "Lean on the lyrical & vowel-rich sound profile when voicing speakers.",
      ],
    },
    languageProfileVersion: 1,
  },
} as unknown as Partial<Record<ValidSlug, GeneratorOutput>>;
