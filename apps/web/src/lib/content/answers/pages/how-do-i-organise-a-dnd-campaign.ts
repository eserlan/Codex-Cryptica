import type { AnswerConfigInput } from "../schema";

export const howDoIOrganiseADndCampaign: AnswerConfigInput = {
  slug: "how-do-i-organise-a-dnd-campaign",
  category: "campaign-notes",
  publishedAt: "2026-10-07",
  question:
    "How do I organise a D&D campaign and keep track of NPCs, factions and quests?",
  kind: "framework",
  shortAnswer:
    "Organise a D&D campaign by things and relationships, not as one long document. Give every important NPC, location, faction, quest and item its own short page, link them with named connections, and keep three layers strictly separate: campaign canon for what is true in the world, a dated session journal for what happened at the table, and disposable prep for what might happen next. That split keeps abandoned ideas from becoming canon and makes the single fact you need during play findable in seconds.",
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
      kind: "list",
      heading: "Seven useful categories, and nothing else until you need it",
      intro:
        "Start with these. Add a category only when you have three or more pages that clearly belong in it and nowhere else.",
      items: [
        {
          term: "Characters and NPCs",
          text: "Every person the party might meet again, from the archmage to the innkeeper who knows the cellar route. One page per person, not one section of a cast list.",
        },
        {
          term: "Locations",
          text: "Towns, districts, dungeons, wilderness sites, the room where the macguffin was last seen. A location page records what is there now, not what you originally planned to put there.",
        },
        {
          term: "Factions",
          text: "Guilds, cults, houses, knightly orders, trading companies, and any group that can want something and act on it between sessions. If only one person wants it, it is an NPC goal, not a faction.",
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
          text: "A dated log of what actually happened at the table, in order, never rewritten. The journal is the historical record you reconcile from, not the place you look things up mid-session.",
        },
        {
          term: "Calendar and events",
          text: "Use this where time matters in your campaign: festivals, travel times, deadlines set by NPCs, seasonal changes. If time is loose at your table, a single timeline note on the relevant location or faction page is enough.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Three layers that must not mix",
      intro:
        "The habit that prevents most continuity errors is keeping these apart, especially after prep does not go to plan.",
      items: [
        {
          term: "Campaign canon",
          text: "Facts that are true in the game world right now. Who rules the city, which inn was burned down, what the party has actually been told. Edited in place when the truth changes, and dated where a change matters.",
        },
        {
          term: "Session history",
          text: "What happened at the table, session by session. Decisions made, dice rolled, outcomes taken. Append-only: you do not rewrite a session log when later events change its meaning, you update the canon pages it affected.",
        },
        {
          term: "Prep",
          text: "Possibilities for future play: scenes you might run, encounters you might use, dialogue you might need. Almost all of it will be abandoned, adapted, or overtaken by player choices. That is expected. Keep prep on pages you can delete without losing anything true about the world.",
        },
      ],
      outro:
        "When prep mixes with canon, an NPC you invented for a single encounter becomes a permanent resident by accident, and a plot you dropped still appears in every search. Deleting a prep page should never delete a fact about the world, and updating a canon page should never require rewriting history.",
    },
    {
      kind: "prose",
      heading: "Track relationships, not just pages",
      paragraphs: [
        "A folder of NPC pages answers who someone is. It does not answer how they connect to the rest of the campaign, and those connections are usually the fact you are trying to find mid-session. A list headed allies on each character page duplicates the same relationship twice, so after a betrayal one page is already wrong.",
        "Record relationships as single, directed links with a reason: who is connected to whom, in which direction, and why. One record, one place to edit, visible from either side. Innkeeper Mara works for the Silver Hart Inn, owes money to the Red Knives, knows Captain Venn, and is involved in the Missing Courier. Each of those is a separate link with its own direction, and changing one does not require editing four pages.",
        "Start with the simplest label that still carries meaning. Works for, owes money to, reports to, distrusts, and involved in are all usable. Secrecy is worth marking where it matters, so the link can note whether the party knows about it yet. A short link you can read aloud beats a paragraph of backstory when the party asks Mara why she is nervous.",
      ],
    },
    {
      kind: "list",
      heading: "What deserves a page, and what can stay in the journal",
      intro:
        "Not everything the party meets needs a page. Track something when it passes one of these tests.",
      items: [
        {
          term: "The players interacted with it",
          text: "If they spoke to the NPC, entered the location, or took the item, it is now part of shared memory and will be asked about again.",
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
        "Minor colour that passes none of these tests can remain in the session journal as a line of atmosphere. Promote it to a page only if the party later treats it as important. Two sentences added after play are cheaper than a full page maintained for eight sessions on the chance it might matter.",
    },
    {
      kind: "list",
      heading: "The table-ready view should be smaller than the archive",
      intro:
        "Your full campaign archive exists for retrieval between sessions. What you bring to the table is a narrow slice copied out of it, not the whole file with a search box.",
      items: [
        {
          term: "Current location",
          text: "Where the party is now, described in three or four lines you can read without interpreting. Who is there, what is immediately visible, what is likely to be asked about.",
        },
        {
          term: "Active NPCs",
          text: "Only the people who might plausibly appear tonight, each reduced to how they present, what they want, and one connection worth remembering. Two sentences each, not biographies.",
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
          term: "Likely scenes and encounters",
          text: "Two or three scenes you expect to run, each with a single goal. Prep them as disposable pages you can throw away afterwards; only what becomes true gets promoted into canon.",
        },
        {
          term: "Quick rules references",
          text: "The two or three tables, conditions, or DCs you actually look up for this session. Not the whole rulebook, just the lines you know you will need.",
        },
      ],
      outro:
        "Assembling this by hand each week is the part that quietly fails when life gets busy. A session prep sheet that pulls the right pages into one view, with that session's links intact, keeps the archive useful without adding a weekly rebuild.",
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
          text: "Each NPC, location, faction and quest has its own page. Mara's page says she works for the Silver Hart Inn, owes money to the Red Knives, knows Captain Venn, and is involved in the Missing Courier. The courier is its own quest page with a status and the last known location. The north road's current holder lives on the location page, current as of last session. Session logs still exist, but nothing is looked up from them during play.",
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
        "Use this once to convert what you already have, then as a short pass after each session.",
      items: [
        "Create one page for each NPC the party has spoken to more than once, and keep it to two sentences you could read aloud cold.",
        "Create one page for each location you have described on the table, with what is there now and who controls it.",
        "Create one page per faction that has acted or been named, with what it wants and what it does next if ignored.",
        "Promote every open quest or half-finished promise onto its own thread page, with its current status and who is waiting.",
        "Replace ally and enemy lists with directed links that carry a reason, and note whether the party knows about each link.",
        "Separate any prep material from canon pages so a deleted encounter cannot delete a fact about the world.",
        "Copy tonight's material onto a single session sheet: location, active NPCs, open threads, immediate faction pressures, likely scenes, and the few rules you will actually look up.",
        "After play, promote the handful of facts that became true out of the session log and into the pages they belong to, and delete the prep that did not happen.",
      ],
    },
  ],
  codexConnection: {
    heading: "From things and relationships to table-ready prep",
    paragraphs: [
      "Codex Cryptica is built for exactly this split. Vault entities give every NPC, location, faction, quest and item its own Markdown page you edit in place, so current truth is always where you last left it. Typed links between entities record the relationships once, visible from either side, and the graph shows you the connections you have built rather than a folder tree you have to maintain.",
      "The Journal captures session history as a dated stream, separate from canon, and the Session Prep Builder pulls tonight's slice into one run sheet: current location, the NPCs likely to appear, the open threads that could move, and the faction pressures the world applies while the party decides. Prep stays disposable, canon stays current, and the next session starts from pages you can trust mid-scene.",
    ],
    linkText: "Open the Session Prep Builder",
    href: "/tools/session-prep-builder",
  },
  relatedTools: [
    {
      title: "Session Prep Builder",
      description:
        "Pull tonight's NPCs, locations, open threads and faction pressures into one run sheet, with disposable prep separate from canon.",
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
      "A D&D-specific campaign management model that organises the campaign by things and relationships, separates canon, session history and prep, and ties NPCs, factions, quests and locations into a table-ready view via the Graph and Session Prep Builder.",
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
          "That page teaches the general three-layer system for any RPG. This page applies it specifically to D&D campaigns through NPCs, factions, quests, locations and the canon versus prep distinction, and routes the during-session slice into the Session Prep Builder rather than a generic one-page sheet.",
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
