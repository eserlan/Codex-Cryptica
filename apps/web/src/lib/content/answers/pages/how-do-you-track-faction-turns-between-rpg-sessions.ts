import type { AnswerConfigInput } from "../schema";

export const howDoYouTrackFactionTurnsBetweenRpgSessions: AnswerConfigInput = {
  slug: "how-do-you-track-faction-turns-between-rpg-sessions",
  category: "session-prep",
  publishedAt: "2026-09-07",
  question: "How do you track faction turns between RPG sessions?",
  kind: "framework",
  shortAnswer:
    "A faction turn should answer one question: what changed in the world while the players were busy elsewhere? Track it with a five-step record for each active organisation: define its immediate intent, choose one action against a specific target, resolve the outcome, surface a visible consequence in the game world, and log the change on your campaign timeline. Limiting each organisation to one action per downtime cycle keeps that answer clear without turning prep into spreadsheet bookkeeping.",
  sections: [
    {
      kind: "prose",
      heading: "A faction turn only needs to answer one question",
      paragraphs: [
        "As more factions become active, it's easy to lose track of who acted, what changed, and which consequences the players have actually seen. A GM trying to be thorough can end up tracking resources, rosters, and rival moves for organisations nobody at the table is thinking about, and a tool meant to save prep time turns into more prep.",
        "A faction turn should answer one question: what changed in the world while the players were busy elsewhere? An off-screen organisation needs only enough structure to say what it tried to do, who it targeted, what evidence it left behind, and what changed on the campaign map — everything else is detail in service of that answer.",
      ],
    },
    {
      kind: "list",
      heading: "The five-step faction turn loop",
      intro:
        "Resolve each active organisation during between-session prep using five focused steps:",
      items: [
        {
          term: "Define the intent",
          text: "Identify what the faction needs right now to advance its agenda. Keep this specific to a single objective, such as seizing an abandoned watchtower, blackmailing a town magistrate, or cornering the salt trade, rather than a vague multi-year ambition.",
        },
        {
          term: "Select a targeted action",
          text: "Choose how the faction pursues that intent this cycle. Standard moves include expanding territory, seizing an asset, infiltrating a rival, forging a pact, or sabotaging an enemy holding. Always name the specific NPC, location, or rival involved.",
        },
        {
          term: "Resolve the outcome",
          text: "Decide whether the move succeeds, stalls, or triggers a setback. In narrative systems, compare the faction's standing and resources against its target. In dice-driven games, make a single opposed roll or advance a progress clock.",
        },
        {
          term: "Surface a visible consequence",
          text: "Translate the result into tangible evidence the players encounter next session. A failed infiltration leaves an arrested spy in the stocks; a successful raid leaves smoke on the horizon, displaced villagers on the road, and doubled sentry watches at the gate.",
        },
        {
          term: "Log what changed",
          text: "Record the result as a dated entry on your campaign timeline and update the faction's relationship to its target. Logging it immediately avoids contradictions later, when players ask when the docks burned down.",
        },
      ],
    },
    {
      kind: "example",
      heading: "Worked example: resolving the Ironmongers between sessions",
      paragraphs: [
        "The Ironmongers Guild wants to shut down an unlicensed foundry operated by a smuggling ring in the river quarter. Compare resolving this through spreadsheet simulation against the five-step loop.",
      ],
      items: [
        {
          term: "The spreadsheet simulation trap",
          text: "The GM tracks gold reserves, payroll, and a roster of hirelings across several notebook pages, then spends forty minutes rolling skirmishes between guards and smugglers. None of it reaches the table — the players just hear that scrap prices went up.",
        },
        {
          term: "The five-step turn loop",
          text: "The GM notes the intent (choke off the foundry's fuel supply), picks an action (bribe river gatekeepers to impound charcoal barges), resolves a simple check with a complication, and notes one visible consequence: the city watch halts all river traffic at the watergate to search cargo, creating an angry queue of boatmen. The GM logs the timeline entry: '24th of Sunwane: Ironmongers blockade watergate; river quarter coal prices double.'",
        },
        {
          term: "Why it works",
          text: "The turn resolves in two minutes, creates an immediate physical obstacle the party must navigate when trying to leave town by boat, and attaches an unambiguous historical record to both the guild and the harbour.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Limit active turns to organisations in the party's orbit",
      paragraphs: [
        "A common mistake is attempting to run between-session turns for every nation, cult, and syndicate on the world map. Restrict active turns to three or four factions that currently matter to the party. Distant factions can advance on broad seasonal milestones when the party travels to new regions.",
        "When the players deliberately ignore an active faction's move, that's still information worth acting on. If nobody is meaningfully opposing it, consider letting the move succeed without a roll — unopposed momentum makes the campaign world feel alive. If another faction or some other obstacle still stands in the way, resolve it normally, perhaps from a stronger position. When the party chooses to pursue a dungeon rumour rather than guard the granary, the grain cartel might complete its monopoly on schedule and the town faces food rationing, unless a rival guild or a bad harvest gets there first.",
      ],
    },
    {
      kind: "checklist",
      heading: "Between-session faction turn checklist",
      intro: "Complete this sequence before concluding your session prep:",
      items: [
        "Pick no more than three or four factions active around the party.",
        "Assign each faction one specific action targeting a named NPC, location, or rival.",
        "Resolve the action with a single opposed check, a clock tick, or a plain comparison of who has the advantage.",
        "Note at least one visible consequence the players will notice or hear about next session.",
        "Update the relationship links on your campaign map and log the outcome on the timeline.",
      ],
    },
  ],
  codexConnection: {
    heading: "Connecting faction activity directly to the campaign graph",
    paragraphs: [
      "In Codex Cryptica, organisations are first-class campaign entities connected directly to the locations they control, the rivals they oppose, and the NPCs they employ. When a faction turn resolves, updating the relationship between the organisation and its target updates your interactive campaign graph immediately, rather than leaving notes scattered across loose session recaps.",
      "Logging turn outcomes directly into the campaign timeline establishes a chronological history for every organisation. You can inspect any faction's past actions at a glance, verifying when rivalries flared or territory changed hands without searching through months of notes.",
    ],
    linkText: "Manage campaign factions in Codex Cryptica",
    href: "/solutions/campaign-manager",
  },
  systemsThatSupportThis: [
    {
      system: "Stars Without Number",
      rationale:
        "Between player adventures, organisations spend FacCreds, manoeuvre discrete Force, Cunning, and Wealth assets across the sector map, and execute attacks against rival holdings to pursue designated faction goals.",
      href: "https://www.drivethrurpg.com/product/230009/Stars-Without-Number-Revised-Edition-Free-Version",
    },
    {
      system: "Reign",
      rationale:
        "The Company rules treat organisations as characters with five core qualities, resolving large-scale moves between player adventures through a single pool roll for actions such as attacking territory, countering infiltration, or improving wealth.",
      href: "https://atomicovermind.com/reign/",
    },
    {
      system: "Blades in the Dark",
      rationale:
        "During downtime between scores, the GM advances segmented progress clocks for active city factions by rolling a fortune roll based on faction Tier, letting rival schemes develop off-screen without requiring detailed tactical simulation.",
      href: "https://bladesinthedark.com/faction-game",
    },
  ],
  relatedTools: [
    {
      title: "Faction generator",
      description:
        "Generate factions with distinct agendas, resources, and rivalries ready for your campaign.",
      href: "/generators/faction",
    },
    {
      title: "Council vote generator",
      description:
        "Turn political faction moves into dramatic voting scenes with shifting NPC allegiances.",
      href: "/generators/council-vote",
    },
    {
      title: "Quest hook generator",
      description:
        "Transform faction turn consequences into actionable adventure hooks for your players.",
      href: "/tools/quest-hook-generator",
    },
  ],
  relatedForPages: [
    {
      title: "Sandbox RPG Campaigns",
      description:
        "Run player-directed sandbox campaigns with live relationship maps and active faction tracking.",
      href: "/for/sandbox-campaigns",
    },
    {
      title: "Fantasy Worldbuilding",
      description:
        "Organise interconnected factions, history, and lore across an evolving campaign setting.",
      href: "/for/fantasy-worldbuilding",
    },
  ],
  relatedAnswers: [
    "how-do-you-run-factions-in-a-sandbox-campaign",
    "how-do-you-create-a-fantasy-faction",
    "how-do-you-manage-a-campaign-timeline-in-an-rpg",
    "how-do-you-organise-npc-relationships",
    "how-do-you-track-unresolved-plot-hooks-in-an-rpg-campaign",
    "how-do-you-run-a-scene-with-multiple-npcs",
  ],
  discovery: {
    id: "answer-track-faction-turns-between-sessions",
    parentCluster: "faction-creation",
    primaryIntent: "how to track faction turns between sessions",
    intentAliases: [
      "track faction turns between rpg sessions",
      "how to resolve faction turns between sessions",
      "between session faction turn tracker",
      "tabletop rpg faction turn system",
    ],
    userJob: "adopt-workflow",
    uniqueValue:
      "A five-step between-session faction turn framework (intent, action, outcome, consequence, history) for resolving off-screen organisation activity and updating the campaign timeline without spreadsheet bloat.",
    relatedIntents: [
      "answer-run-factions-sandbox",
      "answer-fantasy-faction",
      "answer-manage-campaign-timeline",
      "generator-faction",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-run-factions-sandbox",
        reason:
          "That page establishes the core four-part faction concept (goal, resource, rival, scheduled move) and how to run factions under sandbox pressure. This page provides the concrete five-step downtime procedure (intent, action, outcome, consequence, history) for resolving off-screen faction clashes and updating the campaign timeline and relationship graph.",
      },
    ],
  },
  seo: {
    title:
      "How do you track faction turns between RPG sessions? | Codex Cryptica",
    description:
      "Track between-session faction turns with a five-step framework: intent, action, outcome, consequence, and history, without spreadsheet bloat.",
    image:
      "https://assets.codexcryptica.com/og/how-do-you-track-faction-turns-between-rpg-sessions.jpg",
    imageAlt:
      "Carved wooden faction tokens and handwritten campaign journal notes placed across a regional tabletop RPG map under lantern light",
  },
};
