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

  private getRandomItems<T>(arr: T[], count: number): T[] {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }
}

export const generatorEngine = new DefaultGeneratorEngine();
