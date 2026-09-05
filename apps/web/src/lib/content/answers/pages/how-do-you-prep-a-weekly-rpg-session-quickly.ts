import type { AnswerConfigInput } from "../schema";

export const howDoYouPrepAWeeklyRpgSessionQuickly: AnswerConfigInput = {
  slug: "how-do-you-prep-a-weekly-rpg-session-quickly",
  category: "session-prep",
  publishedAt: "2026-09-04",
  question: "How do you prep a weekly RPG session quickly?",
  kind: "framework",
  shortAnswer:
    "Give yourself a 35-minute timebox aimed squarely at the next three hours of play, nothing further out. Pull one or two unresolved hooks from last session's recap, write a strong opening scene, sketch two or three flexible scene nodes instead of a linear plot, prepare one or two portable encounters with condensed stats, and outline two key NPCs with a want and a mannerism. Whatever time is left is an improvisation buffer — everything else gets generated or improvised live.",
  sections: [
    {
      kind: "prose",
      heading: "The trap of weekly overprepping",
      paragraphs: [
        "Weekly gamemaster burnout rarely comes from running sessions; it comes from spending five hours preparing material that the players bypass in the first twenty minutes. When you run games on a weekly cadence, scripting elaborate scenes, writing full NPC backstories, or drawing tactical maps for every potential detour is unsustainable.",
        "Effective weekly prep is not miniature worldbuilding. It is an operational briefing for the next three to four hours of table time. By enforcing a strict 30-to-45-minute preparation timebox, you force yourself to focus only on actionable, high-impact elements that will actually surface during the game.",
      ],
    },
    {
      kind: "list",
      heading: "The 35-minute weekly prep routine",
      intro:
        "Work through these five steps in order. When the timer rings for each step, write what you have and move on.",
      items: [
        {
          term: "Review hooks and recap (5 mins)",
          text: "Review your notes from last session. Identify one or two unresolved player intentions, lingering consequences, or active promises made to NPCs.",
        },
        {
          term: "Strong opening scene (5 mins)",
          text: "Start in media res or with an immediate choice. Never start in a quiet tavern unless someone is kicking the door open; establish momentum in the first three minutes.",
        },
        {
          term: "Flexible scene nodes (10 mins)",
          text: "Jot down two or three probable situations or destinations the party might pursue next. Detail each with three sensory bullet points and one secret or clue.",
        },
        {
          term: "Portable complications (10 mins)",
          text: "Prepare one combat encounter and one social wrinkle that can drop into any scene. Keep stat blocks condensed to Armour Class, Hit Points, and attack bonuses.",
        },
        {
          term: "Key NPC sketches (5 mins)",
          text: "Name two non-player characters likely to appear tonight. Give each an immediate want, what leverage they hold over the party, and one memorable vocal or physical mannerism.",
        },
      ],
      outro:
        "Total elapsed time: thirty-five minutes. You have covered all essential points of friction without scripting a single line of player action.",
    },
    {
      kind: "list",
      heading: "Quick weekly prep versus overprep traps",
      intro:
        "Keep your preparation focused on tonight's actionable choices by avoiding these common energy drains:",
      items: [
        {
          term: "Story and plot",
          text: "Prep two or three modular situation nodes responding to player initiative, rather than a multi-stage sequential storyline with predetermined outcomes.",
        },
        {
          term: "Locations and maps",
          text: "Prep three sensory cues and one discoverable secret per area, rather than drawing complete architectural floorplans and full room descriptions.",
        },
        {
          term: "Non-player characters",
          text: "Prep their name, immediate goal, and a voice quirk, rather than writing multi-page tragic backstories and generating 20-point stat sheets.",
        },
        {
          term: "Encounters",
          text: "Prep one balanced combat and one environmental hazard adaptable to any location, rather than bespoke battle maps for every possible detour.",
        },
        {
          term: "World state",
          text: "Prep one ticking clock (what happens off-screen if the party ignores the hook), rather than simulating regional economics or distant diplomacy.",
        },
      ],
    },
    {
      kind: "example",
      heading: "Worked example: The Sunken Bell Cellar",
      paragraphs: [
        "Here is what a complete 35-minute prep output looks like on an index card before running a fantasy investigation:",
      ],
      items: [
        {
          term: "Opening situation (5 mins)",
          text: "The party awakens at the Drowned Rat Tavern as city bailiffs hammer on the timber door demanding the contraband smuggling ledger the rogue snatched last night.",
        },
        {
          term: "Node A: The Salt-Cellar (3 mins)",
          text: "A hidden dockside cellar controlled by the Wharf Guild. Sensory: brine odour, swaying lanterns, echoing drip. Secret: A drainage grate leads into the Old Aqueduct.",
        },
        {
          term: "Node B: The Sinking Causeway (4 mins)",
          text: "A fog-covered tidal path across the salt marsh. Obstacle: treacherous mud-flats and lurking bog-skulkers.",
        },
        {
          term: "Node C: The Bell Tower Ruin (3 mins)",
          text: "A half-submerged bell tower housing an exile cultist. Dilemma: negotiate safe passage using the ledger or ring the rusted bell to dispel their ward.",
        },
        {
          term: "Portable complication (5 mins)",
          text: "Three zealous Wharf Enforcers (Medium armour, clubs, light crossbows; they want the ledger intact and retreat if their captain falls).",
        },
        {
          term: "NPC sketch (5 mins)",
          text: "Master Aldous Vane. Current want: retrieve the manifest before high tide to avoid the magistrate's scaffold. Mannerism: rhythmically taps brass knuckles and speaks in a raspy whisper.",
        },
        {
          term: "Why it works",
          text: "Every element maps directly to one of the five prep steps and can be reordered or dropped on the fly, so the party's choices — not the index card — drive the session.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "The 5-minute pre-game checklist",
      intro:
        "Right before your players take their seats, have these five items in front of you:",
      items: [
        "The opening sentence written down verbatim so you can launch the session with total clarity.",
        "Condensed combat shorthand (Armour Class, Hit Points, primary attacks) on a single index card or scratchpad.",
        "A list of six culture-appropriate random names ready to assign instantly to improvised bystanders or shopkeepers.",
        "A clear ticking clock consequence that advances if the party chooses to dawdle or rest.",
        "A deliberate improvisation buffer: the willingness to let player decisions reorder or discard your prepared nodes.",
      ],
    },
  ],
  codexConnection: {
    heading: "How Codex Cryptica streamlines weekly prep",
    paragraphs: [
      "Codex Cryptica is designed around the distinction between persistent campaign knowledge and ephemeral session prep. Reusable entities — such as recurring factions, settlement maps, and NPC relationship webs — live permanently in your knowledge graph. When weekly prep begins, you never waste time retyping background lore.",
      "Instead, you can rapidly pull existing vault entities into your session view, drop in procedural complications using instant generators, and sketch node connections on a canvas in minutes. When the session concludes, session logs and updated NPC bonds link directly back into the campaign world without manual bookkeeping.",
    ],
    linkText: "Explore the RPG campaign manager",
    href: "/solutions/campaign-manager",
  },
  relatedTools: [
    {
      title: "RPG encounter generator",
      description:
        "Generate balanced combat encounters and complications ready to drop into any session node.",
      href: "/generators/encounter",
    },
    {
      title: "NPC generator",
      description:
        "Create quick NPCs with distinctive motivations, quirks, and secrets in seconds.",
      href: "/generators/npc",
    },
    {
      title: "Quest generator",
      description:
        "Produce actionable quest hooks and objective threads when planning your opening scene.",
      href: "/generators/quest",
    },
  ],
  relatedAnswers: [
    "how-much-prep-do-you-need-for-an-rpg-session",
    "how-do-you-track-unresolved-plot-hooks-in-an-rpg-campaign",
    "how-do-you-make-npcs-memorable-without-lots-of-prep",
    "how-do-you-keep-track-of-time-in-a-tabletop-campaign",
    "how-do-you-run-a-heist-in-a-tabletop-rpg",
    "how-do-you-start-worldbuilding-from-scratch",
    "how-do-you-write-a-one-shot-adventure",
  ],
  discovery: {
    id: "answer-prep-weekly-session-quickly",
    parentCluster: "session-prep",
    primaryIntent: "how to prep a weekly rpg session quickly",
    intentAliases: [
      "how to prep a weekly session fast",
      "quick weekly rpg prep routine",
      "fast session prep for gm",
      "how to prepare weekly dnd session quickly",
      "weekly rpg prep checklist",
    ],
    userJob: "adopt-workflow",
    uniqueValue:
      "Provides a repeatable 35-minute timeboxed preparation routine for weekly tabletop campaigns, detailing a 5-step checklist, an overprep comparison, and a practical worked example to prevent GM burnout.",
    relatedIntents: [
      "answer-session-prep",
      "answer-unresolved-plot-hooks",
      "answer-npcs-memorable",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-session-prep",
        reason:
          "answer-session-prep establishes the high-level philosophy of prep coverage versus time spent, whereas this guide provides an operational, timeboxed 35-minute step-by-step prep routine and overprep comparison specifically engineered for weekly GM cadences.",
      },
    ],
  },
  seo: {
    title: "How to Prep a Weekly RPG Session Quickly | Codex Cryptica",
    description:
      "A practical, timeboxed 35-minute preparation routine for weekly tabletop RPG sessions. Avoid GM burnout with focused scene nodes, portable encounters, and minimal overprep.",
    image:
      "https://assets.codexcryptica.com/og/how-do-you-prep-a-weekly-rpg-session-quickly.jpg",
    imageAlt:
      "Atmospheric tabletop RPG gamemaster preparation desk with session prep notes, dice, and open campaign binder",
  },
};
