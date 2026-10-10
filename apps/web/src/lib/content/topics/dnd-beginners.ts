import type { TopicBeginnerHubConfig } from "./beginner-hub-types";

export const DND_BEGINNERS_TOPIC_CONFIG = {
  slug: "dnd-beginners",
  canonicalPath: "/topics/dnd-beginners",
  label: "fantasy",
  title: "D&D for Beginners: What New Players Need to Know",
  metaTitle:
    "D&D for Beginners: What New Players Need to Know | Codex Cryptica",
  description:
    "New to D&D? A clear, reassurance-first guide to the table play loop, character sheet basics, dice, combat turns, and what you can safely ignore until later.",
  leadParagraph:
    "You do not need to memorise rulebooks before your first game of Dungeons & Dragons. The Dungeon Master describes what happens, you describe what your character tries to do, and you roll a twenty-sided die only when the outcome is uncertain. Here is what to learn first, what to bring, and what you can safely ignore until you are comfortable at the table.",
  ogImage:
    "https://assets.codexcryptica.com/og/what-should-a-new-dnd-player-know-before-their-first-game.jpg",
  ogImageAlt:
    "New D&D players gathered around a table with character sheets, dice, and a welcoming Dungeon Master",

  startHere: {
    heading: "Start here: the basic D&D loop",
    subheading: "Everything at the table flows from a simple conversation",
    intro:
      "D&D is not a board game with rigid phases. Almost every moment at the table follows the same four-step rhythm:",
    playLoopSteps: [
      {
        step: 1,
        title: "The DM describes the situation",
        description:
          "Where you are, who is nearby, and what immediate danger or curiosity catches your eye.",
      },
      {
        step: 2,
        title: "You say what your character tries to do",
        description:
          "Use ordinary words. You might search the chest, ask the guard a question, or draw your sword.",
      },
      {
        step: 3,
        title: "A roll happens when the outcome is uncertain",
        description:
          "If success is not guaranteed, the DM asks for a d20 roll, names your modifier, and checks the total.",
      },
      {
        step: 4,
        title: "The DM narrates what happens next",
        description:
          "The world reacts to your attempt, the scene shifts, and the group decides their next move.",
      },
    ],
    primaryLink: {
      title: "What should a new D&D player know before their first game?",
      href: "/answers/what-should-a-new-dnd-player-know-before-their-first-game",
      description:
        "The core conversation, why roleplaying does not require voice acting, and why failed rolls make great stories.",
      badge: "Core Guide",
      isPrimary: true,
    },
    reassuranceText:
      "You are not expected to know the rules by heart. The Dungeon Master is there to adjudicate situations and tell you when to roll.",
  },

  learningSteps: [
    {
      step: 1,
      id: "before-first-session",
      heading: "Before your first session",
      question: "What do I actually need to bring and prepare?",
      summary:
        "You do not need to buy hefty rulebooks before arriving. Pack a simple kit, clarify a few practical points with your Dungeon Master, and rest easy knowing that the table will guide you.",
      takeaways: [
        "Pack a physical pencil, eraser, a set of polyhedral dice, and your character sheet (printed or digital).",
        "Ask your DM what tone the game has, whether pre-generated characters are provided, and if any house rules apply.",
        "Roleplaying is simply deciding what your character would do — accents and theatrical acting are entirely optional.",
      ],
      links: [
        {
          title: "What do I need to bring to my first D&D game?",
          href: "/answers/what-do-i-need-to-bring-to-my-first-dnd-game",
          description:
            "A practical checklist of essentials, useful extras, and what to ask your group beforehand.",
          badge: "Guide",
        },
        {
          title: "What should a new D&D player learn first?",
          href: "/answers/what-should-a-new-dnd-player-learn-first",
          description:
            "The small handful of concepts that get a beginner playing, and what can wait for later.",
          badge: "Guide",
        },
      ],
    },
    {
      step: 2,
      id: "understand-character",
      heading: "Understand your character",
      question: "How do I make sense of this sheet?",
      summary:
        "A character sheet looks intimidating at first glance, but you only use three or four areas during most of a game. Learn where your vital numbers sit, and leave the rest until someone asks.",
      takeaways: [
        "Hit Points (HP) show your current health; Armour Class (AC) is the number enemy attacks must reach to hit you.",
        "Ability scores (such as Strength 16) only exist to set the modifier (+3) that you actually add to your d20 rolls.",
        "Your proficiency bonus is automatically included in the weapons, skills, and saving throws your character knows.",
        "Attacks and spells list the exact damage die to roll whenever an attack connects.",
      ],
      links: [
        {
          title: "How do I read a D&D character sheet as a beginner?",
          href: "/answers/how-do-i-read-a-dnd-character-sheet-as-a-beginner",
          description:
            "A tour of the vital fields on a 1st-level sheet in order of usefulness, with what can safely wait.",
          badge: "Guide",
        },
      ],
    },
    {
      step: 3,
      id: "understand-dice",
      heading: "Understand the dice",
      question: "Which die do I roll, and what do the numbers mean?",
      summary:
        "D&D uses seven polyhedral dice, but one die does almost all the deciding. Once you understand the twenty-sided die (d20), the rest of the game becomes straightforward.",
      takeaways: [
        "The d20 handles all tests: roll 1d20, add your modifier, and meet or beat the target number set by the DM.",
        "Other dice (d4, d6, d8, d10, d12) only determine the magnitude of damage or healing after an action succeeds.",
        "Dice notation is simple: '1d8 + 3' means roll one eight-sided die and add 3 to the result.",
        "Advantage means rolling two d20s and taking the higher; disadvantage means taking the lower.",
      ],
      links: [
        {
          title: "Which dice do I roll in D&D, and when?",
          href: "/answers/which-dice-do-i-roll-in-dnd-and-when",
          description:
            "The single d20 habit for tests, how weapon entries name damage dice, and advantage in plain English.",
          badge: "Guide",
        },
      ],
    },
    {
      step: 4,
      id: "first-combat",
      heading: "Your first combat turn",
      question: "What happens when initiative is rolled and it is my turn?",
      summary:
        "Combat runs in rounds where everyone takes a turn. You do not need complex tactics: you have a clear budget of movement and an action, and you can always describe your intent in plain language.",
      takeaways: [
        "Initiative: Everyone rolls a d20 to set turn order; that sequence repeats every round until the fight concludes.",
        "On your turn, you can move up to your speed and take one main Action (Attack, Cast a Spell, Dash, Dodge, Disengage).",
        "Bonus actions and reactions only occur when a specific ability, spell, or situation gives you one.",
        "If you do not know the formal action name, just describe your goal — the DM will tell you what to roll.",
      ],
      links: [
        {
          title: "What can I do on my turn in D&D combat?",
          href: "/answers/what-can-i-do-on-my-turn-in-dnd-combat",
          description:
            "The four-part turn budget, the purpose-led action menu, and how to describe intent at the table.",
          badge: "Guide",
        },
      ],
    },
  ],

  scopeComparison: {
    heading: "You do not need to learn everything yet",
    intro:
      "The fastest way to burn out before your first game is treating D&D like homework. Separate the small handful of things that get you playing tonight from the details that only matter when they appear in play.",
    learnNow: {
      title: "Learn now",
      subtitle: "Essential for your first session",
      items: [
        {
          term: "The 4-step play loop",
          detail:
            "Listen to the DM, state what you attempt, roll a d20 if asked, and hear what happens next.",
        },
        {
          term: "Where your main numbers live",
          detail:
            "Hit Points, Armour Class, Speed, and the ability modifiers (+1, +2, +3) next to your stats.",
        },
        {
          term: "Your primary attack or spell",
          detail:
            "Which d20 modifier to roll to hit, and which damage die to roll if it lands.",
        },
        {
          term: "How to describe intent",
          detail:
            "Explain what you want your character to achieve in plain English rather than hunting for rules jargon.",
        },
        {
          term: "How to ask questions",
          detail:
            "Normalise asking the DM or fellow players where a number is on your sheet whenever you are unsure.",
        },
      ],
    },
    learnLater: {
      title: "Learn later",
      subtitle: "Look these up only when they become relevant",
      items: [
        {
          term: "Obscure conditions",
          detail:
            "Paralysed, Stunned, Restrained, and Blinded — look them up if a spell or monster inflicts them.",
        },
        {
          term: "Every spell in the rulebook",
          detail:
            "You only ever need the two to four spells written on your own character sheet.",
        },
        {
          term: "Edge-case action economy",
          detail:
            "Complex interactions like two-weapon fighting, readying actions, and grappling nuances.",
        },
        {
          term: "Other classes' abilities",
          detail:
            "Let the other players manage their own characters; you only need to focus on yours.",
        },
        {
          term: "Detailed encounter rules",
          detail:
            "Carrying capacity, suffocation, marching order, and extreme wilderness weather.",
        },
      ],
    },
  },

  toolsAndNextSteps: {
    heading: "Helpful tools for new players",
    intro:
      "You do not need complex software to play D&D, but a few lightweight utilities can make your first sessions smoother.",
    links: [
      {
        title: "Browser Dice Roller",
        href: "/dice",
        description:
          "Roll polyhedral dice in your browser when you need a quick d20 test or damage roll.",
        badge: "Tool",
      },
      {
        title: "How do I take useful RPG notes during play?",
        href: "/answers/how-do-i-take-useful-rpg-notes-during-play",
        description:
          "A simple structure for jotting down NPC names, clues, and inventory without missing the action.",
        badge: "Answer",
      },
      {
        title: "Running D&D as a Dungeon Master",
        href: "/topics/dnd",
        description:
          "Ready to step behind the screen? Our GM guide walks through session prep, building adventures, and running the table.",
        badge: "Topic Hub",
      },
    ],
  },

  relatedHeading: "More about D&D and Codex Cryptica",
  relatedTopics: [
    {
      title: "Running D&D (GM Hub)",
      href: "/topics/dnd",
      description:
        "The companion hub for Dungeon Masters: starting campaigns, session prep, adventure design, and table management.",
    },
    {
      title: "Codex Cryptica for D&D",
      href: "/for/dungeons-and-dragons",
      description:
        "Learn how Codex Cryptica helps organize long-running D&D campaigns.",
    },
    {
      title: "All fantasy material on Explore",
      href: "/explore?label=fantasy",
      description: "Browse more fantasy guides, generators, and examples.",
    },
  ],

  structuredData: {
    aboutName: "Dungeons & Dragons for Beginners",
    aboutDescription:
      "What new players need to know before their first D&D game: table conversation, character sheet basics, dice rules, and combat turns.",
    itemListName: "D&D Beginner Guides and Resources",
    itemListDescription:
      "Curated guides covering first-game preparation, character-sheet orientation, dice mechanics, and combat turns for new D&D players.",
    breadcrumbLabel: "D&D for Beginners",
  },
} satisfies TopicBeginnerHubConfig;
