import type { AnswerConfigInput } from "../schema";

export const howDoYouCreateAFantasyFaction: AnswerConfigInput = {
  slug: "how-do-you-create-a-fantasy-faction",
  category: "worldbuilding",
  question: "How do you create a fantasy faction?",
  kind: "framework",
  shortAnswer:
    'Start with what the faction wants and what is stopping it, then work outwards to membership, methods and territory. A faction is only worth having if it would act differently from every other group in the setting when the same thing happens, so define its goal specifically enough that you can predict its next move — "restore the drowned line to the throne" rather than "gain power".',
  sections: [
    {
      kind: "prose",
      heading: "A faction is a decision-making machine",
      paragraphs: [
        "The reason to invent one is so that the world reacts without you having to improvise on the spot. When the party burns the customs house, you should be able to ask each faction the same question — what do you do about this? — and get five different answers.",
        "That only works if the faction has been defined by its behaviour rather than its aesthetics. A heraldic device, a colour scheme and a founding legend tell you nothing about what the group does on Tuesday. A goal, a constraint and a preferred method tell you everything.",
      ],
    },
    {
      kind: "list",
      heading: "Six questions that produce a usable faction",
      intro:
        "Answer them in order; each one constrains the next. Fifteen minutes is enough.",
      ordered: true,
      items: [
        {
          term: "What does it want, specifically?",
          text: 'Concrete enough to be achieved or lost. "Control the river tolls between the two bridges" is a goal. "Wealth" is a mood.',
        },
        {
          term: "What is stopping it?",
          text: "The obstacle defines the story. A guild blocked by a rival guild behaves nothing like one blocked by its own oath.",
        },
        {
          term: "Who joins, and why?",
          text: "The recruitment pitch, honestly stated. This is where a faction stops being an abstraction — someone had a reason to sign up last month.",
        },
        {
          term: "What will it not do?",
          text: "The line it will not cross is more characterful than the ones it will. It also gives the party leverage.",
        },
        {
          term: "What does it actually control?",
          text: "People, places, money, information, or a monopoly on something. If you cannot name the asset, the faction cannot be robbed of it.",
        },
        {
          term: "What is its next move if nobody interferes?",
          text: "Write it down. This is the single most useful line on the page, because it turns the faction into a clock the party can run against.",
        },
      ],
    },
    {
      kind: "example",
      heading: "A worked example: the Ninefold Assize",
      paragraphs: [
        "A magistrates' guild in a river city, built by answering the six questions in order. Note that none of it required a founding myth.",
      ],
      items: [
        {
          term: "Wants",
          text: "Sole authority to try crimes committed on water, which currently falls to whichever bank the accused is landed on.",
        },
        {
          term: "Blocked by",
          text: "The Ferrymen's Compact, whose members choose the bank — and therefore the verdict — for a fee.",
        },
        {
          term: "Recruits",
          text: "Second sons of merchant houses who cannot inherit but can read. The Assize offers standing, not money.",
        },
        {
          term: "Will not",
          text: "Falsify a written record. They will lose a case rather than forge one, and everyone knows it, which is exactly why their records are worth stealing.",
        },
        {
          term: "Controls",
          text: "The city's only complete register of river deaths going back sixty years.",
        },
        {
          term: "Next move",
          text: "Petition the harbour reeve for jurisdiction at midwinter, using three drownings they have not yet made public.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Make it collide with something",
      paragraphs: [
        "A faction in isolation is inert. The interesting properties emerge from overlap: two groups that want the same asset, one group that depends on another it despises, a third that profits from the quarrel continuing. Two factions with an explicit relationship generate more play than five with none.",
        'The cheapest way to get there is to define each new faction partly in terms of the ones you already have. Not "a thieves\' guild", but "the people the Assize cannot prosecute, and why".',
        "Avoid the tidy symmetry of a faction wheel where every group opposes exactly one other. Real organisations have lopsided relationships — grudges that only run one way, dependencies that only one side knows about — and those asymmetries are where a party finds purchase.",
      ],
    },
    {
      kind: "checklist",
      heading: "Test the faction before you use it",
      items: [
        "Given a specific crisis, you can say what it does without inventing anything new.",
        "It wants something another faction also wants.",
        "A player could plausibly join it and have a reason to stay.",
        "It has something concrete to lose.",
        "Its next move happens whether or not the party shows up.",
      ],
    },
  ],
  codexConnection: {
    heading: "Where this lives in Codex Cryptica",
    paragraphs: [
      "A faction page in Codex holds the six answers as its body and everything else as links: members, rivals, holdings, the assets it controls, the events it caused. Because the relationships are real connections rather than prose, the graph shows you the collisions — two factions pointing at the same location is a plot you had not consciously planned.",
      "The free faction generator is a reasonable way to break a blank page. It produces the goal-and-obstacle skeleton described above; the collisions are still yours to write.",
    ],
    linkText: "Try the faction generator",
    href: "/generators/faction",
  },
  relatedTools: [
    {
      title: "Faction generator",
      description:
        "Free, no login. Produces a goal, an obstacle and a method you can edit into shape.",
      href: "/generators/faction",
    },
    {
      title: "Secret society generator",
      description:
        "For factions whose membership is itself the secret — cells, oaths and recognition signs.",
      href: "/generators/secret-society",
    },
    {
      title: "Council vote generator",
      description:
        "Turns a faction's next move into a scene: who votes which way, and what changes their mind.",
      href: "/generators/council-vote",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for fantasy worldbuilding",
      description:
        "How factions, locations and history stay connected across a long campaign.",
      href: "/for/fantasy-worldbuilding",
    },
  ],
  relatedAnswers: [
    "how-do-you-organise-npc-relationships",
    "how-do-you-create-a-believable-fictional-religion",
    "how-do-you-run-a-conspiracy-campaign",
    "how-do-i-get-players-to-engage-with-my-campaign-world",
    "how-do-you-create-a-pantheon",
    "how-do-you-prepare-a-sandbox-rpg-campaign",
    "what-should-an-rpg-settlement-contain",
  ],
  discovery: {
    id: "answer-fantasy-faction",
    parentCluster: "faction-creation",
    primaryIntent: "how do you create a fantasy faction",
    intentAliases: ["how to make an rpg faction", "faction design framework"],
    uniqueValue:
      "Six ordered questions that make a faction predict its own next move, with a worked guild example and a usability test.",
    relatedIntents: ["generator-faction"],
  },

  seo: {
    title: "How do you create a fantasy faction? | Codex Cryptica",
    description:
      "Six questions that turn a faction into a decision-making machine — goal, obstacle, recruits, limits, assets, next move — with a worked example and a usability test.",
  },
};
