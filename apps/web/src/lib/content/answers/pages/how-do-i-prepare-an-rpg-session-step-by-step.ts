import type { AnswerConfigInput } from "../schema";

export const howDoIPrepareAnRpgSessionStepByStep: AnswerConfigInput = {
  slug: "how-do-i-prepare-an-rpg-session-step-by-step",
  category: "session-prep",
  publishedAt: "2026-09-25",
  question: "How do I prepare an RPG session step by step?",
  kind: "how-to",
  shortAnswer:
    "Prepare a situation rather than a script. Work out where play starts and what pressure is moving tonight, then prep the people who matter and what they want, the places the party is likely to visit, the information they need with more than one way to find it, and how the world reacts to success, failure or delay. Add a short reserve of names and complications, then put it all on one page you can read at the table. The plan should still work when the players choose a route you did not expect.",
  sections: [
    {
      kind: "prose",
      heading: "You do not need to write the whole session",
      paragraphs: [
        "Most newer GMs who get stuck here have already done the hard part. They have a hook, they can improvise a conversation, and they know the players will not follow a plan exactly. What they lack is a way to turn one hook into enough material for three or four hours without writing a story the players then have to walk through.",
        "The answer is to prepare things that respond to the players instead of things that happen to them. People with goals, places with dangers and opportunities, information that can be found several ways, and a problem that gets worse if nobody deals with it. With those in hand, whatever the players try, you have something to say next.",
      ],
    },
    {
      kind: "list",
      heading: "Nine prep steps, from hook to run sheet",
      intro:
        "Work through these in order when you prepare. They are prep steps, not the order scenes will happen in during play:",
      items: [
        {
          term: "Start from where play begins",
          text: "What just happened, where are the characters, and what is demanding their attention in the first few minutes? For a continuing campaign, this comes straight from last session's ending.",
        },
        {
          term: "Define tonight's pressure",
          text: "Name the problem, opportunity or threat that is moving whether or not the characters act. Pressure is what stops the session drifting when the players are unsure what to do.",
        },
        {
          term: "Prep the important people",
          text: "Three or four is usually plenty. For each, note what they want, what they know, what they fear and what they will do next if nobody stops them. Skip the life story.",
        },
        {
          term: "Prep likely places and obstacles",
          text: "Pick the two or three places the party will probably go. Give each enough to play: what is there, who is there, what can go wrong, and one thing worth finding. Leave the full history out.",
        },
        {
          term: "Prepare clues, information and opportunities",
          text: "List what the players need to learn to make progress, and give each piece at least two or three ways to be found. If progress depends on one conversation or one roll, the session can stall on a bad result.",
        },
        {
          term: "Sketch a few likely situations",
          text: "Write down things that could happen depending on what the players choose: an ambush if they take the road, a bargain if they visit the official, a fire if they wait. These are possibilities, not a scene order.",
        },
        {
          term: "Know how the world reacts",
          text: "For the main pressure, decide what follows if the players succeed, fail, delay, avoid it or try something you did not plan for. One line each is enough.",
        },
        {
          term: "Keep flexible material in reserve",
          text: "A handful of names, a spare complication, a minor NPC and a location you can place anywhere. Reserve material covers the moment the players go somewhere unexpected.",
        },
        {
          term: "Make a one-page run sheet",
          text: "Copy only what you need to see during play onto a single page: the opening, the pressure, the people, the places, the clues and the reserve. Everything else stays in your notes.",
        },
      ],
    },
    {
      kind: "table",
      heading: "Scripted prep versus playable prep",
      headers: ["Area", "Scripted prep", "Playable prep"],
      rows: [
        [
          "Story",
          "Scene A leads to scene B, which leads to scene C",
          "A situation that changes over time, with several ways in",
        ],
        [
          "NPCs",
          "NPC X must reveal clue Y",
          "NPCs have goals and know things, and act on them",
        ],
        [
          "Places",
          "The players must visit location Z",
          "Places hold dangers and opportunities the players can choose between",
        ],
        [
          "Clues",
          "One clue in one place, found one way",
          "Each important fact can be found in two or three ways",
        ],
        [
          "Encounters",
          "A fight happens at a set moment",
          "Threats are ready to appear when the fiction calls for them",
        ],
        [
          "Outcomes",
          "The session ends at a planned climax",
          "Consequences follow from what the players actually did",
        ],
      ],
    },
    {
      kind: "prose",
      heading: "Predicted beats are fine as long as they are not requirements",
      paragraphs: [
        "Structured prep is not the problem. Plenty of GMs run better sessions when they have imagined a likely opening, a likely confrontation and a likely ending. The difference is how you hold them. A predicted beat is a tool you can move, change or drop; a required beat is something the players must reach before the session can continue.",
        "A quick check is to ask what happens if the players never meet this NPC, never enter this building or never find this clue. If the answer is that the session breaks, give that piece another route in or let the pressure bring it to them.",
      ],
    },
    {
      kind: "example",
      heading: "Worked example: the missing courier",
      paragraphs: [
        "The hook is short: a courier carrying evidence against a local official vanished on the road into town. Here is that hook taken through the prep steps. This is what the GM prepares, not a record of how the session will go.",
      ],
      items: [
        {
          term: "Starting situation",
          text: "The characters arrive in Harrowgate as the courier's horse walks in riderless, saddlebags cut open. A crowd gathers at the gate.",
        },
        {
          term: "Active pressure",
          text: "The evidence is a ledger showing that Reeve Callan has been skimming the grain tax. Callan's men are searching for it too. The magistrate's circuit judge arrives in two days, and without the ledger Callan walks free.",
        },
        {
          term: "People",
          text: "Reeve Callan wants the ledger burned and fears the judge. Maren, the courier's sister, wants her brother found and does not trust the watch. Sergeant Dosh is Callan's man and is nervous about how far this has gone. Old Tebb, a hedge-trader, saw the ambush from the ditch and wants paying before he talks.",
        },
        {
          term: "Places",
          text: "The ambush site on the mill road, with churned mud and a dropped signet. The mill itself, where the courier is being held in the grain loft. Callan's counting house, where a copy of the tax rolls could prove the theft on its own.",
        },
        {
          term: "Essential information and ways to find it",
          text: "The courier is alive at the mill: Tebb saw the cart turn that way, the mud at the ambush site shows it, or Dosh admits it if pressed. Callan ordered the ambush: the signet is his household's, Dosh can confirm it, or the counting house letters show it.",
        },
        {
          term: "Likely complications",
          text: "Callan offers the party a generous job to leave town. Callan's men are already at the mill. Maren goes to the mill alone if the party takes too long.",
        },
        {
          term: "If the party delays",
          text: "By the next morning the courier has been moved and the ledger is ash. The party can still expose Callan through the tax rolls, but it is harder and Maren blames them.",
        },
        {
          term: "Plausible directions",
          text: "A rescue at the mill. A quiet search of the counting house. A deal with Dosh to turn witness. A public confrontation at the gate. The GM does not choose between these; the players do.",
        },
        {
          term: "Why it works",
          text: "Every direction has material behind it, and the important facts have more than one route. If the players do nothing, the pressure moves on its own and gives them something new to react to.",
        },
      ],
    },
    {
      kind: "example",
      heading: "The finished one-page run sheet",
      paragraphs: [
        "The same prep, cut down to what the GM needs to see during play:",
      ],
      items: [
        {
          term: "Open",
          text: "Riderless horse at the gate, saddlebags slashed, crowd forming. Maren pushes through.",
        },
        {
          term: "Pressure",
          text: "Callan wants the ledger burned before the judge arrives in two days. Morning: courier moved, ledger gone.",
        },
        {
          term: "People",
          text: "Callan (burn it, fears judge). Maren (find brother, distrusts watch). Dosh (Callan's man, nervous). Tebb (saw it, wants coin).",
        },
        {
          term: "Places",
          text: "Mill road ambush site (mud, signet). Mill grain loft (courier, two guards). Counting house (tax rolls, letters).",
        },
        {
          term: "Clues",
          text: "Courier at mill: Tebb, mud, Dosh. Callan behind it: signet, Dosh, letters.",
        },
        {
          term: "Complications",
          text: "Bribe offer. Guards already at the mill. Maren goes alone.",
        },
        {
          term: "Reserve",
          text: "Names: Wenna, Hob, Isolde, Garth. A travelling tinker with gossip. A washed-out ford on the mill road.",
        },
      ],
    },
    {
      kind: "list",
      heading: "The 30-minute version",
      intro:
        "When time is short, run the same steps in small blocks. The timings are an example budget, not a rule; spend longer where your session needs it:",
      items: [
        {
          term: "Five minutes: situation and pressure",
          text: "Where play starts and what gets worse if nobody acts.",
        },
        {
          term: "Five minutes: important people",
          text: "Three or four names, each with a want and a next move.",
        },
        {
          term: "Five minutes: places and challenges",
          text: "Two or three likely locations, each with one danger and one thing worth finding.",
        },
        {
          term: "Five minutes: clues and information",
          text: "What the players need to learn, and at least two ways to learn each piece.",
        },
        {
          term: "Five minutes: complications and consequences",
          text: "Two complications, and what happens after success, failure or delay.",
        },
        {
          term: "Five minutes: table-ready notes",
          text: "Copy it onto one page and add any stats and a short list of names.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Reusable session-prep template",
      intro:
        "Copy these questions into your notes and answer each one in a line or two before every session:",
      items: [
        "Where do we start?",
        "What is happening now?",
        "What gets worse if it is ignored?",
        "Who matters tonight?",
        "What does each of them want, and what will they do next?",
        "Where might the characters go?",
        "What useful information can they discover, and in how many ways?",
        "What obstacles and complications are ready?",
        "How might the world react to success, failure or delay?",
        "What can I improvise from my short reserve list?",
      ],
    },
  ],
  codexConnection: {
    heading: "Filling a blank prep slot",
    paragraphs: [
      "When one slot in the template is empty, such as an NPC, a complication, a rumour or a location, generate that one piece and then fit it to the situation you already understand. The generator gives you a starting point; you decide how it connects to tonight's pressure.",
      "In a Codex Cryptica vault, the people, places and factions from each session stay linked to each other, so next session's prep starts from what already exists rather than a blank page.",
    ],
    linkText: "Browse the generators",
    href: "/generators",
  },
  relatedTools: [
    {
      title: "NPC Generator",
      description:
        "A named person with a want and a secret when the people slot is thin.",
      href: "/generators/npc",
    },
    {
      title: "Encounter Generator",
      description: "A ready complication or threat for the reserve list.",
      href: "/generators/encounter",
    },
    {
      title: "Settlement Generator",
      description:
        "A town or village with people and problems when play moves somewhere new.",
      href: "/generators/settlement",
    },
    {
      title: "Rumour Generator",
      description:
        "Leads and gossip that give the players another route to a clue.",
      href: "/generators/rumour",
    },
  ],
  relatedAnswers: [
    "how-do-i-turn-an-rpg-idea-into-an-adventure",
    "how-do-i-expand-a-simple-rpg-campaign-idea",
    "how-much-prep-do-you-need-for-an-rpg-session",
    "how-do-you-prep-a-weekly-rpg-session-quickly",
    "how-do-i-organise-gm-notes-for-in-person-play",
    "how-do-you-write-a-one-shot-adventure",
    "how-do-i-start-gming-for-the-first-time",
    "how-do-you-run-a-mystery-without-railroading",
    "how-do-you-improvise-npcs-on-the-spot",
  ],
  discovery: {
    id: "answer-prepare-session-step-by-step",
    parentCluster: "session-prep",
    primaryIntent: "how to prepare an rpg session step by step",
    intentAliases: [
      "how to prep an rpg session",
      "how to prepare an rpg session",
      "how to prep a ttrpg session",
      "how to plan a dnd session",
      "how to write a dnd session",
      "gm session prep checklist",
      "how to turn a hook into a session",
      "what to prepare before a dnd session",
      "how to write a session without railroading players",
    ],
    uniqueValue:
      "A nine-step procedure that takes one hook to a one-page run sheet for a single session, contrasting scripted and playable prep, with a full hook-to-run-sheet worked example, a 30-minute version and a copyable prep template.",
    userJob: "adopt-workflow",
    relatedIntents: [
      "answer-session-prep",
      "answer-prep-weekly-session-quickly",
      "answer-turn-rpg-idea-into-adventure",
      "answer-in-person-gm-notes",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-session-prep",
        reason:
          "That page answers how much prep is enough and separates essential prep from worldbuilding; this one is the step-by-step procedure for producing that essential prep from a hook.",
      },
      {
        with: "answer-prep-weekly-session-quickly",
        reason:
          "That page is a timeboxed routine for GMs already running a weekly campaign; this one teaches the full procedure from hook to run sheet for GMs who do not yet know what to prepare.",
      },
      {
        with: "answer-turn-rpg-idea-into-adventure",
        reason:
          "That page develops a premise into a playable adventure situation; this one turns a hook or current situation into material for the next single session.",
      },
      {
        with: "answer-in-person-gm-notes",
        reason:
          "That page covers how to organise notes and reference material at the table; this one covers what to prepare before the session.",
      },
    ],
  },
  seo: {
    title: "How to Prepare an RPG Session Step by Step | Codex Cryptica",
    description:
      "Turn a hook into a session you can run: nine prep steps, scripted versus playable prep, a worked example, a 30-minute version and a copyable prep template.",
    image:
      "https://assets.codexcryptica.com/og/how-do-i-prepare-an-rpg-session-step-by-step.jpg",
    imageAlt:
      "A game master's desk by lamplight with a one-page run sheet, NPC index cards, a road map, a courier's satchel and a broken wax seal",
  },
};
