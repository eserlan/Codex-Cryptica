import type { TopicHubConfig } from "./types";

export const SOLO_RPG_TOPIC_CONFIG = {
  slug: "solo-rpg",
  canonicalPath: "/topics/solo-rpg",
  label: "solo-rpg",
  title: "Solo RPGs: Tools, Oracles, Generators & Guides for Playing Alone",
  metaTitle:
    "Solo RPGs: Tools, Oracles, Generators & Guides for Playing Alone | Codex Cryptica",
  description:
    "A beginner-friendly hub for playing tabletop RPGs alone: how a solo session works, how oracles answer questions, how to keep play from feeling random, how to keep campaign notes, and the generators that feed the loop.",
  leadParagraph:
    "Playing a tabletop RPG alone removes the game master, and with them the person who knows what is behind the door, answers your questions and surprises you. Solo play replaces that job with a small loop: set a scene, ask a question, roll for an answer, interpret it, write down what is now true, and let the consequences shape the next scene. This hub collects the guides for each step, the generators that supply random detail, and the notes habits that keep a solo campaign consistent. It sits alongside established solo systems and oracles rather than replacing them.",

  ogImage:
    "https://assets.codexcryptica.com/og/how-do-you-play-a-tabletop-rpg-by-yourself.jpg",
  ogImageAlt:
    "A lone player at a worn oak table at night with a hand-drawn dungeon map, dice and an open journal lit by a single candle",

  copy: {
    thesisHeading: "What solo play has to replace",
    learnHeading: "Start here: the guides",
    learnIntro:
      "Follow them in order if you are new: how a solo session works, how to ask an oracle, how to keep results meaningful, and how to keep the notes that hold a campaign together.",
    examplesHeading: "See the raw material",
    examplesIntro:
      "A finished set of rumours shows the kind of ready-to-use leads a solo player can draw on when a scene needs something to find out.",
    exampleHighlightLabel: "What it shows:",
    toolsHeading: "Generators for the solo loop",
    toolsIntro:
      "Oracles answer yes or no. These generators supply the people, places, rivals and complications that a yes-or-no answer cannot, so you can keep a scene moving without stopping to invent them.",
    workflowHeading: "The beginner path",
    workflowIntro:
      "Five steps from an empty page to a running solo campaign. Each step points at the one resource that carries it.",
    relatedHeading: "Keep exploring",
  },

  structuredData: {
    aboutName: "Solo Tabletop RPGs",
    aboutDescription:
      "Playing tabletop roleplaying games alone, using oracles, random tables and generators in place of a game master.",
    itemListName: "Solo RPG Guides, Generators & Tools",
    itemListDescription:
      "Curated collection of solo RPG guides, oracle explanations, campaign-note advice and generators for playing alone.",
    breadcrumbLabel: "Solo RPG Topic Hub",
  },

  thesisPoints: [
    {
      title: "The game master's surprise has to come from somewhere",
      summary:
        "You cannot be surprised by a fact you chose. Oracles and random tables return an answer you did not pick, and your interpretation turns it into something that fits the scene. That pairing of an outside answer and your own judgement is what the rest of solo play is built on.",
    },
    {
      title: "Random results need something to attach to",
      summary:
        "A roll feels arbitrary when nothing in the story gives it meaning. Tying each result to a goal your character wants, an open thread or a fact you have recorded is what turns a run of events into a plot.",
    },
    {
      title: "You are the only memory in the room",
      summary:
        "In a group game other people remember what happened. Alone, every fact an oracle creates is yours to keep, so notes are part of play. A session log plus linked reference entries stops you contradicting yourself a few sessions on.",
    },
  ],

  coreGuides: [
    {
      title: "How Do You Play a Tabletop RPG by Yourself?",
      href: "/answers/how-do-you-play-a-tabletop-rpg-by-yourself",
      description:
        "What replaces the game master, the minimum kit you need, and the six-step scene loop, with a worked scene from start to finish.",
      focus: "Start Here",
    },
    {
      title: "What Is a Solo RPG Oracle, and How Do You Ask It Good Questions?",
      href: "/answers/what-is-a-solo-rpg-oracle",
      description:
        "The four kinds of oracle, how to set odds before rolling, and the difference between a question that gives you a scene and one that gives you noise.",
      focus: "Oracles & Questions",
    },
    {
      title: "How Do You Keep a Solo RPG from Feeling Random?",
      href: "/answers/how-do-you-keep-a-solo-rpg-from-feeling-random",
      description:
        "An ordered way to anchor results to goals, threads and recorded facts, plus what to do when you do not know what happens next.",
      focus: "Meaning & Twists",
    },
    {
      title: "How Do You Keep Notes for a Solo RPG Campaign?",
      href: "/answers/how-do-you-keep-notes-for-a-solo-rpg-campaign",
      description:
        "A session log, linked reference entries, an open-thread list and a world-changes list, with a light routine for each session.",
      focus: "Campaign Log",
    },
    {
      title: "What RPG System Is Good for Solo Play?",
      href: "/answers/what-rpg-system-is-good-for-solo-play",
      description:
        "Compares dedicated solo engines, procedural dungeon crawlers, traditional systems with built-in oracles and emulator overlays by how they feel to play.",
      focus: "Choosing a System",
    },
    {
      title: "How Do You Generate Useful RPG Rumours?",
      href: "/answers/how-do-you-generate-useful-rpg-rumours",
      description:
        "How to produce rumours that point at something, which is useful whenever a scene needs a lead to follow.",
      focus: "Leads & Rumours",
    },
  ] satisfies TopicHubConfig["coreGuides"],

  workedExamples: [
    {
      title: "Six Words from Lowmere (Rumour Table)",
      href: "/examples/lowmere-six-words-rumour-table",
      genre: "Classic Fantasy",
      description:
        "A six-entry local rumour table about a midnight ferry, a submerged bell and a black barge, written as one connected situation.",
      highlight:
        "A ready set of leads a solo player can draw on when a scene needs something to investigate",
      image: {
        src: "https://assets.codexcryptica.com/announcements/settlement-gulls-roost.jpg",
        alt: "A foggy fantasy settlement beside dark water where travellers trade news by lantern light",
        width: 1600,
        height: 1000,
      },
    },
  ] satisfies TopicHubConfig["workedExamples"],

  generators: [
    {
      title: "Rumour Generator",
      href: "/generators/rumour",
      description:
        "Get local gossip and leads when an oracle says there is something to find but not what it is.",
      badge: "Primary Tool",
    },
    {
      title: "Personality Generator",
      href: "/generators/personality",
      description:
        "Give an unexpected arrival a motive and a flaw in seconds, so a yes-or-no answer becomes a person.",
      badge: "Supporting Tool",
    },
    {
      title: "Plot Twist Generator",
      href: "/generators/plot-twist-generator",
      description:
        "Roll a complication when an oracle answers yes with a twist and you need something specific.",
      badge: "Supporting Tool",
    },
    {
      title: "Faction Generator",
      href: "/generators/faction",
      description:
        "Create rivals with goals of their own, so the consequences of your choices have someone to carry them.",
      badge: "Supporting Tool",
    },
    {
      title: "Settlement Generator",
      href: "/generators/settlement",
      description:
        "Build the next town your character reaches, with a problem already in it.",
      badge: "Supporting Tool",
    },
    {
      title: "Adventure Idea Generator",
      href: "/generators/adventure-idea-generator",
      description:
        "Start a session from a premise when you do not yet have a goal for your character.",
      badge: "Supporting Tool",
    },
  ] satisfies TopicHubConfig["generators"],

  workflow: [
    {
      step: 1,
      title: "Start here",
      description:
        "Learn what replaces the game master and run your first scene through the six-step loop.",
      recommendedResource: {
        title: "How Do You Play a Tabletop RPG by Yourself?",
        href: "/answers/how-do-you-play-a-tabletop-rpg-by-yourself",
      },
    },
    {
      step: 2,
      title: "Ask questions",
      description:
        "Set odds first and ask specific yes-or-no questions about things you do not already know.",
      recommendedResource: {
        title: "What Is a Solo RPG Oracle?",
        href: "/answers/what-is-a-solo-rpg-oracle",
      },
    },
    {
      step: 3,
      title: "Generate uncertainty",
      description:
        "Fill the gaps an oracle leaves with rumours, personalities and complications from a generator.",
      recommendedResource: {
        title: "Rumour Generator",
        href: "/generators/rumour",
      },
    },
    {
      step: 4,
      title: "Create consequences",
      description:
        "Attach each result to a goal or an open thread, and bring earlier choices back into play.",
      recommendedResource: {
        title: "How Do You Keep a Solo RPG from Feeling Random?",
        href: "/answers/how-do-you-keep-a-solo-rpg-from-feeling-random",
      },
    },
    {
      step: 5,
      title: "Keep a campaign log",
      description:
        "Record what is now true, link it to what it affects, and note what is still unresolved.",
      recommendedResource: {
        title: "How Do You Keep Notes for a Solo RPG Campaign?",
        href: "/answers/how-do-you-keep-notes-for-a-solo-rpg-campaign",
      },
    },
  ] satisfies TopicHubConfig["workflow"],

  relatedTopics: [
    {
      title: "Codex Cryptica for Solo Worldbuilding",
      href: "/for/solo-worldbuilding",
      description:
        "Turn prompts and oracle answers into connected canon without contradicting yourself.",
    },
    {
      title: "RPG Puzzles",
      href: "/topics/puzzles",
      description:
        "Design and run puzzles, a useful complication when a solo scene needs an obstacle.",
    },
    {
      title: "All Solo RPG Material on Explore",
      href: "/explore?label=solo-rpg",
      description:
        "Browse every guide, generator and example tagged #solo-rpg across the Codex Cryptica discovery graph.",
    },
  ],
} satisfies TopicHubConfig;
