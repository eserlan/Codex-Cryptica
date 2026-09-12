import type { AnswerConfigInput } from "../schema";

export const howDoYouHelpPlayersRememberWhatHappenedInATtrpgCampaign: AnswerConfigInput =
  {
    slug: "how-do-you-help-players-remember-what-happened-in-a-ttrpg-campaign",
    category: "campaign-notes",
    publishedAt: "2026-09-12",
    question:
      "How do you help players remember what happened in a TTRPG campaign?",
    kind: "framework",
    shortAnswer:
      "Stop treating campaign memory as a reading assignment. Players rarely want to reread five pages of session notes; they ask specific questions — who was this person, which faction were they with, why do we care right now — and campaign memory works when those questions have a fast answer. Recap briefly at the start of every session, keep information tied to what matters this session rather than the whole campaign's history, give recurring NPCs one memorable hook each, keep a lightweight reference instead of a long chronological log, make old material searchable for campaigns with long gaps between sessions, and let characters know things their players have forgotten instead of treating imperfect memory as a test.",
    sections: [
      {
        kind: "prose",
        heading: "The wiki-log trap",
        paragraphs: [
          "Many GMs respond to \"my players don't remember anything\" by writing more: longer recaps, a shared campaign wiki, session-by-session summaries players are expected to read between games. This rarely works, because the problem was never a lack of written material — it's that nobody wants to reread a wiki to prepare for game night, and a summary organised chronologically doesn't answer the question a player actually has mid-scene.",
          "Players ask specific, situational questions: who is this person again, which faction do they answer to, why does this matter to us. A campaign memory system that can answer those three questions quickly beats one that contains everything but takes ten minutes to search through.",
        ],
      },
      {
        kind: "list",
        heading: "Six things that actually help",
        intro:
          "In roughly the order they pay off, from cheapest to set up to most useful for long-running or infrequent campaigns.",
        items: [
          {
            term: "A short recap at the top of every session",
            text: "Sixty to ninety seconds covering only what's relevant to tonight, not a retelling of the whole campaign. This is its own answer with a worked framework — see the recap page linked below.",
          },
          {
            term: "Tie information to right now, not the whole history",
            text: "When you reintroduce an NPC or faction, lead with what they want this scene, not their full backstory. The history is available if a player asks for it; it shouldn't be the default delivery.",
          },
          {
            term: "One memorable hook per recurring NPC",
            text: "A verbal tic, a physical detail, a consistent want — something a player can reattach the name to instantly, instead of forcing them to remember a name cold.",
          },
          {
            term: "A lightweight reference, not a long log",
            text: "A cast list with a one-line reminder each beats a chronological session-by-session history. Players will glance at a reference card; they won't read a diary.",
          },
          {
            term: "Make old material searchable for long-gap campaigns",
            text: 'Monthly or irregular groups lose more between sessions than weekly ones. A quick way to look up "who was the merchant with the ledger" matters more here than a beautifully written recap nobody remembers by the next session.',
          },
          {
            term: "Let characters know what players forgot",
            text: "If a character would reasonably remember a name, a promise, or a face, just tell the player. Treating forgotten details as a penalty for not taking notes punishes the table for playing normally.",
          },
        ],
      },
      {
        kind: "example",
        heading: "The same NPC, two ways to bring them back",
        paragraphs: [
          'A player asks "wait, who\'s Magistrate Oyelaran again?" three sessions after he was introduced.',
        ],
        items: [
          {
            term: "The wiki-log answer",
            text: "The GM flips to session four's notes: \"Magistrate Oyelaran, introduced in the harbour district arc, oversaw the initial investigation into the smuggling ring before the party discovered Captain Rell's involvement, previously mentioned in session two in connection with the dock tariffs dispute...\" By the third sentence the table has moved on without an answer.",
          },
          {
            term: "The quick-reference answer",
            text: "The GM checks a one-line NPC card: \"Oyelaran — the magistrate, trusts Captain Rell, will resist believing he's dirty.\" Answered in one breath, and it's exactly the detail that matters for tonight's scene.",
          },
          {
            term: "Why it works",
            text: "The second answer isn't shorter because it knows less — it's shorter because it's organised around \"what does this player need right now\" instead of \"everything that's true about this character.\"",
          },
        ],
      },
      {
        kind: "checklist",
        heading: "Ongoing campaign-memory habits",
        items: [
          "Every session opens with a recap under two minutes, not a retelling of the whole campaign.",
          "Recurring NPCs each have one hook a player can reattach the name to on sight.",
          "Your campaign reference is a quick-glance cast/location/faction list, not a chronological log.",
          "You can look up any past NPC, faction, or location in under a minute, even after a long gap.",
          'When a player asks "wait, who\'s that?", you answer with what matters now, not the full history.',
          "You tell players what their characters would know, rather than treating a forgotten detail as a failure.",
        ],
      },
    ],
    codexConnection: {
      heading: "Campaign memory as connected, retrievable entities",
      paragraphs: [
        'A vault built from connected entities (NPCs, factions, locations, and the relationships between them) answers "who was this person" and "which faction were they with" directly, instead of requiring a chronological reread. Search (Cmd+K) finds a name in seconds regardless of which session it first appeared in, and each entity\'s recorded connections show who they\'re tied to without retelling their whole history.',
        "None of this decides which NPC deserves a memorable hook or which details matter for tonight's recap — those are still calls only the GM running the table can make. What it removes is the friction of finding what you already wrote down.",
      ],
      linkText: "See the campaign manager",
      href: "/solutions/campaign-manager",
    },
    relatedTools: [
      {
        title: "RPG knowledge graph",
        description:
          "NPCs, factions, and locations as connected entities, so a forgotten name is a search away instead of a reread of old session notes.",
        href: "/solutions/rpg-knowledge-graph",
      },
    ],
    relatedAnswers: [
      "how-do-you-recap-a-ttrpg-session",
      "how-do-you-keep-track-of-npcs-in-a-long-campaign",
      "how-much-campaign-lore-should-players-be-expected-to-remember",
      "how-do-you-run-a-campaign-when-you-only-play-once-a-month",
      "how-do-you-organise-rpg-campaign-notes",
      "how-do-you-track-unresolved-plot-hooks-in-an-rpg-campaign",
      "how-do-you-make-npcs-memorable-without-lots-of-prep",
      "how-do-you-manage-a-campaign-timeline-in-an-rpg",
    ],
    discovery: {
      id: "answer-campaign-memory-hub",
      parentCluster: "campaign-notes",
      clusters: ["campaign-memory"],
      primaryIntent:
        "how do you help players remember what happened in a ttrpg campaign",
      intentAliases: [
        "players don't remember campaign",
        "players forget npcs rpg",
        "how to help players remember d&d campaign",
        "rpg campaign recap ideas",
        "players forget what happened last session",
      ],
      uniqueValue:
        "The anchor page for campaign memory: a six-habit framework (session-start recap, now-relevant framing, one hook per NPC, a lightweight reference over a long log, searchable history for long-gap groups, and characters knowing what players forget) with a worked before/after NPC-reintroduction example, in place of the instinct to write a bigger campaign wiki.",
      relatedIntents: [
        "answer-session-recap",
        "answer-npc-relationships",
        "answer-campaign-notes",
      ],
      acknowledgedOverlap: [
        {
          with: "answer-session-recap",
          reason:
            "This page is the broad campaign-memory framework across an entire campaign's lifespan; the recap page is the narrow, tactical piece of it — the specific 60-90 second ritual delivered at the start of a session.",
        },
      ],
    },
    seo: {
      title: "Help players remember a TTRPG campaign | Codex Cryptica",
      description:
        "A six-habit framework for campaign memory that doesn't rely on a wiki nobody rereads: recaps, now-relevant framing, memorable NPC hooks, and a lightweight reference.",
      image:
        "https://assets.codexcryptica.com/og/how-do-you-help-players-remember-what-happened-in-a-ttrpg-campaign.jpg",
      imageAlt:
        "A Game Master flipping through a compact campaign reference card at the table instead of a thick binder of session notes",
    },
  };
