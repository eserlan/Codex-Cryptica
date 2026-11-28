import { generatePointCrawlLocal } from "generator-engine/public-point-crawl";
import type { GeneratorOutput } from "#lib/services/seo/generator-engine.js";
import type { ValidSlug } from "./generator-page-meta";
import { extendedSlugDrafts } from "./generator-page-drafts-extended";

const ADVENTURE_DRAFT: GeneratorOutput = {
  type: "note",
  kind: "adventure",
  title: "The Witness Who Came Back",
  summary:
    "A witness to last year's warehouse fire has evidence against a magistrate, and the city gates close in 36 hours.",
  content:
    "## Initial Situation\nMira Osal, listed among the dead in last year's warehouse fire, has appeared at the Drowned Clinic with a sealed ledger. She wants safe passage to testify.\n\n## Primary Objective & Pressure\nGet Mira and the ledger beyond the city before the Salt Gate shuts for the harvest festival in 36 hours. The magistrate's agents are buying information about her movements.\n\n## Key Locations\n- **The Drowned Clinic:** A basement surgery beneath the harbour market.\n- **The Salt Gate:** The only land exit; festival guards check all carts.\n- **The Ropewalk:** Dock workers launch a cargo skiff at the evening tide.\n\n## Important NPCs & Factions\n- **Mira Osal:** Wants to testify, but refuses to leave without evidence of who died.\n- **Captain Deren:** Guards the gate and suspects his magistrate is destroying records.\n- **The rope crews:** Want the families of the dead compensated.\n\n## Threats & Antagonists\nThe magistrate's agents search the clinic and buy passage records. They can discredit Mira without killing her.\n\n## Clues, Secrets & Discoveries\n- A clinic receipt proves Mira was alive after the fire.\n- A duplicate cargo manifest at the Ropewalk identifies the magistrate's warehouse. Both records can corroborate her testimony.",
  lore: "## Complications & Escalating Pressures\n- After 12 hours, agents question the physician. After 24, Deren receives orders to close the Salt Gate early.\n- The rope crews demand that the missing workers be named in any public testimony.\n\n## Rewards & Stakes\nThe families could win restitution; Deren could lose his command.\n\n## Possible Outcomes\n- Mira reaches the capital: the evidence triggers an inquiry, but the families still need representation.\n- The party releases the manifest locally: the magistrate cannot bury it, but his allies might seize control of the inquiry.\n- The ledger is lost: the repeatable records and witnesses still provide a route to proof.\n\n## Adventure Hooks\n- The physician asks the party to escort an injured patient.\n- A bereaved rope worker hires them to recover the duplicate manifest.",
  labels: [
    "adventure",
    "event",
    "classic-fantasy",
    "rescue-recovery",
    "imported-draft",
  ],
  status: "draft",
};

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
    summary:
      "A highland trade town where miners and toll collectors depend on the same pass.",
    content:
      "## Core Concept\nCinderveil grew around the northern pass where ore carts descend from the mines.\n\n## First Impression\nAsh-grey roofs and the clang of a toll bell. A queue of ore carts fills the gate.\n\n## Inhabitants\nMiners, muleteers, smelters and traders live around the furnace yards.\n\n## Life Here\nA weekly market trades worked iron for grain. The innkeepers lend storage space when storms close the pass.\n\n## History\nThe miners built their own road before the merchant guild purchased the tollhouse.",
    lore: "### Current Tension\nThe guild has doubled the toll after a rockslide. The miners threaten to close the road if the fee stands.\n\n### Points of Interest\n- **Tollhouse**: Where permits and objections are recorded.\n- **Old Smelter**: Closed furnace where miners meet.\n- **Copper Boar Inn**: A meeting place for mule drivers.\n- **South Granary**: Holds the grain reserve.\n- **High Pass Shrine**: Offers shelter to travellers.\n\n### Notable Inhabitants\n- **Mara (guild clerk):** Will show the party the disputed toll books if protected.\n- **Oren (miner):** Wants a winter maintenance fund, not a higher fee.\n- **Tess (innkeeper):** Knows which caravans bypassed the toll.\n\n### Controlling / Important Factions\n- **Pass Guild**: Runs the tollhouse.\n- **Mine Wardens**: Maintain the road.\n\n### Adventure Hooks\nA mule driver brings a bogus permit with the new toll seal; Mara asks the party to find its source before tomorrow's market.\n\n### GM Reference Information\n- **Scale**: Town\n- **Genre / Setting**: Fantasy\n- **Environment**: Mountain pass\n- **Primary Function**: Trade hub\n- **Official Authority**: Merchant guild\n- **Tone**: Grim and weathered",
    labels: ["rpg-location", "imported-draft"],
    status: "active",
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
      "A highland kingdom held together by old oaths and a disputed winter road.",
    content:
      "### The Realm\nVaelthorn spans three river valleys and two mountain passes. The capital, Thornkeep, guards the only road open through winter.\n\n### Government & Power\nKing Aldren rules by hereditary right through a council of noble houses. Licensed mages keep the pass markers lit. One house has been diverting maintenance funds to finance a rival claim.\n\n### Society & Culture\nVillages share winter shelters and pay grain duties into the royal storehouses. Travellers leave a lantern at the pass shrines.\n\n### How to use it at the table\nThe party is hired to escort a grain convoy and must choose between the crown's toll road and an unlicensed route protected by the rival house.",
    lore: "### At a Glance\n- **Polity Type**: Kingdom\n- **Ruler**: King Aldren\n- **Capital**: Thornkeep\n- **Scale**: Mid-sized nation\n- **Magic Level**: Common but regulated\n- **Conflict Level**: Simmering tensions\n- **Hidden Problem**: One house has been diverting maintenance funds to finance a rival claim.\n- **Immediate Hook**: Pass markers have gone dark before a grain convoy arrives.\n\n### Major Factions\n- **Lantern Council**: Wants the crown to restore the road and its licence.\n- **House Wren**: Seeks support for a rival heir and controls a second route.\n\n### Rumours & Hooks\n- The lamp oil was sold before the storm warning.\n- Wren riders have offered free passage to merchants who swear loyalty.\n- The keeper of the royal accounts has gone missing.\n\n### Entity Seeds\n- **King Aldren (ruler)**: The threatened heir.\n- **House Wren**: The rival house.\n- **Thornkeep (capital)**: The fortified seat.\n- **Winter pass**: The disputed route.",
    labels: ["rpg-kingdom", "kingdom-generator", "imported-draft"],
    status: "active",
  },
  nation: {
    type: "faction",
    title: "Axiom Industrial Authority",
    summary:
      "A cyberpunk megacorp-state in three river districts where the corporate board faces simmering tensions.",
    content:
      "### The State\nAxiom owns the pumping stations and the only freight bridge into the river districts. The board meets at Tide Exchange, but the eastern pumping station answers to a regional director.\n\n### Power Structure\nCEO-Governor Reyes signs executive orders; the board controls the maintenance budget, and the Transit Directorate controls bridge permits.\n\n### Society & Tensions\nWorkers face a freeze on water credits while the board continues to grant industrial allocations.\n\n### How to use it at the table\nA convoy carrying replacement valves arrives just as the bridge permits are suspended. The party must decide whose authority to recognise.",
    lore: "### At a Glance\n- **Theme / Genre**: Cyberpunk\n- **Type**: Megacorp-State\n- **Leader / Authority**: CEO-Governor Reyes\n- **Centre of Power**: Tide Exchange\n- **Scale**: Small region (handful of towns)\n- **Conflict Level**: Simmering tensions\n- **Hidden Problem**: The eastern station's reserve pumps have failed and the board is concealing the shortage.\n- **Immediate Hook**: The convoy's bridge permits are suspended.\n\n### Power Blocs\n- **Transit Directorate**: Controls freight access and wants the right to set its own tolls.\n- **Water Workers' Assembly**: Can halt the pumping stations; demands the release of the maintenance budget.\n\n### Rumours & Hooks\n- A director is selling priority water credits to a neighbouring state.\n- A maintenance ledger shows that the reserve pumps failed weeks ago.\n\n### Entity Seeds\n- **👤 CEO-Governor Reyes (leader)**: Signs orders but needs the board to fund them.\n- **👥 Transit Directorate**: Controls access to the river districts.\n- **👥 Water Workers' Assembly**: Can strike before the next allocation.\n- **📍 Tide Exchange (centre of power)**: Headquarters and venue for the allocation vote.\n- **📅 Crisis: Concealed pump failure**: The eastern station's reserve pumps have failed.",
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
      "A modest market-town inn where caravan crews warm themselves beside a furnace.",
    content:
      "### The Place\nThe Copper Boar is a low-ceilinged inn beside the market road. Its benches fill at sunset and its smoke-stained rafters bear the name of every caravan that survived the winter.\n\n### The People\nThe owner, Tess, knows which drivers are looking for work. Regulars Oren the muleteer and Ivara the toll clerk have stopped sitting at the same table.\n\n### The Trouble\nA creditor has been hiding forged toll permits beneath the inn's cellar floor and threatens to seize Tess's inn if she talks.\n\n### How to use it at the table\nLet the party enjoy a meal and hear a driver mention a changed toll. Give Tess a reason to trust them before she asks for help.",
    lore: "### At a Glance\n- **Type**: Tavern / Inn\n- **Atmosphere**: Rowdy and welcoming\n- **Owner**: Tess, a former caravan cook\n- **Signature Drink or Dish**: Barley stew and dark cellar ale\n- **Hidden Problem**: A creditor hides forged toll permits in the cellar.\n- **Immediate Hook**: Oren is turned away at the gate with a permit purchased from the creditor.\n\n### Notable Patrons\n- **Oren**: A muleteer who has lost a week's wages.\n- **Ivara**: A toll clerk who recognises the forged seal but fears her employer.\n\n### Rumours\n- The creditor only visits when the market closes.\n- A driver saw a sack carried into the cellar.\n- Traders complain that the south road is flooded.\n\n### Entity Seeds\n- **The Copper Boar**: The inn.\n- **Tess**: Owner.\n- **Oren**: Regular.\n- **The tollhouse**: The source of the disputed permits.",
    labels: ["rpg-location", "tavern-generator", "imported-draft"],
    status: "active",
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
    summary:
      "A god of first light and second chances, whose worshippers dispute who deserves sanctuary.",
    content:
      "### Deity Description\nOros is depicted as a traveller holding a bronze lamp. Shrines stand beside city gates and at east-facing windows.\n\n### Divine Portfolio\nOros governs the first light and the chance to begin again. Pilgrims seek courage to return home, acknowledge a wrong or start a new trade.\n\n### Worship & Cults\nHouseholds light a lamp before dawn and offer a place at the breakfast table to strangers. The gate priests keep lists of people who need shelter, but a wealthy order claims only initiated citizens may receive the blessing.",
    lore: "### At a Glance\n- **Deity Type**: God\n- **Primary Domain**: Light\n- **Worshippers**: Folk Devotion\n- **Sacred Symbol**: A bronze lamp with a split flame.\n- **Secret**: The oldest shrine's founding oath granted sanctuary to everyone, but the gate order has removed that passage from its copy.\n- **Immediate Hook**: Lamps have begun lighting themselves at the windows of people refused sanctuary.\n\n### Rituals & Taboos\n- **Ritual**: Share the dawn flame with a neighbour or traveller.\n- **Taboo**: Never extinguish the lamp of someone seeking refuge.\n\n### Myths & Legends\nOros lit the first lamp from a traveller's hearth and carried it through the longest night. Every new fire thereafter was borrowed, never owned.\n\n### Adventure Hooks\n- The gate priests hire the party to investigate the unexplained lamps before the next public rite.\n- A household keeper has found the original oath and needs protection while the clergy debate whether to read it aloud.",
    labels: ["rpg-deity", "deity-generator", "imported-draft"],
    status: "active",
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
    title: "The Submerged Vault of Sunken Runes",
    summary:
      "An ancient flooded temple complex whose inner sanctum preserves an active celestial beacon.",
    content:
      "## Overview\nOriginally built 800 years ago as a sacred dwarven sanctuary, the delve was abandoned during the Dragon War and subsequently flooded by subterranean rivers.\n\n## Signature Feature\nThe Levitating Sunstone: A massive radiant orb suspended over an inverted fountain pool, illuminating the entire central hall.",
    lore: "### Delve Overview\n- **Scale**: Medium Complex (3-4 Sectors)\n- **Genre**: Classic Fantasy\n- **Original Purpose**: Temple & Shrine\n- **Current State**: Active Monster Lair\n\n### Key Sectors\n- **📍 Sector 1: The Guarded Gateway**: Fortified entry halls with collapse traps.\n- **📍 Sector 2: The Deep Arcana Vault**: Sealed inner chamber housing warding circles.\n\n### Inhabitants & Factions\nA desperate clan of Goblins utilizing ancient defense traps against an intruding Kobold mining party.\n\n### Hazards & Traps\nPressure-plate needle traps laced with paralyzing wyvern venom.\n\n### Secret\nThe dungeon was not built as a tomb, but as a vault to lock away an elemental planar core.",
    labels: ["dungeon", "location", "dungeon-generator", "imported-draft"],
    status: "draft",
  },
  "adventure-generator": ADVENTURE_DRAFT,
  "adventure-idea-generator": ADVENTURE_DRAFT,
  tome: {
    type: "item",
    title: "The Drowned Liturgy of Saint Jude-in-the-Fens",
    summary:
      "A water-damaged 17th-century devotional octavo whose marginal glosses describe rites addressed to entities beneath the salt marsh.",
    content:
      "### Description & Physical Form\nBound in damp-stained calfskin with rusted iron clasps. Several quires have been restitched with heavy sailmaker's twine. The Latin text of a standard Anglican prayer book has been systematically overwritten between the lines with an angular, unrecognised vernacular script in dark sepia gall ink.\n\n### Significant Excerpt\n> *'Let no lantern be trimmed when the ditch-water turns brackish; that which enters the lock-gate does so by ancient covenant, needing neither name nor welcome.'*\n\n### Powers & Revelations\nScholars who decipher the interlinear glosses gain insight into hydrological anomalies, pre-flood architecture, and the rites required to placate deep-marsh entities.\n\n### Hazards & Investigation Risks\nProlonged study induces severe sensory disturbance — reader reports auditory hallucinations of distant, rhythmic sluice-gates and compulsive thirst.\n\n### Custodian & Provenance\nRecovered from the flooded undercroft of Saint Jude's vicarage during the fenland drainage of 1842; currently held in the restricted reserve of the provincial antiquarian society.",
    lore: "## Keeper / GM Notes\nThe marginal annotator was the curate himself, Father Thomas Ewell, who vanished three weeks before the fen inundated the parish church. The final pages contain a rough hydrographic map indicating a submerged masonry vault beneath the salt marsh.",
    labels: ["tome-generator", "forbidden-book", "occult", "item"],
    status: "draft",
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
