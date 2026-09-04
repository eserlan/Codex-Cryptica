import type { AnswerConfigInput } from "../schema";

export const whatShouldILookForInAnRpgCampaignManager: AnswerConfigInput = {
  slug: "what-should-i-look-for-in-an-rpg-campaign-manager",
  category: "campaign-notes",
  publishedAt: "2026-08-31",
  question: "What should I look for in an RPG campaign manager?",
  kind: "framework",
  shortAnswer:
    "There's no single best campaign manager — the right one depends on what kind of game you run and what actually causes you friction. Before comparing named tools, it's worth being clear on the dimensions that matter: how it organises notes and relationships, whether it handles maps or VTT play, how easily data gets in and out, whether it runs locally or requires the cloud, how well it adapts to a system you didn't design it for, and whether it slows you down or speeds you up during an actual session.",
  sections: [
    {
      kind: "prose",
      heading: "Evaluate the dimensions before the product",
      paragraphs: [
        "It's tempting to start from 'which tool is best' and work backwards, but that question doesn't have a stable answer — a tool built for lore-heavy sandbox campaigns and one built for tactical VTT play are optimising for different things, and 'best' without a workflow attached is close to meaningless.",
        "A more useful starting point is naming what you actually need, then checking candidates against that list. The dimensions below are the ones that tend to separate a tool that fits from one that doesn't, regardless of which specific product you're looking at.",
      ],
    },
    {
      kind: "list",
      heading: "Dimensions worth evaluating",
      items: [
        {
          term: "Note and entity organisation",
          text: "Does it give NPCs, locations and factions their own structured place, or is everything one long document you search with Ctrl+F?",
        },
        {
          term: "Relationships and backlinks",
          text: "Can you see what links to a given NPC or location without remembering everywhere you mentioned them?",
        },
        {
          term: "Search and navigation",
          text: "How fast can you find one specific fact mid-session, under time pressure, without four people waiting on you?",
        },
        {
          term: "Maps and spatial organisation",
          text: "If your game is location-driven, does the tool handle maps as more than an embedded image — pins, layers, scale that means something?",
        },
        {
          term: "Session notes and chronology",
          text: "Is there a dated, ordered history separate from the durable facts, so you can reconstruct 'what happened' without it polluting 'what's true'?",
        },
        {
          term: "Custom fields and templates",
          text: "Can it adapt to a system it wasn't built around, or are you fighting a schema designed for a different game?",
        },
        {
          term: "Player-facing vs GM-only information",
          text: "Can secrets and public facts coexist without either spoiling something or forcing a second, disconnected document?",
        },
        {
          term: "Import, export and data portability",
          text: "If you stop using this tool in two years, what do you walk away with — plain files you can still read, or a database export nothing else understands?",
        },
        {
          term: "Local, offline and cloud trade-offs",
          text: "Does your data live on your machine, in someone's cloud, or both — and which of those actually matches what you're comfortable with?",
        },
        {
          term: "Collaboration and sharing",
          text: "If you co-GM or want players to see part of the vault, is that supported, and does it respect the GM-only boundary above?",
        },
        {
          term: "VTT integration or built-in play tools",
          text: "If you run online, does it connect to (or include) the table you actually play at, or is it a separate prep tool you tab away from during the game?",
        },
        {
          term: "Generators and AI assistance",
          text: "Useful as an accelerator for a name, a hook, or a first draft — but worth treating as optional rather than a prerequisite for the tool being worth using.",
        },
        {
          term: "Performance and friction during play",
          text: "Everything above matters less if the tool is slow or fiddly at the table. A feature you can't use quickly under pressure isn't really a feature.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Which dimensions to prioritise, by workflow",
      intro:
        "Nobody needs all of the above equally. A rough guide to what to weight first.",
      items: [
        {
          term: "Lore-heavy campaigns",
          text: "Prioritise relationships, search, backlinks, maps and structured entities — the tool's job is retrieval under pressure, not storage.",
        },
        {
          term: "Tactical online games",
          text: "Prioritise VTT/map/token workflow and whatever system automation you actually want; note-organisation quality matters less if combat is the main loop.",
        },
        {
          term: "Privacy or data ownership concerns",
          text: "Prioritise exportability, local-first/offline behaviour and a clear, honest account of where your data actually lives.",
        },
        {
          term: "Frequent system-switchers",
          text: "Prioritise custom schemas/templates and system-neutral organisation over anything built around one specific ruleset.",
        },
        {
          term: "Heavy collaboration",
          text: "Prioritise permissions, sharing and genuinely multi-user workflows over solo-GM feature depth.",
        },
      ],
    },
    {
      kind: "example",
      heading: "The same shortlist, two different answers",
      paragraphs: [
        "Two GMs look at the same three tools and reasonably pick differently, because they weighted the dimensions above in a different order.",
      ],
      items: [
        {
          term: "GM A — long-running homebrew sandbox",
          text: "Weights relationships, backlinks and data portability highest, since the campaign will outlive several system changes and the notes matter more than the maps. Picks the tool with the strongest entity/relationship model and plain-file export.",
        },
        {
          term: "GM B — weekly online tactical game",
          text: "Weights VTT integration and system automation highest, since the table lives in the play tool and prep time matters less than table-time friction. Picks the tool that's really a VTT with light notes attached, not a notes tool with a map bolted on.",
        },
        {
          term: "Same shortlist, no wrong answer",
          text: "Neither GM is wrong about 'the best campaign manager' — they're answering different questions because their workflows put weight on different dimensions.",
        },
      ],
    },
  ],
  codexConnection: {
    heading: "Where Codex Cryptica fits, and where it might not",
    paragraphs: [
      "Codex is built around structured entities and relationships, local-first storage (your vault is plain files on your own machine), system-flexible fields rather than a fixed schema, spatial/graph organisation, and generators plus optional context-aware AI as accelerators rather than requirements. If your priorities above lean toward lore-heavy organisation, data ownership or system-switching, that's the workflow it's built for.",
      "It's a worse fit for some other priorities as stated today: it doesn't specialise in deep rules automation for a specific system, and its collaboration model isn't built around heavy real-time multi-user editing the way some dedicated VTT-first tools are. If those are your top priorities, weigh that honestly against what's above rather than assuming one tool covers every dimension equally well.",
    ],
    linkText: "See the campaign manager",
    href: "/solutions/campaign-manager",
  },
  relatedTools: [
    {
      title: "RPG campaign manager",
      description:
        "Codex Cryptica's own feature set against the dimensions above, for a closer look once you know what you're prioritising.",
      href: "/solutions/campaign-manager",
    },
  ],
  relatedAnswers: [
    "how-do-you-organise-rpg-campaign-notes",
    "how-much-prep-do-you-need-for-an-rpg-session",
    "how-do-i-get-players-to-engage-with-my-campaign-world",
    "what-rpg-system-should-we-try-instead-of-dnd",
    "how-do-you-keep-track-of-time-in-a-tabletop-campaign",
  ],
  discovery: {
    id: "answer-campaign-manager-criteria",
    parentCluster: "campaign-management",
    primaryIntent:
      "understand the criteria for evaluating rpg campaign management software",
    intentAliases: [
      "what should i look for in an rpg campaign manager",
      "what makes a good rpg campaign manager",
      "campaign manager features for gms",
      "what should a ttrpg campaign manager do",
      "how to choose rpg campaign software",
      "rpg campaign manager checklist",
    ],
    uniqueValue:
      "A tool-agnostic evaluation framework (organisation, relationships, maps, portability, local/cloud trade-offs, customisation, collaboration) prioritised by workflow, before naming any specific product.",
    relatedIntents: ["solution-campaign-manager", "answer-campaign-notes"],
    acknowledgedOverlap: [
      {
        with: "solution-campaign-manager",
        reason:
          "The answer teaches tool-agnostic evaluation criteria for any campaign manager; the solution page evaluates Codex specifically against them. Different jobs — understand versus evaluate — on the same subject, and the answer explicitly names workflows Codex fits less well.",
      },
    ],
  },

  seo: {
    title:
      "What should I look for in an RPG campaign manager? | Codex Cryptica",
    description:
      "A neutral evaluation framework for RPG campaign-management software: organisation, relationships, maps, portability, local/cloud trade-offs, customisation and collaboration.",
  },
};
