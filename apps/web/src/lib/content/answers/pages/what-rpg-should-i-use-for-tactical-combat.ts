import type { AnswerConfigInput } from "../schema";

export const whatRpgShouldIUseForTacticalCombat: AnswerConfigInput = {
  slug: "what-rpg-should-i-use-for-tactical-combat",
  category: "getting-started",
  publishedAt: "2026-09-19",
  question: "What RPG should I use for tactical combat?",
  kind: "comparison",
  shortAnswer:
    "Tactical can mean deep character builds, positioning on a grid, party teamwork, or fast decisions with little rules weight, and different games serve each. For fantasy teamwork and build depth, Pathfinder Second Edition is the usual first pick. For mech combat where the map and your loadout decide everything, Lancer. For arena-style fantasy fights with roles and cooldown-style abilities, ICON. If you like D&D fights but want them faster, Dragonbane keeps meaningful choices with far less bookkeeping.",
  sections: [
    {
      kind: "prose",
      heading: "Decide what kind of tactics your table enjoys",
      paragraphs: [
        "Groups who say they want tactical combat are often describing different pleasures. One player enjoys assembling a character whose abilities interlock before the first session. Another enjoys the turn itself: where to stand, what to threaten, whether to spend a reaction. A third only cares that the party can plan a fight together and watch it work.",
        "Those pleasures pull on different parts of a rulebook. Build depth needs a large pool of options and a system that keeps them balanced. Positioning needs a grid, ranges and terrain that matter. Teamwork needs abilities that reward setting each other up. Ask the group which of the three they would miss most, and the list below narrows quickly.",
      ],
    },
    {
      kind: "list",
      heading: "If you want...",
      intro:
        "These games produce different kinds of tactical fight. Find the description closest to your group's best combat evenings.",
      items: [
        {
          term: "Fantasy teamwork and deep builds",
          text: "Pathfinder Second Edition. Each turn gives three actions plus one reaction, and most things cost one action, so moving, raising a shield, casting and striking compete for the same budget. Repeated attacks in a turn take a growing penalty, which pushes players towards mixing manoeuvres, conditions and positioning instead of swinging three times. Classes offer large option lists, so build choices matter as much as turn choices. Expect longer preparation and more rules lookups.",
        },
        {
          term: "Mech combat and battlefield roles",
          text: "Lancer. Massif Press built it around grid combat: range, line of fire, cover, terrain and engagement all act as rules rather than scenery. Each mech has weapons, systems, and a heat capacity that makes overreaching costly, and structure and stress track lasting damage. Play alternates between freeform narrative scenes and structured missions, so the fights carry the crunch and the rest stays light. The trade is that it is about pilots and mechs, not swords and spells.",
        },
        {
          term: "Arena-style fantasy fights with clear roles",
          text: "ICON. Massif Press's fantasy game was designed with tactical grid combat as one of its two halves, alongside a lighter narrative mode that can be used separately. Combat uses d20 rolls with a single defence target, boons and banes, and role-based abilities in the style of console tactics games. Check the current release status and rules version on the publisher's page before committing a campaign to it.",
        },
        {
          term: "Familiar D&D fights, either deeper or leaner",
          text: "D&D itself sits in the middle: a grid is optional, classes offer real choices, and fights run at a moderate pace. Groups who love it but want more variety in turns tend to move to Pathfinder Second Edition. Groups who love the choices but find fights slow tend to look at lighter games.",
        },
        {
          term: "Meaningful choices with less rules weight",
          text: "Dragonbane. Free League's fantasy game gives each character a main action per round that can be spent attacking or held back to defend, so a turn is a real decision without a large option list. It works with or without a battle map. Pick it when the group wants danger and choice but not a sheet full of feat interactions.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "What tactical combat means at your table",
      paragraphs: [
        "Separate build tactics from turn-by-turn tactics. Build-heavy systems reward the hours between sessions; turn-heavy systems reward attention during the fight. If the group has limited time outside the game, pick a system where the choices are visible on the sheet during play, not buried in a planning spreadsheet.",
        "Separate map positioning from theatre-of-the-mind decisions. A grid makes range, cover and flanking exact, which suits players who dislike arguments about where everyone is standing. It also asks for a map, minis or a virtual tabletop every session. If that is a burden, favour systems that still work when the map is a sketch.",
        "Separate individual optimisation from party synergy. Some games let a strong build carry a fight alone; others push players to set up each other's turns. Decide which behaviour you want to see, and remember that a system also has to survive its worst-case player: whether one person's long turns stall everyone else depends as much on the table as on the rules.",
      ],
    },
    {
      kind: "prose",
      heading: "Coming from D&D",
      paragraphs: [
        "If the group enjoys D&D fights but wants more depth, Pathfinder Second Edition is the most direct step: it keeps the d20, the classes and the grid, and adds a tighter action structure and a wider range of things to do on a turn. Expect to read more before session one.",
        "If the group enjoys the choices but not the length of combat, try one of the simpler D&D alternatives, or start with the wider D&D alternatives chooser. If the tactical scenes you want happen underground, the fantasy dungeon-crawl comparison covers systems built around exploration procedures rather than grid depth.",
      ],
      cta: {
        text: "Compare simpler D&D alternatives",
        href: "/answers/what-rpg-feels-like-dnd-but-is-simpler",
      },
    },
    {
      kind: "example",
      heading: "One ambush, three tables",
      paragraphs: [
        "A party is ambushed on a bridge by archers on both banks and a knight blocking the far end. Here is how the same scene tends to play at three tables.",
      ],
      items: [
        {
          term: "The build-focused table",
          text: "The party plays Pathfinder Second Edition. The fighter raises a shield and steps forward to hold the bridge, the wizard spends two actions on an area spell that forces the archers to take cover, and the rogue uses the third to slip behind the knight. The fight is decided by how well the party used their action budgets and conditions.",
        },
        {
          term: "The map-focused table",
          text: "The party plays Lancer as pilots. The bridge becomes a chokepoint measured in squares: one mech blocks the span, another climbs to a bank to gain line of fire, and a third watches its heat because one more shot would overheat it. Terrain and range drive the outcome more than any single ability.",
        },
        {
          term: "The lean table",
          text: "The party plays Dragonbane. Nobody consults a grid. A player holds their action to parry the knight, another spends theirs on a shot at an archer, and the GM narrates the crossfire. The fight is quick and dangerous, and the choices are about risk rather than optimisation.",
        },
        {
          term: "Why it works",
          text: "The scene never changed; the tactical layer did. Each table got the kind of decision it enjoys because the group picked a system for that layer instead of for reputation.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Before you commit to a tactical system",
      intro: "Check these with the group before buying books:",
      items: [
        "Ask which kind of tactics people actually enjoy: builds, positioning, teamwork, or quick risky choices.",
        "Confirm the table can support the gear it needs, whether that is a battle map, minis or a virtual tabletop.",
        "Run one fight from a free starter set or quickstart and time it; a single round shows the real pace.",
        "Check how much preparation the GM will do per fight, since grid-based systems usually ask for more.",
        "Verify the current edition and release status of any newer game on the publisher's own page.",
      ],
    },
  ],
  systemsThatSupportThis: [
    {
      system: "Pathfinder Second Edition",
      rationale:
        "A three-action turn with one reaction and a multiple attack penalty, so every turn is a budget of movement, defence, spells and strikes.",
      href: "https://paizo.com/pathfinder",
    },
    {
      system: "Lancer",
      rationale:
        "Grid combat where range, cover, engagement and heat are all rules, with mission-based structure for the tactical scenes.",
      href: "https://massif-press.itch.io/",
    },
    {
      system: "ICON",
      rationale:
        "A fantasy game with a dedicated tactical grid combat mode built on roles and abilities, separable from its narrative mode.",
      href: "https://massif-press.itch.io/icon",
    },
    {
      system: "Dragonbane",
      rationale:
        "Each round a character chooses between attacking and holding their action to defend, keeping fights tactical with little bookkeeping.",
      href: "https://freeleaguepublishing.com/games/dragonbane/",
    },
  ],
  codexConnection: {
    heading: "Prepare the fights around the system you pick",
    paragraphs: [
      "Codex Cryptica does not run combat or automate rules for any of these systems. What it helps with is the material around the fight: who is ambushing the party and why, where the bridge sits in the region, and what the enemy faction does next.",
      "Generate a set-piece encounter or a campaign villain, then keep their motives, allies and locations linked in your notes so the next fight feels connected to the last one.",
    ],
    linkText: "Generate a set-piece encounter",
    href: "/generators/encounter",
  },
  relatedTools: [
    {
      title: "Encounter Generator",
      description:
        "Set-piece fights and wandering threats with a reason to be there.",
      href: "/generators/encounter",
    },
    {
      title: "BBEG Generator",
      description:
        "A campaign villain with motives, resources and a plan for the fights ahead.",
      href: "/generators/bbeg-generator",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for Pathfinder 2e",
      description:
        "Notes and worldbuilding for groups running Pathfinder Second Edition.",
      href: "/for/pathfinder-2e",
    },
    {
      title: "Codex Cryptica for D&D",
      description:
        "For groups comparing tactical options against the system they already know.",
      href: "/for/dungeons-and-dragons",
    },
  ],
  relatedAnswers: [
    "what-ttrpg-should-i-use-for-a-fantasy-dungeon-crawl",
    "what-rpg-system-should-we-try-instead-of-dnd",
    "what-rpg-feels-like-dnd-but-is-simpler",
    "how-do-i-balance-rpg-combat-encounters-without-a-tpk",
    "how-do-you-make-a-boss-fight-memorable-in-a-tabletop-rpg",
  ],
  discovery: {
    id: "answer-tactical-combat-system-selection",
    parentCluster: "rpg-system-selection",
    clusters: ["rpg-system-selection"],
    primaryIntent: "choose a tabletop rpg system for tactical combat",
    intentAliases: [
      "best tactical tabletop rpg",
      "rpg with deep tactical combat",
      "tabletop rpg like dnd with better tactical combat",
      "best rpg for grid combat",
      "tactical fantasy rpg system",
    ],
    uniqueValue:
      "Separates build depth, positioning and party teamwork so a group picks a system for the kind of tactics it enjoys instead of a ranked popularity list.",
    userJob: "evaluate",
    relatedIntents: [
      "answer-dungeon-crawl-system-selection",
      "answer-system-selection",
      "answer-encounter-balance",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-dungeon-crawl-system-selection",
        reason:
          "That page chooses systems by dungeon procedures and lethality; this one chooses by tactical depth and may name some of the same games for different reasons.",
      },
      {
        with: "answer-encounter-balance",
        reason:
          "That page teaches GMs to balance fights inside a chosen system; this one helps groups choose a system for tactical play.",
      },
    ],
  },
  seo: {
    title: "What RPG should I use for tactical combat? | Codex Cryptica",
    description:
      "Pick a tactical RPG by the tactics you enjoy: deep builds, grid positioning, party teamwork or fast choices, with Pathfinder 2e, Lancer, ICON and more.",
    image:
      "https://assets.codexcryptica.com/og/what-rpg-should-i-use-for-tactical-combat.jpg",
    imageAlt:
      "Armoured adventurers and a mech positioned across a gridded battlefield map with miniatures and dice",
  },
};
