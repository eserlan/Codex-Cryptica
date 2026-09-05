import type { AnswerConfigInput } from "../schema";

export const howDoYouRunAConspiracyCampaign: AnswerConfigInput = {
  slug: "how-do-you-run-a-conspiracy-campaign",
  category: "session-prep",
  labels: ["modern"],
  publishedAt: "2026-08-30",
  question: "How do you run a conspiracy campaign?",
  kind: "how-to",
  shortAnswer:
    "Decide the truth in full before the first session, then design how it leaks. A conspiracy campaign works when you know exactly who did what and why, and the play consists of the party assembling that picture from partial, contradictory and deliberately planted evidence. If the truth is still undecided, the trail cannot be consistent, and players notice inconsistency in a mystery faster than in any other genre.",
  sections: [
    {
      kind: "prose",
      heading: "Write the answer first",
      paragraphs: [
        "The temptation is to keep the conspiracy vague so it can adapt to what the players do. It is the single most reliable way to ruin one. Players in this genre are actively building a model and testing it; a truth that shifts to stay ahead of them produces a trail that does not reconcile, and the table's confidence collapses at the point they realise nothing they deduced was load-bearing.",
        "Deciding the truth up front does not remove flexibility; it moves it. What stays adaptable is which evidence surfaces where, who talks, and how the conspiracy reacts. That is more than enough improvisation, and all of it is consistent by construction.",
      ],
    },
    {
      kind: "list",
      heading: "The three documents to write before session one",
      ordered: true,
      items: [
        {
          term: "The truth",
          text: "Who is involved, what they did, when, and why. One page. Includes the parts the party will probably never learn; those are what keep your answers consistent when you improvise.",
        },
        {
          term: "The evidence map",
          text: "Every trace the truth left: documents, witnesses, absences, physical objects. For each, where it is, who controls it, and what it proves on its own. Most should prove something partial or misleading in isolation.",
        },
        {
          term: "The clock",
          text: "What the conspiracy does over the next eight weeks if the party never interferes. This is what stops the campaign becoming a static puzzle box the party excavates at their leisure.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Redundancy is the genre's core technique",
      paragraphs: [
        "The classic failure is a single clue that the entire plot depends on the party finding. They will miss it. The standard fix, usually credited to Justin Alexander as the three-clue rule, is to make sure any conclusion the plot requires can be reached from at least three independent traces.",
        "Redundancy does not mean repetition. Three routes to the same conclusion should feel different: a ledger entry, a witness who contradicts herself, and a room that is too clean. Each is weak alone; together they converge.",
        "The related habit is to let the party be wrong productively. A partially correct theory that names the wrong person should still lead somewhere, ideally into a scene where the real conspirator has to react to being nearly caught by accident.",
      ],
    },
    {
      kind: "example",
      heading: "One fact, three routes",
      paragraphs: [
        "The conclusion the plot needs: the Meridian Group is funding the harbour works through a shell company.",
      ],
      items: [
        {
          term: "Route one: documentary",
          text: "The Assize's register records the same solicitor witnessing both the shell company's founding and a Meridian land sale. Findable by anyone who reads carefully; proves association, not control.",
        },
        {
          term: "Route two: human",
          text: "A dismissed clerk will talk for the right price. He is bitter, exaggerates, and is right about the money and wrong about who ordered it.",
        },
        {
          term: "Route three: physical",
          text: "The shell company's registered office has no staff, no wear on the floor, and a month of unopened post addressed to a Meridian director.",
        },
        {
          term: "Why three",
          text: "Any one is deniable. Any two together force the conspiracy to respond, which is where the campaign's next scene comes from.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Running it at the table",
      items: [
        {
          term: "Keep a shared board",
          text: "Let the players record what they think they know, in the open. It surfaces their model, which tells you what to feed them next, and it makes their progress visible to them.",
        },
        {
          term: "Track what has been revealed",
          text: "Separately from what is true. In a long conspiracy campaign this is the record you will consult most, and it is the one nobody keeps.",
        },
        {
          term: "Make the conspiracy act",
          text: "Every time the party gets close, someone is transferred, a witness leaves the city, a file is destroyed. Pressure applied to the party is also information about who felt it.",
        },
        {
          term: "Let something be provable",
          text: "Paranoia without resolution exhausts a table. At least one thread should end in a fact the party can act on publicly.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Before the first session",
      items: [
        "The full truth is written down, including what the party will never learn.",
        "Every necessary conclusion has three independent routes to it.",
        "At least two pieces of evidence are misleading in isolation but not false.",
        "You know what the conspiracy does over the next two months unprompted.",
        "You know how the party could win, concretely.",
      ],
    },
  ],
  codexConnection: {
    heading: "Keeping the evidence map straight",
    paragraphs: [
      "Conspiracy prep is a graph problem more than a writing problem: people, front organisations, documents and events, connected by who controls what and who knows whom. Holding those as linked entities means the question you keep asking (what else touches this person?) has an answer on screen rather than in three pages of notes.",
      "The spatial canvas is the closer match for the players' side of it: a board you arrange by hand, with the connections drawn as you make them. Codex's canvas and graph views cover both halves, and the vault stays local Markdown on your own machine, which is a reasonable thing to want for a campaign built entirely out of secrets.",
    ],
    linkText: "See Codex Cryptica for conspiracy campaigns",
    href: "/for/conspiracy",
  },
  relatedTools: [
    {
      title: "Secret society generator",
      description:
        "Free, no login. Cells, oaths, handlers and recognition signs for the group behind it all.",
      href: "/generators/secret-society",
    },
    {
      title: "Council vote generator",
      description:
        "Turns a conspiracy's next move into a scene: who votes which way, and what buys them.",
      href: "/generators/council-vote",
    },
    {
      title: "News sheet generator",
      description:
        "The public version of events, useful precisely because it is wrong in specific ways.",
      href: "/generators/news-sheet-generator",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for conspiracy campaigns",
      description:
        "Fronts, operatives, dossiers and hidden relationships in one local-first workspace.",
      href: "/for/conspiracy",
    },
    {
      title: "Codex Cryptica for Delta Green",
      description:
        "Conspiracy structure applied to a specific system, with its own cast of horrors.",
      href: "/for/delta-green",
    },
  ],
  relatedAnswers: [
    "how-do-you-organise-npc-relationships",
    "how-do-you-create-a-fantasy-faction",
    "how-do-you-organise-rpg-campaign-notes",
    "how-do-you-design-rpg-puzzles-that-do-not-stall-the-game",
    "how-do-you-track-unresolved-plot-hooks-in-an-rpg-campaign",
    "how-do-you-run-a-mystery-without-railroading",
  ],
  discovery: {
    id: "answer-conspiracy-campaign",
    parentCluster: "conspiracy-campaigns",
    primaryIntent: "how do you run a conspiracy campaign",
    intentAliases: ["running a mystery campaign", "conspiracy campaign prep"],
    uniqueValue:
      "Write the truth first, then design the leak: three prep documents, the three-clue redundancy rule, and one fact reached three ways.",
    relatedIntents: ["for-conspiracy"],
    acknowledgedOverlap: [
      {
        with: "for-conspiracy",
        reason:
          "The answer teaches how to run the campaign; the /for page shows how Codex holds the evidence map. Technique versus tooling, and each is useful without the other.",
      },
    ],
  },

  seo: {
    title: "How do you run a conspiracy campaign? | Codex Cryptica",
    description:
      "Decide the truth in full, then design how it leaks. The three documents to write first, why every conclusion needs three routes, and how to keep the trail consistent.",
  },
};
