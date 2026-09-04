import type { AnswerConfigInput } from "../schema";

export const whatShouldAnRpgSettlementContain: AnswerConfigInput = {
  slug: "what-should-an-rpg-settlement-contain",
  category: "worldbuilding",
  question: "What should an RPG settlement contain?",
  kind: "framework",
  shortAnswer:
    "Whatever the party will interact with, plus the one thing that explains why the place exists. In practice that is three or four locations they can enter, two or three people worth talking to, one local problem nobody has solved, and a reason for the settlement to be here rather than a mile downriver. A full civic census is wasted prep; the reason-to-exist is what makes the place feel real in one sentence.",
  sections: [
    {
      kind: "prose",
      heading: "Start with why it is here",
      paragraphs: [
        "Every settlement exists because of something: a ford, a mine, a shrine, a garrison, a place where two roads have to meet. That fact determines almost everything else worth knowing — who lives there, who has money, what the town is afraid of losing, and what happens to it if the reason goes away.",
        'It is also the fastest possible characterisation. "A town that exists because it is the last place to buy fresh water before the salt flats" tells you more, and generates more play, than three paragraphs about architecture.',
        "The corollary is that a settlement whose reason has recently changed is worth ten that are stable. The mine is failing. The road moved. The garrison left last spring. Now everything about the place is in motion, and the party has arrived at the interesting moment.",
      ],
    },
    {
      kind: "list",
      heading: "The prep that actually gets used",
      intro:
        "Sized for a settlement the party will spend a session or two in. Scale up only for the places they will keep returning to.",
      items: [
        {
          term: "Three or four enterable locations",
          text: "Somewhere to sleep, somewhere to buy, somewhere with authority, and one place that is strange. Not a full street map — four rooms the party can walk into.",
        },
        {
          term: "Two or three named people",
          text: "One who wants something from the party, one who has something they need, one who is a problem. Everyone else can be improvised.",
        },
        {
          term: "One unsolved local problem",
          text: "Small enough to matter this week, unresolved because nobody local can fix it. This is what turns a stopover into an adventure without a plot hook being handed out.",
        },
        {
          term: "A power structure, in one line",
          text: "Who decides things, and who actually decides things. These are frequently different people, and the gap is usually the plot.",
        },
        {
          term: "What is expensive and what is scarce",
          text: "Two items. Prices communicate the economy faster than any description, and scarcity gives the party something to negotiate over.",
        },
        {
          term: "One sensory detail that repeats",
          text: "The tanning pits, the bell, the smell of the drying sheds. Mentioned three times, it does more work than a paragraph read once.",
        },
      ],
    },
    {
      kind: "example",
      heading: "A worked example: Cold Ferry, population 400",
      paragraphs: [
        "Built from the list above in about ten minutes. Nothing here is a map or a census.",
      ],
      items: [
        {
          term: "Why it exists",
          text: "The only ford on the Marrow for thirty miles — and the new bridge upstream opened last autumn.",
        },
        {
          term: "Locations",
          text: "The Ferryman's Rest, half-empty. Odry's yard, which repairs boats nobody needs any more. The reeve's hall. A flooded chapel on the far bank that the locals will not discuss.",
        },
        {
          term: "People",
          text: "Reeve Alder Cass, who needs the party to be gone before the assize visits. Odry, who will trade a punt for news of the upstream road. Vess Marrow, who has started paying people to make the bridge unsafe.",
        },
        {
          term: "The problem",
          text: "Two bridge workers have drowned in six weeks. Everyone assumes sabotage; nobody will say by whom.",
        },
        {
          term: "Economy",
          text: "Rope is expensive. Fresh meat is scarce. Both because the traffic has gone.",
        },
        {
          term: "Repeating detail",
          text: "The ferry bell, still rung on the hour, for a service that runs twice a day.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "What to leave out",
      paragraphs: [
        "Complete shop inventories, the names of every innkeeper in a city, population figures broken down by trade, and a full map of a place the party will cross once. These are satisfying to write and almost never consulted.",
        'The honest signal is whether a detail can change what a player does. Population 400 versus 1,200 rarely does. "The reeve wants you gone by Thursday" always does.',
        "This scales rather than reverses for cities. A city is not a bigger settlement page; it is a handful of districts, each prepared to the list above, plus the factions that operate across them. Trying to prepare a city as one entity is the most common way a session's worth of prep produces nothing usable.",
      ],
    },
    {
      kind: "checklist",
      heading: "The settlement is ready when",
      items: [
        "You can say why it is here in one sentence.",
        "Something about that reason has recently changed, or is about to.",
        "Three people want three different things from the party.",
        "There is a problem nobody local can solve.",
        "You know who has authority and who has power.",
      ],
    },
  ],
  codexConnection: {
    heading: "Settlements that stay connected to the campaign",
    paragraphs: [
      "A settlement is mostly a set of relationships: the people who live there, the factions that want it, the roads that reach it, and the events that changed it. Holding it as a location entity with those links means a return visit six months later starts from what is on the page rather than what you can remember.",
      "It also makes consequences visible. When the bridge finally opens, the things that change are the ones linked to the ford — which is exactly the list you need and never have to hand.",
    ],
    linkText: "Try the settlement generator",
    href: "/generators/settlement",
  },
  relatedTools: [
    {
      title: "Settlement generator",
      description:
        "Free, no login. Towns and cities with a reason to exist, across any genre.",
      href: "/generators/settlement",
    },
    {
      title: "Tavern generator",
      description:
        "The enterable location the party will actually spend time in.",
      href: "/generators/tavern",
    },
    {
      title: "News sheet generator",
      description:
        "A local broadsheet — the fastest way to put a settlement's problems in the party's hands.",
      href: "/generators/news-sheet-generator",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for fantasy worldbuilding",
      description:
        "Regions, settlements and the factions that fight over them, connected.",
      href: "/for/fantasy-worldbuilding",
    },
  ],
  relatedAnswers: [
    "what-is-a-point-crawl",
    "how-do-you-create-a-fantasy-faction",
    "how-do-you-organise-rpg-campaign-notes",
  ],
  discovery: {
    id: "answer-settlement-contents",
    parentCluster: "settlement-creation",
    primaryIntent: "what should an rpg settlement contain",
    intentAliases: ["how to design a fantasy town", "rpg town prep checklist"],
    uniqueValue:
      "Prep sized to what gets used — a reason to exist, four enterable places, three wants, one unsolved problem — plus what to leave out.",
    relatedIntents: ["generator-settlement"],
  },

  seo: {
    title: "What should an RPG settlement contain? | Codex Cryptica",
    description:
      "Prepare a reason to exist, three or four enterable places, three people who want things, and one unsolved problem. A worked example, and what to leave out.",
  },
};
