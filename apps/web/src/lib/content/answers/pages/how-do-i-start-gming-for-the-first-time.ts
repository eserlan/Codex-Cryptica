import type { AnswerConfigInput } from "../schema";

export const howDoIStartGmingForTheFirstTime: AnswerConfigInput = {
  slug: "how-do-i-start-gming-for-the-first-time",
  category: "getting-started",
  publishedAt: "2026-09-12",
  question: "How do I start GMing for the first time?",
  kind: "framework",
  shortAnswer:
    "Pick a system or a beginner-friendly published scenario you can actually run soon, prepare the next session rather than an entire world, and hold at least a short Session 0 to align expectations before play. Build only the NPCs, places, factions, and conflicts the players are likely to encounter, expect them to go off script and prepare situations rather than a fixed plot, and focus on clear choices, pacing, and spotlight over elaborate lore or performance. After the first session, keep only the notes that actually became real at the table. You do not need voices, acting skill, encyclopedic rules knowledge, or hours of prep to run a good first session.",
  sections: [
    {
      kind: "prose",
      heading: "You don't need to be a performer",
      paragraphs: [
        "The intimidating version of GMing, the one with character voices, encyclopedic rules mastery, and a binder of prepared lore, is optional flourish that experienced GMs add over years, not a prerequisite for running a good first session. A first session with plain narration, a handful of clear choices, and honest improvisation when players surprise you is a genuinely good session.",
        "The actual skill a first-time GM needs is smaller than it looks: know roughly what's in the room, know what the people in it want, and be willing to say \"let's find out\" when the players do something you didn't plan for. Everything else can be learned session by session.",
      ],
    },
    {
      kind: "list",
      heading: "Seven steps to your first session",
      intro: "In roughly this order.",
      items: [
        {
          term: "Pick something you can run soon",
          text: "A system or a beginner-friendly published scenario, not the perfect homebrew concept you'd need months to build. Running something imperfect this month teaches you more than planning something ideal you never start.",
        },
        {
          term: "Prepare the next session, not a world",
          text: "You need enough for three to four hours of play, not a setting bible. A page of notes covering the immediate situation is enough to start.",
        },
        {
          term: "Hold at least a short Session 0",
          text: "Even twenty minutes to align on tone, safety, and what everyone wants from the game prevents most early friction. See the Session 0 answer linked below for a fuller framework.",
        },
        {
          term: "Build only what players will likely encounter",
          text: "The NPCs, places, factions, and conflicts actually in scope for the opening scenes. Everything else can be invented later, once you know what the party actually cares about.",
        },
        {
          term: "Expect the party to go off script",
          text: "Prepare situations with people who want things, not a fixed plot with one correct path. When players surprise you, that's the game working, not a failure of prep.",
        },
        {
          term: "Prioritise choices, pacing, and spotlight",
          text: "Over elaborate lore or a polished performance. A session with clear decisions and even attention beats one with beautiful description and nothing for the players to actually decide.",
        },
        {
          term: "Keep only what became real",
          text: "After the session, note the names, places, and threads the players actually engaged with. Discard the rest rather than carrying forward material nobody touched.",
        },
      ],
    },
    {
      kind: "list",
      heading: "What you genuinely don't need",
      items: [
        {
          term: "Character voices or acting skill",
          text: 'A different tone of your own voice, or just saying "the guard says" before the line, works fine. Voices are a flourish some GMs enjoy adding later, not a requirement.',
        },
        {
          term: "Encyclopedic rules knowledge",
          text: "Know the basics well enough to run a scene, and look up or improvise the rest. Nobody at the table expects you to have the entire rulebook memorised on session one.",
        },
        {
          term: "Extensive worldbuilding",
          text: "A world only needs to exist as far as the players have actually gone. Build outward from there, session by session, not upfront.",
        },
        {
          term: "Props, music, or a big budget",
          text: "These can add atmosphere for GMs who enjoy building them, but they change nothing about whether the choices and pacing at the table are good.",
        },
      ],
    },
    {
      kind: "example",
      heading: "A genuinely minimal first-session prep packet",
      paragraphs: [
        "Everything a first-time GM needs to run an opening session investigating a break-in at a merchant's warehouse, written in the time it takes to read this paragraph twice.",
      ],
      items: [
        {
          term: "Situation",
          text: "A warehouse was broken into overnight. The owner, Mira Kessel, wants it investigated quietly before her business partners hear about it.",
        },
        {
          term: "People",
          text: "Mira wants discretion above all. The night watchman, half-asleep on duty, is too embarrassed to admit he saw anything.",
        },
        {
          term: "What's actually there",
          text: "A forced side door, a missing crate of manifests, and a torn scrap of cloth caught on the frame.",
        },
        {
          term: "If the party does nothing useful",
          text: "Mira hires a second, less careful investigator in two days, and the truth comes out messily instead of quietly.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Before your first session",
      items: [
        "You've picked a system or scenario you can actually run within the next few weeks.",
        "You've held or scheduled at least a short Session 0 to align expectations.",
        "Your prep covers the immediate situation, not the whole setting.",
        "You know what the two or three people in the opening scene want.",
        "You're prepared to improvise if the party doesn't take the path you expected.",
        "You know what you'll keep and what you'll discard from your notes after the session.",
      ],
    },
  ],
  codexConnection: {
    heading: "Somewhere for the notes that become real",
    paragraphs: [
      "Once a session produces NPCs, places, and threads worth keeping, a vault gives them somewhere to live as connected entities rather than a growing pile of scattered notes: a name from session one stays findable and linkable to whatever it connects to by session ten.",
      "It doesn't decide what to prepare for tonight or how to handle the table going off script. Those judgement calls are the GM's, especially in the first few sessions.",
    ],
    linkText: "See the campaign manager",
    href: "/solutions/campaign-manager",
  },
  relatedTools: [
    {
      title: "RPG NPC generator",
      description:
        "A quick name, role, and want for the two or three people your opening scene actually needs.",
      href: "/tools/rpg-npc-generator",
    },
  ],
  relatedAnswers: [
    "where-do-i-start-if-i-have-never-played-a-tabletop-rpg",
    "how-do-i-run-a-successful-session-0",
    "how-much-prep-do-you-need-for-an-rpg-session",
    "how-do-you-prep-a-weekly-rpg-session-quickly",
    "how-do-you-handle-players-going-off-script-as-a-gm",
    "how-do-i-get-players-to-engage-with-my-campaign-world",
    "how-do-you-start-worldbuilding-from-scratch",
    "how-do-you-organise-rpg-campaign-notes",
    "how-do-you-organise-npc-relationships",
    "how-do-you-make-a-tabletop-rpg-session-more-engaging",
  ],
  discovery: {
    id: "answer-first-time-gm-hub",
    parentCluster: "getting-started",
    clusters: ["first-time-gm"],
    primaryIntent: "how do i start gming for the first time",
    intentAliases: [
      "how to start dming for the first time",
      "first time gm guide",
      "beginner dungeon master tips",
      "how do i become a game master",
      "how to run my first rpg session",
      "first time dm what do i need",
    ],
    uniqueValue:
      "The beginner-GM entry point: a seven-step path to a first session, an explicit list of what a new GM genuinely doesn't need (voices, rules mastery, worldbuilding, props), and a worked minimal prep packet, routing into the deeper existing session-prep and campaign-organisation answers rather than duplicating them.",
    relatedIntents: [
      "answer-beginner-start",
      "answer-session-zero",
      "answer-session-prep",
      "answer-session-engagement",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-beginner-start",
        reason:
          "That answer is for a first-time player wondering how to get into the hobby; this answer is for someone specifically taking on the GM role, a distinct and narrower intent.",
      },
      {
        with: "answer-session-engagement",
        reason:
          "The session-engagement answer is the deeper technique page on making play itself compelling; this hub is the broader beginner path and links out to it rather than duplicating its content.",
      },
    ],
  },
  seo: {
    title: "How do I start GMing for the first time? | Codex Cryptica",
    description:
      "A seven-step path to your first GMed session, what you genuinely don't need (voices, rules mastery, worldbuilding), and a worked minimal prep example.",
    image:
      "https://assets.codexcryptica.com/og/how-do-i-start-gming-for-the-first-time.jpg",
    imageAlt:
      "A first-time Game Master with a single page of notes at a table, players' character sheets spread out ready to begin",
  },
};
