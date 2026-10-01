import type { AnswerConfigInput } from "../schema";

export const whatTtrpgShouldIPlayForAPirateCampaign: AnswerConfigInput = {
  slug: "what-ttrpg-should-i-play-for-a-pirate-campaign",
  category: "getting-started",
  publishedAt: "2026-10-06",
  question: "What TTRPG should I play for a pirate or high-seas campaign?",
  kind: "comparison",
  shortAnswer:
    "Pick by the voyage you want, not by cover art. For cinematic duels and panache, try 7th Sea Second Edition; for an open sandbox of island-hopping and buried chart leads, try 50 Fathoms for Savage Worlds; for spare, fast, and mean play you can teach in an evening, try Pirate Borg; for grounded age-of-sail handling of wind, supply, and hull damage, try a historical set such as Pirates of the Spanish Main or Privateers and Gentlemen with a Savage Worlds or similar light-sim core; and for a ready-made campaign with months of linked ports and treasure arcs, run Ghosts of Saltmarsh or Skull & Shackles on the 5E or Pathfinder chassis your group already knows.",
  sections: [
    {
      kind: "prose",
      heading: "Start from the voyage loop your table wants",
      paragraphs: [
        "Pirate systems do not differ only in fluff. Each engine decides what the sea asks of the players every session: whether they are trading insults before steel is drawn, picking between two island leads while the wind shifts, rationing shot and patching a mast, or dividing jobs so every hand on deck matters during a chase. If you name that loop first, the list below narrows quickly. If you start from the idea that there must be one best pirate game, you will spend the evening debating books instead of choosing the sea your group will enjoy.",
        "Two choices shape the rest. The first is fantasy piracy against historical piracy: do you want cursed isles, sea monsters, and wild magic alongside the rigging, or a stricter Caribbean where powder, wind, and politics do the work. The second is structure against openness: a chart with two competing leads that force a choice favours a sandbox, while a linked port-to-port arc favours a prepared campaign. Most groups know which of those pairs they lean toward after one honest session zero, and the engine should follow that lean, not fight it.",
      ],
    },
    {
      kind: "table",
      heading: "Match the campaign you want to the system that handles it best",
      headers: ["If you want", "Try this", "What it does well", "Trade-off to accept"],
      rows: [
        [
          "Swashbuckling and cinematic duels",
          "7th Sea Second Edition",
          "Dramatic duelling, panache, and stakes-first scenes where daring plans earn extra dice",
          "Lighter on simulation; wind, supply, and hull specifics sit in the background",
        ],
        [
          "Sandbox island-hopping and exploration",
          "50 Fathoms (Savage Worlds)",
          "Open archipelago, Plot Point sandbox, and chart leads that send the crew to varied isles",
          "Needs Savage Worlds basics; magic and monsters are central, so pure history is harder",
        ],
        [
          "Gritty age-of-sail and historical pressure",
          "Pirates of the Spanish Main or similar historical set",
          "Age-of-sail handling of wind, supply, hull damage, and ports that remember the crew",
          "Less hand-holding for campaign arcs; the GM builds the chain of ports and pressures",
        ],
        [
          "Naval combat where every player has a job",
          "Honour + Intrigue or Savage Worlds naval add-ons",
          "Manoeuvre-based boarding and deck actions that divide steering, gunnery, repair, and command",
          "More rules at the moment of contact; keep turns brisk or chases lose pace",
        ],
        [
          "Rules-light adventure taught in an evening",
          "Pirate Borg",
          "Spare d20 chassis, fast characters, punishing tables, and grim humour",
          "High lethality and thin campaign scaffolding; best for short arcs or brutal voyages",
        ],
        [
          "Long campaign with ready-made ports and arcs",
          "Ghosts of Saltmarsh (5E) or Skull & Shackles (Pathfinder)",
          "Linked harbour towns, faction chains, and treasure arcs with months of prep already done",
          "You accept the parent system overhead; combat and levelling follow 5E or Pathfinder",
        ],
      ],
    },
    {
      kind: "prose",
      heading: "Fantasy piracy against historical piracy",
      paragraphs: [
        "Fantasy piracy suits the One Piece loop that prompted this question: sailing between strange isles, each with its own set piece, curse, or monster, and a new reason to weigh anchor again next week. Systems built for it, such as 50 Fathoms, Pirate Borg, and much of 7th Sea, assume that the next island can break ordinary sailing logic without breaking the rules. They give you procedures for wonder, horror, and weird treasure without needing to justify every choice through wind and victuals. The price is tone wobble if the group also wants a grounded Caribbean. When one island has a singing reef and the next has a careful governor counting powder barrels, the two styles pull against each other unless the table agrees which one leads.",
        "Historical piracy leans the other way. Age-of-sail sets such as Pirates of the Spanish Main keep wind, draft, supply, hull damage, and port law in the foreground. Victories feel earned because the sea and the state resist the crew, and a captured prize matters because it answers a real shortage rather than opening the next set piece. The trade is that the sea stays ordinary: you get fewer pre-built cursed isles and must stock strange sites yourself when you want them. Choose historical rigging when the group enjoys planning around those limits; choose fantasy rigging when the group wants each isle to offer a sharply different kind of adventure without needing to anchor it in period detail.",
      ],
    },
    {
      kind: "prose",
      heading: "Campaign support and how much the sea is already charted",
      paragraphs: [
        "Some pirate games ship with a whole coast drawn for you; others give you a fine hull and expect you to chart the islands. The distinction matters more than page count. A Plot Point campaign such as 50 Fathoms provides a loose archipelago, rival fleets, and a through-line you can run as written or plunder for parts, so a GM with little prep time starts sailing at once. Ghosts of Saltmarsh and Skull & Shackles do the same for 5E and Pathfinder, with linked harbour towns, smuggling runs, and a path from local trouble to regional stakes that has been tested at many tables. If your group already knows one of those parent systems, that material removes weeks of port and route prep.",
        "Lighter or more theatrical games tend to give you the opposite: excellent tools for scenes and fights, but fewer linked islands out of the box. 7th Sea offers a rich setting and tools for daring action, Pirate Borg offers brutal, funny generators for cursed treasure and miserable ports, and Honour + Intrigue excels at the moment blades meet. All three still need the GM to connect the isles, trade needs, and rival clocks between sessions. If you enjoy that work, they repay it; if you want a ready chart from week one, start where the chart already exists and borrow the scene tools from the lighter games as and when you need them.",
      ],
    },
    {
      kind: "example",
      heading: "Two groups ask the same question and pick different answers",
      paragraphs: [
        "Two groups, both fans of sailing between islands and finding varied adventures on each, ask what to run. Their best evenings point in opposite directions.",
      ],
      items: [
        {
          term: "The island-hoppers",
          text: "Four players with a taste for One Piece-style loops: one chart leads to a haunted cove, another to a market isle where a rival left a debt, and they can only follow one before the trades shift. They want each island to play differently and to feel the cost of the path not taken. They pick 50 Fathoms. The Savage Worlds Plot Point gives them a sandbox archipelago and rival fleets that keep moving while the crew chooses, and card initiative keeps chases brisk. They add Honour + Intrigue manoeuvres for duels when blades are drawn, but the voyage choice remains the session spine.",
        },
        {
          term: "The gritty crew",
          text: "Five players who love rigging detail, supply, and port law: wind on the beam matters, shot is counted, a patched hull changes the next chase, and a harbour master who remembers a forged paper matters more than a cursed idol. They pick Pirates of the Spanish Main on a Savage Worlds base for historical handling, with Ghosts of Saltmarsh borrowed for its harbour town material when they need a linked stretch of coast at short notice. Fantasy elements are kept to rumour and relic rather than routine magic, so each strange isle feels like a breach of the ordinary.",
        },
        {
          term: "Why it works",
          text: "Neither group ranked games by popularity. Each named the sea they enjoy, then accepted the matching trade-off. The island-hoppers accepted fantasy grounding to gain a ready sandbox and varied isles; the gritty crew accepted extra prep for campaign links to gain wind, supply, and consequence that their table notices.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Before you buy the rulebook",
      intro: "Run through these with the group in ten minutes:",
      items: [
        "Name the sea in one line: swashbuckling, gritty age-of-sail, sandbox exploration, or a mix, and mark whether you want fantasy isles or historical coasts.",
        "Pick openness against arc: do you want competing chart leads each voyage, or a linked port-to-port campaign you can run as written.",
        "Decide the naval combat you enjoy: every player with a deck job every chase, or faster narration with the occasional broadside set piece.",
        "Agree lethality and tone: how often characters should die or be captured, and whether the table wants heroic daring, grim humour, or grounded survival.",
        "Check time, teaching, and support: who will run it, how fast the group learns, what VTT or table aids exist, and whether you need a ready-made coast or prefer to chart your own.",
        "Run a one-session trial with the starter ship and one island from the book before committing to a campaign, and keep the ship generator and harbour notes nearby for the next lead.",
      ],
    },
  ],
  systemsThatSupportThis: [
    {
      system: "7th Sea Second Edition",
      rationale:
        "Dramatic duelling and stakes-first resolution where Risks, Raises, and Approaches reward daring pirate action.",
      href: "https://www.chaosium.com/7th-sea-second-edition/",
    },
    {
      system: "50 Fathoms (Savage Worlds)",
      rationale:
        "Plot Point sandbox across a cursed archipelago with island-hopping procedures and Savage Worlds card initiative at sea.",
      href: "https://www.peginc.com/product-category/50-fathoms/",
    },
    {
      system: "Pirate Borg",
      rationale:
        "Mörk Borg-based spare d20 piracy with brutal tables, classless characters, and fast ship and misery procedures.",
      href: "https://www.pirateborg.com/",
    },
    {
      system: "Honor + Intrigue",
      rationale:
        "Barbarians of Lemuria-based manoeuvre duelling where advantage, gambits, and fencing styles shape boarding actions.",
      href: "https://www.drivethrurpg.com/en/product/318345/honor-intrigue",
    },
    {
      system: "Ghosts of Saltmarsh (D&D 5E)",
      rationale:
        "Linked harbour-town campaign with ship roles, naval encounters, and port-to-port arcs for groups that already know 5E.",
      href: "https://dnd.wizards.com/products/ghosts-of-saltmarsh",
    },
  ],
  codexConnection: {
    heading: "Chart the campaign once the system is picked",
    paragraphs: [
      "Whatever engine the group chooses, the campaign still needs the same connective tissue: a ship with debts and damage, ports that remember the crew, rival captains with clocks of their own, and isles that offer a different kind of trouble each voyage. Codex Cryptica keeps those pieces linked so a prize taken at sea changes who controls a harbour, who hunts the party, and which chart leads make sense next session.",
      "Build the vessel, its crew, and its quirks with the Ship Generator, stock harbours and hidden coves with the Settlement Generator, give the companies and squadrons behind them motives with the Faction Generator, and keep the whole network visible on the Pirate & High Seas hub between sessions. The system decides how you roll; the linked campaign decides why the roll mattered.",
    ],
    linkText: "Open the pirate generator hub",
    href: "/generators/pirate",
  },
  relatedTools: [
    {
      title: "Ship Generator",
      description:
        "Create a pirate vessel with crew, quirks, damage, and secrets the party can recognise at distance.",
      href: "/generators/ship-generator",
    },
    {
      title: "Pirate Generator Hub",
      description:
        "Open pirate-ready generators for captains, ports, factions, and rumours around your crew.",
      href: "/generators/pirate",
    },
    {
      title: "Settlement Generator",
      description:
        "Build harbour towns, free ports, and island colonies with trade, law, and the trouble that defines them.",
      href: "/generators/settlement",
    },
    {
      title: "Faction Generator",
      description:
        "Create naval squadrons, trading companies, and pirate brotherhoods with competing agendas.",
      href: "/generators/faction",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for Pirate & High Seas Campaigns",
      description:
        "Organise ships, islands, rival fleets, treasure hunts, and trade routes in one connected campaign bible.",
      href: "/for/pirates-high-seas",
    },
  ],
  relatedAnswers: [
    "what-kind-of-ship-should-a-pirate-crew-start-with",
    "how-do-i-create-interesting-islands-and-ports-for-a-pirate-campaign",
    "how-do-i-make-rival-captains-navies-and-pirate-factions-matter",
    "how-do-i-make-sea-travel-interesting-in-a-ttrpg",
    "how-do-i-run-ship-to-ship-combat-without-sidelining-the-party",
    "how-do-i-run-a-pirate-campaign-focused-on-exploration",
    "what-ttrpg-should-i-use-for-a-fantasy-dungeon-crawl",
  ],
  labels: ["pirate"],
  discovery: {
    id: "answer-pirate-ttrpg-selection",
    parentCluster: "pirates-high-seas",
    clusters: ["pirates-high-seas", "pirate"],
    primaryIntent: "what ttrpg should i play for a pirate campaign",
    intentAliases: [
      "best ttrpg for pirates",
      "best pirate tabletop rpg",
      "what pirate rpg should i play",
      "pirate ttrpg recommendations",
      "swashbuckling ttrpg for piracy",
      "pirate rpg for island hopping and exploration",
      "gritty age of sail ttrpg",
      "naval combat ttrpg for pirates",
      "rules light pirate rpg",
      "fantasy piracy vs historical piracy rpg",
      "pirate campaign setting books and third party material",
      "what system for a one piece style pirate campaign",
    ],
    uniqueValue:
      "Matches pirate campaign style to system by voyage loop, not by popularity, covering swashbuckling, sandbox exploration, gritty age-of-sail, naval combat, rules weight, fantasy against history, and ready-made campaign support.",
    userJob: "evaluate",
    relatedIntents: [
      "answer-starter-ship-pirate",
      "answer-islands-ports-pirate-campaign",
      "answer-rival-captains-navies-pirate-factions-matter",
      "answer-sea-travel-interesting",
      "answer-ship-combat-not-sidelining",
      "answer-pirate-exploration-campaign",
      "answer-dungeon-crawl-system-selection",
      "hub-pirate",
      "generator-ship-generator",
      "generator-pirate-hub",
      "for-pirates-high-seas",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-dungeon-crawl-system-selection",
        reason:
          "Sibling system chooser for dungeon crawls. This page owns pirate and high-seas system choice and links across rather than repeating that pattern.",
      },
      {
        with: "answer-starter-ship-pirate",
        reason:
          "That answer helps pick a starter vessel and crew within a chosen system. This page helps pick the system itself, then points readers to the ship answer for the next decision.",
      },
      {
        with: "answer-pirate-exploration-campaign",
        reason:
          "That page structures a pirate campaign as a voyage, discovery, and consequence loop. This page helps choose the engine that best supports that loop or a different one.",
      },
    ],
  },
  seo: {
    title: "What TTRPG should I play for a pirate campaign? | Codex Cryptica",
    description:
      "Pick your pirate system by campaign style: swashbuckling, sandbox island-hopping, gritty age-of-sail, naval combat, or rules-light play, with fantasy against history and campaign support.",
    image:
      "https://assets.codexcryptica.com/og/what-ttrpg-should-i-play-for-a-pirate-campaign.jpg",
    imageAlt:
      "Pirate ships at low light off a tropical archipelago, isles and reefs charted beyond, adventure waiting on each horizon",
  },
};
