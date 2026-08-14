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
  | "language-generator"
  | "news-sheet-generator"
  | "dungeon-generator"
  | "adventure-generator"
  | "adventure-idea-generator"
  | "plot-twist-generator"
  | "world"
  | "council-vote"
  | "secret-society"
  | "star-system"
  | "alien-race";

export type SlugMetaEntry = {
  pageTitle: string;
  metaDescription: string;
  introTitle: string;
  eyebrow: string;
  introText: string;
  canonicalPath: string;
  /**
   * Link-preview image for this generator, as a plain (untransformed) R2 URL —
   * social crawlers do not negotiate formats, so they must not go through
   * `cdn-cgi/image`. Falls back to the shared product screenshot when unset.
   * Capture new ones with `scripts/og-images/capture-generator-og.mjs`.
   */
  ogImage?: string;
  ogImageAlt?: string;
  faqs?: {
    question: string;
    answer: string;
    image?: string;
    imageAlt?: string;
    inlineImage?: string;
    inlineImageAlt?: string;
    exclusiveLabel?: string;
    inlineImageCaption?: string;
  }[];
  relatedLinks?: { href: string; label: string }[];
};

const ADVENTURE_CANVAS_FAQ: NonNullable<SlugMetaEntry["faqs"]>[number] = {
  question: "Can I turn this into an interactive adventure canvas?",
  answer:
    "Yes — select Open Adventure Canvas on any generated scenario to create an interactive relationship map of its situation, locations, NPCs and factions, threats, clues, and possible outcomes. You can rearrange the nodes, edit their connections, and create linked vault entities as the adventure develops. The Adventure Canvas is exclusive to Codex Cryptica, but it is still free and needs no account — just open your world in the app.",
  image: "/images/adventure-canvas.png",
  imageAlt:
    "An interactive Adventure Canvas showing a non-linear scenario with situations, locations, factions, threats, clues, and outcomes connected by labeled relationships",
  inlineImage: "/images/adventure-canvas-button.png",
  inlineImageAlt:
    "The Open Adventure Canvas button, next to Save to Codex and Copy, on a generated adventure result",
  exclusiveLabel:
    "Codex Cryptica exclusive — build full Adventure Canvases inside the app",
  inlineImageCaption:
    "The Open Adventure Canvas button on any generated result",
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
  world: {
    pageTitle:
      "Sci-Fi World Generator | RPG Planet & Moon Creator | Codex Cryptica",
    metaDescription:
      "Generate campaign-ready sci-fi planets, moons, and artificial worlds with environments, societies, conflicts, notable locations, and adventure hooks.",
    introTitle: "Sci-Fi World Generator",
    eyebrow: "Sci-Fi World Generator",
    introText:
      "Create a detailed sci-fi world for your campaign. Choose its environment, habitability, civilisation, and defining feature, then generate a place with conflicts, locations, and playable hooks.",
    canonicalPath: "/generators/world",
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
      "Create a campaign-ready language profile for your world, culture, or species. Choose fantasy, cyberpunk, gothic noir, space opera, modern conspiracy, post-apocalyptic, or pirate foundations, then customize the result.",
    canonicalPath: "/generators/language-generator",
    faqs: [
      {
        question: "What does the fictional language generator create?",
        answer:
          "It generates a fictional language profile with pronunciation guidance, naming structures, example names, phrases, and a starter glossary. AI generation adds richer cultural and linguistic detail; the offline fallback produces a smaller coherent profile from built-in tables.",
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
  "news-sheet-generator": {
    pageTitle:
      "News Sheet Generator | In-World RPG News & Cyberpunk Screamsheets | Codex Cryptica",
    metaDescription:
      "Generate an in-world news sheet for any RPG genre — cyberpunk screamsheets, fantasy broadsheets, station newsfeeds, wasteland bulletins. Headlines, rumours, classifieds, adverts, and GM-only adventure hooks. No login required.",
    introTitle: "News Sheet Generator",
    eyebrow: "News Sheet Generator",
    introText:
      "Create an in-world news sheet as a printable player handout — a lead headline, short articles, street rumours, classifieds, and propaganda, shaped by who owns the press. Cyberpunk players know it as a screamsheet; it works just as well as a fantasy broadsheet or a station newsfeed. The GM version holds the truth behind the stories and the adventure hooks.",
    canonicalPath: "/generators/news-sheet-generator",
    faqs: [
      {
        question: "What does the news sheet generator create?",
        answer:
          "It generates a complete in-world publication issue — masthead and tagline, a lead headline story, 2-4 secondary articles, rumours, classified ads, public notices, and an advert or piece of propaganda — plus a GM-only section with the truth behind the stories and adventure hooks.",
      },
      {
        question: "Is it only for cyberpunk games?",
        answer:
          "No. The screamsheet format is inspired by cyberpunk street news, but the generator works for any genre: fantasy town-crier broadsheets, station newsfeeds, wasteland bunker bulletins, frontier telegraphs, occult tabloids, and more.",
      },
      {
        question: "Can I hand the output to my players?",
        answer:
          "Yes. The handout body is player-safe by design — GM-only material (the truth behind the stories and the adventure hooks) is kept in a separate GM section, so you can copy the handout without leaking secrets.",
      },
      {
        question: "Does it work without an account?",
        answer:
          "Yes. Generate and copy news sheets on this page without logging in. Save the draft directly into a browser-local Codex Cryptica vault — no sign-up required.",
      },
    ],
    relatedLinks: [
      { href: "/generators/quest", label: "Quest Hook Generator" },
      { href: "/generators/settlement", label: "Settlement Generator" },
      { href: "/generators/faction", label: "Faction Generator" },
    ],
  },
  "dungeon-generator": {
    pageTitle:
      "Dungeon & Delve Generator | Multi-Genre RPG Delve Generator | Codex Cryptica",
    metaDescription:
      "Generate multi-layered dungeons, ancient ruins, subterranean vaults, alien complexes, or cybernetic facilities for any RPG genre. Signature features, current conflicts, sectors, inhabitants, traps, boss mysteries, and loot.",
    introTitle: "Dungeon / Delve Idea Generator",
    eyebrow: "Dungeon Generator",
    introText:
      "Create rich, multi-layered dungeons, ancient ruins, abandoned facilities, or subterranean vaults for any RPG genre or world theme. Generates evocative premises, original histories, current operational states, signature landmarks, active conflicts, sectors, factions, hazards, secrets, treasures, and adventure hooks. Every generated delve can also become a fully explorable, room-by-room map — the interactive Dungeon Canvas is exclusive to Codex Cryptica, free to open once you're in the app.",
    canonicalPath: "/generators/dungeon-generator",
    faqs: [
      {
        question: "What does the dungeon generator create?",
        answer:
          "It creates complete, multi-layered dungeon & delve concepts including history, current state, signature landmark, active conflict, 3–5 distinct sectors, resident factions, environmental hazards, secrets, loot, and adventure hooks.",
      },
      {
        question: "Is it only for fantasy games?",
        answer:
          "No. The generator dynamically adapts to any world theme — fantasy delves, subterranean sci-fi research facilities, cyberpunk megastructure sectors, post-apocalyptic vaults, gothic cathedrals, post-human Lancer sites, or steampipe labyrinths.",
      },
      {
        question: "Does it work without an account?",
        answer:
          "Yes. Generate and copy dungeons on this page without logging in. Save drafts directly into a browser-local Codex Cryptica vault — no sign-up required.",
      },
      {
        question: "Can I turn this into an explorable map, not just text?",
        answer:
          "Yes — hit Build Delve Canvas on any generated dungeon to open an interactive, room-by-room map with connected areas, loops, and hidden routes you can rearrange and edit, plus a full GM Dossier with atmosphere, connections, and secrets written out room by room. The dungeon itself is saved as a Location entity in your vault, so it's linked up with the rest of your world from the start. Both are exclusive to Codex Cryptica: they're not part of the plain text generator, but they're still free and need no account — just open your world in the app.",
        image: "/images/dungeon-canvas.png",
        imageAlt:
          "The interactive Dungeon Canvas showing a two-sector delve map with entrance, hazard, secret, and faction nodes connected by labeled passages",
        inlineImage: "/images/dungeon-canvas-button.png",
        inlineImageAlt:
          "The Build Delve Canvas button, next to Save to Codex and Copy, on a generated dungeon result",
        exclusiveLabel:
          "Codex Cryptica exclusive — generate full Delve Canvases and Dossiers inside the app",
        inlineImageCaption:
          "The Build Delve Canvas button on any generated result",
      },
    ],
    relatedLinks: [
      { href: "/generators/settlement", label: "Settlement Generator" },
      { href: "/generators/faction", label: "Faction Generator" },
      { href: "/generators/quest", label: "Quest Hook Generator" },
    ],
  },
  "adventure-generator": {
    pageTitle:
      "Adventure Idea Generator | Multi-Genre RPG Scenario Generator | Codex Cryptica",
    metaDescription:
      "Generate campaign-ready adventure concepts for any RPG genre — initial situations, primary objectives, key locations, threats, clues, complications, and possible outcomes.",
    introTitle: "Adventure Idea Generator",
    eyebrow: "Adventure Generator",
    introText:
      "Create rich, multi-layered adventure scenarios across any RPG genre or world theme. Generates initial situations, primary pressures, key locations, key actors, threats, discoveries, complications, stakes, and non-linear possible outcomes — a situation, not a plot.",
    canonicalPath: "/generators/adventure-generator",
    faqs: [
      {
        question: "What does the adventure generator create?",
        answer:
          "It creates complete, campaign-ready adventure situations including initial situation, primary objective & pressure, key locations, important NPCs & factions, threats, discoveries, complications, rewards, and multiple possible outcomes.",
      },
      {
        question: "Does it force a linear plot?",
        answer:
          "No. The generator produces a dynamic situation with multiple non-linear resolutions and key actors, giving players full agency rather than railroading them through a fixed sequence of events.",
      },
      {
        question: "Is it only for fantasy games?",
        answer:
          "No. The generator dynamically adapts to all Codex Cryptica world themes — fantasy, sci-fi, cyberpunk, dark fantasy, gothic horror, post-apocalyptic, pirate, western, steampunk, modern conspiracy, and Lancer.",
      },
      {
        question: "Does it work without an account?",
        answer:
          "Yes. Generate and copy adventure ideas on this page without logging in. Save drafts directly into a browser-local Codex Cryptica vault — no sign-up required.",
      },
      ADVENTURE_CANVAS_FAQ,
    ],
    relatedLinks: [
      {
        href: "/generators/dungeon-generator",
        label: "Dungeon & Delve Generator",
      },
      { href: "/generators/faction", label: "Faction Generator" },
      { href: "/generators/quest", label: "Quest Hook Generator" },
    ],
  },
  "plot-twist-generator": {
    pageTitle: "Plot Twist & Complication Generator | Codex Cryptica",
    metaDescription:
      "Generate coherent RPG plot twists that preserve established facts, add fair foreshadowing, and create meaningful player choices.",
    introTitle: "Plot Twist & Complication Generator",
    eyebrow: "Plot Twist Generator",
    introText:
      "Turn an established situation into a fair, playable reversal or complication. Keep the facts that matter, overturn an assumption, and give the players new choices.",
    canonicalPath: "/generators/plot-twist-generator",
  },
  "adventure-idea-generator": {
    pageTitle:
      "Adventure Idea Generator | Multi-Genre RPG Scenario Generator | Codex Cryptica",
    metaDescription:
      "Generate campaign-ready adventure concepts for any RPG genre — initial situations, primary objectives, key locations, threats, clues, complications, and possible outcomes.",
    introTitle: "Adventure Idea Generator",
    eyebrow: "Adventure Generator",
    introText:
      "Create rich, multi-layered adventure scenarios across any RPG genre or world theme. Generates initial situations, primary pressures, key locations, key actors, threats, discoveries, complications, stakes, and non-linear possible outcomes — a situation, not a plot.",
    canonicalPath: "/generators/adventure-generator",
    faqs: [
      {
        question: "What does the adventure generator create?",
        answer:
          "It creates complete, campaign-ready adventure situations including initial situation, primary objective & pressure, key locations, important NPCs & factions, threats, discoveries, complications, rewards, and multiple possible outcomes.",
      },
      ADVENTURE_CANVAS_FAQ,
    ],
    relatedLinks: [
      {
        href: "/generators/dungeon-generator",
        label: "Dungeon & Delve Generator",
      },
      { href: "/generators/faction", label: "Faction Generator" },
      { href: "/generators/quest", label: "Quest Hook Generator" },
    ],
  },
  "council-vote": {
    pageTitle:
      "Council Vote Generator | RPG Political Quest Creator | Codex Cryptica",
    metaDescription:
      "Generate a political vote quest: a named council of voters with distinct agendas that the party must sway before a deadline decision. Works for any RPG genre.",
    introTitle: "Council Vote Generator",
    eyebrow: "Political Quest Generator",
    introText:
      "Create a campaign-ready political vote — a council of named voters with different motives, alliances, secrets, and demands, plus a deadline and a voting threshold. Works without login, then imports into your local vault.",
    canonicalPath: "/generators/council-vote",
    faqs: [
      {
        question: "What does the council vote generator create?",
        answer:
          "It creates a complete political vote quest: the proposal being voted on, the deadline and voting procedure, and a named council where every voter has a public position, a true agenda, an initial stance, relationships to other voters, what would persuade them, and a secret or piece of leverage.",
      },
      {
        question:
          "Does the party always have a guaranteed way to win the vote?",
        answer:
          "No — by design, the generator never hands the party a single guaranteed majority. It aims for at least two viable voting coalitions, so players have to build a path from persuasion, evidence, leverage, and favours rather than following one prescribed solution.",
      },
      {
        question: "Can I use it for genres other than fantasy?",
        answer:
          "Yes. Town councils, noble courts, senates, clan moots, war councils, corporate boards, revolutionary committees, interstellar assemblies, criminal syndicates, and religious conclaves are all supported governing-body types.",
      },
    ],
    relatedLinks: [
      { href: "/generators/quest", label: "Quest Hook Generator" },
      { href: "/generators/faction", label: "Faction Generator" },
      { href: "/generators/kingdom", label: "Kingdom Generator" },
    ],
  },
  "secret-society": {
    pageTitle:
      "Secret Society Generator | Cult & Conspiracy Creator | Codex Cryptica",
    metaDescription:
      "Create campaign-ready cults, secret societies, sects, and conspiracies with beliefs, rituals, public faces, hidden truths, and adventure hooks.",
    introTitle: "Secret Society Generator",
    eyebrow: "Cult, Sect & Conspiracy Generator",
    introText:
      "Build a reusable society with a belief, ritual, public cover, secret truth, and immediate hooks for your campaign.",
    canonicalPath: "/generators/secret-society",
    faqs: [
      {
        question: "What does the secret society generator create?",
        answer:
          "It creates a campaign-ready cult, sect, conspiracy, or hidden order with a doctrine, revered thing, rituals, recruitment method, public cover, leadership structure, secret truth, signs, conflict, and adventure hooks.",
      },
      {
        question: "Can I use it outside fantasy?",
        answer:
          "Yes. It supports fantasy cults, corporate conspiracies, academic circles, criminal orders, cosmic-horror sects, and other genre-neutral hidden organisations.",
      },
      {
        question: "Can I save the result into my campaign?",
        answer:
          "Yes. Generate and copy a result without logging in, or save it as a Faction draft in your browser-local Codex Cryptica vault and link it to its people, places, rumours, and rivals.",
      },
    ],
    relatedLinks: [
      { href: "/generators/faction", label: "Faction Generator" },
      { href: "/generators/quest", label: "Quest Hook Generator" },
      { href: "/generators/god-generator", label: "God & Deity Generator" },
    ],
  },
  "star-system": {
    pageTitle:
      "Star System Generator | Sci-Fi RPG Solar System Creator | Codex Cryptica",
    metaDescription:
      "Generate campaign-ready sci-fi star systems — star(s), 3-12 major bodies, factions, resources, travel hazards, and a system-wide conflict or mystery with adventure hooks.",
    introTitle: "Star System Generator",
    eyebrow: "Star System Generator",
    introText:
      "Create a coherent sci-fi star system for your campaign — not just an astronomical inventory. Choose its system type, genre, civilisation level, character, and scientific realism, then generate a star (or stars), major bodies, factions, resources, hazards, and a system-wide conflict or mystery worth building a campaign around.",
    canonicalPath: "/generators/star-system",
    faqs: [
      {
        question: "What does the star system generator create?",
        answer:
          "It generates a complete sci-fi star system: the star or stars, 3-12 named major bodies (planets, moons, asteroid belts, stations, or anomalies), the factions competing for influence, the system's strategic resource, a named travel hazard, and a system-wide conflict or mystery with playable adventure hooks.",
      },
      {
        question: "Is this just a list of planets?",
        answer:
          "No. The generator is built to answer why anyone cares about the system, not just what orbits the star — every major body, faction, and hazard ties back to the system's central stakes.",
      },
      {
        question:
          "Can I turn a generated planet or moon into a full World Generator entry?",
        answer:
          "Yes — select Develop This World on any named body in the result to open the Sci-Fi World Generator with that body's context pre-filled, so the world you build fits the system it came from.",
      },
      {
        question: "Does it work without an account?",
        answer:
          "Yes. Generate and copy star systems on this page without logging in. Save the draft directly into a browser-local Codex Cryptica vault — no sign-up required.",
      },
    ],
    relatedLinks: [
      { href: "/generators/world", label: "Sci-Fi World Generator" },
      { href: "/generators/ship-generator", label: "Ship Generator" },
      { href: "/generators/faction", label: "Faction Generator" },
    ],
  },
  "alien-race": {
    pageTitle:
      "Alien Race Generator | Sci-Fi Alien Species Creator | Codex Cryptica",
    metaDescription:
      "Generate coherent alien species for sci-fi RPG campaigns — biology, homeworld, senses, culture, technology, weaknesses, naming conventions, and adventure hooks that all follow from each other.",
    introTitle: "Alien Race Generator",
    eyebrow: "Alien Species & Xenobiology Generator",
    introText:
      "Build an alien species that is genuinely non-human. Every biological and environmental trait changes something else — six limbs reach their tools and architecture, chemical speech changes what privacy means, a long life reshapes their politics.",
    canonicalPath: "/generators/alien-race",
    ogImage:
      "https://assets.codexcryptica.com/screenshots/generator-alien-race.jpg",
    ogImageAlt:
      "The Codex Cryptica alien race generator with an example species drafted: overview, evolutionary origin, homeworld, biology, weaknesses, naming conventions, and archetypes beside the input controls",
    faqs: [
      {
        question: "What does the alien race generator create?",
        answer:
          "A campaign-ready alien species with a physical description, evolutionary origin, homeworld, biology and lifecycle, senses and communication, culture, technology, beliefs, relations with outsiders, internal factions, weaknesses, naming conventions, typical archetypes, and adventure hooks.",
      },
      {
        question:
          "How is this different from just describing an unusual-looking humanoid?",
        answer:
          "The generator is built around consequence: every major biological or environmental trait has to change something else about the species. A six-limbed species gets tools, architecture and social concepts that assume six limbs; a species that communicates chemically gets a different idea of privacy, deception and law. A trait that shows up in the biology section and nowhere else is treated as a failure.",
      },
      {
        question: "What is the difference between Grounded and Freeform mode?",
        answer:
          "Grounded / Evolutionary keeps the species biologically plausible and clearly shaped by selection pressure from its environment. Freeform / Fantastic also allows exotic life — crystalline organisms, colonial swarm minds, plasma structures, and self-replicating machine lineages — while still requiring that strangeness to have consistent consequences.",
      },
      {
        question: "Can I build a species to fit a world I already have?",
        answer:
          "Yes. Describe the world, system, or powers in the campaign context field and the species is built to fit it, keeping any names you introduce. Inside a Codex Cryptica vault, the in-app generator also grounds the species in your existing entities.",
      },
      {
        question: "Does it work without an account?",
        answer:
          "Yes. Generate and copy alien species on this page without logging in. Save the draft directly into a browser-local Codex Cryptica vault — no sign-up required.",
      },
    ],
    relatedLinks: [
      { href: "/generators/star-system", label: "Star System Generator" },
      { href: "/generators/world", label: "Sci-Fi World Generator" },
      { href: "/generators/faction", label: "Faction Generator" },
    ],
  },
};
