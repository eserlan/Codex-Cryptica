import type { AnswerConfigInput } from "../schema";

export const whichTabletopRpgsHaveSquadAndMassBattleRules: AnswerConfigInput = {
  slug: "which-tabletop-rpgs-have-squad-and-mass-battle-rules",
  category: "running-the-game",
  publishedAt: "2026-10-12",
  question:
    "Which tabletop RPGs have useful squad, unit and mass-battle rules?",
  kind: "comparison",
  shortAnswer:
    "Different TTRPGs solve different scales of group combat, so pick by the job you need. Pathfinder Second Edition Troops represent a formation as one creature on the map; 13th Age Mooks share hit point bookkeeping but still move and attack individually; Savage Worlds Adventure Edition resolves army clashes with an abstract Mass Battle procedure that PC actions can support; and Reign resolves organisation-level Company conflict alongside character play. These mechanics abstract different things: a shared hit point pool does not remove individual activations, and no one system here covers every scale equally well.",
  sections: [
    {
      kind: "prose",
      heading: "Five jobs that look like one problem",
      paragraphs: [
        "GMs who want larger fights often describe them in one phrase such as squad rules or mass combat, but at the table those words point to five distinct jobs: reducing hit point bookkeeping in an ordinary encounter, representing many fighters as one battlefield unit, handling organised squads, resolving army clashes whilst the party makes consequential choices, and tracking organisations across a campaign.",
        "If the mechanic does not match the job, it creates friction. A rule that pools hit points to thin a mob will not tell you who holds a ridge line. A rule that resolves a battle with a few opposed rolls will not give you a token to push around a grid. The chooser below sorts systems by what they actually abstract, then the comparison explains how each rule works at the table, what the player characters do within it, and what you trade away.",
      ],
    },
    {
      kind: "list",
      heading: "Quick chooser by level of abstraction",
      intro:
        "Start with the sentence that matches your next session, then read that row in the table:",
      items: [
        {
          term: "I want less hit point bookkeeping in the same encounter",
          text: "Keep the fight at character scale and pool damage across a mob. 13th Age Mooks do this without combining their movement or attacks: each mook still acts individually.",
        },
        {
          term: "I want many fighters represented by one battlefield unit",
          text: "Put a formation on the map that occupies space and threatens like one creature, with damage that represents attrition. Pathfinder Second Edition Troops do this as a creature type with specific traits and weaknesses.",
        },
        {
          term: "I want PCs to lead, accompany or oppose organised squads",
          text: "Decide how the party interacts with a squad, platoon or company. Troops represent formations and Reign Companies handle organisations, but neither entry establishes a general platoon-command procedure; any allied squad orders need table adjudication.",
        },
        {
          term: "I want armies to clash while individual PCs make consequential choices",
          text: "Resolve the wider engagement abstractly, then let PCs Support the commander or create advantages through optional missions. Savage Worlds Mass Battles is built for this dual layer. MCDM Kingdoms & Warfare adds warfare and domain play for groups that want both layers.",
        },
        {
          term: "I want campaigns where organisations fight over long timescales",
          text: "Track conflicts between groups that persist between sessions, with resources, influence and territory at stake. Reign Company rules handle this as a separate resolution layer alongside normal play.",
        },
      ],
    },
    {
      kind: "table",
      heading: "Cross-system comparison",
      headers: [
        "System and source",
        "Scale",
        "What it abstracts",
        "PC role",
        "Trade-off",
      ],
      rows: [
        [
          "Pathfinder 2e Troops (NPC Core; first appeared in Bestiary 3)",
          "Single troop token",
          "Four-segment footprint and attrition; coordinated attacks and troop defences",
          "Fight the troop as one creature on the battlemap",
          "Needs a grid; less granular than individual soldiers",
        ],
        [
          "13th Age Mooks (Core Rulebook, first edition)",
          "Mob of individuals",
          "Shared hit point pool across several figures; damage spills to the next mook",
          "Fight individual mooks; pool only their hit point bookkeeping",
          "Movement and attacks remain individual; not a formation token",
        ],
        [
          "Savage Worlds Mass Battles (Adventure Edition core rules)",
          "Army or large force",
          "Relative force tracked with tokens, opposed Battle rolls and morale checks",
          "PCs Support the commander's Battle roll or take an optional mission",
          "Abstract; not a tactical map game for the whole war",
        ],
        [
          "Reign 2e Companies (One Roll Engine)",
          "Organisation",
          "Territory, influence, resources and many-member actions resolved as Company turns",
          "Act as characters, agents or leaders whose deeds affect Company rolls",
          "Additional subsystem to learn; linked to ORE dice",
        ],
        [
          "MCDM Kingdoms & Warfare (supplement)",
          "Units and armies",
          "Army warfare and domain intrigue alongside character play",
          "Remain adventurers amid domain and warfare play",
          "Optional expansion with a domain layer and unit rules",
        ],
      ],
    },
    {
      kind: "list",
      heading: "What each system actually does at the table",
      intro:
        "Read this before you commit to a book. Each row names edition, source and table behaviour:",
      items: [
        {
          term: "Pathfinder Second Edition Troops: one token, many soldiers",
          text: "Pathfinder Second Edition Troops first appeared in Bestiary 3; their current general rules are in NPC Core. A Troop is one creature made up of four contiguous 10-foot-square segments, usually containing Small or Medium members. It moves as a formation and uses coordinated actions, often against an area. When its HP reaches two-thirds and then one-third of its starting total, it loses a segment at each threshold; its defences and weaknesses depend on the rules and stat block. Best fit when you want a large force visible on a battlemap without tracking each member. Trade-off: individual soldiers cannot be targeted or split off without extra adjudication.",
        },
        {
          term: "13th Age Mooks: many figures, one shared pool",
          text: "In Pelgrane Press's 13th Age Core Rulebook (first edition), Mooks share a pool for damage: each mook has an individual HP value, and excess damage spills to the next. They still move and attack individually, so this reduces HP bookkeeping rather than the number of activations. Best fit for ordinary encounters where a mob should remain several opponents. Trade-off: the GM still handles their separate positions and actions.",
        },
        {
          term: "Savage Worlds Adventure Edition Mass Battles: resolve the war, play the moments",
          text: "Savage Worlds Adventure Edition (SWADE) resolves a Mass Battle with Force Tokens, opposed Battle rolls by commanders and morale checks. Player characters can Support the commander using a skill they choose; a success grants +1 and inflicts Fatigue, while a raise grants +2 or a Battle Effect without Fatigue. A separate character-scale mission can also create an advantage, but that is optional scene framing, not a required part of each round. Best fit when the party should affect a large engagement without resolving every soldier. Trade-off: the battle is abstract rather than a tactical unit map.",
        },
        {
          term: "Reign Second Edition Companies: organisations that act between sessions",
          text: "Reign: Rules, Second Edition (Greg Stolze, One Roll Engine) adds Company-scale resolution alongside character play. A Company represents an organisation and its resources; characters' actions can create advantages or penalties for Company rolls. This is a campaign structure for wars, guild rivalries and other long-running contests, rather than a quick way to resolve one battlefield afternoon. Best fit when the group wants organisation play to recur between sessions. Trade-off: it adds a linked subsystem using One Roll Engine dice.",
        },
        {
          term: "MCDM Kingdoms & Warfare: domain play and warfare for fifth edition",
          text: "MCDM Productions' Kingdoms & Warfare is an optional supplement originally written for Dungeons & Dragons fifth edition. Its 320-page book combines domain intrigue and warfare with the player characters continuing as adventurers. Best fit for a group that wants organisations and armies to matter alongside character adventures. Trade-off: it adds a domain and warfare layer, so it asks for more preparation than a single encounter or battle procedure.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Crunch, prep and mapping",
      paragraphs: [
        "A Mook fight needs one shared HP pool; a Troop needs its footprint and HP thresholds on the map. For SWADE, set Force Tokens and identify the commanders; prepare a separate character-scale mission only if you want that optional scene. Reign and Kingdoms & Warfare need Company or domain records and resources that can carry between sessions.",
      ],
    },
    {
      kind: "example",
      heading: "Three situations, three different mechanics",
      paragraphs: [
        "The same fantasy frontier can produce three problems that look similar in fiction but call for different tools at the table. Each example names the inputs, the resolution and what the players see next.",
      ],
      items: [
        {
          term: "Five orcs should fight as a group during an ordinary encounter",
          text: "The party of four meets five orcs guarding a ford. Give the five 5-HP Mooks one 25-HP pool. The fighter deals 7 damage: one Mook falls and 2 damage carries over, leaving 3 HP on the next. A second attack deals 9 damage to the mob: it removes that Mook's remaining 3 HP and 5 HP from the next, with 1 damage carrying to another. The pool has 9 HP left, with three Mooks fallen and two still standing; one has taken 1 damage. Their movement and attacks remain individual, but the GM tracks one HP pool. A Troop would be the wrong tool if the party should pick off individual opponents.",
        },
        {
          term: "PCs escort or command a platoon during a frontier skirmish",
          text: "The party must get militia across a ridge before enemy scouts arrive. For a Pathfinder 2e example, use the NPC Core Phalanx Formation, a level 6 Troop with 99 HP and four segments. On its turn it can use Spears Out!, a one to three-action attack that makes each enemy in a 10-foot emanation attempt a basic Reflex save (DC 21). When its HP reaches 66 and then 33, it loses a segment as its footprint shrinks. If the party gives this allied Troop orders or shares its initiative, that is GM adjudication; NPC Core does not provide a general platoon-command procedure. A cleric's bless would affect attack rolls, not this save-based action. If the scout captain challenges the party, run that duel as ordinary character-scale combat. A longer campaign to hold territory might use Reign's Company rules instead.",
        },
        {
          term: "PCs undertake a mission while two armies fight around them",
          text: "Two armies of about 400 meet on a plain. The party must hold a signal hill so reserves can arrive on time. In SWADE, commanders make opposed Battle rolls as Force Tokens track each side. PCs can Support their commander with a chosen skill; a success grants +1 and inflicts Fatigue, while a raise grants +2 or a Battle Effect without Fatigue. The GM may also play out a separate mission to secure the hill; that is optional scene framing, and any bonus for success is an adjudicated effect. The hill gives the reserves a plausible route into the battle, while the wider war stays abstract. A Troop alone would not resolve who wins the field, and a Company turn uses a longer campaign timescale.",
        },
        {
          term: "Why it works",
          text: "Each mechanic matches a different scale: Mooks pool damage, a Troop represents a formation on the grid, and Mass Battles resolve a wider engagement. The chooser's job is to help you pick the one your next session needs.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Pick the right tool before you prep",
      intro: "Answer these before you open a stat block:",
      items: [
        "Name the job: pool damage, show a formation on a map, support an army battle, or track organisation conflict.",
        "Confirm the edition and book, especially when using an optional supplement.",
        "Choose what the PCs can change and what record the table needs: a footprint, a battle track, or a Company sheet.",
      ],
    },
  ],
  systemsThatSupportThis: [
    {
      system: "Pathfinder Second Edition",
      rationale:
        "NPC Core explains Troop footprints and segment loss at HP thresholds; its Phalanx Formation entry shows coordinated actions. Troops first appeared in Bestiary 3.",
      href: "https://2e.aonprd.com/NPCs.aspx?ID=3527",
    },
    {
      system: "Savage Worlds Adventure Edition",
      rationale:
        "Adventure Edition Mass Battles use opposed commander Battle rolls, with PCs able to Support using a chosen skill.",
      href: "https://s3-us-west-2.amazonaws.com/peg-swade/SWEX_to_SWADE.pdf",
    },
    {
      system: "13th Age",
      rationale:
        "The first-edition rules share damage across a mob while Mooks still move and attack individually.",
      href: "https://pelgranepress.com/files/13th_Age/13th_Age_System_Reference_Document.pdf",
    },
    {
      system: "Reign Second Edition",
      rationale:
        "Company rules resolve organisation-scale conflict alongside character play using Might, Influence and Territory over campaign turns.",
      href: "https://atomicovermind.com/reign/",
    },
    {
      system: "MCDM Kingdoms & Warfare",
      rationale:
        "The fifth-edition supplement combines domain intrigue and warfare while the player characters remain adventurers.",
      href: "https://shop.mcdmproductions.com/products/kingdoms-warfare-hardcover-pdf",
    },
  ],
  codexConnection: {
    heading: "Keep squad and army play tied to your campaign",
    paragraphs: [
      "Whatever scale you choose, the useful record after the session is what changed. Note which Troop was broken, which Battle advantage the party created, or which Company action shifted territory, and link that consequence to the factions and locations it touches. That way the next fight starts from a visible state rather than a blank map.",
      "Codex Cryptica does not run mass combat for you. Use it to generate the encounter, faction or NPC behind the war, then keep their motives, reserves and terrain linked so the next platoon skirmish or army clash has a reason to happen.",
    ],
    linkText: "Generate an encounter",
    href: "/generators/encounter",
  },
  relatedTools: [
    {
      title: "Encounter Generator",
      description:
        "Build the character-scale scenes that sit inside squad and mass-battle play.",
      href: "/generators/encounter",
    },
    {
      title: "Faction Generator",
      description:
        "Give each side a motive and resources that explain what the war is really about.",
      href: "/generators/faction",
    },
    {
      title: "NPC Generator",
      description:
        "Create the officers, champions and runners whose actions create Battle advantages.",
      href: "/generators/npc",
    },
  ],
  relatedForPages: [],
  relatedAnswers: [
    "how-do-i-combine-multiple-enemies-into-one-squad-in-an-rpg",
    "how-do-i-run-a-large-battle-when-the-player-characters-are-part-of-an-army",
    "what-rpg-should-i-use-for-tactical-combat",
    "how-do-i-balance-rpg-combat-encounters-without-a-tpk",
    "what-makes-a-good-random-encounter",
  ],
  discovery: {
    parentCluster: "encounter-design",
    clusters: ["encounter-design", "running-the-game"],
    primaryIntent: "which tabletop rpgs have squad unit and mass battle rules",
    intentAliases: [
      "rpg systems with mass battle rules",
      "tabletop rpg squad rules",
      "rpg troop rules",
      "rpg army combat player characters",
      "mass combat games for fantasy rpgs",
      "which rpgs have mass combat mechanics",
      "squad platoon unit rules ttrpg",
    ],
    uniqueValue:
      "Mechanics-first chooser that distinguishes mook pooling, single-token troops, mass battles and organisation conflict, then maps each to verified system rules with PC roles and trade-offs.",
    userJob: "evaluate",
    relatedIntents: [
      "answer-large-battle-pcs-in-army",
      "answer-tactical-combat-system-selection",
      "answer-encounter-balance",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-large-battle-pcs-in-army",
        reason:
          "That page teaches how to stage meaningful PC objectives inside any large battle; this page compares which published mechanics to use for squads, troops, mass battles and organisation conflict.",
      },
      {
        with: "answer-tactical-combat-system-selection",
        reason:
          "That page helps groups choose a system for individual-scale tactical depth; this page is about group and army scales and explicitly distinguishes mooks, troops, units and companies from single-character tactics.",
      },
    ],
  },
  seo: {
    title: "Which TTRPGs Have Squad and Mass-Battle Rules? | Codex Cryptica",
    description:
      "Compare squad, troop and mass-battle mechanics across Pathfinder 2e, 13th Age, Savage Worlds and Reign, with a chooser for your next session.",
    image:
      "https://assets.codexcryptica.com/og/which-tabletop-rpgs-have-squad-and-mass-battle-rules.jpg",
    imageAlt:
      "Fantasy battle standards and unit banners on a ridge at dusk, with a small adventuring party visible in the foreground",
  },
};
