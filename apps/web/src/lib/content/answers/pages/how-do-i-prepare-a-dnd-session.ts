import type { AnswerConfigInput } from "../schema";

export const howDoIPrepareADndSession: AnswerConfigInput = {
  slug: "how-do-i-prepare-a-dnd-session",
  category: "session-prep",
  publishedAt: "2026-10-07",
  question: "How do I prepare a D&D session?",
  kind: "how-to",
  shortAnswer:
    "Prepare a D&D session by deciding what changed since last time, identifying tonight's main situation, and getting ready for the choices your group is likely to make. Prepare the kinds of play that fit the situation and give different characters meaningful ways to contribute. Look at the abilities and resources the current party can bring, work out likely NPCs and places, and give any key information more than one route to the players. Decide what important actors want, what they will do next, and what changes if the party intervenes or leaves things alone. Keep a small reserve of names, rumours and complications, then put the information you need during play somewhere easy to find.",
  sections: [
    {
      kind: "prose",
      heading: "D&D prep is not scripting a story",
      paragraphs: [
        "A D&D group can turn a careful plan sideways with one spell, one clever question, or one decision to go left when you expected right. If your notes assume the party will take the road, fight the guards in order and ask the baron exactly the right question, any of those choices breaks the session. The work is to prepare a situation that holds up when the players do something you did not expect, not a sequence of scenes that requires them to follow your outline.",
        "This matters in D&D because character abilities can change the shape of an obstacle very quickly. Look at what the characters in front of you can actually do: their movement and scouting options, the information magic they prepare, the social effects they use, the obstacles they have already overcome with ease, and the resources currently spent or unavailable. You do not need to prepare against the whole spell catalogue; prepare for the party at your table, and let their abilities change what happens next.",
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
          text: "Where the party ended, what they promised or left unresolved, which NPCs now expect something from them, and what resources they have left. Note hit points, spell slots, hit dice and limited-use features only where they affect tonight's situation. Record what is actually spent or unavailable rather than assuming a full reset.",
        },
        {
          term: "Identify tonight's main situation",
          text: "Name what the party is likely to care about: an opportunity, destination, open dungeon, negotiation, investigation or downtime choice. Give it a moving pressure when delay should matter: a rival closing on the same ruin, a curse advancing, a trial date, or a faction hiring the party's enemies. A clock is useful when time changes the situation, not a requirement for every session.",
        },
        {
          term: "Identify likely NPCs and places",
          text: "List the people and locations the party can credibly reach tonight. For each NPC note a want, a source of influence or information they hold, and what they do next if nobody intervenes. For each place note what is there, who controls it, and what makes it risky or rewarding to enter. Two or three of each is usually enough; a published chapter may already give you more than you need, so prune to what tonight can actually contain.",
        },
        {
          term: "Prepare information the party may need",
          text: "If progress depends on a fact, do not tie it to one exact spell, skill or NPC. Give any load-bearing clue at least two independent routes: a witness who saw something, a physical trace at the scene, and a document or NPC who can confirm it under the right pressure. Check the information abilities this party actually prepares or uses, and decide what they can reveal here so you can answer without improvising a contradiction.",
        },
        {
          term: "Prepare one or two likely encounters, not a railroad",
          text: "Ready encounters as reusable material with a clear purpose beyond dealing damage. Note monsters with compact stat references (Armour Class, Hit Points, key saves and one or two signature actions) rather than copying full blocks, and set a morale or exit condition so the fight can end before it becomes a grind. Portable means reusable where the fiction supports it, not inevitable: a patrol may follow its actual route, guards may relocate after an alarm, and the same stat block may represent another group elsewhere. If the party successfully avoids an encounter, let it stay avoided; their route choice should change what they meet.",
        },
        {
          term: "Know how the situation can change",
          text: "If delay matters, note the current pressure and what it changes. Then note who acts next, what they do if unopposed, and which resources, relationships or locations can change when the party intervenes. Ask what becomes possible afterwards. This handles success, setbacks, delay and unexpected approaches without a pre-written branch for each one. A night spent resting may restore resources while giving rivals time to act, if that fits the situation.",
        },
        {
          term: "Keep reserve material",
          text: "A short bench you can drop in when the party outpaces you: three or four names, a spare NPC with a want and a secret, a portable combat or social complication, and two rumours that point back to the campaign's larger threads. Reserve material is not filler, it is how you avoid stalling when the players earn a lead you did not map.",
        },
        {
          term: "Collapse it into a table-ready run sheet",
          text: "Put the opening, current situation, NPC wants, place notes, clue routes, encounter references and reserve material somewhere you can consult quickly. A single page is a useful target, but a tablet, index cards, larger text or several small reference sheets may suit you better. Keep the run sheet compact enough that you can find what you need during play without searching through your campaign notes.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "The D&D details that most often catch prep out",
      paragraphs: [
        "Prepare the kinds of play your current situation and group are likely to care about. A session can centre on dungeon exploration, negotiation, a long battle, wilderness travel, investigation or downtime. These are useful categories, not a required per-session mix. Make sure different characters still have meaningful ways to contribute to what is happening.",
        "Character abilities can bypass or reshape obstacles by design. Look at the movement, scouting, information and social-control options this party can actually bring, along with obstacles they have already trivialised and resources currently spent or unavailable. Let those abilities matter. If a vault is reached unexpectedly, the ledger, its consequences and the choices around it can still make the situation interesting.",
        "Published adventures often give you more rooms, NPCs and reference material than one session can use. Read enough ahead to understand the through-line, then mark only the material that can matter tonight. Keep a link, bookmark or source reference for the relevant rules and stat blocks instead of copying them, and decide which boxed text you will paraphrase rather than read.",
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
        "Use the spell, condition and monster references from the rules version your table has agreed to use, whether that is the 2014 or 2024 fifth-edition rules or a mix that your group has chosen. For tonight's likely material, note the effect name, key trigger or save, and one rule interaction you are likely to forget. Keep a link, bookmark or source reference for the agreed version. A short prompt helps you find the rule; avoid copying a summary that can go stale after a rules change or erratum.",
        "Encounter difficulty depends heavily on the party's current resources and on what other encounters surround it. The same nominal encounter can play very differently for a fresh party than for one already low on hit points, spell slots and limited-use features. Note the likely rest points and what the party has spent so you can judge tonight's encounter in context.",
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
          text: "The notes say the party must find the ledger in the mill loft, fight Callan's two guards there, and bring the ledger to the magistrate. The ambush site has one clue, a signet ring, and the hedge trader who saw the ambush will only talk after a successful social check. If a character uses an ability to question the dead, charm the trader or scout the mill from above, there is nothing prepared to answer them, and a failed roll leaves the session with nowhere to go.",
        },
        {
          term: "D&D-ready prep from the same hook",
          text: "Situation: Callan needs the ledger destroyed before the judge arrives. If the party leaves it alone, he moves the courier and tries to burn the evidence. People: Callan wants the evidence gone and fears the judge; Maren, the courier's sister, wants her brother found and does not trust the watch; Sergeant Dosh, Callan's man in the watch, is nervous about how far this has gone; Old Tebb the hedge trader saw the cart turn toward the mill and wants coin before he talks. Places: the ambush site on the coast road (churned mud, dropped signet, cart ruts toward the mill), the mill grain loft (courier, guards, ledger hidden under sacks), Callan's counting house (tax rolls that also prove the theft, and a clerk who can be persuaded or bribed). Clues: the courier is alive at the mill (Tebb saw it, the mud shows it, Dosh may admit it if pressed, and the party's information abilities may reveal it); Callan ordered the taking (the signet is his house's, Dosh can confirm it, and letters in the counting house show it). Encounter: guards at the mill have a reason to hold the loft, but may retreat or parley as events change; a separate social complication is Callan offering the party good coin to leave Saltspire. Use the relevant stat block and rule references from the rules version the table has agreed to use.",
        },
        {
          term: "Why it works",
          text: "The important actors have wants and next moves, every load-bearing fact has more than one route, and the characters' abilities can change how they find it. If the party gets Dosh to talk, he must decide whether to risk Callan's retaliation. If they reach the loft unseen, they can decide what to do with the courier and ledger without a forced fight. The patrol only appears where its established route or changed circumstances put it; if the party avoids it, that encounter stays avoided. If they do nothing while Callan has time to act, the courier is moved and he tries to burn the ledger, leaving the counting-house rolls as harder but still available proof. Maren may blame the party for the delay, changing their relationship rather than closing the story.",
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
          text: "Skim ahead to see what the ledger actually unlocks, then leave the rest for another session. Mark which rooms can matter before the judge arrives and set aside the others. Bookmark the relevant stat block and the magistrate's social notes in the agreed rules source, and decide which boxed text you will paraphrase rather than read aloud. If the party leaves the mapped village to chase a lead down the coast road, prepare a plausible event for that stretch, but let the route determine what they encounter.",
        },
        {
          term: "If this is homebrew",
          text: "You choose whether Saltspire is a three-location town or a full region, so cap it. Name two factions that care about the ledger besides Callan, give each a visible move they make if the party stalls, and let the map stay small enough to run without pre-drawing every building. The risk here is adding too much new lore to explain the theft, so reuse continuity the players already know: a rival the party has already annoyed makes a better complication than a new conspiracy invented tonight.",
        },
        {
          term: "Why it works",
          text: "Both versions keep the same run sheet: the main situation, three or four NPCs with wants, two or three places, clue routes that do not depend on a single roll or ability, and compact references for rules likely to come up. Add a moving pressure only if delay should matter. The difference is where the GM spends the last hour: pruning abundant material in the published case, and limiting new additions in the homebrew case.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "D&D session prep checklist",
      intro:
        "Run through this before you sit down. Keep the answers somewhere you can find them during play:",
      items: [
        "Where did we end last session, and what resources does the party actually have to start tonight?",
        "What is tonight's main situation, and does delay create a meaningful pressure?",
        "Which NPCs might they meet, what does each one want, and what influence or information do they hold?",
        "Which places could matter, who controls each one, and what is risky or rewarding about entering?",
        "Is any necessary fact findable at least two ways, including through abilities this party actually uses?",
        "Which encounters are plausible, and can the party's route genuinely change what they meet?",
        "What are the rest implications tonight, and does the expected number of encounters before the next rest match what the session needs?",
        "Which rule effects, triggers or saves are likely to come up, and where is the reference for the agreed rules version?",
        "What reserve names, NPC, complication and rumours can I drop in when the party goes wide?",
        "Can I find what I need during play without searching through my campaign notes?",
      ],
    },
    {
      kind: "prose",
      heading: "Know when you are ready",
      paragraphs: [
        "You are ready when you know what is happening, who matters, what information can move play forward, which rules are likely to come up, and what the world does if the party surprises you. The run sheet can be one page, several cards or a set of digital notes; stop when it lets you run the situation without searching through your campaign notes.",
        "Starting a campaign? Read “How do I start a D&D campaign?” Preparing tonight? Use this workflow. Once you are running weekly, move to “How do you prep a weekly RPG session quickly?” For a concrete worksheet, open the Session Prep Builder. If combat is the sticking point, see “How do I make combat faster without making it less exciting?” or “How do I keep players engaged during other players’ turns in combat?”",
      ],
    },
  ],
  codexConnection: {
    heading: "Turn tonight's situation into a run sheet",
    paragraphs: [
      "When tonight's situation, people, places and clue routes are clear in your head, the remaining work is turning them into something you can actually use at the table. The Session Prep Builder follows the same eight steps with your own hook: it keeps your situation, NPCs and places linked, drafts only the steps you leave empty, and flags any necessary fact that has only one way to be found so you can add a second route before play.",
      "The result is a compact run sheet you can copy, print or save to the Vault, where the same NPCs, locations and factions stay connected for next session. Use a generator only for the gap in front of you: a quick NPC when the bench is empty, a rumour to give a clue a new route, or a spare encounter to keep in reserve.",
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
        "A combat or social complication to adapt when it fits the situation.",
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
      description: "Campaign management for D&D, from prep to session notes.",
      href: "/for/dungeons-and-dragons",
    },
  ],
  relatedAnswers: [
    "how-do-i-start-a-dnd-campaign",
    "how-do-you-prep-a-weekly-rpg-session-quickly",
    "how-do-i-make-combat-faster-without-making-it-less-exciting",
    "how-do-i-keep-players-engaged-during-other-players-turns-in-combat",
    "how-do-i-prepare-an-rpg-session-step-by-step",
    "how-much-prep-do-you-need-for-an-rpg-session",
    "how-do-i-balance-rpg-combat-encounters-without-a-tpk",
    "how-do-i-handle-players-asking-an-npc-to-tell-us-everything-you-know",
    "how-do-i-turn-an-rpg-idea-into-an-adventure",
    "how-do-i-organise-gm-notes-for-in-person-play",
    "how-do-you-run-a-mystery-without-railroading",
    "how-do-i-organise-a-dnd-campaign",
    "what-should-a-new-dnd-player-know-before-their-first-game",
    "how-do-i-plan-story-arcs-for-an-rpg-campaign",
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
      "An eight-step D&D prep workflow covering the current party's abilities, flexible encounter prep, compact rules references, published versus homebrew pruning, and a table-ready run sheet, with a ledger hook worked through both styles.",
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
          "That page teaches a system-neutral nine-step prep procedure from hook to run sheet; this one is the D&D-shaped version covering party-specific abilities, flexible encounter prep, compact rules references and published versus homebrew pruning, with D&D worked examples.",
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
      "An eight-step D&D prep workflow for the party at your table, with flexible encounters, compact rules references and published versus homebrew guidance.",
    image:
      "https://assets.codexcryptica.com/og/how-do-i-prepare-a-dnd-session.jpg",
    imageAlt:
      "A Dungeon Master's desk by candlelight with a one-page run sheet, D&D stat notes, a coast road map, a sealed ledger and a d20 beside ink and quill",
  },
};
