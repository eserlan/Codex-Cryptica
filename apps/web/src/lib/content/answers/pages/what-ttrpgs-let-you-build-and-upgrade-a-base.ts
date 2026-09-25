import type { AnswerConfigInput } from "../schema";

export const whatTtrpgsLetYouBuildAndUpgradeABase: AnswerConfigInput = {
  slug: "what-ttrpgs-let-you-build-and-upgrade-a-base",
  category: "getting-started",
  publishedAt: "2026-09-24",
  question: "What TTRPGs let you build and upgrade a base?",
  kind: "comparison",
  shortAnswer:
    "Choose by the kind of base and campaign role you want: Mutant: Year Zero and Stonetop make community development a core loop; Salvage Union and Blades in the Dark offer a recurring subsystem, centred on a mobile home or crew lair; Forbidden Lands makes a stronghold an optional project. Systems named here belong to their respective publishers; mentioning one is not an endorsement of Codex Cryptica by that publisher, or the reverse.",
  sections: [
    {
      kind: "prose",
      heading: "Base building means different things in different games",
      paragraphs: [
        "A settlement that the characters help rebuild, a crew's lair, a travelling crawler, and a castle won during exploration can all be called a base. They do not offer the same play. Some games make the home's fortunes part of the main campaign; others give a group a set of upgrades between missions, or let a stronghold become a goal if the players pursue it.",
        "Compare what the rules let the group change, who chooses those changes, and how they affect later adventures. A game with a few headquarters upgrades may suit a crew better than a detailed settlement engine, while a group hoping to watch a community grow may find a decorative home or a small upgrade track too thin.",
      ],
    },
    {
      kind: "table",
      heading: "Compare the base at a glance",
      headers: [
        "System",
        "Base model",
        "How central?",
        "Upgrade style",
        "Best fit",
      ],
      rows: [
        [
          "Mutant: Year Zero",
          "Ark community",
          "Core loop",
          "Shared projects and development tracks",
          "Rebuilding a settlement while exploring",
        ],
        [
          "Stonetop",
          "Home village",
          "Core loop",
          "Improvement projects with requirements",
          "A community the PCs adventure for",
        ],
        [
          "Salvage Union",
          "Mobile crawler community",
          "Recurring subsystem",
          "Salvage, upkeep and crawler technology",
          "A travelling home that grows with the crew",
        ],
        [
          "Blades in the Dark",
          "Crew lair and assets",
          "Recurring subsystem",
          "Crew advancement and upgrades",
          "Scores first, HQ progression second",
        ],
        [
          "Forbidden Lands",
          "Stronghold",
          "Optional project",
          "Treasure and resources spent on facilities",
          "Sandbox exploration with an earned home",
        ],
      ],
    },
    {
      kind: "list",
      heading: "Choose the kind of base you want",
      intro:
        "The table shows each game's role; these notes explain what its rules put into play:",
      items: [
        {
          term: "A community the campaign is about: Mutant: Year Zero",
          text: "The Ark is one of the game's two main environments. The players choose development projects in Warfare, Food Supply, Technology, and Culture, directing a community that also faces scarcity and internal pressure. Improvement is a shared campaign concern, not just a personal character reward. Choose it when rebuilding a settlement and exploring the dangerous world around it should drive play together.",
        },
        {
          term: "A home village to defend and improve: Stonetop",
          text: "The player characters are local notables, and their home town is the focus of the campaign. The steading has its own stats and improvement sheet. Projects can require particular people, materials, community effort, and time; some change Prosperity or what the town can do, and can create new needs in turn. The community is the shared stake, rather than property one character manages alone. Choose it when the town is why the characters adventure, not a headquarters they visit between unrelated jobs.",
        },
        {
          term: "A mobile home for a salvager community: Salvage Union",
          text: "The Union Crawler travels through the wasteland and houses the whole community. Salvage supports and sustains that community, helps it grow, and provides material for new mechs; the rules cover creating, maintaining, customising, and upgrading the crawler. The crew's expeditions feed the mobile home, while the wasteland makes its survival a continuing concern. Choose it when the base should travel with the crew and shape the jobs they take.",
        },
        {
          term: "A crew headquarters and useful assets: Blades in the Dark",
          text: "The crew has a lair and a shared upgrade sheet, with options such as quarters, a workshop, a vault, and lair security. The crew earns further upgrades through advancement, and its choices can affect standing with factions that helped or were harmed. The lair is a crew asset, not a room-by-room construction game. Choose this focused progression subsystem when criminal work and faction relationships matter more than developing a whole settlement.",
        },
        {
          term: "A stronghold earned during a sandbox: Forbidden Lands",
          text: "The campaign centres on survival and open-world exploration. Characters can spend treasure to claim an old castle or dungeon as a stronghold, then add features such as a forge, mill, garden, or better defences. The publisher presents this as something they may pursue after exploring, rather than a required starting premise. Choose it when developing a defensible home can become a long-term goal without dominating every campaign from the outset.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Check how the base changes play",
      paragraphs: [
        "Classify base development as a core loop if it drives the campaign's adventures, a recurring subsystem if it returns as one part of play, or an optional project if the group can pursue it without making it a regular focus.",
        "To judge another game, check what changes mechanically when the base improves, what resources pay for improvements, who makes those decisions, and how often the procedure returns to the table. Ask whether the base can also create costs, threats, or new adventures. These answers show how much play the rules give the base beyond fictional colour or an occasional bonus.",
        "Read the relevant chapter or quickstart before buying. A pitch about a home base does not tell you how often its rules return or how much they shape play.",
      ],
    },
    {
      kind: "example",
      heading: "Worked example: picking a game for a home base",
      paragraphs: [
        "A group wants its adventures to change its home, but disagrees about how central that home should be. The same requirement points to different games depending on the campaign role they want:",
      ],
      items: [
        {
          term: "Core loop",
          text: "Choose Stonetop or Mutant: Year Zero if community development should drive adventures: the village or Ark gives the group shared projects and pressures to respond to.",
        },
        {
          term: "Recurring subsystem",
          text: "Choose Salvage Union if the home should travel with the crew and grow through salvage. Choose Blades in the Dark if scores stay primary and crew upgrades support that progression; its lair is not a room-by-room construction game.",
        },
        {
          term: "Optional project",
          text: "Choose Forbidden Lands if the group wants a stronghold to emerge later from sandbox exploration, without making it a regular campaign focus.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Before choosing a base-building system",
      intro: "Compare the rules with the campaign the group wants to play:",
      items: [
        "Is the base a community, a lair, a mobile home, a stronghold, or something else?",
        "Is development a core loop, a recurring subsystem, or an optional project?",
        "What can an upgrade change beyond a numerical bonus?",
        "What resources pay for upgrades, and who chooses them?",
        "Can the base create new problems or adventures, or be threatened, damaged, or lost?",
      ],
    },
  ],
  systemsThatSupportThis: [
    {
      system: "Mutant: Year Zero",
      rationale:
        "The publisher describes the Ark as one of two main game environments and gives players projects to develop it in Warfare, Food Supply, Technology, and Culture.",
      href: "https://freeleaguepublishing.com/games/mutant-year-zero/",
    },
    {
      system: "Stonetop",
      rationale:
        "The creator's steading sheet gives improvements concrete prerequisites such as people, materials, communal work, or time, with some changing Prosperity or the settlement's capabilities.",
      href: "https://www.dropbox.com/scl/fi/gw4o6sz4kujw08t3ax707/Playbook-Steading.pdf?rlkey=13ugeg56x0lbs56j65rj7e5xo&dl=0",
    },
    {
      system: "Salvage Union",
      rationale:
        "The publisher's core-book page describes the Union Crawler as a mobile community base with rules for creating, maintaining, customising, and upgrading it.",
      href: "https://leyline.press/products/salvage-union-core-book",
    },
    {
      system: "Blades in the Dark",
      rationale:
        "The crew rules provide lair and crew upgrades, connect upgrade choices to faction status, and allow further upgrades through crew advancement.",
      href: "https://bladesinthedark.com/crew",
    },
    {
      system: "Forbidden Lands",
      rationale:
        "The publisher describes an optional stronghold that characters can claim after exploration and develop with facilities and defences.",
      href: "https://freeleaguepublishing.com/games/forbidden-lands/",
    },
  ],
  codexConnection: {
    heading: "Detail the place around the game's rules",
    paragraphs: [
      "Codex Cryptica does not track or replace any of these games' upgrade rules. Its settlement, faction, NPC, and ship generators can help you detail the people, surroundings, and outside pressures connected to a base after the group chooses a system.",
    ],
    linkText: "Try the settlement generator",
    href: "/generators/settlement",
  },
  relatedTools: [
    {
      title: "Settlement generator",
      description:
        "Create a settlement to use as a community, home base, or nearby source of pressure.",
      href: "/generators/settlement",
    },
    {
      title: "Faction generator",
      description:
        "Add an organisation with interests in the base or the territory around it.",
      href: "/generators/faction",
    },
    {
      title: "Ship generator",
      description:
        "Develop the identity and features of a ship used as a mobile home.",
      href: "/generators/ship-generator",
    },
  ],
  relatedAnswers: [
    "what-rpg-system-should-we-try-instead-of-dnd",
    "what-should-an-rpg-settlement-contain",
    "what-rpg-system-is-good-for-solo-play",
    "how-do-i-make-a-player-base-matter-in-an-rpg-campaign",
  ],
  discovery: {
    id: "answer-base-building-system-selection",
    parentCluster: "rpg-system-selection",
    clusters: ["rpg-system-selection", "base-building"],
    primaryIntent:
      "choose a tabletop rpg system with base building and upgrade mechanics",
    intentAliases: [
      "what ttrpg has base building",
      "rpg where you can upgrade your base",
      "tabletop rpg with settlement building rules",
      "rpg with stronghold upgrades",
      "ttrpg with a mobile base",
      "games where the party can improve a headquarters",
    ],
    userJob: "evaluate",
    uniqueValue:
      "Compares settlement, crew lair, mobile home, and stronghold systems by how central base progression is, what upgrades change, who directs them, and what drives improvement. It helps groups choose the campaign loop they want rather than presenting a generic list of games that include downtime.",
    relatedIntents: [
      "answer-system-selection",
      "answer-settlement-contents",
      "answer-solo-rpg-system-selection",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-make-player-base-matter",
        reason:
          "That page teaches the table technique for making any base matter in play; this one helps a group choose a system whose rules support developing a base over time.",
      },
      {
        with: "answer-system-selection",
        reason:
          "The general system chooser groups games by genre and play style; this answer compares the specific base-development procedures and campaign centrality for groups seeking an upgradeable home.",
      },
      {
        with: "answer-settlement-contents",
        reason:
          "The settlement answer helps GMs decide what to put in a settlement; this answer helps groups choose a system whose rules support developing a base over time.",
      },
      {
        with: "answer-solo-rpg-system-selection",
        reason:
          "Both compare RPG systems by campaign needs; this answer evaluates base progression and home development, while the solo answer evaluates rules for playing without a GM or group.",
      },
    ],
  },
  seo: {
    title: "What TTRPGs let you build and upgrade a base? | Codex Cryptica",
    description:
      "Compare TTRPGs for settlement growth, crew lairs, mobile bases, and strongholds. See how central upgrades are and what each system's rules support.",
    image:
      "https://assets.codexcryptica.com/og/what-ttrpgs-let-you-build-and-upgrade-a-base.jpg",
    imageAlt:
      "Players compare a growing settlement, a hidden crew lair, and a mobile crawler around a campaign map",
  },
};
