import type { AnswerConfigInput } from "../schema";

export const howDoIOrganiseATalesOfTheValiantCampaign: AnswerConfigInput = {
  slug: "how-do-i-organise-a-tales-of-the-valiant-campaign",
  category: "campaign-notes",
  publishedAt: "2026-10-16",
  question: "How do I organise a Tales of the Valiant campaign?",
  kind: "framework",
  shortAnswer:
    "Organise a Tales of the Valiant campaign around linked people, places, factions and quests rather than one chronological session doc, and give Black Flag's moving table state its own home: record your resting variant and each character's carried-over Luck at the end of every session, attach explicit Doom pools and triggers to boss stat blocks, and keep 5e-to-Black Flag conversion changes on the adventure pages where you run them.",
  sections: [
    {
      kind: "prose",
      heading: "Where Tales of the Valiant campaign notes break down",
      paragraphs: [
        "Most Tales of the Valiant tables share the same core note-taking problem as any d20 fantasy campaign: after ten sessions, NPCs, faction goals, half-finished quests and dungeon adjustments are buried inside chronological session logs. If you already know [how to organise a D&D campaign](/answers/how-do-i-organise-a-dnd-campaign) around separate pages for people, places and open threads, keep that foundation. Separate what is currently true in the world from what happened in the session journal and what remains disposable prep.",
        "Where a Black Flag campaign diverges is the mechanical state that carries across sessions and the conversion notes that accumulate when you run 5e material. Party Luck rises and falls on missed rolls and changes on a Long Rest according to the resting variant your table chose. Boss encounters rely on finite Doom pools and specific Doom spenders rather than static legendary resistance. And because many GMs run published 5e adventures alongside the Black Flag Reference Document (BFRD), unwritten monster swaps and save adjustments quickly turn into mid-combat guesswork if they are not stored with the location or encounter.",
      ],
    },
    {
      kind: "table",
      heading:
        "What changes when you organise for Tales of the Valiant vs standard 5e",
      headers: [
        "Campaign layer",
        "Standard 5e habit",
        "Tales of the Valiant organisation",
      ],
      rows: [
        [
          "Between-session party state",
          "Track hit points, spell slots and exhaustion; Inspiration is binary and rarely persists in notes.",
          "Record each character's current Luck (0 to 5) at session end, plus the campaign's chosen Long Rest Luck rule so next week's opening encounter starts with accurate pools.",
        ],
        [
          "Boss and lieutenant prep",
          "Copy a stat block with static Legendary Actions and Legendary Resistances.",
          "Attach a specific Doom pool and two or three named Doom actions to the adversary's card or token, keeping Doom scoped to that creature rather than a shared GM pool.",
        ],
        [
          "Adventure conversion notes",
          "Run published 5e encounters as written from the module book.",
          "Keep a short conversion block on each location or encounter page noting BFRD monster replacements, stealth/perception DC equivalents, and Doom swaps.",
        ],
        [
          "Downtime and character ties",
          "Handle downtime ad hoc between arcs; patrons and backgrounds stay on character sheets.",
          "Track active downtime projects, research progress, and Heritage or faction obligations as open threads linked to the NPCs and settlements involved.",
        ],
      ],
    },
    {
      kind: "list",
      heading:
        "Four Black Flag elements that need a dedicated place in your notes",
      intro:
        "Do not duplicate full character sheets in your GM notes. Track only the state that changes how you prepare or adjudicate the next session.",
      items: [
        {
          term: "Party Luck and your campaign's resting variant",
          text: "Characters gain Luck when they fail attack rolls or saving throws and spend it to push later d20 tests over the line. Because a party entering a boss room with four Luck each plays very differently from a party at zero, record everyone's current Luck when you wrap for the night. Note your campaign's resting variant at the top of your campaign hub so everyone applies the same rule when a Long Rest resets or preserves unspent Luck. Codex Cryptica does not change Luck automatically on a rest, so update each counter manually.",
        },
        {
          term: "Scoped Doom budgets on adversary pages",
          text: "In Black Flag rules, legendary creatures and key lieutenants spend Doom points to recharge abilities, shake off conditions or act out of turn. Write the starting Doom count and the exact triggers on the creature's stat sheet or encounter note before play. During combat, track Doom on that specific boss token rather than treating it as a floating pool across the whole room.",
        },
        {
          term: "Module conversion decisions alongside locations",
          text: "If you are running a 5e campaign book or mixing third-party supplements with BFRD monsters, never trust yourself to remember on-the-fly conversions two weeks later. When you swap a 5e monster for its BFRD counterpart, replace Legendary Resistance with Doom, or assign a spell to one of the four primary spell sources (Arcane, Divine, Primordial or Wyrd), write that change on the room or encounter note where the creature appears.",
        },
        {
          term: "Downtime projects, patrons and training ties",
          text: "Tales of the Valiant gives structured weight to between-adventure downtime and tiered Martial, Magic and Technical talents. When a player spends downtime researching a ruin, courting a guild or seeking a mentor for an advanced talent tier, log it as an open thread linked to that NPC and settlement. Check those threads before prepping the next town visit so their progress shows up in play.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Keep your table run sheet narrow",
      paragraphs: [
        "Your campaign archive holds every town, faction, converted stat block and old session log. Your run sheet for tonight should fit on one screen or page: where the party is standing, each character's starting Luck, the three or four NPCs or rooms likely to come into play, the active open threads, and the stat blocks and Doom triggers for tonight's encounters.",
        "Treat encounter prep as disposable until it happens at the table. If the party bypasses a converted ambush in the Sunken Watchtower, move that prep back to your archive or adapt it later without writing it into the campaign timeline as settled history.",
      ],
    },
    {
      kind: "example",
      heading:
        "Before and after: running a converted 5e dungeon in Tales of the Valiant",
      paragraphs: [
        "A GM is six sessions into a campaign, running a published 5e dungeon adapted for four Level 5 Tales of the Valiant characters. Last session ended mid-delve right outside the sanctum of a bone-sculptor necromancer.",
      ],
      items: [
        {
          term: "Unorganised session notes",
          text: "The GM kept notes in a single running document and did the 5e-to-ToV conversion in their head during Session 5. Sitting down for Session 6, nobody remembers whether the fighter ended last week with 1 Luck or 4. The GM forgot whether the table agreed that Long Rests reset Luck by rolling 1d4 or clearing unspent points. Mid-fight, the GM runs the necromancer out of the 5e book using static Legendary Resistance, forgetting they had planned to give the boss a Doom pool of 3, and cannot find the note naming which cultists in town owe the necromancer money.",
        },
        {
          term: "Organised around entities and Black Flag state",
          text: "The Sanctum location page links directly to the necromancer's BFRD monster sheet, which carries a verified Doom pool of 3 and two written Doom actions: a bone-splinter teleport and an immediate reaction hex. The top of the session run sheet lists each hero's carried-over Luck from last week's journal entry alongside the campaign's Long Rest rule. The necromancer's page links to two contacts in the river port who supply him with grave goods.",
        },
        {
          term: "Why it works",
          text: "Combat starts with each hero's Luck and the necromancer's Doom pool ready, without reconstructing them from last week's notes. When the paladin misses two early strikes, their Luck climbs to 4 and they burn three points to turn a failed save against the necromancer's hex into a success; the necromancer answers by spending 2 Doom to teleport out of the fighter's reach. When the boss falls and the party searches his desk, the GM clicks the linked river-port contacts and immediately knows which merchant goes into hiding before the party returns to town.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Weekly Tales of the Valiant campaign maintenance checklist",
      intro:
        "Use this between-session checklist to keep your world continuity and Black Flag numbers accurate:",
      items: [
        "At the end of the session, record each character's current Luck total and any unspent Doom on recurring adversaries who escaped.",
        "When the party takes a Long Rest, apply your campaign's resting variant to each character's Luck pool and update the counter manually.",
        "Promote any new NPC, location, faction or item that will matter again to its own linked page; leave one-off colour in the session journal.",
        "For next week's likely encounters, attach BFRD stat blocks and write explicit Doom pools and Doom spenders on solo bosses or lieutenants.",
        "If adapting a 5e module, write monster replacements, DC adjustments and spell-source tags directly onto the location note before the session starts.",
        "Update one line on any active downtime project or faction clock that moved forward while the party was in the field.",
      ],
    },
  ],
  codexConnection: {
    heading: "Running a Tales of the Valiant campaign in Codex Cryptica",
    paragraphs: [
      "Codex Cryptica combines linked campaign notes and a relationship Graph with built-in Tales of the Valiant character, Quick NPC and monster stat sheet templates. You get one-click Luck counters on sheets and combat tokens, scoped Doom counters on boss tokens, and qualitative encounter challenge guidance tailored to your party size and level. Choose Tales of the Valiant manually in a generator's Game System option when available; vault-wide profile selection is not currently available.",
      "Your campaign pages, session journal and saved stat sheets live in private, local OPFS storage and remain available offline. ToV-specific generator mechanics require the AI Lore Co-Author; when you are offline or AI generation is disabled, generators produce system-neutral lore and notes. Open game content is based on the CC BY 4.0 Black Flag Reference Document.",
    ],
    linkText: "Explore Codex Cryptica for Tales of the Valiant",
    href: "/for/tales-of-the-valiant",
  },
  relatedTools: [
    {
      title: "Tales of the Valiant campaign guide",
      description:
        "Track linked campaign notes, interactive Luck pools, boss Doom points, and BFRD stat blocks in one local-first workspace.",
      href: "/for/tales-of-the-valiant",
    },
    {
      title: "Encounter generator",
      description:
        "Draft combat encounters with party-scaled qualitative challenge ratings and BFRD creature roles.",
      href: "/generators/encounter",
    },
    {
      title: "Session Prep Builder",
      description:
        "Turn tonight's situation into a narrow run sheet with the active NPCs, locations, threads and encounters you need at the table.",
      href: "/tools/session-prep-builder",
    },
  ],
  relatedAnswers: [
    "how-do-i-organise-a-dnd-campaign",
    "how-do-you-organise-rpg-campaign-notes",
    "how-do-you-keep-track-of-npcs-in-a-long-campaign",
    "how-do-you-track-unresolved-plot-hooks-in-an-rpg-campaign",
  ],
  discovery: {
    id: "answer-organise-tales-of-the-valiant-campaign",
    parentCluster: "campaign-notes",
    clusters: ["campaign-notes", "system-guides"],
    primaryIntent: "how to organise a tales of the valiant campaign",
    intentAliases: [
      "how do i organise a tales of the valiant campaign",
      "organising a tov campaign",
      "running tales of the valiant tips",
      "tales of the valiant campaign prep",
      "black flag roleplaying campaign notes",
    ],
    uniqueValue:
      "A Tales of the Valiant campaign organisation framework that pairs linked entity-and-relationship notes with Black Flag session state: carried-over Luck and resting variants, scoped boss Doom pools, and inline 5e-to-BFRD conversion notes.",
    relatedIntents: [
      "for-tales-of-the-valiant",
      "answer-dnd-campaign-organisation",
    ],
  },
  seo: {
    title: "How to organise a Tales of the Valiant campaign | Codex Cryptica",
    description:
      "Organise a Tales of the Valiant campaign around linked NPCs, factions and locations while tracking session-to-session Luck, boss Doom pools, and 5e-to-BFRD conversion notes.",
    image:
      "https://assets.codexcryptica.com/og/how-do-i-organise-a-tales-of-the-valiant-campaign.jpg",
    imageAlt:
      "Game master notes and Black Flag character sheets arranged beside dice and campaign maps",
  },
};
