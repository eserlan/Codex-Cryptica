import type { AnswerConfigInput } from "../schema";

export const howDoYouStartWorldbuildingFromScratch: AnswerConfigInput = {
  slug: "how-do-you-start-worldbuilding-from-scratch",
  category: "worldbuilding",
  question: "How do you start worldbuilding from scratch?",
  kind: "framework",
  shortAnswer:
    "To start worldbuilding from scratch without succumbing to prep paralysis, use a bottom-up approach focused on a single local sandbox. Build one functional settlement, establish three competing local factions, place two adventure locations within a half-day trek, and introduce an immediate crisis. Expand the broader continent and ancient history only when player exploration demands it.",
  sections: [
    {
      kind: "prose",
      heading: "The dangerous trap of worldbuilders disease",
      paragraphs: [
        "New creators often begin by sketching continental coastlines, charting pantheons of twenty gods, and detailing five thousand years of royal lineages. While this top-down exercise can be personally satisfying, it rarely benefits your tabletop sessions. Players do not interact with tectonic plates or dynasties from four centuries ago; they interact with the blacksmith who refuses to trade with them, the tax collector demanding silver, and the sinister lights flickering in the nearby woods.",
        "Worldbuilders disease occurs when expansive macro-level lore replaces playable, immediate micro-detail. By starting with a tiny, vivid focal point, you produce material that directly fuels gameplay while leaving room for the larger world to emerge organically during play.",
      ],
    },
    {
      kind: "list",
      heading: "The five-mile local sandbox framework",
      intro:
        "Build outward from a compact starting region using these five manageable components:",
      items: [
        {
          term: "The Home Settlement",
          text: "Design a single village, trading outpost, or frontier fort. Give it a distinct livelihood (such as peat-cutting, salt mining, or sheep farming), one safe inn, and a town leader who is clearly out of their depth.",
        },
        {
          term: "The Immediate Local Crisis",
          text: "Introduce an urgent, tangible problem affecting everyday life: the seasonal supply caravan has vanished, cattle are found drained of blood, or an unseasonable frost has ruined the harvest.",
        },
        {
          term: "Three Conflicting Factions",
          text: "Create three local groups with irreconcilable goals: the embattled mayor trying to keep order, an orthodox religious sect blaming moral failing for the crisis, and a ruthless gang of prospectors taking advantage of the chaos.",
        },
        {
          term: "Two Nearby Adventure Sites",
          text: "Place two distinct destinations within a half-day journey: one active threat (a ruined watchtower occupied by bandits) and one mysterious ruin (a collapsed tomb shrouded in local superstition).",
        },
        {
          term: "One Singular Cultural Quirk",
          text: "Give the region a memorable social custom: perhaps locals never speak aloud after sundown, or they burn lavender on doorsteps to ward off wandering spirits. A single sensory quirk does more to establish mood than a twenty-page history chapter.",
        },
      ],
      outro:
        "These five components supply enough fuel for four to six full sessions of active play.",
    },
    {
      kind: "list",
      heading: "Core elements of the one-page setting canvas",
      intro:
        "Fit your entire initial campaign setting onto a single reference sheet with these four sections:",
      items: [
        {
          term: "The Settlement",
          text: "One primary export, one gathering hall, and three key NPCs. Gives the party a reliable base of operations, supplies, and social roots.",
        },
        {
          term: "The Regional Tension",
          text: "A resource shortage, legal dispute, or religious conflict. Creates natural dialogue options and moral choices for visiting players.",
        },
        {
          term: "The Wild Frontier",
          text: "A treacherous natural barrier: bogs, jagged ridges, or haunted woods. Establishes physical boundaries and survival hazards for travel.",
        },
        {
          term: "The Rumour Table",
          text: "Four local rumours: two completely true, one half-true, and one false. Provides instant player agency and actionable adventure hooks on night one.",
        },
      ],
    },
    {
      kind: "example",
      heading: "Worked scenario: Launching the Drowned Fens",
      paragraphs: [
        "Contrast a sprawling top-down campaign launch against a focused bottom-up local sandbox.",
      ],
      items: [
        {
          term: "The top-down encyclopaedia approach",
          text: "The Game Master spent three weeks writing the history of the Aurelian Empire, listing sixty deities, drawing a continent-spanning hex map, and drafting notes on imperial tax codes. In session one, the party spent two hours asking where they could buy torches and who ran the village tavern, details the Game Master had not prepared.",
        },
        {
          term: "The bottom-up sandbox approach",
          text: "The Game Master prepares a single hamlet: Blackmoss, a community of eel-trappers perched on stilt platforms. The crisis is simple: the lake waters have turned black, and strange, drowned bells ring from the depths at midnight. Three factions vie for control: the Stilt Elder who wants to abandon the village, a travelling inquisitor demanding sacrifices to purify the bog, and an exiled alchemist offering bounties for fresh lake-bottom silt. Two adventure sites lie an hour away: the Sunken Bell-Tower and the Weeping Willow Caves. The table jumps into play immediately.",
        },
        {
          term: "Why it works",
          text: "The party had immediate, tangible problems to investigate and clear social factions to engage with. The Game Master spent forty-five minutes preparing actionable table content rather than three weeks writing irrelevant continental history.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Worldbuilding launch readiness checklist",
      intro:
        "Ensure your setting is game-ready without over-preparing unnecessary background detail:",
      items: [
        "Can a player understand the local situation after a two-minute spoken briefing?",
        "Are there at least three distinct NPCs with opposing motivations whom players can speak to immediately?",
        "Does the starting town have an obvious economic reason for existing in this specific terrain?",
        "Is there a clear, immediate problem that requires capable adventurers to resolve?",
        "Are there multiple destinations on the regional map that offer contrasting gameplay?",
        "Have you deliberately left blank space on the map for ideas that emerge during table play?",
      ],
    },
  ],
  codexConnection: {
    heading: "Building living sandboxes in Codex Cryptica",
    paragraphs: [
      "Codex Cryptica is designed specifically for bottom-up campaign management. Rather than forcing you into rigid hierarchies, the knowledge graph connects settlements, factions, and adventure sites organically.",
      "As your players explore the frontier, create new linked entities in seconds. Your initial five-mile sandbox grows effortlessly into a rich, cohesive world without upfront prep burden.",
    ],
    linkText: "Build sandbox settings in Codex Cryptica",
    href: "/solutions/worldbuilding-tool",
  },
  relatedTools: [
    {
      title: "Settlement generator",
      description:
        "Quickly produce settlements with local leadership, primary exports, and brewing civic tensions.",
      href: "/generators/settlement",
    },
    {
      title: "Faction generator",
      description:
        "Create competing local factions with opposing agendas and clear pressure points.",
      href: "/generators/faction",
    },
    {
      title: "NPC generator",
      description:
        "Draft tavern keepers, frontier scouts, and nervous town elders in seconds.",
      href: "/generators/npc",
    },
  ],
  relatedAnswers: [
    "how-do-you-create-a-magic-system",
    "how-do-you-make-npcs-memorable-without-lots-of-prep",
    "how-do-you-prep-a-weekly-rpg-session-quickly",
    "how-do-you-keep-track-of-time-in-a-tabletop-campaign",
  ],
  discovery: {
    id: "answer-worldbuilding-from-scratch",
    parentCluster: "worldbuilding",
    primaryIntent: "how to start worldbuilding from scratch",
    intentAliases: [
      "how to start worldbuilding",
      "worldbuilding for beginners",
      "how to build a fictional world",
      "tabletop worldbuilding guide",
      "bottom up worldbuilding method",
    ],
    userJob: "adopt-workflow",
    uniqueValue:
      "A bottom-up worldbuilding framework that prioritises a playable five-mile local sandbox over useless macro-level lore, getting games running in forty-five minutes.",
    acknowledgedOverlap: [
      {
        with: "answer-create-magic-system",
        reason:
          "Magic systems addresses arcane rules and costs, whereas starting worldbuilding covers initial local sandboxes and settlements.",
      },
    ],
    relatedIntents: [
      "answer-create-magic-system",
      "answer-npcs-memorable",
      "answer-prep-weekly-session-quickly",
    ],
  },
  seo: {
    title: "How to Start Worldbuilding from Scratch | Codex Cryptica",
    description:
      "Learn how to build a vibrant fictional world from scratch using a bottom-up sandbox framework. Avoid worldbuilder paralysis and focus on playable lore.",
    image:
      "https://assets.codexcryptica.com/og/how-do-you-start-worldbuilding-from-scratch.jpg",
    imageAlt:
      "Fantasy illustration of a cartographer drawing a regional map of a frontier settlement surrounded by hills and ancient ruins",
  },
};
