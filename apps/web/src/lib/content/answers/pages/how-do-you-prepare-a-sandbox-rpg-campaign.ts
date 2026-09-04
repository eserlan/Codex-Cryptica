import type { AnswerConfigInput } from "../schema";

export const howDoYouPrepareASandboxRpgCampaign: AnswerConfigInput = {
  slug: "how-do-you-prepare-a-sandbox-rpg-campaign",
  category: "session-prep",
  question: "How do you prepare a sandbox RPG campaign?",
  kind: "framework",
  shortAnswer:
    "A sandbox RPG campaign is prepared from the centre outward rather than the top down. Instead of drafting a continental atlas or extensive global lore, establish a compact starting region: one resilient settlement hub, three local factions in active friction, three immediate adventure sites within a day's travel, and a roster of six rumours that point towards distinct hazards and rewards. Worldbuilding beyond that perimeter is only developed when players declare their travel intentions at the end of a session.",
  sections: [
    {
      kind: "prose",
      heading:
        "The worldbuilder's trap: why top-down prep suffocates sandboxes",
      paragraphs: [
        "The most common failure mode when launching a sandbox campaign is preparing the world as an encyclopaedia rather than a playground. Game Masters spend months designing pantheons, drawing continental coastlines, charting dynastic lineages spanning five centuries, and detailing distant empires. Yet when the players gather for Session 1, this vast repository of background lore produces paralysis: the players are stranded in an enormous setting with no immediate stakes, while the GM is terrified they will travel in an unmapped direction and shatter the illusion.",
        "A true sandbox does not require infinite pre-generated content; it requires high agency within a bounded, reactive space. Players do not experience your global political treaties — they experience the price of ale, the suspicious temple guard demanding toll coin, the smoke rising from a barrow-mound on the horizon, and the conflicting rumours whispered in the marketplace. By concentrating your preparation exclusively on the local starting environment and building dynamic pressure valves between local groups, you create an immediate sense of consequence while keeping prep time under three hours.",
      ],
    },
    {
      kind: "list",
      heading: "The 1-3-3-6 starting sandbox framework",
      intro:
        "To launch an open-world campaign that feels expansive without overwhelming your schedule, prepare only these five foundational components before the first roll of the dice:",
      items: [
        {
          term: "1 resilient settlement hub",
          text: "A frontier town, crossroads hamlet, fortified trading post, or orbital waystation that serves as the party's home base. It must provide reliable supplies, safe rest, basic hirelings, and clear social boundaries. Crucially, give it one internal tension — an incoming tax assessor, an overstretched militia, or food rations spoiling in the grain silos.",
        },
        {
          term: "3 local factions in active friction",
          text: "Three distinct groups competing over limited territory, legitimacy, or resources. Give each faction an immediate ambition, an obstacle blocking them, and a scheduled move they will make if the party never intervenes. When factions pull against one another, player decisions immediately produce ripple effects.",
        },
        {
          term: "3 contrasting adventure sites",
          text: "Three distinct destinations within one day of travel from the hub, representing different thematic flavours and difficulty tiers: for example, a flooded crypt occupied by undead, a ruined hillside toll-fortress held by highwaymen, and an untamed briarwood cave system concealing rare alchemical reagents. Different choices provide clear risk-versus-reward tradeoffs.",
        },
        {
          term: "6 actionable local rumours",
          text: "A d6 table of concrete leads overheard in taverns, shrines, or markets. Ensure four are essentially true, one is an exaggeration with unexpected complications, and one is a dangerous misconception. Every rumour must name a specific site, NPC, or item that players can actively seek out.",
        },
        {
          term: "The end-of-session declaration contract",
          text: "The golden operational rule of sandbox management: players must always declare their intended destination for the following week before packing their dice. This gives you six days to prepare the specific site and encounters they chose, completely eliminating the need to prep everything in advance.",
        },
      ],
    },
    {
      kind: "example",
      heading: "Worked Example Scenario: Before and After",
      paragraphs: [
        "Contrast two Game Masters preparing a regional sandbox campaign where the party starts on the frontier of a fallen kingdom:",
      ],
      items: [
        {
          term: "The weak top-down approach",
          text: "The GM drafts a thirty-page setting bible detailing the reign of the Sun Kings, the planar cosmography, and the geopolitical treaties of three neighbouring nations. In session one, the party arrives in a generic tavern. The GM asks 'What do you want to do?' With no concrete leads or urgent dilemmas, the players look at each other blankly, ask what the main plot is, and wait for an NPC to hand them an obvious quest.",
        },
        {
          term: "The strong 1-3-3-6 framework approach",
          text: "The GM preps the logging settlement of Oakhaven. Three factions are locked in conflict: the Baron's tax bailiff, an insurgent guild of woodsmen, and an encroaching circle of peat-bog druids. The GM places three sites: the Sunken Tollhouse (1 league south), the Weeping Barrows (2 leagues north-west), and the Whispering Charcoal Kilns (half a day east). A d6 rumour table reveals that the bailiff is secretly buying unrefined bog-silver from the barrows. Within five minutes of sitting down, the party is arguing over which faction to confront and which site to raid first.",
        },
        {
          term: "Why it works",
          text: "The players possess total freedom of movement, yet every vector presents tangible conflict, relatable stakes, and measurable travel time. The GM has prepped only two pages of notes, yet the world feels vibrant, autonomous, and primed for disruption.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Sandbox Campaign Launch Checklist",
      intro:
        "Before welcoming your players to the sandbox table, verify that your regional prep satisfies these essential criteria:",
      items: [
        "Defined a starting settlement hub with three distinct, enterable social points of contact (e.g. an apothecary, an inn, a town constable).",
        "Assigned an urgent want, an opposing rival, and a scheduled default action to at least three local factions.",
        "Mapped three distinct adventure sites of varying difficulty within a single day's journey of the hub.",
        "Prepared a d6 table of actionable rumours directly linking the settlement to the adventure sites and faction schemes.",
        "Established the end-of-session destination declaration rule so future prep remains focused and bounded.",
      ],
    },
  ],
  codexConnection: {
    heading: "Managing a living sandbox without prep fatigue",
    paragraphs: [
      "A sprawling open-world campaign quickly becomes unmanageable if tracked in static linear documents. Codex Cryptica's local-first campaign graph lets you connect settlements, wilderness adventure sites, faction allegiances, and rumour leads as reactive nodes. When your players disrupt a local faction or plunder an ancient site, updated relationships ripple across your campaign graph automatically, preserving setting continuity without tedious spreadsheet maintenance.",
    ],
    linkText: "Explore the Sandbox RPG Campaign Manager",
    href: "/for/sandbox-campaigns",
  },
  relatedTools: [
    {
      title: "Faction Generator",
      description:
        "Generate multi-tiered factions with concrete agendas, resources, and internal rivalries.",
      href: "/generators/faction",
    },
    {
      title: "Quest Hook Generator",
      description:
        "Create branching adventure hooks and actionable rumours tailored to your frontier setting.",
      href: "/tools/quest-hook-generator",
    },
    {
      title: "RPG NPC Generator",
      description:
        "Generate memorable frontier personalities, trade merchants, and faction agents in seconds.",
      href: "/tools/rpg-npc-generator",
    },
  ],
  relatedForPages: [
    {
      title: "Sandbox RPG Campaigns",
      description:
        "Manage player-directed sandbox campaigns with live relationship maps and faction tracking.",
      href: "/for/sandbox-campaigns",
    },
    {
      title: "West Marches Campaigns",
      description:
        "Run open-table wilderness exploration campaigns with shared camp logs and player agency.",
      href: "/for/west-marches",
    },
    {
      title: "Fantasy Worldbuilding",
      description:
        "Build rich fantasy settings with linked settlement hubs, wilderness points, and lore archives.",
      href: "/for/fantasy-worldbuilding",
    },
  ],
  relatedAnswers: [
    "how-much-prep-do-you-need-for-an-rpg-session",
    "what-is-a-point-crawl",
    "how-do-you-create-a-fantasy-faction",
    "how-do-you-make-travel-interesting-in-a-tabletop-rpg",
    "how-do-you-build-a-point-crawl-for-an-rpg",
  ],
  discovery: {
    id: "answer-sandbox-campaign-prep",
    parentCluster: "sandbox-campaigns",
    primaryIntent: "how to prepare a sandbox rpg campaign",
    intentAliases: [
      "how to prep a sandbox campaign",
      "sandbox rpg prep framework",
      "how to run an open world rpg",
      "prepping a sandbox rpg",
      "minimum viable sandbox prep",
    ],
    uniqueValue:
      "A minimum-viable sandbox prep framework replacing premature world atlas generation with a starting hub, three local factions in active friction, three adventure sites within a day's travel, and six visible rumours.",
    relatedIntents: [
      "for-sandbox-campaigns",
      "answer-session-prep",
      "answer-point-crawl",
    ],
  },
  seo: {
    title: "How do you prepare a sandbox RPG campaign? | Codex Cryptica",
    description:
      "Prep a rich, player-driven sandbox RPG campaign without burnout using the 1-3-3-6 framework: one hub, three factions, three sites, and six actionable rumours.",
    image:
      "https://assets.codexcryptica.com/og/how-to-prepare-a-sandbox-rpg-campaign.jpg",
    imageAlt:
      "Regional fantasy map spread on a candle-lit Game Master study desk with drafting compass, wooden faction tokens, and travel notes",
  },
};
