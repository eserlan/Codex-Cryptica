import type { AnswerConfigInput } from "../schema";

export const howDoYouCreateABelievableFictionalReligion: AnswerConfigInput = {
  slug: "how-do-you-create-a-believable-fictional-religion",
  labels: ["fantasy"],
  category: "worldbuilding",
  publishedAt: "2026-08-30",
  question: "How do you create a believable fictional religion?",
  kind: "how-to",
  shortAnswer:
    "Write what adherents do, not what they believe. A religion becomes believable through practice: the rites people perform, the days they cannot work, the money the institution collects, the questions it will not permit, because that is how religion is encountered from outside. Doctrine is the last thing a visitor learns and the first thing most invented religions over-specify.",
  sections: [
    {
      kind: "prose",
      heading: "Practice first, doctrine last",
      paragraphs: [
        "Ask someone to describe a religion they do not belong to and they will describe behaviour: what people wear, when they gather, what they abstain from, what happens at a funeral. The theology comes later, if at all. Invented religions usually run this backwards, opening with a creation myth and a list of tenets that nobody in play will ever ask about.",
        'Starting from practice also produces friction automatically. A rite that requires still water gives you a reason for temples to sit where they do, a trade in imported water, an argument about whether river water counts, and a schism waiting to happen. A tenet, "they value purity," produces none of that.',
        "This page is about the institution and its practice. Designing the gods themselves is a separate problem, and a religion does not need a pantheon at all: ancestor veneration, a philosophy, a state cult and a saint-centred folk practice are all religions with very little theology between them.",
      ],
    },
    {
      kind: "list",
      heading: "What to write, in order",
      ordered: true,
      items: [
        {
          term: "One rite performed regularly",
          text: "Weekly, daily, seasonal. Describe it physically: who does what, with which objects, in what building. This single item generates more usable detail than everything below it.",
        },
        {
          term: "A prohibition with teeth",
          text: "Something adherents will not do, and what happens when they do it anyway. Enforcement is what separates a religion from a preference.",
        },
        {
          term: "A life event it owns",
          text: "Birth, marriage, burial, coming of age, the settling of debts. Whoever controls the funerals controls a great deal.",
        },
        {
          term: "How it is funded",
          text: "Tithes, land, a monopoly, endowments from a family that expects favours. Follow the money and you find the politics.",
        },
        {
          term: "Its internal disagreement",
          text: "Every real tradition has one. Two readings of the same rule, and a faction behind each. This is where a party can get involved.",
        },
        {
          term: "Only then, the doctrine",
          text: "And only the parts the practice implies. If a belief does not change what anyone does, it can stay unwritten.",
        },
      ],
    },
    {
      kind: "example",
      heading: "A worked example: the Kept Flame",
      paragraphs: [
        "Built from the list above. Notice how much of it is administrative rather than mystical; that is deliberate, and it is what makes the institution feel like it existed before the party arrived.",
      ],
      items: [
        {
          term: "The rite",
          text: "An oath is sworn over a lamp kept alight by the house making it. Both parties press a thumb to the warm brass. The lamp must not go out before the term of the oath expires.",
        },
        {
          term: "The prohibition",
          text: "No oath may be sworn over a borrowed flame. Doing so voids it, and lamp-hire is, technically, a serious crime that half the poor quarter commits.",
        },
        {
          term: "Life event",
          text: "Marriage and apprenticeship are both oaths, so the church registers them. It therefore holds the only records of who is bound to whom.",
        },
        {
          term: "Funding",
          text: "A fee per oath witnessed, and the sale of lamp oil, which it produces itself. The oil monopoly is worth more than the fees.",
        },
        {
          term: "The disagreement",
          text: "Whether an oath survives the death of the lamp-keeper. The strict reading voids it; the lenient reading does not. Two inheritance disputes in the city currently turn on this, and each side has a bishop.",
        },
        {
          term: "What is left unwritten",
          text: "Where Ismera came from, and what she wants. Nobody at the table has needed it yet.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Believability comes from inconsistency",
      paragraphs: [
        "Invented religions read as fake mostly because they are too coherent. Every practice serves the theology, every adherent agrees, and the whole thing was evidently designed at once. Real traditions carry rules whose reason has been forgotten, festivals absorbed from something older, regional variants that embarrass the centre, and a gap between what the institution teaches and what people in the village actually do.",
        "Adding two or three of those is enough. A holiday nobody can explain. A prayer said in a language the congregation does not speak. A shrine the church tolerates but does not endorse.",
        "One caution, since this material touches real belief: borrowing the surface of a living religion (its sacred names, its liturgy, its iconography) and attaching it to a fictional institution tends to land badly, and it is also the lazier option. Taking the structural lessons instead, and inventing the specifics, produces something both less offensive and more interesting.",
      ],
    },
    {
      kind: "checklist",
      heading: "A religion ready to use at the table",
      items: [
        "You can describe one rite physically, in three sentences.",
        "There is something adherents will not do, and a consequence when they do.",
        "You know who pays for it and what they expect in return.",
        "Two adherents could disagree in good faith about a specific rule.",
        "At least one practice exists that nobody can fully explain.",
      ],
    },
  ],
  codexConnection: {
    heading: "Where a religion lives in a campaign vault",
    paragraphs: [
      "A religion is rarely one page. It is an institution, its clergy, its buildings, the families that fund it, and the disputes it is currently having, which is to say it behaves exactly like a faction, and benefits from the same treatment: one entity per part, connected by named links.",
      "The practical payoff comes when the party leans on it. Voiding one oath should tell you which three inheritance cases are affected, and that is a question a linked graph answers and a document does not.",
    ],
    linkText: "Try the faction generator",
    href: "/generators/faction",
  },
  relatedTools: [
    {
      title: "Faction generator",
      description:
        "Churches, orders and heresies behave like factions: start from goals and obstacles.",
      href: "/generators/faction",
    },
    {
      title: "Pantheon generator",
      description: "For settings where the religion does have gods behind it.",
      href: "/generators/pantheon-generator",
    },
    {
      title: "Secret society generator",
      description:
        "For heresies, mystery cults and the orders a church would rather not acknowledge.",
      href: "/generators/secret-society",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for fantasy worldbuilding",
      description:
        "Institutions, regions and history held together as a setting grows.",
      href: "/for/fantasy-worldbuilding",
    },
  ],
  relatedAnswers: [
    "how-do-you-create-a-fictional-language-for-an-rpg",
    "how-do-you-create-a-pantheon",
    "how-do-you-create-a-fantasy-faction",
    "what-should-an-rpg-settlement-contain",
  ],
  discovery: {
    id: "answer-fictional-religion",
    parentCluster: "gods-and-faith",
    primaryIntent: "how do you create a believable fictional religion",
    intentAliases: [
      "how to write a fictional religion",
      "designing religions for worldbuilding",
    ],
    uniqueValue:
      "Practice before doctrine: one rite, one prohibition, who funds it, what adherents dispute, and why total coherence reads as fake.",
    relatedIntents: ["answer-pantheon"],
  },

  seo: {
    title:
      "How do you create a believable fictional religion? | Codex Cryptica",
    description:
      "Write the practice before the doctrine: one rite, one prohibition, who pays, and what adherents disagree about. A worked example, and why coherence reads as fake.",
  },
};
