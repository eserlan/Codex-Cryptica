import type { AnswerConfigInput } from "../schema";

export const whichTabletopRpgsHaveSquadAndMassBattleRules: AnswerConfigInput = {
  slug: "which-tabletop-rpgs-have-squad-and-mass-battle-rules",
  category: "running-the-game",
  publishedAt: "2026-10-12",
  question:
    "Which tabletop RPGs have useful squad, unit and mass-battle rules?",
  kind: "comparison",
  shortAnswer:
    "Different TTRPGs solve different scales of group combat, so pick by the job you actually need. Pathfinder Second Edition uses Troop creatures to collapse a formation into one map token, 13th Age uses Mooks with a shared hit point pool to thin a mob without changing the encounter, Savage Worlds Adventure Edition resolves army clashes with an abstract Mass Battle procedure that PC actions modify, and Reign resolves organisation-level Company conflict alongside character play. Each abstracts different things, so no single system covers mook pooling, single-token troops, mass battles and long-term organisation conflict equally well.",
  sections: [
    {
      kind: "prose",
      heading: "Five jobs that look like one problem",
      paragraphs: [
        "GMs who want larger fights often describe them in one phrase such as squad rules or mass combat, but at the table those words point to five distinct jobs. Reducing the number of enemy turns in an otherwise normal encounter, representing many fighters as one battlefield unit, letting player characters lead or accompany organised squads, resolving army clashes whilst the party makes consequential choices, and tracking how organisations fight across a campaign each ask for a different kind of abstraction.",
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
          term: "I want fewer enemy turns but the same encounter",
          text: "Keep the fight at character scale and reduce bookkeeping. You need a shared hit point pool that lets you remove figures quickly without changing movement or the map. 13th Age Mooks do this most directly.",
        },
        {
          term: "I want many fighters represented by one battlefield unit",
          text: "Put a formation on the map that occupies space and threatens like one creature, with damage that represents attrition. Pathfinder Second Edition Troops do this as a creature type with specific traits and weaknesses.",
        },
        {
          term: "I want PCs to lead, accompany or oppose organised squads",
          text: "Give squads, platoons or companies orders and let the party act within that structure. Light squad handling can be improvised around Troops or Mooks, but formal support comes from Reign Companies or a mass-battle framework.",
        },
        {
          term: "I want armies to clash while individual PCs make consequential choices",
          text: "Resolve the wider engagement abstractly, then let player actions apply modifiers or create advantages within it. Savage Worlds Mass Battles is built for this dual layer. MCDM Kingdoms and Warfare also aims here at higher complexity.",
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
          "Pathfinder 2e Troops (Bestiary 3, Monster Core 2)",
          "Single troop token",
          "Positions, footprint, formation damage and attrition; area attacks and weak to splash",
          "Fight the troop as one creature on the battlemap",
          "Needs a grid; less granular than individual soldiers",
        ],
        [
          "13th Age Mooks (Core Rulebook ch. 7)",
          "Mob of individuals",
          "Shared hit point pool across several figures; damage spills to the next mook",
          "Fight a normal encounter with fewer turns to track",
          "Mob still occupies several positions; not a single formation token",
        ],
        [
          "Savage Worlds Mass Battles (SWADE Core, p. 133)",
          "Army or large force",
          "Battle progress via opposed Battle rolls, tokens and battle advantages over rounds",
          "Elite actions modify the battle roll or grant advantages",
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
          "Unit stat blocks, warfare turns, and domain actions alongside character play",
          "Lead or attach to units; domain decisions between battles",
          "Optional expansion; highest prep and complexity of this set",
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
          text: "Introduced in Bestiary 3 for Second Edition and carried into the remastered Monster Core 2, a Troop is a single Large or larger creature that represents 12 to 30 members acting as a formation. It occupies one footprint (commonly 16 squares for a Large troop), moves as one creature, and makes formation attacks that affect an area rather than one target. Damage to a Troop represents attrition, and the trait list typically includes Troop Traits: immune to single-target conditions that target one body, weak to area damage and splash damage, and unable to be flanked or tripped in the normal way. At the table you place one miniature or token, track one initiative count and one hit point total, and describe casualties as the hit points fall. Player characters interact with the Troop as they would any creature on the grid. Best fit when you already use a battlemap and want many combatants visible without many creatures. Trade-off: you lose the ability to pick off individuals one by one or to split the formation without extra adjudication.",
        },
        {
          term: "13th Age Mooks: many figures, one shared pool",
          text: "In Pelgrane Press 13th Age (Core Rulebook, running battles guidance), a mook is a weak enemy that shares a hit point pool with its group. The pool might be 15 hit points for five mooks at 3 each, or double or triple strength mooks that count as two or three figures for encounter building. The GM tracks one pool, and when damage equals one mook's hit points that figure drops, with excess spilling to the next. The group still rolls individually for attacks (often as several d20 rolls) and occupies normal positions, but bookkeeping collapses from five totals to one. Critically, mooks are not a formation token: they do not gain a shared footprint or formation attacks, and the rules keep them distinct from a Troop creature. Best fit for ordinary encounters where five orcs should feel like five orcs but resolve faster. Trade-off: the mob still needs several attack rolls and several positions, so it saves hit point tracking more than it saves map handling.",
        },
        {
          term: "Savage Worlds Adventure Edition Mass Battles: resolve the war, play the moments",
          text: "In Pinnacle Entertainment Group Savage Worlds Adventure Edition core (Mass Battles section), each side has tokens equal to army strength, then the battle runs for a set number of rounds as opposed Battle rolls. Player character actions before or during a round create modifiers or advantages such as breaking enemy supply, rallying troops or duelling an enemy champion, and the round's result moves tokens and triggers consequences. The procedure is explicit about its job: it does not replace ordinary combat. The group still runs character-scale encounters for the scenes where the party is present, and those scenes feed the modifiers. Normal Extras and skirmish fights remain separate; Mass Battles sit above them. Battle itself uses knowledge, persuasion, fighting and similar skills as narrative levers, not as a second tactical map. Best fit for frontier skirmishes through large engagements where the party's deeds should matter without rolling for every soldier. Trade-off: the war is abstract, so groups who want to push units around a map will need a different game or an additional supplement. Complexity is low once you have read the two-page procedure.",
        },
        {
          term: "Reign Second Edition Companies: organisations that act between sessions",
          text: "Reign Second Edition (One Roll Engine, Greg Stolze) splits resolution into character-scale and Company-scale. A Company has qualities such as Might, Treasure, Influence and Territory, and takes monthly actions such as raising forces, securing supply, raiding, negotiating or entrenching. Characters can act as leaders, agents or opponents whose successes create bonuses, penalties or new facts for the Company roll. This is not a fast way to resolve a single battlefield afternoon, it is a campaign structure for wars, guild rivalries, house conflicts and similar long-horizon contests that persist between sessions. Best fit for campaigns where the question is who controls what after months of pressure rather than who wins one battle. Trade-off: it is a genuine subsystem tied to the One Roll Engine dice, so the table learns two linked games, and it assumes the group wants organisation play to be a recurring focus.",
        },
        {
          term: "MCDM Kingdoms & Warfare: optional player-led armies and units",
          text: "MCDM Productions Kingdoms and Warfare is a supplement for fifth edition, not part of any core rulebook. It gives units stat blocks, warfare turns and domain-level actions for campaigns where the party leads armies. The rules include specialised unit types, command checks and a larger domain layer between battles. Include it only if source quality and complexity justify it for your table, and verify the print or PDF you hold before promising it to players. As an optional expansion the table should agree on it in advance rather than treating it as default content that every player at a 5e table will know. Best fit as a contrasting example of high-prep, player-led army play when the group wants units on a map and a domain game around them. Trade-off: highest preparation and teaching burden in this set, and it commits the campaign to its domain assumptions. Do not label it a core rule.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "How PCs participate in each approach",
      paragraphs: [
        "The four levels ask different things of the characters, and a mismatch here is the most common disappointment. With Mooks, the party fights alongside a normal encounter, just a faster one. With Troops, they fight a formation token that occupies space and threatens an area, which suits martial characters who can exploit formation traits and spellcasters with area effects. With Mass Battles, the party acts as an elite strike team whose successes or failures before and during each round give the battle modifiers that move tokens, rather than fighting the whole army body to body. With Companies, the characters act as leaders, negotiators, saboteurs or champions whose deeds between turns create the circumstances the Company then tests.",
        "Match expectations explicitly before play. If half the table expects to push a unit and the other half expects their characters to duel the enemy captain whilst the armies grind around them, no single procedure will satisfy both. Name the scale, show the token or track you will actually use, and give the party one or two actions that visibly move it, rather than asking for generic help that disappears into a modifier the players never see.",
      ],
    },
    {
      kind: "prose",
      heading: "Crunch, prep and mapping",
      paragraphs: [
        "Mooks add almost no preparation. Build the encounter as normal, set the shared pool, and run the fight with your existing map or without one. Troops need a little more: one stat block that replaces many, a clear footprint on the battlemap, and a reminder of which attacks are area effects. Both fit inside ordinary session preparation.",
        "Mass Battles need specific preparation once, then run quickly. Before the war, set each side's tokens and the number of rounds, decide which Battle skills matter, and prepare two or three character-scale scenes that can create advantages. During play, each round is one opposed roll with advantages applied, which is fast. Companies and Kingdoms and Warfare sit higher on the scale. Companies ask for a standing Company sheet and monthly turns between sessions, and Kingdoms and Warfare asks for unit sheets and a domain record. Those suit campaigns that have chosen organisation or army play as a pillar, not a one-off set piece.",
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
          text: "The party of four meets five orcs guarding a ford. The fight should be fast but still feel like five opponents, not one abstraction. Build five mooks that share 25 hit points (5 each) rather than tracking five separate totals. The fighter hits for 7, so one mook drops and the remaining 18 carries forward with 2 damage spilling to the next figure, whom the wizard finishes with an area spell for 9 that removes one full mook and wounds the next. The GM still rolls several attacks and places several figures, but hit point tracking collapses to one pool. A Troop would be the wrong tool here because the party expects to pick off individuals and the encounter is ordinary, not a formation that threatens as one block. Reaching for a Mass Battle roll would be disproportionate to the stakes.",
        },
        {
          term: "PCs escort or command a platoon during a frontier skirmish",
          text: "The party must get a platoon of twelve militia across a ridge before enemy scouts arrive. The GM wants the platoon visible on the map as one element the party can lead without tracking twelve soldiers. Use one Troop token for the militia, Large, 16 squares, with a formation volley that affects an area and weakness to enemy area attacks. The party moves the Troop on its initiative, the cleric's bless applies to the Troop's attack, and damage to the Troop narrates as attrition to the formation. If the scout captain challenges the party whilst the platoon holds the ridge, that duel runs as normal character-scale combat alongside the Troop's presence rather than rolling for each militia member. If later the skirmish grows into a campaign arc where the militia must hold territory for months, promote this to Company conflict between sessions rather than stretching a single Troop fight beyond its purpose.",
        },
        {
          term: "PCs undertake a mission while two armies fight around them",
          text: "Two armies of about 400 each meet on a plain. The party are not generals, they are tasked with holding a signal hill so reserves arrive on time. The GM sets Mass Battles with 6 tokens per side over 4 rounds. Before round one, the party runs a character-scale scene to secure the hill, and success grants a plus two to the next Battle roll and denies the enemy an advantage from unopposed scouts. The GM rolls opposed Battle checks, moves one token, then cuts back to the party as enemy skirmishers counter-attack the hill. The war is not fought on the battlemap, the hill is. After four rounds the tokens show a narrow friendly advantage, and the GM narrates how the held hill gave reserves time to commit, which matches what the players visibly achieved. A Troop alone would not answer who won the wider field, and a Company turn would be the wrong tempo for an afternoon battle.",
        },
        {
          term: "Why it works",
          text: "Each mechanic was matched to the scale of its fiction. Mooks handled attrition inside one encounter, a Troop made a platoon legible on a map, and Mass Battles let an elite mission affect a larger engagement without simulating every combatant. None of the five systems claimed here does all three, which is the point the chooser reinforces.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Common confusions to avoid",
      paragraphs: [
        "Do not treat mooks and troops as the same idea. A 13th Age mook pool still models several individuals who attack separately and can be dropped one by one, a Pathfinder Troop models one formation that takes area damage differently and threatens as a block, and Mass Battles do not model either. The sourcebooks keep these categories distinct, and the table runs more smoothly when you do too.",
        "Do not treat optional supplements as core rules. Kingdoms and Warfare is an optional expansion for fifth edition, not a default rule every 5e table shares, and it should be named as such when you pitch it. Conversely, Pathfinder Troops are part of Bestiary 3 and the remastered Monster Core 2, and 13th Age Mooks and Savage Worlds Mass Battles are in their respective core rulebooks, so players can reasonably expect to find them without extra purchases. For any system, confirm the edition and book before you promise a mechanic at the table, since supplements and print runs move content between volumes.",
        "Do not expect one subsystem to cover both single-battle and campaign scales. Savage Worlds Mass Battles resolves an engagement of hours, Reign Companies resolve contests of weeks and months. If your campaign needs both, plan to use two tools at different cadences rather than stretching one beyond its design.",
      ],
    },
    {
      kind: "checklist",
      heading: "Pick the right tool before you prep",
      intro: "Answer these before you open a stat block:",
      items: [
        "Name the job in one sentence: fewer turns, one visible formation, a squad to lead, an army clash that PCs affect, or a long organisation contest.",
        "Confirm edition and book for the mechanic you intend to use, and note whether it is core or an optional supplement so the table shares expectations.",
        "Decide whether the next session needs a battlemap token, a shared hit point pool, an abstract battle track, or a Company sheet, since each implies different preparation.",
        "Plan what the PCs will visibly do that moves the chosen abstraction: an area spell against a Troop, a held hill for a Battle roll, or a negotiation that creates a Company advantage.",
        "Prepare one fallback if the fiction changes scale mid-session, such as promoting a Troop skirmish to a Mass Battle or a Company turn rather than forcing one mechanic to cover everything.",
      ],
    },
  ],
  systemsThatSupportThis: [
    {
      system: "Pathfinder Second Edition",
      rationale:
        "Troop rules in Bestiary 3 and Monster Core 2 collapse a formation into one creature with a footprint, formation attacks and attrition-based hit points.",
      href: "https://2e.aonprd.com/Rules.aspx?ID=3365",
    },
    {
      system: "Savage Worlds Adventure Edition",
      rationale:
        "Mass Battles resolve army engagements over several opposed Battle rolls whilst character-scale scenes create modifiers and advantages.",
      href: "https://peginc.com/savage-worlds/",
    },
    {
      system: "13th Age",
      rationale:
        "Mook rules share a hit point pool across several weak enemies so damage spills from one figure to the next in a normal encounter.",
      href: "https://pelgranepress.com/product/13th-age-core-rulebook/",
    },
    {
      system: "Reign Second Edition",
      rationale:
        "Company rules resolve organisation-scale conflict alongside character play using Might, Influence and Territory over campaign turns.",
      href: "https://www.atlas-games.com/product/reign-second-edition",
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
