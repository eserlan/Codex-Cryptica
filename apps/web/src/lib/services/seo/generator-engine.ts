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
  themes: [
    "Classic Fantasy",
    "Cyberpunk / Corporate",
    "Vampire / Gothic Noir",
    "Sci-Fi / Space Opera",
    "Modern Conspiracy",
    "Post-Apocalyptic",
  ],
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

export const npcThemeConfig = {
  ancestries: {
    "Classic Fantasy": [
      "Human",
      "Elf",
      "Dwarf",
      "Halfling",
      "Tiefling",
      "Half-Orc",
      "Gnome",
      "Dragonborn",
    ],
    "Cyberpunk / Corporate": [
      "Human",
      "Street-Modified Human",
      "Corporate Clone",
      "Synthetic Android",
      "Uplifted Organism",
    ],
    "Vampire / Gothic Noir": [
      "Human",
      "Dhampir",
      "Revenant",
      "Changed Mortal",
      "Witchblood",
    ],
    "Sci-Fi / Space Opera": [
      "Human",
      "Android",
      "Colony-Born",
      "Alien Citizen",
      "Augmented Pilot",
    ],
    "Modern Conspiracy": [
      "Human",
      "Off-Grid Survivor",
      "Enhanced Operative",
      "Whistleblower",
    ],
    "Post-Apocalyptic": [
      "Survivor Human",
      "Mutant",
      "Scavenger-Born",
      "Vault Dweller",
      "Wasteland Nomad",
    ],
  } as Record<string, string[]>,
  roles: {
    "Classic Fantasy": [
      "Mage",
      "Warrior",
      "Rogue",
      "Priest",
      "Merchant",
      "Noble",
      "Scholar",
      "Guard",
    ],
    "Cyberpunk / Corporate": [
      "Netrunner",
      "Street Fixer",
      "Corporate Agent",
      "Street Samurai",
      "Techie",
      "Gang Lieutenant",
      "Medtech",
      "Journalist",
    ],
    "Vampire / Gothic Noir": [
      "Vampire Hunter",
      "Occultist",
      "Corrupt Noble",
      "Private Detective",
      "Fallen Clergy",
      "Criminal Enforcer",
      "Asylum Keeper",
    ],
    "Sci-Fi / Space Opera": [
      "Starship Pilot",
      "Engineer",
      "Colonial Marine",
      "Diplomat",
      "Free Trader",
      "Scientist",
      "AI Liaison",
    ],
    "Modern Conspiracy": [
      "Intelligence Agent",
      "Investigative Journalist",
      "Fixer",
      "Activist",
      "Corporate Operative",
      "Private Investigator",
    ],
    "Post-Apocalyptic": [
      "Scavenger",
      "Wasteland Warlord",
      "Medic",
      "Trader",
      "Cult Enforcer",
      "Scout",
      "Mechanic",
    ],
  } as Record<string, string[]>,
  moralities: {
    "Classic Fantasy": [
      {
        id: "chivalric_code",
        label: "Chivalric Code",
        aiPromptDirective:
          "Write this NPC with an unshakeable sense of honor, classical righteousness, and duty. Their vocabulary is formal, respectful, and rejects deceitful or underhanded methods.",
      },
      {
        id: "common_good",
        label: "Common Good",
        aiPromptDirective:
          "This NPC is driven entirely by empathy and the immediate welfare of the community. They are casual, caring, and willing to quietly break unjust rules to protect others.",
      },
      {
        id: "enlightened_balance",
        label: "Enlightened Balance",
        aiPromptDirective:
          "Write this NPC as an objective, emotionally level philosopher who prioritizes cosmic or natural balance. Avoid emotional outbursts or blind loyalty to any faction.",
      },
      {
        id: "mercenary_instinct",
        label: "Mercenary Instinct",
        aiPromptDirective:
          "This NPC is intensely pragmatic, apolitical, and motivated by coins, safety, or trade. Their dialogue should be transactional, street-smart, and grounded in cold reality.",
      },
      {
        id: "zealous_crusade",
        label: "Zealous Crusade",
        aiPromptDirective:
          "Write this character with intense, uncompromising conviction toward a specific dogma, deity, or ideal. Their speech is passionate, direct, and completely intolerant of compromise.",
      },
      {
        id: "power_absolute",
        label: "Power at All Costs",
        aiPromptDirective:
          "This character is entirely self-serving, ambitious, and ruthless. Their behavior can range from highly charismatic manipulation to terrifying authority, always prioritizing personal leverage.",
      },
    ],
    "Cyberpunk / Corporate": [
      {
        id: "corporate_loyalist",
        label: "Corporate Loyalist",
        aiPromptDirective:
          "Incorporate corporate buzzwords and clinical, risk-managed PR language. This character prioritizes systemic order, corporate policy, and lines of credit over human empathy.",
      },
      {
        id: "street_pragmatist",
        label: "Street Pragmatist",
        aiPromptDirective:
          "Use sharp, weary, and highly transactional street slang. This character has no illusions about saving the world; their focus is purely short-term survival and protecting their immediate crew.",
      },
      {
        id: "ideological_radical",
        label: "Ideological Radical",
        aiPromptDirective:
          "Write this character with raw, anti-establishment energy. They use rebellious, anti-corp rhetoric and are actively willing to burn down systems, entirely indifferent to collateral damage.",
      },
      {
        id: "cold_professional",
        label: "Cold Professional",
        aiPromptDirective:
          "Dialogue must be minimal, precise, and devoid of personal bias. The character views tasks purely as mechanical execution — nothing is personal, everything is just business.",
      },
      {
        id: "burned_out_cynic",
        label: "Burned-Out Cynic",
        aiPromptDirective:
          "Infuse the dialogue with deep nihilism, dry sarcasm, and exhaustion. The character has seen it all fall apart and operates on a baseline expectation of systemic failure.",
      },
      {
        id: "predatory_opportunist",
        label: "Predatory Opportunist",
        aiPromptDirective:
          "Make this character predatory, slippery, and untrustworthy. They use smooth talk to mask aggressive self-interest and are always scanning the room for an exploit or an escape route.",
      },
    ],
    "Vampire / Gothic Noir": [
      {
        id: "strict_ascetic",
        label: "Strict Ascetic",
        aiPromptDirective:
          "Write this character with a strained, hyper-controlled demeanor. They use precise, polite, and antiquated language as a psychological armor to contain an inner, volatile darkness.",
      },
      {
        id: "haunted_sympathizer",
        label: "Haunted Sympathizer",
        aiPromptDirective:
          "Dialogue should convey deep guilt, hesitation, and vulnerability. The character is deeply ashamed of their actions or status and is desperately looking for small ways to do good without getting caught.",
      },
      {
        id: "cold_monster",
        label: "Cold Monster",
        aiPromptDirective:
          "Write this character with a chilling, detached elegance. They lack basic human empathy, treating people like simple livestock or resources, completely free of guilt or malice.",
      },
      {
        id: "obsessive_zealot",
        label: "Obsessive Zealot",
        aiPromptDirective:
          "Infuse the character's descriptions with an eerie, manic focus. Their dialogue should repeatedly orient toward their singular, consuming fixation, overriding all other social cues.",
      },
      {
        id: "decadent_hedonist",
        label: "Decadent Hedonist",
        aiPromptDirective:
          "Dialogue is theatrical, cynical, and dripping with sensory indulgence. The character uses casual amusement and hedonism to aggressively deflect from their inner decay or emptiness.",
      },
      {
        id: "pragmatic_survivor",
        label: "Pragmatic Survivor",
        aiPromptDirective:
          "Write this NPC as highly defensive, paranoid, and survival-driven. Their speech is guarded, they avoid making definitive promises, and they prioritize exit strategies over loyalty.",
      },
    ],
    "Sci-Fi / Space Opera": [
      {
        id: "system_loyalist",
        label: "System Loyalist",
        aiPromptDirective:
          "This character speaks with the confidence of an institutionalist. They emphasize law, civilization, hierarchy, and data-driven stability, viewing rebels or independents as dangerous chaos.",
      },
      {
        id: "frontier_independent",
        label: "Frontier Independent",
        aiPromptDirective:
          "Use rugged, informal, and fiercely independent dialogue. The character values self-reliance, localized trust, and personal freedom above centralized planetary laws.",
      },
      {
        id: "zealous_visionary",
        label: "Zealous Visionary",
        aiPromptDirective:
          "Focus the character on the future, technology, or a grand cosmic mission. They view current human suffering or ethical concerns as insignificant speed bumps on the road to evolution.",
      },
      {
        id: "principled_pacifist",
        label: "Principled Pacifist",
        aiPromptDirective:
          "Dialogue must be calm, deeply humanistic, and actively seek compromise. The character maintains absolute ethical boundaries against violence, regardless of how harsh the setting is.",
      },
      {
        id: "opportunistic_trader",
        label: "Opportunistic Trader",
        aiPromptDirective:
          "Write this character with a highly commercial, speculative, and conversational tone. They treat every interaction as an open negotiation, constantly weighing cost-benefit ratios.",
      },
      {
        id: "subversive_rebel",
        label: "Subversive Rebel",
        aiPromptDirective:
          "The character operates with the secrecy and intensity of an active insurgent. Their language is revolutionary, defiant, and actively seeks to disrupt or dismantle structural authority.",
      },
    ],
    "Modern Conspiracy": [
      {
        id: "institutionalist",
        label: "Institutionalist",
        aiPromptDirective:
          "Use highly clinical, dry, and compartmentalized intelligence jargon. The character prioritizes official protocol, institutional security, and the chain of command above all else.",
      },
      {
        id: "noble_transgressor",
        label: "Noble Transgressor",
        aiPromptDirective:
          "Write this character as a quiet, hyper-focused operative who knowingly breaks laws to achieve a greater moral good. Their dialogue is guarded but deeply principled.",
      },
      {
        id: "fanatical_believer",
        label: "Fanatical Believer",
        aiPromptDirective:
          "The character's speech must carry the weight of dangerous, total certainty. They view all of human society as an illusion and treat people as mere assets or collateral to be spent for the Truth.",
      },
      {
        id: "unprincipled_asset",
        label: "Unprincipled Asset",
        aiPromptDirective:
          "Dialogue should be highly transactional, street-smart, and amoral. The character has zero ideological loyalty, viewing their skills and information purely as commodities to sell to the highest bidder.",
      },
      {
        id: "haunted_insider",
        label: "Haunted Insider",
        aiPromptDirective:
          "Infuse the character's tone with intense paranoia, panic, and deep ethical distress. They are physically and mentally exhausted from keeping terrible secrets and expect betrayal at any second.",
      },
      {
        id: "machiavellian_player",
        label: "Machiavellian Player",
        aiPromptDirective:
          "Write this character with a charming, highly collected, and disarming social facade. Beneath this exterior, their dialogue and actions are driven entirely by cold, calculated personal advancement.",
      },
    ],
    "Post-Apocalyptic": [
      {
        id: "collectivist",
        label: "Collectivist",
        aiPromptDirective:
          "This character speaks with a rugged, collective 'we' mentality. They prioritize the survival, defense, and material resources of their specific settlement over individual rights or outsiders.",
      },
      {
        id: "tribal_xenophobe",
        label: "Tribal Xenophobe",
        aiPromptDirective:
          "Write this character with intense suspicion, hostility, and localized, insular language. They view anyone outside their immediate clan as a lethal threat or an untrustworthy parasite.",
      },
      {
        id: "pure_scavenger",
        label: "Pure Scavenger",
        aiPromptDirective:
          "Dialogue is short, practical, and heavily focused on material scrap, ammo, and survival utilities. The character avoids any long-term commitments or alliances, relying entirely on themselves.",
      },
      {
        id: "wasteland_zealot",
        label: "Wasteland Zealot",
        aiPromptDirective:
          "Write this character with a strange, stylized fanaticism. They use bizarre vocabulary rooted in post-apocalyptic myths or cult beliefs, viewing the ruins of the world through a terrifying religious lens.",
      },
      {
        id: "despotic_ruler",
        label: "Despotic Ruler",
        aiPromptDirective:
          "The character's tone is authoritative, heavy, and threatening. They enforce their will through raw intimidation, justifying their cruelty as the only practical way to hold back total wasteland anarchy.",
      },
      {
        id: "utopian_builder",
        label: "Utopian Builder",
        aiPromptDirective:
          "Write this character with a resilient, hopeful, and idealistic tone. Despite the harsh wasteland environment, they emphasize laws, education, historical recovery, and long-term societal rebuilding.",
      },
    ],
  } as Record<
    string,
    { id: string; label: string; aiPromptDirective: string }[]
  >,
};

export const vampireConfig = {
  archetypes: [
    "Aristocratic Court",
    "Occult Coven",
    "Predatory Brood",
    "Conspiring Syndicate",
    "Rebel Anarchs",
  ],
  bloodlines: [
    "Sanguine Nobles (Charismatic Mind-Benders)",
    "Shadow Stalkers (Nightmare Weavers)",
    "Blood Sorcerers (Occult Ritualists)",
    "Bestial Ravagers (Feral Predator Shapeshifters)",
    "Melancholic Artists (Aesthetes of Decay)",
  ],
  feedingHabits: [
    "High-Society Salons (Elite & Consent-based)",
    "Street Predation (Slums & Forgotten Alleys)",
    "Blood Trafficking (Black Market & Clinics)",
    "Occult Sacraments (Ritualistic & Sacrificial)",
    "Wild Wilderness Hunts (Deep Forests & Ruins)",
  ],
  weaknesses: [
    "Severe Sun Sensitivity (Burns instantly)",
    "Consecrated Ground Aversion (Cannot cross thresholds)",
    "Mirror & Reflection Absence (Exposes their nature)",
    "Decaying Physical Form (Needs fresh blood to look human)",
    "Silver & Wooden Vulnerability (Prevents regeneration)",
  ],
  scopes: [
    "Single city underbelly",
    "Hidden castle & border valley",
    "Trade route shadow network",
    "Metropolitan high society",
    "Continental shadow court",
  ],
  alignments: [
    "Strictly lawful, highly predatory",
    "Pragmatic and power-driven",
    "Feral, chaotic, and blood-fueled",
    "Secretive and ritual-obsessed",
    "Rebellious, seeking freedom from elders",
  ],
  goals: [
    "Infiltrate the city council and blood-bind key mortal leaders.",
    "Exhume the sarcophagus of their dormant Progenitor.",
    "Monopolize the local blood bank distribution network.",
    "Wipe out a rival werewolf pack or vampire hunters' cell.",
    "Reconstruct a shattered ancient chronicle of blood magic.",
  ],
  conflicts: [
    "The younger brood is planning a rebellion against the ancient elder.",
    "A feeding gone wrong has drawn the attention of mortal authorities.",
    "A rogue member has stolen a ledger detailing the clan's human farms.",
    "The blood supply is tainted by a mystical pathogen.",
    "An inquisitor has successfully tracked their primary haven.",
  ],
  hooks: [
    "A mysterious patron hires the party to deliver a sealed urn, which is a vampire ashes decoy.",
    "Locals ask the party to investigate a series of bloodless bodies found in the canal.",
    "A member of the clan offers to sell a list of high-profile vampire thralls in the city council.",
    "The clan captures the party and offers freedom in exchange for retrieving a relic from a sunlit temple.",
    "A dying vampire begs the party to protect their mortal family from their own sire.",
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
    "Villain is protecting something valuable",
    "Client's ally is the real enemy",
    "Location holds a campaign-changing secret",
    "Threat must be bargained with, not killed",
    "Party's own past caused this situation",
    "Two factions both claim the prize",
  ],
  rewards: [
    "Coin plus a local power's favor",
    "Deed to a useful property",
    "Access to a restricted archive",
    "A magic item from the site",
    "Valuable information from the client",
    "Respect from a previously hostile faction",
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
  summary?: string;
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
      theme?: string;
      useAI?: boolean;
    } = {},
  ): Promise<GeneratorOutput> {
    const theme = options.theme;
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

    const npcNamingStyles = [
      "Give the NPC a name that sounds distinctly local to their culture — not generic fantasy.",
      "Use a name with unusual phonetic texture. Avoid Kael, Zara, Theron, Vane, Kane, Drake, Stone, Grey, Ash, Cole, and similar overused patterns.",
      "Give the NPC a short epithet or title that hints at their reputation — invent an original one, do not reuse common examples.",
      "Use a name that suggests a specific cultural or ethnic origin consistent with their ancestry.",
      "Choose a name that is easy to say aloud at a gaming table — short, distinct, memorable, and not a common English surname.",
    ];
    const chosenNamingStyle = this.pickFrom(npcNamingStyles);
    const varianceSeed = Math.floor(Math.random() * 99991) + 10;

    if (options.useAI !== false) {
      try {
        const npcThemeVoice: Record<string, string> = {
          "Classic Fantasy":
            "medieval fantasy — guilds, nobles, arcane orders, political intrigue in a world of swords and sorcery",
          "Cyberpunk / Corporate":
            "near-future cyberpunk — megacorporations, street gangs, hackers, corporate espionage, neon-lit dystopia",
          "Vampire / Gothic Noir":
            "gothic horror — vampire covens, inquisitions, decadent aristocracy, forbidden rites, candlelit conspiracies",
          "Sci-Fi / Space Opera":
            "science fiction space opera — stellar federations, alien factions, interstellar trade, colony politics, advanced technology",
          "Modern Conspiracy":
            "modern-day thriller — intelligence agencies, secret societies, corporate conspiracies, hidden influence networks",
          "Post-Apocalyptic":
            "post-apocalyptic survival — scavenger tribes, wasteland cults, resource wars, collapsed civilisation, desperate factions",
        };
        const voice = theme
          ? (npcThemeVoice[theme] ?? "tabletop RPG")
          : "tabletop RPG";

        const systemInstruction = `You are an expert RPG campaign writer specialising in ${voice}. You generate detailed, original NPC drafts for that setting in JSON format.

OUTPUT FORMAT — return ONLY a valid JSON object, no markdown fences:
{
  "title": "NPC name (follow the naming directive in the user message)",
  "summary": "One sentence: who this NPC is and what makes them interesting (e.g. 'A disgraced noble archivist who sells secrets to fund a private obsession.').",
  "content": "Markdown. Use exactly these four section headers in order: '### Who they are', '### What they want', '### Why they are useful', '### How to use them at the table'. Each section: 2-4 tight sentences. Include campaign context if provided.",
  "lore": "Markdown. Use EXACTLY this structure with ### headers and '- **Label**: Value' list items:\\n### At a Glance\\n- **Ancestry**: race and background\\n- **Role**: what they do\\n- **Alignment**: moral posture\\n- **Secret**: hidden truth that would change everything\\n- **Immediate Hook**: one-sentence GM hook\\n### Personality\\n- two distinct personality traits as bullet points\\n### Faction Connection\\none sentence on their organisational ties or lack thereof",
  "labels": ["2-4 lowercase tags describing their role and traits, plus 'rpg-character', 'npc-generator', 'imported-draft'"]
}

QUALITY RULES:
- Every NPC must feel like a completely different person — avoid repeating names, archetypes, or backstory structures.
- Avoid overused NPC name patterns. Do NOT use: Kael, Theron, Zara, Aldric, Vane, Kane, Drake, Stone, Grey, Ash, Cole, Maren, Cross, Vale, or common English monosyllable surnames.
- The secret should be genuinely surprising and table-usable, not a generic "dark past."
- Place names must be specific and invented — no "the old district" or "the lower city."
- Before finalising, silently check: is this name original and not on the forbidden list? Is the secret actually interesting? Rewrite if yes.`;

        const moralityAnchor = theme
          ? npcThemeConfig.moralities[theme]?.find((m) => m.id === alignment)
          : undefined;
        const behavioralDirective =
          moralityAnchor?.aiPromptDirective ?? alignment;
        const moralityLabel = moralityAnchor?.label ?? alignment;

        const userMessage = `Generate an NPC. Variation seed: ${varianceSeed}.
${theme ? `- Genre/Theme: ${theme}` : ""}
- Ancestry/Race: ${race}
- Role: ${role}
- Moral Stance: ${moralityLabel}
- Behavioral Directive: ${behavioralDirective}${campaignContext ? `\n- Campaign Context: ${campaignContext}` : ""}
- Naming Directive: ${chosenNamingStyle}`;

        const model = await this.clientManager.getModel(
          "",
          "gemini-3.1-flash-lite",
          systemInstruction,
        );
        const response = await model.generateContent(userMessage);
        const text = response.response.text().trim();
        const cleanText = text
          .replace(/^```json\s*/i, "")
          .replace(/```$/, "")
          .trim();
        const data = JSON.parse(cleanText);

        return {
          type: "character",
          title: data.title || name,
          summary:
            data.summary ||
            `A ${alignment.toLowerCase()} ${race.toLowerCase()} ${role.toLowerCase()} with something to hide.`,
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

    const fallbackMoralityLabel = theme
      ? (npcThemeConfig.moralities[theme]?.find((m) => m.id === alignment)
          ?.label ?? alignment)
      : alignment;
    const summary = `A ${fallbackMoralityLabel.toLowerCase()} ${race.toLowerCase()} ${role.toLowerCase()} with something to hide.`;

    const content = `### Who they are
${name} is a ${race} ${role} whose public reputation is useful, incomplete, and just suspicious enough to matter. Locals know them as someone who gets results, even when the work requires favors, secrets, or a carefully timed lie.${campaignContext ? ` In ${campaignContext}, they are already entangled in the edges of the main conflict.` : ""}

### What they want
${motive} Everything they do, however helpful it appears on the surface, is filtered through this underlying drive.

### Why they are useful
${faction} They know routes, names, prices, and debts that the party cannot easily learn any other way.

### How to use them at the table
Introduce ${name} when the party needs a social lead, a compromised witness, or a morally complicated ally. They should be helpful immediately — but never free of consequences.`;

    const lore = `### At a Glance
- **Ancestry**: ${race}
- **Role**: ${role}
- **Moral Stance**: ${fallbackMoralityLabel}
- **Secret**: ${secret}
- **Immediate Hook**: ${plotHook}

### Personality
- ${traits[0]}
- ${traits[1]}

### Faction Connection
${faction}`;

    return {
      type: "character",
      title: name,
      summary,
      content,
      lore,
      labels: ["rpg-character", "npc-generator", "imported-draft"],
      status: "active",
    };
  }

  private pickFrom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  private factionBase(type: string): string {
    const map: Record<string, string[]> = {
      "Merchant Guild": [
        "A bonded counting house whose ledgers are sealed by city charter",
        "A licensed exchange hall at the centre of the trade district",
        "A warehouse compound that no sheriff may enter without a writ",
      ],
      "Secret Society": [
        "A private dining club whose membership list is never committed to paper",
        "A decommissioned observatory reached through a hidden press in the library stacks",
        "Rotating safe houses connected by messenger-drop protocols",
      ],
      "Mercenary Company": [
        "A fortified barracks compound outside the city walls",
        "A charted garrison holding neutral ground between two rival lords",
        "A licensed inn that doubles as a staging ground for contract work",
      ],
      "Temple Order": [
        "A sanctified compound built above the sealed catacombs",
        "A pilgrimage waystation that doubles as an intelligence hub",
        "A charitable hospice whose basement holds restricted archives",
      ],
      "Criminal Syndicate": [
        "A legitimate bathhouse with soundproofed rooms below street level",
        "A moneylender's office whose public ledgers contain a second set of books",
        "A district of connected properties linked by sealed passages",
      ],
      "Rebel Cell": [
        "A print-house running two sets of accounts",
        "A disused chapel in a contested neighbourhood where records are rarely checked",
        "A network of sympathiser homes linked by a rotating code phrase",
      ],
      "Arcane Circle": [
        "A registered scholar's hall with warded inner chambers",
        "A cartographer's guild whose maps contain hidden notation systems",
        "A canal barge anchored in a dock district where manifests go uninspected",
      ],
      // Cyberpunk types
      "Megacorporation Megagroup": [
        "A sealed corporate tower whose lower floors are open to the public and upper floors are not on any map",
        "A campus of linked facilities connected by private transit lines that bypass city checkpoints",
        "A data-centre compound in a legally ambiguous special economic zone",
      ],
      "Corporate Syndicate": [
        "A registered LLC with rotating directors and no fixed address",
        "A licensed private security firm that maintains offices in three jurisdictions simultaneously",
        "A shell company whose registered seat is a post-box in a compliant offshore district",
      ],
      "Hacker Collective": [
        "A distributed mesh of rented server nodes and anonymous relay points",
        "A legitimate ISP whose routing infrastructure doubles as a covert comms layer",
        "Rotating physical dead-drops in public infrastructure — lockers, charging stations, transit hubs",
      ],
      "Street Gang Alliance": [
        "A block of contested commercial units enforced by informal tax agreements",
        "A series of interconnected basement spaces beneath a market district",
        "A community centre operating with city permits while the basement handles other business",
      ],
      // Gothic types
      "Vampire Coven": [
        "A sealed private estate whose deed has not changed hands in three centuries",
        "A licensed sanatorium whose patient records are never released to outside authorities",
        "A labyrinthine wine cellar beneath a respectable merchant's townhouse",
      ],
      "Inquisition Watch": [
        "A fortified chapter-house adjacent to the civil courthouse",
        "A mobile tribunal that establishes temporary jurisdiction wherever the investigation leads",
        "A warded archive annexed to the city's oldest cathedral",
      ],
      // Sci-Fi types
      "Stellar Federation Alliance": [
        "A neutral space station positioned at a strategically contested transit point",
        "A diplomatic compound on a contested colony world with extraterritorial status",
        "A fleet of registered humanitarian vessels that doubles as a mobile command structure",
      ],
      // Modern types
      "Intelligence Agency": [
        "A nondescript government office building whose basement floors are not on the building plan",
        "A chain of legitimate consulting firms that share encrypted back-office infrastructure",
        "An embassy annex operating under diplomatic immunity",
      ],
      // Post-apocalyptic types
      "Scavenger Tribe": [
        "A fortified salvage yard at the edge of a collapsed industrial zone",
        "A mobile convoy that claims no fixed territory but controls key supply corridors",
        "A series of hidden caches spread across a hundred kilometres of dead highway",
      ],
      "Wasteland Cult": [
        "A sealed compound built inside a pre-collapse water treatment facility",
        "A fortified hilltop site with sightlines across three days of travel in every direction",
        "A network of underground bunkers connected by service tunnels from before the collapse",
      ],
    };
    return this.pickFrom(
      map[type] ?? [
        "A neutral facility whose access is controlled and whose records are not shared",
        "A licensed premises that provides cover for activities conducted elsewhere",
        "A distributed network of locations with no single point of failure",
      ],
    );
  }

  private factionResource(type: string): string {
    const map: Record<string, string[]> = {
      "Merchant Guild": [
        "Exclusive trade licences, bonded debts, and letters of introduction that open every city gate",
        "Commodity price information days before it reaches the open market",
        "Certified seals of provenance that determine what goods may legally change hands",
      ],
      "Secret Society": [
        "Compromising knowledge distributed in sealed fragments held by separate members",
        "A curated register of favours owed by officials, merchants, and clergy",
        "Access to a network of false identities and safe-passage routes",
      ],
      "Mercenary Company": [
        "Contractual access to trained soldiers who ask no political questions",
        "Neutral enforcement services hired by every side of every dispute",
        "An archive of battlefield contracts that constitute decades of political leverage",
      ],
      "Temple Order": [
        "Exclusive rights over burial rites, confessions, and civic oaths",
        "A pharmaceutical supply chain running through the charitable district",
        "Institutional immunity protecting their premises from search or seizure",
      ],
      "Criminal Syndicate": [
        "Control over the city's informal credit markets and enforcement ecosystem",
        "Detailed knowledge of every patrol route, informant, and magistrate's price",
        "A distribution network for restricted goods running through legitimate storefronts",
      ],
      "Rebel Cell": [
        "A verified printing and distribution network for prohibited materials",
        "Contacts embedded in the guard, the census office, and the merchant registry",
        "Secure courier routes that move people, messages, and contraband past checkpoints",
      ],
      "Arcane Circle": [
        "Proprietary ritual techniques licensed to no outside practitioner",
        "A sealed archive of magical precedents that defines what is legally permitted",
        "Controlled access to rare components that no other supplier will touch",
      ],
      // Cyberpunk types
      "Megacorporation Megagroup": [
        "Patent portfolios, regulatory capture, and the ability to rewrite local law through lobbying",
        "A private security force larger than the city police and legally permitted to operate with fewer constraints",
        "Exclusive contracts with critical infrastructure — power, water, data, transit",
      ],
      "Corporate Syndicate": [
        "Shell-company ownership of key residential and commercial properties across the district",
        "Leveraged debt held against every small business in the target sector",
        "Proprietary logistics infrastructure that competitors cannot access without their permission",
      ],
      "Hacker Collective": [
        "Zero-day exploits, surveillance backdoors, and access to every networked system in the city",
        "A distributed archive of intercepted communications from every major institution",
        "The ability to make anyone's digital identity disappear — or reappear differently",
      ],
      "Street Gang Alliance": [
        "Control of informal economies: protection, distribution, and dispute resolution in three districts",
        "Detailed knowledge of every surveillance blind spot, patrol schedule, and officer price",
        "Loyalty networks that extend into city maintenance, transit, and low-level civil service",
      ],
      // Gothic types
      "Vampire Coven": [
        "Centuries of accumulated wealth, property, and blackmail material on every notable family",
        "The ability to alter memory, compel testimony, and move unseen through any social tier",
        "A network of thralls embedded in the city's legal, medical, and religious institutions",
      ],
      "Inquisition Watch": [
        "Legal authority to detain, interrogate, and seize assets without civil court oversight",
        "An archive of confessions, heresies, and crimes dating back three generations",
        "Jurisdiction that supersedes local law in matters defined — broadly — as spiritual threat",
      ],
      // Sci-Fi types
      "Stellar Federation Alliance": [
        "Trade route licensing, customs authority, and the right to impose blockades under federation charter",
        "A shared military asset pool that member states cannot individually match",
        "Diplomatic recognition that determines which colonies and stations are treated as sovereign",
      ],
      // Modern types
      "Intelligence Agency": [
        "Surveillance infrastructure covering communications, financial transactions, and physical movement",
        "Classified leverage on every significant political, corporate, and criminal actor in the region",
        "The legal authority to classify, redact, and deny — which is effectively the power to erase events",
      ],
      // Post-apocalyptic types
      "Scavenger Tribe": [
        "Access to pre-collapse technology caches and the knowledge to operate what others cannot",
        "Control of the only reliable route through a stretch of dead territory",
        "A repair and fabrication capability that no other group in the region can match",
      ],
      "Wasteland Cult": [
        "Clean water, food stockpiles, and medical supplies — distributed exclusively to the faithful",
        "A coherent ideology that provides meaning in a world without institutions",
        "Armed enforcers who believe completely in what they are protecting",
      ],
    };
    return this.pickFrom(
      map[type] ?? [
        "Specialised knowledge or access that no other group in the region controls",
        "A network of obligations, debts, and dependencies too entangled to cut cleanly",
        "Control of a single critical resource that everyone else needs to function",
      ],
    );
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
      theme?: string;
      useAI?: boolean;
    } = {},
  ): Promise<GeneratorOutput> {
    const theme = options.theme || factionConfig.themes[0];
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

    const namingStyles = [
      "Name this faction after a material, substance, or natural phenomenon twisted to their purpose.",
      "Name this faction after an abstract concept, virtue, or doctrine — not a person or place.",
      "Use a short stark one-word name or a tight two-word compound (e.g. 'The Writ', 'Iron Accord').",
      "Base the faction name on a specific local landmark, street, district, or geographic feature.",
      "Name the faction after their founding secret, hidden method, or signature act.",
      "Use a name that sounds like a legitimate civic institution but carries a sinister undertone.",
      "Name the faction after a historical event, failed uprising, or forgotten figure from the setting.",
      "Give the faction a name derived from an unusual profession, trade, or craft.",
      "Use an archaic or invented word that evokes the faction's cultural roots.",
      "Name the faction after a symbol, emblem, or recurring motif associated with their work.",
    ];
    const npcNamingStyles = [
      "Give each NPC a name that sounds distinctly local — not generic fantasy.",
      "Each NPC name should have an unusual phonetic texture. Avoid Kael, Zara, Theron, Vane, Kane, Drake, Stone, Grey, Ash, Cole, and similar overused patterns.",
      "Give each NPC a short street name or title that hints at their role — invent an original one, do not reuse common examples.",
      "Use names that suggest a specific cultural or ethnic origin consistent with the setting.",
      "Each NPC should have a name that is easy to say aloud at a gaming table.",
    ];
    const chosenNamingStyle =
      namingStyles[Math.floor(Math.random() * namingStyles.length)];
    const chosenNpcStyle =
      npcNamingStyles[Math.floor(Math.random() * npcNamingStyles.length)];
    const varianceSeed = Math.floor(Math.random() * 99991) + 10;

    if (options.useAI !== false) {
      try {
        const themeVoice: Record<string, string> = {
          "Classic Fantasy":
            "medieval fantasy — guilds, nobles, arcane orders, political intrigue in a world of swords and sorcery",
          "Cyberpunk / Corporate":
            "near-future cyberpunk — megacorporations, street gangs, hackers, corporate espionage, neon-lit dystopia",
          "Vampire / Gothic Noir":
            "gothic horror — vampire covens, inquisitions, decadent aristocracy, forbidden rites, candlelit conspiracies",
          "Sci-Fi / Space Opera":
            "science fiction space opera — stellar federations, alien factions, interstellar trade, colony politics, advanced technology",
          "Modern Conspiracy":
            "modern-day thriller — intelligence agencies, secret societies, corporate conspiracies, hidden influence networks",
          "Post-Apocalyptic":
            "post-apocalyptic survival — scavenger tribes, wasteland cults, resource wars, collapsed civilisation, desperate factions",
        };
        const voice = themeVoice[theme] ?? "tabletop RPG";

        const systemInstruction = `You are an expert RPG campaign writer specialising in ${voice}. You generate detailed, original faction drafts for that setting in JSON format.

OUTPUT FORMAT — return ONLY a valid JSON object, no markdown fences:
{
  "title": "Faction name (follow the naming directive in the user message)",
  "summary": "One sentence: what this faction is and what makes them interesting (e.g. 'A sanitation cult-technocracy that controls clean water in a poisoned city.').",
  "content": "Markdown. Use exactly these four section headers in order: '### What they control', '### What they want', '### Why they are dangerous', '### How to use them at the table'. Each section: 2-4 tight sentences. Include campaign context if provided.",
  "lore": "Markdown. Use EXACTLY this structure with ### headers and '- **Label**: Value' list items:\\n### At the Table\\n- **Base**: specific named location\\n- **Resource**: what they control that others need\\n- **Symbol**: identifying mark or emblem\\n- **Secret**: hidden truth that would destroy them\\n- **Immediate Hook**: one-sentence GM hook\\n### Notable NPCs\\n- **Name**: one-line description (2-3 NPCs)\\n### Internal Conflict\\none paragraph\\n### Rival Faction\\n- **Name**: one-line rivalry",
  "labels": ["2-5 lowercase tags for the faction's theme and activities, plus 'rpg-faction', 'faction-generator', 'imported-draft'"]
}

QUALITY RULES:
- Every generation must feel like a completely different faction — avoid repeating names, concepts, or structures from prior outputs.
- Avoid generic RPG naming clichés (no 'Gilded Ledger', 'Iron Brotherhood', 'Shadow Hand', etc.).
- NPC names must feel culturally specific and phonetically varied — do NOT use Kael, Zara, Theron, Vane, Kane, Drake, Stone, Grey, Ash, Cole, Maren, Cross, Vale, or common English monosyllable surnames.
- Place names (bases, districts, landmarks) must be specific and invented — never use 'the old district', 'the lower city', or other generic geography. Every location should have a proper name.
- Before finalising, silently critique for: name originality, internal consistency (NPCs don't contradict each other), logical alignment between public face and secret agenda. Rewrite if issues found.`;

        const userMessage = `Generate a faction. Variation seed: ${varianceSeed}.
- Theme/Genre: ${theme}
- Faction Type: ${factionType}
- Scope: ${scope}
- Moral Posture: ${alignment}${campaignContext ? `\n- Campaign Context: ${campaignContext}` : ""}
- Faction Naming Directive: ${chosenNamingStyle}
- NPC Naming Directive: ${chosenNpcStyle}`;

        const model = await this.clientManager.getModel(
          "",
          "gemini-3.1-flash-lite",
          systemInstruction,
        );
        const response = await model.generateContent(userMessage);
        const text = response.response.text().trim();
        const cleanText = text
          .replace(/^```json\s*/i, "")
          .replace(/```$/, "")
          .trim();
        const data = JSON.parse(cleanText);

        return {
          type: "faction",
          title: data.title || name,
          summary: data.summary || "",
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

    const summary = `A ${alignment.toLowerCase()} ${factionType.toLowerCase()} operating at the ${scope.toLowerCase()} level.`;

    const content = `### What they control
${name} is a ${factionType.toLowerCase()} with a firm grip on key resources across the ${scope.toLowerCase()}. Their reach is felt in every trade deal, guarded rumor, and carefully placed favor.${campaignContext ? ` In ${campaignContext}, they already have fingers in the most contested disputes.` : ""}

### What they want
${goal} Every action the faction takes, however charitable it appears, serves this underlying drive.

### Why they are dangerous
${conflict} Beyond their internal tensions, they will negotiate before striking — but they do not forget.

### How to use them at the table
Bring ${name} into play when the party needs leverage, pressure, a sponsor, or a rival who can operate in daylight. They reward players who deal in favors and punish those who make public enemies.`;

    const lore = `### At the Table
- **Base**: ${this.factionBase(factionType)}
- **Resource**: ${this.factionResource(factionType)}
- **Symbol**: ${name.split(" ")[0]} iconography worn by inner-circle members
- **Secret**: ${conflict}
- **Immediate hook**: ${hook}

### Notable NPCs
- **${leader}**: Public face who insists every deal serves the common good.
- **${agent}**: Field operative who knows where the faction buries its failures.

### Internal Conflict
${conflict}

### Rival Faction
${rival} is pursuing the same influence, relic, or route — and will reach it first if the party does nothing.`;

    return {
      type: "faction",
      title: name,
      summary,
      content,
      lore,
      labels: ["rpg-faction", "faction-generator", "imported-draft"],
      status: "active",
    };
  }

  /**
   * Generates a vampire clan draft.
   */
  async generateVampireClan(
    options: {
      archetype?: string;
      bloodline?: string;
      feedingHabit?: string;
      weakness?: string;
      scope?: string;
      alignment?: string;
      campaignContext?: string;
      useAI?: boolean;
    } = {},
  ): Promise<GeneratorOutput> {
    const archetype =
      options.archetype ||
      vampireConfig.archetypes[
        Math.floor(Math.random() * vampireConfig.archetypes.length)
      ];
    const bloodline =
      options.bloodline ||
      vampireConfig.bloodlines[
        Math.floor(Math.random() * vampireConfig.bloodlines.length)
      ];
    const feedingHabit =
      options.feedingHabit ||
      vampireConfig.feedingHabits[
        Math.floor(Math.random() * vampireConfig.feedingHabits.length)
      ];
    const weakness =
      options.weakness ||
      vampireConfig.weaknesses[
        Math.floor(Math.random() * vampireConfig.weaknesses.length)
      ];
    const scope =
      options.scope ||
      vampireConfig.scopes[
        Math.floor(Math.random() * vampireConfig.scopes.length)
      ];
    const alignment =
      options.alignment ||
      vampireConfig.alignments[
        Math.floor(Math.random() * vampireConfig.alignments.length)
      ];
    const campaignContext = options.campaignContext?.trim();

    // Surnames/houses/covenants for vampires
    const prefixes = ["House ", "The ", "Covenant of ", "Order of ", "Clan "];
    const roots = [
      "Dracul",
      "Karnstein",
      "Von Carstein",
      "Orlok",
      "Bathory",
      "Tepes",
      "Morbius",
      "Sanguis",
      "Vargo",
      "Ruthven",
    ];
    const name =
      prefixes[Math.floor(Math.random() * prefixes.length)] +
      roots[Math.floor(Math.random() * roots.length)];

    if (options.useAI !== false) {
      try {
        const prompt = `Generate a detailed RPG vampire clan/faction in JSON format.
Options:
- Name: ${name}
- Clan Archetype: ${archetype}
- Bloodline: ${bloodline}
- Feeding Habit: ${feedingHabit}
- Clan Weakness: ${weakness}
- Scope of Influence: ${scope}
- Moral Posture: ${alignment}
${campaignContext ? `- Campaign Context: ${campaignContext}` : ""}

You must return a valid JSON object matching the following structure exactly:
{
  "title": "A single string for the vampire clan/house name",
  "content": "A detailed multi-paragraph overview (markdown formatted) describing its history, public facade in mortal society, dark haven, and how it fits the campaign context if provided.",
  "lore": "Structured GM details (markdown formatted) with sections for core fields, bloodline traits, feeding habits, weakness, dark agenda, internal conflict, notable NPCs, rival faction, and adventure hook.",
  "labels": ["rpg-faction", "vampire-clan", "imported-draft"]
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
            : ["rpg-faction", "vampire-clan", "imported-draft"],
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
      vampireConfig.goals[
        Math.floor(Math.random() * vampireConfig.goals.length)
      ];
    const conflict =
      vampireConfig.conflicts[
        Math.floor(Math.random() * vampireConfig.conflicts.length)
      ];
    const hook =
      vampireConfig.hooks[
        Math.floor(Math.random() * vampireConfig.hooks.length)
      ];
    const rival = `${this.generateName()} Inquisition`;
    const sire = this.generateName();
    const thrall = this.generateName();

    const content = `### Overview
${name} is a powerful vampire clan of the ${bloodline.toLowerCase()} lineage, operating as a ${archetype.toLowerCase()} across ${scope.toLowerCase()}. They hide their predatory activities behind a carefully crafted mortal facade, manipulating events from the dark.

${campaignContext ? `### Campaign Fit\nUse ${name} in ${campaignContext}. Their influence should touch the local halls of power, forgotten catacombs, or ongoing dark mysteries.\n` : ""}

### Public Facade
To the mortal world, members of ${name} present themselves as wealthy philanthropists, eccentric scholars, or influential patrons. Very few suspect that behind this elegant mask lies a highly organized coven of undead hunters.

### Table Use
Introduce ${name} when the party enters high-society intrigue, investigates occult occurrences, or needs a powerful but dangerous ally who demands blood or secrets as currency.`;

    const lore = `### GM Reference Information
- **Faction Type**: Vampire Clan (${archetype})
- **Bloodline**: ${bloodline}
- **Scope**: ${scope}
- **Moral Posture**: ${alignment}
- **Feeding Habit**: ${feedingHabit}
- **Clan Weakness**: ${weakness}
- **Entity Type**: Faction

### Dark Agenda
${goal}

### Internal Conflict
${conflict}

### Notable NPCs
- **Sire ${sire}**: The ancient leader of the clan who has survived centuries of inquisitions and power struggles.
- **Thrall ${thrall}**: A high-ranking mortal puppet who manages the clan's daytime assets and legal matters.

### Rival Faction
The ${rival} seeks to expose, purge, or take control of the secrets and assets held by ${name}.

### Adventure Hook
${hook}`;

    return {
      type: "faction",
      title: name,
      content,
      lore,
      labels: ["rpg-faction", "vampire-clan", "imported-draft"],
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
          "gemini-3.1-flash-lite",
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
          "gemini-3.1-flash-lite",
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
          "gemini-3.1-flash-lite",
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
    const count = Math.max(1, parseInt(options.count || "5", 10) || 5);
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
  "content": "A brief lead sentence describing the naming style, followed by a markdown list of all ${count} names. Format each name as '- **Name**: one-sentence flavour note'.",
  "lore": "GM notes (markdown formatted) with sections for Culture, Style, and Usage Suggestions covering how to use these names in a campaign.",
  "labels": ["fantasy-name", "name-generator", "imported-draft"]
}
Return only the JSON object. Do not include markdown code block formatting like \`\`\`json.`;

        const model = await this.clientManager.getModel(
          "",
          "gemini-3.1-flash-lite",
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
    const nameList = generated.map((n) => `- ${n}`).join("\n");

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
