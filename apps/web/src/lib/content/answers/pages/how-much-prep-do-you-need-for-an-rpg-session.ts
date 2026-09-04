import type { AnswerConfigInput } from "../schema";

export const howMuchPrepDoYouNeedForAnRpgSession: AnswerConfigInput = {
  slug: "how-much-prep-do-you-need-for-an-rpg-session",
  category: "session-prep",
  question: "How much prep do you need for an RPG session?",
  kind: "framework",
  shortAnswer:
    "There is no time or page-count that applies to every GM, system or campaign, and chasing one is the wrong question. Prep only pays off when it creates choices at the table, so the useful measure is coverage, not hours: do you know the immediate situation, the people in it and what they want, a couple of places the party might go, a complication or two, and what happens if the players do nothing? If yes, you are ready, whether that took twenty minutes or two hours.",
  sections: [
    {
      kind: "prose",
      heading: "Prep time is the wrong unit",
      paragraphs: [
        "Ask ten GMs how long they prep and you will get ten different, equally defensible answers, because the honest answer depends on the system, the campaign's complexity, how well the GM already knows the setting, and how much the players tend to go off-script. A number borrowed from someone else's table tells you nothing about your own.",
        "What actually predicts a good session is not time spent but what that time produced: material that is likely to matter once the dice start rolling. An hour spent writing prose nobody will read produces less than ten minutes spent naming three NPCs' wants. Measure the output, not the clock.",
      ],
    },
    {
      kind: "list",
      heading: "A compact coverage checklist",
      intro:
        "Work through these before a session. Most take a sentence or two; none require a script.",
      items: [
        {
          term: "The immediate situation",
          text: "Where the party is, what's already in motion, and what changes if they do nothing for an hour.",
        },
        {
          term: "The important people and factions",
          text: "Who's in this scene, what each one wants right now, and what they'll do if the party surprises them. Wants, not biographies.",
        },
        {
          term: "A couple of likely locations",
          text: "Not every place the party could conceivably go — the two or three they're actually likely to head towards next.",
        },
        {
          term: "One or two complications",
          text: "An obstacle, a ticking clock, or a wrinkle that stops the straightforward plan from being free.",
        },
        {
          term: "Clues or leads",
          text: "Something that points somewhere, so a stuck table has a thread to pull rather than a blank page.",
        },
        {
          term: "What happens if they do nothing",
          text: "The world doesn't pause for the party. Knowing this stops you from stalling when they duck the hook.",
        },
        {
          term: "Blank space",
          text: "Deliberately unprepared room for whatever the players actually decide — the thing no amount of prep can substitute for.",
        },
      ],
      outro:
        "That's the whole list. A session with all seven covered in a page of bullet points is better prepared than one with forty pages of backstory and none of them.",
    },
    {
      kind: "list",
      heading: "Three kinds of prep, and only one is tonight's job",
      intro:
        "Conflating these is where most over-prep and most guilt about under-prep both come from.",
      items: [
        {
          term: "Essential prep",
          text: "The checklist above, specific to tonight. This is the only prep a session actually requires, and it's usually the smallest pile.",
        },
        {
          term: "Reusable campaign prep",
          text: "Factions, locations, NPCs and the relationships between them — material that outlives one session and pays for itself repeatedly. Worth investing in, but it's background infrastructure, not tonight's checklist.",
        },
        {
          term: "Optional worldbuilding",
          text: "Maps, timelines, invented languages, the political history of a country nobody's visited yet. A legitimate hobby in its own right — genuinely enjoyable, often the reason people GM at all — but it is not session prep, and treating it as a prerequisite for running a session is how prep turns into procrastination.",
        },
      ],
      outro:
        "It's fine, even good, to spend an evening on the third category. The trap is believing a session can't run until that pile feels finished. It never will, and it doesn't need to.",
    },
    {
      kind: "example",
      heading: "A compact session-prep packet",
      paragraphs: [
        "For a party investigating a missing caravan, written in the time it takes to read this paragraph twice.",
      ],
      items: [
        {
          term: "Situation",
          text: "Caravan didn't arrive. Its guard captain, Bern Ostley, is at the inn asking around — he'll approach the party if they don't approach him.",
        },
        {
          term: "People",
          text: "Bern wants the caravan found and doesn't much care how. The road-warden, Yeva Sull, wants it quiet — bandits on her watch look bad to her superiors.",
        },
        {
          term: "Likely locations",
          text: "The last known campsite (tracks, signs of a struggle). The road-warden's post, if the party asks around instead.",
        },
        {
          term: "Complication",
          text: "The caravan wasn't taken by bandits — it was taken by Yeva's own people, and she'll steer the party away from the truth if she can.",
        },
        {
          term: "Leads",
          text: "A dropped badge at the campsite. A guard who drinks too much and talks too much, if anyone buys him a round.",
        },
        {
          term: "If they do nothing",
          text: "Bern hires someone else in two days; that someone else finds the badge first.",
        },
      ],
    },
  ],
  codexConnection: {
    heading: "How Codex Cryptica handles this",
    paragraphs: [
      "The distinction above maps directly onto how a vault is organised: reusable campaign prep — factions, locations, NPCs and the relationships between them — lives as connected entities you write once and reuse, rather than being retyped into a fresh prep document every week. Tonight's essential-prep checklist is then a quick pass over material that already exists, not a from-scratch write-up.",
      "Where a generator saves real time — an encounter, a quest hook, a settlement's shape — Codex has one, and the Oracle can draft from what's already in your vault when that's faster than writing it by hand. None of that replaces the judgement call at the table: what a scene needs is still something only the GM running it can decide.",
    ],
    linkText: "See the campaign manager",
    href: "/solutions/campaign-manager",
  },
  relatedTools: [
    {
      title: "RPG encounter generator",
      description:
        "A fast source of the one or two complications a session actually needs, without scripting a full combat.",
      href: "/generators/encounter",
    },
    {
      title: "Quest generator",
      description:
        "Leads and hooks that point somewhere, when you need one and don't want to invent it cold.",
      href: "/generators/quest",
    },
    {
      title: "RPG knowledge graph",
      description:
        "Where reusable campaign prep — factions, NPCs, locations — lives as connected entities instead of a fresh document per session.",
      href: "/solutions/rpg-knowledge-graph",
    },
  ],
  relatedAnswers: [
    "how-do-you-organise-rpg-campaign-notes",
    "what-makes-a-good-random-encounter",
    "how-do-you-organise-npc-relationships",
  ],
  discovery: {
    id: "answer-session-prep",
    parentCluster: "session-prep",
    primaryIntent: "how much prep do you need for an rpg session",
    intentAliases: [
      "how much prep do i need for an rpg session",
      "how much should a gm prep",
      "how much prep for a dnd session",
      "how long should session prep take",
      "how to prep an rpg session",
      "low prep gming",
    ],
    uniqueValue:
      "Replaces the search for a universal prep-time ratio with a seven-item coverage checklist, a compact worked example, and the essential/reusable/optional-worldbuilding distinction that explains why more hours prepped isn't the same as better prepared.",
    relatedIntents: [
      "answer-campaign-notes",
      "answer-random-encounter",
      "answer-npc-relationships",
    ],
  },

  seo: {
    title: "How much prep do you need for an RPG session? | Codex Cryptica",
    description:
      "There's no universal prep-time ratio. A compact checklist for what actually needs preparing, a worked example, and why worldbuilding isn't the same thing as session prep.",
  },
};
