import type { AnswerConfigInput } from "../schema";

export const howDoIPrepareADndSession: AnswerConfigInput = {
  slug: "how-do-i-prepare-a-dnd-session",
  category: "session-prep",
  publishedAt: "2026-10-07",
  question: "How do I prepare a D&D session?",
  kind: "how-to",
  shortAnswer:
    "Prepare a D&D session by deciding what changed since last time, picking tonight's pressure, and getting ready for the ways 5e groups actually play: ready a mix of combat, exploration and social material, prep encounters and monsters so they can move rather than fire on a fixed cue, and keep compact rules notes for the spells and features that can bypass your obstacles. Work out likely NPCs and places, make sure any key clue or lead has more than one route to the party, sketch how the situation shifts if the players succeed, fail, stall or go elsewhere, and keep a small reserve of names, rumours and portable encounters. Copy only what you need to run onto a single table-ready sheet.",
  sections: [
    {
      kind: "prose",
      heading: "D&D prep is not scripting a story",
      paragraphs: [
        "A D&D group can turn a careful plan sideways with one spell, one clever question, or one decision to go left when you expected right. If your notes assume the party will take the road, fight the guards in order and ask the baron exactly the right question, any of those choices breaks the session. The work is to prepare a situation that holds up when the players do something you did not expect, not a sequence of scenes that requires them to follow your outline.",
        "That distinction matters more in D&D than in many games because the system gives players several reliable ways to skip obstacles. Teleportation, divination, charm and speak with dead, wild shape scouting, flight, and even a well placed pass without trace can remove a locked door, a hidden clue or a guarded road from the fiction in a single action. You do not need to block those tools, you need to prep so the session still works when someone uses them.",
      ],
    },
    {
      kind: "list",
      heading: "An eight-step D&D prep workflow",
      intro:
        "Use this as a prep order, not a scene order. Work through what is uncertain tonight and compress what your campaign already makes clear:",
      items: [
        {
          term: "Know what changed last session",
          text: "Where the party ended, what they promised or left unresolved, which NPCs now expect something from them, and what resources they have left. In 5e, note hit dice, spell slots and consumables only where they affect tonight's tension. A party that ended on a long rest faces the next challenge differently from one that pressed on with two spell slots between them, so record the actual state at the table rather than assuming a full reset.",
        },
        {
          term: "Pick tonight's pressure",
          text: "Name the one thing that moves whether or not the party acts: a rival closing on the same ruin, a curse advancing, a trial date, a faction spending gold to hire the party's enemies. Pressure is not always a threat; an opportunity that closes or a celebration that proceeds without the party also forces a choice. One clear pressure keeps prep focused when the players widen the scope.",
        },
        {
          term: "Identify likely NPCs and places",
          text: "List the people and locations the party can credibly reach tonight. For each NPC note a want, a source of influence or information they hold, and what they do next if nobody intervenes. For each place note what is there, who controls it, and what makes it risky or rewarding to enter. Two or three of each is usually enough; a published chapter may already give you more than you need, so prune to what tonight can actually contain.",
        },
        {
          term: "Prepare information the party may need",
          text: "If progress depends on a fact, do not tie it to one exact spell, skill or NPC. Give any load-bearing clue at least two independent routes: a witness who saw something, a physical trace at the scene, and a document or NPC who can confirm it under the right pressure. For divination-heavy groups, decide in advance what commune, augury, speak with dead or locate object can and cannot reveal here, so you can answer quickly without improvising a contradiction.",
        },
        {
          term: "Prepare one or two likely encounters, not a railroad",
          text: "Ready encounters as portable material with a clear purpose beyond dealing damage. Note monsters with compact stat references (AC, hit points, key saves, one or two signature actions) rather than copying full blocks, and set a morale or exit condition so the fight can end before it becomes a grind. Place encounters where they make sense to appear, then let them stay portable: a patrol can meet the party on the road, guard the ruin, or be found already defeated, depending on what the party does.",
        },
        {
          term: "Know what changes on success, failure, delay or a different approach",
          text: "For the main pressure write one line for each branch: what the party gains on a win, what it costs on a setback, what gets worse if they stall, and what happens if they go somewhere you did not expect. This is not four alternate scripts, it is permission to keep playing. Keep rests in mind here: a night spent resting may give back resources but also give rivals time to act.",
        },
        {
          term: "Keep reserve material",
          text: "A short bench you can drop in when the party outpaces you: three or four names, a spare NPC with a want and a secret, a portable combat or social complication, and two rumours that point back to the campaign's larger threads. Reserve material is not filler, it is how you avoid stalling when the players earn a lead you did not map.",
        },
        {
          term: "Collapse it into a table-ready run sheet",
          text: "Copy only what you must see during play onto one page: the opening beat, the pressure and its clock, the NPC wants, the place notes, the clue routes, the encounter references, and the reserve bench. Everything else stays in your broader notes. If you cannot run the session from that single page plus the Monster Manual, the run sheet is carrying too much prose and not enough prompts.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "The D&D details that most often catch prep out",
      paragraphs: [
        "Three system habits in 5e deserve explicit prep so they do not ambush you at the table. First, the expected mix of combat, exploration and social play means any single-pillar session can feel thin to part of the table. Even a heavy combat night benefits from one social lever or explorable detail, and a mystery benefits from a credible threat so that combat-focused characters have something to do while others investigate.",
        "Second, spells and class features bypass obstacles by design. Invisibility, misty step, charm person, suggestion, speak with animals, locate object, dispel magic, and the various ways to fly, burrow or breathe underwater can skip a guarded door, a suspicious guard or a flooded passage. Prep the obstacle so it still yields something interesting when bypassed, rather than writing a door that only opens one way. A vault reached by teleport is still a vault with a ledger inside it, a guardian who heard the spell, or a choice about what to take before the alarm spreads.",
        "Third, published adventures reward pruning. A Wizards chapter gives you far more rooms, NPCs and read-aloud text than one session can hold, plus stat blocks and magic items you will need quickly at the table. Read enough ahead to understand the through-line, then mark only the material that can matter tonight. Flag the page numbers for those stat blocks and treasure parcels on the run sheet, rather than recopying them, and decide which boxed text you will paraphrase rather than read.",
      ],
    },
    {
      kind: "table",
      heading: "Published adventure versus homebrew: where prep differs",
      headers: ["Area", "Homebrew prep", "Published adventure prep"],
      rows: [
        [
          "Scope",
          "You choose every NPC, place and pressure, so scope creeps when you keep adding",
          "Scope is already generous, so the job is cutting tonight's slice from the chapter",
        ],
        [
          "Lore burden",
          "You carry continuity in your own notes between sessions",
          "You carry continuity between the book and the party's deviations from it",
        ],
        [
          "Maps and stat blocks",
          "You decide which battles need a grid and which can be theatre of the mind",
          "Many maps and stat blocks are already provided, so note which ones tonight needs and where they are",
        ],
        [
          "Information routes",
          "You place every clue deliberately, so nothing is findable by accident",
          "Clues are already scattered across rooms, so check that at least one path still works if the party skips a section",
        ],
        [
          "Improvisation gaps",
          "Any blank space is yours to fill when the party goes wide",
          "Blank spaces are often the settlements or wilderness between set pieces, so keep reserve material for those stretches",
        ],
      ],
    },
    {
      kind: "prose",
      heading: "Keep compact rules references, not copied blocks",
      paragraphs: [
        "D&D sessions stall when the table has to pause to look up a spell, a condition, or a monster trait in full. For tonight's likely material, keep a small reference strip on the run sheet: the save DC and effect for a charm or hold spell the villain may use, the exact wording of a divination the party favours, the one or two resistances or immunities that will matter, and the page numbers for any monsters or treasure you expect to need. A single line per entry is enough; you are buying speed at the table, not replacing the book.",
        "This also helps with rest pacing. If you tend to run one big fight per long rest, spellcasters and fighters will feel different from a table that runs several encounters between rests. Note which structure your session uses tonight so you can judge difficulty honestly. An encounter that is moderate across an adventuring day can feel brutal as a single set piece when the party arrives fresh, and trivial when they arrive depleted.",
      ],
    },
    {
      kind: "example",
      heading: "Worked example: the ledger in Saltspire",
      paragraphs: [
        "The hook is short enough to fit a published or homebrew campaign: Reeve Callan has been skimming the Saltspire grain tax, and the courier carrying proof disappeared on the coast road. The circuit judge arrives in two days. The session starts as the courier's horse trots into town with empty saddlebags.",
      ],
      items: [
        {
          term: "Thin D&D prep that breaks at the table",
          text: "The notes say the party must find the ledger in the mill loft, must fight Callan's two guards there, and must bring the ledger to the magistrate. The ambush site has one clue, a signet ring, and the hedge trader who saw the ambush will only talk after a successful DC 15 Persuasion check. When the wizard casts speak with dead on the courier, charms the trader, or simply flies over the mill to look in the loft window, there is nothing prepared to answer them, and a failed roll leaves the session with nowhere to go.",
        },
        {
          term: "D&D-ready prep from the same hook",
          text: "Pressure: Callan needs the ledger burned before the judge arrives; if the party rests overnight, the guards move the courier and the book is ash by morning. People: Callan wants the evidence gone and fears the judge; Maren, the courier's sister, wants her brother found and does not trust the watch; Sergeant Dosh, Callan's man in the watch, is nervous about how far this has gone; Old Tebb the hedge trader saw the cart turn toward the mill and wants coin before he talks. Places: the ambush site on the coast road (churned mud, dropped signet, cart ruts toward the mill), the mill grain loft (courier, two guards, ledger hidden under sacks, page 247 for guard stats), Callan's counting house (tax rolls that prove the theft on their own, clerk who can be charmed or bribed). Clues: the courier is alive at the mill (Tebb saw it, the mud shows it, Dosh will admit it if pressed and speak with dead can learn the same from the fallen driver), Callan ordered the taking (signet is his house, Dosh can confirm it, letters in the counting house show it). Encounters: guards at the mill statted as scouts with a morale break when one falls, AC 13, 16 hit points, +4 to hit, and a chance to parley; a separate social complication where Callan offers the party good coin to leave Saltspire, with his charm-ready adviser in the room. All encounters are portable, so the patrol can appear on the road, at the mill, or not at all. Rules strip: speak with dead (five questions, corpse must have had a mouth, page 277), charm person (advantage on social checks, target knows it was charmed after, page 221), pass without trace (+10 Stealth, 30 feet, page 264).",
        },
        {
          term: "Why it works",
          text: "Every branch has material behind it, every load-bearing fact has more than one route, and the features that usually bypass prep have answers ready. If the party charms Dosh, he still points to the mill but the complication shifts to Dosh fearing Callan's retaliation. If they fly to the loft, they still face the guards and the choice of what to do with the ledger once they have it. If they do nothing, the pressure advances on its own: the courier is moved, the ledger is burned, and the counting house rolls become the harder but still available proof, with Maren blaming the party for the delay in a way the players can feel next session.",
        },
      ],
    },
    {
      kind: "example",
      heading: "Publishing versus homebrew through the same hook",
      paragraphs: [
        "The same courier setup shows where the two prep modes ask for different work, even though the table sees the same fiction.",
      ],
      items: [
        {
          term: "If this is a published chapter",
          text: "Skim two chapters ahead to see what the ledger actually unlocks, then ignore the rest for tonight. Mark which of the chapter's eight rooms can matter before the judge arrives and grey out the others. Flag the printed scout stat block and the magistrate's social notes by page number, and decide which boxed text you will paraphrase rather than read aloud. The reserve problem is usually what happens when the party leaves the mapped village to chase a lead down the coast road, so keep one portable encounter and two names for that stretch.",
        },
        {
          term: "If this is homebrew",
          text: "You choose whether Saltspire is a three-location town or a full region, so cap it. Name two factions that care about the ledger besides Callan, give each a visible move they make if the party stalls, and let the map stay small enough to run without pre-drawing every building. The risk here is adding too much new lore to explain the theft, so reuse continuity the players already know: a rival the party has already annoyed makes a better complication than a new conspiracy invented tonight.",
        },
        {
          term: "Why it works",
          text: "Both versions keep the same run sheet: one pressure, three or four NPCs with wants, two or three places, clue routes that do not depend on a single roll or spell, and a compact rules strip for the table's favourite bypasses. The difference is where the GM spends the last hour: pruning an abundant map in the published case, and limiting new additions in the homebrew case.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "D&D session prep checklist",
      intro:
        "Run through this before you sit down. Every line should be one sentence on the run sheet:",
      items: [
        "Where did we end last session, and what resources does the party actually have to start tonight?",
        "What is tonight's pressure, and what changes if the party acts, stalls, or goes elsewhere?",
        "Which NPCs might they meet, what does each one want, and what influence or information do they hold?",
        "Which places could matter, who controls each one, and what is risky or rewarding about entering?",
        "Is any necessary fact findable at least two ways, including answers for the party's favourite divination or charm spells?",
        "Which one or two encounters are likely, statted compactly with AC, hit points, key saves and a morale or exit condition, ready to appear wherever the fiction puts them?",
        "What are the rest implications tonight, and does the expected number of encounters before the next rest match what the session needs?",
        "What compact rules notes (save DCs, condition effects, page numbers) need to be on the sheet for speed?",
        "What reserve names, NPC, complication and rumours can I drop in when the party goes wide?",
        "Can I run tonight from one page plus the books, without reading a paragraph aloud at the table?",
      ],
    },
  ],
  codexConnection: {
    heading: "Turn tonight's situation into a run sheet",
    paragraphs: [
      "When the pressure, people, places and clue routes are clear in your head, the remaining work is turning them into something you can actually use at the table. The Session Prep Builder follows the same eight steps with your own hook: it keeps your pressure, NPCs and places linked, drafts only the steps you leave empty, and flags any necessary fact that has only one way to be found so you can add a second route before play.",
      "The result is a one-page run sheet you can copy, print, or save to the Vault where the same NPCs, locations and factions stay connected for next session. Use a generator only for the gap in front of you: a quick NPC when the bench is empty, a rumour to give a clue a new route, or a spare encounter to keep in reserve.",
    ],
    linkText: "Prepare your next D&D session",
    href: "/tools/session-prep-builder",
  },
  relatedTools: [
    {
      title: "Session Prep Builder",
      description:
        "Turn your hook into a one-page D&D run sheet, with AI drafting only the steps you leave empty.",
      href: "/tools/session-prep-builder",
    },
    {
      title: "D&D NPC Generator",
      description:
        "A named D&D character with a want and a secret when the people slot is thin.",
      href: "/tools/dnd-npc-generator",
    },
    {
      title: "Encounter Generator",
      description:
        "A portable combat or social complication for the reserve list, statted for quick use.",
      href: "/generators/encounter",
    },
    {
      title: "Quest Hook Generator",
      description:
        "A hook, patron request or rumour to give a clue a second route or start the next pressure.",
      href: "/tools/quest-hook-generator",
    },
    {
      title: "Settlement Generator",
      description:
        "A town or holding with people and problems when play moves somewhere new.",
      href: "/generators/settlement",
    },
  ],
  relatedForPages: [
    {
      title: "Dungeons & Dragons",
      description:
        "Campaign management for D&D 5e, from prep to session notes.",
      href: "/for/dungeons-and-dragons",
    },
  ],
  relatedAnswers: [
    "how-do-i-prepare-an-rpg-session-step-by-step",
    "how-much-prep-do-you-need-for-an-rpg-session",
    "how-do-you-prep-a-weekly-rpg-session-quickly",
    "how-do-i-balance-rpg-combat-encounters-without-a-tpk",
    "how-do-i-keep-players-engaged-during-other-players-turns-in-combat",
    "how-do-i-handle-players-asking-an-npc-to-tell-us-everything-you-know",
    "how-do-i-make-combat-faster-without-making-it-less-exciting",
    "how-do-i-turn-an-rpg-idea-into-an-adventure",
    "how-do-i-organise-gm-notes-for-in-person-play",
    "how-do-you-run-a-mystery-without-railroading",
  ],
  discovery: {
    id: "answer-prepare-dnd-session",
    parentCluster: "session-prep",
    primaryIntent: "how do i prepare a d&d session",
    intentAliases: [
      "how to prepare a dnd session",
      "how to prep a dnd session",
      "dnd session prep checklist",
      "dnd 5e session preparation guide",
      "how to prep tonight's dnd game",
      "dnd encounter prep without railroading",
      "how to prep a published dnd adventure",
      "dnd dm session prep framework",
    ],
    uniqueValue:
      "An eight-step D&D-shaped prep workflow covering combat, exploration and social mix, portable encounter and monster prep, spell and feature bypasses, compact rules references, published versus homebrew pruning, and a table-ready run sheet, with a ledger hook worked through both styles.",
    userJob: "adopt-workflow",
    relatedIntents: [
      "answer-prepare-session-step-by-step",
      "answer-session-prep",
      "answer-prep-weekly-session-quickly",
      "tools-session-prep-builder",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-prepare-session-step-by-step",
        reason:
          "That page teaches a system-neutral nine-step prep procedure from hook to run sheet; this one is the D&D-shaped version covering encounter mix, spell bypasses, compact stat references and published versus homebrew pruning, with D&D worked examples.",
      },
      {
        with: "answer-session-prep",
        reason:
          "That page answers how much prep is enough and separates essential prep from worldbuilding; this one is the step-by-step D&D procedure for producing that essential prep for tonight.",
      },
      {
        with: "answer-prep-weekly-session-quickly",
        reason:
          "That page is a timeboxed routine for GMs already running a weekly campaign; this one teaches the full D&D prep workflow including the encounter, rules-strip and reserve decisions that the routine then timeboxes.",
      },
      {
        with: "tools-session-prep-builder",
        reason:
          "This answer teaches the D&D prep method for the reader to follow; the tool is an interactive workspace that applies the same steps to the GM's own hook.",
      },
    ],
  },
  seo: {
    title: "How Do I Prepare a D&D Session? | Codex Cryptica",
    description:
      "A D&D 5e prep workflow: eight steps from pressure to run sheet, with portable encounters, spell bypasses, compact rules notes, and published versus homebrew prep.",
    image:
      "https://assets.codexcryptica.com/og/how-do-i-prepare-a-dnd-session.jpg",
    imageAlt:
      "A Dungeon Master's desk by candlelight with a one-page run sheet, D&D stat notes, a coast road map, a sealed ledger and a d20 beside ink and quill",
  },
};
