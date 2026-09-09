import type { AnswerConfigInput } from "../schema";

export const whatMakesAGoodHeistTargetInATabletopRpg: AnswerConfigInput = {
  slug: "what-makes-a-good-heist-target-in-a-tabletop-rpg",
  category: "session-prep",
  labels: ["heist"],
  publishedAt: "2026-09-09",
  question: "What makes a good heist target in a tabletop RPG?",
  kind: "framework",
  shortAnswer:
    "Pick a prize with a practical weight, size, or upkeep cost that makes it awkward to steal and move, give it a specific owner with a plausible reason to want it back, and let its nature suggest the security and complications around it. A vague prize such as 'gold' or 'a magic sword' produces a generic vault; a prize such as a two-hundred-pound crystallised memory core that hums audibly within thirty feet of its ward produces its own security, its own getaway problem, and its own complications for free.",
  sections: [
    {
      kind: "prose",
      heading: "Why the prize decides the whole heist",
      paragraphs: [
        "Most heist scenes that fall flat do not fail because of weak security or a dull alarm track. They fail because the prize itself is generic: a chest of coin, an unspecified magic item, or a folder of papers. A prize with no concrete properties gives the players nothing to plan around and gives the Game Master nothing to complicate later.",
        "Treat the prize as the first design decision, not the last. Once you know exactly what the crew is stealing and why it is difficult to move, the security rings, the alarm triggers, and the getaway complications follow from the object itself rather than from a generic template.",
      ],
      cta: {
        text: "Generate a heist",
        href: "/generators/heist",
      },
    },
    {
      kind: "list",
      heading: "What a good heist target needs",
      intro:
        "Before writing a single guard patrol, settle these properties of the prize:",
      items: [
        {
          term: "A practical weight or footprint",
          text: "Something with size, weight, fragility, or an upkeep need, such as a live creature, a humming artefact, or a document that must stay dry, is harder to lift than folded banknotes, and that difficulty is where interesting decisions live.",
        },
        {
          term: "A plausible current owner",
          text: "Someone specific keeps the prize, for a specific reason, and will notice and react when it is gone. A faction, a noble house, or a named NPC gives the getaway and any sequel hooks somewhere to come from.",
        },
        {
          term: "Value beyond its price",
          text: "The best prizes matter for more than coin: political leverage, a ritual component, evidence, or a favour owed. That second layer of value is what turns a simple theft into a campaign thread.",
        },
        {
          term: "A reason it is awkward to move",
          text: "Decide before the session how the prize resists a quick exit: volume, weight, a curse, a tracking ward, or a living guardian bonded to it. That single detail should shape at least one complication later.",
        },
        {
          term: "A detail the casing phase can discover",
          text: "Give players one fact about the prize itself, not just its guards, that reconnaissance can turn up: how it is transported, when it is unwarded, or who is authorised to touch it.",
        },
      ],
      outro:
        "Two or three of these properties are usually enough. A prize that tries to satisfy all five at once tends to read as overwritten.",
    },
    {
      kind: "example",
      heading: "Worked example: turning 'steal the gem' into a real target",
      paragraphs: [
        "Compare a generic prize against one built with the properties above, for the same basic premise: a crew is hired to steal a valuable gem from a noble's vault.",
      ],
      items: [
        {
          term: "The generic version",
          text: "'A large ruby worth ten thousand gold, kept in the vault.' There is nothing here to plan around beyond the vault's security, and nothing here to complicate the getaway once the vault is open.",
        },
        {
          term: "The designed version",
          text: "The prize is a ruby the size of a fist, warm to the touch, that the noble house uses once a year in a succession ritual; without it, the current heir's claim can be publicly challenged. It weighs enough to need both hands, it is warded to shriek if carried past the vault threshold unless deactivated with a specific gesture, and only two people know that gesture: the noble and their steward.",
        },
        {
          term: "Why it works",
          text: "The weight rules out a quick pocket, the ward creates the actual security puzzle rather than the door lock, and the succession detail turns the getaway into a political problem the crew inherits, not just a chase scene.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "See a designed prize in action",
      paragraphs: [
        "The Dawnheart Diadem shows how a prize with practical weight and a living verification mark creates its own security puzzle and political complications during play.",
      ],
      cta: {
        text: "Read the Dawnheart Diadem heist example",
        href: "/examples/the-dawnheart-diadem-fantasy-heist",
      },
    },
    {
      kind: "checklist",
      heading: "Prize design checklist before you write the security",
      intro: "Confirm these before building the rest of the score:",
      items: [
        "The prize has a concrete physical property (weight, size, fragility, or upkeep) that makes it hard to move quickly.",
        "A specific person or faction currently owns it and has a reason to want it back.",
        "It carries value beyond its price, so the crew inherits a consequence, not just a payday.",
        "At least one property of the prize itself, not just its guards, shapes a security layer or complication.",
        "Casing the target can reveal one true fact about the prize that changes how the crew approaches it.",
      ],
    },
  ],
  codexConnection: {
    heading: "Tracking prize provenance in Codex Cryptica",
    paragraphs: [
      "Once a prize has an owner, a history, and a reason it matters beyond its price, it is worth tracking as an entity rather than a line in your notes. Codex Cryptica lets you record the prize alongside its owner, the faction that wants it back, and the complications it creates, then link all three on the campaign graph.",
      "That makes the prize reusable: the same succession gem can resurface three sessions later as a diplomatic crisis, because the relationships around it were already recorded rather than improvised from memory.",
    ],
    linkText: "Explore the RPG knowledge graph",
    href: "/solutions/rpg-knowledge-graph",
  },
  relatedTools: [
    {
      title: "Heist generator",
      description:
        "Generate a full score built around a prize with a practical catch, three security rings, and a compromised getaway.",
      href: "/generators/heist",
    },
    {
      title: "Faction generator",
      description:
        "Create the organisation or house that currently owns the prize, with its own goals and grudges.",
      href: "/generators/faction",
    },
    {
      title: "NPC generator",
      description:
        "Generate the specific owner, steward, or rival who wants the prize back.",
      href: "/generators/npc",
    },
  ],
  relatedAnswers: ["how-do-you-run-a-heist-in-a-tabletop-rpg"],
  discovery: {
    id: "answer-heist-target-design",
    parentCluster: "adventure-mapping",
    clusters: ["heist", "adventure-mapping"],
    primaryIntent: "what makes a good heist target in a tabletop rpg",
    intentAliases: [
      "choosing a heist prize",
      "how to pick a heist objective",
      "heist macguffin selection",
      "what should the heist prize be",
    ],
    userJob: "understand",
    uniqueValue:
      "A concrete checklist for choosing a heist prize that generates its own complications, rather than a generic macguffin, distinct from the four-phase execution framework the companion answer covers.",
    relatedIntents: ["answer-run-heist-in-tabletop-rpg"],
    acknowledgedOverlap: [
      {
        with: "answer-run-heist-in-tabletop-rpg",
        reason:
          "Both answer heist-design questions in the same cluster, but this page is about choosing what the prize and target are before the session, while the companion page is the four-phase structure for running the session once the target is already set.",
      },
    ],
  },
  seo: {
    title: "What Makes a Good Heist Target in a Tabletop RPG? | Codex Cryptica",
    description:
      "How to design a heist prize that generates its own security, complications, and getaway problems, instead of a generic magic item or pile of coin.",
    image:
      "https://assets.codexcryptica.com/og/what-makes-a-good-heist-target-in-a-tabletop-rpg.jpg",
    imageAlt:
      "Illustration of an ornate warded gemstone resting on a velvet cushion inside a vault",
  },
};
