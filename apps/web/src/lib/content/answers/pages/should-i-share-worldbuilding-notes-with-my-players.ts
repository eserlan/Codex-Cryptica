import type { AnswerConfigInput } from "../schema";

export const shouldIShareWorldbuildingNotesWithMyPlayers: AnswerConfigInput = {
  slug: "should-i-share-worldbuilding-notes-with-my-players",
  category: "worldbuilding",
  publishedAt: "2026-10-16",
  question: "Should I share worldbuilding notes and lore with my players?",
  kind: "framework",
  shortAnswer:
    "Yes, selectively: share the public knowledge your players' characters would plausibly have, in a short primer they can skim, and keep anything secret or still to be discovered out of it. Treat the notes as an invitation to play, never as required reading. Anything the party must know to make a decision has to be said or shown at the table as well, so the session works in full for a player who never opened the document.",
  sections: [
    {
      kind: "prose",
      heading: "A reference is not the scene",
      paragraphs: [
        "Sharing lore does not break show, don't tell, because the two do different jobs. A short entry can explain that the town of Millbrook holds a harvest festival each autumn, that stalls close at dusk, and that visitors are expected to bring a loaf for the communal table. That is reference material. It gives every character a plausible reason to know what the festival is before anyone has to improvise ignorance for the sake of a reveal.",
        "Attending the festival is the scene: the smell of the bake, a miller arguing about the price of flour, a child daring a character to enter the greased-pole contest, a stranger watching who gives generously and who does not. None of that lands in a handout, and none of it should. Write the entry so a player who reads it arrives curious about what will happen at the festival, not feeling they have already been to it.",
        "A useful test is whether a note creates a choice or closes one down. Notes that name a custom, a visible faction, or a coming event open choices, because players can plan around them, dress for them, or decide to avoid them. Notes that narrate what a place feels like, what an NPC secretly intends, or how a conflict will resolve tend to do the scene's work badly in advance. Cut those back to what a character could observe or be told.",
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
          "Discoverable knowledge",
          "Rumours, local secrets, contested versions of history, a faction's changing interests, who is quietly feuding with whom",
          "Reveal through play first, then add it to the reference as the characters learn it",
        ],
        [
          "GM-only truths",
          "The real cause behind an event, a conspiracy, hidden NPC motivations, an unrevealed twist or betrayal",
          "Stays in your private notes and never appears in anything players can open",
        ],
      ],
    },
    {
      kind: "prose",
      heading: "Keep the spoiler boundary boring and explicit",
      paragraphs: [
        "Most accidental spoilers come from filing, not from intent. A single notebook that mixes a public town description with the secret underneath it will leak the moment you share the wrong page, export the wrong folder, or read aloud one paragraph too far. Keep the player-facing text in its own pages or its own document, written in its own words, rather than sharing a view of your working notes with the secrets hidden or collapsed.",
        'Label the layers where it helps. A rumour in the player reference should read as a rumour, with wording such as "people in Millbrook say" rather than a flat statement of fact. That protects a later reveal, and it also teaches players something true about play: their characters hear claims, not verified history, and deciding what to believe is part of the game.',
      ],
    },
    {
      kind: "list",
      heading: "How much should you give them?",
      intro:
        "Start with a short campaign primer and add depth only where players ask for it or play reaches it:",
      items: [
        {
          term: "One short primer for the start",
          text: "Cover where the party is, what ordinary life looks like there, the factions they can already see, any custom or law that could cause trouble if ignored, and what their characters would know about why they are here. If it cannot be skimmed in a few minutes, it is carrying history the party does not need yet.",
        },
        {
          term: "Organise by what players can do",
          text: 'Group notes by place, faction, and upcoming event rather than by lore chronology. "What is happening in Millbrook this week, who runs the market, and what visitors are expected to do" gets used. Five hundred years of kings in order mostly does not, however satisfying it was to write.',
        },
        {
          term: "Optional depth behind links",
          text: "Put longer entries one click or one page behind the primer: a settlement, a faction, a festival, a faith the party is about to meet. A keen reader can follow those links. Nobody else is punished for skipping them, because the primer already carried what play requires.",
        },
        {
          term: "Foreshadow, do not pre-play",
          text: "A primer can name a coming fair, a disputed succession, or a road said to be unsafe, without saying how any of it turns out. Naming what is on the horizon gives players something to prepare for and ask about in character. Resolving it on the page takes that away from them.",
        },
        {
          term: "Stop when the next fact needs a scene",
          text: "If the next useful thing is what an NPC wants, what a place feels like at night, or whether a rumour is true, that belongs in play. Add it to the reference after the characters have learned it, so the wiki records discovery rather than replacing it.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "What if nobody reads it?",
      paragraphs: [
        "Plan for that from the start, because some players will not read it, and a few will not read anything between sessions at all. That is not a problem to solve with reminders, guilt, or a quiz at the start of the next session. Players have jobs, families, and other games. A primer that only works when everyone does the reading is a design fault in the primer, not in the table.",
        'Separate player memory from character knowledge. A player who skipped the notes may not know that visitors bring a loaf to the harvest festival, but their character, who grew up two valleys away, probably does. Say so at the table: "You would know visitors usually bring something for the communal table; the baker by the gate sells small loaves for exactly that." The fact arrives in the scene, attached to a choice, which is where it was always going to matter.',
        "Make short reminders a normal part of play rather than a penalty. Name the custom when it becomes relevant, have an NPC mention the faction rivalry while asking for help, and let a character notice the festival bunting going up the day before. A player who did read the primer gets the small pleasure of recognising something. A player who did not gets the same information in time to act on it. Neither is tested on it.",
      ],
    },
    {
      kind: "list",
      heading: "What makes player-facing notes worth opening",
      items: [
        {
          term: "Short and skimmable",
          text: "Headings, short paragraphs, and the useful fact early in each entry. A player checking a faction name on their phone between sessions should find what they need without reading an essay.",
        },
        {
          term: "Relevant to where the party is now",
          text: "Lead with the current town, the factions in play, and the next event on the calendar. Move places the party left behind, or has not reached, further down or behind links so the reference stays about the campaign being played.",
        },
        {
          term: "Spoiler-safe by construction",
          text: "Only common knowledge and things the characters have already learned. If you have to warn yourself not to share a page, that page is in the wrong document.",
        },
        {
          term: "Rumours marked as rumours",
          text: "Attribute uncertain claims to who says them and leave room for them to be wrong, exaggerated, or out of date. Players can then argue about a rumour in character instead of treating the wiki as a statement of truth.",
        },
        {
          term: "Updated after discovery, not before",
          text: "When the party learns that a guild is smuggling, or that a festival custom hides an older rite, add the confirmed version after the session. The reference becomes a record of what the characters know, which makes it worth returning to.",
        },
        {
          term: "Easy to ignore safely",
          text: "Every entry should pass one check: if nobody reads this, does the next session still work? If the answer is no, the fact also needs a moment at the table, and the note is only a backup.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "How to share it without changing tools",
      paragraphs: [
        "Use whatever you already have. A printed or PDF handout works for a primer and for a single settlement the party is about to enter. A simple wiki, a shared folder of Markdown files, or a published view from the note tool you already keep your campaign in works for a reference that grows over time. The format matters far less than the boundary between player-facing pages and your private notes, and far less than whether you will actually keep it updated.",
        "Do not migrate your campaign into a new tool just to share lore. Copy or publish the few public pages, keep your working notes where they are, and update the public copy when play changes what the characters know. If sharing a page takes more than a few minutes, you will stop doing it, and an abandoned wiki from three arcs ago misleads players more than no wiki at all.",
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
          term: "Rumour, uncovered in play",
          text: "At the inn, the characters hear that the millers' guild has already decided who wins this year, and that last year's winner has not spoken to the judges since. It is marked as talk, not fact. The players can ignore it, repeat it, or investigate it, and each choice tells you what they care about.",
        },
        {
          term: "GM-only truth, never published",
          text: "In your private notes, the guild is fixing the contest because a mill owner is paying off a debt to a moneylender who wants the winning mill's contract. No player-facing page mentions the debt, the moneylender, or the fix as fact, so the reveal is still available at the table.",
        },
        {
          term: "Why it works",
          text: "The shared entry made the festival legible before the session, so nobody had to sit through an explanation of what a harvest festival is. The rumour gave the party a reason to talk to people once they arrived. The secret stayed secret, so discovering it, and deciding whether to expose it, expose the moneylender, or simply win the bake anyway, remained a scene the players could shape.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Before you share a primer or wiki page",
      items: [
        "Every fact on the page is something the characters could plausibly know, or have already learned in play.",
        "No conspiracy, hidden motivation, real cause, or unrevealed twist appears anywhere on the page, including in asides.",
        "Rumours are attributed to who says them and written so they could turn out to be wrong.",
        "The primer can be skimmed in a few minutes, and longer detail sits behind links or on separate pages.",
        "Entries are organised by place, faction, and upcoming event, not by the order you invented the history.",
        "Anything the party must know to make a decision is also planned as a line, sight, or offer at the table.",
        "A player who reads nothing can still follow the next session, and a player who read everything still has something to discover.",
        "The page lives somewhere you can update in a few minutes after a session, using the tool you already use.",
      ],
    },
  ],
  codexConnection: {
    heading: "Keeping the public layer separate from your working notes",
    paragraphs: [
      "The practical difficulty in this approach is not writing lore, it is keeping the public version clean while your private notes keep changing. Keeping settlements, factions, and NPCs as separate linked notes or entities, rather than as one long document, makes it easier to see which facts belong to a place, which rumours attach to a faction, and which secrets must stay on the GM side of the line. Portable Markdown notes suit the same habit, because a short player-facing page can be copied into a handout, a wiki, or a shared folder without moving your whole campaign.",
      "Codex Cryptica can publish a read-only guest snapshot. It excludes drafts and entities hidden by the guest visibility settings, such as entities with the “hidden” label or those excluded by a hidden default visibility setting. Review the snapshot before sharing, and publish only material intended for your players; keep working notes and unrevealed truths in the private layer.",
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
      "A three-layer test for deciding what to publish (common knowledge, discoverable knowledge, GM-only truths), a worked harvest festival example showing the same fact at all three layers, and an explicit no-required-reading rule that separates player memory from character knowledge.",
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
      "Share common knowledge in a short primer, reveal rumours through play, and keep GM-only truths private. Three layers, a worked festival example, and no required reading.",
    image:
      "https://assets.codexcryptica.com/og/should-i-share-worldbuilding-notes-with-my-players.jpg",
    imageAlt:
      "A GM handing a short illustrated setting primer across a gaming table to players, with a thicker private notebook kept closed beside it",
  },
};
