import type { AnswerConfigInput } from "../schema";

export const whatDoINeedToBringToMyFirstDndGame: AnswerConfigInput = {
  slug: "what-do-i-need-to-bring-to-my-first-dnd-game",
  category: "getting-started",
  publishedAt: "2026-10-08",
  question: "What do I need to bring to my first D&D game?",
  kind: "how-to",
  shortAnswer:
    "For most first D&D games you need only your character, a way to roll dice, something to take notes with, and anything the Dungeon Master specifically asked you to bring. You do not need to buy rulebooks, expensive dice, miniatures or accessories before you have played. Many tables will lend you dice, explain the rules, or supply a ready-made character, so check what your group already covers before you buy anything.",
  sections: [
    {
      kind: "prose",
      heading: "The barrier is smaller than it looks",
      paragraphs: [
        "New players often worry that D&D requires a large purchase or a full set of gear before the first session. In practice, most groups keep the first game deliberately light. The Dungeon Master brings the adventure, the other players bring experience, and your job is to arrive ready to participate, not ready to supply the table.",
        "Expensive accessories do not make a first game go better. A borrowed set of dice works the same as a premium one, a phone or spare dice app can cover rolls if the group agrees, and a printed or digital character sheet the DM has approved is enough. If you are unsure what the table provides, a short message to the DM settles it faster than any shopping list.",
      ],
    },
    {
      kind: "checklist",
      heading: "Short checklist that covers most tables",
      intro:
        "Bring these basics, or confirm the table already covers them, and you are ready for almost any first session:",
      items: [
        "Your character, as a printed sheet, a digital sheet, or a pre-generated character the DM supplied, with the key numbers you will actually use marked or highlighted.",
        "A way to roll dice: a single set of polyhedral dice, or an agreed digital roller if the group is happy with one.",
        "Something to write with: a pencil and scrap paper, or a notes app on your phone if the table allows devices.",
        "Anything the DM specifically asked you to bring, such as a virtual tabletop link, a headset for online play, or a particular app or reference.",
        "Water and a way to stay comfortable for a couple of hours, especially if you are heading to someone's home or a shop table.",
      ],
    },
    {
      kind: "list",
      heading: "What counts as essential, useful, or ask-first",
      intro:
        "It helps to separate what you genuinely need from what is nice to have and what varies by table:",
      items: [
        {
          term: "Essential for most first games",
          text: "A character the table has approved, a way to make the rolls that character needs, a pencil or other note-taking method, and the rules source or quick-start the group has agreed on. If your spellcaster uses spells or your class has limited features, bring that short reference too.",
        },
        {
          term: "Useful but not required",
          text: "A small notebook that fits beside your sheet, water, a charger or power bank if you are using a phone or laptop, and a one-page summary of your most common actions so you are not flipping through a book mid-scene.",
        },
        {
          term: "Ask your DM or host first",
          text: "Miniatures, battle maps, physical rulebooks, snacks and food arrangements, and whether phones or tablets are welcome at the table. Many groups already own these things and would rather you did not buy duplicates.",
        },
        {
          term: "Leave the purchase at home",
          text: "You do not need a full library of rulebooks, a premium dice collection, custom miniatures, or table accessories before trying the game. If D&D becomes a regular activity, you can decide later what is worth owning based on how your group actually plays.",
        },
      ],
    },
    {
      kind: "list",
      heading: "If your first game is online",
      intro: "The essentials stay the same. Only the tools change:",
      items: [
        {
          term: "Quiet audio",
          text: "A headset or a mic that does not pick up the whole room makes it easier for everyone to follow conversation, especially in larger groups.",
        },
        {
          term: "Stable connection and links",
          text: "Join from a place with reliable internet and have the invite links ready before the start time: the virtual tabletop, voice chat, and any shared character keeper the group uses.",
        },
        {
          term: "Character ready beforehand",
          text: "Have your digital character open and logged in, with your common rolls and actions where you can find them quickly, so the group is not waiting while you locate a spell description.",
        },
        {
          term: "A way to take notes that does not mute you",
          text: "Keep a small text file or paper nearby. Typing in the same device that carries voice can trigger push-to-talk issues, so test your setup before the session if you can.",
        },
      ],
    },
    {
      kind: "example",
      heading: "Worked example: two ways to prepare for the same first session",
      paragraphs: [
        "A new player has been invited to a home game. The DM said to bring a level one character and that spare dice will be available, and the group plays in person around a kitchen table.",
      ],
      items: [
        {
          term: "Over-prepared and out of pocket",
          text: "The player buys the core rulebooks, a premium metal dice set, a miniature before choosing a character, and printed battle maps. They arrive with material the table already owns and spend the first hour worrying about using everything correctly instead of listening to the opening scene.",
        },
        {
          term: "Ready without extra shopping",
          text: "The player confirms a pre-generated fighter is available, borrows dice at the table, brings a pencil and a small notebook, and writes down their two most common actions with range and damage. They also bring water and check whether snacks are shared or brought individually.",
        },
        {
          term: "Why it works",
          text: "The second approach matches what the DM offered and what the table already provides. The player can still describe what their character tries, roll when asked, and note the names the DM mentions, which matters more in a first game than owning equipment the group can already supply.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "The night before your first session",
      intro:
        "A quick pass so you are not sorting it out after the game has started:",
      items: [
        "Message the DM: do I need dice, a printed sheet, or a link, and is there anything I should read beforehand?",
        "Check that your character sheet is the version the DM approved and that your main attack, spell, or feature is easy to find.",
        "Pack a pencil, a few sheets of paper or a notes app, and a way to roll if the table does not supply one.",
        "For online games, test your mic, invite links, and character login the day before, not at the start time.",
        "Know how snacks, drinks, and table devices are handled so you match the host's expectations.",
        "Plan to ask questions like where is that on my sheet, what do I roll, or can I try this, when they come up in play.",
      ],
    },
  ],
  codexConnection: {
    heading: "Keep the first session light, organise later",
    paragraphs: [
      "Codex Cryptica is not something you need to set up before your first game. Play first, then decide what you want to keep: the characters you met, the locations the DM described, and the questions you left unanswered are a natural place to start.",
      "After a session or two, a vault can hold those details as linked notes so you recognise returning names. Generators can fill in a quick NPC or place name when the table needs one, but for a first game the priority is the short checklist above, not extra tools.",
    ],
    linkText: "Explore Codex Cryptica for D&D",
    href: "/for/dungeons-and-dragons",
  },
  relatedTools: [
    {
      title: "D&D NPC generator",
      description:
        "Create a quick supporting character when a first session needs a shopkeeper, guard, or patron without stopping play.",
      href: "/generators/dnd-npc",
    },
    {
      title: "Fantasy names generator",
      description:
        "Find a character or place name after you have chosen the concept you want to play.",
      href: "/generators/fantasy-names",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for D&D",
      description:
        "See how D&D campaigns can keep characters, locations, factions, and session history connected.",
      href: "/for/dungeons-and-dragons",
    },
  ],
  relatedAnswers: [
    "what-should-a-new-dnd-player-learn-first",
    "where-do-i-start-if-i-have-never-played-a-tabletop-rpg",
    "how-do-i-run-a-successful-session-0",
    "how-do-i-find-a-tabletop-rpg-group-to-play-with",
  ],
  discovery: {
    id: "answer-bring-to-first-dnd-game",
    parentCluster: "beginner-entry",
    primaryIntent: "what to bring to your first dnd game",
    intentAliases: [
      "what do i need to bring to my first dnd game",
      "what should i bring to my first dungeons and dragons session",
      "dnd first game checklist",
      "what do new dnd players need to bring",
      "do i need to buy dnd books before playing",
    ],
    uniqueValue:
      "Organises first-session preparation into essential, useful, and ask-your-DM tiers with a short top-of-page checklist, so a beginner sees the small minimum without buying unnecessary gear.",
    relatedIntents: [
      "answer-new-dnd-player-learn-first",
      "answer-beginner-start",
      "answer-session-zero",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-beginner-start",
        reason:
          "Both help beginners enter the hobby, but the existing page covers the minimum needed to start any tabletop RPG while this page focuses on the specific packing and table-expectation checklist for a first D&D session.",
      },
      {
        with: "answer-new-dnd-player-learn-first",
        reason:
          "That page teaches the D&D play loop and what to learn before session one; this page answers the narrower logistical question of what physical and digital items to bring, including the online branch.",
      },
    ],
  },
  seo: {
    title: "What do I need to bring to my first D&D game? | Codex Cryptica",
    description:
      "A short, practical checklist for your first D&D game: the essentials, useful extras, what to ask your DM first, and what changes for online play.",
    image:
      "https://assets.codexcryptica.com/og/what-do-i-need-to-bring-to-my-first-dnd-game.jpg",
    imageAlt:
      "A welcoming D&D table with a simple character sheet, pencil, dice, and notebook ready for a new player",
  },
};
