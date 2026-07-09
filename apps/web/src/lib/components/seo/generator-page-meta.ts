export type ValidSlug =
  | "npc"
  | "settlement"
  | "magic-item"
  | "faction"
  | "quest"
  | "item"
  | "tavern"
  | "social-hub"
  | "kingdom"
  | "nation"
  | "vampire-clan"
  | "nomad-clan"
  | "names"
  | "fantasy-names"
  | "dnd-npc"
  | "pantheon-generator"
  | "god-generator"
  | "ship-generator"
  | "language-generator";

export type SlugMetaEntry = {
  pageTitle: string;
  metaDescription: string;
  introTitle: string;
  eyebrow: string;
  introText: string;
  canonicalPath: string;
  faqs?: { question: string; answer: string }[];
  relatedLinks?: { href: string; label: string }[];
};

export const slugMeta: Record<ValidSlug, SlugMetaEntry> = {
  npc: {
    pageTitle:
      "RPG NPC Generator | Fantasy, Cyberpunk, Gothic & Sci-Fi Characters | Codex Cryptica",
    metaDescription:
      "Generate NPCs across any genre — fantasy, cyberpunk, gothic horror, sci-fi, modern conspiracy, and post-apocalyptic. Each NPC has a secret, faction tie, and table-ready hook.",
    introTitle: "RPG NPC Generator",
    eyebrow: "RPG NPC Generator",
    introText:
      "Create NPCs across any genre with secrets, faction ties, and table-ready hooks. Works without login, then imports into your local Codex vault.",
    canonicalPath: "/generators/npc",
    faqs: [
      {
        question: "Does the D&D NPC generator require an account?",
        answer:
          "No. Generate and copy NPC notes on this page without logging in. Save the draft directly into a browser-local Codex Cryptica vault — no sign-up required.",
      },
      {
        question: "What does the RPG NPC generator create?",
        answer:
          "It generates a complete NPC with a name, ancestry, role, personality traits, a hidden secret, motivation, faction connection, and a table-ready GM hook — structured for immediate use.",
      },
      {
        question: "Can I use it outside D&D?",
        answer:
          "Yes. The output works for D&D, Pathfinder, OSR games, cyberpunk, and any genre. The generator is system-agnostic.",
      },
      {
        question: "How does saving a generated NPC work?",
        answer:
          "Clicking 'Save to Codex' stores the NPC draft in your browser's local storage. Open Codex Cryptica and it imports automatically as a Character entity, ready to link to factions, locations, and campaign notes.",
      },
    ],
    relatedLinks: [
      { href: "/solutions/ai-gm-assistant", label: "AI GM assistant" },
      {
        href: "/free-rpg-campaign-manager",
        label: "Free RPG campaign manager",
      },
    ],
  },
  settlement: {
    pageTitle:
      "Settlement Generator | RPG Inhabited Place Creator | Codex Cryptica",
    metaDescription:
      "Generate campaign-ready settlements, districts, colonies, and communities for any RPG genre. Set the function, environment, tone, and tension — get a place with a reason to exist and a problem worth solving.",
    introTitle: "Settlement Generator",
    eyebrow: "Settlement Generator",
    introText:
      "Generate an inhabited place that answers three questions: why does it exist, who really controls it, and what is about to go wrong. Works for any genre — fantasy, cyberpunk, sci-fi, horror, post-apocalyptic, and more.",
    canonicalPath: "/generators/settlement",
  },
  "magic-item": {
    pageTitle:
      "Magic Item Generator | Free Fantasy RPG Loot Tool | Codex Cryptica",
    metaDescription:
      "Generate fantasy RPG magic items with lore, abilities, quirks, and campaign hooks. Copy the draft or save it into your local campaign vault.",
    introTitle: "Magic Item Generator",
    eyebrow: "Magic Item Generator",
    introText:
      "Create a campaign-ready magic item with lore, abilities, and quirks. Works without login.",
    canonicalPath: "/generators/magic-item",
  },
  faction: {
    pageTitle:
      "RPG Faction Generator | Fantasy Guilds, Cyberpunk Megacorps & Vampire Clans | Codex Cryptica",
    metaDescription:
      "Generate detailed RPG factions. Perfect as a fantasy guild generator, cyberpunk megacorp creator, sci-fi empire builder, or gothic vampire clan generator. Save drafts to your vault.",
    introTitle: "RPG Faction Generator",
    eyebrow: "Faction Generator",
    introText:
      "Forge campaign-ready organizations across any genre. Use it as a fantasy guild generator, cyberpunk megacorp creator, sci-fi empire builder, or gothic vampire clan generator with distinct agendas, conflicts, and NPCs.",
    canonicalPath: "/generators/faction",
    faqs: [
      {
        question: "What does the faction generator create?",
        answer:
          "It generates a complete RPG faction across any genre — fantasy guilds, cyberpunk megacorps, vampire covens, space federations, and more. Each result includes a name, agenda, internal conflict, rival faction, notable NPCs, and a ready-to-use GM hook.",
      },
      {
        question: "Can I use it without an account?",
        answer:
          "Yes. Generate and copy faction notes on this page without logging in. When you're ready, save the draft directly into a browser-local Codex Cryptica vault — no sign-up required.",
      },
      {
        question: "Can I aim the faction at my current campaign?",
        answer:
          "Yes. Add optional campaign context — a location, villain, ongoing conflict, or political tension — and the generator will fit the faction to your table rather than producing a generic result.",
      },
      {
        question: "How does saving a generated faction work?",
        answer:
          "Clicking 'Save to Codex' stores the faction draft in your browser's local storage. Open Codex Cryptica and it imports automatically as a Faction entity, ready to link to NPCs, locations, and campaign notes.",
      },
    ],
    relatedLinks: [
      { href: "/tools/dnd-npc-generator", label: "D&D NPC Generator" },
      { href: "/solutions/worldbuilding-tool", label: "Worldbuilding tool" },
    ],
  },
  quest: {
    pageTitle:
      "RPG Quest Hook Generator | Free Fantasy & Cyberpunk Adventure Tool | Codex Cryptica",
    metaDescription:
      "Generate detailed RPG quest hooks with complications, twists, rewards, and key NPCs. Perfect for fantasy, cyberpunk, or sci-fi tabletop campaigns.",
    introTitle: "RPG Quest Generator",
    eyebrow: "Quest Hook Generator",
    introText:
      "Create campaign-ready adventure seeds and quest hooks. Set the genre, tone, threat, and twist, then import into your local vault.",
    canonicalPath: "/generators/quest",
  },
  item: {
    pageTitle:
      "RPG Loot & Magic Item Generator | Free Fantasy Equipment Tool | Codex Cryptica",
    metaDescription:
      "Generate custom RPG loot, magic items, weapons, and relics. Features customizable rarities, properties, and lore backstories.",
    introTitle: "RPG Item Generator",
    eyebrow: "Item Generator",
    introText:
      "Design magic items, weaponry, or rare relics with customizable properties and history. Works without login.",
    canonicalPath: "/generators/item",
  },
  "social-hub": {
    pageTitle:
      "Social Hub Generator | RPG Venue Generator for Any Genre | Codex Cryptica",
    metaDescription:
      "Generate a genre-agnostic social gathering location — from cyberpunk noodle bars to western saloons to fantasy inns. Works without login. Save into your Codex Cryptica campaign vault.",
    introTitle: "Social Hub Generator",
    eyebrow: "Social Hub Generator",
    introText:
      "Create a campaign-ready social venue for any genre. Pick your setting, venue type, and atmosphere — get a named location with regulars, rumours, and a hidden problem.",
    canonicalPath: "/generators/social-hub",
  },
  kingdom: {
    pageTitle:
      "Kingdom Generator | Free Fantasy Realm & Empire Creator | Codex Cryptica",
    metaDescription:
      "Generate a detailed fantasy kingdom or empire with ruler, factions, geography, conflict, and adventure hooks. Works without login. Save into your Codex Cryptica campaign vault.",
    introTitle: "Kingdom Generator",
    eyebrow: "Kingdom Generator",
    introText:
      "Create a campaign-ready fantasy realm with a ruler, major factions, internal tensions, and adventure hooks. Works without login, then imports into your local vault.",
    canonicalPath: "/generators/kingdom",
  },
  nation: {
    pageTitle:
      "Nation Generator | RPG Political Entity Creator for Any Genre | Codex Cryptica",
    metaDescription:
      "Generate a political entity for any RPG genre — fantasy kingdoms, cyberpunk megacorp-states, sci-fi federations, post-apoc warlord territories. Works without login.",
    introTitle: "Nation Generator",
    eyebrow: "Nation Generator",
    introText:
      "Create a campaign-ready political entity for any genre. Pick your setting and polity type — get a named state with power blocs, internal tensions, and adventure hooks.",
    canonicalPath: "/generators/nation",
  },
  tavern: {
    pageTitle:
      "Tavern Generator | Free RPG Inn & Alehouse Creator | Codex Cryptica",
    metaDescription:
      "Generate a detailed RPG tavern or inn with owner, patrons, rumours, trouble, and adventure hooks. Works without login. Save into your Codex Cryptica campaign vault.",
    introTitle: "Tavern Generator",
    eyebrow: "Tavern Generator",
    introText:
      "Create a campaign-ready tavern with atmosphere, owner, notable patrons, rumours, and a hidden problem. Works without login, then imports into your local vault.",
    canonicalPath: "/generators/tavern",
  },
  "vampire-clan": {
    pageTitle:
      "Vampire Clan Generator | Free RPG Bloodline & Coven Tool | Codex Cryptica",
    metaDescription:
      "Create detailed vampire clans, bloodlines, occult covens, and secret societies. Generate history, feeding habits, weaknesses, and plot hooks for your campaign.",
    introTitle: "Vampire Clan Generator",
    eyebrow: "Vampire Clan Generator",
    introText:
      "Create undead factions with bloodlines, feeding habits, dark agendas, and table-ready hooks. Works without login, then imports into your local Codex vault.",
    canonicalPath: "/generators/vampire-clan",
  },
  "nomad-clan": {
    pageTitle:
      "Cyberpunk Nomad Clan Generator | Free RPG Road Faction Tool | Codex Cryptica",
    metaDescription:
      "Generate cyberpunk nomad clans with convoy culture, road codes, corporate enemies, and table-ready hooks. Create mobile communities for any near-future or post-apocalyptic campaign.",
    introTitle: "Cyberpunk Nomad Clan Generator",
    eyebrow: "Nomad Clan Generator",
    introText:
      "Create road-hardened nomad clans with convoy culture, territory routes, internal tensions, and campaign-ready hooks. Works without login, then imports into your local Codex vault.",
    canonicalPath: "/generators/nomad-clan",
    faqs: [
      {
        question: "What does the nomad clan generator create?",
        answer:
          "It generates a complete cyberpunk nomad clan with a name, role, territory, convoy composition, clan code, internal crisis, rival faction, notable members, and table-ready GM hooks.",
      },
      {
        question: "Can I use it without an account?",
        answer:
          "Yes. Generate and copy clan notes on this page without logging in. Save the draft directly into a browser-local Codex Cryptica vault — no sign-up required.",
      },
      {
        question: "Which RPG systems does it work with?",
        answer:
          "The generator is system-agnostic. It works for Cyberpunk Red, Starfinder, GURPS, Neon City Overdrive, or any near-future or post-apocalyptic campaign where mobile communities matter.",
      },
      {
        question: "Can I aim the clan at my current campaign?",
        answer:
          "Yes. Add optional campaign context — a city, megacorp, rival clan, or active threat — and the generator will fit the clan to your table rather than producing a generic result.",
      },
    ],
    relatedLinks: [
      { href: "/generators/faction", label: "Faction generator" },
      { href: "/generators/npc", label: "RPG NPC generator" },
      { href: "/generators/settlement", label: "Settlement generator" },
    ],
  },
  names: {
    pageTitle:
      "RPG Name Generator | Fantasy, Cyberpunk, Gothic & Sci-Fi Names | Codex Cryptica",
    metaDescription:
      "Generate names for characters, places, factions, and items across any genre — fantasy, cyberpunk, gothic horror, sci-fi, and more. Free for any tabletop RPG.",
    introTitle: "RPG Name Generator",
    eyebrow: "Name Generator",
    introText:
      "Generate names for characters, places, factions, and items in any genre. Pick a vibe and culture, steer with optional context, and copy your favourites.",
    canonicalPath: "/generators/names",
  },
  "fantasy-names": {
    pageTitle:
      "Fantasy Name Generator | Free RPG & Worldbuilding Name Tool | Codex Cryptica",
    metaDescription:
      "Generate fantasy names for characters, places, factions, and items across ten cultural styles. Free for D&D, Pathfinder, worldbuilding, and any tabletop RPG.",
    introTitle: "Fantasy Name Generator",
    eyebrow: "Fantasy Name Generator",
    introText:
      "Generate fantasy names for characters, places, factions, and items across ten cultural styles. Works without login — copy your favourites for your campaign.",
    canonicalPath: "/generators/fantasy-names",
  },
  "dnd-npc": {
    pageTitle:
      "D&D NPC Generator | Free Fantasy Character Creator | Codex Cryptica",
    metaDescription:
      "Create a fantasy NPC with ancestry, role, personality, secret, faction tie, and plot hook. Works without login. Save into your Codex Cryptica campaign vault.",
    introTitle: "D&D NPC Generator",
    eyebrow: "D&D NPC Generator",
    introText:
      "Create a fantasy NPC with ancestry, role, personality traits, a hidden secret, and a table-ready GM hook. Works without login, then imports into your local vault.",
    canonicalPath: "/generators/dnd-npc",
  },
  "pantheon-generator": {
    pageTitle:
      "RPG Pantheon Generator | Free Deity & Divine Assembly Tool | Codex Cryptica",
    metaDescription:
      "Generate detailed RPG pantheons with alliances, rivalries, myths, and hooks. Save drafts directly to your Codex campaign vault.",
    introTitle: "RPG Pantheon Generator",
    eyebrow: "Pantheon Generator",
    introText:
      "Create a campaign-ready pantheon with alliances, cosmic conflicts, and detailed member deities. Works without login, then imports into your local vault.",
    canonicalPath: "/generators/pantheon-generator",
  },
  "god-generator": {
    pageTitle:
      "RPG God & Deity Generator | Free Tabletop Worldbuilding Tool | Codex Cryptica",
    metaDescription:
      "Generate fantasy RPG deities, saints, spirits, and demons with domains, taboos, symbols, and hooks. Save drafts directly to your campaign vault.",
    introTitle: "RPG God & Deity Generator",
    eyebrow: "Deity Generator",
    introText:
      "Design detailed single deities, ancestors, or abstract forces with portfolio, rituals, and myths. Works without login, then imports into your local vault.",
    canonicalPath: "/generators/god-generator",
  },
  "ship-generator": {
    pageTitle:
      "RPG Ship Generator | Starships, Galleons & Vessels for Any Genre | Codex Cryptica",
    metaDescription:
      "Generate campaign-ready ships for any RPG genre — sci-fi starships, fantasy galleons, pirate sloops, steampunk airships, and more. Each vessel has a crew, a complication, and a secret. No login required.",
    introTitle: "RPG Ship Generator",
    eyebrow: "Ship Generator",
    introText:
      "Create a campaign-ready vessel for any RPG genre. Sci-fi starships, fantasy galleons, pirate sloops, steampunk airships — pick the role, scale, and condition and get a ship with a crew, a mission, a problem, and a secret.",
    canonicalPath: "/generators/ship-generator",
    faqs: [
      {
        question: "What does the ship generator create?",
        answer:
          "It generates a complete RPG ship — name, role, scale, condition, owner, current mission, crew type, dominant complication, hidden secret, key zones, and three adventure hooks. The result is immediately usable as a location, a quest seed, or a faction asset.",
      },
      {
        question: "Does it work without an account?",
        answer:
          "Yes. Generate and copy ship notes on this page without logging in. Save the draft directly into a browser-local Codex Cryptica vault — no sign-up required.",
      },
      {
        question: "What genres does the ship generator support?",
        answer:
          "Sci-Fi, Space Opera, Cyberpunk, Optimistic Exploration Sci-Fi, Space Opera Resistance, Lancer, Post-Apocalyptic, Fantasy, Pirate / Age of Sail, Steampunk, Dark Fantasy, and Western (River & Rail). Each genre has its own roles, names, crew types, and complications.",
      },
      {
        question: "Can I use it for D&D or fantasy RPGs?",
        answer:
          "Yes — select Fantasy for merchant galleons, war galleys, and arcane transports, or Pirate / Age of Sail for frigates, sloops, and buccaneers. The output is system-neutral and saves into any Codex vault as a location entity.",
      },
    ],
    relatedLinks: [
      { href: "/generators/faction", label: "Faction Generator" },
      { href: "/generators/settlement", label: "Settlement Generator" },
      { href: "/generators/npc", label: "NPC Generator" },
    ],
  },
  "language-generator": {
    pageTitle:
      "RPG Fictional Language Generator | Worldbuilding Conlang Tool | Codex Cryptica",
    metaDescription:
      "Generate custom fictional language profiles for your tabletop worldbuilding campaign — pronunciations, naming rules, example names, and a vocabulary glossary. No login required.",
    introTitle: "RPG Fictional Language Generator",
    eyebrow: "Language Generator",
    introText:
      "Create a campaign-ready language profile for your world, culture, or species. Fantasy, sci-fi, cosmic horror, and more. Design naming conventions, syllables, and a starter dictionary.",
    canonicalPath: "/generators/language-generator",
    faqs: [
      {
        question: "What does the fictional language generator create?",
        answer:
          "It generates a complete fictional language profile — including pronunciation guidelines, naming structures, example names, and a starter vocabulary glossary. Perfect for building consistent naming conventions for your world's peoples and places.",
      },
      {
        question: "Does it work without an account?",
        answer:
          "Yes. Generate and copy language notes on this page without logging in. Save the draft directly into a browser-local Codex Cryptica vault — no sign-up required.",
      },
    ],
    relatedLinks: [
      { href: "/generators/names", label: "RPG Name Generator" },
      { href: "/generators/npc", label: "NPC Generator" },
      { href: "/generators/settlement", label: "Settlement Generator" },
    ],
  },
};
