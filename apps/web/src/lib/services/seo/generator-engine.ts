import { aiClientManager } from "$lib/services/ai/client-manager";

// Local Name Tables
export const nameTable = {
  prefixes: [
    "Ael",
    "Bran",
    "Cael",
    "Dax",
    "El",
    "Fael",
    "Grom",
    "Had",
    "Ior",
    "Jor",
    "Kael",
    "Lyr",
    "Morg",
    "Nal",
    "Odh",
    "Py",
    "Quel",
    "Rhu",
    "Sari",
    "Thor",
    "Uth",
    "Vael",
    "Wulf",
    "Xan",
    "Ysv",
    "Zeph",
  ],
  suffixes: [
    "dar",
    "gorn",
    "thor",
    "ius",
    "eth",
    "wen",
    "dolf",
    "ric",
    "mar",
    "mon",
    "las",
    "vian",
    "dor",
    "morn",
    "ra",
    "thas",
    "val",
    "gar",
    "rin",
    "kis",
    "on",
    "ar",
    "en",
    "is",
    "a",
    "os",
  ],
  descriptors: [
    "The Brave",
    "The Silent",
    "The Swift",
    "The Bold",
    "The Seer",
    "The Wise",
    "The Shadow",
    "The Iron",
    "The Wild",
    "The Grim",
    "The Lost",
    "The Seeker",
    "The Wanderer",
    "The Exile",
    "The Fierce",
    "The Chronicler",
  ],
};

// Fantasy Name Generator Config
export const nameGeneratorConfig = {
  cultures: [
    "Generic Fantasy",
    "High Elf",
    "Dark Elf",
    "Dwarven",
    "Halfling",
    "Orcish",
    "Norse / Viking",
    "Roman / Latin",
    "Celtic / Gaelic",
    "Eastern / Asian-inspired",
  ],
  genders: ["Any", "Masculine", "Feminine", "Neutral / Ambiguous"],
  nameTypes: ["Person", "Place", "Faction", "Item"],
  counts: ["3", "5", "10"],
  // Culture-specific local fallback tables
  culturePrefixes: {
    "Generic Fantasy": [
      "Ael",
      "Bran",
      "Cael",
      "Dax",
      "El",
      "Fael",
      "Kael",
      "Lyr",
      "Morg",
      "Nal",
      "Thor",
      "Vael",
    ],
    "High Elf": [
      "Aer",
      "Caer",
      "El",
      "Gal",
      "Ith",
      "Lae",
      "Mir",
      "Sil",
      "Thal",
      "Var",
      "Wyn",
      "Zin",
    ],
    "Dark Elf": [
      "Driz",
      "Mal",
      "Nath",
      "Riz",
      "Sol",
      "Szor",
      "Ul",
      "Vir",
      "Xan",
      "Zaer",
      "Zin",
      "Vy",
    ],
    Dwarven: [
      "Bal",
      "Dur",
      "Glor",
      "Grim",
      "Kat",
      "Kaz",
      "Mag",
      "Nar",
      "Thor",
      "Tor",
      "Ulf",
      "Vor",
    ],
    Halfling: [
      "Bil",
      "Cor",
      "Del",
      "Fil",
      "Gob",
      "Mer",
      "Pip",
      "Rose",
      "Sam",
      "Tom",
      "Wil",
      "Bun",
    ],
    Orcish: [
      "Druk",
      "Grak",
      "Grom",
      "Krag",
      "Mog",
      "Nar",
      "Rok",
      "Skul",
      "Thok",
      "Urg",
      "Vrak",
      "Zug",
    ],
    "Norse / Viking": [
      "Arn",
      "Bjor",
      "Dag",
      "Eil",
      "Gunn",
      "Hal",
      "Ing",
      "Leif",
      "Rag",
      "Sigr",
      "Thor",
      "Ulf",
    ],
    "Roman / Latin": [
      "Aem",
      "Aur",
      "Bru",
      "Cal",
      "Cas",
      "Cor",
      "Flav",
      "Jul",
      "Marc",
      "Octa",
      "Sext",
      "Val",
    ],
    "Celtic / Gaelic": [
      "Aed",
      "Bran",
      "Caill",
      "Conn",
      "Donn",
      "Eoch",
      "Fearg",
      "Niall",
      "Ruad",
      "Taig",
      "Uar",
      "Cunn",
    ],
    "Eastern / Asian-inspired": [
      "Akira",
      "Chen",
      "Hiro",
      "Jin",
      "Kai",
      "Li",
      "Ren",
      "Ryu",
      "Shen",
      "Tao",
      "Wei",
      "Zhen",
    ],
  } as Record<string, string[]>,
  cultureSuffixes: {
    "Generic Fantasy": [
      "dar",
      "eth",
      "gorn",
      "ius",
      "mar",
      "morn",
      "ra",
      "ric",
      "thas",
      "val",
      "wen",
      "thor",
    ],
    "High Elf": [
      "ael",
      "aith",
      "ara",
      "ath",
      "elan",
      "iath",
      "ien",
      "ira",
      "is",
      "ith",
      "on",
      "rial",
    ],
    "Dark Elf": [
      "ace",
      "arn",
      "bra",
      "dra",
      "fein",
      "ica",
      "inae",
      "ra",
      "rix",
      "ssa",
      "tra",
      "vra",
    ],
    Dwarven: [
      "ak",
      "ald",
      "ar",
      "ek",
      "im",
      "in",
      "kin",
      "nar",
      "rek",
      "rim",
      "rin",
      "uk",
    ],
    Halfling: [
      "ble",
      "boro",
      "buck",
      "fast",
      "foot",
      "fur",
      "good",
      "hill",
      "penny",
      "seed",
      "wise",
      "wool",
    ],
    Orcish: [
      "ash",
      "dar",
      "gash",
      "grak",
      "gruk",
      "kul",
      "lash",
      "mok",
      "rak",
      "skrag",
      "thak",
      "ugh",
    ],
    "Norse / Viking": [
      "ald",
      "bjorn",
      "dís",
      "eit",
      "gar",
      "helm",
      "nar",
      "rún",
      "stein",
      "ulf",
      "vald",
      "var",
    ],
    "Roman / Latin": [
      "anus",
      "ella",
      "ia",
      "ianus",
      "illa",
      "ina",
      "inus",
      "io",
      "ius",
      "lia",
      "ona",
      "us",
    ],
    "Celtic / Gaelic": [
      "ach",
      "all",
      "an",
      "ard",
      "as",
      "dha",
      "ech",
      "en",
      "inn",
      "on",
      "ua",
      "ugh",
    ],
    "Eastern / Asian-inspired": [
      "bo",
      "fa",
      "ji",
      "ko",
      "lan",
      "lei",
      "li",
      "mei",
      "na",
      "ro",
      "shi",
      "xia",
    ],
  } as Record<string, string[]>,
};

// NPC Generator Table Config
export const npcConfig = {
  races: [
    "Human",
    "Elf",
    "Dwarf",
    "Halfling",
    "Orc",
    "Gnome",
    "Tiefling",
    "Dragonborn",
  ],
  roles: [
    "Mage",
    "Warrior",
    "Rogue",
    "Priest",
    "Merchant",
    "Scholar",
    "Blacksmith",
    "Guard",
    "Noble",
    "Innkeeper",
  ],
  alignments: [
    "Lawful Good",
    "Neutral Good",
    "Chaotic Good",
    "Lawful Neutral",
    "True Neutral",
    "Chaotic Neutral",
    "Lawful Evil",
    "Neutral Evil",
    "Chaotic Evil",
  ],
  traits: [
    "Always whispers when speaking to build dramatic tension.",
    "Carries a pocket watch that runs backward but claims it is correct.",
    "Extremely superstitious about black cats and wooden doors.",
    "Has a collection of rare, dried flowers in their cloak pockets.",
    "Never looks anyone directly in the eye, shifting their gaze constantly.",
    "Speaks in rhyming riddles when they become nervous or excited.",
    "Has a nervous twitch in their left hand when speaking about magic.",
    "Obsessed with cleanliness, frequently wiping down their gear.",
  ],
  secrets: [
    "Is a secret spy for a rival merchant guild operating in the shadows.",
    "Possesses a cursed map that shows their exact death location, which is nearby.",
    "Accidentally poisoned their previous master and fled the crime scene.",
    "Is actually a shapechanger in hiding from an ancient wizard.",
    "Stole a sacred relic from the local temple and keeps it in their boot.",
    "Is deeply in debt to a dangerous local crime lord who wants them dead.",
    "Knows the secret passcode to the royal vault under the capital.",
  ],
  motives: [
    "To clear their family's disgraced name and reclaim their ancestral land.",
    "To fund a search for a lost sibling who vanished in the Underdark.",
    "To acquire enough wealth to buy their freedom from a contract.",
    "To find a cure for a mysterious family affliction affecting their bloodline.",
    "To exact revenge on the corrupt noble who exiled them.",
    "To locate a legendary magical spellbook hidden in a nearby ruin.",
  ],
  factions: [
    "The Ashen Ledger, a quiet network of debt collectors and informants.",
    "The Lantern Court, a civic order that keeps public peace after sunset.",
    "The Red Sash Company, sellswords with a habit of choosing winning sides.",
    "The Argent Loom, an artisan guild that hides coded messages in its work.",
    "The Chapel of Last Mercy, a temple faction that knows too many confessions.",
    "The Blackwater Compact, smugglers moving relics beneath legitimate trade.",
  ],
  plotHooks: [
    "They ask the party to recover a sealed letter before it reaches a rival.",
    "They recognize one character from a prophecy but refuse to explain in public.",
    "They can open a locked district gate if the party solves their immediate problem.",
    "They are being followed by someone who disappears whenever challenged.",
    "They offer a reward for escort, then reveal the destination is forbidden ground.",
    "They own a clue that reframes a recent villain as someone else's pawn.",
  ],
};

// Settlement Generator Table Config
export const settlementConfig = {
  sizes: [
    { name: "Hamlet", range: "50-100 inhabitants", pointsOfInterestCount: 1 },
    { name: "Village", range: "100-500 inhabitants", pointsOfInterestCount: 2 },
    { name: "Town", range: "500-5000 inhabitants", pointsOfInterestCount: 3 },
    { name: "City", range: "5000-20000 inhabitants", pointsOfInterestCount: 4 },
  ],
  economies: [
    "Agriculture",
    "Mining",
    "Trade Hub",
    "Fishing",
    "Black Market",
    "Arcane Study",
  ],
  governments: [
    "Council of Elders",
    "Feudal Lord",
    "Merchant Oligarchy",
    "Military Dictatorship",
    "Democracy",
    "Magocracy",
  ],
  notableLocations: [
    "The Rusty Anchor Tavern",
    "Temple of the Sun",
    "Grand Archive",
    "Whispering Woods Gate",
    "Vault of Secrets",
    "Alchemist's Greenhouse",
    "Market Bazaar",
    "Ruined Watchtower",
  ],
  factions: [
    "The Iron Shield Guard",
    "The Shadow Thieves Guild",
    "The Whispering Monks",
    "The Gilded Merchants",
    "The Arcane Assembly",
  ],
};

// Magic Item Table Config
export const magicItemConfig = {
  types: [
    "Weapon",
    "Armor",
    "Wand",
    "Ring",
    "Amulet",
    "Potion",
    "Scroll",
    "Wondrous Item",
  ],
  rarities: ["Common", "Uncommon", "Rare", "Very Rare", "Legendary"],
  properties: [
    "Glows faintly in the presence of undead, flashing red when danger is close.",
    "Whispers ancient prophecies to the wearer in their sleep, which are usually vague.",
    "Allows the user to speak with small forest animals, but they only talk about food.",
    "Increases the user's running speed, but leaves a trail of harmless sparks.",
    "Can store a single memory to be retrieved later by touching the surface.",
    "Grants resistance to cold, but the wearer always feels slightly chilly inside.",
  ],
  histories: [
    "Forged in the heart of a dying star by ancient dwarven smiths of old.",
    "Recovered from the hoard of a red dragon that ravaged the northern kingdoms.",
    "Worn by a legendary paladin who fell during the Siege of Shadowkeep.",
    "Discovered inside a hollow tree trunk deep within the Feywild.",
    "Created by a mad wizard who vanished into their own pocket dimension.",
  ],
};

// Faction Generator Table Config
export const factionConfig = {
  types: [
    "Merchant Guild",
    "Secret Society",
    "Mercenary Company",
    "Temple Order",
    "Criminal Syndicate",
    "Rebel Cell",
    "Arcane Circle",
  ],
  scopes: [
    "Local district",
    "Single city",
    "Border region",
    "Trade route",
    "Hidden stronghold",
    "Kingdom-wide network",
  ],
  alignments: [
    "Publicly lawful, privately ruthless",
    "Idealistic but compromised",
    "Pragmatic and profit-driven",
    "Fanatical and secretive",
    "Protective of common folk",
    "Opportunistic and divided",
  ],
  goals: [
    "Control a contested trade route before a rival power does.",
    "Recover a forbidden relic buried beneath a civic landmark.",
    "Replace corrupt officials with loyal agents.",
    "Protect a hidden sanctuary from outside discovery.",
    "Break an old treaty that limits their expansion.",
    "Expose a rival faction's crimes without revealing their own.",
  ],
  conflicts: [
    "A splinter leader is selling secrets to an enemy.",
    "Their public mission conflicts with the methods they use at night.",
    "A recent victory created debts they cannot repay.",
    "Their patron has vanished, leaving rival lieutenants in charge.",
    "A hostage, ledger, or relic could unravel their legitimacy.",
    "Their members disagree over whether the party is useful or dangerous.",
  ],
  hooks: [
    "They hire the party for a simple delivery that is actually a loyalty test.",
    "They ask for protection during a meeting with a bitter rival.",
    "They offer information about a villain in exchange for public help.",
    "They frame the party to force them into negotiation.",
    "They need outsiders to enter a place their members are forbidden to visit.",
    "They ask the party to choose between two bad successors.",
  ],
};

export const questConfig = {
  genres: [
    "Classic Fantasy",
    "Dark Fantasy",
    "Political Intrigue",
    "Horror",
    "Comedy",
  ],
  tones: ["Heroic", "Gritty", "Mysterious", "Comedic", "Tragic"],
  scopes: [
    "Local (village / district)",
    "Regional (kingdom / region)",
    "World-threatening",
  ],
  locationTypes: [
    "Ancient Dungeon",
    "Urban City",
    "Wilderness",
    "Cursed Ruin",
    "Coastal / Maritime",
    "Planar Realm",
  ],
  threats: [
    "Monstrous Creature",
    "Corrupt Villain",
    "Rival Faction",
    "Ancient Curse",
    "Natural Disaster",
    "Betrayal from Within",
  ],
  hooks: [
    "A local official offers a reward to find a missing heir before a rival claims the title.",
    "Strange lights above the old tower have kept the village awake for three nights.",
    "A caravan was found empty on the road — no blood, no tracks, just silence.",
    "An imprisoned criminal offers the location of a cache in exchange for a pardon.",
    "A temple guardian collapses mid-ceremony, whispering a single forbidden name.",
    "A child wanders into town carrying an item that should not exist.",
  ],
  complications: [
    "The client is hiding their true motive — the real target is someone the party knows.",
    "The threat has already moved; the location the party was sent to is a decoy.",
    "A second party has been hired for the same job and has a head start.",
    "The threat is connected to a powerful patron who expects the party to look away.",
    "Completing the job requires breaking a law the party has respected until now.",
    "The reward will not be paid unless the job is done silently and officially denied.",
  ],
  twists: [
    "The villain is protecting something the party would not want destroyed.",
    "The real enemy was the client's ally from the beginning.",
    "The location holds a secret that changes the stakes of the entire campaign.",
    "The threat cannot be killed — it must be bargained with or contained.",
    "The party's past actions directly caused this situation.",
    "Two factions both claim to be the rightful owner of what the party was sent to recover.",
  ],
  rewards: [
    "Coin, plus a favor from a local power who owes the client.",
    "A deed to a small property in a useful location.",
    "Access to a restricted archive, vault, or contact list.",
    "A magic item of unknown provenance pulled from the site.",
    "Information the client values more than the party expected.",
    "Grudging respect from a faction that was previously hostile.",
  ],
};

export interface GeneratorOutput {
  type:
    | "character"
    | "creature"
    | "location"
    | "item"
    | "event"
    | "faction"
    | "note";
  title: string;
  content: string;
  lore: string;
  labels: string[];
  status: "active" | "draft";
}

export class DefaultGeneratorEngine {
  constructor(private clientManager = aiClientManager) {}

  /**
   * Generates a random name based on prefixes and suffixes.
   */
  generateName(): string {
    const prefix =
      nameTable.prefixes[Math.floor(Math.random() * nameTable.prefixes.length)];
    const suffix =
      nameTable.suffixes[Math.floor(Math.random() * nameTable.suffixes.length)];
    const useDescriptor = Math.random() > 0.6;
    let name = `${prefix}${suffix}`;
    if (useDescriptor) {
      const descriptor =
        nameTable.descriptors[
          Math.floor(Math.random() * nameTable.descriptors.length)
        ];
      name = `${name} ${descriptor}`;
    }
    return name;
  }

  /**
   * Generates an NPC draft.
   */
  async generateNPC(
    options: {
      race?: string;
      role?: string;
      alignment?: string;
      campaignContext?: string;
      useAI?: boolean;
    } = {},
  ): Promise<GeneratorOutput> {
    const race =
      options.race ||
      npcConfig.races[Math.floor(Math.random() * npcConfig.races.length)];
    const role =
      options.role ||
      npcConfig.roles[Math.floor(Math.random() * npcConfig.roles.length)];
    const alignment =
      options.alignment ||
      npcConfig.alignments[
        Math.floor(Math.random() * npcConfig.alignments.length)
      ];
    const campaignContext = options.campaignContext?.trim();
    const name = this.generateName();

    if (options.useAI !== false) {
      try {
        const prompt = `Generate a detailed RPG NPC in JSON format.
Options:
- Name: ${name}
- Race: ${race}
- Role: ${role}
- Alignment: ${alignment}
${campaignContext ? `- Campaign Context: ${campaignContext}` : ""}

You must return a valid JSON object matching the following structure exactly:
{
  "title": "A single string for the NPC's name",
  "content": "A detailed multi-paragraph biographical backstory (markdown formatted) describing who they are, their appearance, daily life, and how they fit the campaign context if provided.",
  "lore": "Structured GM details (markdown formatted) with sections for core fields, personality, secret, motivation, faction connection, and plot hook.",
  "labels": ["rpg-character", "npc-generator", "imported-draft"]
}
Return only the JSON object. Do not include markdown code block formatting like \`\`\`json.`;

        const model = await this.clientManager.getModel(
          "",
          "gemini-1.5-flash",
          "You are an assistant that generates detailed RPG campaign elements in JSON format.",
        );
        const response = await model.generateContent(prompt);
        const text = response.response.text().trim();
        // Remove code block wrappers if generated by LLM
        const cleanText = text
          .replace(/^```json\s*/i, "")
          .replace(/```$/, "")
          .trim();
        const data = JSON.parse(cleanText);

        return {
          type: "character",
          title: data.title || name,
          content: data.content || "",
          lore: data.lore || "",
          labels: Array.isArray(data.labels)
            ? data.labels
            : ["rpg-character", "npc-generator", "imported-draft"],
          status: "active",
        };
      } catch (err) {
        console.warn(
          "AI generation failed, falling back to local tables:",
          err,
        );
      }
    }

    // Local Deterministic/Random Fallback
    const traits = this.getRandomItems(npcConfig.traits, 2);
    const secret =
      npcConfig.secrets[Math.floor(Math.random() * npcConfig.secrets.length)];
    const motive =
      npcConfig.motives[Math.floor(Math.random() * npcConfig.motives.length)];
    const faction =
      npcConfig.factions[Math.floor(Math.random() * npcConfig.factions.length)];
    const plotHook =
      npcConfig.plotHooks[
        Math.floor(Math.random() * npcConfig.plotHooks.length)
      ];

    const content = `### Biography
${name} is a ${race} ${role} whose public reputation is useful, incomplete, and just suspicious enough to matter. Locals know them as someone who gets results, even when the work requires favors, secrets, or a carefully timed lie.

${campaignContext ? `### Campaign Fit\nUse ${name} in ${campaignContext}. Their current problem should pull the party toward the campaign's active locations, factions, or unresolved mysteries.\n` : ""}

### Appearance
They carry themselves with a posture reflecting their profession. Their clothes are well-worn, showing the signs of travel and work, but kept with a level of respect.

### Personality
- ${traits[0]}
- ${traits[1]}

### Table Use
Introduce ${name} when the party needs a social lead, a compromised witness, or a morally complicated ally. They should be helpful immediately, but never free of consequences.`;

    const lore = `### GM Reference Information
- **Name**: ${name}
- **Species/Ancestry**: ${race}
- **Role**: ${role}
- **Alignment**: ${alignment}
- **Entity Type**: Character

### Personality
- ${traits[0]}
- ${traits[1]}

### Hidden Secret
${secret}

### Motivation
${motive}

### Faction Connection
${faction}

### Plot Hook
${plotHook}`;

    return {
      type: "character",
      title: name,
      content,
      lore,
      labels: ["rpg-character", "npc-generator", "imported-draft"],
      status: "active",
    };
  }

  /**
   * Generates a faction draft.
   */
  async generateFaction(
    options: {
      type?: string;
      scope?: string;
      alignment?: string;
      campaignContext?: string;
      useAI?: boolean;
    } = {},
  ): Promise<GeneratorOutput> {
    const factionType =
      options.type ||
      factionConfig.types[
        Math.floor(Math.random() * factionConfig.types.length)
      ];
    const scope =
      options.scope ||
      factionConfig.scopes[
        Math.floor(Math.random() * factionConfig.scopes.length)
      ];
    const alignment =
      options.alignment ||
      factionConfig.alignments[
        Math.floor(Math.random() * factionConfig.alignments.length)
      ];
    const campaignContext = options.campaignContext?.trim();
    const name = `${this.generateName()} Compact`;

    if (options.useAI !== false) {
      try {
        const prompt = `Generate a detailed RPG faction in JSON format.
Options:
- Name: ${name}
- Faction Type: ${factionType}
- Scope: ${scope}
- Moral Posture: ${alignment}
${campaignContext ? `- Campaign Context: ${campaignContext}` : ""}

You must return a valid JSON object matching the following structure exactly:
{
  "title": "A single string for the faction name",
  "content": "A detailed multi-paragraph faction overview (markdown formatted) describing its public face, leadership, resources, and how it fits the campaign context if provided.",
  "lore": "Structured GM details (markdown formatted) with sections for core fields, agenda, internal conflict, notable NPCs, rival faction, and adventure hook.",
  "labels": ["rpg-faction", "faction-generator", "imported-draft"]
}
Return only the JSON object. Do not include markdown code block formatting like \`\`\`json.`;

        const model = await this.clientManager.getModel(
          "",
          "gemini-1.5-flash",
          "You are an assistant that generates detailed RPG campaign elements in JSON format.",
        );
        const response = await model.generateContent(prompt);
        const text = response.response.text().trim();
        const cleanText = text
          .replace(/^```json\s*/i, "")
          .replace(/```$/, "")
          .trim();
        const data = JSON.parse(cleanText);

        return {
          type: "faction",
          title: data.title || name,
          content: data.content || "",
          lore: data.lore || "",
          labels: Array.isArray(data.labels)
            ? data.labels
            : ["rpg-faction", "faction-generator", "imported-draft"],
          status: "active",
        };
      } catch (err) {
        console.warn(
          "AI generation failed, falling back to local tables:",
          err,
        );
      }
    }

    const goal =
      factionConfig.goals[
        Math.floor(Math.random() * factionConfig.goals.length)
      ];
    const conflict =
      factionConfig.conflicts[
        Math.floor(Math.random() * factionConfig.conflicts.length)
      ];
    const hook =
      factionConfig.hooks[
        Math.floor(Math.random() * factionConfig.hooks.length)
      ];
    const rival = `${this.generateName()} Covenant`;
    const leader = this.generateName();
    const agent = this.generateName();

    const content = `### Overview
${name} is a ${factionType.toLowerCase()} operating across the ${scope.toLowerCase()}. Its members present a controlled public face, but every favor, rumor, and private meeting is part of a larger strategy.

${campaignContext ? `### Campaign Fit\nUse ${name} in ${campaignContext}. Their agenda should touch active locations, disputed resources, or unresolved campaign mysteries.\n` : ""}

### Public Face
Most locals know the faction through useful services, charitable work, guarded trade, or carefully placed rumors. People disagree about whether ${name} is stabilizing the region or quietly taking ownership of it.

### Table Use
Bring ${name} into play when the party needs leverage, pressure, a sponsor, or a rival that can negotiate before it strikes.`;

    const lore = `### GM Reference Information
- **Faction Type**: ${factionType}
- **Scope**: ${scope}
- **Moral Posture**: ${alignment}
- **Entity Type**: Faction

### Agenda
${goal}

### Internal Conflict
${conflict}

### Notable NPCs
- **${leader}**: Public leader who insists every deal has a civic purpose.
- **${agent}**: Field agent who knows where the faction hides its failures.

### Rival Faction
${rival} wants the same influence, relic, route, or confession before ${name} can secure it.

### Adventure Hook
${hook}`;

    return {
      type: "faction",
      title: name,
      content,
      lore,
      labels: ["rpg-faction", "faction-generator", "imported-draft"],
      status: "active",
    };
  }

  /**
   * Generates a settlement draft.
   */
  async generateSettlement(
    options: {
      size?: string;
      economy?: string;
      useAI?: boolean;
    } = {},
  ): Promise<GeneratorOutput> {
    const sizeConfig =
      settlementConfig.sizes.find((s) => s.name === options.size) ||
      settlementConfig.sizes[
        Math.floor(Math.random() * settlementConfig.sizes.length)
      ];
    const size = sizeConfig.name;
    const population = sizeConfig.range;
    const economy =
      options.economy ||
      settlementConfig.economies[
        Math.floor(Math.random() * settlementConfig.economies.length)
      ];

    // Generate Name using location styling
    const prefixes = [
      "Oakhaven",
      "Stonebridge",
      "Riverbend",
      "Ironkeep",
      "Shadowfen",
      "Sunvale",
      "Windycrest",
      "Deepwell",
    ];
    const suffixes = [
      " Crossing",
      " Keep",
      " Village",
      " Town",
      " Harbour",
      " Hollow",
      " Falls",
      " Ridge",
    ];
    const name =
      prefixes[Math.floor(Math.random() * prefixes.length)] +
      suffixes[Math.floor(Math.random() * suffixes.length)];

    if (options.useAI !== false) {
      try {
        const prompt = `Generate a detailed RPG Settlement in JSON format.
Options:
- Name: ${name}
- Size: ${size} (${population})
- Primary Economy: ${economy}

You must return a valid JSON object matching the following structure exactly:
{
  "title": "A single string for the settlement name",
  "content": "A detailed multi-paragraph description (markdown formatted) describing the settlement's atmosphere, layout, and geography.",
  "lore": "Structured GM details (markdown formatted) detailing its size, government, notable locations, active factions, and current rumors.",
  "labels": ["rpg-location", "imported-draft"]
}
Return only the JSON object. Do not include markdown code block formatting like \`\`\`json.`;

        const model = await this.clientManager.getModel(
          "",
          "gemini-1.5-flash",
          "You are an assistant that generates detailed RPG campaign elements in JSON format.",
        );
        const response = await model.generateContent(prompt);
        const text = response.response.text().trim();
        const cleanText = text
          .replace(/^```json\s*/i, "")
          .replace(/```$/, "")
          .trim();
        const data = JSON.parse(cleanText);

        return {
          type: "location",
          title: data.title || name,
          content: data.content || "",
          lore: data.lore || "",
          labels: Array.isArray(data.labels)
            ? data.labels
            : ["rpg-location", "imported-draft"],
          status: "active",
        };
      } catch (err) {
        console.warn(
          "AI generation failed, falling back to local tables:",
          err,
        );
      }
    }

    // Local Fallback
    const government =
      settlementConfig.governments[
        Math.floor(Math.random() * settlementConfig.governments.length)
      ];
    const faction =
      settlementConfig.factions[
        Math.floor(Math.random() * settlementConfig.factions.length)
      ];
    const locs = this.getRandomItems(
      settlementConfig.notableLocations,
      sizeConfig.pointsOfInterestCount,
    );

    const content = `### Description
${name} is a thriving ${size.toLowerCase()} situated along major geography channels. Its local architecture features sturdy foundations tailored to the environment, and its streets are active with citizens going about their daily routines.

### Atmosphere
The air is filled with the smells of local industries, and visitors are greeted with a blend of curiosity and wariness depending on the active hour. The economy is heavily focused on ${economy.toLowerCase()} operations, serving as the main source of income for local families.`;

    const lore = `### GM Reference Information
- **Size**: ${size} (${population})
- **Primary Economy**: ${economy}
- **Government**: ${government}

### Points of Interest
${locs.map((l) => `- **${l}**: A crucial hub of local activity.`).join("\n")}

### Controlling Factions
- **${faction}**: Maintains significant influence over the local district's rules and affairs.`;

    return {
      type: "location",
      title: name,
      content,
      lore,
      labels: ["rpg-location", "imported-draft"],
      status: "active",
    };
  }

  /**
   * Generates a magic item draft.
   */
  async generateMagicItem(
    options: {
      type?: string;
      rarity?: string;
      useAI?: boolean;
    } = {},
  ): Promise<GeneratorOutput> {
    const itemType =
      options.type ||
      magicItemConfig.types[
        Math.floor(Math.random() * magicItemConfig.types.length)
      ];
    const rarity =
      options.rarity ||
      magicItemConfig.rarities[
        Math.floor(Math.random() * magicItemConfig.rarities.length)
      ];

    // Generate Name using descriptors
    const prefixes = [
      "Dread",
      "Aether",
      "Frost",
      "Shadow",
      "Soul",
      "Solar",
      "Storm",
      "Whisper",
      "Rune",
    ];
    const suffixes = [
      "bringer",
      "weaver",
      "ward",
      "shard",
      "reaper",
      "binder",
      "heart",
      "caller",
    ];
    const baseName =
      prefixes[Math.floor(Math.random() * prefixes.length)] +
      suffixes[Math.floor(Math.random() * suffixes.length)];
    const name = `${baseName} (${itemType})`;

    if (options.useAI !== false) {
      try {
        const prompt = `Generate a detailed RPG Magic Item in JSON format.
Options:
- Name: ${name}
- Type: ${itemType}
- Rarity: ${rarity}

You must return a valid JSON object matching the following structure exactly:
{
  "title": "A single string for the magic item name",
  "content": "A detailed description (markdown formatted) describing the item's appearance, materials, and passive feelings when held.",
  "lore": "Structured GM details (markdown formatted) detailing its magical properties, rarity, curse (if any), and legendary backstory.",
  "labels": ["rpg-item", "imported-draft"]
}
Return only the JSON object. Do not include markdown code block formatting like \`\`\`json.`;

        const model = await this.clientManager.getModel(
          "",
          "gemini-1.5-flash",
          "You are an assistant that generates detailed RPG campaign elements in JSON format.",
        );
        const response = await model.generateContent(prompt);
        const text = response.response.text().trim();
        const cleanText = text
          .replace(/^```json\s*/i, "")
          .replace(/```$/, "")
          .trim();
        const data = JSON.parse(cleanText);

        return {
          type: "item",
          title: data.title || name,
          content: data.content || "",
          lore: data.lore || "",
          labels: Array.isArray(data.labels)
            ? data.labels
            : ["rpg-item", "imported-draft"],
          status: "active",
        };
      } catch (err) {
        console.warn(
          "AI generation failed, falling back to local tables:",
          err,
        );
      }
    }

    // Local Fallback
    const property =
      magicItemConfig.properties[
        Math.floor(Math.random() * magicItemConfig.properties.length)
      ];
    const history =
      magicItemConfig.histories[
        Math.floor(Math.random() * magicItemConfig.histories.length)
      ];

    const content = `### Description
The ${name} is a uniquely crafted ${itemType.toLowerCase()} that displays a high degree of precision in its construction. Made from materials rare to this region, it feels slightly warm or cool to the touch depending on the active wielder's alignment.`;

    const lore = `### GM Reference Information
- **Type**: ${itemType}
- **Rarity**: ${rarity}

### Magical Properties
- **Passive Effect**: ${property}

### Lore & History
${history}`;

    return {
      type: "item",
      title: name,
      content,
      lore,
      labels: ["rpg-item", "imported-draft"],
      status: "active",
    };
  }

  async generateQuestHook(
    options: {
      genre?: string;
      tone?: string;
      scope?: string;
      locationType?: string;
      threat?: string;
      twist?: string;
      reward?: string;
      campaignContext?: string;
      useAI?: boolean;
    } = {},
  ): Promise<GeneratorOutput> {
    const genre =
      options.genre ||
      questConfig.genres[Math.floor(Math.random() * questConfig.genres.length)];
    const tone =
      options.tone ||
      questConfig.tones[Math.floor(Math.random() * questConfig.tones.length)];
    const scope =
      options.scope ||
      questConfig.scopes[Math.floor(Math.random() * questConfig.scopes.length)];
    const locationType =
      options.locationType ||
      questConfig.locationTypes[
        Math.floor(Math.random() * questConfig.locationTypes.length)
      ];
    const threat =
      options.threat ||
      questConfig.threats[
        Math.floor(Math.random() * questConfig.threats.length)
      ];
    const twist =
      options.twist ||
      questConfig.twists[Math.floor(Math.random() * questConfig.twists.length)];
    const reward =
      options.reward ||
      questConfig.rewards[
        Math.floor(Math.random() * questConfig.rewards.length)
      ];
    const campaignContext = options.campaignContext?.trim();
    const questName = `${this.generateName()}'s ${["Gambit", "Bargain", "Reckoning", "Shadow", "Legacy", "Trial"][Math.floor(Math.random() * 6)]}`;

    if (options.useAI !== false) {
      try {
        const prompt = `Generate a detailed RPG quest hook in JSON format.
Options:
- Genre: ${genre}
- Tone: ${tone}
- Scope: ${scope}
- Location Type: ${locationType}
- Main Threat: ${threat}
- Twist: ${twist}
- Reward: ${reward}
${campaignContext ? `- Campaign Context: ${campaignContext}` : ""}

You must return a valid JSON object matching the following structure exactly:
{
  "title": "A single evocative quest name (3-6 words)",
  "content": "A detailed multi-paragraph quest hook (markdown formatted) describing the situation, what the party is asked to do, the location, the key NPC involved, and how it fits the campaign context if provided.",
  "lore": "Structured GM details (markdown formatted) with sections for core fields, complication, key NPC, twist, and reward.",
  "labels": ["rpg-quest", "quest-generator", "imported-draft"]
}
Return only the JSON object. Do not include markdown code block formatting like \`\`\`json.`;

        const model = await this.clientManager.getModel(
          "",
          "gemini-1.5-flash",
          "You are an assistant that generates detailed RPG campaign elements in JSON format.",
        );
        const response = await model.generateContent(prompt);
        const text = response.response.text().trim();
        const cleanText = text
          .replace(/^```json\s*/i, "")
          .replace(/```$/, "")
          .trim();
        const data = JSON.parse(cleanText);

        return {
          type: "event",
          title: data.title || questName,
          content: data.content || "",
          lore: data.lore || "",
          labels: Array.isArray(data.labels)
            ? data.labels
            : ["rpg-quest", "quest-generator", "imported-draft"],
          status: "active",
        };
      } catch (err) {
        console.warn(
          "AI generation failed, falling back to local tables:",
          err,
        );
      }
    }

    const hook =
      questConfig.hooks[Math.floor(Math.random() * questConfig.hooks.length)];
    const complication =
      questConfig.complications[
        Math.floor(Math.random() * questConfig.complications.length)
      ];
    const npcName = this.generateName();
    const locationName = `The ${this.generateName()} ${locationType}`;

    const content = `### The Hook
${hook}

${campaignContext ? `### Campaign Fit\nThis quest ties into ${campaignContext}. The threat and location should reflect existing tensions or unresolved threads.\n` : ""}### Location
${locationName} serves as the primary setting — a ${locationType.toLowerCase()} shaped by ${genre.toLowerCase()} conventions and a ${tone.toLowerCase()} atmosphere.

### Key NPC
**${npcName}** is the immediate contact, patron, or obstacle. Their stated reason for hiring the party is credible enough, but their personal stake runs deeper than they admit.

### Threat
The central danger is a ${threat.toLowerCase()}. It has been active long enough to leave evidence, earn fear, and create a power vacuum that others are already trying to fill.`;

    const lore = `### GM Reference Information
- **Genre**: ${genre}
- **Tone**: ${tone}
- **Scope**: ${scope}
- **Location Type**: ${locationType}
- **Main Threat**: ${threat}

### Complication
${complication}

### Twist
${twist}

### Reward
${reward}`;

    return {
      type: "event",
      title: questName,
      content,
      lore,
      labels: ["rpg-quest", "quest-generator", "imported-draft"],
      status: "active",
    };
  }

  async generateNames(
    options: {
      culture?: string;
      gender?: string;
      nameType?: string;
      count?: string;
      context?: string;
      useAI?: boolean;
    } = {},
  ): Promise<GeneratorOutput> {
    const culture = options.culture || nameGeneratorConfig.cultures[0];
    const gender = options.gender || nameGeneratorConfig.genders[0];
    const nameType = options.nameType || nameGeneratorConfig.nameTypes[0];
    const count = parseInt(options.count || "5", 10);
    const context = options.context?.trim();

    const entityType: GeneratorOutput["type"] =
      nameType === "Place"
        ? "location"
        : nameType === "Faction"
          ? "faction"
          : nameType === "Item"
            ? "item"
            : "character";

    if (options.useAI !== false) {
      try {
        const prompt = `Generate ${count} fantasy ${nameType.toLowerCase()} names in JSON format.
Options:
- Culture / Style: ${culture}
- Gender / Presentation: ${gender}
- Name Type: ${nameType}
- Count: ${count}
${context ? `- Context: ${context}` : ""}

You must return a valid JSON object matching the following structure exactly:
{
  "title": "The single best or most evocative name from the list",
  "content": "A brief lead sentence describing the naming style, followed by a markdown list of all ${count} names. Format each name as '- **Name** — one-sentence flavour note'.",
  "lore": "GM notes (markdown formatted) with sections for Culture, Style, and Usage Suggestions covering how to use these names in a campaign.",
  "labels": ["fantasy-name", "name-generator", "imported-draft"]
}
Return only the JSON object. Do not include markdown code block formatting like \`\`\`json.`;

        const model = await this.clientManager.getModel(
          "",
          "gemini-1.5-flash",
          "You are an assistant that generates detailed RPG campaign elements in JSON format.",
        );
        const response = await model.generateContent(prompt);
        const text = response.response.text().trim();
        const cleanText = text
          .replace(/^```json\s*/i, "")
          .replace(/```$/, "")
          .trim();
        const data = JSON.parse(cleanText);

        return {
          type: entityType,
          title: data.title || "Fantasy Name",
          content: data.content || "",
          lore: data.lore || "",
          labels: Array.isArray(data.labels)
            ? data.labels
            : ["fantasy-name", "name-generator", "imported-draft"],
          status: "active",
        };
      } catch (err) {
        console.warn(
          "AI generation failed, falling back to local tables:",
          err,
        );
      }
    }

    // Local fallback: combine culture-specific prefix + suffix
    const prefixes =
      nameGeneratorConfig.culturePrefixes[culture] ||
      nameGeneratorConfig.culturePrefixes["Generic Fantasy"];
    const suffixes =
      nameGeneratorConfig.cultureSuffixes[culture] ||
      nameGeneratorConfig.cultureSuffixes["Generic Fantasy"];

    const generated: string[] = [];
    for (let i = 0; i < count; i++) {
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
      generated.push(prefix.charAt(0).toUpperCase() + prefix.slice(1) + suffix);
    }

    const primary = generated[0];
    const nameList = generated.map((n) => `- **${n}**`).join("\n");

    const content = `${culture} ${nameType.toLowerCase()} names in a ${gender.toLowerCase()} register.

${nameList}`;

    const lore = `### Generator Settings
- **Culture**: ${culture}
- **Gender / Presentation**: ${gender}
- **Name Type**: ${nameType}

### Usage Suggestions
Use these names for any ${nameType.toLowerCase()} in a ${culture.toLowerCase()}-influenced setting. Combine or modify them freely — drop a syllable, add a prefix, or append a title or epithet for variation.`;

    return {
      type: entityType,
      title: primary,
      content,
      lore,
      labels: ["fantasy-name", "name-generator", "imported-draft"],
      status: "active",
    };
  }

  private getRandomItems<T>(arr: T[], count: number): T[] {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }
}

export const generatorEngine = new DefaultGeneratorEngine();
