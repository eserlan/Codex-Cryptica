import type { AnswerConfigInput } from "../schema";

export const whatTtrpgsLetYouBuildAndUpgradeABase: AnswerConfigInput = {
  slug: "what-ttrpgs-let-you-build-and-upgrade-a-base",
  category: "getting-started",
  publishedAt: "2026-09-24",
  question: "What TTRPGs let you build and upgrade a base?",
  kind: "comparison",
  shortAnswer:
    "Choose by the kind of base you want to play around: Mutant: Year Zero and Stonetop make community development central, Salvage Union gives the group a mobile home, Blades in the Dark advances a crew and its lair, and Forbidden Lands treats a stronghold as an optional long-term project. Check whether base development is the campaign's main loop, a crew-progression subsystem, or a lighter addition before choosing. Systems named here belong to their respective publishers; mentioning one is not an endorsement of Codex Cryptica by that publisher, or the reverse.",
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
      kind: "list",
      heading: "Choose the kind of base you want",
      intro:
        "These games offer distinct models, from a community at the centre of play to a stronghold the party may build later:",
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
        "The most important distinction is centrality. Mutant: Year Zero, Stonetop, and Salvage Union put the community or its mobile home close to the campaign's core. Blades in the Dark gives the crew recurring headquarters and upgrades while scores remain the main jobs. Forbidden Lands offers a stronghold as a possible reward and project within a wider exploration campaign.",
        "Then look at the actual progression procedure. Do improvements unlock new actions, people, facilities, and places to go, or mainly add a rating? What resources or advancement buy them, and how often does the game return to that choice? Check whether the players make decisions for the whole community, a crew, or their characters, and whether upkeep or outside pressure creates choices as well as benefits.",
        "A base can be fictional colour, a light upgrade track, or a major mechanical loop. Fictional colour gives the party a named home but no procedure for improving or using it. A light track adds occasional capabilities between missions. A major loop returns to projects, needs, and development throughout the campaign. Read the relevant chapter or quickstart before buying; a pitch about a home base does not tell you how much table time its upkeep takes or how much those rules shape play.",
      ],
    },
    {
      kind: "example",
      heading: "Worked example: picking a game for a home base",
      paragraphs: [
        "A group wants the characters' home to change because of their adventures. The GM is considering Stonetop and checks whether its settlement rules will create useful choices at the table.",
      ],
      items: [
        {
          term: "The vague choice",
          text: "They choose a game because its description mentions a stronghold, then discover that the base is an occasional reward rather than a source of regular settlement decisions. The game may be good, but it does not give the group the community story they expected.",
        },
        {
          term: "Choose by campaign loop",
          text: "The group chooses the village's mill as a long-term project and checks the Steading sheet: it needs a suitable site and a reliable power source, as well as communal work and supplies. For this example, the GM establishes that the only nearby waterwheel site is used by a neighbouring hamlet. The players can negotiate access, find another power source, or change projects; the base rules have given them a concrete next problem to solve.",
        },
        {
          term: "Why it works",
          text: "The mill is not a free-standing bonus on a sheet: its requirements point towards a place, a community need, and a decision the players can act on. Comparing systems this way reveals whether base development will keep producing play or remain an occasional reward.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Before choosing a base-building system",
      intro: "Compare the rules with the campaign the group wants to play:",
      items: [
        "Is the base a community, a lair, a mobile home, a stronghold, or something else?",
        "Is its development the main campaign loop, a recurring subsystem, or an optional goal?",
        "What can an upgrade change beyond a numerical bonus?",
        "Who chooses improvements, and what rules or resources pay for them?",
        "Does upkeep or the surrounding world create choices as well as benefits?",
        "Can the base be threatened or changed in ways the players can respond to?",
        "Have you read the actual advancement rules, rather than choosing from a genre label?",
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
