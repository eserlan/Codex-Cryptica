import type { AnswerConfigInput } from "../schema";

export const whatMakesAGoodRandomEncounter: AnswerConfigInput = {
  slug: "what-makes-a-good-random-encounter",
  category: "session-prep",
  publishedAt: "2026-08-30",
  question: "What makes a good random encounter?",
  kind: "framework",
  shortAnswer:
    'A good random encounter presents a situation the party can respond to in more than one way, and it tells them something about where they are. A wandering monster with no context and no options is a dice-rolling interruption; the same creature, given a reason for being there and something it currently wants, becomes a scene. The test is whether "fight it" is one option among several rather than the only one.',
  sections: [
    {
      kind: "prose",
      heading: "Encounters are information as much as obstruction",
      paragraphs: [
        "The oldest justification for random encounters is attrition — they make travel and delay cost something. That still works, but it is the weaker half. The stronger half is that an encounter table is a description of a region. Three entries about starving wolves, refugees on the road, and a burnt-out waystation say more about the state of the frontier than a page of gazetteer prose, and they say it while the party is doing something.",
        "This is also what makes a table reusable. A table written as a list of creatures is exhausted once you have rolled through it; a table written as a list of situations keeps giving, because the party's response is different each time.",
      ],
    },
    {
      kind: "list",
      heading: "Four things a strong entry has",
      intro: "Any entry missing the second one is a monster, not an encounter.",
      items: [
        {
          term: "A subject",
          text: "Who or what. This is the part most tables stop at.",
        },
        {
          term: "An activity in progress",
          text: "What it is already doing when the party arrives. Something interrupted is a scene; something waiting is a stat block.",
        },
        {
          term: "A reason to be here",
          text: "One clause connecting it to the region. This is what turns the table into worldbuilding.",
        },
        {
          term: "At least one non-combat handle",
          text: "Something to trade, follow, avoid, warn, or exploit. It does not have to be the likely choice — it has to exist.",
        },
      ],
    },
    {
      kind: "example",
      heading: "The same creature, twice",
      paragraphs: [
        "The difference is not the monster. It is everything around it.",
      ],
      items: [
        {
          term: "Weak",
          text: "2d4 giant ravens attack.",
        },
        {
          term: "Strong",
          text: "Eight giant ravens are tearing apart a mail satchel scattered across the road. The courier's body is fifty yards on, already stripped. The birds are territorial about the satchel specifically, and one has a lacquered seal-case in its beak — the letter inside is addressed to a name the party knows.",
        },
        {
          term: "Why it works",
          text: "The party can fight, drive the birds off, buy them off with rations, take the case and run, or leave and report it. Each choice costs something different, and all five tell them the roads are no longer patrolled.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "When to roll, and when not to",
      paragraphs: [
        "Rolling is worthwhile when the outcome could genuinely change the party's plan — during travel they chose, in a dungeon where noise carries, on a watch they set. It is not worthwhile as a rhythm section. An encounter check that fires while the party is walking to a shop they have already decided to visit adds time and removes nothing.",
        "The related discipline is being willing to skip a result. A rolled entry that does not fit where the party actually is has no authority over the fiction; either place it somewhere it makes sense, or roll again. Random tables are a prompt, not an oracle, and treating their output as binding is how sessions end up with an ice troll in a summer marsh.",
        "There is no universal correct frequency here. Attrition-focused play wants regular checks and meaningful resource loss; a table that plays for scenes and intrigue wants far fewer, weighted heavily towards encounters with people. Decide which of those your campaign is, and build the table for it rather than importing someone else's assumptions.",
      ],
    },
    {
      kind: "list",
      heading: "Table-building habits that pay off",
      items: [
        {
          term: "Weight towards the mundane",
          text: "Most entries should be traces, travellers and weather. The rare entry lands harder when the common ones are quiet.",
        },
        {
          term: "Include entries with no creature at all",
          text: "A cairn recently disturbed. Smoke on the next ridge. These are the cheapest way to make a region feel inhabited.",
        },
        {
          term: "Let entries reference each other",
          text: "The refugees on entry 4 are fleeing the thing on entry 9. Rolling both across a journey builds a story neither entry contains.",
        },
        {
          term: "Age the table",
          text: "After a major event, change three entries. A table that never changes tells the players the world does not either.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Before you put an entry on the table",
      items: [
        "It is doing something when the party arrives.",
        "There is a reason it is here rather than anywhere else.",
        "The party has at least one option that is not combat.",
        "It reveals something about the region.",
        "You would be happy to roll it twice in one campaign.",
      ],
    },
  ],
  codexConnection: {
    heading: "Encounters that connect to the rest of the world",
    paragraphs: [
      "The reason a rolled encounter feels arbitrary is usually that it has no relationship to anything else in the campaign. Keeping encounters as entities alongside your factions and locations makes the connection explicit: these ravens belong to that region, this courier worked for that faction, the letter names an NPC who already exists.",
      "Codex's free encounter generator is a starting point when a table needs filling; the useful part is what you attach it to afterwards.",
    ],
    linkText: "Try the encounter generator",
    href: "/generators/encounter",
  },
  relatedTools: [
    {
      title: "Encounter generator",
      description:
        "Free, no login. Situations with an activity already in progress, not bare stat blocks.",
      href: "/generators/encounter",
    },
    {
      title: "Creature generator",
      description:
        "Original creatures with behaviour and habitat, for any genre.",
      href: "/generators/creature",
    },
    {
      title: "Adventure idea generator",
      description:
        "For when an encounter turns out to be the start of something longer.",
      href: "/generators/adventure-idea-generator",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for D&D",
      description:
        "Keeping regions, tables and the factions behind them connected in one place.",
      href: "/for/dungeons-and-dragons",
    },
  ],
  relatedAnswers: [
    "what-is-a-point-crawl",
    "how-do-you-design-rpg-puzzles-that-do-not-stall-the-game",
    "what-should-an-rpg-settlement-contain",
    "how-do-i-balance-rpg-combat-encounters-without-a-tpk",
    "how-do-you-make-npcs-memorable-without-lots-of-prep",
    "how-do-you-make-travel-interesting-in-a-tabletop-rpg",
    "how-much-prep-do-you-need-for-an-rpg-session",
    "how-do-you-run-a-heist-in-a-tabletop-rpg",
    "how-do-you-write-a-one-shot-adventure",
  ],
  discovery: {
    id: "answer-random-encounter",
    parentCluster: "encounter-design",
    primaryIntent: "what makes a good random encounter",
    intentAliases: [
      "how to write random encounter tables",
      "random encounter design",
    ],
    uniqueValue:
      "Four criteria for an encounter entry, a before-and-after rewrite of the same monster, and guidance on when not to roll at all.",
    relatedIntents: ["generator-encounter"],
  },

  seo: {
    title: "What makes a good random encounter? | Codex Cryptica",
    description:
      "A good encounter is a situation in progress with a reason to be there and a way out that is not combat. Four criteria, a before-and-after example, and when not to roll.",
  },
};
