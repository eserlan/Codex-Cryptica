import type { AnswerConfigInput } from "../schema";

export const whichDiceDoIRollInDndAndWhen: AnswerConfigInput = {
  slug: "which-dice-do-i-roll-in-dnd-and-when",
  category: "getting-started",
  publishedAt: "2026-10-08",
  question: "Which dice do I roll in D&D, and when?",
  kind: "framework",
  shortAnswer:
    "If you are trying something uncertain in D&D, you very often start with a twenty-sided die (d20) and add a modifier the Dungeon Master or your character sheet names. The other dice in the set (d4, d6, d8, d10, d12 and percentile dice) are commonly used afterwards to determine damage, healing or other amounts, and your weapon, spell or feature tells you which one to roll so you do not need to memorise every die from memory.",
  sections: [
    {
      kind: "prose",
      heading: "The simplest useful rule",
      paragraphs: [
        "D&D uses several dice, but you do not need to choose one from memory each time you act. When the outcome is uncertain, the table very often starts with a d20. The roll determines whether you succeed, hit, or resist something. What happens because of that result, such as how much damage is dealt or how many hit points are restored, is usually determined by a different die afterwards.",
        "Your character sheet, a spell description, a class feature, or the Dungeon Master will normally tell you which die to roll. A weapon entry says 1d8, a spell says 2d6, a class feature says roll a d10. Your job is to recognise the instruction and roll what it names, not to recall every possible die combination before play begins.",
      ],
    },
    {
      kind: "list",
      heading: "The d20: checks, attacks and saves",
      intro:
        "The same physical die is used for the three common beginner-facing rolls. The difference is which modifier applies and why you are rolling:",
      items: [
        {
          term: "Ability checks",
          text: "You try to do something where success is uncertain, such as persuading a guard, spotting a hidden door, or recalling lore. The DM names the relevant ability or skill, you roll a d20, add that modifier, and compare the total with a target number the DM has set. The roll represents your attempt, not the final consequence.",
        },
        {
          term: "Attack rolls",
          text: "You try to hit a creature with a weapon or a spell that requires an attack. Roll a d20, add the modifier shown on your character sheet for that attack (often Strength or Dexterity for weapons, or your spellcasting ability for spells), then add any bonus the DM mentions. If the total meets or beats the target's Armour Class, the attack hits and you then roll damage separately.",
        },
        {
          term: "Saving throws",
          text: "Something happens to you and you try to resist it, such as dodging a fireball, withstanding poison, or holding firm against a spell. The DM tells you which ability is being tested and what number to meet or beat. Roll a d20, add the saving throw modifier for that ability, and compare. The roll does not determine what you do, it determines how you hold up against what is already happening.",
        },
      ],
    },
    {
      kind: "list",
      heading: "The other dice: damage, healing and amounts",
      intro:
        "Once the d20 has decided whether something succeeds, another die is often used to decide how much. The rule that grants the effect states the die, so you read it rather than invent it:",
      items: [
        {
          term: "d4, d6, d8, d10, d12",
          text: "These are the dice most often linked to an amount. A dagger might deal 1d4 damage, a longsword 1d8, a greataxe 1d12, a fire bolt 1d10, and a common healing potion restores 2d4 + 2 hit points. Larger dice are not inherently better or worse, they simply reflect the design of that weapon, spell or feature. Your sheet tells you which one applies.",
        },
        {
          term: "d10 as percentile and d100",
          text: "Two ten-sided dice can be rolled as percentile dice to generate a number from 1 to 100, often written as d100. New players meet this less often, usually on a table that says roll d100 for a random effect. When the rules call for it, the table will say so explicitly, typically by naming one die as the tens and the other as the ones.",
        },
        {
          term: "Read the source, not your memory",
          text: "If you cast cure wounds, the spell says how many dice to roll for healing. If you swing a weapon, the weapon entry says which die to use. If a feature grants extra damage, it names the die. When you level up or pick a new spell, check what that new option says to roll and note it where you will see it next session.",
        },
      ],
    },
    {
      kind: "list",
      heading: "How to read dice notation",
      intro:
        "D&D writes dice as a short code. Once you recognise the pattern, every entry on your sheet makes sense:",
      items: [
        {
          term: "1d20",
          text: "Roll one twenty-sided die. This is the form you will see for most checks, attacks and saves. Roll the die, add the modifier the DM or sheet names, and compare with the target number.",
        },
        {
          term: "2d6",
          text: "Roll two six-sided dice and add them together. You will see this for damage and healing, for example a spell that deals 2d6 fire damage. Roll both dice, add them, then apply any modifier shown.",
        },
        {
          term: "1d8 + 3",
          text: "Roll one eight-sided die and add 3. The number after the plus sign is a fixed modifier, often from your ability or a feature. Roll the die, add the number, and that total is the result. The same pattern works with other dice, such as 1d10 + 5 or 2d4 + 2.",
        },
        {
          term: "Modifiers and target numbers",
          text: "A plus sign after the dice always means add that number after rolling. The d20 rolls also add a modifier before you compare with a target number such as Armour Class or a Difficulty Class (often shortened to AC or DC at the table). Your sheet lists your common modifiers so you can find them quickly when the DM names the roll.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Advantage and disadvantage: rolling two d20s",
      paragraphs: [
        "Advantage and disadvantage are a simple way for the rules to reflect a better or worse chance without changing your modifier. When you have advantage on a d20 roll, roll two d20s and keep the higher result. When you have disadvantage, roll two d20s and keep the lower result. Add your normal modifier afterwards, just as you would for a single d20 roll.",
        "The DM or a rule will tell you when advantage or disadvantage applies, for example when you attack a target you cannot see, or when an ally helps you in a way the rules recognise. You do not need to memorise every interaction. If both advantage and disadvantage apply to the same roll, they normally cancel out and you roll a single d20. For detailed interactions and edge cases, check the official rules or a current System Reference Document rather than trying to learn every exception at the table.",
      ],
    },
    {
      kind: "example",
      heading: "At the table: from guessing the die to following the sheet",
      paragraphs: [
        "A new player joins a first combat. They know their fighter uses a longsword and has the guidance of the DM, but they have not yet learned which die belongs to which moment.",
      ],
      items: [
        {
          term: "Guessing from memory",
          text: "The player tries to recall which die is used for every situation, worries about picking the wrong one, and pauses to ask whether a longsword uses a d6 or a d12 while the rest of the table waits for the attack to resolve.",
        },
        {
          term: "Following the sheet and the DM",
          text: "The DM says make an attack roll. The player finds longsword on the sheet, sees it lists +5 to hit and 1d8 + 3 slashing, rolls a d20, adds 5, and learns the total hits. The DM then says roll damage. The player rolls a d8, adds 3, and the DM describes the result. Later, when a spell forces a saving throw, the DM names the ability and the player rolls a d20 with the saving throw modifier shown on the sheet. Advantage on the next attack simply means rolling two d20s and keeping the higher result.",
        },
        {
          term: "Why it works",
          text: "Each roll had a clear prompt: the DM named the d20 roll, the sheet named the damage die, and the notation 1d8 + 3 made the arithmetic explicit. The player did not need to memorise the whole dice set, only to recognise which instruction to follow at each step. The d20 decided whether the action succeeded, the d8 decided how much it achieved, and advantage was handled as a second d20 rather than a new rule to learn.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Before you roll, check this",
      intro: "A quick routine that keeps dice handling calm during play:",
      items: [
        "Know where your common d20 modifiers are written: ability checks, attack bonuses, and saving throws.",
        "For your usual weapon, spell, or feature, note the exact dice code (such as 1d8 + 3 or 2d6) where you will see it when the DM calls for damage or healing.",
        "When the DM asks for a roll, confirm which ability or skill to add rather than assuming.",
        "On advantage or disadvantage, roll two d20s and keep the higher or lower result, then add your normal modifier.",
        "If you are unsure which die to use, ask the DM or check the spell or weapon entry instead of guessing.",
        "After the session, update your notes with any new dice a new spell or feature introduced so it is ready next time.",
      ],
    },
  ],
  codexConnection: {
    heading: "Keep the dice your character actually uses within reach",
    paragraphs: [
      "Once you know which d20 rolls and which damage dice belong to your character, it helps to keep them visible where you already track the rest of the party's information. Codex Cryptica lets you keep character notes, linked locations and open questions together so a new spell or weapon entry and its dice are easy to find next session without searching several pages.",
      "That organisation is useful after you have played, not a prerequisite for learning which die to roll. Learn the d20 habit first, note the few dice codes your character uses most often, and add more detail only when a new rule actually appears at the table.",
    ],
    linkText: "Explore Codex Cryptica for D&D",
    href: "/for/dungeons-and-dragons",
  },
  relatedTools: [
    {
      title: "D&D NPC generator",
      description:
        "Create a quick supporting character when your first sessions need a shopkeeper, guard, or guide to interact with.",
      href: "/generators/dnd-npc",
    },
    {
      title: "Fantasy names generator",
      description:
        "Find a character or place name while you practise reading the dice codes on your own sheet.",
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
    "how-do-i-improvise-npcs-in-dnd",
    "where-do-i-start-if-i-have-never-played-a-tabletop-rpg",
    "how-do-i-run-a-successful-session-0",
  ],
  discovery: {
    id: "answer-which-dice-to-roll-in-dnd",
    parentCluster: "beginner-entry",
    primaryIntent: "which dice to roll in dnd and when",
    intentAliases: [
      "which dice do i roll in dnd",
      "what dice do you roll in dnd",
      "dnd dice explained for beginners",
      "d20 checks attacks and saves explained",
      "dnd dice notation explained",
      "how does advantage and disadvantage work in dnd",
    ],
    uniqueValue:
      "Teaches the single d20 habit for checks, attacks and saves, shows how weapon and spell entries name the damage die, decodes notation such as 1d8 + 3, and gives a plain-English advantage and disadvantage rule that reassures beginners the sheet or DM names the die.",
    relatedIntents: [
      "answer-new-dnd-player-learn-first",
      "answer-beginner-start",
      "answer-session-zero",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-new-dnd-player-learn-first",
        reason:
          "The cornerstone orients a new player across the whole first session, while this page focuses only on dice literacy: which die to roll, how to read notation, and how advantage works.",
      },
      {
        with: "answer-beginner-start",
        reason:
          "The general beginner start page covers starting any tabletop RPG, while this page is D&D-specific and teaches the d20 habit, damage dice, notation, and advantage in D&D terms.",
      },
      {
        with: "answer-read-dnd-character-sheet-beginner",
        reason:
          "The character-sheet guide explains where to find values across the whole sheet, while this page focuses on choosing dice and resolving common rolls at the table.",
      },
    ],
  },
  seo: {
    title: "Which dice do I roll in D&D, and when? | Codex Cryptica",
    description:
      "Beginner guide to D&D dice: when to roll a d20 for checks, attacks and saves, how damage dice, notation and advantage work, and why your sheet tells you which die to use.",
    image:
      "https://assets.codexcryptica.com/og/which-dice-do-i-roll-in-dnd-and-when.jpg",
    imageAlt:
      "Beginner D&D player rolling dice at a table with character sheet and polyhedral dice set",
  },
};
