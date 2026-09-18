import type { AnswerConfigInput } from "../schema";

export const whatRpgSystemIsGoodForSoloPlay: AnswerConfigInput = {
  slug: "what-rpg-system-is-good-for-solo-play",
  category: "getting-started",
  publishedAt: "2026-09-17",
  question: "What RPG system is good for solo play?",
  kind: "comparison",
  shortAnswer:
    "The best RPG for solo play depends less on genre than on how you want the game to feel mechanically. If you want narrative momentum driven by quest vows and built-in oracles, Ironsworn provides the most cohesive dedicated engine. If you prefer procedural dungeon crawling without story writing, your choice scales by mechanical crunch: Four Against Darkness offers light party survival, 2D6 Dungeon adds character depth, D100 Dungeon delivers crunchy simulation with optional overland hexcrawling, and Ker Nethalas provides dark atmospheric survival in a vast necropolis. Players wanting the feel of a traditional RPG with built-in solo support can look to tactical systems such as Riftbreakers Second Edition or the sci-fi derelict horror of Across a Thousand Dead Worlds, while those wishing to run classic old-school modules alone can use Scarlet Heroes as a dedicated solo engine or as an overlay for sandbox systems like Worlds Without Number. Systems named here belong to their respective publishers; mentioning one is not an endorsement of Codex Cryptica by that publisher, or the reverse.",
  sections: [
    {
      kind: "list",
      heading: "Choose by mechanical feel and play style",
      intro:
        "Recommendations expanded following feedback from experienced solo players. Match your system to the specific cognitive and mechanical work you want to do at the table:",
      items: [
        {
          term: "Light procedural dungeon crawl",
          text: "Four Against Darkness. Control a party of four classic adventurers rolling on tables for room shapes, monsters, and loot. Fast, pen-and-paper resource management with minimal narrative interpretation.",
        },
        {
          term: "Deeper procedural crawl with character progression",
          text: "2D6 Dungeon. A dedicated single-character dungeon crawler offering greater mechanical weight, tactical grid combat, and steady equipment levelling without requiring an oracle.",
        },
        {
          term: "Crunchy simulation crawl with overland exploration",
          text: "D100 Dungeon. A detailed percentile dungeon crawl featuring item damage, tracking tracks, and extensive loot tables. The Adventurers Companion expansion extends this engine into overland hexcrawling.",
        },
        {
          term: "Atmospheric survival horror in a necropolis",
          text: "Ker Nethalas: Into the Necropolis. A dark, doom-laden dungeon crawl focusing on scavenging, stealth, and tense survival rules in an endless subterranean domain.",
        },
        {
          term: "Narrative questing driven by sworn vows",
          text: "Ironsworn. A dedicated solo and co-op fantasy engine combining action rolls with narrative complications and momentum. To add structured site expeditions into ruined strongholds, combine it with the Ironsworn: Delve expansion. For space exploration with the same core philosophy, play Starforged, which also pairs with the Sundered Isles expansion for age-of-sail seafaring.",
        },
        {
          term: "Traditional RPG mechanics with built-in solo tools",
          text: "Riftbreakers Second Edition or Across a Thousand Dead Worlds. For high fantasy with tactical combat and guild contracts, Riftbreakers provides built-in oracles and dungeon generation on a traditional chassis. For grim sci-fi horror exploring alien derelicts, Across a Thousand Dead Worlds delivers tactical action-point combat, alien discovery tables, and solo AI procedures. Far-future feudal space opera can look to Machine Gods of the Noxian Expanse on a lighter rules chassis, while Choir of Flesh offers grotesque medieval survival horror.",
        },
        {
          term: "Solo old-school d20 adventures and OSR modules",
          text: "Scarlet Heroes. Designed specifically to run classic TSR-era and OSR adventures with a single heroic character using an ingenious damage conversion mechanic. It includes complete urban, wilderness, and dungeon solo oracles, and serves as an ideal solo translation overlay for Kevin Crawford's wider Sine Nomine sandbox games such as Worlds Without Number or Stars Without Number (which contain brilliant GM worldbuilding tools but lack built-in solo engines of their own).",
        },
        {
          term: "Running your existing favourite group RPG alone",
          text: "Mythic Game Master Emulator Second Edition. An external oracle engine rather than a standalone game. It layers fate charts, chaos factors, and meaning tables over any existing ruleset, adjudicating the world while you resolve actions using your chosen system.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "The four styles of solo play",
      paragraphs: [
        "Solo RPGs are often sorted by setting, but setting matters far less than what the rules ask you to do between rolls. The primary distinction lies across four mechanical styles: procedural dungeon crawlers, narrative vow engines, traditional RPGs with built-in solo toolsets, and external oracle emulators.",
        "Procedural crawlers such as Four Against Darkness, 2D6 Dungeon, and D100 Dungeon treat the game as an unfolding tactical puzzle. You roll dice to map rooms, generate threats, and manage consumables. There is little creative writing required; the joy comes from outlasting the dungeon's maths. Adding atmospheric identity, as in Ker Nethalas, layers survival dread over the procedural loop without changing its hands-on mechanical nature.",
        "Narrative-first games such as Ironsworn ask for creative interpretation. When you roll a weak hit, the rules demand a fiction-first consequence: your shield splinters, your mount bolts, or a guard hears your boots. This loop thrives on interpretive energy, keeping your focus on personal drama rather than inventory spreadsheets.",
        "Traditional games with built-in solo tools (such as Riftbreakers 2e and Across a Thousand Dead Worlds) and OSR bridges (like Scarlet Heroes) fill the middle ground. They retain familiar character sheets, combat grids, and tactical abilities, but integrate automated enemy behaviour and prompt tables directly into the rulebook so you never need to invent a separate GM emulator.",
      ],
    },
    {
      kind: "prose",
      heading: "Adapting existing games vs dedicated solo engines",
      paragraphs: [
        "Many players begin solo gaming hoping to run their favourite multiplayer game, such as Dungeons & Dragons, Call of Cthulhu, or Pathfinder. Doing so requires an emulator like Mythic GME Second Edition, which functions as an impartial referee answering questions with probability dice. While this gives you total freedom over setting and system, it requires juggling two jobs: playing your character and adjudicating the world.",
        "By contrast, dedicated solo designs combine adjudication and resolution into one action. In Ironsworn, a combat roll simultaneously determines whether you inflict harm and what the enemy does in response. In Scarlet Heroes, a built-in fray die allows a single first-level hero to survive encounters written for an entire four-player party without altering the published adventure module. If you find yourself burning out from tracking multiple character sheets and consultation tables simultaneously, switch to a game engineered specifically for a single mind.",
        "Similarly, renowned sandbox toolkits like Sine Nomine's Worlds Without Number or Stars Without Number are legendary for their system-neutral faction rules and GM tables, but they are written for group play. Experienced solo players pair them with Scarlet Heroes or Mythic to provide the moment-to-moment solo engine while the Without Number tables generate the overarching world.",
      ],
    },
    {
      kind: "example",
      heading: "Matching mechanical appetite to player energy",
      paragraphs: [
        "Three solo players with identical budgets but completely different cognitive limits after a long working week.",
      ],
      items: [
        {
          term: "The tired tactician",
          text: "Wants to roll dice, draw a dungeon corridor on graph paper, and fight monsters without writing dialogue or interpreting abstract prompts. After struggling to stay engaged with prompt-based journalling, they picked up 2D6 Dungeon and later D100 Dungeon. The structured room tables, weapon tracks, and tactical combat gave them an immediate mechanical game loop that required zero creative writing.",
        },
        {
          term: "The heroic storyteller",
          text: "Wants a campaign with emotional stakes, personal oaths, and evolving relationships. They started with Ironsworn, swearing an iron vow to find a stolen relic. When a perilous expedition took them underground, they used the Ironsworn: Delve expansion to generate thematic hazards and discoveries, finishing a three-session story arc with a vivid narrative log.",
        },
        {
          term: "The classic module explorer",
          text: "Wants to play classic B/X and OSR dungeon modules from their shelf without controlling a four-character party or altering module stats. They used Scarlet Heroes as an overlay. The game's damage conversion rules and built-in urban and dungeon oracles let their lone thief explore an old TSR adventure module smoothly in two-hour evening sessions.",
        },
        {
          term: "Why it works",
          text: "None of these players asked what the most popular solo game was on social media. They diagnosed what kind of work they wanted the system to perform: procedural generation, fiction-first momentum, or classic module adaptation.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Evaluating a solo RPG before you buy",
      intro:
        "Run through these mechanical questions to select the right system for your play habits:",
      items: [
        "Determine your writing appetite: if turning abstract word pairs like 'defiant shadow' into scenery sounds tiring, pick a procedural crawler with concrete result tables.",
        "Check party size requirements: games requiring you to pilot four distinct tactical characters increase mental overhead drastically compared to single-protagonist designs.",
        "Verify built-in vs emulator requirements: confirm whether the rulebook contains its own oracles and reaction tables, or whether you will need an external tool like Mythic GME.",
        "Distinguish base games from expansions: ensure you have the required foundation, such as Ironsworn for the Delve site-crawling supplement, or Starforged for the Sundered Isles seafaring rules.",
        "Consider atmospheric weight: games like Ker Nethalas and Across a Thousand Dead Worlds bring deliberate survival horror and bleak tones that feel very different from heroic fantasy.",
        "Start with focused scopes: pick a system that supports a tight introductory quest or a single five-room delve before attempting a sprawling multi-sector campaign.",
      ],
    },
  ],
  systemsThatSupportThis: [
    {
      system: "Ironsworn",
      rationale:
        "An integrated solo engine with sworn vows, momentum tracks, and thematic oracle tables resolving narrative complications in a single roll.",
      href: "https://tomkinpress.com/pages/ironsworn",
    },
    {
      system: "Four Against Darkness",
      rationale:
        "A procedural solo dungeon-crawling engine using deterministic dice tables for map generation, monster encounters, and resource tracking to minimise interpretation overhead.",
      href: "https://www.drivethrurpg.com/product/180588/Four-Against-Darkness",
    },
    {
      system: "Scarlet Heroes",
      rationale:
        "A dedicated solo OSR engine featuring a fray die and damage conversion table to run standard TSR-era modules with a single character.",
      href: "https://www.drivethrurpg.com/product/127180/Scarlet-Heroes",
    },
    {
      system: "Ker Nethalas: Into the Necropolis",
      rationale:
        "A dark solo dungeon-crawling ruleset combining procedural room generation with tense stealth, domain exploration, and survival horror mechanics.",
      href: "https://blackoathentertainment.com/",
    },
    {
      system: "2D6 Dungeon",
      rationale:
        "A classic solo dungeon crawl using 2d6 tables, tactical grid combat, and detailed character sheet levelling.",
      href: "https://drgames.co.uk/",
    },
    {
      system: "Across a Thousand Dead Worlds",
      rationale:
        "A sci-fi horror solo game featuring tactical action-point combat, alien derelict exploration, and automated enemy behaviour tables.",
      href: "https://blackoathentertainment.com/",
    },
    {
      system: "Mythic Game Master Emulator Second Edition",
      rationale:
        "A standalone oracle system using fate questions, a dynamic chaos factor, and meaning tables to emulate GM adjudication for any existing tabletop RPG.",
      href: "https://www.wordmillgames.com/mythic-gme.html",
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
    "what-ttrpg-should-i-use-for-a-fantasy-dungeon-crawl",
    "where-do-i-start-if-i-have-never-played-a-tabletop-rpg",
    "how-much-prep-do-you-need-for-an-rpg-session",
    "how-do-you-track-unresolved-plot-hooks-in-an-rpg-campaign",
    "can-you-play-a-tabletop-rpg-in-30-minute-sessions",
    "what-rpg-feels-like-dnd-but-is-simpler",
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
      "Compares built-for-solo engines, procedural dungeon crawlers across crunch levels, traditional systems with built-in oracles, and emulator overlays by mechanical feel rather than popularity.",
    userJob: "evaluate",
    relatedIntents: [
      "answer-system-selection",
      "answer-dungeon-crawl-system-selection",
      "for-solo-worldbuilding",
    ],
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
      {
        with: "answer-dungeon-crawl-system-selection",
        reason:
          "That page evaluates group systems for fantasy dungeon crawling; this page evaluates systems and emulators specifically for solo play across all genres.",
      },
      {
        with: "answer-simpler-dnd-alternative",
        reason:
          "That page evaluates group systems for simpler fantasy adventure; this page evaluates systems and emulators specifically for solo play.",
      },
    ],
  },
  seo: {
    title: "What RPG system is good for solo play? | Codex Cryptica",
    description:
      "Compare procedural dungeon crawlers, narrative engines, traditional RPGs with built-in oracles, and emulator overlays to find the right solo tabletop RPG for your play style.",
    image:
      "https://assets.codexcryptica.com/og/what-rpg-system-is-good-for-solo-play.jpg",
    imageAlt:
      "A solo tabletop RPG session in progress with open journal, dice, maps and character notes under warm candlelight",
  },
};
