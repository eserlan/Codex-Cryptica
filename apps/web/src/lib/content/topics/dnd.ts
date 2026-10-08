import type { TopicJobHubConfig } from "./job-hub-types";

export const DND_TOPIC_CONFIG = {
  slug: "dnd",
  canonicalPath: "/topics/dnd",
  label: "fantasy",
  title: "Running D&D: Help for Your Next Session",
  metaTitle: "D&D Dungeon Master Help: Prep, Run and Track | Codex Cryptica",
  description:
    "Running D&D? Find practical answers and tools for starting a campaign, prepping the next session, building adventures, running the table, building the world and keeping the campaign straight.",
  leadParagraph:
    "Start with whatever is in front of you: a session on Friday, a table that will not stop talking, a town you have not built yet. Each section below is a job a Dungeon Master actually has, with the guides and tools that help with it. Use one, save what is worth keeping, and let the campaign build up from there.",
  ogImage: "https://assets.codexcryptica.com/og/dungeons-and-dragons.jpg",
  ogImageAlt:
    "A Dungeon Master's screen with dice, a map and campaign notes on a candlelit table",

  primaryCta: {
    heading: "Prep my next D&D session",
    body: "Bring the hook or situation your party is in. The Session Prep Builder turns it into the pressure, people, places, clues and consequences you need, then a one-page run sheet for the table. It works for any system, so it fits a 5e session as well as anything else.",
    action: {
      label: "Prep my next D&D session",
      href: "/tools/session-prep-builder",
    },
    supportingLinks: [
      {
        title: "How do I prepare an RPG session, step by step?",
        href: "/answers/how-do-i-prepare-an-rpg-session-step-by-step",
        description:
          "The nine-step prep method the builder follows, if you would rather work through it yourself.",
        badge: "Answer",
      },
      {
        title: "How do you prep a weekly RPG session quickly?",
        href: "/answers/how-do-you-prep-a-weekly-rpg-session-quickly",
        description:
          "A short routine for the weeks when you only have an evening.",
        badge: "Answer",
      },
    ],
  },

  jobs: [
    {
      id: "start",
      heading: "Start a D&D campaign",
      question: "I am about to run my first game, or a new one.",
      intro:
        "Settle what the table wants, have the Session 0 conversation, then give the party a place to begin.",
      links: [
        {
          title: "What should a new D&D player learn first?",
          href: "/answers/what-should-a-new-dnd-player-learn-first",
          description:
            "The handful of things that get a beginner playing, and what can wait.",
          badge: "Answer",
        },
        {
          title: "How do I run a successful Session 0?",
          href: "/answers/how-do-i-run-a-successful-session-0",
          description:
            "Agree expectations, tone and boundaries before the first scene.",
          badge: "Answer",
        },
        {
          title: "How do I expand a simple RPG campaign idea?",
          href: "/answers/how-do-i-expand-a-simple-rpg-campaign-idea",
          description: "Turn a one-line premise into something you can run.",
          badge: "Answer",
        },
        {
          title: "What should an RPG settlement contain?",
          href: "/answers/what-should-an-rpg-settlement-contain",
          description: "Choose what a starting town needs and leave the rest.",
          badge: "Answer",
        },
        {
          title: "Settlement Generator",
          href: "/generators/settlement",
          description: "Build a starting town with people and pressures.",
          badge: "Generator",
        },
      ],
    },
    {
      id: "prep",
      heading: "Prep the next session",
      question: "The game is soon and I do not know what to prepare.",
      intro:
        "Prepare situations and people rather than a script, then check how much is enough.",
      links: [
        {
          title: "Session Prep Builder",
          href: "/tools/session-prep-builder",
          description:
            "Turn your hook into a table-ready run sheet. The same builder works for any system.",
          badge: "Tool",
        },
        {
          title: "How much prep do you need for an RPG session?",
          href: "/answers/how-much-prep-do-you-need-for-an-rpg-session",
          description:
            "Find the amount that keeps you ready without burning out.",
          badge: "Answer",
        },
        {
          title: "How much of the plot should a DM prepare?",
          href: "/answers/how-much-of-the-plot-should-a-dm-prepare",
          description:
            "Prepare enough structure to run it, not a story to follow.",
          badge: "Answer",
        },
        {
          title: "D&D NPC Generator",
          href: "/generators/dnd-npc",
          description: "Fill the room with people who want something.",
          badge: "Generator",
        },
        {
          title: "Rumour Generator",
          href: "/generators/rumour",
          description: "Give the party leads to follow or ignore.",
          badge: "Generator",
        },
      ],
    },
    {
      id: "adventure",
      heading: "Build the adventure",
      question: "I need a dungeon, a mystery or something to do on the road.",
      intro:
        "Encounters, clues, puzzles and heists, built so the players have choices.",
      links: [
        {
          title: "What makes a good random encounter?",
          href: "/answers/what-makes-a-good-random-encounter",
          description: "Make a wandering encounter matter to the story.",
          badge: "Answer",
        },
        {
          title: "How do I balance RPG combat encounters without a TPK?",
          href: "/answers/how-do-i-balance-rpg-combat-encounters-without-a-tpk",
          description: "Pitch fights at the right danger for your party.",
          badge: "Answer",
        },
        {
          title: "How do you run a mystery without railroading?",
          href: "/answers/how-do-you-run-a-mystery-without-railroading",
          description: "Place clues so the party can solve it from any angle.",
          badge: "Answer",
        },
        {
          title: "How do you create quest hooks without railroading?",
          href: "/answers/how-do-you-create-quest-hooks-without-railroading",
          description: "Offer leads the party can take or leave.",
          badge: "Answer",
        },
        {
          title: "Puzzles hub",
          href: "/topics/puzzles",
          description: "Design puzzles that do not stall the game, with hints.",
          badge: "Hub",
        },
        {
          title: "Heists hub",
          href: "/topics/heists",
          description: "Plan and run a heist the players can improvise around.",
          badge: "Hub",
        },
        {
          title: "Dungeon Generator",
          href: "/generators/dungeon-generator",
          description: "Sketch a dungeon to adapt to your own map.",
          badge: "Generator",
        },
        {
          title: "Adventure Generator",
          href: "/generators/adventure-generator",
          description: "Start from a complete adventure outline.",
          badge: "Generator",
        },
      ],
    },
    {
      id: "run",
      heading: "Run the table",
      question: "The game is happening and something is not working.",
      intro:
        "Fixes for pace, spotlight, large groups, tricky players and talkative NPCs.",
      links: [
        {
          title: "How do you run D&D for a large group of players?",
          href: "/answers/how-do-you-run-dnd-for-a-large-group-of-players",
          description: "Keep seven or more players engaged and moving.",
          badge: "Answer",
        },
        {
          title: "How do I make combat faster without making it less exciting?",
          href: "/answers/how-do-i-make-combat-faster-without-making-it-less-exciting",
          description: "Cut the dead time and keep the tension.",
          badge: "Answer",
        },
        {
          title: "How do I give specialist characters spotlight?",
          href: "/answers/how-do-i-give-specialist-characters-spotlight",
          description:
            "Make sure every character gets scenes where they matter.",
          badge: "Answer",
        },
        {
          title: "What do you do with murder-hobos?",
          href: "/answers/what-do-you-do-with-murder-hobos-in-an-rpg-campaign",
          description: "Talk it through, then change what the world does back.",
          badge: "Answer",
        },
        {
          title: "How do I handle players asking an NPC to tell us everything?",
          href: "/answers/how-do-i-handle-players-asking-an-npc-to-tell-us-everything-you-know",
          description: "Run questioning scenes that reward good questions.",
          badge: "Answer",
        },
        {
          title: "How do you handle players going off script?",
          href: "/answers/how-do-you-handle-players-going-off-script-as-a-gm",
          description: "Follow the party without throwing away your prep.",
          badge: "Answer",
        },
        {
          title: "How do you improvise NPCs on the spot?",
          href: "/answers/how-do-you-improvise-npcs-on-the-spot",
          description: "A five-beat order for a usable person in seconds.",
          badge: "Answer",
        },
      ],
    },
    {
      id: "world",
      heading: "Build the world",
      question: "The party wants to go somewhere I have not made yet.",
      intro:
        "Settlements, factions, gods and cultures with enough detail to play.",
      links: [
        {
          title: "How do you create a fantasy faction?",
          href: "/answers/how-do-you-create-a-fantasy-faction",
          description: "Give a faction goals, resources and a rival.",
          badge: "Answer",
        },
        {
          title: "How do you create a believable fictional religion?",
          href: "/answers/how-do-you-create-a-believable-fictional-religion",
          description: "Build beliefs and practices people would follow.",
          badge: "Answer",
        },
        {
          title: "How do I make different cultures feel distinct?",
          href: "/answers/how-do-i-make-different-cultures-feel-distinct-without-relying-on-stereotypes",
          description: "Differences that come from place and history.",
          badge: "Answer",
        },
        {
          title: "How do I build a believable economy for a fantasy world?",
          href: "/answers/how-do-i-build-a-believable-economy-for-a-fantasy-world",
          description: "Work out what places make, need and trade.",
          badge: "Answer",
        },
        {
          title: "How do you run political intrigue and faction play?",
          href: "/answers/how-do-i-run-political-intrigue-and-faction-play",
          description: "Put rival powers in motion between sessions.",
          badge: "Answer",
        },
        {
          title: "Faction Generator",
          href: "/generators/faction",
          description: "Create a faction with goals, dependencies and rivals.",
          badge: "Generator",
        },
        {
          title: "Pantheon Generator",
          href: "/generators/pantheon-generator",
          description: "Sketch gods and what their followers believe.",
          badge: "Generator",
        },
        {
          title: "Fantasy generators",
          href: "/generators/fantasy",
          description: "More fantasy generators for places, people and items.",
          badge: "Hub",
        },
      ],
    },
    {
      id: "track",
      heading: "Keep the campaign straight",
      question: "I cannot remember who knows what, or what the party promised.",
      intro:
        "Notes, relationships and timelines you can actually find again during play.",
      links: [
        {
          title: "How do you organise RPG campaign notes?",
          href: "/answers/how-do-you-organise-rpg-campaign-notes",
          description: "A structure for notes that survives a long campaign.",
          badge: "Answer",
        },
        {
          title: "How do you keep track of NPCs in a long campaign?",
          href: "/answers/how-do-you-keep-track-of-npcs-in-a-long-campaign",
          description: "Remember who is who without a binder.",
          badge: "Answer",
        },
        {
          title: "How do you organise NPC relationships?",
          href: "/answers/how-do-you-organise-npc-relationships",
          description: "Record who trusts, owes and fears whom.",
          badge: "Answer",
        },
        {
          title: "How do you track unresolved plot hooks?",
          href: "/answers/how-do-you-track-unresolved-plot-hooks-in-an-rpg-campaign",
          description: "Never lose a thread the party left hanging.",
          badge: "Answer",
        },
        {
          title: "How do you manage a campaign timeline?",
          href: "/answers/how-do-you-manage-a-campaign-timeline-in-an-rpg",
          description: "Keep track of what happened and when.",
          badge: "Answer",
        },
        {
          title: "Link your NPCs, factions and places",
          href: "/solutions/rpg-knowledge-graph",
          description:
            "See how a campaign's people, places and factions connect in a graph.",
          badge: "Workspace",
        },
      ],
    },
  ],

  funnel: {
    heading:
      "From tonight's problem to a campaign you can find your way around",
    intro:
      "You do not need to set anything up first. Most DMs start with one thing and keep going.",
    steps: [
      {
        title: "Solve tonight's problem",
        description:
          "Read one answer or run one generator for the thing in front of you.",
      },
      {
        title: "Save what is useful",
        description:
          "Keep the NPC, town or run sheet in your own vault instead of losing it in a tab.",
      },
      {
        title: "Connect it",
        description:
          "Link the NPCs, factions, places and quests so you can see how they relate.",
      },
      {
        title: "Prep from it next time",
        description:
          "Start each session from what already happened, using your journal and graph.",
      },
    ],
  },

  relatedHeading: "More about D&D and Codex Cryptica",
  relatedTopics: [
    {
      title: "D&D for Beginners",
      href: "/topics/dnd-beginners",
      description:
        "Guide your new players to a clear learning path covering the play loop, character sheet, dice and combat turns.",
    },
    {
      title: "Codex Cryptica for D&D",
      href: "/for/dungeons-and-dragons",
      description:
        "Why a connected campaign workspace suits a long D&D campaign.",
    },
    {
      title: "All fantasy material on Explore",
      href: "/explore?label=fantasy",
      description: "Browse more fantasy guides, generators and examples.",
    },
  ],

  structuredData: {
    aboutName: "Running Dungeons & Dragons as a Dungeon Master",
    aboutDescription:
      "Starting, prepping, running and tracking a Dungeons & Dragons campaign as the Dungeon Master.",
    itemListName: "D&D Dungeon Master Guides and Tools",
    itemListDescription:
      "Guides and tools for starting a D&D campaign, prepping sessions, building adventures, running the table, building the world and tracking the campaign.",
    breadcrumbLabel: "Running D&D",
  },
} satisfies TopicJobHubConfig;
