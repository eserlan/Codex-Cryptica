import type { TopicHubConfig } from "./types";

export const PUZZLE_TOPIC_CONFIG = {
  slug: "puzzles",
  canonicalPath: "/topics/puzzles",
  label: "puzzle",
  title: "Designing and Running RPG Puzzles",
  metaTitle: "Designing and Running RPG Puzzles | Codex Cryptica",
  description:
    "A Game Master resource cluster for tabletop RPG puzzles: keep them from stalling the session, write hints that don't give the answer away, study worked examples with alternate solutions, and generate your own.",
  leadParagraph:
    "A tabletop puzzle goes wrong in a predictable way: one intended answer, held in the GM's notes, with no way forward until someone says it aloud. Codex Cryptica's Puzzle cluster is built around the opposite habit. It covers designing puzzles with more than one route through, preparing hints in advance, worked examples with clues, alternate solutions and failure states written out, and a generator that produces all of it.",

  ogImage:
    "https://assets.codexcryptica.com/announcements/puzzle-bell-beneath-blackglass.jpg",
  ogImageAlt:
    "A tarnished silver bell hanging without chains over a basin of pale blue flame in a ruined stone abbey crypt",

  copy: {
    thesisHeading: "Why puzzles stall, and what fixes it",
    learnHeading: "Learn the design",
    learnIntro:
      "Start here. These guides cover building a puzzle that keeps the table moving, rescuing one that has stopped, and laying out clues so they can be found.",
    examplesHeading: "See a puzzle, start to finish",
    examplesIntro:
      "Each worked example includes the setup, layered clues, spotlight moments for different characters, alternate solutions, and what happens on failure. Pick the one closest to your table's genre.",
    exampleHighlightLabel: "What it shows:",
    toolsHeading: "Generate a puzzle",
    toolsIntro:
      "Produce a table-ready puzzle with layered clues, alternate solutions and consequences for failure, then place it in a dungeon or a heist with the supporting tools.",
    workflowHeading: "Run one tonight",
    workflowIntro:
      "Four steps from a blank page to a puzzle that will not stall. Each step points at the single resource that carries it.",
    relatedHeading: "Keep exploring",
  },

  structuredData: {
    aboutName: "Tabletop RPG Puzzles",
    aboutDescription:
      "Designing, hinting, and running puzzles in tabletop roleplaying games without stalling the session.",
    itemListName: "RPG Puzzle Resources & Tools",
    itemListDescription:
      "Curated collection of RPG puzzle design guides, hint frameworks, worked examples, and a puzzle generator.",
    breadcrumbLabel: "RPG Puzzles Topic Hub",
  },

  thesisPoints: [
    {
      title: "A stall has one cause: a single answer with no exit",
      summary:
        "Difficulty and cleverness are secondary. A hard puzzle with three routes through it does not stall the table, while an easy puzzle with one route stalls the moment nobody happens to think of it. Making puzzles easier treats the symptom; giving being stuck a way out treats the cause.",
    },
    {
      title: "Failure should cost something other than time",
      summary:
        "When a wrong answer only costs minutes, the table's only strategy is to keep guessing. When it spends a resource, makes noise or alerts something, a wrong attempt is still play. Partial-progress feedback, such as three of five symbols glowing, keeps people trying because they can tell they are getting closer.",
    },
    {
      title: "Hints work as a ladder, prepared in advance",
      summary:
        "A single hint has to guess the right amount of help mid-session. A three-step ladder does not: repeat a clue in a new form, point at what changed after the last attempt, then state the goal without the method. Climb one step at a time, and only when the table has genuinely stalled.",
    },
  ],

  coreGuides: [
    {
      title: "How Do You Design RPG Puzzles That Do Not Stall the Game?",
      href: "/answers/how-do-you-design-rpg-puzzles-that-do-not-stall-the-game",
      description:
        "Four properties of a puzzle that keeps moving: more than one way through, failure that costs something other than time, information the party can buy, and feedback on partial progress. Includes a worked redesign of a single-answer door.",
      focus: "Puzzle Design & Structure",
    },
    {
      title:
        "How Do You Give Hints for an RPG Puzzle Without Giving Away the Answer?",
      href: "/answers/how-do-you-give-hints-for-an-rpg-puzzle-without-giving-away-the-answer",
      description:
        "The three-step hint ladder, the same stalled puzzle handled three ways, and when to climb a step and when to hold back.",
      focus: "Hints & Rescuing a Stalled Table",
    },
    {
      title: "Running a Mystery Without Railroading",
      href: "/answers/how-do-you-run-a-mystery-without-railroading",
      description:
        "The Three Clue Rule for laying out clues so the table can find a way in without being led by the hand. It applies equally to puzzles that hide their answer in the environment.",
      focus: "Clue Design",
    },
  ] satisfies TopicHubConfig["coreGuides"],

  workedExamples: [
    {
      title: "The Bell Beneath Blackglass (Classic Fantasy)",
      href: "/examples/the-bell-beneath-blackglass-fantasy-puzzle",
      genre: "Classic Fantasy",
      description:
        "A silver bell in an abbey crypt is draining a valley's protective ward. The party must realign its three magical rings, or free the spirit powering it, before the next toll.",
      highlight:
        "A magical device that responds to meaning rather than one answer, with more than one way to disable it",
      image: {
        src: "https://assets.codexcryptica.com/announcements/puzzle-bell-beneath-blackglass.jpg",
        alt: "A tarnished silver bell hanging without chains over a basin of pale blue flame in a ruined stone abbey crypt",
        width: 1600,
        height: 1000,
      },
    },
    {
      title: "The Null-Key Reliquary (Cyberpunk)",
      href: "/examples/the-null-key-reliquary-cyberpunk-puzzle",
      genre: "Cyberpunk",
      description:
        "A stolen ledger sits behind a mechanical train-routing maze in a flooded transit vault. Its brass relays must be synchronised before an eleven-minute security purge floods the chamber.",
      highlight:
        "A visible countdown that punishes stalling rather than thinking, on a purely mechanical puzzle",
      image: {
        src: "https://assets.codexcryptica.com/announcements/puzzle-null-key-reliquary.jpg",
        alt: "A flooded underground transit vault with a six by six grid of brass route plates and glowing indicator lamps",
        width: 1600,
        height: 1000,
      },
    },
    {
      title: "The Venting Helix (Space Opera)",
      href: "/examples/the-venting-helix-derelict-hazard",
      genre: "Space Opera",
      description:
        "A runaway atmospheric purge loop on a derelict hull is spinning its core off-axis. The crew must halt it before the counter-rotating rings tear themselves apart.",
      highlight:
        "Four separate routes to a solution, none of them the single right answer, under physical danger",
      image: {
        src: "https://assets.codexcryptica.com/announcements/puzzle-venting-helix.jpg",
        alt: "A frost-choked maintenance gantry above a wildly spinning cryogenic core, lit by strobing emergency beacons",
        width: 1376,
        height: 768,
      },
    },
  ] satisfies TopicHubConfig["workedExamples"],

  generators: [
    {
      title: "Puzzle Generator",
      href: "/generators/puzzle",
      description:
        "Build an encounter puzzle with layered clues, alternate solutions, character spotlight opportunities and fail-forward consequences, adjusted for genre, complexity, puzzle style and the pressure of failure.",
      badge: "Primary Tool",
      image: {
        src: "https://assets.codexcryptica.com/screenshots/generator-puzzle.png",
        alt: "Codex Cryptica RPG Puzzle Generator showing the input form, generated puzzle draft, and GM reference rail",
        width: 1200,
        height: 630,
      },
    },
    {
      title: "Heist Generator",
      href: "/generators/heist",
      description:
        "When the puzzle guards a vault or a sanctum, generate the score around it: the security rings, alarm track and getaway that give the lock a reason to matter.",
      badge: "Supporting Tool",
    },
    {
      title: "Dungeon Generator",
      href: "/generators/dungeon-generator",
      description:
        "Generate the rooms and corridors a puzzle sits in, so its clues can be spread across the location rather than stated in one place.",
      badge: "Supporting Tool",
    },
  ] satisfies TopicHubConfig["generators"],

  workflow: [
    {
      step: 1,
      title: "Give the puzzle a way out",
      description:
        "Check that the puzzle has more than one route, that failure spends something other than time, and that the party can convert being stuck into a task.",
      recommendedResource: {
        title: "How Do You Design RPG Puzzles That Do Not Stall the Game?",
        href: "/answers/how-do-you-design-rpg-puzzles-that-do-not-stall-the-game",
      },
    },
    {
      step: 2,
      title: "Prepare the hint ladder",
      description:
        "Write all three hint steps before the session, from a repeated clue to a stated goal, so a stalled table never forces you to improvise the answer.",
      recommendedResource: {
        title:
          "How Do You Give Hints for an RPG Puzzle Without Giving Away the Answer?",
        href: "/answers/how-do-you-give-hints-for-an-rpg-puzzle-without-giving-away-the-answer",
      },
    },
    {
      step: 3,
      title: "See it written out",
      description:
        "Read a complete puzzle with its clues, alternate solutions and failure states laid out, and borrow the structure for your own.",
      recommendedResource: {
        title: "Worked Example: The Bell Beneath Blackglass",
        href: "/examples/the-bell-beneath-blackglass-fantasy-puzzle",
      },
    },
    {
      step: 4,
      title: "Generate your own",
      description:
        "Set the genre, complexity and pressure, and get a puzzle with layered clues and consequences ready to run.",
      recommendedResource: {
        title: "Puzzle Generator",
        href: "/generators/puzzle",
      },
    },
  ] satisfies TopicHubConfig["workflow"],

  relatedTopics: [
    {
      title: "RPG Heists",
      href: "/topics/heists",
      description:
        "Vault locks, security rings and access obstacles, where a puzzle is one layer of a larger operation.",
    },
    {
      title: "All Puzzle Material on Explore",
      href: "/explore?label=puzzle",
      description:
        "Browse every guide, generator and worked example tagged #puzzle across the Codex Cryptica discovery graph.",
    },
  ],
} satisfies TopicHubConfig;
