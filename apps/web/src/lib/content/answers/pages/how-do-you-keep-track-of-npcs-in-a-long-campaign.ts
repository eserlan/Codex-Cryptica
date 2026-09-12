import type { AnswerConfigInput } from "../schema";

export const howDoYouKeepTrackOfNpcsInALongCampaign: AnswerConfigInput = {
  slug: "how-do-you-keep-track-of-npcs-in-a-long-campaign",
  category: "campaign-notes",
  publishedAt: "2026-09-10",
  question: "How do you keep track of NPCs in a long campaign?",
  kind: "how-to",
  shortAnswer:
    "Give every NPC who might return a short, standing record: name and role, what they want, where and when the party last saw them, their current status, and one open thread with them. Update it the moment something changes rather than reconstructing it later, and most minor NPCs never need more than that one line. The record's job is to answer 'who is this again?' in five seconds mid-session, not to be a biography.",
  sections: [
    {
      kind: "prose",
      heading: "The problem is recall, not existence",
      paragraphs: [
        "An NPC does not stop existing between the session they were introduced in and the session they come back thirty sessions later; the problem is that nobody can hold thirty sessions of minor characters in working memory. A player says 'wait, didn't we meet her before?' and the table stalls while the GM flips through old notes looking for a name that might be in session 6, session 14, or nowhere at all.",
        "The fix is not more detail per NPC. A dense biography for every NPC you generate is exactly as unusable as no record at all, because nobody has time to read it mid-scene. The fix is a short record, kept for the NPCs who might plausibly return, updated at the moment it changes.",
      ],
    },
    {
      kind: "list",
      heading: "The minimum useful NPC record",
      intro:
        "Five fields, none of them long. If you cannot fill a field in one sentence, you are writing a biography instead of a record.",
      items: [
        {
          term: "Name and role",
          text: "Who they are and their function in the world: the harbourmaster, the fence, the captain's estranged brother. This is what the table actually calls them by, not a full title nobody uses.",
        },
        {
          term: "What they want",
          text: "One concrete thing, stated as a goal rather than a personality trait. 'Wants her smuggling debt forgiven' is usable; 'greedy and cynical' is not, because it does not tell you what she does next.",
        },
        {
          term: "Last seen",
          text: "Session number or date, where, and what happened. This single field solves most 'didn't we meet them before?' moments on its own, because it turns a vague memory into a specific scene you can describe back to the table.",
        },
        {
          term: "Current status",
          text: "Alive, dead, moved on, imprisoned, promoted, hostile now instead of friendly. Status changes are exactly the facts that get forgotten, because they happened off-page between sessions rather than in a scene anyone wrote down.",
        },
        {
          term: "One open thread",
          text: "A single unresolved thing between this NPC and the party: a debt, a promise, a grudge, a question they asked that was never answered. Not a list. If there are several, the NPC has graduated past a minimal record.",
        },
      ],
    },
    {
      kind: "example",
      heading: "A minor NPC, thin record versus useful record",
      paragraphs: [
        "A dockside fixer named Corr Yale, met once in session 4 and referenced again by another NPC in session 22.",
      ],
      items: [
        {
          term: "Thin record",
          text: "'Corr Yale, dockside contact.' Eighteen sessions later this tells the GM nothing: not what he wanted, not why the party dealt with him, not whether he is still owed anything.",
        },
        {
          term: "Useful record",
          text: "'Corr Yale, dockside fixer. Wants a clean exit from the smuggling trade. Last seen: session 4, Low Wharf, sold the party a false manifest. Status: alive, still working the docks. Open thread: owes the party one favour for not reporting the manifest forgery.'",
        },
        {
          term: "Why it works",
          text: "Every field in the useful version answers a question the table might actually ask in session 22: why does he know us, what does he want now, and is there unfinished business worth using. None of it required rereading session 4's full notes.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Update at the moment it changes, not afterwards",
      paragraphs: [
        "The habit that keeps this workable is updating the record during or immediately after the session it changes in, not from memory a week later. A one-line status change (alive to dead, ally to hostile) takes seconds to write down in the moment and is nearly impossible to reconstruct accurately from memory once three more sessions have happened.",
        "Most NPCs your table meets never need more than name, role, and one line. Only promote an NPC to a fuller record once they actually recur: a second meeting, a name a player writes down unprompted, or a plan that depends on them still being alive. Writing full records for every NPC before you know which ones matter is the same mistake as the dense biography, just spread across more pages instead of one.",
        "Relationships between NPCs, and between an NPC and the party, are worth recording separately once they exist rather than folded into this record as a list; a directed link with a reason holds up better over a long campaign than an 'allies' field that has to be edited on every page it appears on.",
      ],
    },
    {
      kind: "checklist",
      heading: "Signs the NPC records are doing their job",
      items: [
        "You can answer 'who is this again?' from the record alone, without rereading old session notes.",
        "Every field is one sentence or shorter.",
        "Status changes (alive, dead, hostile, moved on) are current as of the last session they happened in.",
        "Each record names at most one open thread, not a running list.",
        "Minor NPCs stay at name-role-one-line until they actually recur.",
      ],
    },
  ],
  codexConnection: {
    heading: "One entity, edited in place",
    paragraphs: [
      "In Codex, an NPC is a single character entity you edit in place rather than a note buried in a session log, so the last-seen line and current status live exactly where you will look for them next time the NPC comes up. Labels give you a fast way to mark status at a glance (alive, hostile, deceased) across dozens of characters without opening each one.",
      "Relationships and open threads between NPCs are separate typed links rather than fields restated on every page, so a debt, a grudge, or a promise stays a single fact you edit once and see from either side.",
    ],
    linkText: "See the campaign manager",
    href: "/solutions/campaign-manager",
  },
  relatedTools: [
    {
      title: "NPC generator",
      description:
        "Free, no login. Produces a name, role, and want you can drop straight into a minimal record.",
      href: "/generators/npc",
    },
    {
      title: "RPG NPC generator",
      description:
        "System-agnostic NPCs for any genre, straight in the browser.",
      href: "/tools/rpg-npc-generator",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for D&D",
      description:
        "Recurring characters, changing status, and open threads kept current across a long Dungeons & Dragons campaign.",
      href: "/for/dungeons-and-dragons",
    },
  ],
  relatedAnswers: [
    "how-do-you-help-players-remember-what-happened-in-a-ttrpg-campaign",
    "how-do-you-recap-a-ttrpg-session",
    "how-do-you-organise-rpg-campaign-notes",
    "how-do-you-organise-npc-relationships",
    "how-do-you-track-unresolved-plot-hooks-in-an-rpg-campaign",
    "how-do-you-make-npcs-memorable-without-lots-of-prep",
    "how-do-you-improvise-npcs-on-the-spot",
  ],
  discovery: {
    id: "answer-track-npcs-long-campaign",
    parentCluster: "campaign-notes",
    clusters: ["campaign-memory"],
    primaryIntent: "how do you keep track of npcs in a long campaign",
    intentAliases: [
      "how to remember npcs across sessions",
      "npc tracking system for rpg campaigns",
      "recurring npc record rpg",
      "how do you keep track of npcs in a campaign",
    ],
    uniqueValue:
      "A five-field minimum NPC record (name/role, want, last seen, status, one open thread) focused on recall across dozens of sessions, distinct from relationship-linking, the general campaign-notes system, and plot-hook lifecycle tracking.",
    relatedIntents: [
      "generator-npc",
      "solution-campaign-manager",
      "answer-campaign-memory-hub",
      "answer-session-recap",
      "answer-campaign-notes",
      "answer-npc-relationships",
      "answer-unresolved-plot-hooks",
      "answer-npcs-memorable",
      "answer-npcs-improvise-on-the-spot",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-campaign-memory-hub",
        reason:
          "The campaign-memory hub covers recap, reference habits, and memory across the whole campaign; this answer is the narrow, NPC-specific record format the hub links out to rather than restates.",
      },
      {
        with: "answer-campaign-notes",
        reason:
          "The campaign-notes answer covers the general entity/session-log/prep system for every kind of note; this answer is the narrower, NPC-specific application: exactly which fields a single NPC record needs to survive a long campaign.",
      },
      {
        with: "answer-npc-relationships",
        reason:
          "The relationships answer owns how to record directed links between NPCs; this answer owns the standing record for a single NPC (want, last seen, status, one open thread) and defers to the relationships answer rather than restating its framework.",
      },
      {
        with: "answer-unresolved-plot-hooks",
        reason:
          "The plot-hooks answer owns the full lifecycle framework for tracked hooks attached to any entity; this answer keeps only a single 'open thread' field per NPC and defers to the plot-hooks answer once an NPC's thread needs that fuller treatment.",
      },
    ],
  },
  seo: {
    title: "How Do You Keep Track of NPCs in a Long Campaign? | Codex Cryptica",
    description:
      "A five-field minimum NPC record for long campaigns: name/role, want, last seen, status, and one open thread. A worked example and when to stop.",
    image:
      "https://assets.codexcryptica.com/og/how-do-you-keep-track-of-npcs-in-a-long-campaign.jpg",
    imageAlt:
      "A game master's desk with handwritten index cards connected by string beside a well-worn campaign notebook and dice",
  },
};
