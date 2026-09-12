import type { AnswerConfigInput } from "../schema";

export const howDoYouRecapATtrpgSession: AnswerConfigInput = {
  slug: "how-do-you-recap-a-ttrpg-session",
  category: "session-prep",
  publishedAt: "2026-09-12",
  question: "How do you recap a TTRPG session?",
  kind: "framework",
  shortAnswer:
    "Keep it to roughly 60–90 seconds and include only what the party needs to act in the next few minutes: where they are, one active threat or clock if there is one, the goal they set for themselves last time, one or two NPCs relevant to what's next, and a single concrete consequence carried over from their last choices. Skip anything that isn't coming up tonight, let players add colour without treating their memory as the source of record, and tell characters things they would reasonably know even when the players have forgotten — a recap orients the table for the next scene, it is not a campaign digest or a memory test.",
  sections: [
    {
      kind: "prose",
      heading: "A recap that takes ten minutes has already failed",
      paragraphs: [
        "The instinct is to retell everything since last time, because forgetting a detail feels like a failure of GMing. A long recap does the opposite of what it is for: by the third unrelated subplot recounted in full, players have stopped listening for the one thing that actually matters tonight, and the table has spent ten minutes on narration instead of playing.",
        "A recap exists to answer a single question: what does the party need to know to make a decision in the next few minutes? The political history that isn't coming up tonight, the side quest nobody is touching, the NPC who isn't in this scene — all of that can wait until it is actually relevant, or never come up again at all.",
      ],
    },
    {
      kind: "list",
      heading: "What actually belongs in a 60–90 second recap",
      intro:
        "Five things, in roughly this order. If a campaign detail doesn't fit one of these five, it probably doesn't belong in tonight's recap.",
      items: [
        {
          term: "Current location & situation",
          text: "Where the party physically is right now and what's already true about the scene they're about to re-enter. Not how they got there.",
        },
        {
          term: "One active threat or ticking clock",
          text: "The single most pressing pressure hanging over the party tonight, if there is one. Not every danger in the campaign — just the one that's live.",
        },
        {
          term: "The goal the party set for themselves",
          text: "What they said they were going to do next, in their own words if you can manage it. This is often the single most useful line in the whole recap.",
        },
        {
          term: "One or two relevant NPCs",
          text: "Whoever the party is about to interact with, or whoever is actively working against them, plus a one-line reminder of what each one wants. Skip anyone not coming up tonight.",
        },
        {
          term: "One consequence from last session",
          text: "A concrete result of something the party did or didn't do, so their choices visibly mattered and the world moved on without waiting for them.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Delivering it without turning it into a memory quiz",
      intro: "How you deliver the recap matters as much as what's in it.",
      items: [
        {
          term: "Narrate the core facts yourself",
          text: "Default to GM narration for the five points above. Recap is not the moment to test whether players remember details correctly — that just stalls the table and puts someone on the spot.",
        },
        {
          term: "Let players add colour, not correct the record",
          text: "Invite players to chime in with a detail or a character moment they remember, and treat it as flavour rather than the source of truth. If what someone recalls conflicts with your notes, go with your notes and move on instead of litigating it.",
        },
        {
          term: "Give characters knowledge the players lack",
          text: "If the characters would reasonably remember something the players forgot — a name, a promise, a face — just tell them. That isn't cheating; it's what their characters actually know, even when the people playing them don't.",
        },
        {
          term: "For long gaps, hand out a written cheat sheet",
          text: "After a multi-week break, a short bullet list players can glance back at mid-session beats a spoken recap they'll have forgotten again in ten minutes.",
        },
      ],
    },
    {
      kind: "example",
      heading: "The same session, recapped two ways",
      paragraphs: [
        "Picking up after a session where the party found a merchant's ledger proving the town guard captain is protecting a smuggling ring.",
      ],
      items: [
        {
          term: "The ten-minute version",
          text: "A chronological retelling from the session's opening scene: the tavern conversation, the argument with the dockworker, the digression about the harbourmaster's history, the full search of the warehouse room by room, and finally the ledger — by which point half the table has checked out and nobody remembers why the ledger mattered.",
        },
        {
          term: "The 75-second version",
          text: "\"You're at the Salt Anchor tavern with the ledger proving Captain Rell is protecting the smugglers. Rell doesn't know you have it yet, but his patrol passes the tavern in about twenty minutes. You said you wanted to get it to Magistrate Oyelaran before he does. Oyelaran trusts Rell and won't want to believe this. Since last session, one of the smugglers you let go has already warned Rell someone's asking questions.\"",
        },
        {
          term: "Why it works",
          text: "Every sentence is something the party can act on in the next scene. Nothing is included because it happened; it's included because it changes what the players decide to do next.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Before you open with the recap",
      items: [
        "You can state the party's current location and immediate situation in one sentence.",
        "You've named the single most pressing threat or clock, if one exists — not every danger in the campaign.",
        "You know what the party said they'd do next, in their own words if possible.",
        "You've picked the one or two NPCs actually relevant to tonight and cut the rest.",
        "You have one concrete consequence from last session ready to mention.",
        "For a long gap since the last session, you have a short written cheat sheet ready to hand out or pin up.",
      ],
    },
  ],
  codexConnection: {
    heading: "Finding what belongs in the recap without flipping through notes",
    paragraphs: [
      "The five things a recap needs — current location, an active threat, the party's stated goal, the relevant NPCs, and a recent consequence — are usually scattered across several sessions' worth of notes. Search (Cmd+K) and each entity's recorded connections mean pulling up 'what does Captain Rell want' or 'what did the party decide last time' takes seconds instead of scrolling back through a session log.",
      "None of that writes the recap for you. Deciding which one or two threads actually matter tonight is still a judgement call only the GM running the table can make.",
    ],
    linkText: "See the campaign manager",
    href: "/solutions/campaign-manager",
  },
  relatedTools: [
    {
      title: "RPG knowledge graph",
      description:
        "Where NPCs, locations, and factions live as connected entities, so the threads a recap needs are a search away instead of a scroll through old session notes.",
      href: "/solutions/rpg-knowledge-graph",
    },
  ],
  relatedAnswers: [
    "how-do-you-help-players-remember-what-happened-in-a-ttrpg-campaign",
    "how-do-you-keep-track-of-npcs-in-a-long-campaign",
    "how-do-you-run-a-campaign-when-you-only-play-once-a-month",
    "how-do-you-organise-rpg-campaign-notes",
    "how-do-you-prep-a-weekly-rpg-session-quickly",
    "how-much-prep-do-you-need-for-an-rpg-session",
    "how-do-you-track-unresolved-plot-hooks-in-an-rpg-campaign",
    "how-do-you-manage-a-campaign-timeline-in-an-rpg",
    "how-do-i-run-a-successful-session-0",
    "how-much-campaign-lore-should-players-be-expected-to-remember",
  ],
  discovery: {
    id: "answer-session-recap",
    parentCluster: "session-prep",
    clusters: ["campaign-memory"],
    primaryIntent: "how do you recap a ttrpg session",
    intentAliases: [
      "how to recap a d&d session",
      "rpg session recap tips",
      "how long should a campaign recap be",
      "what should be in a ttrpg recap",
      "how to start a session recap",
    ],
    uniqueValue:
      "A five-point 60–90 second recap framework (location, active threat, party goal, relevant NPCs, one consequence), concrete delivery techniques including telling characters what players themselves have forgotten, and a worked concise-vs-overlong comparison, in place of the instinct toward an exhaustive chronological retelling.",
    relatedIntents: [
      "answer-campaign-memory-hub",
      "answer-campaign-notes",
      "answer-session-prep",
      "answer-npc-relationships",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-campaign-memory-hub",
        reason:
          "The campaign-memory hub page is the broad framework across a whole campaign's lifespan; this answer is the narrow, tactical piece of it — the specific ritual delivered at the start of a session.",
      },
      {
        with: "answer-session-prep",
        reason:
          "Session prep covers what the GM readies before the table sits down; this answer covers the recap ritual delivered at the start of the session itself, once play has already begun.",
      },
    ],
  },
  seo: {
    title: "How do you recap a TTRPG session? | Codex Cryptica",
    description:
      "Keep session recaps to 60-90 seconds: the five things that belong in one, how to deliver it without a memory quiz, and a concise-vs-overlong worked example.",
    image:
      "https://assets.codexcryptica.com/og/how-do-you-recap-a-ttrpg-session.jpg",
    imageAlt:
      "A Game Master at a table pointing to a short handwritten recap card beside an open campaign notebook",
  },
};
