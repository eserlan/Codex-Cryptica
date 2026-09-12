import type { AnswerConfigInput } from "../schema";

export const howDoYouRunACampaignWhenYouOnlyPlayOnceAMonth: AnswerConfigInput =
  {
    slug: "how-do-you-run-a-campaign-when-you-only-play-once-a-month",
    category: "campaign-notes",
    publishedAt: "2026-09-12",
    question: "How do you run a campaign when you only play once a month?",
    kind: "framework",
    shortAnswer:
      "A monthly campaign isn't a weekly campaign played badly — it needs a different information rhythm. Run shorter arcs with a clear session endpoint instead of open-ended threads, end each session with one stated next objective, and open the next one with a short recap focused only on what's active now. Keep a short list of the NPCs, factions, and threads currently in play rather than a long write-up nobody rereads, lean on memorable, recurring hooks instead of dense lore, and freely restate anything the characters would obviously still know. The goal is to make each session self-sufficient rather than dependent on players remembering the last one in detail.",
    sections: [
      {
        kind: "prose",
        heading: "A monthly game is a different shape, not a weaker one",
        paragraphs: [
          "The instinct is to treat a monthly campaign as a weekly one with more forgetting to compensate for — a longer recap, more detailed notes, more reminders. This mostly fails, because the amount a table can hold onto between sessions doesn't scale down gracefully from weekly play; a four-week gap loses far more than four times what a one-week gap loses.",
          "The fix isn't compensating harder for the same structure. It's a structure built for the gap: shorter arcs with real endpoints, one objective carried between sessions instead of several open threads, and information delivered in a form that survives a month of not thinking about the campaign at all.",
        ],
      },
      {
        kind: "list",
        heading: "Structural adjustments for infrequent play",
        items: [
          {
            term: "Shorter arcs with a real endpoint",
            text: "Prefer arcs that resolve in one to three sessions over sprawling multi-month plots. A finished arc doesn't need to be remembered in detail next month; an unresolved one does.",
          },
          {
            term: "One active objective, not several",
            text: "End each session with a single clear next objective, stated out loud. Multiple simultaneous open threads are exactly what a month-long gap erodes fastest.",
          },
          {
            term: "Recurring hooks over dense lore",
            text: "A consistent title, symbol, or verbal tic for anything that needs to be remembered does more work than a paragraph of backstory. Repetition across sessions survives a gap; detail alone does not.",
          },
        ],
      },
      {
        kind: "list",
        heading: "Between-session habits that preserve momentum",
        items: [
          {
            term: "End with a stated next objective",
            text: "Before the table breaks, say out loud what the party is doing next. This single habit does more for a monthly game's continuity than any amount of note-taking.",
          },
          {
            term: "Open with a short, now-focused recap",
            text: "Cover only what's relevant to tonight — see the recap answer linked below for the full framework. A monthly game benefits from this more than a weekly one, not less.",
          },
          {
            term: "Keep a short active-cast list, not a full log",
            text: "The NPCs, factions, and locations actually in play right now, one line each. Skimmable at the table beats a chronological history nobody has time to reread before a session.",
          },
          {
            term: "Make it searchable, not just written down",
            text: "A month later, nobody remembers which session a detail was in. Being able to look a name up directly matters more here than in a weekly game where the last session is still fresh.",
          },
          {
            term: "Restate what characters would know",
            text: "Freely remind players of anything their characters would obviously still know. A month's gap makes this more necessary, not a sign the table isn't paying attention.",
          },
        ],
      },
      {
        kind: "example",
        heading: "The same plot, structured for weekly versus monthly play",
        paragraphs: [
          "A political intrigue plot involving a forged inheritance claim and three competing noble houses.",
        ],
        items: [
          {
            term: "Weekly structure",
            text: "A slow-burn arc across eight sessions: gathering evidence, courting allies, uncovering the forgery in stages, with several threads open simultaneously across houses. Works because the table revisits it every week while it's fresh.",
          },
          {
            term: "Monthly structure",
            text: "The same premise split into three self-contained sessions, each with its own objective and endpoint: expose the forger's contact (session one, resolved), win over one house's support (session two, resolved), confront the claimant at the succession hearing (session three, resolved). Each session ends cleanly; only the overall stakes carry forward.",
          },
          {
            term: "Why it works",
            text: "The monthly version never depends on the party remembering session one's details by session three — each session stands on its own, and the connective tissue is one sentence of stated next objective, not accumulated plot detail.",
          },
        ],
      },
      {
        kind: "checklist",
        heading: "Running a monthly campaign",
        items: [
          "Your current arc resolves in one to three sessions rather than stretching across many months.",
          "Every session ends with one clearly stated next objective.",
          "Every session opens with a short recap focused on what's active tonight.",
          "You have a short, skimmable active-cast list rather than a long chronological log.",
          "You can look up a past NPC, faction, or location quickly, without needing to remember which session it was in.",
          "You restate what characters would know rather than expecting a month-old detail to be recalled cold.",
        ],
      },
    ],
    codexConnection: {
      heading: "A fast refresher after a long gap",
      paragraphs: [
        "Because entities and their connections persist in the vault regardless of how long ago they were created, coming back after a month means the active-cast list and connections are exactly as current as you left them, without rereading old session notes to reconstruct where things stood. Search (Cmd+K) finds anything by name in seconds, whether it was introduced last week or four months ago.",
        "It doesn't decide which arcs to shorten or which objective to end a session on — that structural judgement is still the GM's, month to month.",
      ],
      linkText: "See the campaign manager",
      href: "/solutions/campaign-manager",
    },
    relatedTools: [
      {
        title: "RPG knowledge graph",
        description:
          "NPCs, factions, and locations kept connected and searchable, so a month-old detail is a lookup away instead of a reread of old notes.",
        href: "/solutions/rpg-knowledge-graph",
      },
    ],
    relatedAnswers: [
      "how-do-you-help-players-remember-what-happened-in-a-ttrpg-campaign",
      "how-do-you-recap-a-ttrpg-session",
      "how-do-you-keep-track-of-npcs-in-a-long-campaign",
      "how-much-campaign-lore-should-players-be-expected-to-remember",
      "how-do-you-organise-rpg-campaign-notes",
    ],
    discovery: {
      id: "answer-monthly-campaign",
      parentCluster: "campaign-notes",
      clusters: ["campaign-memory"],
      primaryIntent:
        "how do you run a campaign when you only play once a month",
      intentAliases: [
        "monthly dnd campaign tips",
        "play rpg once a month",
        "how to keep campaign momentum between sessions",
        "players forget between sessions",
        "irregular rpg schedule advice",
      ],
      uniqueValue:
        "Structural techniques specific to monthly/infrequent cadence — shorter arcs with real endpoints, one carried objective instead of several open threads — rather than generic scheduling advice, plus a worked weekly-vs-monthly restructuring of the same plot.",
      relatedIntents: [
        "answer-campaign-memory-hub",
        "answer-session-recap",
        "answer-track-npcs-long-campaign",
        "answer-lore-memory-expectations",
      ],
      acknowledgedOverlap: [
        {
          with: "answer-session-recap",
          reason:
            "The recap answer covers the 60-90 second ritual at the start of any session; this answer covers the broader structural choices (arc length, objective handoff) that a monthly cadence specifically needs, and points to the recap answer for the session-opening piece rather than repeating it.",
        },
      ],
    },
    seo: {
      title: "Running an RPG campaign once a month | Codex Cryptica",
      description:
        "A monthly campaign needs a different structure, not more compensating: shorter arcs with real endpoints, one carried objective, and a worked weekly-vs-monthly example.",
      image:
        "https://assets.codexcryptica.com/og/how-do-you-run-a-campaign-when-you-only-play-once-a-month.jpg",
      imageAlt:
        "A calendar with one RPG session marked per month beside a short one-page campaign reference sheet",
    },
  };
