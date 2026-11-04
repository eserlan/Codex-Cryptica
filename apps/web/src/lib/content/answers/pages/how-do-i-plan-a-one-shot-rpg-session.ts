import type { AnswerConfigInput } from "../schema";

export const howDoIPlanAOneShotRpgSession: AnswerConfigInput = {
  slug: "how-do-i-plan-a-one-shot-rpg-session",
  category: "session-prep",
  publishedAt: "2026-11-04",
  question: "How do I plan a one-shot RPG session?",
  kind: "how-to",
  shortAnswer:
    "Plan a one-shot by working backward from the session you actually have: fix the hard stop, group size, system and tone, then scope one adventure to that slot, send players a short premise brief, prepare characters with a reason to act together, and reduce everything else to a one-page run sheet. Before the day, test the slow rules, maps, links and handouts, mark one scene you can drop and one alternate route for any essential fact, and decide your first spoken line. Design and pacing are separate jobs, covered by the linked Answers; this one ends with a game you can open and run tomorrow.",
  sections: [
    {
      kind: "prose",
      heading: "Start with the actual slot, not the ideal one",
      paragraphs: [
        "Write down the constraints before you touch the adventure: the hard stop when people must leave or log off, how many players are coming, how well they know the system, where you are playing, which tools that venue needs, the game system, and the tone everyone expects. These constraints decide how much material you can honestly prepare.",
        "They change the plan in concrete ways. A three-hour convention game for beginners favours pre-generated characters (pregens, covered below) when character creation or rules teaching would consume a substantial part of the slot; it also needs printed or pre-loaded sheets and an opening that starts in the middle of the problem. A five-hour home game with experienced friends can allow character creation at the table, a slower opening, and one more location. Neither plan is the better game; they are answers to different slots. If a fact is still unknown, plan for the harder version: fewer players who know the system, less usable time, and a venue you have not tested.",
      ],
    },
    {
      kind: "table",
      heading: "Choose or scope the adventure you will run",
      headers: ["Starting material", "Fits when", "Your planning job"],
      rows: [
        [
          "Published scenario",
          "Time is short, or you want tested encounters and handouts",
          "Read it once for the objective and the ending, then cut or mark optional scenes to fit your slot; published page counts rarely match your table speed",
        ],
        [
          "Your own premise or homebrew idea",
          "You have a situation you want to test and time to shape it",
          "Check that the objective, the essential information and at least two plausible resolutions fit this group and this system",
        ],
        [
          "Generated starting material",
          "You have a slot and a tone but no premise yet",
          "Treat the output as raw material: keep the objective and one complication, rewrite names and motives for your players, and discard the rest",
        ],
      ],
    },
    {
      kind: "prose",
      heading: "Scope it against this group before you prepare anything else",
      paragraphs: [
        "Whichever source you chose, test it against the slot with three questions. Can the players state the objective after five minutes? Can every essential fact be found in more than one way, so one missed room or failed roll cannot stall the evening? Can the situation end in more than one way, including the players failing or walking away? If any answer is no, fix that now by cutting a location, moving a fact, or naming an ending you can accept. How to design the scenario itself, including scene structure, is covered in [How do you write a one-shot adventure?](/answers/how-do-you-write-a-one-shot-adventure); planning starts once that material exists in some form.",
      ],
    },
    {
      kind: "list",
      heading: "Send the premise brief before anyone arrives",
      intro:
        "Players prepare better, and choose characters that fit, when they know what they are walking into. Send one short message a few days ahead:",
      items: [
        {
          term: "The brief itself",
          text: "Two or three sentences covering the situation, the tone and themes, and what the characters will broadly be doing. For example: a storm has cut off a coastal watchtower, the keeper has not signalled for two days, and the characters are the rescue party; expect weather, heights and one hard choice about who gets carried out first.",
        },
        {
          term: "Character expectations",
          text: "Say whether characters are provided, made together on the night, or brought from home, plus any limits that matter: level or starting resources, setting restrictions, and whether characters must know each other beforehand.",
        },
        {
          term: "Content and comfort",
          text: "Name likely content plainly, such as drowning risk, body horror, or harm to children, and ask players to tell you privately about anything to avoid or handle off screen. Agree how anyone can pause or skip a scene. For a fuller treatment of expectations and boundaries, see [How do I run a successful session 0?](/answers/how-do-i-run-a-successful-session-0); a one-shot usually needs the short version of that conversation, held before play rather than during it.",
        },
        {
          term: "Logistics",
          text: "Confirm start and hard stop, address or call link, what to bring, and what happens if someone is late. Late arrivals are the commonest reason a one-shot loses its opening, so say whether you will start without them.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Prepare characters that belong in this story",
      intro:
        "Character preparation is where one-shot planning most often overspends. Choose the option that protects playing time:",
      items: [
        {
          term: "Pre-generated characters (pregens)",
          text: "Favour pregens for beginners, convention games and any slot under four hours, where creation or rules teaching would otherwise take a substantial share of the session. Where creation is quick or part of the intended format, use the next option instead. Give each pregen an immediate motivation tied to tonight's situation, one simple connection to another character, and highlight the procedures that character is likely to use tonight, with any signature ability explained in plain language on the sheet. Keep the complete sheet or rules reference to hand, so a player can still choose an option you did not predict. Offer more pregens than players so the last person still chooses.",
        },
        {
          term: "Fast character creation on the night",
          text: "Works when creation is quick in your system or is part of the game's intended format. Set a firm time limit, provide partly built characters or templates, and build connections between characters as part of creation: each player states one reason their character trusts or needs another. Without connections, introductions may take time without giving the adventure a reason to use them.",
        },
        {
          term: "Characters brought from home",
          text: "Ask for them in advance, check them against the brief, and write one hook per character into your run sheet. A character with no reason to care about tonight's problem becomes a spectator at someone else's session.",
        },
        {
          term: "Accessibility of the materials",
          text: "Check that sheets and handouts are readable: clear type, no information carried by colour alone, and a digital copy players can enlarge or use with a screen reader where needed. Ask about access needs in the brief rather than guessing on the night.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Reduce the adventure to a one-page run sheet",
      intro:
        "Your full notes can stay as long as they are. What you run from is one page holding only what you must find in seconds:",
      items: [
        {
          term: "Opening situation and first prompt",
          text: "Where the characters are, what is visibly wrong, and the first thing you will say or ask.",
        },
        {
          term: "Core conflict and resolution conditions",
          text: "Who wants what, what happens if nobody acts, and what counts as success, partial success and failure tonight.",
        },
        {
          term: "People",
          text: "Each important non-player character in one line: name, how you will voice or describe them, what they want, and what they know.",
        },
        {
          term: "Locations and essential information",
          text: "Each place in one line, plus the facts the players must be able to learn and where else each fact can surface.",
        },
        {
          term: "Opposition and numbers",
          text: "Stats, difficulties and damage figures you would otherwise look up, copied onto the page. Reference-only lore stays in the book or scenario, not here.",
        },
      ],
      outro:
        "If a line on the page does not help you answer a player, resolve an action or move the situation, it belongs in the reference pile. The general method behind this sheet is set out in [How do I prepare an RPG session step by step?](/answers/how-do-i-prepare-an-rpg-session-step-by-step); the one-shot version is stricter because there is no next session in which to recover a stall.",
    },
    {
      kind: "list",
      heading: "Dry-run the friction before the players arrive",
      intro:
        "Most one-shot failures are logistical, not creative. Walk through the session as a player would and test the points where play usually sticks:",
      items: [
        {
          term: "Rules you will have to look up",
          text: "List the procedures tonight is likely to need, such as grappling, drowning, vehicle handling or a signature spell, and read them now. Combat is the usual time risk: check the opposition's abilities and decide in advance how you will keep turns moving, for example by grouping minor opponents or preparing their first two actions.",
        },
        {
          term: "Maps, tokens and handouts",
          text: "Open every map, check tokens are named and visible to the right people, and confirm handouts are legible at the size players will see them. Print spares for in-person games.",
        },
        {
          term: "Online tools and permissions",
          text: "Join your own call or table as a guest would: check the link works, audio and dice rolling behave, character sheets open without an account you do not control, and files you plan to share are actually shared.",
        },
        {
          term: "Physical kit",
          text: "Dice (including spares for players who forget), pencils, name cards or tents, and a way to track initiative and conditions that everyone can see.",
        },
        {
          term: "Low-tech fallback",
          text: "Decide now what you will do if the venue wifi, power or platform fails: a printed run sheet, a paper map sketch and physical dice cover most games. Naming the fallback in advance turns a cancelled session into a slower one.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Mark the flexible options in advance",
      intro:
        "Decide these four things while you are calm, not mid-session with five people watching:",
      items: [
        {
          term: "One optional scene",
          text: "Name the scene you will drop first if time runs short, and check the ending still works without it. Mark it on the run sheet so the decision is already made.",
        },
        {
          term: "An alternate route for essential information",
          text: "For each fact the ending depends on, note a second place it can surface: a different witness, a physical trace at the scene the players did choose, or the opposition revealing it by acting on it.",
        },
        {
          term: "An escalation tied to fictional time",
          text: "Write one event with a cause already established in the fiction, a trigger tied to elapsed fictional time, and a warning the characters can see or hear in time to act on it. If play pauses because the players are unsure what their characters know or what options they have, stop and clarify the situation, restate the choices as their characters understand them, or talk briefly about the table time left. Do not treat confusion at the table as delay in the fiction, and do not advance a deadline the characters had no way to anticipate.",
        },
        {
          term: "The minimum ending",
          text: "Know the least that must happen for the session to end legitimately: the decision the players must face and the consequence that follows from it. Protect that, and let everything else be negotiable. How to budget the evening's time and where to place checkpoints is covered in [How do I pace an RPG one-shot?](/answers/how-do-i-pace-an-rpg-one-shot); planning supplies the cuttable material that pacing then uses.",
        },
      ],
    },
    {
      kind: "example",
      heading: "Worked example: rescue at a storm-isolated watchtower",
      paragraphs: [
        "The slot is a four-hour home game for four players, two of them new to the system. The GM has a premise, a coastal watchtower cut off by a storm, and no written adventure. This is the planning output, ready the night before.",
      ],
      items: [
        {
          term: "Invitation sent to the players",
          text: "Storms have cut the cliff path to Harrow Watch for two days and the signal lamp has gone dark. You are the volunteers going up before the next high tide. Expect weather, heights and an injured keeper who cannot walk. Pregens provided; tell me privately if heights or drowning are content to keep off screen.",
        },
        {
          term: "Characters and connections",
          text: "Five pregens for four players, each with one line tying them in: the keeper's younger sibling, the ferryman who owes the keeper money, the watch volunteer who found the lamp dark, the surgeon who treated the last keeper, and a climber who built the cliff stair. Each sheet highlights the procedures that character is likely to use tonight and explains their signature ability in plain words, with the full sheet available if a player chooses something unexpected.",
        },
        {
          term: "What the players are expected to decide",
          text: "How to reach the tower now the rope bridge is down; whether to spend time securing the stair or push on as the tide rises; who is carried out first if the keeper and the keeper's records cannot both be moved quickly; and whether to relight the lamp or abandon the tower before the storm peaks.",
        },
        {
          term: "Run sheet: opening",
          text: "Cliff stair in rain, bridge ropes hanging loose, lamp dark. First prompt is listed at the end of this example.",
        },
        {
          term: "Run sheet: people",
          text: "Ansa Vale, keeper, broken leg, wants the tower logbook carried out with her. Pell, her assistant, is hiding that he panicked and dropped a flask of lamp oil in the store room.",
        },
        {
          term: "Run sheet: places and facts",
          text: "Stair, lamp room, and an optional flooded store room (marked droppable below). Facts: the bridge posts were already rotten (visible on the stair, from Pell, in the logbook). The lamp room holds a sealed spare oil can by the lamp. The logbook is the only record that Ansa reported the posts and requested oil; carried out dry, it clears her at the harbour board inquiry.",
        },
        {
          term: "Run sheet: tide trigger",
          text: "Six marks where every player can see them. Advance one after each substantial fictional effort (crossing to the tower, searching a room, attempting the carry) and say aloud which named step the water has reached. Three marks: lowest steps under water. Six marks: lower stair impassable until the tide drops after dawn. Opposition: weather and the building; fall and cold-water numbers copied onto the sheet.",
        },
        {
          term: "Run sheet: independent outcomes",
          text: "Keeper: treated that night if carried below the lower stair before the sixth mark, or brought down by another route after it floods; treated after dawn if the party shelters with her until the tide drops; without rescue only if the party withdraws without her or abandons the carry. Logbook: evidence only if carried out dry, whichever way the keeper gets out. Lamp: relit only if the party uses the lamp room spare oil to relight it, whichever way the other two turn out. So lowering Ansa on a rope after the flood still rescues her that night even if the logbook is left behind and the lamp stays dark; each result stands for its own reason.",
        },
        {
          term: "Pre-flight checklist for this game",
          text: "Read the climbing and falling rules and note the difficulties on the run sheet. Print the tower sketch, the tide track and one spare of each. Check every player can see the tide track and can follow which mark the water has reached. Put spare dice and name tents in the game bag. Fallback: the whole game runs from the printed sheet, sketch and track if the shared screen fails.",
        },
        {
          term: "Optional material and alternate delivery",
          text: "Optional: a flooded store room holding salvage and Pell's dropped oil flask. Drop it first if the stair scenes run long; dropping it loses only the salvage and Pell's confession scene, because the lamp room spare oil keeps relighting available either way. Alternate route: if nobody questions Pell, the rotten bridge posts and the logbook entry carry the same fact. If the tide reaches the sixth mark, that descent closes; the party can still try the cliff climb, lower Ansa on a rope from the lamp room, or shelter with her until the tide drops.",
        },
        {
          term: "First line",
          text: "Rain is coming sideways off the sea, the lamp above you is dark for the second night, and halfway up the stair you can see the bridge ropes hanging loose. What do you do?",
        },
      ],
    },
    {
      kind: "prose",
      heading: "The final readiness check",
      paragraphs: [
        "On the day, sort everything into three piles. Shared with players: the premise brief, character sheets or creation limits, and any handout they start with. Open on your screen or table: the one-page run sheet, the essential stats, the map, and your fallback. Droppable without regret: the optional scene, the extra lore, and any encounter whose only job was to fill time. If those three piles exist and you know your first spoken prompt, you are ready. From the first decision onward, the work changes from planning to running the session at the table; keep the run sheet in front of you and let the prepared options, alternate routes and endings do their work there. [How do I pace an RPG one-shot?](/answers/how-do-i-pace-an-rpg-one-shot) takes over from that first prompt, covering how to keep the session moving toward its ending.",
      ],
    },
    {
      kind: "checklist",
      heading: "One-page one-shot planning checklist and run sheet",
      intro:
        "Copy this and fill in each field. Leave a field blank only if you have consciously decided you do not need it:",
      items: [
        "Slot: date, start, hard stop, venue or call link, and the system we are playing.",
        "Players: how many, how familiar with the system, and any access or comfort needs I have been told about.",
        "Hook: the situation in two or three sentences, as sent to the players, including tone and likely content.",
        "Characters: pregens prepared (at least one spare), or creation limits and time allowed, plus one connection between characters.",
        "Opening: where the characters start, what is visibly wrong, and my first spoken prompt.",
        "Core conflict: who wants what, and what changes if nobody acts.",
        "Critical information: each fact the ending needs, with two ways the players can learn it.",
        "Expected decision points: the three to five choices I am ready for, without assuming which way they go.",
        "People and places: one line each, with names, wants and the numbers I would otherwise look up.",
        "Supporting assets tested: maps, tokens, handouts, links, permissions, dice and a low-tech fallback.",
        "Optional content: the scene I will drop first, and the escalation tied to fictional time, with its warning sign.",
        "Fail-forward and ending: what happens on success, partial success and failure, and the minimum that must happen to end the session honestly.",
      ],
    },
  ],
  codexConnection: {
    heading: "Turning the plan into a run sheet in Codex Cryptica",
    paragraphs: [
      "The Session Prep Builder in Codex Cryptica prepares the situation, people, places, information and consequences portion of the plan. Working from your hook, it drafts the Start, Pressure, People, Places, Information, Complications, Consequences and Reserve sections you leave empty, and leaves the sections you have already settled alone. Keep its run sheet alongside your own slot notes, pregens and asset checks, because logistics, character preparation and the pre-flight tests stay in your planning notes rather than in the Builder output.",
    ],
    linkText: "Open the Session Prep Builder",
    href: "/tools/session-prep-builder",
  },
  relatedTools: [
    {
      title: "Session Prep Builder",
      description:
        "Build the Start, Pressure, People, Places, Information, Complications, Consequences and Reserve sections of a run sheet from your hook.",
      href: "/tools/session-prep-builder",
    },
    {
      title: "One-shot adventure builder",
      description:
        "Generate a starting premise with scenes and endings when you have a slot but no adventure yet.",
      href: "/generators/one-shot-adventure-generator",
    },
  ],
  relatedAnswers: [
    "how-do-you-write-a-one-shot-adventure",
    "how-do-i-pace-an-rpg-one-shot",
    "how-do-i-prepare-an-rpg-session-step-by-step",
    "how-do-i-run-a-successful-session-0",
    "how-much-prep-do-you-need-for-an-rpg-session",
    "how-do-i-prepare-a-dnd-session",
    "how-do-i-run-my-first-online-tabletop-rpg-session",
  ],
  discovery: {
    id: "answer-plan-one-shot-rpg-session",
    parentCluster: "session-prep",
    clusters: ["session-prep", "adventure-mapping"],
    primaryIntent: "how to plan a one shot rpg",
    intentAliases: [
      "how to prep a one-shot rpg",
      "one shot dm checklist",
      "prepare to run one shot",
      "one shot session prep",
      "how to plan a one-shot rpg session",
      "planning a one shot rpg session",
    ],
    userJob: "adopt-workflow",
    uniqueValue:
      "Covers pre-session organisation for a one-shot the GM already has: scoping it to the actual slot, the player premise brief, pregens and connections, a one-page run sheet, a dry-run of rules and tools, and marked cuttable material, with a worked watchtower rescue and a copyable planning checklist.",
    acknowledgedOverlap: [
      {
        with: "answer-write-one-shot-adventure",
        reason:
          "That Answer teaches how to design a one-shot scenario and its scene structure; this one covers organising, confirming and rehearsing an existing premise or published scenario before the players arrive.",
      },
      {
        with: "answer-pace-rpg-one-shot",
        reason:
          "That Answer budgets table time during play, with checkpoints and real-time cuts; this one prepares the cuttable scene, alternate clue route and escalation in advance so those cuts are available.",
      },
      {
        with: "answer-prepare-session-step-by-step",
        reason:
          "That Answer gives a general step-by-step prep method for any session, including ongoing campaigns; this one applies pre-session planning specifically to a single self-contained evening with a hard stop and no follow-up session.",
      },
      {
        with: "answer-session-zero",
        reason:
          "That Answer covers the full expectations and boundaries conversation for a group; this one covers the short premise brief and comfort check a one-shot needs before play.",
      },
    ],
    relatedIntents: [
      "answer-write-one-shot-adventure",
      "answer-pace-rpg-one-shot",
      "answer-prepare-session-step-by-step",
      "answer-session-zero",
    ],
  },
  seo: {
    title: "How Do I Plan a One-Shot RPG Session? | Codex Cryptica",
    description:
      "Plan a one-shot you can run tomorrow: scope it to your slot, brief the players, prepare pregens, build a one-page run sheet and test the friction in advance.",
    image:
      "https://assets.codexcryptica.com/og/how-do-i-plan-a-one-shot-rpg-session.jpg",
    imageAlt:
      "A rescue party with a lantern and stretcher approaching a storm-isolated stone watchtower above a broken rope bridge at twilight",
  },
};
