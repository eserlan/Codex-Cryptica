import type { AnswerConfigInput } from "../schema";

export const whatShouldANewDndPlayerLearnFirst: AnswerConfigInput = {
  slug: "what-should-a-new-dnd-player-learn-first",
  category: "getting-started",
  publishedAt: "2026-09-09",
  question: "What should a new D&D player learn first?",
  kind: "framework",
  shortAnswer:
    "Before your first D&D session, learn only what your own character can do, how the basic d20 roll works, and how the table takes turns describing actions and resolving them. You do not need to memorise every class, species, background, rule, or spell. Ask the Dungeon Master which books and options the campaign uses, bring a simple reason for your character to join the party, and expect to ask questions while you play.",
  sections: [
    {
      kind: "prose",
      heading: "Start with the game loop, not the whole rulebook",
      paragraphs: [
        "D&D works through a repeating conversation. The Dungeon Master describes a situation, you say what your character tries, and the DM tells you whether a roll is needed. When a roll matters, you add the relevant modifier to a d20 result and compare it with a target number. The DM then describes what happens and the group responds to the new situation.",
        "That loop is enough to begin. In a fight, the same conversation is organised into turns. Your character normally moves and takes an action, with bonus actions and reactions available only when the character's features allow them. You can describe an intention in ordinary language and let the DM tell you which rule applies. You are not expected to know the name of every rule before you use it.",
      ],
    },
    {
      kind: "list",
      heading: "The small set of rules worth learning first",
      intro:
        "Read the parts that affect your next decision. Leave the rest for the moment it becomes relevant:",
      items: [
        {
          term: "The d20 check",
          text: "Roll a twenty-sided die, add the ability or skill modifier the DM names, and meet or beat the target number when the roll is higher. The DM can explain which modifier to use.",
        },
        {
          term: "Advantage and disadvantage",
          text: "Roll two d20s when a rule gives you advantage or disadvantage. Keep the higher result with advantage and the lower result with disadvantage. They do not normally stack.",
        },
        {
          term: "Checks, attacks, and saves",
          text: "An ability or skill check tests what you attempt, an attack roll tries to hit a creature, and a saving throw represents resisting something happening to you. The shape is similar even when the details differ.",
        },
        {
          term: "Your own turn",
          text: "Know your movement, your main action, and any feature you are likely to use. Note the range, target, damage or effect, and resource cost of your most common options.",
        },
        {
          term: "The table's version of D&D",
          text: "Ask which edition, books, species options, classes, house rules, and safety expectations the DM uses. A campaign may not use every option shown in a character builder or rulebook.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Build a playable first character",
      paragraphs: [
        "You do not need to compare every class or species before choosing. Pick a class whose central activity sounds enjoyable, then choose a species, background, and appearance that give you a character you can imagine playing. If the choices still feel like too much, ask the DM for two or three suitable options or use a pre-generated character.",
        "Give the character one clear reason to travel with other people. A useful first backstory can fit in three sentences: what they used to do, what they want now, and why they cannot pursue it alone. A retired soldier looking for her brother, a reckless apprentice wizard seeking a lost mentor, or a thief trying to go straight all give you something to say when the party needs a decision.",
      ],
    },
    {
      kind: "example",
      heading: "Worked example: from character choices to a first scene",
      paragraphs: [
        "Suppose a new player likes the idea of a daring archer but is worried about choosing the perfect build. The aim is a character the player can use immediately, not a finished biography or an optimised set of choices.",
      ],
      items: [
        {
          term: "Overloaded starting point",
          text: "The player reads every class guide, compares species bonuses, writes six pages of backstory, and still cannot say what their character wants when the DM asks why they are in the village.",
        },
        {
          term: "Playable starting point",
          text: "The player chooses a ranger because exploring and shooting appeal to them, takes a suggested species and background, writes down their bow attack and one useful class feature, then decides: I left the border watch to find my missing brother.",
        },
        {
          term: "Why it works",
          text: "The player has a clear action to try, a reason to cooperate, and only a few rules to reference. The DM can introduce the remaining features when they become relevant instead of turning character creation into an exam.",
        },
      ],
    },
    {
      kind: "list",
      heading: "What to ask your Dungeon Master",
      intro:
        "A short conversation removes more uncertainty than another hour of general reading:",
      items: [
        {
          term: "Which rules are we using?",
          text: "Confirm the edition or rules revision and whether the group uses a quick-start guide, a core rulebook, or a house rules document.",
        },
        {
          term: "What options are available?",
          text: "Ask which classes, species, backgrounds, spells, and character-building sources are allowed. Do not assume every option you find online belongs in this campaign.",
        },
        {
          term: "What is the campaign about?",
          text: "Learn the broad setting, tone, starting location, and expected reasons for the party to work together. This helps you make a character who can enter the first scene.",
        },
        {
          term: "How should I prepare?",
          text: "Ask whether you need dice, a printed sheet, a virtual tabletop account, or anything else. In many groups, the DM supplies a character sheet and explains the tools.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Before your first D&D session",
      intro: "You are ready to start when you can answer these plainly:",
      items: [
        "I know what my character is good at and what they want right now.",
        "I know how to make a basic d20 roll and where my common modifiers are written.",
        "I can describe one action my character might try in a scene.",
        "I know the name of my main attack, spell, or class feature and what it does.",
        "I have asked the DM which books, options, and table rules apply.",
        "I am comfortable pausing to ask what a rule means when it comes up.",
      ],
    },
  ],
  codexConnection: {
    heading: "Keep the useful character details close at hand",
    paragraphs: [
      "Codex Cryptica can give a new player a place to keep the short version of a character concept, their party connections, and the campaign facts the DM has confirmed. Its generators can provide a starting NPC or name when a first session needs a detail filled in, but you should decide what you want to play before reaching for extra material.",
      "Once the group has played a few sessions, linking characters, locations, and unresolved questions makes the growing campaign easier to follow. That organisation is useful after the first session, not a prerequisite for learning the game.",
    ],
    linkText: "Explore Codex Cryptica for D&D",
    href: "/for/dungeons-and-dragons",
  },
  relatedTools: [
    {
      title: "D&D NPC generator",
      description:
        "Create a quick supporting character when a first session needs a shopkeeper, rival, guide, or other named NPC.",
      href: "/generators/dnd-npc",
    },
    {
      title: "Fantasy names generator",
      description:
        "Find a character or place name after you have chosen the concept and role you want to play.",
      href: "/generators/fantasy-names",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for D&D",
      description:
        "See how D&D campaigns can keep their characters, locations, factions, and session history connected.",
      href: "/for/dungeons-and-dragons",
    },
  ],
  relatedAnswers: [
    "where-do-i-start-if-i-have-never-played-a-tabletop-rpg",
    "how-do-i-run-a-successful-session-0",
    "how-do-i-find-a-tabletop-rpg-group-to-play-with",
    "what-rpg-system-should-we-try-instead-of-dnd",
  ],
  discovery: {
    id: "answer-new-dnd-player-learn-first",
    parentCluster: "beginner-entry",
    primaryIntent: "what a new dnd player should learn before their first session",
    intentAliases: [
      "what should i learn before playing dnd",
      "how much dnd do i need to know before playing",
      "what do i need to know to play dnd",
      "how to make a first dnd character",
      "where do i start with dnd as a new player",
    ],
    uniqueValue:
      "Reduces D&D's character and rules choices to the small set a player needs before session one, with a d20 primer, a playable-concept test, and questions to ask the DM.",
    relatedIntents: [
      "answer-beginner-start",
      "answer-session-zero",
      "answer-system-selection",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-beginner-start",
        reason:
          "Both help someone enter tabletop RPGs, but the existing page covers the minimum needed to start any RPG while this page focuses on the D&D player's first rules, character choices, and questions for the DM.",
      },
    ],
  },
  seo: {
    title: "What should a new D&D player learn first? | Codex Cryptica",
    description:
      "A focused first-session guide for new D&D players: the basic d20 rules, what to learn about your character, what to ask the DM, and what you can ignore for now.",
    image:
      "https://assets.codexcryptica.com/og/what-should-a-new-dnd-player-learn-first.jpg",
    imageAlt:
      "New D&D player learning a first character at a welcoming tabletop",
  },
};
