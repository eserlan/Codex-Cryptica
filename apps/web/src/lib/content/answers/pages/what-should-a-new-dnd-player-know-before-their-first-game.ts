import type { AnswerConfigInput } from "../schema";

export const whatShouldANewDndPlayerKnowBeforeTheirFirstGame: AnswerConfigInput =
  {
    slug: "what-should-a-new-dnd-player-know-before-their-first-game",
    category: "getting-started",
    publishedAt: "2026-10-09",
    question: "What should a new D&D player know before their first game?",
    kind: "framework",
    shortAnswer:
      "You do not need to understand all of D&D before your first game. Learn the basic conversation at the table, how a d20 roll works when the outcome is uncertain, and the handful of places on your character sheet you will actually use. Describe what your character tries to do in ordinary language, roll when the Dungeon Master asks, and ask questions whenever you are unsure. That is enough to take part with confidence.",
    sections: [
      {
        kind: "prose",
        heading: "You do not need to know all the rules",
        paragraphs: [
          "New players often worry that everyone else knows the rules and they will hold the game up. In practice the Dungeon Master is expected to manage the rules at the table, and the other players will too. Your job in your first session is to describe what your character tries to do, not to recall a rule citation from memory.",
          "When your idea has an uncertain outcome, the DM will tell you whether a roll is needed, which die to use, and what number to add. You say what you attempt, the DM names the check or saving throw if one applies, you roll, and the DM describes what happens. Learning that conversation is more useful than trying to memorise the Player's Handbook before you arrive.",
          "You can prepare by reading the small part that covers your own character, then letting everything else come up through play. The rules that matter will appear naturally as situations call for them, and looking one up together is normal at any table.",
        ],
      },
      {
        kind: "list",
        heading: "The basic D&D loop in four steps",
        intro:
          "Almost every moment in D&D follows the same simple conversation:",
        ordered: true,
        items: [
          {
            term: "The DM describes the situation",
            text: "Where the characters are, who is there, and what is happening that the characters can perceive. This sets the choices available right now.",
          },
          {
            term: "You say what your character tries to do",
            text: "Use ordinary language. You might search a desk, ask the guard a question, move to the door, or cast a spell you have prepared. Be specific about intent and method.",
          },
          {
            term: "A roll happens when the outcome is uncertain",
            text: "If success and failure both matter and are uncertain, the DM asks for a roll and tells you the modifier to add. If there is no meaningful uncertainty, the action simply happens.",
          },
          {
            term: "The DM describes what happens next",
            text: "The result changes the situation, often creating a new choice. A success moves you closer to what you wanted, while a failure introduces a consequence or complication that the group must respond to.",
          },
        ],
      },
      {
        kind: "list",
        heading: "Which die do I roll?",
        intro:
          "D&D uses several dice, but you only need to recognise the pattern for your first session:",
        items: [
          {
            term: "The d20 does most of the deciding",
            text: "Roll a twenty-sided die for attack rolls, ability checks, skill checks, and saving throws. Add the modifier the DM names, then compare the total with the target number. That is the roll beginners will use most often.",
          },
          {
            term: "Other dice usually show the result",
            text: "When an attack hits, a spell lands, or you heal, you roll a different die to see how much effect it has. Your character sheet tells you which to use, for example a longsword dealing 1d8 slashing damage or a healing spell restoring 1d8 hit points. You only need the dice listed next to your own attacks and features.",
          },
          {
            term: "Wait for the DM to call for a roll",
            text: "Do not roll before the DM says so. Describe what you try first, then the DM will confirm whether a d20 check, attack, or save is needed and which modifier applies. That keeps the roll tied to a clear intention.",
          },
        ],
      },
      {
        kind: "list",
        heading: "You do not need to memorise your character sheet",
        intro:
          "A character sheet looks dense at first glance. For your first game, only a handful of areas will affect your decisions directly:",
        items: [
          {
            term: "Ability scores and modifiers",
            text: "The six abilities and the modifier next to each one feed into almost every roll. The DM will often say something like add your Strength or Wisdom modifier. Find those numbers and you can resolve most checks.",
          },
          {
            term: "Skills",
            text: "Skills are the common uses of those abilities, such as Perception, Persuasion, Stealth, or Arcana. When the DM asks for a specific skill, look for the number printed beside it.",
          },
          {
            term: "Armour Class and hit points",
            text: "Armour Class is how hard you are to hit, hit points show how much punishment you can take before falling. Note where they are written and how to adjust hit points when you take damage or receive healing.",
          },
          {
            term: "Attacks, spells, or features relevant to this character",
            text: "Know the few options you will actually use: your main attack or cantrip, one or two prepared spells or abilities, and any feature that changes how you act. Note the attack bonus, saving throw target, range, and damage so you can read it aloud without searching.",
          },
          {
            term: "Everything else can wait",
            text: "Equipment lists, languages, background details, and secondary features support the character but rarely decide the next action. Glance over them, then return to the areas above when a roll is called.",
          },
        ],
      },
      {
        kind: "prose",
        heading: "What am I actually supposed to say?",
        paragraphs: [
          "Roleplaying in D&D does not require acting, accents, or speaking in character. The table cares that other players understand what your character attempts and why, not how theatrically you deliver it.",
          "You can speak as your character when that feels comfortable, or you can describe the intention in the third person. Both are valid at every table, including tables where some players do enjoy voices and dialogue. The DM will treat either form the same way and ask for more detail only when intent is unclear.",
          "If you are unsure how to phrase something, start with a plain sentence about goal and approach: who you address, what you ask or do, and how your character tries to do it. The DM will take it from there.",
        ],
      },
      {
        kind: "example",
        heading: "Two ways to play the same interaction",
        paragraphs: [
          "The party need information from a guard about a missing merchant. The player at the table has not prepared a speech and feels uneasy about improvising dialogue. Both approaches move the scene forward correctly.",
        ],
        items: [
          {
            term: "Speaking in character",
            text: '"Good evening, captain. Have you seen the missing merchant called Emra? She was due back from the market road yesterday, and we are worried." The player uses the character voice because they enjoy it. The DM notes the polite approach and asks for a Persuasion check.',
          },
          {
            term: "Describing the intention",
            text: '"I ask the guard whether he has seen the missing merchant. I mention her name and when she was expected, and I keep the tone respectful so he does not feel accused." The player describes the same intent without performing dialogue. The DM notes the same respectful approach and asks for the same check.',
          },
          {
            term: "Why it works",
            text: "The DM received the same usable information in both cases: who is addressed, what is asked, and the intended tone. Either phrasing gives the table a clear action to resolve. The guard might answer helpfully on a success, or explain he cannot share watch information on a failure, but neither player needed to perform to earn the roll.",
          },
        ],
      },
      {
        kind: "list",
        heading: "When can I do things?",
        intro:
          "D&D shifts between two modes. Knowing which one you are in tells you how much structure to expect:",
        items: [
          {
            term: "Free-form exploration and social play",
            text: "Outside combat, the group acts naturally. You speak when you have something your character would do or say, and the DM moves attention between players to make sure everyone gets a turn at trying things. There is no fixed order, so listening for natural pauses is enough.",
          },
          {
            term: "Structured combat on initiative",
            text: "When the situation demands close tracking, usually a fight, the DM asks for initiative rolls and arranges a turn order. On your turn you normally move and take an action, with bonus actions and reactions available only when your features allow them. Between turns you still pay attention, track hit points, and plan your next move, but you wait for your turn to act.",
          },
          {
            term: "The transition is explicit",
            text: "The DM will tell you when initiative begins and when it ends. If you are ever unsure whether you can act, ask. You are not expected to guess the structure from context alone.",
          },
        ],
      },
      {
        kind: "prose",
        heading: "Failing a roll is not failing at D&D",
        paragraphs: [
          "Beginners sometimes treat a low roll as a mistake or a sign they chose the wrong approach. At the table a failed check, saving throw, or attack is part of how the story moves. The character tried something difficult and the dice showed the attempt did not work as intended. The game continues from the new situation.",
          "A failed roll often creates the most memorable moments: the negotiation that turns cautious after a poor Persuasion check, the stealthy approach that becomes a chase, or the attack that misses and leaves the party to solve the problem another way. Players are not expected to find a single correct solution. The group tries ideas, lives with the consequences, and makes the next choice from there.",
          "The DM is responsible for making failure interesting rather than punitive. If a failed roll would stall the game entirely, a good DM will offer a cost, complication, or alternative path rather than a dead end. Your part is simply to respond to what the table now knows.",
        ],
      },
      {
        kind: "list",
        heading: "Ask questions",
        intro:
          "Questions are the normal way a table keeps play moving, not a sign you are unprepared. Experienced players ask them all session, and the DM expects to answer them:",
        items: [
          {
            term: '"Where is that on my sheet?"',
            text: "Use this when the DM names a skill, saving throw, or modifier you have not found yet. Another player will often point to the right line without breaking the flow of the scene.",
          },
          {
            term: '"What do I roll?"',
            text: "Use this after describing your action when the DM has not yet called for a roll. The DM will name the d20 check or save, or tell you no roll is needed.",
          },
          {
            term: '"Would my character know this?"',
            text: "Use this when you as a player are unsure but your character might have relevant knowledge, training, or background. The DM can answer through what the character would reasonably know or ask for a suitable check.",
          },
          {
            term: '"Can I try ...?"',
            text: "Use this for any idea you want to test. If it is possible, the DM will tell you how. If it needs a different ability, a helping character, or another approach, the DM will say so plainly.",
          },
        ],
      },
      {
        kind: "checklist",
        heading: "One-minute version",
        intro: "Keep these five lines nearby for your first session:",
        items: [
          "Describe what your character tries to do.",
          "Roll when the DM asks, and add the number they tell you to add.",
          "You do not need to act or speak in character unless you want to. Describing your intention works just as well.",
          "A failed roll is a new situation, not a sign you played incorrectly.",
          "Ask questions whenever you are unsure. The table expects to help.",
        ],
      },
    ],
    codexConnection: {
      heading: "Keep the pieces of your first campaign in one place",
      paragraphs: [
        "You do not need campaign software to enjoy your first session. When the group decides to keep playing, Codex Cryptica gives those details somewhere durable to live: the NPCs you met, the places you chose to visit, and the threads you left open. Link them together so next session starts with what the party actually knows rather than a memory test.",
        "If you later move behind the screen, the same organisation helps with the next steps: preparing a session from the current situation and tracking what the party has promised, learned, or left unresolved.",
      ],
      linkText: "Explore tools for D&D",
      href: "/for/dungeons-and-dragons",
    },
    relatedTools: [
      {
        title: "D&D NPC generator",
        description:
          "Add a shopkeeper, guard, patron, or rival when your first sessions need a named person quickly.",
        href: "/generators/dnd-npc",
      },
      {
        title: "Fantasy names generator",
        description:
          "Find a character name after you have chosen the concept you want to play.",
        href: "/generators/fantasy-names",
      },
      {
        title: "Tavern generator",
        description:
          "Sketch a tavern or inn when the party's first base or meeting place needs detail.",
        href: "/generators/tavern",
      },
    ],
    relatedForPages: [
      {
        title: "Dungeons & Dragons",
        description:
          "Keep D&D characters, locations, and open threads connected between sessions.",
        href: "/for/dungeons-and-dragons",
      },
      {
        title: "Fantasy worldbuilding",
        description:
          "Grow the world outward as the party explores, rather than building it all before play.",
        href: "/for/fantasy-worldbuilding",
      },
    ],
    relatedAnswers: [
      "what-should-a-new-dnd-player-learn-first",
      "how-do-i-start-a-dnd-campaign",
      "how-do-i-prepare-a-dnd-session",
      "how-do-i-organise-a-dnd-campaign",
      "where-do-i-start-if-i-have-never-played-a-tabletop-rpg",
      "how-do-i-run-a-successful-session-0",
      "how-do-i-find-a-tabletop-rpg-group-to-play-with",
    ],
    discovery: {
      id: "answer-new-dnd-player-first-game",
      parentCluster: "getting-started",
      clusters: ["getting-started", "dnd-campaign"],
      primaryIntent:
        "what should a new dnd player know before their first game",
      intentAliases: [
        "new dnd player guide",
        "first dnd game",
        "how to play dnd for beginners",
        "what should i know before playing dnd",
        "what do you do in dnd",
        "dnd first session tips",
        "new dnd player character sheet",
        "what do new dnd players need to know",
        "what is confusing for new dnd players",
        "how do i play dnd for the first time",
        "what am i supposed to do during a dnd game",
        "do i need to know all the rules before playing dnd",
      ],
      uniqueValue:
        "Player-facing reassurance for a nervous first session: the four-step DM to consequence loop, the d20 and damage-die split, a constrained character-sheet orientation, why roleplaying does not require acting, free-form versus initiative structure, and a five-line reminder framed as normal table questions.",
      relatedIntents: [
        "answer-new-dnd-player-learn-first",
        "answer-beginner-start",
        "answer-start-dnd-campaign",
        "answer-dnd-session-prep",
        "answer-session-zero",
      ],
      acknowledgedOverlap: [
        {
          with: "answer-new-dnd-player-learn-first",
          reason:
            "That answer helps a new player choose what to learn before play with a d20 primer and character-building questions for the DM; this answer is the companion first-table guide focused on the live-play loop, when to roll, how to speak at the table, the relevant character-sheet areas, and normalising questions and failed rolls during the session itself.",
        },
        {
          with: "answer-beginner-start",
          reason:
            "The existing beginner start covers the minimum needed to begin any tabletop RPG as player or GM; this page is D&D-specific and player-facing, covering D&D's conversational loop, the d20 split, character-sheet orientation, and combat versus free-form expectations.",
        },
      ],
    },
    seo: {
      title:
        "What should a new D&D player know before their first game? | Codex Cryptica",
      description:
        "A welcoming first-game guide for new D&D players: the play loop, which dice matter, what to know on your sheet, how to speak at the table, and why failed rolls are normal.",
      image:
        "https://assets.codexcryptica.com/og/what-should-a-new-dnd-player-know-before-their-first-game.jpg",
      imageAlt:
        "New D&D players gathered around a table with character sheets, dice, and a welcoming Dungeon Master",
    },
  };
