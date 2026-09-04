import type { AnswerConfigInput } from "../schema";

export const howDoYouCreateAPantheon: AnswerConfigInput = {
  slug: "how-do-you-create-a-pantheon",
  category: "worldbuilding",
  question: "How do you create a pantheon?",
  kind: "how-to",
  shortAnswer:
    "Build the relationships between the gods first and their portfolios second. A pantheon is interesting because of how its members disagree — who was betrayed, who was replaced, whose worship displaced whose — and a list of deities with one domain each produces none of that. Start with three or four gods who are entangled, and let the rest of the roster grow out of the gaps that leaves.",
  sections: [
    {
      kind: "prose",
      heading: "Portfolios are the least useful place to start",
      paragraphs: [
        "The standard approach is to enumerate domains — war, harvest, the sea, the dead — and assign a god to each. It produces a complete pantheon quickly and a dull one permanently, because a tidy division of labour gives the gods nothing to want from one another.",
        "Mythologies people actually find memorable are messy in specific ways: overlapping claims, gods who are the same figure under two names, a domain held by someone who took it from someone else. Those irregularities are not decoration. They are the reason a pantheon can carry a plot.",
      ],
    },
    {
      kind: "list",
      heading: "Five moves that generate structure",
      intro: "Pick two or three. Applying all five at once produces noise.",
      items: [
        {
          term: "A contested domain",
          text: "Two gods both claim the sea, and their churches have separate calendars, rites and grudges as a result. Contested domains create factions on the ground automatically.",
        },
        {
          term: "A displaced god",
          text: "Someone held a portfolio before the current holder. Where the old worship survives — remote valleys, sailors, criminals — you have an instant subculture.",
        },
        {
          term: "A binding debt or crime",
          text: "One founding act the whole pantheon is still arranged around. It explains why gods who dislike each other cooperate.",
        },
        {
          term: "A silence",
          text: "A god who has not answered a prayer in three hundred years. Their clergy still exists, and what they do with that fact is a campaign.",
        },
        {
          term: "An overlap of names",
          text: "The same god worshipped as two figures in two regions, each convinced the other is a heresy. Cheap to write, enormously productive at the table.",
        },
      ],
    },
    {
      kind: "example",
      heading: "A worked example: three gods, no domain list",
      paragraphs: [
        "Written by choosing entanglements first. The portfolios fell out afterwards, and two of them overlap on purpose.",
      ],
      items: [
        {
          term: "Ismera, the Kept Flame",
          text: "Hearth and oaths. Her rite binds an oath in fire; breaking one is a matter for her clergy, not a court. This makes her church a legal institution as much as a religious one.",
        },
        {
          term: "Vaun of the Low Water",
          text: "Held the oath-portfolio before Ismera and lost it, which the surviving Vaunish houses dispute. They still swear the old way, and those oaths are not recognised — a running source of inheritance disputes.",
        },
        {
          term: "The Ninth Sister",
          text: "Unnamed, silent for three centuries. Her order maintains empty shrines and refuses to say why. Both other churches would like to know what they are waiting for.",
        },
        {
          term: "What this yields",
          text: "A legal system, two rival clergies with a concrete grievance, an inheritance plot, and a mystery — before a single domain list was written.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Decide what the gods do, mechanically and narratively",
      paragraphs: [
        "Two questions determine how the pantheon behaves in play, and they are worth settling explicitly rather than by drift. Do the gods answer? And can anyone tell the difference between a god answering and a coincidence?",
        "A setting where divine intervention is verifiable produces theocracies, tested prophecies and clergy with actual authority. One where it is ambiguous produces schisms, competing interpretations and faith as a genuine choice. Neither is more correct — but a table that has not decided will produce both by accident, and players will notice the inconsistency long before they notice the pantheon.",
        "This is also the boundary between a pantheon and a religion. The pantheon is the roster and its entanglements; the religion is what people do about it — the rites, the institutions, the money, the schisms. They are separate design problems, and the second is usually where the play is.",
      ],
    },
    {
      kind: "checklist",
      heading: "A pantheon that will earn its keep",
      items: [
        "At least two gods want something incompatible.",
        "One portfolio has changed hands, and someone still resents it.",
        "You know whether prayers are demonstrably answered.",
        "At least one god's worship maps onto a real group in the setting.",
        "You could run a session about a disagreement between two churches without inventing anything new.",
      ],
    },
  ],
  codexConnection: {
    heading: "Holding a pantheon together in Codex Cryptica",
    paragraphs: [
      "Gods are entities and their entanglements are links, which means the pantheon behaves like any other faction web: the graph shows you who is connected to whom, and the churches, shrines and clergy hang off the deity pages they belong to.",
      "That matters most for the parts of a pantheon that reach the ground. A displaced god is only interesting because of the four locations and two families that still keep the old rite, and those connections are the thing that is easy to lose in a document.",
    ],
    linkText: "Try the pantheon generator",
    href: "/generators/pantheon-generator",
  },
  relatedTools: [
    {
      title: "Pantheon generator",
      description:
        "Free, no login. Generates a connected roster rather than a list of domains.",
      href: "/generators/pantheon-generator",
    },
    {
      title: "God generator",
      description:
        "A single deity in depth — rites, iconography, and what their worship demands.",
      href: "/generators/god-generator",
    },
    {
      title: "Faction generator",
      description:
        "For the churches, orders and heresies a pantheon produces on the ground.",
      href: "/generators/faction",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for fantasy worldbuilding",
      description:
        "Keeping gods, churches, regions and history connected as a setting grows.",
      href: "/for/fantasy-worldbuilding",
    },
  ],
  relatedAnswers: [
    "how-do-you-create-a-believable-fictional-religion",
    "how-do-you-create-a-fantasy-faction",
    "how-do-you-organise-rpg-campaign-notes",
  ],
  discovery: {
    id: "answer-pantheon",
    parentCluster: "gods-and-faith",
    primaryIntent: "how do you create a pantheon",
    intentAliases: ["how to design rpg gods", "fantasy pantheon design"],
    uniqueValue:
      "Builds entanglements between gods before domains, with five structural moves and a three-god example that yields a legal system.",
    relatedIntents: [
      "generator-pantheon-generator",
      "answer-fictional-religion",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-fictional-religion",
        reason:
          "Pantheon covers the roster of gods and how they are entangled; religion covers the institution, its rites and its funding. Both pages state the split explicitly and a setting can need either alone.",
      },
    ],
  },

  seo: {
    title: "How do you create a pantheon? | Codex Cryptica",
    description:
      "Build the entanglements between gods before their domains. Five structural moves, a three-god worked example, and the question that decides how a pantheon plays.",
  },
};
