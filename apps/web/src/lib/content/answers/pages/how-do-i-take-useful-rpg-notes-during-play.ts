import type { AnswerConfigInput } from "../schema";

export const howDoITakeUsefulRpgNotesDuringPlay: AnswerConfigInput = {
  slug: "how-do-i-take-useful-rpg-notes-during-play",
  category: "campaign-notes",
  publishedAt: "2026-09-28",
  question:
    "How do I take useful RPG notes during play without missing the session?",
  kind: "framework",
  shortAnswer:
    "Do not try to transcribe the session. During play, capture what your future self may need to make decisions, or what your character would care about remembering: names, places, clues, promises and debts, party decisions, unresolved questions and what changed. Use short fragments and a few symbols to keep your eyes on the table, use placeholders when you miss a name, skip detailed notes during combat, then spend around two to five minutes after the session turning those fragments into a compact recap and a handful of lasting entries.",
  sections: [
    {
      kind: "prose",
      heading: "The trade-off is not memory versus typing speed",
      paragraphs: [
        "Players who try to write everything down end up watching their notebook instead of the scene. Players who write nothing rely on memory, and memory is generous for one evening and thin a fortnight later. Useful notes sit between those two habits. Ask: will knowing this change what I do next session, or is it something my character would care about remembering?",
        "That test is stricter than it sounds. The colour of the curtains rarely passes it. The fact that the dockmaster distrusts the Glass Guild and offered a reward for checking a tunnel before dawn does. So might a relationship moment, a personal goal, an in-character revelation or a promise that matters to your character. Capture what you may act on and what you would want your character to remember.",
      ],
    },
    {
      kind: "list",
      heading: "Capture decisions, not dialogue",
      intro:
        "These categories cover most of what matters; the final one is a reminder of what you can usually leave out.",
      items: [
        {
          term: "Names worth keeping",
          text: "People and places you may need to find again. One line is enough: who they are and where you met them.",
        },
        {
          term: "Clues and leads",
          text: "Keep what you observed separate from what someone claimed and what you suspect. A lightweight pattern is enough: observed: blue wax seal on crate; source claim: ? dockside rumour says the warehouse fire was deliberate; theory: ? council involved. Note who made a claim when their reliability may matter later.",
        },
        {
          term: "Promises, debts and bargains",
          text: "What you agreed to do, for whom, by when, and what happens if you do not. These are the notes that create pressure next session.",
        },
        {
          term: "Party decisions",
          text: "What you chose and what you ruled out. A one-line decision survives better than a paragraph of debate.",
        },
        {
          term: "Unresolved questions",
          text: "Things you noticed but cannot yet explain. Mark them so they stay open instead of fading.",
        },
        {
          term: "Faction and relationship changes",
          text: "Who now likes or dislikes whom because of what just happened. A short note beats reconstructing it later.",
        },
        {
          term: "Important items or documents",
          text: "What you now hold, where it is, and why it matters. Skip routine equipment and shop lists.",
        },
        {
          term: "Changes in what the party knows or believes",
          text: "A new understanding that reframes earlier facts. If the symbol on the crates matches the chapel floor, that shift is worth more than the fight that surrounded it.",
        },
        {
          term: "What you can usually skip",
          text: "Blow-by-blow combat, exact dialogue, routine travel, and every rules interaction. Note only the outcome or discovery that will still matter afterwards.",
        },
      ],
    },
    {
      kind: "list",
      heading: "A tiny shorthand that keeps you at the table",
      intro:
        "The exact symbols do not matter. What matters is that shorthand cuts writing time from sentences to marks, so your attention stays in the scene.",
      items: [
        {
          term: "? Unresolved question",
          text: "Something you do not yet understand. Use it for mysteries, missing names, and claims you have not verified.",
        },
        {
          term: "! Important or urgent",
          text: "A deadline, a threat, or a detail the GM stressed. If it needs action before next session, it gets a !",
        },
        {
          term: "→ Consequence or next step",
          text: "What follows from what just happened: where you will go, whom you will tell, what will happen if you do not.",
        },
        {
          term: "★ Person or place worth remembering",
          text: "A name that is likely to recur. Pair it with one memorable detail so you can recognise it later.",
        },
        {
          term: "✓ Resolved",
          text: "A question answered, a debt paid, a lead closed. Mark it so old threads do not clog the page.",
        },
      ],
      outro:
        "Pick three or four symbols and keep them. Consistency across sessions is more useful than a clever system you have to relearn each time.",
    },
    {
      kind: "prose",
      heading: "Live notes and the campaign record are different jobs",
      paragraphs: [
        "During play, notes should be fragments: names, keywords, symbols, quick arrows between them, a rough sketch if a layout matters. Write badly on purpose. You are catching things, not composing them.",
        "After play, as a starting point, spend around two to five minutes turning those fragments into something your future self can use. Add the missing context while you still remember it, mark the threads that are still open, write a handful of bullets — perhaps three to six — about what changed, and promote only the genuinely important facts into longer-term notes. A long investigation or political session may need more. Most lines on the live page will never need promoting, and that is expected.",
        "One page per session is a useful starting point for many tables. A longer or more involved session may need more space. A slightly longer campaign wants an occasional index you can scan, not a complicated taxonomy you have to maintain under time pressure.",
      ],
    },
    {
      kind: "prose",
      heading: "During combat, write less rather than more",
      paragraphs: [
        "Combat is where attention demand peaks and note-taking usually stops. That is normally fine. The table needs you present and tracking the fight, not writing a round-by-round account you will never reread.",
        "Jot only major developments that will still matter once the dice are put away: who was lost or captured, what was discovered, whether an objective was achieved, or a significant resource that changed the party's options. Add one line immediately after combat if something story-important happened. The example below shows how little that needs to be.",
        "Fight @ mill\n! cultist captain escaped east\n→ Mara learned sigil = same as chapel\n★ prisoner: Evin, knows harbour route",
      ],
    },
    {
      kind: "prose",
      heading: "Use placeholders instead of stopping play",
      paragraphs: [
        "You will miss names. Rather than interrupt the scene, write what you did catch so you can fill the gap later.",
        "? merchant woman, red scarf, hired us for bridge job",
        "That line is useful even before you know her name. It records the role, a visual tag, and the connection to your party. Fill it in after the session by asking another player, checking shared notes, asking the GM during a natural pause, or confirming it at the start of the next session. A placeholder you can resolve is more useful than a gap you try to hold in memory.",
      ],
    },
    {
      kind: "list",
      heading: "Keep organisation light",
      intro:
        "You do not need a complex notebook system. These headings cover most player needs without becoming a second job.",
      items: [
        {
          term: "People",
          text: "Names with one line each: role, where met, and a detail that helps you recognise them.",
        },
        {
          term: "Places",
          text: "Locations that matter for choices, with a note on how to get back.",
        },
        {
          term: "Leads and clues",
          text: "Facts that point somewhere, kept short and marked with ? until they are resolved.",
        },
        {
          term: "Promises and obligations",
          text: "What you owe, what is owed to you, and any deadline attached.",
        },
        {
          term: "Questions",
          text: "Open threads you still need to answer, kept together so they are easy to scan before the next session.",
        },
        {
          term: "Session recap",
          text: "A handful of bullets written right after play, summarising what changed. Keep predictions about what may happen next separate from this factual recap.",
        },
      ],
      outro:
        "For many players, one page per session plus an occasional index is a useful starting point. Add structure only when the current page stops finding answers in a few seconds.",
    },
    {
      kind: "prose",
      heading: "Keep a tiny NPC and name index that survives the campaign",
      paragraphs: [
        "For longer campaigns a persistent index solves the recurring question of who someone is three months later. Keep it on one or two pages, not as a biography per character. Name, who they are, where you met them, their faction or relationship to you, one memorable detail, and the last session where they mattered is usually enough.",
        "Update it when something changes, not weeks after. A status change written in the moment takes seconds and is hard to reconstruct accurately once several more sessions have passed. Most NPCs never need more than that one line until they recur a second time.",
      ],
    },
    {
      kind: "prose",
      heading: "Share the work when it helps",
      paragraphs: [
        "Shared notes can reduce the load, but they work best as a light agreement rather than a formal role. A shared recap document anyone can add to, a rotating chronicler each session, or splitting concerns so different players track different things all work, provided no single player becomes the table's stenographer.",
        "If you do share a document, keep personal notes as well. The shared page records what happened. Your own few lines record what mattered to you, which is exactly the part a shared account tends to flatten.",
      ],
    },
    {
      kind: "prose",
      heading: "Recording and transcription as a supplement, not a substitute",
      paragraphs: [
        "An audio recording or an automated transcript can act as a safety net: you can recover a missed name, produce a rough recap, or search for a moment you only half heard. It does not replace the small subjective notes that tell you what mattered to your character, and it brings its own costs.",
        "Everyone at the table should explicitly agree before you record. A recording can capture personal or off-topic conversation that was never meant to be kept, it creates storage and privacy considerations you need to think through, and transcripts can be inaccurate or flatten what happened into a literal log that is less useful than concise notes. Automated summaries may also omit the very detail an individual player cared about.",
        "Treat recording as a backup you can check when your own notes leave a gap, not as the primary record of the session.",
      ],
    },
    {
      kind: "list",
      heading: "Build the next-session recap from open threads",
      intro:
        "At the end of the session, extract the questions your notes already contain:",
      items: [
        {
          term: "What changed?",
          text: "A consequence, a discovery, or a status shift that reframes what the party knows.",
        },
        {
          term: "What did we promise to do?",
          text: "Obligations with a who and a when, so next session starts with a clear intent.",
        },
        {
          term: "What are we still trying to learn?",
          text: "The unresolved questions marked with ? that you will still carry.",
        },
        {
          term: "Which NPCs matter next?",
          text: "Only the people likely to come up in the next scene, not every name from the campaign.",
        },
        {
          term: "Where are we now?",
          text: "Current location and immediate situation, as your character would describe it.",
        },
        {
          term: "What do we expect next? (prediction)",
          text: "The most plausible next pressure if you do nothing. Keep this expectation separate from what actually happened; it is a prediction, not campaign fact.",
        },
      ],
    },
    {
      kind: "example",
      heading:
        "Transcript habits versus useful notes: the same harbour evening",
      paragraphs: [
        "The party spends an evening on the docks. They learn the dockmaster Vessa dislikes the Glass Guild, hear a rumour the warehouse fire was deliberate, notice a blue wax seal that might be the city council's, promise Vessa they will inspect a tunnel before dawn, locate the Old Pump House entrance below the quay, and realise a contact named Kelm has gone missing after asking about smugglers.",
      ],
      items: [
        {
          term: "A chronological paragraph",
          text: '"We started at the market, then went to the docks and talked to the dockmaster for a while about trade and the fire last week. She seemed annoyed about the guild and mentioned a tunnel. Then we looked at the seal and argued about whether it was the council. We said we\'d check the tunnel and then went to find the Pump House. Someone said Kelm is missing." That captures the order of events but buries the commitments, the names, and the questions.',
        },
        {
          term: "Terse notes taken during play",
          text: "★ Vessa — dockmaster, dislikes Glass Guild\n? dockside rumour: warehouse fire was deliberate\n? blue wax seal = council?\n? theory: council involved\n→ promised Vessa: inspect tunnel before dawn\n★ Old Pump House — entrance below quay\n! Kelm missing after asking about smugglers",
        },
        {
          term: "Four-bullet recap built from those notes after the session",
          text: "• Promised Dockmaster Vessa we would inspect the Old Pump House tunnel before dawn.\n• A dockside rumour says the warehouse fire was deliberate; its cause is unknown.\n• Observed a blue wax seal; its possible council connection is only a theory and needs checking.\n• Kelm, who had been asking about smugglers, is missing.",
        },
        {
          term: "Why it works",
          text: "The terse notes keep names, commitments, clues and open questions visible without recording the conversation that carried them. The recap then selects only what changes next session's decisions, so the page you open in a fortnight tells you where you are and what you owe, not how you got there.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "A compact template you can copy",
      intro:
        "Use this as a live sheet during play, then the prompts after. One page is a useful starting point; adjust the space and headings to fit your session, notebook or tool.",
      items: [
        "During play - PEOPLE: name, role, one detail",
        "During play - PLACES: location, how to return",
        "During play - ! IMPORTANT: urgent facts and deadlines",
        "During play - ? QUESTIONS: threads you cannot yet explain",
        "During play - → NEXT / PROMISES: what you agreed to do and for whom",
        "After session - factual recap: what changed, what you learned, what you promised, what is still unresolved",
        "After session - separately note what you expect next as a prediction; a handful of recap bullets is often enough",
        "After session - promote only lasting facts into your longer-term index",
      ],
    },
  ],
  codexConnection: {
    heading: "Use a scratchpad during play, then keep what lasts",
    paragraphs: [
      "The distinction is between a quick capture layer and a curated campaign record, not paper versus digital. Use paper, a phone note or Codex Cryptica's Session Journal for terse fragments while you play; the Journal stays accessible as you move around Codex, so you can jot things down without stopping to create polished entities. After the session, you can turn selected journal entries or sections into drafts, review them, and keep only lasting facts as searchable campaign entities.",
      "If your table shares notes, those durable entities give everyone a common reference without requiring one player to act as scribe. Keep personal notes too: the shared record captures what happened, while your own lines can preserve what mattered to your character. The same capture-then-curate workflow works with whatever notebook or tool you prefer.",
    ],
    linkText: "See the campaign manager",
    href: "/solutions/campaign-manager",
  },
  relatedTools: [
    {
      title: "RPG campaign manager",
      description:
        "Linked NPC, location and faction entities that make a player index searchable between sessions.",
      href: "/solutions/campaign-manager",
    },
    {
      title: "Local-first RPG campaign manager",
      description:
        "Why a notebook-first workflow and a searchable campaign file complement each other, on your own machine.",
      href: "/features/local-first-rpg-campaign-manager",
    },
  ],
  relatedAnswers: [
    "how-do-i-organise-gm-notes-for-in-person-play",
    "how-do-you-keep-track-of-npcs-in-a-long-campaign",
    "how-do-you-recap-a-ttrpg-session",
    "how-do-you-organise-rpg-campaign-notes",
    "how-do-you-help-players-remember-what-happened-in-a-ttrpg-campaign",
    "how-do-you-track-unresolved-plot-hooks-in-an-rpg-campaign",
    "how-much-campaign-lore-should-players-be-expected-to-remember",
    "how-do-you-manage-a-campaign-timeline-in-an-rpg",
    "how-do-i-organise-a-dnd-campaign",
  ],
  discovery: {
    id: "answer-player-rpg-notes-during-play",
    parentCluster: "campaign-notes",
    clusters: ["campaign-memory"],
    primaryIntent:
      "how to take useful rpg notes during play without missing the session",
    intentAliases: [
      "how to take dnd notes during a session",
      "how to take rpg notes without missing things",
      "what should players write down in dnd",
      "how to keep campaign notes as a player",
      "how to remember npc names in dnd",
      "best way to take notes during an rpg session",
      "player note taking tips tabletop rpg",
    ],
    uniqueValue:
      "A player-facing capture framework that replaces transcription with decision-filtered fragments, a five-symbol shorthand to choose from, a live-notes versus post-session split with a two to five minute recap, and explicit guidance for combat, placeholders, a lightweight index, shared notes and recording as an optional supplement.",
    userJob: "adopt-workflow",
    relatedIntents: [
      "answer-in-person-gm-notes",
      "answer-campaign-notes",
      "answer-track-npcs-long-campaign",
      "answer-session-recap",
      "answer-campaign-memory-hub",
      "answer-unresolved-plot-hooks",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-in-person-gm-notes",
        reason:
          "That page organises GM references and session-facing material at the table and compares paper, tablet and laptop setups; this page is the player-side complement about capturing decisions and clues while staying present, and it does not duplicate the hardware comparison.",
      },
      {
        with: "answer-campaign-notes",
        reason:
          "The campaign-notes answer covers the durable archive across a whole campaign; this answer covers the live capture habit during a session and the short post-session promotion into that archive.",
      },
    ],
  },
  seo: {
    title:
      "How do I take useful RPG notes without missing play? | Codex Cryptica",
    description:
      "A player framework for RPG notes: what to capture, lightweight shorthand, combat and placeholder habits, and a 2 to 5 minute recap workflow.",
    image:
      "https://assets.codexcryptica.com/og/how-do-i-take-useful-rpg-notes-during-play.jpg",
    imageAlt:
      "A player's notebook open beside dice with terse handwritten notes, symbols and names visible in warm table light",
  },
};
