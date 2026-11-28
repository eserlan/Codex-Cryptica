import { businessToOutput } from "generator-engine/business-state";
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
    title: "Iona Pell",
    summary:
      "Iona Pell is a former court interpreter who insists on precise promises but keeps her own obligations ambiguous.",
    content:
      "### Core Personality\nIona Pell is a former court interpreter who makes a living arranging introductions. She insists on precise promises from others but keeps her own obligations ambiguous.\n\n### Speech & Conversational Style\nUses exact verbs and repeats an offer in neutral language before answering. Asks who will hear a statement before naming anyone involved.\n\n### Mannerism / Tell\nTurns a pencil across her knuckles while listening and sets it down when she has decided to refuse.\n\n### Roleplaying Cues\n- Repeats an offer back in plain words, then asks who will be held to it.\n- Corrects an inaccurate quotation, even if the correction weakens her case.\n- When asked to identify a source, offers a way to verify the claim instead.\n- If a trusted friend asks for help, gives one clear instruction and waits for them to agree.",
    lore: "### Outward Demeanour vs Inner Nature\nOutwardly: A meticulous, impartial intermediary who treats each word as important. Inwardly: Afraid that careless phrasing will make her complicit in someone else's wrongdoing.\n\n### Drives\n- **Wants**: A safe route out of the city for an apprentice who overheard a forbidden agreement.\n- **Fears**: Having her own words quoted out of context to incriminate someone.\n- **Protects**: The names of people who have trusted her with confidential testimony.\n- **Envies or resents**: People who can act on instinct without weighing every promise.\n- **Needs from others**: An explicit assurance about who accepts responsibility for a decision.\n\n### Virtue and Flaw\n**Virtue**: Faithfully conveys what people mean, even when it costs her. **Flaw**: Insists on clarifying every term when decisive action would serve someone better.\n\n### Contradiction\nDemands straightforward dealings but quietly conceals her involvement in an altered court transcript.\n\n### Under Pressure\nStops asking open questions and requests written commitments. If time runs out, chooses the person she trusts rather than the argument she can defend.\n\n### Social Behaviour\n**Strangers**: Polite, asks what they need before offering her name. **Friends**: Gives practical help, but dislikes vague requests. **Authority figures**: Asks to see an order before acting on it. **Rivals**: Corrects their claims without indulging personal insults.\n\n### Boundary / Trigger\nBeing asked to deliberately change another person's testimony.\n\n### Example Reactions\n- Praised for discretion: asks which matter the speaker means before accepting the praise.\n- Caught withholding information: offers corroborating evidence without revealing the source.\n- Asked for help: establishes the immediate risk and makes one specific offer.",
    labels: ["personality", "personality-generator", "imported-draft"],
    status: "active",
  },
  item: {
    type: "item",
    title: "The Tollwarden's Ring",
    summary: "",
    content:
      "### Description\nA broad brass ring worn smooth on the inside, with the outline of a three-arched bridge engraved on its face. Rust-coloured mortar is caught in the middle arch; the band grows faintly warm when pressed to damaged stone.",
    lore: "### GM Reference Information\n- **Type**: Ring\n- **Rarity**: Common\n- **Theme**: Classic Fantasy\n\n### Magical Properties\n- **Passive Effect**: The ring warms when the wearer touches it to cracked load-bearing masonry. It warns that a surface is damaged but cannot reveal the cause or show whether the rest of the structure is safe.\n\n### Lore & History\nThe old tollwarden used this ring during bridge inspections. His successor insists it was stolen from the tollhouse; the missing ledger records a loan to the mason responsible for the western arch.",
    labels: ["rpg-item", "imported-draft"],
    status: "active",
  },
  "minor-magic-item": {
    type: "item",
    title: "Dusk Seal",
    summary: "",
    content:
      "### Description\nA thumb-sized wax seal pressed into a folded strip of grey paper. A charcoal handprint lies beneath the wax.",
    lore: "### Quick Reference\n- **Item Form**: Inscribed Scroll / Seal\n- **Usage Limit**: Single Use (Breaks / Consumed on Activation)\n- **Activation**: Peeling a seal or unwinding a cord\n- **Primary Utility**: Sensory & Detection\n- **Setting / Theme**: Classic Fantasy\n\n### Magical Effect & Mechanics\nPeel the seal to reveal handprints and tracks left by warm bodies in the room during the past hour. They glow for three minutes. The seal crumbles on use. It shows where someone passed, not who they were or when they passed.\n\n### Quirk or Drawback\nThe paper gives a faint chime when peeled.\n\n### Suggested Use in Play\nUse the seal to check whether someone touched a locked cabinet or crossed the floor before the watch arrived. It narrows the search but still leaves the party to identify the person.\n\n### Provenance & Rumour\nArchive custodians make these seals to investigate damaged locks. A suspiciously cheap batch bears the mark of the night watch's former quartermaster.",
    labels: ["minor-magic-item", "imported-draft"],
    status: "active",
  },
  "artifact-generator": {
    type: "item",
    title: "The Crown of the Flood Oath",
    summary: "",
    content:
      "### Description\nA river-battered bronze circlet studded with seven milky stones. Under water, the stones glow in the pattern of the old flood gates.",
    lore: "### Quick Reference\n- **Item Form**: Crown / Regalia of Rule\n- **Origin Era**: Ancient Dynasty\n- **Power Tier**: Regional Masterpiece (Dominates cities & provinces)\n- **Current Status**: Lost in Ruined Sanctuary\n- **Curse / Cost**: Strict Moral / Physical Taboo (Binds bearer's behavior)\n- **Setting / Theme**: Classic Fantasy\n\n### Artifact Powers & Manifestations\n- **Dormant Powers**: The bearer can steady a boat in floodwater for a short crossing.\n- **Awakened Powers**: The bearer can hold back the current at one gate long enough to evacuate a neighbourhood.\n- **Ascendant / Zenith Powers**: At all seven ancient gates, the bearer can redirect the flood for one night. Water must still go somewhere; decide which district or plain will receive it.\n\n### Attunement & Awakening Requirements\nSwear the flood oath before witnesses and repair one broken gate. Each further gate the bearer restores extends the crown's reach.\n\n### Cost, Curse, Corruption, or Taboo\nThe oath forbids refusing sanctuary to anyone fleeing floodwater. Break it and the crown falls dormant until the bearer repairs the harm.\n\n### Known History & Previous Keepers\nThe old river queens sealed the crown beneath the seventh gate after a ruler saved the capital by flooding its farms.\n\n### Interested Factions & Pursuers\n- **The Toll Council** wants to protect the market and preserve its toll revenue.\n- **The Reed Wardens** want to protect downstream farms and will oppose an unconsented diversion.\n- **The River Abbey** wants the crown placed under shared custody.\n\n### Rumours & Conflicting Legends\nBarge captains claim the seventh stone only shines for a crowned heir. In truth, it answers to the river oath, regardless of lineage.\n\n### Adventure Hooks\n- The spring flood exposes the ruined seventh gate.\n- The council offers the party a fortune to divert water away from the market.\n- The wardens seek proof that the old royal flood was deliberate.\n\n### Destruction or Sealing Conditions\nRemove the seven stones while all gates stand open at low water and return each to its gate. The crown becomes ordinary bronze.",
    labels: ["artifact", "relic", "imported-draft"],
    status: "active",
  },
  "faction-roster": {
    type: "note",
    title: "The Lantern Wardens' Notable Members",
    summary:
      "Four members of the river-crossing council, divided over who should pay to cross before the spring flood.",
    content:
      "### Mara Fen: Ferrymaster\n- **Duty**: Assigns boats and pilots to the Lantern Wardens' crossings.\n- **Motive**: Keep the ferries operating through the flood without emptying the reserve fund.\n- **Stance**: Loyalist\n- **Trait**: Counts available boats on her fingers before answering.\n- **Wants right now**: Approval to double the toll until the damaged north landing is repaired.\n- **Leverage**: She controls the boats and can suspend a crossing on safety grounds.\n- **Connection**: Needs the support of the clerk who can certify the repair costs (Lin Voss)\n\n### Oren Pike: River scout\n- **Duty**: Marks safe channels and warns the villages when the water rises.\n- **Motive**: Let displaced families cross without paying the emergency toll.\n- **Stance**: Reformer\n- **Trait**: Draws routes in spilled water on the table.\n- **Wants right now**: A commitment to open the south crossing before the evening storm.\n- **Leverage**: He knows a shallow route that could bypass the official ferries.\n- **Connection**: Promised to help the apprentice's stranded family (Tess Reed)\n\n### Lin Voss: Toll clerk\n- **Duty**: Keeps the toll ledger and advises the council on available reserves.\n- **Motive**: Protect the Wardens' accounts from scrutiny after approving an unauthorised loan.\n- **Stance**: Opportunist\n- **Trait**: Turns the ledger towards himself whenever someone asks for a figure.\n- **Wants right now**: Time to recover the loan before the ferrymaster requests the accounts.\n- **Leverage**: Can certify or dispute a claim on the reserve fund.\n- **Connection**: Owes the ferrymaster an audit before the next vote (Mara Fen)\n\n### Tess Reed: Apprentice pilot\n- **Duty**: Carries messages between crossings and crews the relief ferry.\n- **Motive**: Get her family to higher ground before the river cuts off their hamlet.\n- **Stance**: Trapped\n- **Trait**: Checks the river level through the window whenever the discussion stalls.\n- **Wants right now**: A boat and permission to cross before dusk.\n- **Leverage**: Saw the clerk deliver the reserve money to a merchant after hours.\n- **Connection**: Trusts the scout who knows a way to her family (Oren Pike)",
    lore: "### At a Glance\n- **Structure**: Council\n- **Emphasis**: Internal dissent\n- **Immediate Hook**: The council must decide whether to fund repairs or waive the emergency toll before the storm reaches the valley.\n\n### How This Roster Divides\nMara needs Lin's figures to justify the toll, but Oren can offer a risky alternative. Tess can reveal the missing reserve money to force a vote, at the cost of exposing Lin and risking her place with the Wardens.",
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
    title: "The Millrace Ultimatum",
    summary: "",
    content:
      "### The Hook\nThe village of Alderford has flour for only two more days. Miller Ilyra asks the party to investigate why the sluice at the ruined watchtower has been locked shut.\n\n### Location\nThe drowned lower floor of Thornwatch Ruin contains the sluice controls and a narrow maintenance passage across the millrace.\n\n### Key NPC\n**Ilyra Voss**, the miller, offers lodging and payment for restoring the water supply. She can show the party the maintenance passage.\n\n### Threat\nLord Harven's guards have sealed the sluice and are turning away villagers. His steward claims the mill owes unpaid water dues.",
    lore: "### Core Fields\n- **📍 Setting**: Thornwatch Ruin, a cursed ruin on the Alderford millrace.\n- **📅 Threat**: Lord Harven, a corrupt noble using his guards to control the village's flour supply.\n- **🧭 Scope**: Local (village / district)\n\n### Complication\nOpening the sluice from the flooded passage without clearing its debris will wash away the footbridge, cutting the village off from its market.\n\n### Key NPC\n- **👤 Ilyra Voss**: She wants the mill running before the flour runs out. She has hidden an old deed that grants the village free use of the water.\n\n### The Twist\nThe steward's new water deed is a forgery. The party can expose it, negotiate a release, or restore the flow while gathering evidence against Harven. If they leave the dispute unresolved, the guards can return.\n\n### Reward\nIlyra offers a purse of silver. Restoring the supply also earns the villagers' goodwill and access to the mill as a place to rest.",
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
    title: "The Counterweight Gate",
    summary:
      "A sealed floodgate blocks the party's way through the abandoned mill. Two hanging stone baskets hold the gate shut against the rising water.",
    content:
      "## Player-Facing Setup\nA narrow catwalk reaches a floodgate across the millrace. A pair of baskets hangs from a beam above it: the heavy basket has sunk below its brass marker, while the empty basket swings above its marker. A carving shows both baskets level with the markers.\n\n## Clues\n- **Obvious clue:** The carved baskets are level; their actual positions do not match.\n- **Discoverable clue:** Shifting one stone into the light basket raises the other, and the gate lifts a finger's width.\n- **Emergency clue:** A loose stone falls from the heavy basket and the gate rises slightly, exposing the drain channel.\n\n## Character Spotlight Opportunities\nA careful observer compares the baskets with the carving. A strong character can steady the beam; a crafter can rig a temporary support; anyone can move stones or ask another character to observe the result.\n\n## Alternate Solutions\n- Brace the beam and raise the gate with a rope, leaving the equipment behind.\n- Divert the water into the side drain and crawl through the exposed channel instead.\n\n## Failure & Escalation\nA wrong adjustment shakes the gate and reveals which basket needs changing. No damage or additional pressure builds in this Simple version.\n\n## Running the Puzzle\nDescribe the carving and the markers before any check. When the baskets come closer to level, the gate rises further; tell the party immediately.\n\n## Scaling\nFor a harder version, have the water threaten a downstream room while the party works. For a quicker version, let the first successful adjustment open a gap large enough to cross.",
    lore: "### At a Glance\n- **Genre:** Classic Fantasy\n- **Purpose:** Sealed door\n- **Style:** Mechanical\n- **Complexity:** Simple\n- **Failure pressure:** None\n- **System:** System-neutral\n- **Participation:** Any character can contribute\n\n### GM-Only Solution\nFirst redistribute stones until the baskets align with the brass markers. Then release the retaining pin that the beam exposes, allowing the gate to rise. Any credible way to reach the same state works.\n\n### Escalating Hints\n1. Remind the party of the level baskets carved above the gate.\n2. Point out how the brass marker moved after the last adjustment.\n3. State that the gate releases when the baskets reach their marked levels.",
    labels: ["puzzle", "puzzle-generator", "mechanical", "classic-fantasy"],
    status: "draft",
  },
  "dark-fantasy-faction": {
    type: "faction",
    title: "Congregation of Pale Oath",
    summary: "An openly cruel mercenary barony operating through a demon pact.",
    content:
      "### What they control\nCongregation of Pale Oath is a mercenary barony with real authority across an entire doomed barony, built on the back of the demon pact that made them necessary in the first place.\n\n### What they want\nRoot out every remaining trace of the old faith before the new order arrives.\n\n### Why they are dangerous\nA rival within their own ranks is quietly building a faction inside the faction. Their posture — openly cruel — they no longer pretend otherwise — means they will not stop simply because they are shown to be wrong.\n\n### How to use them at the table\nBring Congregation of Pale Oath into play when the party needs a power that is doing something defensible in the worst possible way. Let them be useful, or unavoidable, before the party learns the full cost of what they protect.",
    lore: "### At a Glance\n- **📍 Base**: A licensed premises that provides cover for activities conducted elsewhere\n- **Resource**: Specialised knowledge or access that no other group in the region controls\n- **Symbol**: Pale Oath iconography, worn or branded by the faithful\n- **Secret**: The barony's demon pact was renewed in secret last winter, and three captains were paid to falsify the casualty rolls.\n- **Immediate Hook**: A defector from the faction begs the party for protection, and knows exactly what they're running from.\n\n### Notable NPCs\n- **👤 Caelmar**: The one who still believes this was the right choice, and needs everyone else to believe it too.\n- **👤 Branwen**: Does the parts of the work no one else will, and keeps a private ledger of what it has cost them.\n\n### Internal Conflict\nA rival within their own ranks is quietly building a faction inside the faction.\n\n### Rival Faction\n- **👥 Congregation of Black Rose**: Wants the same ground, the same relic, or the same absolution — and is no more virtuous in pursuing it.",
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
    title: "The Grain Embargo",
    summary:
      "A hidden motive behind a genuine dock closure threatens the river pilots' independence.",
    content:
      "## The Reveal\nThe council's grain embargo is real, but its clerk imposed it to force the river pilots to surrender their independent toll charter. The supposed smugglers are paid to move food through the embargo.\n\n## What Everyone Believed\nThe council closed the docks to stop stolen grain. The party witnessed the closure and captured a smuggling boat carrying grain, so they believed the embargo protected the public stores.\n\n## Why It Makes Sense\nThe grain and the closure were exactly as witnessed. The clerk needs the pilots to abandon their charter before the council's next sitting; starving the lower quay gives him leverage. The pilots' independence is protected by law, so a direct seizure would fail.\n\n## Foreshadowing\n- The captured boat's manifest bears the clerk's emergency stamp, although it sailed without a permit.\n- A pilot shows a relief contract that releases grain as soon as the charter is surrendered.\n- The public granary's watch records show no missing grain before the embargo.\n\n## Immediate Consequences\n- At the next tide, a relief barge will be turned away unless the pilots sign the charter away.\n- The clerk offers the party legal authority to seize the remaining boats if they blame the pilots publicly.\n\n## New Choices\n- Carry grain through the embargo, relieving hunger while risking seizure.\n- Bring the manifest and relief contract to the council, delaying relief but challenging the clerk's order.\n- Negotiate a temporary relief licence with the pilots and merchants without surrendering the charter.",
    lore: "### Generator Brief\n- Theme: Classic Fantasy\n- Twist Type: Hidden motive\n- Impact: Significant\n- Timing: Midpoint\n- Fairness / Foreshadowing: Foreshadowable\n\n### Constraints Honoured\nThe boat contained grain and the council genuinely issued the closure. The party's arrest remains valid; the new evidence changes what the arrest means.",
    labels: ["plot-twist", "complication", "classic-fantasy"],
    status: "active",
  },
  "bbeg-generator": {
    type: "character",
    title: "Governor Ysra Holt",
    summary: "",
    content:
      "### Public Face\nGovernor Ysra Holt commands the emergency flood defences of three riverside towns. The harbour merchants credit her with keeping the river trade open after last winter's storms.\n\n### Signature / Calling Card\nEmergency notices bearing three blue triangles appear on the doors of workshops and warehouses before the governor's crews arrive.\n\n### First Signs\n- The passenger ferry receives an unexpected order to stop calling at downstream villages.\n- Two river gauges show different water levels at the same hour; the ferrymen insist their reading is correct.\n- A relief warehouse is filling with timber and stone rather than food.",
    lore: "### Core Concept\nA regional-scale corrupt ruler with a tragic outlook and an understandable but wrong conviction: Ysra Holt will protect the prosperous upstream town even if she must condemn its neighbours.\n\n### True Nature\nYsra is diverting floodwater into inhabited farmland to keep the upstream harbour navigable. She has quietly secured authority to requisition the abandoned land once the waters rise.\n\n### Ultimate Goal\nKeep the harbour and its grain stores operating through the flood season, then place all three towns under a permanent emergency authority controlled by her office.\n\n### Why Now\nThe spring thaw arrived early and the eastern embankment will not survive another surge without repairs. The regional council is due to approve a temporary diversion next week.\n\n### Motivation\nYsra lost her family in a previous flood. She believes that saving the biggest population centre justifies sacrificing less populous settlements, and fears a debate will waste the few dry days left.\n\n### Fatal Flaw\nShe assumes the harbour's engineers are the only people who understand the river and dismisses the local ferrymen who know its side channels.\n\n### Methods\nIssue emergency orders, suppress conflicting gauge readings, requisition supplies and offer protection in exchange for permanent control of key crossings.\n\n### Resources\nThe governor's emergency fund, relief barges, the lock authority and the upstream merchants who depend on uninterrupted trade.\n\n### Lieutenants & Inner Circle\n- **Bellan Cairn**, chief engineer. Loyal to Ysra for financing essential repair work, but unwilling to approve a diversion before the villages are evacuated; retains the original gauge logs.\n- **Captain Vara Silt**, lockhouse commander. Paid to enforce the river closures and promised a permanent command; would defect if the merchants stopped paying. Keeps a ledger of requisitioned boats.\n\n### Organisation & Power Structure\nThe governor issues written emergency orders. The lock authority controls river traffic; the merchants supply labour and materials. Each town still has its own council, but the emergency powers can override their decisions.\n\n### Territory / Lair\nThe upstream lockhouse controls the sluice leading into the lower valley. Holt works from the adjoining flood command room, while engineers operate the gates independently in shifts.\n\n### The Villain's Plan\n**Stage 1: Control the crossings.** Close the downstream ferry under cover of flood safety. A contradictory notice at the landing reveals the governor's order. The party can secure a replacement crossing or escort villagers before isolation.\n\n**Stage 2: Conceal the gauge readings.** Cairn's assistants are ordered to use only the official figures. Discarded readings offer a trail to the real danger. Exposing the figures makes Holt seek a public emergency vote sooner.\n\n**Stage 3: Requisition the boats.** Silt impounds the ferries as supply vessels. Notices and a boat ledger identify the missing transport. Negotiating with Silt or returning the boats lets villages prepare an evacuation.\n\n**Stage 4: Win the council's authority.** Holt presents the diversion as the only practicable option. The merchants support her; lower-town delegates lack independent evidence. The party can bring Cairn's logs, show another route or persuade merchants to fund repairs. Losing the vote would force Holt to act without legal protection.\n\n**Stage 5: Open the diversion.** At the next surge, Holt orders the sluice opened into the lower valley. A fire beacon warns downstream settlements. Players can stop the order, arrange an alternative release or get people out, but delaying without a repair risks the harbour.\n\n**Stage 6: Consolidate emergency rule.** Holt uses flooded fields and debt to justify taking permanent control of ferries, relief and property. Requisition lists show who benefits. Independent relief or supported town councils can prevent the takeover even if the flood occurred.\n\n### Escalation If Ignored\nThe lower villages lose their ferry, then their evacuation boats. At the next surge, diversion flooding displaces families and leaves the upper town dependent on Holt's management. The ensuing relief crisis gives her leverage for the permanent authority.\n\n### Discovery Layers\n**What the World Knows**: Holt is directing legitimate flood relief from the upstream lockhouse.\n**What Their Servants Know**: Silt knows which transport is being impounded; Cairn knows the suppressed readings and diversion risk.\n**GM-Only Truth**: Holt intends to convert emergency measures into permanent regional control, using the loss of farmland as justification.\n\n### Personal Connections\n- A character's family could live in a downstream village.\n- A character might owe Cairn a favour from an earlier repair job.\n- A merchant patron could be paying for the emergency works.\n\n### Weakness / Vulnerability\nThe side channels provide an alternative route for releasing water if the party gains the ferrymen's trust and gets engineers to verify the route. Cairn's original logs can undermine Holt's argument that there is no other choice.\n\n### Moral Complication\nHolt's warning about the upstream embankment is real. Removing her without arranging repairs, an alternative release or evacuation leaves both the harbour and lower towns at risk.\n\n### Final Confrontation\nThe council votes as the river rises. Holt tries to make the party accept the diversion or take responsibility for the harbour. Controlling the lockhouse, producing credible readings and securing help may resolve the confrontation without killing her.\n\n### If Defeated\nThe towns must establish a shared flood authority, repair the embankment and decide who pays for the displaced families. Silt seeks employment elsewhere; Cairn is willing to help if the councils protect the engineers from reprisal.",
    labels: ["villain", "bbeg-generator", "imported-draft"],
    status: "active",
    conflictDomain: "Infrastructure Control",
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
      "A steed-sized magical cliff dweller that uses refractive scales to guard mineral-rich nesting ledges.",
    content:
      "### At a Glance\n- **Classification**: Magical Beast / Chimera\n- **Size & Form**: Large / Steed-sized\n- **Habitat**: Mountain Peaks / Cliffs\n- **Threat Level**: Dangerous / Predator\n- **Temperament / Sapience**: Cunning / Pack Mind\n- **Ecological Role**: Territorial Guardian\n\n### Appearance & Anatomy\nFour clawed feet grip the cliff face. Translucent coral-like plates along its back refract the light of the valley below.\n\n### Core Concept & Ecology\nCoral-Weavers graze on mineral crusts along exposed ledges, returning to shared nesting shelves at dusk. Their scraping opens patches where cliff herbs grow.\n\n### Observable Abilities & Defences\n- **Chameleonic Refraction**: Breaks up the creature's outline against pale rock.\n- **Adaptive Mobility**: Crosses steep ledges with ease, carrying stones to its nest.\n- **Sensory Acuity**: Taps the cliff with its claws to detect approaching movement.\n\n### Known Weaknesses & Limitations\n- Drifting dust outlines the refractive scales.\n- The creatures rarely leave a nesting shelf unattended.\n\n### Combat & Encounter Behaviour\nA pair beats its tails against stone when intruders approach. If the party moves away from the shelf, they stop pursuing. A creature isolated from the others attempts to retreat.\n\n### Harvest & Remains\nShed plates can be polished into refractive lenses without harming the animal.\n\n### Known Lore & Signs\n- **Field Signs**: Paired claw marks, coral-coloured scale fragments and a moving patch of distorted light.\n- **Common Belief**: Shepherds say a healthy weaving colony means the cliffs will remain stable.",
    lore: "### True Origin & Hidden Ecology\nThe plates grow around mineral-eating symbionts. Nesting shelves stay warm because a vein of geothermal water flows behind them.\n\n### Hidden Abilities & Surprises\n- **Refractive Mirage Decoy**: A startled adult leaves an afterimage while climbing to another ledge.\n- A juvenile's distress call draws nearby adults to the shelf.\n\n### Secret Weaknesses\n- Cold rain temporarily disables the optical scales.\n- Exhausted creatures need to return to a warm shelf before they can cloak again.\n\n### Tactical Notes\nA pair tries to guide intruders away from the nest, not pursue them down the trail.\n\n### Truth Behind Rumours\nThe colony does not prevent landslides. It abandons unstable cliffs before a collapse, which is why shepherds watch its migrations.\n\n### Adventure & Encounter Hooks\n- A newly abandoned nesting shelf overlooks the only mountain road.\n- A lensmaker wants the party to collect naturally shed plates.\n- Highway workers intend to blast a ledge while a colony is raising its young.",
    labels: [
      "creature",
      "monster-generator",
      "magical-beast-chimera",
      "classic-fantasy",
    ],
    status: "draft",
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
      "A one-night score to recover a fragile enchanted charter from the Thormar Guild Vault before the morning audit.",
    content:
      "### The Score\nThe River Guild hires the party to retrieve its confiscated charter from the Thormar Guild Vault before the morning audit. The document must be recovered intact.\n\n### The Prize\nA vellum charter embossed with the seal that grants the guild access to the north ferry.\n- **Where**: In a warded glass case on the secured floor.\n- **Window**: The display is inspected at dawn.\n- **Protection**: A seal keyed to the vaultkeeper and an enchanted glass enclosure.\n- **Methods**: Arrange a legitimate transfer, persuade the vaultkeeper to release it, or suppress the ward with an accepted counterseal.\n- **Once it is done**: The charter must reach the guild's advocate at the ferry.\n- **The catch**: Fragile. The seal crumbles if the charter is folded or exposed to rain.\n- **Pressure**: Each damaged corner makes the guild's claim harder to prove.\n\n### Casing the Target\n- **Entry vector**: Petitioners may visit the outer records hall before the audit.\n- **Known obstacle**: The secured floor is restricted to named witnesses and staff.\n- **The objective**: The charter is displayed for the audit, not held in the usual archive.",
    lore: "### GM Quick Reference\n- **Objective**: Recover the charter intact and bring it to the advocate.\n- **Primary obstacle**: Access to the display requires the vaultkeeper's authority or a counterseal.\n- **Hidden factor**: The clerk ordered to inspect the charter is the advocate's estranged sister.\n- **Point of no return**: Removing the charter changes the timing of the audit.\n- **Pressure**: The guild's hearing begins at dawn.\n- **Default complication**: The senior auditor arrives early.\n- **Escape problem**: Once the empty case is reported, the outer hall closes.\n\n### The Hidden Factor\nThe clerk wants the guild's claim heard but cannot publicly defy her superior. The advocate's name may persuade her to delay the inspection.\n\n### Security Rings\n- **Perimeter**: The public petition hall admits witnesses or guild representatives.\n- **Access**: The secured floor admits a named witness, a records escort or a claimant summoned by the audit.\n- **Inner Vault**: The vaultkeeper can authorise release or accept a valid counterseal.\n\n### Alarm Track\n- **0: Quiet**: Petitioners come and go normally.\n- **1: Suspicion**: The clerk starts checking names against the witness list.\n- **2: Alert**: An empty case is reported; the captain calls the gate guards.\n- **3: Lockdown**: The outer hall closes when the guards arrive.\n- **4: Lethal Response**: The guild summons its bound guardian.\n\n### Complications\n- **Likely (default)**: The senior auditor arrives early.\n- **Alternative**: A rival claimant arrives with a forged copy of the charter.\n- **Alternative**: The clerk refuses to delay the audit without a guarantee of protection.\n\n### When the Prize Is Taken\nRemoval does not start an alarm by itself. The next inspection reveals an empty case unless the clerk has delayed it. Raise Alert when the absence is reported.\n\n### The Getaway\nThe petition hall remains open until the gate guards arrive. A hearing in the public chamber can establish the charter as evidence before the doors close; alternatively, the advocate can arrange an escorted departure. After Lockdown, the party can appeal to the captain for safe passage while the claimant dispute is heard.\n\n### Flashback Opportunities\n- Establish an invitation to the audit.\n- Arrange a waterproof document case with the advocate.\n- Agree a signal with the clerk.",
    labels: ["heist", "heist-generator", "imported-draft"],
    status: "draft",
  },
  business: businessToOutput({
    version: 1,
    options: {
      genre: "Classic Fantasy",
      businessType: "Blacksmith",
      scale: "small",
      legitimacy: "legitimate",
      wealth: "modest",
      clientele: "Ferry crews and carters",
      location: "Grey Quay",
      tone: "grounded",
      campaignContext: "The north ferry is out of service",
      playersOwn: false,
    },
    identity: {
      name: "The Crooked Compass",
      type: "Blacksmith",
      description:
        "Blacksmith on Grey Quay, specialising in ferry and wagon fittings.",
      reputationLine: "Repairs last longer than the maker's promises.",
      distinctive:
        "A sheltered yard large enough to fit a damaged ferry winch.",
    },
    operations: {
      provides:
        "Repairs iron fittings, chains and winches for the river crossing.",
      payers: "Ferry crews, carters and the harbour authority.",
      whyHere: "The north ferry berth has no workshop of its own.",
      mainIncome: "Repair contracts and replacement fittings.",
      model: "Takes a deposit for materials, then charges for completed work.",
      size: "One forge, two apprentices and a sheltered fitting yard.",
      position:
        "The ferry repair contract will cover wages if it is completed before the next spring tide.",
    },
    leadership: {
      id: "lead",
      name: "Nessa Voss",
      role: "owner",
      goal: "Repair the north ferry before the spring tide.",
      style: "Insists on inspecting every finished fitting.",
      trait: "Keeps a spare hammer on the counter for nervous customers.",
      pressure:
        "Cannot pay for another charcoal delivery without the ferry deposit.",
    },
    staff: [
      {
        id: "staff-1",
        name: "Halle Vance",
        role: "Journeyman smith",
        goal: "Reopen the north ferry without sacrificing the quality of the repair.",
        trait: "Tests every link by sound.",
      },
      {
        id: "staff-2",
        name: "Mara Marrow",
        role: "Apprentice and delivery runner",
        goal: "Recover a missing shipment before the owner dismisses her.",
        trait: "Knows which warehouses are unlocked after dark.",
      },
    ],
    clientele: {
      typical: "Ferry crews and carters",
      valuable: "The harbour authority's maintenance officer",
      undesirable: "Customers demanding a rushed repair without a deposit",
    },
    dependencies: [
      {
        id: "dep-1",
        input: "Charcoal from the east bank",
        kind: "materials",
        ifItFails: "The forge goes cold before the winch is repaired.",
      },
      {
        id: "dep-2",
        input: "A river crossing permit for the delivery cart",
        kind: "licence",
        ifItFails: "Deliveries must travel through the rival's toll gate.",
      },
    ],
    relationships: [
      {
        id: "rel-1",
        name: "The Red Quay Foundry",
        kind: "competitor",
        label: "competes with",
        reason: "Wants the harbour authority's repair contract.",
        partyKind: "organisation",
      },
      {
        id: "rel-2",
        name: "East Bank Charcoal Co-operative",
        kind: "supplier",
        label: "supplied by",
        reason: "Has one cart left after the north ferry closed.",
        partyKind: "organisation",
      },
    ],
    reputation: {
      perception: "Reliable work, slow service.",
      consequence:
        "The harbour authority will wait one more day before looking elsewhere.",
    },
    pressure:
      "The charcoal cart has not arrived and there is one day's fuel left.",
    asset: "A spare winch axle made for the old ferry.",
    secret:
      "The harbour officer secretly diverted the charcoal to the rival foundry.",
    opportunity:
      "Recover the cart or negotiate a temporary supply from the competitor.",
    complication:
      "The rival offers to deliver charcoal in exchange for half the repair contract.",
    hooks: [
      "Mara asks the party to trace the cart before the tide turns.",
      "The harbour authority demands proof that the repaired winch will be ready in time.",
    ],
    fallbackSections: [],
  }),
  "mystery-investigation": {
    type: "note",
    title: "The Missing Toll Apprentice",
    summary:
      "A guild apprentice disappears before a river toll inspection, leaving a false departure and a trail through the storehouse.",
    content:
      "## Opening Hook\nAt first light the river guild's apprentice, Lissa, has vanished from the locked toll archive. The guild wants her found before the noon inspection.\n\n## Central Question\nWhere is Lissa, and who falsified the record of her departure?\n\n## People to Question\n- **Branon, records clerk:** Claims he was checking the flood register. A watchman saw him enter but did not see him leave.\n- **Vaelthas, healer:** Bought sleeping draughts the previous evening; says they were for a sick sailor.\n- **Thormar, courier:** Changed the delivery route at Branon's request and fears losing his licence.\n- **Morgmar, watch officer:** Logged Lissa's departure but admits he copied a note left at the gate instead of seeing her.\n\n## Places to Investigate\n- **Toll archive:** A scraped latch, fresh ink and the flood register.\n- **River gate:** The watch log and a fish seller who saw a guild handcart at dawn.\n- **Riverside storehouse:** A delivery ledger, spare wax seals and a locked loft above the waterline.\n\n## Evidence\n- **Scraped latch:** A file was used from inside the archive. Compare the marks with tools in the clerk's desk; this does not identify who held the file.\n- **False departure:** The copied gate note uses the same uncommon ink as a fresh register entry. This supports a forged departure, not the identity of the forger.\n- **Handcart:** The fish seller saw Branon hauling a covered cart towards the storehouse just before dawn. This establishes his route but not its contents.\n- **Delivery ledger:** A cart was signed into the storehouse in Branon's hand. Compare it with his signed archive entries.\n- **Loft:** A voice answers a knock from above the waterline. Lissa can describe the forced journey if the party reaches her.\n- **Draughts:** The sailor's empty bottles and a witness corroborate the healer's explanation.\n\n## Pressure and Outcomes\nAt noon the inspector orders the storehouse emptied. Recover Lissa and substantiate the forged record to make an accusation stick. If the party only finds Lissa, the guild still disputes who is responsible; if they miss the deadline, track where the goods and witnesses were sent.",
    lore: "## GM-Only Fixed Truth\nBranon has been diverting river tolls. Lissa discovered the altered register, so Branon used his archive key to lock her in the storehouse loft until the inspection passed. He forged her departure and filed the latch to suggest a break-in. The healer's purchase is unrelated.\n\n## Timeline\n1. At dusk Lissa asks Branon about the missing tolls.\n2. Before dawn Branon moves her in the cart and leaves a forged gate note.\n3. At noon the inspector starts clearing the storehouse.\n\n## If the Investigation Stalls: Next NPC Moves\n| Actor | Trigger | Next Move | Observable Consequence | Testable Lead |\n|---|---|---|---|---|\n| Branon | The archive search is announced | Tries to replace the original flood register | A runner carries a damp register to the storehouse | Compare the old and new balances |\n| Thormar | Offered protection | Admits who changed his route | Produces the signed delivery instruction | Compare the signature with the storehouse record |\n| Morgmar | The forged note is challenged | Asks the fish seller to identify the cart | The seller revisits the gate | Check the cart's route against the ledger |\n\n## Running the Case\nThe cart witness and storehouse record independently establish Branon's route. The forged note and altered register establish a cover-up. Lissa's account confirms the abduction. Allow the party to stop at any defensible conclusion and leave unresolved questions for later.",
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
