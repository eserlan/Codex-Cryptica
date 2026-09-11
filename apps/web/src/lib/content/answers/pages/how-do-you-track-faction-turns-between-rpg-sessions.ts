import type { AnswerConfigInput } from "../schema";

export const howDoYouTrackFactionTurnsBetweenRpgSessions: AnswerConfigInput = {
  slug: "how-do-you-track-faction-turns-between-rpg-sessions",
  category: "session-prep",
  publishedAt: "2026-09-07",
  question: "How do you track faction turns between RPG sessions?",
  kind: "framework",
  shortAnswer:
    "Track between-session faction turns with a five-step record for each active organisation: define its immediate intent, select a single action against a target entity, resolve the outcome, translate that outcome into a visible consequence in the game world, and log the change on your campaign timeline. Limiting each organisation to one concrete action per downtime cycle keeps the world moving without turning prep into spreadsheet bookkeeping.",
  sections: [
    {
      kind: "prose",
      heading: "Off-screen simulation dies of administrative bloat",
      paragraphs: [
        "Game Masters often begin faction play by drafting sprawling spreadsheets with dozens of numerical stats, balance sheets, and complex rolling procedures for every organisation on the continent. By the fourth session, running this simulated wargame between sessions consumes several hours of prep, burns out the GM, and generates pages of unobserved background lore that players never touch.",
        "Faction turns exist to produce player-facing tension, not to run an unobserved wargame. An off-screen organisation needs only enough structure to answer four practical questions: what did it try to do this week, who was targeted, what physical evidence did it leave behind, and what changes permanently on the campaign map.",
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
          text: "Choose how the faction pursues that intent this cycle. Standard moves include expanding territory, seizing an asset, infiltrating a rival, forging a pact, or sabotaging an enemy holding. Always name the specific target entity, location, or NPC involved.",
        },
        {
          term: "Resolve the outcome",
          text: "Decide whether the move succeeds, stalls, or triggers a setback. In narrative systems, compare the faction's relative standing and resources against its target. In dice-driven games, make a single opposed roll or advance a multi-segment progress clock.",
        },
        {
          term: "Surface a visible consequence",
          text: "Translate the mechanical result into tangible evidence the players encounter in the next session. A failed infiltration leaves an arrested spy in the stocks; a successful raid leaves smoke on the horizon, displaced villagers on the road, and doubled sentry watches at the gate.",
        },
        {
          term: "Log the permanent history",
          text: "Record the result as a dated entry on your campaign timeline and update the faction's relationship to the target entity. Logging the turn immediately prevents contradictions four sessions later when players ask when the docks burned down.",
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
          text: "The GM tracks gold reserves, payroll, twenty named hirelings, and supply lines across three notebook pages, spending forty minutes rolling sub-table skirmishes between mercenary guards and smugglers. None of this internal arithmetic reaches the table; the players merely receive a dry summary that scrap prices increased.",
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
        "A common mistake is attempting to run between-session turns for every nation, cult, and syndicate on the world map. Restrict active turns to three or four organisations directly interacting with the region where the adventurers are currently operating. Distant factions can advance on broad seasonal milestones when the party travels to new regions.",
        "When the players deliberately ignore an active faction's move, let that organisation succeed automatically on its next turn. Unopposed momentum makes the campaign world feel alive: when the party chooses to pursue a dungeon rumour rather than guard the granary, the grain cartel completes its monopoly on schedule and the town faces food rationing.",
      ],
    },
    {
      kind: "checklist",
      heading: "Between-session faction turn checklist",
      intro: "Complete this sequence before concluding your session prep:",
      items: [
        "Pick no more than three or four factions active within the party's operational area.",
        "Assign each organisation one specific action targeting a named NPC, location, or rival.",
        "Resolve the action with a single opposed check, clock tick, or position comparison.",
        "Note at least one visible consequence that players will observe or hear rumoured next session.",
        "Update the relationship links on your campaign map and append the outcome to the timeline.",
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
