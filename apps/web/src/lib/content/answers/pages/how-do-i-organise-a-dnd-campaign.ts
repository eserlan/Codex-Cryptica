import type { AnswerConfigInput } from "../schema";

export const howDoIOrganiseADndCampaign: AnswerConfigInput = {
  slug: "how-do-i-organise-a-dnd-campaign",
  category: "campaign-notes",
  publishedAt: "2026-10-07",
  question:
    "How do I organise a D&D campaign and keep track of NPCs, factions and quests?",
  kind: "framework",
  shortAnswer:
    "Organise a D&D campaign by things and relationships, not as one long document. Promote an NPC, location, faction, quest or item to its own page when you expect to retrieve or update it independently. Keep world truth, what the party knows, session history and disposable prep distinct; that split keeps abandoned ideas from becoming canon and makes the fact you need during play easier to find.",
  sections: [
    {
      kind: "prose",
      heading: "Why a chronological document stops working",
      paragraphs: [
        "A D&D campaign adds a handful of names every session. After ten or twelve sessions you are carrying thirty or forty NPCs, half a dozen factions with overlapping interests, a scatter of half-finished quests, and several locations whose details live in whichever session they first appeared in. One long document captures all of that faithfully and hides almost all of it when you need it.",
        "The question at the table is never what happened in session 9. It is who this NPC owes money to, which faction currently holds the road the party wants to use, whether the party already promised to return a missing courier, or what actually happened three sessions ago versus what you planned to happen. A single timeline cannot answer any of those without search, scrolling, and the pause that breaks momentum.",
      ],
    },
    {
      kind: "prose",
      heading: "Follow the campaign as it grows",
      paragraphs: [
        "If you are starting from scratch, begin with [how to start a D&D campaign](/answers/how-do-i-start-a-dnd-campaign). Use this page as the cast, places and open threads grow, then move into [how to prepare a D&D session](/answers/how-do-i-prepare-a-dnd-session) when you are ready to turn the current situation into flexible table prep.",
      ],
    },
    {
      kind: "list",
      heading: "Useful categories, and nothing else until you need it",
      intro:
        "Start with these. Add a category only when it makes retrieval easier than leaving those pages in an existing category.",
      items: [
        {
          term: "Characters and NPCs",
          text: "Promote a person when you expect to retrieve or update them independently: they are likely to matter again, affect a future choice, or connect to an open thread. A patron who spoke once can stay as a journal line until the party makes them important.",
        },
        {
          term: "Locations",
          text: "Towns, districts, dungeons, wilderness sites, the room where the macguffin was last seen. A location page records what is there now, not what you originally planned to put there.",
        },
        {
          term: "Factions",
          text: "Guilds, cults, houses, knightly orders and trading companies. Treat something as a faction when it can act as an organisation beyond one NPC's personal agenda: it has some shared identity or structure, members or agents, resources, and interests that can outlast an individual. A leader's goal may differ from the faction's.",
        },
        {
          term: "Quests and open threads",
          text: "Anything the party could still choose to do, learn, or resolve: missing couriers, unpaid debts, unanswered questions, threats that have not yet arrived. A thread stays open until the table closes it or the world does.",
        },
        {
          term: "Items and important objects",
          text: "The sword with a history, the sealed letter, the key the party has not identified yet. Not every piece of equipment, only objects that can change a future decision.",
        },
        {
          term: "Sessions and journal",
          text: "A dated log of what actually happened at the table. Do not rewrite old notes to match the current world; correct recording errors transparently and keep later reinterpretations separate. Use the journal as a historical fallback when the exact sequence or wording matters.",
        },
        {
          term: "Calendar and events",
          text: "Use this where time matters in your campaign: festivals, travel times, deadlines set by NPCs, seasonal changes. If time is loose at your table, a single timeline note on the relevant location or faction page is enough.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Keep world truth, knowledge, history and prep distinct",
      intro:
        "Track truth separately from knowledge about the truth. You do not need four separate storage systems: a status, label or linked note can make the distinction clear.",
      items: [
        {
          term: "World truth / GM truth",
          text: "What is actually true now: who rules the city, which inn burned down, or who is behind the false identity. Keep secrets and unrevealed relationships GM-only when needed. Update current state when it changes; preserve important transitions in dated events or session history, which answers how it became true.",
        },
        {
          term: "Party knowledge and claims",
          text: "Record what the characters have established separately from world truth. A rumour, lie, incomplete explanation, mistaken witness account, propaganda or theory belongs as a claim with its source and status, not as settled fact. Mark what is party-known, secret or safe to share, especially before showing or sharing notes.",
        },
        {
          term: "Session history",
          text: "What happened at the table, session by session: decisions made and outcomes taken. Current-state pages answer what is true now; the journal records how it became true and remains the fallback for exact history. Do not rewrite old notes to match later events.",
        },
        {
          term: "Prep",
          text: "Possibilities for future play: situations, encounters or dialogue you might use. Almost all of it will be abandoned, adapted or overtaken by player choices. Keep prep on pages you can delete without losing anything true about the world.",
        },
      ],
      outro:
        "When prep mixes with current state, an NPC invented for one encounter becomes a permanent resident by accident, and a dropped plot still appears in every search. Deleting prep should not delete a world fact; changing current state should not erase the history of that change.",
    },
    {
      kind: "list",
      heading: "D&D continuity worth keeping",
      intro:
        "Do not duplicate the full character sheet. Track only character details that create campaign continuity, and only for the characters or developments where they matter.",
      items: [
        {
          term: "Character hooks and ties",
          text: "PC goals, unresolved backstory hooks, and relevant patrons, deities, oaths or faction ties that can bring the character back into the campaign.",
        },
        {
          term: "Changing assets and effects",
          text: "Important magic items and who currently holds them, plus lasting curses, boons or other campaign effects that may shape a future choice.",
        },
        {
          term: "Long-running projects and threats",
          text: "A stronghold, base or recurring downtime project; recurring villains and their current state; and milestone or level-related developments when your table uses them.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Track relationships, not just pages",
      paragraphs: [
        "A folder of NPC pages answers who someone is. It does not answer how they connect to the rest of the campaign, and those connections are usually the fact you are trying to find mid-session. A list headed allies on each character page duplicates the same relationship twice, so after a betrayal one page is already wrong.",
        "Record relationships as single, directed links with a reason: who is connected to whom, in which direction, and why. One record, one place to edit, visible from either side. Innkeeper Mara works for the Silver Hart Inn, owes money to the Red Knives, knows Captain Venn, and is involved in the Missing Courier. Each of those is a separate link with its own direction, and changing one does not require editing four pages.",
        "Start with the simplest label that still carries meaning: works for, owes money to, reports to, distrusts, or involved in. For relationships that matter to play, note whether they are current or ended, known or secret, and optionally when they began or changed. A relationship can be true for the GM while the party believes something else. You do not need this metadata on every link; use it when a change matters.",
      ],
    },
    {
      kind: "list",
      heading: "What deserves a page, and what can stay in the journal",
      intro:
        "Not everything the party meets needs a page. Promote something when you expect to retrieve or update it independently; these are useful signs it has earned that attention.",
      items: [
        {
          term: "It is likely to matter again",
          text: "The party is likely to return to the location, deal with the NPC, or make a decision involving the item. A single interaction alone is not a reason to maintain a page.",
        },
        {
          term: "It can change future decisions",
          text: "A debt, a promise, a piece of information withheld, a door left unopened. If forgetting it would make a later choice uninformed, it needs its own page.",
        },
        {
          term: "It is tied to an unresolved thread",
          text: "Someone is still waiting, still owed, still hunting, or still missing. The thread keeps the page alive.",
        },
        {
          term: "It is likely to recur",
          text: "A faction operating on the road the party travels, a town they will pass through again, an NPC the party clearly likes or distrusts. Recurrence is a prediction, so keep these pages short until the prediction pays off.",
        },
        {
          term: "Forgetting it would cause a continuity problem",
          text: "A killed NPC who reappears, a destroyed bridge the party tries to cross, a payment already made that gets demanded again. If getting it wrong would break trust in the world, record it where you will find it.",
        },
      ],
      outro:
        "Minor colour that passes none of these tests can remain in the journal as a line of atmosphere. Promote it if the party later treats it as important. A short note added after play is cheaper than maintaining a page for eight sessions on the chance it might matter.",
    },
    {
      kind: "list",
      heading: "The table-ready view should be smaller than the archive",
      intro:
        "Your full campaign archive exists for retrieval between sessions. Bring a narrow, table-ready view: surface or reference canonical facts, and duplicate only the short prompts you need for speed.",
      items: [
        {
          term: "Current location",
          text: "Where the party is now, described in three or four lines you can read without interpreting. Who is there, what is immediately visible, what is likely to be asked about.",
        },
        {
          term: "Active NPCs",
          text: "Only people who may become relevant tonight. Keep the top of each page scannable enough to run the NPC cold: how they present, what they want, and the connection worth remembering. Put deeper history below it.",
        },
        {
          term: "Open threads",
          text: "The quests and loose ends that could be closed, advanced, or complicated this session. Not the whole backlog, just the few the party last touched or the world is about to push on.",
        },
        {
          term: "Immediate faction pressures",
          text: "What the relevant factions want right now, and the next concrete step they take if the party does nothing. One line per faction, visible consequences rather than abstract goals.",
        },
        {
          term: "Likely situations and complications",
          text: "Locations likely to be visited, plausible encounters or complications, and NPCs likely to act. Prepare what may become relevant, not a sequence the players are expected to trigger. Keep it disposable; promote only what becomes true.",
        },
        {
          term: "Quick rules references",
          text: "The two or three tables, conditions, or DCs you actually look up for this session. Not the whole rulebook, just the lines you know you will need.",
        },
      ],
      outro:
        "Assembling this by hand each week is the part that quietly fails when life gets busy. Reference the few relevant facts and links on one session sheet rather than rebuilding the whole archive. After play, promote new facts back to their canonical pages.",
    },
    {
      kind: "example",
      heading: "Before and after: the same D&D campaign organised two ways",
      paragraphs: [
        "A party has spent eight sessions between two towns, picked up a dozen named NPCs, annoyed a smuggling faction, and left a courier quest half finished while chasing a ruin. The DM needs to run session 9 on short notice.",
      ],
      items: [
        {
          term: "The chronological file",
          text: "All notes live in session order. To answer who the courier was, the DM searches three logs. To check whether the Red Knives still control the north road, the answer is in a faction paragraph written in session 3 and never updated. Innkeeper Mara's debt to the faction is mentioned once in session 6 and not linked anywhere. Finding any one fact means reading several sessions while the table waits.",
        },
        {
          term: "The things-and-relationships file",
          text: "Pages hold the people, places, factions and quests the DM expects to retrieve or update independently. Mara's page links her to the Silver Hart Inn, the Red Knives, Captain Venn and the Missing Courier. The courier thread has a status and last known location. The north road page says who controls it now; a dated event or journal entry records when and why control changed. Current-state pages answer most active-play questions, while the journal remains available when the exact history matters.",
        },
        {
          term: "Why it works",
          text: "When the party asks Mara for help, the DM reads one page and immediately sees the debt, the inn, the captain, and the open thread, and can call for a consequence the players can encounter next time they use that road: a toll, a missing contact, or a price that has risen while they were elsewhere.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Setting up or tidying a D&D campaign this week",
      intro:
        "Use this once to convert what you already have, then as a short pass after each session. The maintenance loop is: capture → promote → update → close → archive.",
      items: [
        "Promote a person, place, faction, quest or item when you expect to retrieve or update it independently; leave one-off interactions in the journal until they matter again.",
        "Separate GM truth from party knowledge and unverified claims; mark GM-only, party-known and safe-to-share information where it matters.",
        "Keep current state on the relevant page and preserve important transitions as dated events or journal history.",
        "Use named relationship links; mark current or ended, known or secret, and dates only when the change matters to play.",
        "Keep prep separate from truth, and prepare likely situations rather than a sequence the players are expected to follow.",
        "Surface or reference tonight's canonical NPC, location, faction and thread facts on the run sheet; duplicate only quick prompts you need at the table.",
        "After play, capture what happened, promote what now matters, update current state and relationships, close resolved quests or promises, then archive or delete unused prep.",
      ],
    },
  ],
  codexConnection: {
    heading: "From things and relationships to table-ready prep",
    paragraphs: [
      "In Codex Cryptica, Vault entities are Markdown pages you can use for current campaign notes, and the Graph lets you browse connections between them. Use those links as a workflow for relationships; mark truth, party knowledge, claims and sharing status in the notes where they matter, since the product does not automatically manage those knowledge states for you.",
      "The Journal keeps a dated record of what happened at the table, separate from current campaign notes. The Session Prep Builder starts from your hook or situation and builds a run sheet; it does not automatically pull in linked Vault facts. Reference or surface the relevant source-page facts yourself, and keep only the quick prompts you need on the sheet. After play, promote new facts back into the pages they belong to.",
    ],
    linkText: "Open the Session Prep Builder",
    href: "/tools/session-prep-builder",
  },
  relatedTools: [
    {
      title: "Session Prep Builder",
      description:
        "Turn a hook or campaign situation into a one-page run sheet; add the NPCs, locations, open threads and faction pressures you want to prepare.",
      href: "/tools/session-prep-builder",
    },
    {
      title: "RPG knowledge graph",
      description:
        "Your campaign as things and relationships: every NPC, faction, location and quest linked and browsable.",
      href: "/solutions/rpg-knowledge-graph",
    },
    {
      title: "RPG campaign manager",
      description:
        "One page per thing in your world, linked together, stored as Markdown you own.",
      href: "/solutions/campaign-manager",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for D&D",
      description:
        "How the same entity and relationship structure supports a long-running Dungeons & Dragons campaign.",
      href: "/for/dungeons-and-dragons",
    },
  ],
  relatedAnswers: [
    "how-do-i-start-a-dnd-campaign",
    "how-do-i-prepare-a-dnd-session",
    "how-do-you-organise-rpg-campaign-notes",
    "how-do-you-keep-track-of-npcs-in-a-long-campaign",
    "how-do-you-organise-npc-relationships",
    "how-do-you-track-unresolved-plot-hooks-in-an-rpg-campaign",
    "how-do-you-manage-a-campaign-timeline-in-an-rpg",
    "how-do-you-run-factions-in-a-sandbox-campaign",
    "how-do-you-track-faction-turns-between-rpg-sessions",
    "how-do-i-organise-gm-notes-for-in-person-play",
    "how-do-i-take-useful-rpg-notes-during-play",
    "how-do-you-recap-a-ttrpg-session",
    "how-do-you-help-players-remember-what-happened-in-a-ttrpg-campaign",
    "what-should-i-look-for-in-an-rpg-campaign-manager",
  ],
  discovery: {
    id: "answer-dnd-campaign-organisation",
    parentCluster: "campaign-notes",
    primaryIntent:
      "how do i organise a dnd campaign and keep track of npcs factions and quests",
    intentAliases: [
      "how to organize a dnd campaign",
      "dnd campaign organisation for npcs factions and quests",
      "how to organise dnd campaign notes with npcs and factions",
      "dnd campaign management system for quests and locations",
      "d and d campaign tracker for npcs factions quests",
    ],
    uniqueValue:
      "A D&D-specific campaign management model that organises the campaign by things and relationships, separates canon, session history and prep, and pairs connected campaign pages in the Graph with a separately prepared table-ready run sheet.",
    userJob: "adopt-workflow",
    relatedIntents: [
      "answer-campaign-notes",
      "answer-track-npcs-long-campaign",
      "answer-npc-relationships",
      "answer-unresolved-plot-hooks",
      "answer-manage-campaign-timeline",
      "answer-track-faction-turns-between-sessions",
      "solution-campaign-manager",
      "solution-rpg-knowledge-graph",
      "tools-session-prep-builder",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-campaign-notes",
        reason:
          "That page teaches the general three-layer system for any RPG. This page applies it specifically to D&D campaigns through NPCs, factions, quests, locations and the canon versus prep distinction, and recommends a separately prepared session sheet rather than a generic one-page sheet.",
      },
      {
        with: "answer-in-person-gm-notes",
        reason:
          "That page covers the physical and digital setup brought to the table. This page covers how the underlying D&D campaign information is organised across entities, relationships, canon, history and prep, and what deserves tracking in the first place.",
      },
    ],
  },
  seo: {
    title: "How do I organise a D&D campaign and keep track of everything?",
    description:
      "Organise a D&D campaign by things and relationships: linked pages for NPCs, factions, quests and locations, with canon, history and prep kept separate.",
    image:
      "https://assets.codexcryptica.com/og/how-do-i-organise-a-dnd-campaign.jpg",
    imageAlt:
      "A dungeon master's desk with scattered NPC cards, faction sigils, quest hooks and a hand-drawn map connected by string",
  },
};
