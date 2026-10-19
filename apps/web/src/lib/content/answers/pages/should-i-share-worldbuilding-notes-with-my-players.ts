import type { AnswerConfigInput } from "../schema";

export const shouldIShareWorldbuildingNotesWithMyPlayers: AnswerConfigInput = {
  slug: "should-i-share-worldbuilding-notes-with-my-players",
  category: "worldbuilding",
  publishedAt: "2026-10-16",
  question: "Should I share worldbuilding notes and lore with my players?",
  kind: "framework",
  shortAnswer:
    "Yes, selectively: share what the characters plausibly know, including attributed rumours and useful details about places and people, in a short primer they can skim. Keep unrevealed truths private, and treat the notes as an invitation to play rather than required reading. Anything the party needs to make a decision should also come up at the table, so play works for someone who never opened the document.",
  sections: [
    {
      kind: "prose",
      heading: "A reference is not the scene",
      paragraphs: [
        "Sharing lore does not break show, don't tell, because the two do different jobs. A short entry can explain that the town of Millbrook holds a harvest festival each autumn, that stalls close at dusk, and that visitors are expected to bring a loaf for the communal table. That is reference material. It gives every character a plausible reason to know what the festival is before anyone has to improvise ignorance for the sake of a reveal.",
        "Attending is the scene: the smell of the bake, a miller arguing over flour, a child daring a character to enter the greased-pole contest, or a stranger watching who gives generously. A brief detail about the festival's atmosphere or an NPC's openly stated aim can still help players picture it; leave the unfolding encounter and unrevealed intentions for play.",
        "Ask whether a detail helps players make sense of the setting or choose what to do, and whether their characters could know it now. Share it if so, with uncertainty attributed where needed. Keep unresolved causes and outcomes private until play reveals them.",
      ],
    },
    {
      kind: "table",
      heading: "Three layers of information",
      headers: ["Layer", "Examples", "Where it belongs"],
      rows: [
        [
          "Common knowledge",
          "Town names and layout, local customs, visible factions and what they openly want, seasonal events, widely known history that affects daily life",
          "Safe to share before play, in the primer or wiki",
        ],
        [
          "Character-known specifics",
          "Attributed rumours, contested accounts, a faction's changing interests, or facts the characters have discovered",
          "Share when the characters plausibly know it, before or after play; mark uncertain claims as uncertain",
        ],
        [
          "GM-only truths",
          "An undiscovered cause, concealed motive, twist, or betrayal",
          "Keep it private until the characters uncover it; then add confirmed knowledge to the reference",
        ],
      ],
    },
    {
      kind: "prose",
      heading: "Keep the spoiler boundary boring and explicit",
      paragraphs: [
        "Most accidental spoilers come from filing, not from intent. A single notebook that mixes a public town description with the secret underneath it will leak the moment you share the wrong page, export the wrong folder, or read aloud one paragraph too far. Keep the player-facing text in its own pages or its own document, written in its own words, rather than sharing a view of your working notes with the secrets hidden or collapsed.",
        'Label uncertainty where it matters. "People in Millbrook say" signals a rumour; a confirmed discovery can be added plainly once the characters know it.',
      ],
    },
    {
      kind: "list",
      heading: "Build a useful player reference",
      intro:
        "Start with a short primer, then add relevant detail as players ask or the characters learn more:",
      items: [
        {
          term: "Keep the useful facts easy to find",
          text: "Use short sections and organise by place, faction, and upcoming event. Lead with where the party is, what is happening now, and customs or laws that could affect a choice; move distant history behind links.",
        },
        {
          term: "Optional depth behind links",
          text: "Put longer entries one click or one page behind the primer: a settlement, a faction, a festival, or a faith the party is about to meet. Keep the primer useful on its own, and share it through a handout, wiki, shared folder, or the notes tool you already use.",
        },
        {
          term: "Include what characters could know now",
          text: "Public wants, evocative details, and rumours already circulating can orient players before a scene. Attribute uncertain claims and leave unresolved causes or outcomes open.",
        },
        {
          term: "Add discoveries as they become known",
          text: "When the characters confirm a rumour or uncover a cause, update the reference with what they learned. Keep only information still unknown to them in the private layer.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "If a player skips the notes",
      paragraphs: [
        'Some players will not read between sessions. That is fine: separate player memory from character knowledge. A player may not know visitors bring a loaf to the harvest festival, but their character probably does. Say, "You would know visitors usually bring something for the communal table; the baker by the gate sells small loaves for exactly that."',
        "Anything needed for a decision still needs to surface at the table. A reminder can give a player who skipped the primer the same chance to act, without turning the notes into required reading or a test.",
      ],
    },
    {
      kind: "example",
      heading: "One festival, three layers",
      paragraphs: [
        "The party is travelling to Millbrook and will arrive the day before its harvest festival. The same setting fact is prepared three ways, for three different audiences.",
      ],
      items: [
        {
          term: "Player-facing entry, shared before play",
          text: '"Millbrook holds a harvest festival each autumn. Stalls close at dusk, visitors are expected to bring a loaf for the communal table, and the millers\' guild judges the best bake. The road in is busy all week." Any character could know this, and it gives players concrete things to do: buy a loaf, enter a bake, watch the road.',
        },
        {
          term: "Attributed rumour, known before the session",
          text: 'A player-facing note might add: "Some Millbrook bakers say judge Mara Venn has promised the prize to entrant Pell Doran." The characters heard the talk on the road, but it remains a claim, not a confirmed fact. They can ignore it, investigate, or repeat it.',
        },
        {
          term: "Undiscovered GM truth",
          text: "In your private notes, Mara has accepted a purse from Pell to award him the prize. Pell wants the festival's best-bake title to bring customers to his bakery; Mara wants the money. Keep the bribe private until the characters uncover it, then add the confirmed facts to their reference.",
        },
        {
          term: "Why it works",
          text: "The entry gives the players customs, atmosphere, and a rumour their characters could already have heard. The bribe remains unknown until play reveals it. The party can investigate, expose Mara or Pell, enter despite the risk, or ignore the affair; none of those choices guarantees the prize.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Before you share a primer or wiki page",
      items: [
        "Each entry reflects what the characters could plausibly know now; attribute rumours and disputed accounts.",
        "Keep causes, motives, and twists private only while they remain undiscovered; add confirmed discoveries to the reference.",
        "Keep the primer short and relevant, with optional depth behind links.",
        "Anything needed to make a decision will also come up at the table, including reminders when a character knows something their player missed.",
      ],
    },
  ],
  codexConnection: {
    heading: "A practical place to keep the reference",
    paragraphs: [
      "Keep player-facing pages separate from private prep, using whatever handout, wiki, shared folder, or notes tool you already have. Codex Cryptica's read-only guest snapshot excludes drafts and entities hidden by guest visibility settings, including entities with the “hidden” label or those excluded by a hidden default visibility setting. Review the snapshot before sharing.",
    ],
    linkText: "See the campaign manager",
    href: "/solutions/campaign-manager",
  },
  relatedTools: [
    {
      title: "RPG knowledge graph",
      description:
        "Settlements, factions, and NPCs as connected entities, so the public facts about a place and the rumours around it are easy to find and copy into a player-facing page.",
      href: "/solutions/rpg-knowledge-graph",
    },
    {
      title: "Campaign manager",
      description:
        "A place to organise campaign notes by settlement, faction, and session, which makes keeping a short public layer separate from private prep more manageable.",
      href: "/solutions/campaign-manager",
    },
  ],
  relatedAnswers: [
    "how-much-campaign-lore-should-players-be-expected-to-remember",
    "how-do-you-help-players-remember-what-happened-in-a-ttrpg-campaign",
    "how-do-i-get-players-to-engage-with-my-campaign-world",
    "how-do-i-run-a-successful-session-0",
    "how-do-you-start-worldbuilding-from-scratch",
    "how-do-you-organise-rpg-campaign-notes",
    "how-do-you-recap-a-ttrpg-session",
    "how-do-i-run-my-first-online-tabletop-rpg-session",
  ],
  discovery: {
    id: "answer-share-worldbuilding-notes",
    parentCluster: "worldbuilding",
    clusters: ["worldbuilding", "campaign-notes"],
    primaryIntent:
      "should i share worldbuilding notes and lore with my players",
    intentAliases: [
      "should i give my d&d players worldbuilding notes",
      "should gms share lore with players",
      "player-facing campaign wiki",
      "player-facing setting primer",
      "how much lore should i give players before a campaign",
      "show don't tell worldbuilding notes rpg",
      "should you give notes to your players rpg",
    ],
    uniqueValue:
      "A three-layer test for deciding what to publish (common knowledge, character-known specifics, GM-only truths), a worked harvest festival example with an attributed rumour, and an explicit no-required-reading rule that separates player memory from character knowledge.",
    relatedIntents: [
      "answer-lore-memory-expectations",
      "answer-campaign-memory-hub",
      "answer-player-engagement",
      "answer-session-zero",
      "answer-campaign-notes",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-lore-memory-expectations",
        reason:
          "That answer covers how much lore players can fairly be expected to recall between sessions. This answer covers the earlier decision: what to publish before and between sessions, what to hold back for discovery, and how to keep play working for players who never read it.",
      },
      {
        with: "answer-campaign-memory-hub",
        reason:
          "The campaign memory hub covers techniques for helping players retain what happened in play. This answer covers making setting lore available up front as a primer or wiki, with a spoiler boundary between public, discoverable, and GM-only information.",
      },
    ],
  },
  seo: {
    title: "Should I share worldbuilding notes with players? | Codex Cryptica",
    description:
      "Share what characters know, including attributed rumours and setting details; keep undiscovered truths private. A three-layer guide, festival example, and no required reading.",
    image:
      "https://assets.codexcryptica.com/og/should-i-share-worldbuilding-notes-with-my-players.jpg",
    imageAlt:
      "A GM handing a short illustrated setting primer across a gaming table to players, with a thicker private notebook kept closed beside it",
  },
};
