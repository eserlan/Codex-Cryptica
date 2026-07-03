import type { GeneratorOutput } from "$lib/services/seo/generator-engine";
import type { ValidSlug } from "./generator-page-meta";

export const slugDrafts: Partial<Record<ValidSlug, GeneratorOutput>> = {
  npc: {
    type: "character",
    title: "Zephyrus Gray",
    summary: "A mysterious rogue with a dark past.",
    content:
      "### Description\nZephyrus wears a hooded leather cloak and speaks in low whispers. He operates in the shadow of the docks.\n\n### Secret\nHe carries a silver key that opens a vault he refuses to talk about.",
    lore: "",
    labels: ["rpg-npc", "Rogue", "Mysterious"],
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
      "### The Realm\nVaelthorn spans three river valleys and two mountain passes. Its capital has stood for four centuries, though the walls have not been tested in a generation.\n\n### Government & Power\nKing Aldren rules through a council of six noble houses — three of which are quietly negotiating a change of leadership.",
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
      "### Heritage\nAristocratic lineage feeding on the upper-class elite. The clan operates through mortal proxies in finance, law, and the clergy.\n\n### Clan Weakness\nSilver and consecrated ground erode their power — they avoid both with practised care.",
    lore: "",
    labels: ["rpg-faction", "vampire-clan", "imported-draft"],
    status: "draft",
  },
  "nomad-clan": {
    type: "faction",
    title: "Dustborn Convoy",
    summary:
      "A fuel-scarce smuggler band running corporate contraband along closed highway corridors.",
    content:
      "### Who they are\nDustborn Convoy is a tight-knit smuggler band running the sealed highway corridors between Arcology 7 and the outer settlements. They survive on reputation, route knowledge, and a code that outsiders rarely understand until it is enforced.\n\n### How they survive\nCargo runs, corporate contraband, and repair work at waystations. Nothing moves through their territory without them knowing — or taking a cut.",
    lore: "",
    labels: ["rpg-faction", "nomad-clan", "imported-draft"],
    status: "draft",
  },
  names: {
    type: "character",
    title: "Generic Fantasy Names — Person",
    summary: "",
    content:
      "These names blend rolling vowels with grounded, archaic surnames — built for a classic secondary-world fantasy setting.\n\n- **Iridian Vespera**: A nomadic chronicler known for weaving history into rhythmic poetry.\n- **Bramwell Hallowfist**: A retired siege engineer who now runs a quiet borderlands apothecary.\n- **Sylvara Quint**: A sharp-witted investigator who recovers stolen celestial artifacts.\n- **Mordantus Krell**: A reclusive scholar obsessed with sunken underwater civilizations.\n- **Fennelora Brightspire**: A charismatic diplomat whose family has brokered peace for generations.",
    lore: "### Culture\nDrawn from a composite culture where old trade-guild roots and nomadic mountain tongues have merged.\n\n### Style\nMulti-syllabic, rolling sounds over sharp consonants — elegant and historied rather than rugged.\n\n### Usage Suggestions\nUse the ornate first names for scholars and nobles, and the compound surnames as hooks players can ask about.",
    labels: ["fantasy-name", "name-generator", "imported-draft"],
    status: "draft",
  },
  "fantasy-names": {
    type: "character",
    title: "Generic Fantasy Names — Person",
    summary: "",
    content:
      "These names blend rolling vowels with grounded, archaic surnames — built for a classic secondary-world fantasy setting.\n\n- **Iridian Vespera**: A nomadic chronicler known for weaving history into rhythmic poetry.\n- **Bramwell Hallowfist**: A retired siege engineer who now runs a quiet borderlands apothecary.\n- **Sylvara Quint**: A sharp-witted investigator who recovers stolen celestial artifacts.\n- **Mordantus Krell**: A reclusive scholar obsessed with sunken underwater civilizations.\n- **Fennelora Brightspire**: A charismatic diplomat whose family has brokered peace for generations.",
    lore: "### Culture\nDrawn from a composite culture where old trade-guild roots and nomadic mountain tongues have merged.\n\n### Style\nMulti-syllabic, rolling sounds over sharp consonants — elegant and historied rather than rugged.\n\n### Usage Suggestions\nUse the ornate first names for scholars and nobles, and the compound surnames as hooks players can ask about.",
    labels: ["fantasy-name", "name-generator", "imported-draft"],
    status: "draft",
  },
  "dnd-npc": {
    type: "character",
    title: "Elowen Ashford",
    summary: "A half-elf rogue with a talent for leverage.",
    content:
      "### Description\nElowen moves through taverns and guild halls with the easy confidence of someone who knows where the exits are. Her smile is genuine — mostly.\n\n### Secret\nShe carries a stolen signet ring that proves a local noble's son committed a crime the family has paid to bury.",
    lore: "",
    labels: ["rpg-npc", "Rogue", "Half-Elf"],
    status: "draft",
  },
  "pantheon-generator": {
    type: "faction",
    title: "The Silent Maw",
    summary: "A small pantheon of forgotten deities.",
    content:
      "### Origin & Dogma\nThe Silent Maw is a collection of ancient entities who hold sway over the dark and forgotten corners of the world.\n\n### Divine Portfolio\nTheir tenets demand absolute silence and devotion to secrets.",
    lore: "### At a Glance\n- **Pantheon Name**: The Silent Maw\n- **Conflict Theme**: Cosmic Balance\n- **Worshippers**: Mystery Cult",
    labels: ["rpg-pantheon", "pantheon-generator", "imported-draft"],
    status: "draft",
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
      "## Core Concept\nThe Meridian is a small crew freighter in worn condition — functional, lived-in, and carrying more history than its logbook admits. Independent in name, it earns its living on routes other captains decline.\n\n## First Look\nThe approach is all geometry — hard angles, running lights on slow rotation, hull plating scarred by re-entry or something worse. The docking bay smells of recycled air and machine oil.\n\n## History\nThe Meridian has served as a freighter long enough that its original documentation no longer tells the whole story. The current operator holds the registration, though how that arrangement came about is a matter of some discretion.",
    lore: "### Ship Profile\n- **Class**: Freighter / Small crew ship\n- **Condition**: Worn — lived-in, functional but showing age\n- **Owner / Affiliation**: Independent operator\n- **Current Mission**: Cargo delivery — manifest details undisclosed\n- **Crew Complement**: Mixed-species crew\n- **Tone**: Tense\n\n### Key Zones\n- **🚀 Cargo Hold**: The real story is in here — if you know how to look\n- **🚀 Bridge**: Small, cluttered, with a pilot who watches the rear sensors\n- **🚀 Crew Quarters**: Three bunks for four people; someone is sleeping in shifts\n\n### Complication\nThe cargo manifest lists machine parts. The hold contains neither machines nor parts. The crew is managing it, but the window is narrowing.\n\n### Secret\nThe ship was declared lost seven years ago. The captain has a very good reason for keeping it that way.\n\n### Adventure Hooks\n- The party learns the manifest is fiction — and they are the only ones who can act before the ship jumps\n- Someone on the docks knows the ship's real registration history and is selling that information\n- A faction needs something delivered to a location only the Meridian's captain knows how to reach",
    labels: ["rpg-ship", "rpg-location", "ship-generator", "imported-draft"],
    status: "draft",
  },
};
