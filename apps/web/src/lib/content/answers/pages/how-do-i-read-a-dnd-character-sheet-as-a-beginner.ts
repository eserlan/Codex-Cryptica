import type { AnswerConfigInput } from "../schema";

export const howDoIReadADndCharacterSheetAsABeginner: AnswerConfigInput = {
  slug: "how-do-i-read-a-dnd-character-sheet-as-a-beginner",
  category: "getting-started",
  publishedAt: "2026-10-09",
  question: "How do I read a D&D character sheet as a beginner?",
  kind: "how-to",
  shortAnswer:
    "A D&D character sheet is a reference for play, not a document to memorise. At the table you will reach for four things constantly: your current and maximum hit points, your Armour Class, the labelled modifier you add to a d20 roll, and the block that lists your main attacks, spells, or actions. Learn where those live first, then let ability scores, skills, saving throws, and resources make sense around them.",
  sections: [
    {
      kind: "prose",
      heading: "Read the sheet in order of usefulness, not top to bottom",
      paragraphs: [
        "A character sheet packs a lot of numbers into a small space, which makes it look as if every field matters equally. It does not. During play you will describe an intention, the Dungeon Master will call for a roll if one is needed, you will use the relevant printed total and compare it with a target, and the DM will describe the result. The sheet exists to make that loop fast, so start with the handful of entries that support it directly and leave the rest until it becomes relevant.",
        "Sheets for the 2014 and 2024 rules may arrange information differently, and the rules versions have some differences. Ability scores sit near the top, skills and saving throws group under them, hit points and Armour Class sit prominently near combat details, and attacks, features, and resources each have their own block. If you can find hit points, Armour Class, your d20 modifiers, and your action options within a few seconds, you can follow play while the rest falls into place. Ask your DM which rules version the campaign uses.",
      ],
    },
    {
      kind: "list",
      heading: "The four things you will use constantly",
      intro:
        "Before you parse anything else, locate these and mark them so you can find them without hunting mid scene:",
      items: [
        {
          term: "Hit points",
          text: "Two numbers that sit together: current hit points and maximum hit points, often with a field for temporary hit points nearby. Temporary hit points absorb damage first and are tracked separately from current and maximum hit points. When you take damage beyond them, reduce current hit points; when you heal, increase current hit points up to your maximum. If the sheet shows hit dice, that is a rest resource for recovering hit points later, not something you spend every turn.",
        },
        {
          term: "Armour Class",
          text: "A single number, usually near the top centre of the combat block. When something attacks you, the attacker must meet or beat this number to hit. You rarely need its derivation at the table, only the total, so note it where you can see it at a glance.",
        },
        {
          term: "The modifier you add to a d20 roll",
          text: "For most checks, saves, and attack rolls, roll a d20 and add the relevant modifier. That might be an ability modifier, a skill modifier, a saving throw modifier, or an attack bonus. The label on the sheet tells you which situation it applies to, and the DM will often name the right one. Some rolls, such as death saves, do not use an ability modifier.",
        },
        {
          term: "Your main attacks, spells, and actions",
          text: "A short block that lists weapon attacks with attack bonus, damage dice, and damage type, or a spell block with name, range, and effect. Beginners need only the two or three options they are likely to use in the next session, not every entry on the page.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Ability scores and the modifier you actually add",
      intro:
        "This distinction confuses new players more than any other part of the sheet:",
      items: [
        {
          term: "Find the score and modifier by their labels",
          text: "An entry labelled Strength might show a score of 16 and a signed modifier of +3. The score describes the character's general capability and feeds many checks, attacks, and spells. Strength also determines carrying capacity. Under the 2014 rules, some classes use their spellcasting ability modifier to determine how many spells they can prepare; the 2024 rules list prepared spells by class level, so follow the spellcasting feature on your sheet. For a roll, use the modifier named by the DM or the rule.",
        },
        {
          term: "When each one matters",
          text: "If the DM says make a Strength check, add your Strength modifier. If a rule says your carrying capacity is Strength score multiplied by a value, use the big number. When in doubt, the modifier is the one you roll with.",
        },
        {
          term: "Saving throw modifiers may differ",
          text: "A saving throw entry includes the ability modifier and, if you are proficient in that save, your proficiency bonus. Starting characters are usually proficient in two saves from their class, but other features can grant more. Use the total printed on the saving throw line rather than recalculating it.",
        },
        {
          term: "2014 and 2024 are different rules versions",
          text: "Both versions pair each score with its modifier, though sheets may give either number more visual weight. Find them by their labels and signed values, such as Strength 16 and +3, not by their size on the page. Follow the rules version your DM says the campaign uses.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Skills, saving throws, attacks, and damage in plain language",
      intro:
        "These four blocks answer four different questions the DM may ask:",
      items: [
        {
          term: "Skills",
          text: "Each skill is an ability check with a label, such as Stealth or Perception, and a total modifier already calculated for you. When the DM asks for a skill, find that line, add its modifier to your d20 roll, and report the total. If no skill fits, the DM may ask for a plain ability check instead, which uses just the ability modifier.",
        },
        {
          term: "Saving throws",
          text: "A saving throw is the roll you make when something is happening to you, such as dodging a fireball or resisting a charm. Ability checks are for things you try to do, saving throws are for things you try to endure. Starting characters are usually proficient in two saves from their class, though other features can grant proficiency in more. Use the total printed on the saving throw line.",
        },
        {
          term: "Attacks: roll to hit, then roll damage",
          text: "For a damaging weapon or spell attack that calls for an attack roll, first roll a d20 and add the printed attack bonus. A total that meets or beats the target's Armour Class hits, except a natural 1 always misses and a natural 20 always hits. Then roll the listed damage and add any damage modifier shown. Some spells instead ask the target to make a saving throw or take effect without an attack roll; follow the spell description.",
        },
        {
          term: "Features and spells where your options live",
          text: "Class features, species traits, and background benefits each sit in their own paragraph or card. Spell lists group by level and show preparation and slot information nearby. For your first sessions, highlight the options your character actually has and is likely to use, then read the rest when it comes up.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Resources you spend and how to track them",
      intro:
        "Not every resource resets at the same time, so note when each one recovers:",
      items: [
        {
          term: "Spell slots",
          text: "A set of boxes or numbered rows by level. When you cast a spell that uses a slot, cross one box at that level as spent. Most classes regain their spell slots after a long rest. Warlocks regain all expended Pact Magic slots after a short or long rest, and some other features also recover on a short rest. Cantrips do not use slots, so they remain available even when slots are gone.",
        },
        {
          term: "Limited uses",
          text: "Features such as a fighter's Second Wind, a bard's Inspiration, or a species ability often show a number of uses per short or long rest. Cross off a use when you employ the feature. Restore only the number of uses the feature says you regain. If the sheet says proficiency bonus times per day, the total changes as you level up, so check it when your bonus increases.",
        },
        {
          term: "Hit dice and death saves",
          text: "Hit dice are a pool you can spend during a short rest to recover hit points. Death saving throws only matter at zero hit points, when you mark successes and failures until you recover, become stable, or fail. Neither needs attention while you have hit points remaining.",
        },
      ],
    },
    {
      kind: "example",
      heading: "Walkthrough: finding what matters on a 1st-level sheet",
      paragraphs: [
        "Imagine you have a 1st-level fighter, human, with a longsword and shield. The sheet looks crowded, but the next scene only asks for a few entries.",
      ],
      items: [
        {
          term: "The overloaded approach",
          text: "The player tries to read every field in order, from ability scores through alignment, ideals, bonds, equipment weight, and background feature, then still cannot answer when the DM says a goblin attacks you, what is your Armour Class, or roll an attack.",
        },
        {
          term: "The focused approach",
          text: "Assume a 1st-level human fighter with Strength 16 (+3), Constitution 14 (+2), Wisdom 10 (+0), proficiency bonus +2, and proficiency in Athletics and Perception. The player finds hit points (12 of 12), Armour Class (18 with chain mail and shield), Athletics +5, and Perception +2. The printed longsword attack bonus is +5: a d20 result of 12 plus 5 gives 17, which hits a target with AC 15, so the player rolls damage separately. That printed +5 already includes Strength and proficiency; do not add either again. The longsword deals 1d8+3 slashing damage. Second Wind has one use under the 2014 rules or two at 1st level under the 2024 rules; a 2024 fighter regains one expended use on a short rest and all expended uses on a long rest. Under the 2024 rules, this human also gains Heroic Inspiration after a long rest through Resourceful.",
        },
        {
          term: "Why it works",
          text: "The player reduced a full page to a few useful totals and features for the next fight or exploration scene. When the DM calls for a Wisdom saving throw, the player knows to use the printed saving throw total rather than recalculate from the ability score, and when the fight ends, the sheet still has the spell or rest rules to revisit later.",
        },
      ],
    },
    {
      kind: "list",
      heading: "What you can safely ignore until it matters",
      intro:
        "Leaving these alone for now reduces clutter without holding up play:",
      items: [
        {
          term: "Personality, ideals, bonds, and flaws",
          text: "Useful for roleplay, but not required to resolve a roll. Return to them when you want motivation for a choice, not while you are learning where to add a modifier.",
        },
        {
          term: "Equipment weight and coin totals",
          text: "Keep them honest between sessions, but they rarely decide a beginner's next action. The DM will tell you when encumbrance or cost becomes relevant.",
        },
        {
          term: "Every unprepared spell or unused feature",
          text: "Long spell lists and situational features can wait until you choose them or the situation calls for them. Focus on prepared spells and features you have already used once.",
        },
        {
          term: "Proficiency bonus derivation",
          text: "You need the bonus itself wherever it is already included, not the table that produced it. Check the derivation when you level up, not in the middle of a roll.",
        },
        {
          term: "Inspiration and inspiration-like trackers",
          text: "Track Inspiration or Heroic Inspiration if your rules give your character one. The DM may award it, and a 2024 human gains Heroic Inspiration after a long rest through the Resourceful trait.",
        },
      ],
    },
    {
      kind: "checklist",
      heading:
        "Before your next session, mark your sheet so it answers in seconds",
      intro:
        "A five-minute pass before play saves repeated hunting at the table:",
      items: [
        "Highlight current hit points, maximum hit points, and Armour Class so you can read them without searching.",
        "Circle or underline the two or three d20 modifiers you will add most often, such as your main attack bonus, your best skill, and your two trained saving throws.",
        "Star the one or two actions, spells, or features you plan to use first and note their range, target, and damage or effect in the margin.",
        "Leave boxes for available spell slots and limited uses empty; cross each one when spent. Record what you actually have left rather than assuming you start every session with all uses available.",
        "Pencil a small note beside any resource that says when it recovers: short rest, long rest, or daily.",
        "Ask the DM whether the campaign uses the 2014 or 2024 rules, and note the answer where you will see it next session.",
      ],
    },
  ],
  codexConnection: {
    heading: "Keep the character details you actually use close at hand",
    paragraphs: [
      "Once you know which numbers you reach for most, it helps to keep a short version beside the full sheet: hit points, Armour Class, the few modifiers you add regularly, and your current go-to actions. Codex Cryptica can hold that distilled reference alongside your character concept, party connections, and the campaign facts the DM has confirmed, so the sheet stays the authority while your notes stay quick to scan.",
      "After a few sessions, linking characters, locations, and unresolved questions makes the growing campaign easier to follow. That organisation is useful once you have played, not a prerequisite for learning the sheet.",
    ],
    linkText: "Explore Codex Cryptica for D&D",
    href: "/for/dungeons-and-dragons",
  },
  relatedForPages: [
    {
      title: "Codex Cryptica for D&D",
      description:
        "See how D&D campaigns can keep their characters, locations, factions, and session history connected.",
      href: "/for/dungeons-and-dragons",
    },
  ],
  relatedAnswers: [
    "what-should-a-new-dnd-player-learn-first",
    "where-do-i-start-if-i-have-never-played-a-tabletop-rpg",
    "how-do-i-run-a-successful-session-0",
  ],
  discovery: {
    id: "answer-read-dnd-character-sheet-beginner",
    parentCluster: "beginner-entry",
    primaryIntent: "how to read a dnd character sheet as a beginner",
    intentAliases: [
      "how to read a dnd 5e character sheet",
      "dnd character sheet explained for beginners",
      "new dnd player character sheet",
      "understanding ability scores vs modifiers 5e",
      "how skills and saving throws work on a dnd sheet",
    ],
    uniqueValue:
      "Teaches a new player to read a 5e sheet in order of table usefulness, from hit points and Armour Class to modifiers, skills, saves, attacks, and safe-to-ignore fields, with a 1st-level walkthrough and 2014 versus 2024 guidance.",
    relatedIntents: [
      "answer-new-dnd-player-learn-first",
      "answer-new-dnd-player-first-game",
      "answer-beginner-start",
      "answer-session-zero",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-new-dnd-player-learn-first",
        reason:
          "Both support new D&D players, but the companion page covers character and rules preparation before session one while this page focuses specifically on reading and using the character sheet.",
      },
      {
        with: "answer-new-dnd-player-first-game",
        reason:
          "The first-game guide offers a brief orientation to the sheet as part of taking part at the table; this page owns the deeper character-sheet walkthrough.",
      },
      {
        with: "answer-beginner-start",
        reason:
          "Both help beginners enter tabletop play, but the broader page explains how to start any tabletop RPG while this page is a D&D-specific guide to reading a character sheet during play.",
      },
    ],
  },
  seo: {
    title:
      "How do I read a D&D character sheet as a beginner? | Codex Cryptica",
    description:
      "Learn a D&D character sheet in order of usefulness: hit points, Armour Class, modifiers, skills, saves, attacks, and what you can ignore until it matters.",
    image:
      "https://assets.codexcryptica.com/og/how-do-i-read-a-dnd-character-sheet-as-a-beginner.jpg",
    imageAlt:
      "Beginner D&D character sheet with hit points and Armour Class highlighted on a tabletop",
  },
};
