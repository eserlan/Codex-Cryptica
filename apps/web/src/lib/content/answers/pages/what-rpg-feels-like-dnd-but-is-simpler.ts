import type { AnswerConfigInput } from "../schema";

export const whatRpgFeelsLikeDndButIsSimpler: AnswerConfigInput = {
  slug: "what-rpg-feels-like-dnd-but-is-simpler",
  category: "getting-started",
  publishedAt: "2026-09-17",
  question: "What RPG feels like D&D but is simpler?",
  kind: "comparison",
  shortAnswer:
    "If you want a game that preserves the recognisable classes, d20 rolls, and heroic party structure of D&D with a fraction of the rules overhead, Shadowdark is the closest direct match. If you want faster combat with tactile skill checks and reactive defence rolls, Dragonbane provides that heroic fantasy feel on a roll-under d20 engine. For tables wanting near-zero onboarding and rapid improvisation, EZD6 runs on six-sided dice pools without character sheet bookkeeping. Groups wanting classless, equipment-driven play should consider Knave, whilst Cairn strips away dice rolling in combat entirely to focus on clever problem-solving. The right choice depends on which specific part of D&D your table finds burdensome: character sheet complexity, combat duration, or preparation time.",
  sections: [
    {
      kind: "prose",
      heading: "Identify which part of D&D is slowing your table down",
      paragraphs: [
        "When a group says D&D has become too complicated, different people at the table usually mean different things. For a player, complexity often means an eight-page character sheet crowded with situational bonus actions, spell slot trackers, feats, and subclass triggers that require constant cross-referencing. For a Game Master, complexity means multi-hour session preparation, balancing encounter budgets with monster Challenge Ratings, and memorising condition rules across three hardcover manuals.",
        "For the table as a whole, complexity usually shows up as dragging combat. A single skirmish against half a dozen wandering monsters in fifth edition can easily consume two hours of a three-hour session, dominated by movement measuring, saving throws, and decision paralysis. Before picking a replacement system, identify what you actually want to shed: the character sheet accounting, the combat length, or the preparation load. Different games solve different friction points.",
      ],
    },
    {
      kind: "list",
      heading: "Five games that feel like D&D with lighter rules",
      intro:
        "Each of these systems preserves the classic fantasy adventure loop of exploring ruins, fighting monsters, and finding treasure, but each strips away a different layer of mechanical overhead.",
      items: [
        {
          term: "Shadowdark RPG: the cleanest direct translation",
          text: "Kelsey Dionne's system is the closest modern bridge for fifth edition players. It keeps familiar six-ability scores, d20 roll-high checks against difficulty classes, and iconic classes like fighter, wizard, thief, and cleric. It cuts out bloated hit point pools, skill lists, feat trees, and complex action economies. Spells are rolled to cast rather than tracked across spell slots, dying characters have a tight timer, and torches burn down in sixty minutes of real time, returning genuine tension to exploration without adding rules.",
        },
        {
          term: "Dragonbane: tactical, reactive, roll-under fantasy",
          text: "Free League's Swedish fantasy RPG keeps the lighthearted heroic spirit and diverse fantasy ancestries of D&D (including duck-folk and wolfkin alongside humans and elves), but swaps the d20 roll-high system for intuitive roll-under skill checks. Combat is fast and tactical: characters get one main action each round, which they can spend attacking or hold in reserve to dodge or parry incoming blows. Willpower points replace spell slot bookkeeping, and characters advance by using their skills rather than calculating experience points.",
        },
        {
          term: "EZD6: rules-light action with zero homework",
          text: "DM Scotty's EZD6 is engineered for tables that want to sit down and play within ten minutes. Players roll six-sided dice, needing a six to succeed on standard tasks, modified by boons and banes that add or remove dice. Hit points are replaced by three to six strikes, armour saves prevent damage directly, and karma points give players a way to nudge bad rolls. Nine recognisable hero paths cover classic archetypes like skalds, warrioresses, and conjurers, making it ideal for groups fatigued by character optimisation.",
        },
        {
          term: "Knave: classless, inventory-driven d20 play",
          text: "Ben Milton's Knave uses standard d20 mechanics and the six classic ability scores, making it directly compatible with decades of classic fantasy modules. What it removes is the class system: your inventory defines your character. A character holding a spell book can cast magic; a character wearing plate armour is a front-line defender. Because carrying capacity equals your Constitution score, managing gear replaces managing skill lists, and character generation takes under five minutes.",
        },
        {
          term: "Cairn: problem-solving without combat bloat",
          text: "Yochai Gal's Cairn combines the minimalist framework of Into the Odd with classic fantasy flavour. Character generation is classless and takes three minutes. Attacks always hit, dealing straight damage reduced by armour to hit protection, meaning combat is brief, brutal, and treated as a dangerous hazard rather than a board game. When violence is lethal, players solve problems by questioning the environment, negotiating, and preparing clever ambushes rather than cycling through ability cards.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "What you keep and what you leave behind",
      paragraphs: [
        "Switching to a simpler system does not require abandoning the fantasy stories your table loves. All five systems above comfortably run classic dungeon expeditions, wilderness journeys, dragon hunts, and royal court negotiations. Your players still play dwarves swinging battleaxes and wizards slinging fireballs. What you lose is the safety net of mathematical character builds where class features solve obstacles automatically.",
        "In fifth edition, a character sheet is a bundle of pre-packaged permissions: spells like Goodberry remove survival logistics, darkvision removes light management, and high perception scores spot ambushes automatically. In lighter systems, players interact directly with the fiction. Instead of rolling an Investigation check to search a desk, the player specifies that they are tapping the bottom drawer for a false bottom. If your table enjoys tactical board-game optimisation, lighter systems may feel sparse; if your table enjoys clever problem-solving and rapid pacing, they feel liberating.",
      ],
    },
    {
      kind: "example",
      heading:
        "Resolving a dungeon trap: fifth edition versus a lighter system",
      paragraphs: [
        "See how the same mechanical challenge plays out at the table under two different design philosophies.",
      ],
      items: [
        {
          term: "The default approach in fifth edition",
          text: "The party enters a 30-foot stone corridor. The GM checks passive Perception against a DC 15 trap. The rogue's passive score is 16, so the GM tells them they spot tripwires. The rogue declares a Thieves' Tools check, rolls a d20, adds proficiency and Dexterity (+7), and rolls a 12 for a total of 19. The trap is disarmed. The interaction took ninety seconds of sheet reading and dice rolling, but neither the trap mechanism nor the environment required creative input from the players.",
        },
        {
          term: "The streamlined approach in a lighter system",
          text: "The GM describes the corridor: fresh gouges score the flagstones, and tiny iron pipes protrude from the mortar at waist height. The players ask questions: can they see tripwires under torchlight? The GM confirms three thin wires taut against the stones. Rather than rolling a check, the players prop a wooden shield in front of the pipes and snip the nearest wire with a dagger from behind cover. Scything blades strike the oak planks with a deafening crack. The corridor is cleared without a single dice roll.",
        },
        {
          term: "Why it works",
          text: "Removing the abstract skill check moved the game back to the shared imaginary space. The players solved the problem through observation, physical tools, and caution rather than character sheet statistics. When dice rolls are reserved for uncertain, dangerous outcomes rather than routine procedures, the table moves quickly and stays immersed.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Transition checklist for a 5e group",
      intro:
        "Before introducing a simpler RPG to players accustomed to modern D&D, prepare these expectations:",
      items: [
        "Run a one-shot adventure first rather than asking players to commit to an entire campaign in an unfamiliar system.",
        "Explain that low hit points and fewer defensive abilities mean combat is a high-risk encounter, not the default way to solve every problem.",
        "Remind players that their character sheet is an inventory and a quick reference, not a menu of allowable actions.",
        "Encourage players to describe what their characters do in the room rather than asking to roll specific skills.",
        "Keep character generation under fifteen minutes so that early character deaths feel like humorous twists rather than lost investments.",
        "Retain familiar habits where helpful: polyhedral dice, caller or mapper roles, and classic fantasy archetypes help players feel at home immediately.",
      ],
    },
  ],
  systemsThatSupportThis: [
    {
      system: "Shadowdark RPG",
      rationale:
        "Maintains familiar six-stat d20 roll-high checks and classic classes whilst cutting spell slots, bloated hit points, and feat trees.",
      href: "https://www.thearcanelibrary.com/pages/shadowdark",
    },
    {
      system: "Dragonbane",
      rationale:
        "Replaces complex initiative and bonus actions with intuitive roll-under d20 checks and reactive attack-or-dodge combat choices.",
      href: "https://freeleaguepublishing.com/games/dragonbane/",
    },
    {
      system: "EZD6",
      rationale:
        "Replaces numeric modifiers and hit point calculations with d6 dice pools, karma mitigation, and three-strike health.",
      href: "https://runehammergames.com/",
    },
    {
      system: "Knave 2e",
      rationale:
        "Uses compatible d20 ability defence mechanics whilst making item slots define character abilities instead of rigid class lists.",
      href: "https://swordfishislands.com/",
    },
    {
      system: "Cairn",
      rationale:
        "Eliminates combat roll-to-hit checks entirely and uses minimalist slot-based inventory to keep focus on tactical player decisions.",
      href: "https://cairnrpg.com/",
    },
  ],
  codexConnection: {
    heading: "Prepare adventures that work across any fantasy system",
    paragraphs: [
      "The biggest advantage of switching to a simpler fantasy game is that worldbuilding and adventure preparation become dramatically faster. When monsters do not require two-page stat blocks with legendary actions, a Game Master can prep an entire ruin or wilderness trek on an index card.",
      "Codex Cryptica's generators provide system-neutral encounters, dungeon floorplans, and puzzle rooms designed around player-facing obstacles rather than system-specific mathematics. Whether you run your campaign in Shadowdark, Dragonbane, or fifth edition, your factions, locations, and lore remain consistent and portable.",
    ],
    linkText: "Generate an encounter for your table",
    href: "/generators/encounter",
  },
  relatedTools: [
    {
      title: "Encounter Generator",
      description:
        "Tactical skirmishes and environmental threats tuned to your party's appetite for danger.",
      href: "/generators/encounter",
    },
    {
      title: "Dungeon Generator",
      description:
        "Multi-room dungeon maps with inhabitants, traps, and treasure designed for fast exploration.",
      href: "/generators/dungeon-generator",
    },
    {
      title: "Puzzle Generator",
      description:
        "Environmental puzzles with multiple physical solutions that reward player ingenuity over skill checks.",
      href: "/generators/puzzle",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for D&D",
      description:
        "For groups evaluating their current system before transitioning to a lighter alternative.",
      href: "/for/dungeons-and-dragons",
    },
    {
      title: "Codex Cryptica for Fantasy Worldbuilding",
      description:
        "For designing evocative settings, factions, and wilderness regions that suit rules-light fantasy.",
      href: "/for/fantasy-worldbuilding",
    },
  ],
  relatedAnswers: [
    "what-rpg-system-should-we-try-instead-of-dnd",
    "what-ttrpg-should-i-use-for-a-fantasy-dungeon-crawl",
    "what-rpg-system-is-good-for-solo-play",
    "where-do-i-start-if-i-have-never-played-a-tabletop-rpg",
  ],
  discovery: {
    id: "answer-simpler-dnd-alternative",
    parentCluster: "rpg-system-selection",
    clusters: ["rpg-system-selection"],
    primaryIntent:
      "find a tabletop rpg system that feels like dnd but is simpler",
    intentAliases: [
      "what rpg feels like dnd but is simpler",
      "simpler rpg than dnd",
      "rules light alternative to dnd",
      "easy fantasy tabletop rpg",
      "dnd but simpler",
      "fantasy rpg with less rules",
      "beginner friendly alternative to dnd",
      "streamlined dnd alternative",
    ],
    uniqueValue:
      "Compares five distinct tabletop engines (Shadowdark, Dragonbane, EZD6, Knave, and Cairn) against what they preserve from D&D and what rules bloat they shed, providing a concrete conversion framework for existing 5e groups.",
    userJob: "evaluate",
    relatedIntents: [
      "answer-system-selection",
      "answer-dungeon-crawl-system-selection",
      "for-dungeons-and-dragons",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-system-selection",
        reason:
          "That page provides a broad multi-genre framework for groups leaving D&D entirely; this page focuses specifically on fantasy RPGs that preserve the heroic feel, archetypes, and d20-style play of D&D with substantially lighter rules.",
      },
      {
        with: "answer-dungeon-crawl-system-selection",
        reason:
          "That page evaluates systems specifically for dungeon crawling lethality and megadungeons; this page evaluates overall fantasy adventure campaigns that substitute for D&D with simpler rules.",
      },
      {
        with: "answer-space-opera-system-selection",
        reason:
          "That page evaluates systems for over-the-top space opera multiplayer campaigns; this page evaluates rules-light fantasy systems that feel like D&D.",
      },
      {
        with: "answer-solo-rpg-system-selection",
        reason:
          "That page evaluates systems specifically for solitary play; this page evaluates fantasy adventure systems for adventuring groups seeking lighter rules than D&D.",
      },
    ],
  },
  seo: {
    title: "What RPG Feels Like D&D but Is Simpler? | Codex Cryptica",
    description:
      "Find fantasy RPGs that capture the fun of D&D without the rules bloat: compare Shadowdark, Dragonbane, EZD6, Knave, and Cairn with a practical transition guide.",
    image:
      "https://assets.codexcryptica.com/og/what-rpg-feels-like-dnd-but-is-simpler.jpg",
    imageAlt:
      "Open fantasy tabletop RPG rulebook and character sheet with dice on a rustic wooden table in warm lantern light",
  },
};
