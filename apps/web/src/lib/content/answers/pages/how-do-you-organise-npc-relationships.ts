import type { AnswerConfigInput } from "../schema";

export const howDoYouOrganiseNpcRelationships: AnswerConfigInput = {
  slug: "how-do-you-organise-npc-relationships",
  category: "campaign-notes",
  publishedAt: "2026-08-30",
  question: "How do you organise NPC relationships?",
  kind: "how-to",
  shortAnswer:
    'Record relationships as directed, named links between two named people, stored once rather than restated on both pages. "Alder Cass owes a debt to Vess Marrow" is a fact with a direction and a reason; a list headed "Allies" on each character\'s page is not, and it will drift out of step the first time the relationship changes. Keep the direction, the reason, and whether the party knows about it.',
  sections: [
    {
      kind: "prose",
      heading: "Why lists on character pages fail",
      paragraphs: [
        'The default habit is to give each NPC an "allies" and "enemies" list. It breaks for two reasons. First, it duplicates: the same relationship is written on two pages, and after a session where it changes, one of them is wrong. Second, it flattens direction. Loyalty, debt, blackmail and unrequited affection all run one way, and that asymmetry is usually the interesting part.',
        "Storing the relationship as its own thing — a link with a label — fixes both. One record, one place to edit, and the label carries the direction: A owes B, B protects A, A does not know that B reports to C.",
      ],
    },
    {
      kind: "list",
      heading: "What each relationship should record",
      items: [
        {
          term: "Direction",
          text: "From whom, to whom. Reciprocal relationships are two links, not one, and they are frequently unequal — she considers him a friend; he considers her an asset.",
        },
        {
          term: "A verb, not a category",
          text: '"Owes a gambling debt to", "informs on", "was pardoned by". Categories like ally or rival tell you nothing you can play.',
        },
        {
          term: "Why it exists",
          text: "One clause. The reason is what determines whether the relationship survives pressure.",
        },
        {
          term: "Who knows",
          text: "Public, known to the party, or secret. This is the field that most often decides what a scene can be about.",
        },
        {
          term: "What would break it",
          text: "Optional, and worth writing for the four or five relationships your plot rests on.",
        },
      ],
    },
    {
      kind: "example",
      heading: "A worked example: five links, one situation",
      paragraphs: [
        "The same cast written as links rather than lists. Read them in order and a scenario assembles itself without anyone having planned one.",
      ],
      items: [
        {
          term: "Vess Marrow → Alder Cass",
          text: "Holds a forged writ in his name. Secret. Kept as insurance, not yet used.",
        },
        {
          term: "Alder Cass → the Harbour Assize",
          text: "Sworn magistrate. Public. His standing is the only thing he has.",
        },
        {
          term: "Alder Cass → Nell Cass",
          text: "Estranged sister. Known to the party since session 9.",
        },
        {
          term: "Nell Cass → Vess Marrow",
          text: "Runs cargo for her. Does not know about the writ.",
        },
        {
          term: "The Harbour Assize → Vess Marrow",
          text: "Has been trying to prosecute her for two years and cannot get a witness.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Keep the web small on purpose",
      paragraphs: [
        "The failure mode at the other end is a relationship map with two hundred edges that nobody consults. Relationships are worth recording when they can change, when they are leverage, or when the party can act on them. An NPC's landlord is not a relationship; it is a detail.",
        "A practical ceiling: no more than three or four recorded links per NPC who matters, and none at all for the ones who do not. If a character has fifteen, the page has become a biography rather than a tool.",
        "The other habit worth keeping is drawing a distinction between what is true and what the party believes. Track them separately. Half of what makes relationship-driven play work is the gap between the two, and it disappears the moment you merge the two into one line.",
      ],
    },
    {
      kind: "checklist",
      heading: "A working relationship record",
      items: [
        "It runs in a stated direction between two named people.",
        "It uses a verb you could put in a sentence at the table.",
        "It says who knows about it.",
        "It could plausibly change during the campaign.",
        "It is stored in one place, not restated on both pages.",
      ],
    },
  ],
  codexConnection: {
    heading: "How Codex Cryptica stores this",
    paragraphs: [
      "In Codex a relationship is a typed link between two entities, held once and rendered on both — so editing it on either side edits the same fact. The graph view then draws the web, which is mainly useful for the thing lists cannot show: clusters, chokepoints, and the person three links from everyone who you had thought was a minor character.",
      "The spatial canvas is the other half of this. It is closer to a conspiracy board — nodes you place by hand, grouped the way you think about them rather than the way the data is shaped.",
    ],
    linkText: "See the knowledge graph",
    href: "/solutions/rpg-knowledge-graph",
  },
  relatedTools: [
    {
      title: "NPC generator",
      description:
        "Free, no login. Produces characters with wants and ties you can wire into an existing web.",
      href: "/generators/npc",
    },
    {
      title: "RPG NPC generator",
      description:
        "System-agnostic NPCs for any genre, straight in the browser.",
      href: "/tools/rpg-npc-generator",
    },
    {
      title: "Secret society generator",
      description:
        "When the relationships themselves are the secret — cells, handlers and recognition signs.",
      href: "/generators/secret-society",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for conspiracy campaigns",
      description:
        "Relationship-heavy play where who reports to whom is the whole plot.",
      href: "/for/conspiracy",
    },
  ],
  relatedAnswers: [
    "how-do-you-organise-rpg-campaign-notes",
    "how-do-you-create-a-fantasy-faction",
    "how-do-you-run-a-conspiracy-campaign",
    "how-do-i-get-players-to-engage-with-my-campaign-world",
    "how-do-i-run-a-successful-session-0",
    "how-do-you-make-npcs-memorable-without-lots-of-prep",
    "how-do-you-track-unresolved-plot-hooks-in-an-rpg-campaign",
    "how-much-prep-do-you-need-for-an-rpg-session",
    "how-do-you-handle-character-death-in-a-tabletop-rpg",
  ],
  discovery: {
    id: "answer-npc-relationships",
    parentCluster: "relationship-modelling",
    primaryIntent: "how do you organise npc relationships",
    intentAliases: ["track npc relationships rpg", "npc relationship map"],
    uniqueValue:
      "Argues for directed, named links over ally/enemy lists, says what each link must record, and gives a five-link worked scenario.",
    relatedIntents: ["solution-rpg-knowledge-graph"],
  },

  seo: {
    title: "How do you organise NPC relationships? | Codex Cryptica",
    description:
      "Store NPC relationships as directed, named links with a reason and a visibility — not as ally lists on each page. What to record, a worked example, and when to stop.",
  },
};
