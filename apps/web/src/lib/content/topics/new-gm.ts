import type { TopicJobHubConfig } from "./job-hub-types";

/**
 * A first-session learning path, not another general DM reference directory.
 * Remains system-neutral so it complements /topics/dnd and /topics/dnd-beginners.
 */
export const NEW_GM_TOPIC_CONFIG = {
  slug: "new-gm",
  canonicalPath: "/topics/new-gm",
  label: "getting started",
  title: "New Game Master? Run Your First Tabletop RPG Session",
  metaTitle: "New Game Master Guide: Run Your First RPG Session | Codex Cryptica",
  description:
    "First time running a tabletop RPG? Learn what a GM actually does, choose a small adventure, prepare Session 0, run your first game and keep useful notes. Works beyond D&D.",
  leadParagraph:
    "You do not need to memorise a rulebook, invent an entire world or perform character voices to become a Game Master. Start with one manageable session. These steps cover what to do before the game, what to say when the players surprise you, and what to keep afterwards. They work for D&D, Pathfinder, horror games and other tabletop RPGs.",
  ogImage: "https://assets.codexcryptica.com/og/dungeons-and-dragons.jpg",
  ogImageAlt:
    "A tabletop Game Master's screen with dice, notes and a map ready for a first session",

  primaryCta: {
    heading: "Start here: what does a first-time GM actually need?",
    body:
      "Your first job is to put the players in an interesting situation, ask what they do and describe how the world responds. Begin with the short first-time GM guide, then use the steps below as your checklist.",
    action: {
      label: "Read the first-time GM guide",
      href: "/answers/how-do-i-start-gming-for-the-first-time",
    },
    supportingLinks: [
      {
        title: "How do I run a successful Session 0?",
        href: "/answers/how-do-i-run-a-successful-session-0",
        description: "Agree on the kind of game everyone wants before the first scene.",
        badge: "Answer",
      },
      {
        title: "Session Prep Builder",
        href: "/tools/session-prep-builder",
        description: "Turn a small scenario idea into a practical run sheet.",
        badge: "Tool",
      },
    ],
  },

  jobs: [
    {
      id: "choose",
      heading: "1. Choose a game you can run soon",
      question: "Do I need to design a whole campaign first?",
      intro:
        "No. A short starter adventure or one-shot is enough. Choose a ruleset your group wants to try, keep the first premise simple and give players a clear opening situation.",
      links: [
        {
          title: "How do you write a one-shot adventure?",
          href: "/answers/how-do-you-write-a-one-shot-adventure",
          description: "Build one satisfying evening instead of a sprawling campaign.",
          badge: "Answer",
        },
        {
          title: "How do I expand a simple RPG campaign idea?",
          href: "/answers/how-do-i-expand-a-simple-rpg-campaign-idea",
          description: "Grow a single premise into a usable starting situation.",
          badge: "Answer",
        },
        {
          title: "Adventure Generator",
          href: "/generators/adventure-generator",
          description: "Get an adventure outline you can simplify and adapt.",
          badge: "Generator",
        },
      ],
    },
    {
      id: "agree",
      heading: "2. Talk to the players before you begin",
      question: "What should we agree on before the first session?",
      intro:
        "A short Session 0 covers what players enjoy, the expected tone, boundaries and practical arrangements. You can do this in twenty minutes. The point is to avoid surprises about the kind of game you are playing.",
      links: [
        {
          title: "How do I run a successful Session 0?",
          href: "/answers/how-do-i-run-a-successful-session-0",
          description: "A useful agenda for expectations, safety and character connections.",
          badge: "Answer",
        },
        {
          title: "What do I need to bring to my first D&D game?",
          href: "/answers/what-do-i-need-to-bring-to-my-first-dnd-game",
          description: "A D&D-specific checklist you can share with new players.",
          badge: "D&D example",
        },
      ],
    },
    {
      id: "prepare",
      heading: "3. Prepare one playable session",
      question: "How many notes do I need?",
      intro:
        "Prepare an immediate problem, two or three people with motivations, a handful of places and several ways the situation might change. Do not script the players' decisions.",
      links: [
        {
          title: "How do I prepare an RPG session, step by step?",
          href: "/answers/how-do-i-prepare-an-rpg-session-step-by-step",
          description: "Follow a practical preparation order without overbuilding.",
          badge: "Answer",
        },
        {
          title: "How much prep do you need for an RPG session?",
          href: "/answers/how-much-prep-do-you-need-for-an-rpg-session",
          description: "Know when your notes are enough to play.",
          badge: "Answer",
        },
        {
          title: "Session Prep Builder",
          href: "/tools/session-prep-builder",
          description: "Make a concise run sheet from your opening situation.",
          badge: "Tool",
        },
      ],
    },
    {
      id: "run",
      heading: "4. Run the table, not a script",
      question: "What if the players do something unexpected?",
      intro:
        "Describe the situation, ask what they attempt and decide what happens next using the rules when needed. When they surprise you, give their ideas a fair chance instead of forcing them back onto a prepared path.",
      links: [
        {
          title: "How do you handle players going off script as a GM?",
          href: "/answers/how-do-you-handle-players-going-off-script-as-a-gm",
          description: "Keep the session moving when the players invent a new plan.",
          badge: "Answer",
        },
        {
          title: "How do you improvise NPCs on the spot?",
          href: "/answers/how-do-you-improvise-npcs-on-the-spot",
          description: "Create a believable person without a long character sheet.",
          badge: "Answer",
        },
        {
          title: "How do I pace an RPG one-shot?",
          href: "/answers/how-do-i-pace-an-rpg-one-shot",
          description: "Give scenes enough room while still reaching an ending.",
          badge: "Answer",
        },
      ],
    },
    {
      id: "after",
      heading: "5. Keep what happened and improve next time",
      question: "What should I write down after the game?",
      intro:
        "Record the people the players met, the choices they made and the unanswered questions they care about. Ask what the group enjoyed. You can prepare the next session from those facts, not from a giant prewritten campaign.",
      links: [
        {
          title: "How do you recap a TTRPG session?",
          href: "/answers/how-do-you-recap-a-ttrpg-session",
          description: "Capture decisions, consequences and leads without rewriting the session.",
          badge: "Answer",
        },
        {
          title: "How do you organise RPG campaign notes?",
          href: "/answers/how-do-you-organise-rpg-campaign-notes",
          description: "Keep your growing collection of people and places findable.",
          badge: "Answer",
        },
        {
          title: "How do you keep track of NPCs in a long campaign?",
          href: "/answers/how-do-you-keep-track-of-npcs-in-a-long-campaign",
          description: "Remember characters only when they become relevant.",
          badge: "Answer",
        },
      ],
    },
  ],

  funnel: {
    heading: "Your first game is the milestone, not a finished world",
    intro:
      "Use a small repeatable loop. Nothing here requires a particular RPG system or paid tool.",
    steps: [
      {
        title: "Pick one premise",
        description: "Choose an adventure you can explain in two sentences.",
      },
      {
        title: "Agree on the table",
        description: "Align tone, expectations and boundaries with your players.",
      },
      {
        title: "Run one session",
        description: "Present choices, listen, adjudicate and allow consequences.",
      },
      {
        title: "Save what became true",
        description: "Keep the few notes that will matter when you play again.",
      },
    ],
  },

  relatedHeading: "Where to go after your first session",
  relatedTopics: [
    {
      title: "Running D&D",
      href: "/topics/dnd",
      description: "A D&D-specific hub for session prep, adventures, table challenges and campaign tracking.",
    },
    {
      title: "D&D for Beginners",
      href: "/topics/dnd-beginners",
      description: "A player-facing introduction to character sheets, dice and combat turns.",
    },
    {
      title: "Explore all RPG topics",
      href: "/topics",
      description: "Browse more campaign-focused learning paths and resources.",
    },
  ],
  structuredData: {
    aboutName: "How to become a Game Master for tabletop roleplaying games",
    aboutDescription:
      "System-neutral first-time Game Master guidance, from choosing a starter scenario and Session 0 through session preparation, improvisation and recapping play.",
    itemListName: "New GM First-Session Guides and Tools",
    itemListDescription:
      "A sequenced beginner Game Master guide covering choosing an adventure, Session 0, session prep, running the table and keeping campaign notes.",
    breadcrumbLabel: "New Game Master",
  },
} satisfies TopicJobHubConfig;
