import type { AnswerConfigInput } from "../schema";

export const whatTtrpgShouldIUseForAFantasyDungeonCrawl: AnswerConfigInput = {
  slug: "what-ttrpg-should-i-use-for-a-fantasy-dungeon-crawl",
  category: "getting-started",
  publishedAt: "2026-09-17",
  question: "What TTRPG should I use for a fantasy dungeon crawl?",
  kind: "comparison",
  shortAnswer:
    "There is no single best system for fantasy dungeon crawling: the right pick depends on the crawl your group wants. For fast, dangerous old-school exploration with modern rules, Shadowdark; for gonzo magic and lethal funnel play, Dungeon Crawl Classics; for a game where the dungeon itself is the whole campaign, His Majesty the Worm; for very light, improvisable play, EZD6; for grim, stylish doom, Mörk Borg; and for tactical combat with deep character builds, Pathfinder Second Edition or D&D itself. Systems named here belong to their publishers; naming one is not an endorsement of Codex Cryptica by that publisher, or the reverse.",
  sections: [
    {
      kind: "prose",
      heading: "Start from the dungeon you want, not the system you know",
      paragraphs: [
        "Most groups asking this question know D&D, so they picture heroic characters, balanced encounters, and spells that behave. That is one kind of dungeon crawl, and several games below deliberately produce a different one: expeditions measured in torches rather than hit points, magic that scars the caster, or parties where half the characters die before reaching first level. The engine decides which of those evenings you get, so match it to the crawl before comparing rulebooks.",
        "The comparison points that actually separate these games are practical: how long a fight takes, how often characters die, how heavy the rules feel at the table, whether roles come from classes or from looser archetypes, how magic behaves when it goes wrong, and how much prep the GM carries. Work through those with the group first and the list below narrows fast.",
      ],
    },
    {
      kind: "list",
      heading: "If you want...",
      intro:
        "Each of these produces a different kind of dungeon. Find the row that describes your group's best evenings.",
      items: [
        {
          term: "Fast, dangerous old-school exploration",
          text: "Shadowdark. Kelsey Dionne's streamlined old-school system runs on familiar d20 bones with modern pacing, and its signature real-time torch timer turns light itself into the expedition clock: torches burn down in actual minutes, so dithering costs something tangible. Pick this when the group wants recognisable classes and genuine peril without rules overhead.",
        },
        {
          term: "Gonzo magic and glorious lethality",
          text: "Dungeon Crawl Classics. Goodman Games' system starts every campaign with the 0-level funnel, where each player runs several fragile peasants and the survivors become the party. Wizards fuel spells with spellburn, sacrificing their own strength for power, warriors improvise Mighty Deeds instead of picking feats off a list, and Luck is a spendable stat. Expect wild swings and memorable deaths.",
        },
        {
          term: "The dungeon as the entire campaign",
          text: "His Majesty the Worm. Josh McCrowell's game is built around one sprawling megadungeon: tarot cards replace dice for resolution, and food, hunger, light, and inventory management sit at the centre of play rather than in an appendix. This is the pick when the group wants crawling itself, with its routines and small daily moments, to carry the campaign.",
        },
        {
          term: "Very light, fast, easy to improvise",
          text: "EZD6. DM Scotty's system pools plain six-sided dice with boons and banes, replaces hit points with strikes, and gives players karma to spend when it matters. Nine hero paths cover the classic archetypes with almost no onboarding. The trade is depth: there is little here for players who enjoy optimising builds between sessions.",
        },
        {
          term: "Grim, stylish, apocalyptic doom",
          text: "Mörk Borg. The Stockholm Kartell game pairs a rules-light d20 core with optional classes and Omens that let players turn bad luck into something slightly better. The setting is actively ending, which gives every delve a last-days charge no encounter table can fake. Groups that want hope and heroism should look elsewhere.",
        },
        {
          term: "Tactical combat and deep character builds",
          text: "Pathfinder Second Edition or D&D itself. When the group wants grid-based set-piece fights, strongly defined classes, tank-and-healer party roles, and long build arcs, the heavier systems earn their weight. Accept the cost honestly: slower combat, more prep, and rules lookups as a regular feature of play.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "I like D&D, but want something different",
      paragraphs: [
        "The easiest jump keeps what the group already enjoys. If that is classes, party roles, and d20 combat, Shadowdark preserves all three while cutting the rules weight and raising the stakes; the table learns it in an evening. If the draw is fast rulings and zero prep rather than familiar structure, EZD6 is the lighter break, with hero paths standing in for classes.",
        "Dungeon Crawl Classics asks for more adjustment and repays it: the funnel resets everyone's expectations in the first session, because nobody arrives attached to a build. Whatever the group picks, keep one honest conversation for session zero: how the new game handles character death, since every system above except the tactical pair kills characters faster than D&D players usually expect.",
      ],
    },
    {
      kind: "prose",
      heading: "Magic, mana pools and improvised casting",
      paragraphs: [
        "Dungeon-crawl magic splits the same way. Some tables want spells that behave: known lists, fixed costs, reliable outcomes. Others want magic that bends, backfires, or answers to the location, like mana pools where casting grows stronger or more chaotic. Decide which appetite the group has before choosing, because the systems sit at opposite ends.",
        "For bending magic, Dungeon Crawl Classics is the natural home: spellburn already trades the caster's body for power, so house rules like volatile mana pools slot straight into logic the game teaches. EZD6 absorbs the same kind of improvisation through karma and its creativity-first stance. Shadowdark and Mörk Borg keep casting leaner and grimmer, which suits tables that want magic rare and costly rather than flexible. Match the house rule to the engine that already thinks that way.",
      ],
    },
    {
      kind: "example",
      heading: "Two groups leaving D&D, two different right answers",
      paragraphs: [
        "Two groups of former D&D players ask the same question and land on different systems, which is exactly the point.",
      ],
      items: [
        {
          term: "The tacticians",
          text: "Five players with painted miniatures, strong opinions about builds, and a group chat full of feat combinations. Their best evenings are long set-piece battles with terrain, positioning, and close calls. Faster, lighter systems would take away the part they like most. They pick Pathfinder Second Edition.",
        },
        {
          term: "The time-poor improvisers",
          text: "Four players with a two-hour weekly slot, a GM who preps on the train, and nobody willing to read a thick rulebook. Their best evenings are fast delves with real tension, every character choice made at the table. They run a first Shadowdark delve, lose two characters, and laugh about both.",
        },
        {
          term: "Why it works",
          text: "Neither group ranked systems against each other; each matched a system's default dungeon to evenings they already enjoy. The tacticians get the crunch they find fun, the improvisers get peril without homework, and both keep crawling instead of fighting their rules.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Before you commit to a system",
      intro: "Work through these with the group before buying rulebooks:",
      items: [
        "Run a first delve, ideally a funnel or starter set, before committing to a campaign; lethality and pacing show up in play, not in reviews.",
        "Check who is willing to run it and how much prep they will actually do, since these systems range from train-ride prep to serious planning.",
        "Agree on character death explicitly: how often it happens, how replacements arrive, and whether anyone at the table will hate it.",
        "Decide what magic should feel like: reliable tools, dangerous bargains, or grim rarity, and pick the engine that already leans that way.",
        "Confirm the practical constraints: budget for books, virtual tabletop support, and how much rules-teaching the group will tolerate.",
      ],
    },
  ],
  systemsThatSupportThis: [
    {
      system: "Shadowdark RPG",
      rationale:
        "Old-school crawling procedures built around a real-time torch timer and streamlined d20 resolution.",
      href: "https://www.thearcanelibrary.com/pages/shadowdark",
    },
    {
      system: "Dungeon Crawl Classics",
      rationale:
        "The 0-level funnel, spellburn-fuelled casting, Mighty Deeds combat, and spendable Luck, all aimed at lethal old-school delving.",
      href: "https://goodman-games.com/dungeon-crawl-classics/",
    },
    {
      system: "His Majesty the Worm",
      rationale:
        "A megadungeon-first design with tarot-based resolution and central food, hunger, light, and inventory procedures.",
      href: "https://www.exaltedfuneral.com/products/his-majesty-the-worm",
    },
    {
      system: "EZD6",
      rationale:
        "d6 pool resolution with boons and banes, strikes instead of hit points, and karma, built for fast improvised play.",
      href: "https://runehammergames.com/",
    },
    {
      system: "Mörk Borg",
      rationale:
        "A rules-light d20 core with optional classes and Omens that salvage failed rolls, inside a setting that makes every delve feel final.",
      href: "https://morkborg.com/",
    },
  ],
  codexConnection: {
    heading: "Stock the dungeon once the system is chosen",
    paragraphs: [
      "Once the group has picked its engine, the remaining work is the dungeon itself: levels with more than one route, puzzles with several solutions, monsters with motives, and treasure with strings attached. Codex Cryptica's generators produce these as linked material rather than isolated prompts, so a dungeon, its factions and its rumours can reference each other from the first delve.",
      "That material is system-neutral, so it survives a change of system: if the group tries one engine for six delves and then moves the same campaign to another, the dungeon, its inhabitants and their grudges carry over unchanged.",
    ],
    linkText: "Generate a dungeon for your crawl",
    href: "/generators/dungeon-generator",
  },
  relatedTools: [
    {
      title: "Dungeon Generator",
      description:
        "Multi-route dungeon levels with inhabitants, tricks, and treasure that has strings attached.",
      href: "/generators/dungeon-generator",
    },
    {
      title: "Puzzle Generator",
      description:
        "Puzzles with several solutions, fail-forward consequences, and scaling notes for any level.",
      href: "/generators/puzzle",
    },
    {
      title: "Encounter Generator",
      description:
        "Set-piece fights and wandering threats tuned to the crawl's lethality.",
      href: "/generators/encounter",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for D&D",
      description:
        "For groups comparing against the system they already know before switching.",
      href: "/for/dungeons-and-dragons",
    },
  ],
  relatedAnswers: [
    "what-rpg-system-should-we-try-instead-of-dnd",
    "how-do-you-build-a-point-crawl-for-an-rpg",
    "how-do-you-design-rpg-puzzles-that-do-not-stall-the-game",
  ],
  discovery: {
    id: "answer-dungeon-crawl-system-selection",
    parentCluster: "rpg-system-selection",
    clusters: ["rpg-system-selection"],
    primaryIntent: "choose a tabletop rpg system for a fantasy dungeon crawl",
    intentAliases: [
      "best rpg systems for dungeon crawling",
      "what ttrpg for a dungeon crawl",
      "what ttrpg should i use for a fantasy dungeon crawl",
      "rpg like dnd but simpler for dungeon crawls",
      "old-school dungeon crawl rpg",
      "shadowdark vs dungeon crawl classics",
    ],
    uniqueValue:
      "Matches six mechanically distinct systems to the dungeon experience each produces, so a group picks by lethality, crunch, and magic style rather than by popularity.",
    userJob: "evaluate",
    relatedIntents: [
      "answer-space-opera-system-selection",
      "answer-system-selection",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-space-opera-system-selection",
        reason:
          "Sibling vibe-to-system chooser for colourful space opera; this page owns dungeon-crawl system choice and links across rather than repeating the pattern.",
      },
    ],
  },
  seo: {
    title:
      "What TTRPG should I use for a fantasy dungeon crawl? | Codex Cryptica",
    description:
      "Match the system to your dungeon: fast old-school delves, gonzo funnel play, megadungeon campaigns, rules-light improv, grim doom or tactical combat.",
    image:
      "https://assets.codexcryptica.com/og/what-ttrpg-should-i-use-for-a-fantasy-dungeon-crawl.jpg",
    imageAlt:
      "Adventurers with burning torches descending into a vast torch-lit dungeon hall, dice on the table",
  },
};
