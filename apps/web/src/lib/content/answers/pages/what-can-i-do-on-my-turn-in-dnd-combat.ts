import type { AnswerConfigInput } from "../schema";

export const whatCanIDoOnMyTurnInDndCombat: AnswerConfigInput = {
  slug: "what-can-i-do-on-my-turn-in-dnd-combat",
  category: "getting-started",
  publishedAt: "2026-10-09",
  question: "What can I do on my turn in D&D combat?",
  kind: "framework",
  shortAnswer:
    "On your turn in D&D combat you can usually move up to your speed and take one action, and you sometimes have a bonus action if a class feature, spell, or piece of equipment gives you one. You can also interact briefly with something nearby and speak a few words, while reactions happen outside your turn when a specific rule allows them. Your class and features decide the interesting options inside those buckets, so describe what you want to accomplish and let the Dungeon Master tell you which action fits.",
  sections: [
    {
      kind: "prose",
      heading: "Think of your turn as a short menu",
      paragraphs: [
        "Combat in D&D pauses the free-form conversation and puts everyone in turn order. At the start of a fight each participant rolls initiative, usually a d20 plus Dexterity modifier, and the Dungeon Master arranges the results from highest to lowest. That order then repeats round after round until the fight ends, and the DM will tell you when initiative begins and when it is over.",
        "On your turn you pick from a small, repeatable menu rather than recalling a long list of rules from memory. In the current rules that menu is usually movement, one action, a bonus action only if something gives you one, a brief free interaction with an object or the environment, and a few words of communication. A reaction is separate because it happens on someone else's turn when a rule says you can respond.",
        "That framing helps you decide quickly at the table. You do not need a perfect grasp of every option. You need to know that you can reposition, do one meaningful thing, and sometimes add a small extra if your character has a relevant feature. Everything else is a choice inside those buckets.",
      ],
    },
    {
      kind: "list",
      heading: "The buckets on a combat turn",
      intro:
        "The Player's Handbook describes a turn with the same few components. Learn what each one offers before you worry about the individual action names:",
      items: [
        {
          term: "Movement",
          text: "You can move up to your speed on your turn, and you can split that movement before, after, or around your action where the rules allow. If you move 20 feet, attack, and have 10 feet of speed left, you can keep moving. Difficult terrain, being prone, or other conditions can change how far that movement takes you.",
        },
        {
          term: "Action",
          text: "Your action is the main thing you do. For most characters it is often an attack, casting a spell, or one of the general actions described below. You get one action per turn unless a feature says otherwise.",
        },
        {
          term: "Bonus action",
          text: "You only have a bonus action if a feature, spell, or item grants one. A rogue's Cunning Action, a cleric's Spiritual Weapon, or drinking a potion in some tables' house rules are common examples. If nothing on your sheet says you can do something as a bonus action, you simply do not have one that turn.",
        },
        {
          term: "Free object interaction",
          text: "You can usually interact once with something simple as part of your movement or action, such as opening an unlocked door, drawing a weapon, picking up an item, or handing something to an ally. The DM decides what is reasonable without spending your action.",
        },
        {
          term: "Brief communication",
          text: "You can speak a short sentence, call a warning, or answer a question. Longer speeches or trying to deceive or persuade someone in detail normally requires an action, and the DM will tell you when a roll is needed.",
        },
        {
          term: "Reaction",
          text: "A reaction happens outside your turn when a rule allows it, and you normally get one per round. Making an opportunity attack when a foe leaves your reach, casting Shield or Counterspell, or using a feature such as Uncanny Dodge are all reactions. Because they trigger on someone else's turn, they are easy to forget until you check your sheet for options that say 'as a reaction'.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Movement and action are flexible",
      paragraphs: [
        "Beginners often imagine a turn as a rigid sequence: move, then act, then stop. In practice the rules let you break movement around your action and combine them in the way that fits your intent. You can move, act, and move again; you can act first and then move; or you can stay still if holding your position matters. The DM and the battlefield layout decide whether a particular combination is possible right now.",
        "Intra-turn flexibility is also why describing intent matters. If you say 'I want to run to the altar, grab the sigil, and duck behind the pillar', the DM can tell you whether that fits within your speed, whether grabbing the sigil needs your action or just your free interaction, and whether the pillar gives you cover. You do not need to pre-select the correct action name before you speak.",
      ],
    },
    {
      kind: "list",
      heading: "You do not have to attack every turn",
      intro:
        "Attacking is common, but many of the most useful turns change the situation another way. Consider the purpose behind the action before you choose it:",
      items: [
        {
          term: "Create space or close it",
          text: "Dash lets you move further when reaching a wounded ally or an objective matters more than dealing damage this round. Disengage lets you leave a threatening position without provoking opportunity attacks, which is often better than staying to attack while surrounded.",
        },
        {
          term: "Make the next roll more reliable",
          text: "Dodge makes you harder to hit when you need to hold a doorway or survive until help arrives. Help lets you give an ally advantage on their next task, such as an attack against a tough foe or an ability check to disarm a trap.",
        },
        {
          term: "Control what the enemies can see or reach",
          text: "Hide lets you use available cover to become unseen when the rules and the environment support it. Ready lets you prepare a response for a trigger you name, such as 'I will shoot the runner if he moves towards the door'.",
        },
        {
          term: "Learn or change the environment",
          text: "Search lets you look more carefully when the initial description was not enough. In the current rules, dealing with an object often uses the Utilize action, such as pulling a lever, opening a stuck chest, or using tools. Ask the DM what handling a particular object will require.",
        },
        {
          term: "Cast, support, or steady the group",
          text: "Casting a spell, using a class feature, drinking a potion, or steadying a fallen ally can be the right action even when an attack would be possible. Your character sheet shows which of these your character can actually do, so glance at that short list rather than the full rulebook.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "A note on 2014 and 2024 terminology",
      paragraphs: [
        "D&D's fifth edition has two widely used presentations: the 2014 Player's Handbook and the revised 2024 rules. The turn structure described here, movement plus action plus a conditional bonus action, is the same in both.",
        "Where the wording differs, the main text of this answer follows the current 2024 presentation. Two points are worth noting if your table still uses the 2014 books. First, what the current rules call Utilize is named Use an Object in the 2014 book, but the idea is similar: spending your action to operate an item or piece of gear. Second, a few actions have updated detail in the 2024 rules, notably Hide, Search, and the handling of Influence and Study, which split social and recall tasks more clearly than the single Search or generic ability check the 2014 text leans on. In either version you can play the same way at the table: state what you want to accomplish, and the DM will tell you which action and roll now apply.",
      ],
    },
    {
      kind: "prose",
      heading: "If you do not know the action name, describe the intent",
      paragraphs: [
        "New players often stall because they are searching for the right term to say aloud. The table does not need the term from you. It needs a clear picture of what your character tries to do and how.",
        "A useful shape is goal plus approach: what you want to happen and how your character attempts it. 'I want the guard to look away so the rogue can slip past, so I knock over the brazier and shout that the stables are on fire' is enough. The DM can then decide whether that is a Help, a distraction that calls for a check, or an improvised action, and will ask for the relevant roll if one applies. You do not need to memorise the eight common actions as a quiz before you can participate.",
        "This habit also keeps the game moving while you learn. You will pick up the names naturally as the DM frames your intentions back to you: 'Use your action to Help, so your ally has advantage.' After a few repetitions, the shared vocabulary builds without anyone needing to study it in advance.",
      ],
    },
    {
      kind: "example",
      heading: "Worked example: the same round, two levels of preparation",
      paragraphs: [
        "A fighter stands 25 feet from an ally who has fallen near a goblin. The fighter knows the goblin is blocking the path and the ally may need assistance. The table uses the current rules with theatre of the mind and a rough sense of distance.",
      ],
      items: [
        {
          term: "The hesitant version",
          text: "The player is unsure what actions exist, worries about picking the wrong one, and spends the turn re-reading the sheet. They move adjacent to the goblin, make one attack, and end their turn without helping the ally because they did not realise Help, Shove, or using an item were available choices.",
        },
        {
          term: "The menu-driven version",
          text: "The player thinks in buckets: movement, action, conditional bonus action, and free interaction. They say, 'I move close enough to the ally, use my action to Help the cleric who is next by distracting the goblin, and tell the cleric to get the ally upright.' The DM confirms the movement is within speed, the Help could give the cleric advantage on the next attack or check against the goblin, and the spoken warning costs no action. The fighter has contributed without needing to attack this turn.",
        },
        {
          term: "Why it works",
          text: "The second approach treats the turn as a small set of slots and lets the player's stated goal choose the action, rather than waiting for the rules term to come to mind. The DM translates intent into mechanics, the next player has a clearer job, and the downed ally becomes part of a shared problem rather than a detail the table forgot between turns. The player used language the table already had, not a rule citation they had to memorise.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "What to do when your turn starts",
      intro: "Run through this short loop when the DM calls your name:",
      items: [
        "Check where you are and what has changed since your last turn.",
        "Decide whether you need to reposition and roughly how far you can move.",
        "Pick one meaningful action, remembering that helping, dodging, or searching can be stronger than attacking right now.",
        "Use a bonus action only if your sheet gives you one for this situation.",
        "Keep any object handling or speech brief, and ask the DM if it needs your action.",
        "Name your movement and action aloud so the table and the DM can confirm the choice.",
        "Note any reaction you might have before your next turn, so you remember it when the trigger occurs.",
        "If you are unsure, describe what you want to accomplish and let the DM name the action and roll.",
      ],
    },
  ],
  codexConnection: {
    heading: "Track the moments that made combat matter",
    paragraphs: [
      "You do not need software to take your turn. When the group wants to remember how a fight changed the campaign, Codex Cryptica gives those details a place to live: who was present, what objective the fight served, which threats or locations became important, and what the party promised or lost as a result.",
      "Linking a combat's outcome to the characters, factions, and places involved makes the next session easier to start, because the table can see why the fight happened and what it left unresolved.",
    ],
    linkText: "Explore tools for D&D",
    href: "/for/dungeons-and-dragons",
  },
  relatedTools: [
    {
      title: "Encounter generator",
      description:
        "Sketch a combat objective and opposition you can shape for your party before the session.",
      href: "/generators/encounter",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for D&D",
      description:
        "Keep characters, locations, factions, and session history connected across a D&D campaign.",
      href: "/for/dungeons-and-dragons",
    },
  ],
  relatedAnswers: [
    "what-should-a-new-dnd-player-learn-first",
    "where-do-i-start-if-i-have-never-played-a-tabletop-rpg",
    "how-do-i-keep-players-engaged-during-other-players-turns-in-combat",
    "how-do-i-make-combat-faster-without-making-it-less-exciting",
  ],
  discovery: {
    id: "answer-what-can-i-do-on-my-turn-in-dnd-combat",
    parentCluster: "beginner-entry",
    primaryIntent: "what can i do on my turn in dnd combat",
    intentAliases: [
      "what can you do on your turn in dnd",
      "dnd combat actions explained for beginners",
      "dnd 5e turn structure movement action bonus action reaction",
      "how does a turn work in dnd combat",
      "dnd bonus action and reaction explained",
      "what actions can i take in dnd combat",
    ],
    uniqueValue:
      "Reframes the combat turn as a small menu of movement, action, occasional bonus action, interaction, and reaction, with purpose-led actions and a describe-your-intent habit that keeps 2014 and 2024 terminology compatible.",
    relatedIntents: [
      "answer-new-dnd-player-learn-first",
      "answer-read-dnd-character-sheet-beginner",
      "answer-which-dice-to-roll-in-dnd",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-player-engagement-combat-turns",
        reason:
          "The engagement answer helps the table follow combat between turns; this answer helps the individual player decide what to do on their own turn.",
      },
      {
        with: "answer-faster-exciting-combat",
        reason:
          "The faster-combat answer addresses table pacing and GM bookkeeping; this answer stays at the beginner's decision on a single turn and the small menu of legal choices.",
      },
    ],
  },
  seo: {
    title: "What can I do on my turn in D&D combat? | Codex Cryptica",
    description:
      "A beginner guide to a D&D combat turn: movement, action, bonus action, free interaction, brief speech, and reactions, with purpose-led actions and flexible movement.",
    image:
      "https://assets.codexcryptica.com/og/what-can-i-do-on-my-turn-in-dnd-combat.jpg",
    imageAlt:
      "New D&D players around a table as a fighter decides between movement and action on a battle map",
  },
};
