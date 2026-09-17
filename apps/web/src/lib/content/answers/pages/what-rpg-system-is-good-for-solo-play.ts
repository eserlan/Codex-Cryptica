import type { AnswerConfigInput } from "../schema";

export const whatRpgSystemIsGoodForSoloPlay: AnswerConfigInput = {
  slug: "what-rpg-system-is-good-for-solo-play",
  category: "getting-started",
  publishedAt: "2026-09-17",
  question: "What RPG system is good for solo play?",
  kind: "comparison",
  shortAnswer:
    "The best RPG for solo play depends on whether you want a narrative game built from the ground up for a lone adventurer, a tactical dungeon crawl driven by procedural tables, a reflective journalling game, or an external emulator that lets you run an existing traditional ruleset alone. For dark fantasy questing with built-in oracle moves, Ironsworn provides the most cohesive dedicated solo engine; for space exploration, Starforged expands that core into starships and planet discovery; for procedural dungeon crawling with four characters and almost zero story interpretation, Four Against Darkness runs as a tactical survival game; for introspective character tragedy, Thousand Year Old Vampire uses structured memory decay; and for running your favourite group RPG alone, Mythic Game Master Emulator Second Edition replaces the GM with probability charts and scene modifiers. Systems named here belong to their respective publishers; mentioning one is not an endorsement of Codex Cryptica by that publisher, or the reverse.",
  sections: [
    {
      kind: "list",
      heading: "If you want...",
      intro:
        "Match the system to the kind of play experience you want at the table, rather than picking by general popularity:",
      items: [
        {
          term: "Narrative fantasy adventure built for a lone hero",
          text: "Ironsworn. Designed entirely around solo and cooperative play, it integrates action resolution, sworn vows, progress tracks, and thematic oracle tables into a single loop. Success with complications and momentum management keep the fiction moving without an external referee.",
        },
        {
          term: "Sci-fi exploration and sector discovery",
          text: "Starforged. Building on the Ironsworn chassis, Starforged adapts the core moves to galactic exploration, derelict salvaging, alien contact, and starship asset cards. It suits players who want long campaign arcs driven by expedition tracks.",
        },
        {
          term: "Tactical dungeon crawling with low narrative interpretation",
          text: "Four Against Darkness. A pen-and-paper dungeon crawl where you control a party of four classic adventurers rolling on dice tables for room shapes, monsters, traps, and treasure. The focus is resource management and tactical survival rather than storytelling.",
        },
        {
          term: "Introspective journalling and character tragedy",
          text: "Thousand Year Old Vampire. A prompt-driven journalling game that tracks a vampire across centuries. As new prompts force you to record fresh experiences, older memories and connections are struck out and forgotten, creating an emotional solo experience with no tactical combat.",
        },
        {
          term: "Playing your favourite traditional RPG alone",
          text: "Mythic Game Master Emulator Second Edition. A dedicated oracle engine rather than a standalone RPG. It layers fate charts, chaos factors, and meaning tables over any existing ruleset, handling world reactions while you resolve actions using your chosen system's dice.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Built for solo vs adapted for solo",
      paragraphs: [
        "The most fundamental split in solo gaming is between games written specifically for a lone player and conventional group games adapted with an oracle or emulator. Dedicated solo systems such as Ironsworn or Thousand Year Old Vampire intertwine action resolution with narrative generation. When you roll dice in Ironsworn, the mechanics simultaneously tell you whether your swing connected and whether a new complication entered the scene. You never leave the game's core rules to consult a separate referee system.",
        "By contrast, adapting a traditional RPG such as D&D, Call of Cthulhu, or Traveller requires two distinct mental gears. Your chosen RPG rules resolve whether your character picks a lock or dodges a bullet, while an oracle emulator such as Mythic GME acts as the GM, answering questions about the environment, NPC attitudes, and unexpected scene interruptions. This separation allows you to play any system you already love, but demands greater discipline: you must manage character sheets and run the world at the same time.",
      ],
    },
    {
      kind: "prose",
      heading: "Narrative interpretation vs procedural generation",
      paragraphs: [
        "Solo systems place different demands on your imagination. Games that rely on abstract word-pair oracles, including Mythic and Ironsworn, generate sparks such as 'oppose tradition' or 'hollow sanctuary'. Turning those prompts into immediate threats, dialogue, or scenery requires creative writing energy. If you sit down exhausted after work, interpreting three consecutive vague oracle results can bring a session to a dead halt.",
        "Procedural systems such as Four Against Darkness remove that interpretive burden by providing concrete results: a corridor contains two wandering skeletons, a locked wooden chest, and an iron portcullis. The cognitive work shifts from creative writing to mechanical puzzle solving. Decide early whether you want an evening spent discovering a story through evocative prompts or testing your party's survival against strict tables and dice.",
      ],
    },
    {
      kind: "example",
      heading: "Two solo players, two different right answers",
      paragraphs: [
        "Two players seeking solo games with contrasting expectations and free time.",
      ],
      items: [
        {
          term: "The narrative explorer",
          text: "A player who wants a focused story about a lone ranger travelling across a grim frontier. They initially tried running a four-character party in a crunchy tactical d20 game with an oracle, but spent forty minutes managing initiative orders and stat blocks for a minor skirmish. Switching to Ironsworn, their vows established clear quest goals, progress tracks replaced monster stat blocks, and every move generated narrative momentum. One character sheet and built-in oracles let them finish a complete scene in forty-five minutes.",
        },
        {
          term: "The tactical dungeon crawler",
          text: "A player who spends all day writing and wants to play a game without doing any creative prose interpretation. They tried a prompt-driven journalling game and felt drained after writing two journal entries. Switching to Four Against Darkness, they drew grid maps, tracked torches, rolled on wandering monster tables, and engaged in quick d6 combat. The strict procedural rules provided tactical satisfaction and genuine surprise without requiring story invention.",
        },
        {
          term: "Why it works",
          text: "Neither player picked the most celebrated title on a forum; they identified where their mental energy lay. The first wanted narrative momentum without multi-character bookkeeping; the second wanted tactile mechanics without story interpretation. Both found an engaging game because their choice matched how much creative effort they wanted to invest.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Before you choose a solo RPG",
      intro:
        "Check these practical constraints before buying books or starting your first campaign:",
      items: [
        "Identify your preferred output: deciding whether you want a handwritten journal, a completed graph of connected clues, or a gridded dungeon map narrows the field immediately.",
        "Assess your creative energy: if turning abstract prompts into fictional scenes sounds exhausting, choose a procedural game with explicit tables over an open-ended oracle.",
        "Start with a single character: piloting an entire four-person party through a conventional RPG while also acting as the GM is the fastest way to burn out on solo play.",
        "Establish a clear inciting goal: an explicit quest or sworn vow keeps oracle answers anchored to something that matters to the character.",
        "Separate play from polished writing: record quick bullet points, sketch maps, and mechanical outcomes during play, rather than stopping the action to draft prose.",
      ],
    },
  ],
  systemsThatSupportThis: [
    {
      system: "Ironsworn",
      rationale:
        "An integrated solo PbtA engine with sworn vows, momentum tracks, and built-in oracle tables that resolve action and narrative complication in a single roll.",
      href: "https://tomkinpress.com/pages/ironsworn",
    },
    {
      system: "Ironsworn: Starforged",
      rationale:
        "Adapts dedicated solo narrative procedures to sci-fi exploration with expedition progress tracks, sector generation tables, and starship asset cards.",
      href: "https://tomkinpress.com/pages/ironsworn-starforged",
    },
    {
      system: "Mythic Game Master Emulator Second Edition",
      rationale:
        "A standalone oracle system using fate questions, a dynamic chaos factor, and meaning tables to emulate GM adjudication for any existing tabletop RPG.",
      href: "https://www.wordmillgames.com/mythic-gme.html",
    },
    {
      system: "Four Against Darkness",
      rationale:
        "A procedural solo dungeon-crawling engine that uses deterministic dice tables for map generation, monster encounters, and loot to eliminate story interpretation overhead.",
      href: "https://www.drivethrurpg.com/product/180588/Four-Against-Darkness",
    },
    {
      system: "Thousand Year Old Vampire",
      rationale:
        "A prompt-driven journalling ruleset that uses escalating historical prompts and strict memory-slot limitations to simulate the psychological decay of an immortal.",
      href: "https://thousandyearoldvampire.com/",
    },
  ],
  codexConnection: {
    heading: "Organise your solo campaign world as you discover it",
    paragraphs: [
      "When playing an RPG solo, you are both the player discovering the world and the archivist tracking its truth. A sudden oracle roll or random table result introduces a new merchant, an unexpected betrayal, or a ruined shrine; within two sessions, keeping track of those improvised discoveries across loose notebook pages becomes difficult. Codex Cryptica gives solo players a structured vault to record NPCs, locations, factions, and rumours as connected entities as soon as they appear.",
      "Codex tools complement any solo ruleset rather than replacing it. Use generators for quick town details, NPC personalities, or local rumours when your system's tables need fresh variety, then connect those elements in your campaign graph to see unresolved threads and faction goals at a glance between sessions.",
    ],
    linkText: "Explore tools for solo worldbuilding",
    href: "/for/solo-worldbuilding",
  },
  relatedTools: [
    {
      title: "Personality Generator",
      description:
        "Quickly flesh out NPC motivations, virtues, and flaws when an oracle introduces an unfamiliar face.",
      href: "/generators/personality",
    },
    {
      title: "Rumour Generator",
      description:
        "Generate local rumours and plot hooks to populate bulletin boards, tavern chatter, or quest leads.",
      href: "/generators/rumour",
    },
    {
      title: "Faction Generator",
      description:
        "Create rival organisations with competing agendas to track world changes between solo adventures.",
      href: "/generators/faction",
    },
    {
      title: "Settlement Generator",
      description:
        "Produce settlements with distinctive problems, authorities, and districts when your adventurer reaches a new haven.",
      href: "/generators/settlement",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for Solo Worldbuilding",
      description:
        "Turn random prompts and oracle answers into connected campaign canon without contradicting yourself.",
      href: "/for/solo-worldbuilding",
    },
  ],
  relatedAnswers: [
    "what-rpg-system-should-we-try-instead-of-dnd",
    "what-rpg-should-i-play-for-an-over-the-top-space-opera",
    "where-do-i-start-if-i-have-never-played-a-tabletop-rpg",
    "how-much-prep-do-you-need-for-an-rpg-session",
    "how-do-you-track-unresolved-plot-hooks-in-an-rpg-campaign",
    "can-you-play-a-tabletop-rpg-in-30-minute-sessions",
  ],
  discovery: {
    id: "answer-solo-rpg-system-selection",
    parentCluster: "rpg-system-selection",
    clusters: ["rpg-system-selection", "solo-rpg"],
    primaryIntent: "what rpg system is good for solo play",
    intentAliases: [
      "best rpg for solo play",
      "tabletop rpg to play alone",
      "solo friendly rpg system",
      "what ttrpg can i play by myself",
      "best fantasy rpg for solo play",
      "rpg with built in solo rules",
      "solo rpg recommendations",
    ],
    uniqueValue:
      "Compares built-for-solo engines, procedural dungeon crawlers, prompt journalling, and external GM emulators by interpretation burden and play experience rather than popularity.",
    userJob: "evaluate",
    relatedIntents: ["answer-system-selection", "for-solo-worldbuilding"],
    acknowledgedOverlap: [
      {
        with: "answer-system-selection",
        reason:
          "That page guides groups leaving D&D across all multiplayer genres; this page evaluates systems specifically designed or adapted for solitary play.",
      },
      {
        with: "answer-space-opera-system-selection",
        reason:
          "That page evaluates systems for over-the-top space opera multiplayer campaigns; this page evaluates systems and emulators across all genres specifically for solitary play.",
      },
    ],
  },
  seo: {
    title: "What RPG system is good for solo play? | Codex Cryptica",
    description:
      "Compare built-for-solo narrative systems, procedural dungeon crawlers, journalling games, and oracle emulators to find the right tabletop RPG to play alone.",
    image:
      "https://assets.codexcryptica.com/og/what-rpg-system-is-good-for-solo-play.jpg",
    imageAlt:
      "A solo tabletop RPG session in progress with open journal, dice, maps and character notes under warm candlelight",
  },
};
