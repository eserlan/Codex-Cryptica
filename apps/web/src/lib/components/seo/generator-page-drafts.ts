import { generatePointCrawlLocal } from "generator-engine/public-point-crawl";
import type { GeneratorOutput } from "#lib/services/seo/generator-engine.js";
import type { ValidSlug } from "./generator-page-meta";
import { extendedSlugDrafts } from "./generator-page-drafts-extended";

export const slugDrafts: Partial<Record<ValidSlug, GeneratorOutput>> = {
  ...extendedSlugDrafts,
  holiday: {
    type: "note",
    title: "Lanterns for the Returning Tide",
    summary:
      "A harbour remembrance for neighbours who kept the river gate open and those who did not return.",
    content:
      "## Lanterns for the Returning Tide\n\n**Type:** Memorial and seasonal observance\n\n**When:** The first calm night after the autumn equinox\n\nAt dusk, families carry covered lanterns to the quay and leave one place empty at supper. The official account credits the governor; dock families remember the rope crews who disobeyed the closure order.\n\n### At the table\nA newly found gate ledger names the official who ordered the rescue route closed. The governor's heir is due to lead this year's procession.",
    lore: "## GM Notes\nThe ledger is authentic. The rope crews kept the river gate open against orders, but later records credited the governor.",
    labels: ["holiday-generator", "observance", "memorial"],
    status: "draft",
    observances: [
      {
        name: "Lanterns for the Returning Tide",
        type: "Memorial and seasonal observance",
        when: "The first calm night after the autumn equinox",
        observers: "Harbour families and river pilots",
        traditions:
          "Carry covered lanterns to the quay and leave one place empty at supper",
        tension: "A newly found gate ledger challenges the official account.",
      },
    ],
  },
  npc: {
    type: "character",
    title: "Mara Reed",
    summary:
      "A human harbour guard who needs the last ferry to leave before the tide turns.",
    content:
      "### The Six Elements\n- **Immediate Want**: Get the party to escort two families onto the last ferry before the harbour closes.\n- **Physical Mannerism**: Counts the passengers on her fingers whenever interrupted.\n- **Sharp Contradiction**: Enforces every dock rule except the one banning unregistered children from boarding.\n- **Relationship Hook**: Owes ferryman Joss Flint a favour for carrying her injured sister home.\n- **Sensory Tag**: Her wool coat smells of creosote and wet rope.\n- **Knowledge & Secrets**: Saw the harbourmaster change the sailing ledger; does not know where the missing cargo went; conceals a second manifest in her boot.\n\n### Table Delivery\nBegin with Mara counting the waiting families. She asks the party to carry their bags aboard before the watch bell; if they challenge the passenger list, she quietly points them towards Joss.",
    lore: "### At a Glance\n- **Theme / Genre**: Classic Fantasy\n- **Ancestry**: Human\n- **Role**: Guard\n- **Immediate Want**: Get the families onto the last ferry.\n- **Mannerism / Vocal Tell**: Counts passengers on her fingers.\n- **Contradiction**: Breaks the registration rule to protect children.\n- **Relationship Hook**: Owes Joss Flint a favour.\n- **Sensory Tag**: Creosote and wet rope.\n- **Knowledge & Secrets**: Saw the harbourmaster change the sailing ledger; does not know where the missing cargo went; conceals a second manifest in her boot.\n- **Moral Stance**: Common Good\n\n### Faction Connection\nThe Harbour Watch expects her to enforce registration; she prioritises the safety of the families.",
    labels: [
      "table-card",
      "guard",
      "rpg-character",
      "npc-generator",
      "imported-draft",
    ],
    status: "draft",
  },
  settlement: {
    type: "location",
    title: "Cinderveil",
    summary: "A fortified mining town built into a dormant volcanic ridge.",
    content:
      "### Geography\nPerched above a network of ash-grey tunnels, the town's foundries run day and night.\n\n### Economy\nOre refining, black-market gems, and a militia that charges tolls on three mountain passes.",
    lore: "",
    labels: ["rpg-settlement", "Mining", "Fortified"],
    status: "draft",
  },
  "magic-item": {
    type: "item",
    title: "Frostbite Blade",
    summary: "A longsword etched with cold runes.",
    content:
      "### Properties\nDeals additional cold damage on a critical strike and glows with a faint blue light in the presence of undead.\n\n### Lore\nForged in the northern wastes by the frost smiths of old.",
    lore: "",
    labels: ["rpg-item", "Sword", "Runes"],
    status: "draft",
  },
  faction: {
    type: "faction",
    title: "The Iron Syndicate",
    summary:
      "A powerful merchants' guild that controls the city's trade routes.",
    content:
      "### Operations\nThey maintain a private army to secure their investments and lobby local lords.\n\n### Secret agenda\nThey seek to overthrow the local duke to install a puppet senate.",
    lore: "",
    labels: ["rpg-faction", "Guild", "Mercantile"],
    status: "draft",
  },
  kingdom: {
    type: "faction",
    title: "The Kingdom of Vaelthorn",
    summary:
      "A mid-sized kingdom held together by old oaths and a ruler who is running out of allies.",
    content:
      "### The Realm\nVaelthorn spans three river valleys and two mountain passes. Its capital has stood for four centuries, though the walls have not been tested in a generation.\n\n### Government & Power\nKing Aldren rules through a council of six noble houses - three of which are quietly negotiating a change of leadership.",
    lore: "",
    labels: ["rpg-kingdom", "kingdom-generator", "imported-draft"],
    status: "draft",
  },
  nation: {
    type: "faction",
    title: "Axiom Industrial Authority",
    summary:
      "A cyberpunk megacorp-state that controls three districts and is aggressively expanding into a fourth.",
    content:
      "### The State\nAxiom controls food, water, and network access across its territory. Citizens are employees. Dissent is a performance review issue.\n\n### Power Structure\nCEO-Governor Reyes holds executive authority but the board is restless.",
    lore: "",
    labels: ["rpg-nation", "nation-generator", "imported-draft"],
    status: "draft",
  },
  "social-hub": {
    type: "location",
    title: "Reyes' Noodle Hole",
    summary:
      "A cramped cyberpunk noodle bar where fixers and off-duty security share bad ramen and worse secrets.",
    content:
      "### The Place\nA steam-filled counter joint wedged under a transit overpass. Neon flickers, the broth is good, the owner asks nothing.\n\n### The Trouble\nThe owner is sitting on surveillance footage that would get someone very powerful arrested.",
    lore: "",
    labels: ["rpg-location", "social-hub-generator", "imported-draft"],
    status: "draft",
  },
  world: {
    type: "location",
    title: "Khepri IV",
    summary:
      "A tidally locked desert world whose twilight colonies compete for water and power.",
    content:
      "## World Profile\nKhepri IV is a frontier world where settlements follow the narrow belt between a molten dayside and a frozen nightside.\n\n## Climate & Geography\nA migrating terminator divides the world into habitable routes, glass deserts, and ice-bound exclusion zones.",
    lore: "",
    labels: ["world", "hard-sci-fi", "imported-draft"],
    status: "draft",
  },
  tavern: {
    type: "location",
    title: "The Copper Boar",
    summary:
      "A rowdy crossroads tavern where travellers and locals share rumours and old grudges.",
    content:
      "### The Place\nA low-ceilinged roadside inn with smoke-stained rafters and a fire that runs all year. The house ale is cheap and reliable.\n\n### The Trouble\nThe owner owes a debt to someone who has just arrived in town.",
    lore: "",
    labels: ["rpg-location", "tavern-generator", "imported-draft"],
    status: "draft",
  },
  "vampire-clan": {
    type: "faction",
    title: "House of Thorn",
    summary:
      "An aristocratic bloodline that controls the city's banking houses from behind a veil of old money and older secrets.",
    content:
      "### Heritage\nAristocratic lineage feeding on the upper-class elite. The clan operates through mortal proxies in finance, law, and the clergy.\n\n### Clan Weakness\nSilver and consecrated ground erode their power - they avoid both with practised care.",
    lore: "",
    labels: ["rpg-faction", "vampire-clan", "imported-draft"],
    status: "draft",
  },
  "nomad-clan": {
    type: "faction",
    title: "Dustborn Convoy",
    summary:
      "A nomad clan (smuggler band) operating across sealed highway corridors and arcology outskirts.",
    content:
      "### Who they are\nDustborn Convoy is a nomad clan (smuggler band) operating across sealed highway corridors and arcology outskirts. Their tone is grounded, gritty survival — every decision is shaped by the road and the people who depend on the convoy.\n\n### How they survive\nKeep the outer fuel depots supplied before winter dust storms close the passes. Their economy runs on what the roads provide — cargo runs, repairs, protection contracts, and trade at waystation markets. Nothing is wasted; everything has a price.\n\n### What threatens them\nCorporate pressure to surrender a cargo or a person. This is the crisis that cannot be deferred. The clan must resolve it before it costs them a route, a vehicle, or a member.\n\n### How to use them at the table\nDustborn Convoy works best as a faction the party keeps running into — on the road, at fuel stops, in waystation bars. They are reliable in a way most factions are not, but their code has limits and their patience for outsiders who cause problems is short.",
    lore: "### Clan Profile\n- **📍 Territory**: Sealed highway corridors and arcology outskirts\n- **Fleet**: Mixed convoy — a lead rig, two cargo haulers, and two scout bikes. Plus whatever they have salvaged this season.\n- **Code**: Grounded — don't burn bridges you might need to cross again.\n- **Secret**: The convoy's lead rig carries a black-box transponder that a megacorp thinks was destroyed three years ago.\n- **Immediate Hook**: A clan outrider offers safe passage through a corporate checkpoint in exchange for silence about what is in the lead rig.\n\n### Notable Members\n- **👤 Sera Vane**: Convoy lead who makes the calls and takes the blame when they go wrong.\n- **👤 Kaelen Voss**: Head mechanic whose hands keep the fleet running; knows every vehicle's secrets.\n- **👤 Tomas Rell**: Point rider who has memorised three hundred kilometres of road and is running out of safe routes.\n\n### Current Crisis\nCorporate pressure to surrender a cargo or a person. The clan is managing it — for now — but every day without a resolution narrows their options.\n\n### Rival Faction\n- **👥 Rustline Syndicate**: Competing for the same routes, safe stops, or cargo contracts. The rivalry is old enough to have its own code of conduct — and new enough that someone recently broke it.",
    labels: ["rpg-faction", "nomad-clan", "imported-draft"],
    status: "active",
  },
  names: {
    type: "character",
    title: "Generic Fantasy Names — Person",
    summary: "Curated names with linguistic roots and naming conventions.",
    content:
      "A curated set of classic secondary-world fantasy names. Use them as full character names, or mix and match the given names and compound surnames to suit your setting.\n\n- **Iridian Vespera**: Ornate rolling-vowel given name paired with an archaic nightfall-root surname.\n- **Bramwell Hallowfist**: Grounded, historic compound surname; common in border valleys and craft guilds.\n- **Sylvara Quint**: Melodic sylvan given name with a sharp, numbered lineage surname.\n- **Mordantus Krell**: Austere scholar's name; heavy consonants favoured in coastal academies.\n- **Fennelora Brightspire**: Melodic diminutive given name paired with a noble beacon-house surname.\n- **Theron Greybourne**: Classical heroic given name with a river-marker geographical surname.\n- **Kaelen Stonehart**: Resilient northern given name with an ancient martial lineage surname.\n- **Mirelle Ashworth**: Soft courtly given name paired with an old hearth-estate surname.",
    lore: "### Culture & Naming Conventions\nDerived from secondary-world fantasy settings where old trade-guild roots, border lineages, and ancient court tongues merge.\n\n### Structure & Components\n- **Given Names**: Multi-syllabic, rolling vowel combinations (`Iridi-`, `Sylv-`, `Fenn-`) with soft or liquid consonants.\n- **Surnames**: Two-part compound names joining landscape or craft markers (`Hallow-`, `Grey-`, `Stone-`) with settlement or nature roots (`-fist`, `-bourne`, `-hart`).\n- **Titles & Epithets**: Frequently appended with geographical or occupational suffixes for distinguishing common names.\n\n### Usage Suggestions\n- Mix and match stems freely: drop a syllable, combine a prefix from one name with a suffix from another.\n- Use ornate given names for scholars, ambassadors, and court figures; reserve heavy compound surnames for frontier travellers and guild artisans.",
    labels: ["fantasy-name", "name-generator", "imported-draft"],
    status: "draft",
  },
  "fantasy-names": {
    type: "character",
    title: "Generic Fantasy Names — Person",
    summary: "Curated names with linguistic roots and naming conventions.",
    content:
      "A curated set of classic secondary-world fantasy names. Use them as full character names, or mix and match the given names and compound surnames to suit your setting.\n\n- **Iridian Vespera**: Ornate rolling-vowel given name paired with an archaic nightfall-root surname.\n- **Bramwell Hallowfist**: Grounded, historic compound surname; common in border valleys and craft guilds.\n- **Sylvara Quint**: Melodic sylvan given name with a sharp, numbered lineage surname.\n- **Mordantus Krell**: Austere scholar's name; heavy consonants favoured in coastal academies.\n- **Fennelora Brightspire**: Melodic diminutive given name paired with a noble beacon-house surname.\n- **Theron Greybourne**: Classical heroic given name with a river-marker geographical surname.\n- **Kaelen Stonehart**: Resilient northern given name with an ancient martial lineage surname.\n- **Mirelle Ashworth**: Soft courtly given name paired with an old hearth-estate surname.",
    lore: "### Culture & Naming Conventions\nDerived from secondary-world fantasy settings where old trade-guild roots, border lineages, and ancient court tongues merge.\n\n### Structure & Components\n- **Given Names**: Multi-syllabic, rolling vowel combinations (`Iridi-`, `Sylv-`, `Fenn-`) with soft or liquid consonants.\n- **Surnames**: Two-part compound names joining landscape or craft markers (`Hallow-`, `Grey-`, `Stone-`) with settlement or nature roots (`-fist`, `-bourne`, `-hart`).\n- **Titles & Epithets**: Frequently appended with geographical or occupational suffixes for distinguishing common names.\n\n### Usage Suggestions\n- Mix and match stems freely: drop a syllable, combine a prefix from one name with a suffix from another.\n- Use ornate given names for scholars, ambassadors, and court figures; reserve heavy compound surnames for frontier travellers and guild artisans.",
    labels: ["fantasy-name", "name-generator", "imported-draft"],
    status: "draft",
  },
  "dnd-npc": {
    type: "character",
    title: "Elowen Ashford",
    summary:
      "A chaotic neutral half-elf rogue. Needs someone expendable to retrieve a sealed ledger from the harbour master's office before midnight.",
    content:
      "### The Six Elements\n- **Immediate Want**: Needs someone expendable to retrieve a sealed ledger from the harbour master's office before midnight.\n- **Physical Mannerism**: Keeps one thumb hooked in her belt while scanning every doorway.\n- **Sharp Contradiction**: A sharp-tongued fence who quietly pays off the debts of dockside apprentices.\n- **Relationship Hook**: Owes a favour to a disgraced watch captain who still holds her real name.\n- **Sensory Tag**: Smells of damp saltwool and cheap clove oil; speaks in clipped, unhurried sentences.\n- **Knowledge & Secrets**: Knows which warehouse guards take coin; does not know the ledger is a forgery; will never reveal the stolen signet ring sewn into her cloak lining.\n\n### Table Delivery\nIntroduce Elowen through her saltwool scent and doorway-scanning habit before she names the midnight ledger job. Let her dry generosity toward an apprentice show through if the party presses her terms.",
    lore: "### At a Glance\n- **Class / Archetype**: Rogue / Level 4\n- **Table Rating**: CR 2\n- **Ancestry**: Half-Elf\n- **Role**: Rogue\n- **Immediate Want**: Needs someone expendable to retrieve a sealed ledger from the harbour master's office before midnight.\n- **Mannerism / Vocal Tell**: Keeps one thumb hooked in her belt while scanning every doorway.\n- **Contradiction**: A sharp-tongued fence who quietly pays off the debts of dockside apprentices.\n- **Relationship Hook**: Owes a favour to a disgraced watch captain who still holds her real name.\n- **Sensory Tag**: Smells of damp saltwool and cheap clove oil; speaks in clipped, unhurried sentences.\n- **Knowledge & Secrets**: Knows which warehouse guards take coin; does not know the ledger is a forgery; will never reveal the stolen signet ring sewn into her cloak lining.\n- **Moral Stance**: Chaotic Neutral\n\n### Faction Connection\nThe Lantern Guild, smugglers who treat harbour tariffs as an optional suggestion.",
    labels: [
      "table-card",
      "rogue",
      "rpg-character",
      "npc-generator",
      "imported-draft",
    ],
    status: "active",
  },
  "pantheon-generator": {
    type: "faction",
    title: "The Silent Maw",
    summary:
      "A collection of deities bound by the theme of cosmic balance in a classic fantasy world with shadow at its center.",
    content:
      "### Origin & Dogma\nThe oldest texts describe these deities emerging not at the beginning of time but at its first break — the moment when cosmic balance entered the cosmos and forced a division of responsibility.\n\n### Pantheon Structure\nThe pantheon consists of 3 deities:\n1. **Vaelor**: Represents the domain of Shadow.\n2. **Kaelith**: Serves as a rival claimant challenging the old order.\n3. **Morgath**: Serves as a neutral arbiter holding the balance.\n\n### Divine Alliances & Rivalries\n- **Vaelor** is allied with **Morgath**, but stands in direct opposition to **Kaelith**.\n- **Kaelith** seeks to overthrow the established order of the other deities.",
    lore: "### At a Glance\n- **Pantheon Name**: The Silent Maw\n- **Conflict Theme**: Cosmic Balance\n- **Worshippers**: Mystery Cult\n- **Hidden Problem**: A sealed relic from the pantheon's founding pact has cracked, weakening the oaths sworn in their name.\n- **Immediate Hook**: Two rival temples in the same city have declared the same holy day, and both demand the streets.\n\n### Deities of the Pantheon\n- **Vaelor**: The primary deity of Shadow.\n- **Kaelith**: Known as a rival claimant challenging the old order.\n- **Morgath**: Known as a neutral arbiter holding the balance.\n\n### Clergy & Temples\n- **Clergy Roles**: Rotating stewards hold office for one lunar cycle, splitting duties between public alms and sealed tribunal judgements.\n- **Temples & Shrines**: Vaulted sanctuaries sit beside busy markets, backed by modest wayside shrines along trade routes.\n\n### Rumours & Legends\n- One of the pantheon's sacred relics was pawned decades ago and now sits in a noble's private vault.\n- The high priests of rival deities are meeting in secret to avert an open schism.\n\n### Entity Seeds\n- **👥 Mystery Cult**: A major temple order or mystery cult dedicated to the worship of the pantheon.",
    labels: ["rpg-pantheon", "pantheon-generator", "imported-draft"],
    status: "active",
  },
  "god-generator": {
    type: "character",
    title: "Oros, the Light of Dawn",
    summary: "A deity of the rising sun and new beginnings.",
    content:
      "### Deity Description\nOros is depicted as a radiant figure carrying a shield of polished bronze. Their altars face the east.",
    lore: "### At a Glance\n- **Deity Type**: God\n- **Primary Domain**: Light\n- **Worshippers**: State Religion",
    labels: ["rpg-deity", "deity-generator", "imported-draft"],
    status: "draft",
  },
  "ship-generator": {
    type: "location",
    title: "CSV Meridian",
    summary:
      "A worn freighter operating under a registry that does not quite hold up to scrutiny.",
    content:
      "## Core Concept\nThe Meridian is a small crew freighter in worn condition - functional, lived-in, and carrying more history than its logbook admits. Independent in name, it earns its living on routes other captains decline.\n\n## First Look\nThe approach is all geometry - hard angles, running lights on slow rotation, hull plating scarred by re-entry or something worse. The docking bay smells of recycled air and machine oil.\n\n## History\nThe Meridian has served as a freighter long enough that its original documentation no longer tells the whole story. The current operator holds the registration, though how that arrangement came about is a matter of some discretion.",
    lore: "### Ship Profile\n- **Class**: Freighter / Small crew ship\n- **Condition**: Worn - lived-in, functional but showing age\n- **Owner / Affiliation**: Independent operator\n- **Current Mission**: Cargo delivery - manifest details undisclosed\n- **Crew Complement**: Mixed-species crew\n- **Tone**: Tense\n\n### Key Zones\n- **🚀 Cargo Hold**: The real story is in here - if you know how to look\n- **🚀 Bridge**: Small, cluttered, with a pilot who watches the rear sensors\n- **🚀 Crew Quarters**: Three bunks for four people; someone is sleeping in shifts\n\n### Complication\nThe cargo manifest lists machine parts. The hold contains neither machines nor parts. The crew is managing it, but the window is narrowing.\n\n### Secret\nThe ship was declared lost seven years ago. The captain has a very good reason for keeping it that way.\n\n### Adventure Hooks\n- The party learns the manifest is fiction - and they are the only ones who can act before the ship jumps\n- Someone on the docks knows the ship's real registration history and is selling that information\n- A faction needs something delivered to a location only the Meridian's captain knows how to reach",
    labels: ["rpg-ship", "rpg-location", "ship-generator", "imported-draft"],
    status: "draft",
  },
  "news-sheet-generator": {
    type: "note",
    title: "The Gutter Signal - Issue 47",
    summary:
      "A pirate-press street screamsheet whose lead story about a district blackout carefully avoids naming the corporation that caused it.",
    content:
      "# The Gutter Signal\n*Read it before they deny it - Issue No. 47*\n\n## BLACKOUT HITS THE STACKS - GRID AUTHORITY BLAMES 'MAINTENANCE'\nFour blocks went dark at 0300 and stayed dark until the private towers came back online first. The Grid Authority calls it scheduled maintenance. Nobody in the Stacks was told about a schedule.\n\n### Notices & Classifieds\n- LOST: one courier bag, contents personal. Generous reward, no questions asked.\n\n### Word on the Street\n- Someone has been buying up debts around the old quarter - quietly, and at full price",
    lore: "",
    labels: ["rpg-handout", "news-sheet-generator", "imported-draft"],
    status: "draft",
  },
  "dungeon-generator": {
    type: "location",
    kind: "dungeon",
    title: "The Submerged Vault of Sunken Runes",
    summary:
      "An ancient flooded dwarven temple whose inner sanctum preserves an active celestial beacon.",
    content:
      "## History & Original Purpose\nEight centuries ago dwarven pilgrims built a sanctuary around a celestial beacon. Refugees sealed the lower vault during the Dragon War, then subterranean rivers flooded the chambers.\n\n## Current State & Function\nTwo clans now need the remaining dry ground. Goblins hold the gate; kobold miners have reached the old maintenance channel. The next surge will flood that channel unless someone opens the inner sluice.\n\n## Signature Feature\nThe Levitating Sunstone hangs above an inverted fountain, illuminating the central hall. Its reflection shows a second door invisible from the stairs.\n\n## Key Sectors & Layout\n\n### Sector 1: The Guarded Gateway\nFortified entrance halls contain a sagging lintel and a safe raised walkway. Fresh scuffs along the wall show how the goblins avoid the pressure plates.\n\n### Sector 2: The Inverted Fountain\nA half-flooded hall with the Sunstone overhead. A stair descends to the inner shrine, while a maintenance hatch opens into the drain gallery.\n\n### Sector 3: The Drain Gallery\nThe kobolds hold the narrow gallery and have wedged its sluice shut. The old inspection ledge provides a route around the flooded passage if travellers move slowly.\n\n### Sector 4: The Deep Arcana Vault\nWarding circles surround a sealed pedestal; the reflected door in the fountain is a shortcut into the chamber. The cracked lower ward pulses whenever water touches it.\n\n## Faction Situation\nThe goblins want to shelter their families above the next flood. The kobolds want to recover an ancient survey tool before their tunnel floods.\n\n### The Reedbone Clan\n**Identity:** Goblin refugees. They welcome travellers who bring food but distrust anyone wearing mining gear.\n**Goal:** Keep a dry refuge.\n**Drive:** Protect their dependants.\n**Obstacle:** The kobolds control the sluice.\n**Origin:** Fled fighting in the upper tunnels.\n**Belief:** The Sunstone protects those who shelter beneath it.\n**Territory:** Gate and fountain.\n**Strength:** Knowledge of the old traps.\n**Leader:** Rill Moss, who will trade safe passage for repairing the sluice.\n**Notable:** Ketta, a scout who knows the reflected door.\n**Relationship:** Resents the kobolds but needs their engineering.\n\n### The Copperclaw Crew\n**Identity:** Kobold surveyors. Skilled engineers, but impatient with negotiation.\n**Goal:** Retrieve the survey tool and leave.\n**Drive:** Earn enough to return home.\n**Obstacle:** No access to the inner shrine.\n**Origin:** Followed a dwarven maintenance map.\n**Belief:** The shrine's light is a warning, not a blessing.\n**Territory:** Drain Gallery.\n**Strength:** Pumps and climbing gear.\n**Leader:** Vek Coil, prepared to reopen the sluice in exchange for a guided visit.\n**Notable:** Til, who can read the warding marks.\n**Relationship:** Assumes the goblins are deliberately blocking rescue.",
    lore: "### Dungeon Layout\nGateway to Fountain to Deep Arcana Vault; Fountain to Drain Gallery to Vault through the inspection ledge. Reveal the shortcut through the reflected door when someone examines the fountain.\n\n### Central Secret / Boss Mystery\nThe Sunstone is part of the seal around an elemental planar core. The core is harmless if the lower ward stays dry. Removing the Sunstone before draining the vault releases it.\n\n### Hazards & Traps\n- Pressure-plate needles deliver paralysing wyvern venom. Bent needles near the gate and the goblin walkway warn of the trap.\n- The next surge arrives after two exploration turns; open the sluice or rig a pump to keep the lower ward dry.\n\n### Treasures & Artifacts\n- A bronze survey tool in the vault reveals the reflected door; the kobolds need it.\n- Offering coins rest on a dry shelf and can be removed without disturbing the seal.\n\n### Adventure Hooks & Rumours\n- A riverside village seeks the source of warm, glowing floodwater.\n- Both clans offer access if the party helps reopen the sluice. If ignored, the kobolds force it open and flood the goblin route.",
    labels: ["dungeon", "location", "dungeon-generator", "imported-draft"],
    status: "active",
  },
  "adventure-generator": {
    type: "event",
    title: "The Witness Who Came Back",
    summary:
      "A dying informant has surfaced with evidence that implicates the city's most powerful magistrate - and she has three days to live.",
    content:
      "## Initial Situation\nA street physician treated a woman who should be dead - she was listed as a victim of last year's warehouse fire. She is carrying a sealed ledger and will only hand it to someone who can guarantee safe passage out of the city.\n\n## Primary Objective & Pressure\nGet the witness and the ledger to the provincial capital before the magistrate's agents locate her - the city gates close in 36 hours for the harvest festival.",
    lore: "### Key Locations\n- **The Drowned Clinic**: A basement surgery below the harbour market.\n- **The Salt Gate**: The only land route out.\n\n### Important NPCs & Factions\n- **Mira Osal, the witness**: Survived by accident; wants to testify.\n- **Guard-Captain Deren**: Loyal to the magistrate.\n\n### Possible Outcomes\n- The witness reaches the capital and testifies; the magistrate is arrested.",
    labels: ["adventure", "event", "adventure-generator", "imported-draft"],
    status: "draft",
  },
  "adventure-idea-generator": {
    type: "event",
    title: "The Witness Who Came Back",
    summary:
      "A dying informant has surfaced with evidence that implicates the city's most powerful magistrate - and she has three days to live.",
    content:
      "## Initial Situation\nA street physician treated a woman who should be dead - she was listed as a victim of last year's warehouse fire. She is carrying a sealed ledger and will only hand it to someone who can guarantee safe passage out of the city.\n\n## Primary Objective & Pressure\nGet the witness and the ledger to the provincial capital before the magistrate's agents locate her - the city gates close in 36 hours for the harvest festival.",
    lore: "### Key Locations\n- **The Drowned Clinic**: A basement surgery below the harbour market.\n- **The Salt Gate**: The only land route out.\n\n### Important NPCs & Factions\n- **Mira Osal, the witness**: Survived by accident; wants to testify.\n- **Guard-Captain Deren**: Loyal to the magistrate.\n\n### Possible Outcomes\n- The witness reaches the capital and testifies; the magistrate is arrested.",
    labels: ["adventure", "event", "adventure-generator", "imported-draft"],
    status: "draft",
  },
  tome: {
    type: "item",
    title: "The Drowned Liturgy of the Fen Gate",
    summary:
      "An annotated liturgy kept at Reed Priory describes a bell rite for a submerged shrine.",
    content:
      "### Physical Description & Format\nAn illuminated vellum folio bound in damp-stained calfskin and rusted iron clasps. The lower edges of three leaves are trimmed; a blue wash marks each tide table.\n\n### Provenance & Transmission\nSister Velin compiled the liturgy during the Second Age of Strife to record a shrine's flood rites. One annotated copy survives in the Reed Priory archive. A later copyist removed the names of the gate keepers.\n\n### Contents & Revelations\nThe text purports to describe how a bronze bell opens the shrine's gate at high tide.\n\n> *\"Ring at the full water, and the gate shall yield to the faithful. Let the keeper stand where the bird faces east.\"*\n\nThe east-facing bird is a painted heron in the margins. The bell instruction sits above an erased line, and the tide diagrams mark low water in blue. A separate gate log could confirm which operation the diagrams describe.\n\n### Risks & Costs of Study\n- **Primary hazard (Supernatural / Entity Attraction):** Speaking the corrupted instruction beside the gate raises the water inside the shrine.\n- **Social / Legal:** The priory limits access to supervised reading sessions, and a rival collector wants the annotated copy.\n- **Mental:** The repeated formula tempts readers to accept the later text without checking the damaged pages.\n\n### Adventure Hooks\n1. The archivist offers access if the investigators recover the missing gate log from a river pilot's estate.\n2. A collector offers to pay for a copy, but intends to ring the bell before the flood recedes.\n3. The party can reach the submerged shrine by following the painted heron marks on the old floodwall.",
    lore: "### At the Table Reference\nGive the visible excerpt and trimmed edges before explaining the erased line. The tide table and independent gate log both point to low water.\n\n### Ground Truth for the GM\n- **What the Book Claims:** The bell opens the gate at high tide.\n- **The Deception / Flaw:** A copyist reversed the timing to prevent rival pilgrims entering safely.\n- **The Objective Truth:** The bell releases a drainage sluice at low water; using it at high tide admits water instead.\n- **Actionable Clue:** The blue low-water marks align with the painted heron; the gate log records low-water bell tests.\n\n### Connected Entities\n- **Sister Velin** (Author / Compiler): Recorded the original rite.\n- **Reed Priory** (Current Custodian / Archive): Restricts access to the surviving annotated copy.\n- **Silver Lamp Society** (Interested Faction): Wants exclusive control of the shrine.\n- **Fen Gate** (Associated Location): Holds the bell and sluice.\n\n### Quick Checks & Mechanics\n- **Deciphering:** Read the High Gothic script or employ a translator. A second source confirms the tide notation.\n- **The Failure Condition:** Ringing at high tide opens the intake, flooding the lower shrine over two exploration turns.\n- **Safe Handling:** Translate at the archive; inspect the tide and gate log before trying the instruction.",
    labels: ["tome-generator", "forbidden-book", "liturgy", "item"],
    status: "active",
  },
  "point-crawl": generatePointCrawlLocal({
    genre: "Classic Fantasy",
    scale: "Wilderness",
    pointCount: 8,
    density: "Balanced branching",
    dangerLevel: "Moderate / Hazardous",
    secretFrequency: "Standard (1-2 secret routes)",
    instruction:
      "A mist-choked pilgrimage trail climbing through flooded watchtowers and basalt ravines toward the Sunken Reliquary.",
  }) as GeneratorOutput,
};
