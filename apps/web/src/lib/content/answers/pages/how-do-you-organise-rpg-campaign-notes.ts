import type { AnswerConfigInput } from "../schema";

export const howDoYouOrganiseRpgCampaignNotes: AnswerConfigInput = {
  slug: "how-do-you-organise-rpg-campaign-notes",
  category: "campaign-notes",
  question: "How do you organise RPG campaign notes?",
  kind: "how-to",
  shortAnswer:
    'Separate your notes by how long they stay true, not by session. Keep one durable page per thing that exists in the world — a person, a place, a faction, an item — and let session logs be a dated stream that points at those pages. Everything a campaign needs to recall later is an answer to "what do I know about X?", and a per-session diary is the one structure that cannot answer it.',
  sections: [
    {
      kind: "prose",
      heading: "The problem is retrieval, not storage",
      paragraphs: [
        "Almost nobody loses campaign notes. What fails is finding the right line six weeks later, mid-session, while four people wait. So the useful test for any note-keeping scheme is not how tidy it looks but how fast it answers a question asked out loud.",
        "Session-ordered notes fail that test because the thing you need is never filed under when it happened. A player asks who the harbourmaster's sister was; that fact was mentioned in passing in session 11 and contradicted in session 14, and neither of those is where you would look.",
      ],
    },
    {
      kind: "list",
      heading: "Three layers that do different jobs",
      intro:
        "Most working systems, however they are built, end up with these. Naming them makes it obvious where a given note goes.",
      items: [
        {
          term: "Entities — durable, one per thing",
          text: "A page for each NPC, location, faction, item and event that matters. Edited in place as the truth changes. This is the layer you actually search during play.",
        },
        {
          term: "Session logs — dated, append-only",
          text: "What happened, in order, never rewritten. They are the campaign's history and the source you reconcile from, not the place you look things up.",
        },
        {
          term: "Prep — disposable",
          text: "Next session's scenes, stat blocks, and contingencies. Written to be thrown away. Anything from prep that survives contact with the table gets promoted into an entity page; the rest is deleted without guilt.",
        },
      ],
      outro:
        "The discipline that makes it work is the promotion step: after each session, move the handful of facts that became true out of the log and into the entity pages they belong to.",
    },
    {
      kind: "prose",
      heading: "Link instead of filing",
      paragraphs: [
        "The strong temptation is to build a folder hierarchy — Locations / Northern Reach / Cities / Vareth — and it will betray you the first time something belongs in two places. A ship is a location and an item. A guild is a faction and an employer and, once the party burns it down, an event.",
        "Links do not have that problem. Give each entity one page wherever it happens to live, and connect it to the others: this NPC belongs to that faction, is owed a favour by this one, and was last seen in that city. You get the same organisation a hierarchy promises without having to choose the one true parent, and the connections are themselves information — they are frequently the thing you are trying to recall.",
      ],
    },
    {
      kind: "example",
      heading: "What a good NPC page looks like after four sessions",
      paragraphs: [
        "Concrete beats abstract here, so: Reeve Alder Cass, a minor official the party has met twice.",
      ],
      items: [
        {
          term: "Top of page",
          text: "Two sentences the GM can read aloud cold — who he is, how he behaves, what he wants. Not a biography.",
        },
        {
          term: "Connections",
          text: "Employed by the Harbour Assize. Owes a debt to the Saltmere smugglers. Distrusts the party's cleric specifically.",
        },
        {
          term: "Known to the party",
          text: "What the players have actually established, separate from what is true. This distinction saves more arguments than any other single habit.",
        },
        {
          term: "Open threads",
          text: "The bribe he half-offered in session 9 and nobody followed up on.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Conventions worth fixing early",
      items: [
        {
          term: "One canonical name per thing",
          text: "Pick it and use it everywhere, including in session logs. Aliases go on the entity page, not in your filenames.",
        },
        {
          term: "Mark what the players know",
          text: "Secrets and public facts on the same page, visibly separated. Otherwise you will either spoil something or forget you already revealed it.",
        },
        {
          term: "Date anything that can change",
          text: 'Prices, alliances, who holds a title. "Currently" is a trap in a campaign that runs for two years.',
        },
        {
          term: "Keep a plain-text format",
          text: "Markdown files you own will outlive any specific tool. Campaign notes routinely need to survive a decade and three app migrations.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "The ten-minute post-session pass",
      intro:
        "This is the whole system, in practice. Skip it and any structure decays.",
      items: [
        "Write the session log while it is fresh, in order, without editing.",
        "Create a page for anything newly named at the table.",
        "Promote facts that are now true into their entity pages.",
        "Add or update the links that changed — new allegiances, new debts, new grudges.",
        "Note every thread the party left open, in one place.",
      ],
    },
  ],
  codexConnection: {
    heading: "How Codex Cryptica handles this",
    paragraphs: [
      "Codex is built on exactly this split: entities are individual Markdown files with frontmatter, links between them are first-class, and the graph view shows you the connections you have built rather than a folder tree you have to maintain.",
      "It is local-first, so the vault is a directory of plain Markdown on your own machine. That matters mainly for the ten-year question — notes you can read without the application are notes you still have when the application is gone.",
    ],
    linkText: "See the campaign manager",
    href: "/solutions/campaign-manager",
  },
  relatedTools: [
    {
      title: "RPG knowledge graph",
      description:
        "The entity-and-relationship model these notes assume, shown as an interactive graph.",
      href: "/solutions/rpg-knowledge-graph",
    },
    {
      title: "Local-first RPG campaign manager",
      description:
        "Why the notes live on your machine as Markdown rather than in someone else's database.",
      href: "/features/local-first-rpg-campaign-manager",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for D&D",
      description:
        "The same note structure applied to a long-running Dungeons & Dragons campaign.",
      href: "/for/dungeons-and-dragons",
    },
  ],
  relatedAnswers: [
    "how-do-you-organise-npc-relationships",
    "what-should-an-rpg-settlement-contain",
    "how-do-you-run-a-conspiracy-campaign",
    "how-do-i-get-players-to-engage-with-my-campaign-world",
    "how-do-i-run-a-successful-session-0",
    "how-do-you-create-a-pantheon",
    "how-do-you-track-unresolved-plot-hooks-in-an-rpg-campaign",
    "how-much-prep-do-you-need-for-an-rpg-session",
    "what-is-a-point-crawl",
    "what-should-i-look-for-in-an-rpg-campaign-manager",
  ],
  discovery: {
    id: "answer-campaign-notes",
    parentCluster: "campaign-notes",
    primaryIntent: "how do you organise rpg campaign notes",
    intentAliases: [
      "how to organize dnd campaign notes",
      "best way to structure gm notes",
    ],
    uniqueValue:
      "A three-layer structure — entities, session logs, disposable prep — plus the post-session pass that keeps it true. Technique, not product.",
    relatedIntents: ["solution-campaign-manager"],
    acknowledgedOverlap: [
      {
        with: "solution-campaign-manager",
        reason:
          "The answer teaches a note structure that works in any tool; the solution page documents what Codex does. Different jobs — understand versus evaluate — on one subject.",
      },
    ],
  },

  seo: {
    title: "How do you organise RPG campaign notes? | Codex Cryptica",
    description:
      "Split notes into durable entity pages, dated session logs and disposable prep, then link rather than file. A practical structure and a ten-minute post-session pass.",
  },
};
