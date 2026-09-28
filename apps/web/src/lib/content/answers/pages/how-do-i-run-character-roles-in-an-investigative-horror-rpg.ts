import type { AnswerConfigInput } from "../schema";

export const howDoIRunCharacterRolesInAnInvestigativeHorrorRpg: AnswerConfigInput =
  {
    slug: "how-do-i-run-character-roles-in-an-investigative-horror-rpg",
    category: "running-the-game",
    publishedAt: "2026-09-28",
    question:
      "How do I run the different character roles that show up in an investigative horror RPG?",
    kind: "framework",
    shortAnswer:
      "Run investigative horror roles through what each one changes about the case. Let the investigator deepen a clue, the journalist decide who else learns it, the occultist explain what it costs to know, the doctor make it a medical decision, the authority open a door that comes with scrutiny, the witness carry personal risk, and the fixer trade access for a favour. Keep expertise as better, faster, or safer information rather than exclusive permission to learn, and bring every discovery back to a shared decision.",
    sections: [
      {
        kind: "prose",
        heading: "Roles share a case but change what is at stake",
        paragraphs: [
          "Investigative horror puts the same mystery in front of a mixed group: a detective who notices contradictions, a reporter with a contact book, an academic who has read the wrong journals, a doctor who can read a wound, an officer who can order a door opened, a witness who was there last time, and a local who knows which archive drawer sticks. The question at the table is not which role is most useful. It is what each role changes about clue flow, authority, danger, and spotlight when that character acts.",
          "This page assumes you have already chosen a system. For help picking a game for this style of investigation, see the system comparison for investigative horror. For structure of the mystery itself, pair this with the mystery without railroading and conspiracy campaign guides. The framework below stays system agnostic and works whether you run Call of Cthulhu, Delta Green, Trail of Cthulhu, Vaesen, Brindlewood Bay, or another game that supports this genre.",
          "Core principle from the specialist spotlight framework: Specialist acts, situation changes, others respond, party decides, return to specialist. Let expertise give better, faster, or safer information or access, not exclusive permission to learn. When a roll fails or a specialist is absent, change cost, certainty, exposure, or timing rather than stalling the trail.",
        ],
      },
      {
        kind: "list",
        heading: "The roles and how to run each one at the table",
        intro:
          "Treat these as flexible archetypes rather than fixed classes. A character may combine several, and different games will name them differently. For each role, identify contribution, distortion to watch for, a practical technique, and a pressure that keeps it in shared play:",
        items: [
          {
            term: "Investigator or Detective",
            text: "Contributes: connects evidence, spots contradictions, rules things out, and notices what does not fit. Distortion: one roll owns every clue, so the table waits while the detective monologues a theory. Technique: use Find, Interpret, Decide. Anyone searching a clue-bearing scene gets the core clue. The investigator adds specialist detail such as blade type, toxin, or a rehearsed phrase, and separates what was observed from what it may imply. Pressure: tunnel vision on one suspect, a compromised chain of custody that weakens proof, or a suspect who realises someone is close. Deep dive: how to run an investigator without sidelining the party.",
          },
          {
            term: "Journalist or Reporter",
            text: "Contributes: turns what the party knows into who else knows, through sources, corroboration, and publication choices. Distortion: the group becomes an audience for a chain of private interviews, or publication acts as an automatic win. Technique: use the reporting loop of access, verification, publication choice, and visible reaction. The reporter decides what to publish, delay, narrow, share privately, or withhold. Others help gather proof, protect sources, and prepare for the response. Pressure: a deadline such as a council vote, a source who fears exposure, or an outlet that must defend a claim. Deep dive: how to make a journalist or Media character matter.",
          },
          {
            term: "Occult expert or Scholar",
            text: "Contributes: places a clue inside a dangerous context, from a symbol's history to a ritual's supposed purpose. Distortion: lore becomes a lecture that settles the question, or the expert learns too much too safely. Technique: give the expert better questions rather than final answers. Let expertise name what the sign matches, what it would imply if the account is accurate, and what remains uncertain. Keep the cost visible, such as handling a source that affects composure or credibility, or needing a translation that takes time. Pressure: a text that harms the reader, a rival scholar who disputes the finding, or knowledge that requires someone to act on it while uncertain.",
          },
          {
            term: "Doctor or Scientist",
            text: "Contributes: turns a body, sample, or instrument reading into a decision with consequences. Distortion: technical knowledge becomes instant proof that bypasses the investigation or removes danger. Technique: make the finding create a medical or technical choice with limited resources. The doctor might confirm cause of death but face a choice about preserving evidence, treating a patient who cannot then travel, or using a single test kit. Pressure: a patient who needs care now, contaminated evidence, or a result that identifies what happened but not who ordered it.",
          },
          {
            term: "Authority figure, Police, or Agent",
            text: "Contributes: access, legal power, and institutional weight, from opening a scene to demanding records. Distortion: authority makes every locked door trivial, or it shuts down horror by making the party feel protected. Technique: pair access with jurisdiction, scrutiny, and constraint. Define what the badge authorises, who can countermand it, and what procedure must be followed. A warrant may open a house but require a reason on file that alerts a suspect. Institutional knowledge cuts both ways. Pressure: a supervisor who wants a result on record, a procedure that creates a delay, or an audience that now expects the authority to explain what was found.",
          },
          {
            term: "Witness, Survivor, or Sensitive",
            text: "Contributes: personal connection to the horror that makes a threat specific, credible, or urgent. Distortion: the character becomes the explanation, predetermining truth rather than creating a playable perspective. Technique: treat personal experience as a source with wants and fears, not as the answer. Note what they observed, what they think it means, what they fear will happen if they speak, and what would earn their trust. Keep their account testable against other evidence. Pressure: being noticed by whoever caused the harm, pressure to stay silent, or a personal cost for returning to a place tied to the event.",
          },
          {
            term: "Fixer, Local contact, or Archivist",
            text: "Contributes: access to people, places, and records the group cannot reach alone. Distortion: a contact list that produces whatever the party needs without cost, delay, or competing loyalty. Technique: make each favour specific and keep track of who expects repayment. A town clerk can find a burial register, but needs the party to keep the request quiet or to help with a problem first. The fixer opens a route and adds a choice about who now has a claim on the party. Pressure: a favour that must be repaid, a source who answers to someone else, or an archive whose use leaves a record that others can check.",
          },
        ],
      },
      {
        kind: "prose",
        heading: "Keep expertise distinct without splitting the investigation",
        paragraphs: [
          "Several characters may be able to learn the same fact, but they do not need to do the same job. The investigator notices that a wound pattern matches a narrow blade. The doctor confirms cause of death and the time available before a sample degrades. The authority secures the scene legally. The journalist finds a second source who saw the vehicle. The archivist knows which ledger would record its number plate. Let those actions change the same meeting, deadline, or decision rather than building a separate scene for each role.",
          "Cut between actions when new information, a cost, or a choice changes what someone else can do. If one character questions a source alone, keep the scene as long as it holds a choice or discovery, then return with information the group can act on. A brief private conversation can work when it ends with a decision the party must face together. Check with players about personal horror material and about secrets between characters before using hidden knowledge or competing loyalties.",
        ],
      },
      {
        kind: "list",
        heading: "Protect clue flow while keeping danger real",
        intro:
          "Use these checks when a role threatens to monopolise a clue, bypass a constraint, or remove risk:",
        items: [
          {
            term: "Clue flow",
            text: "Can the essential clue be found even if the specialist misses a roll or is absent, with the expert making it richer, quicker, or less exposed? For each necessary conclusion, provide support from more than one independent route.",
          },
          {
            term: "Authority",
            text: "When a badge or rank opens a door, does it also create a record, an obligation, or a person who will ask what was done with that access?",
          },
          {
            term: "Danger",
            text: "Does forbidden knowledge or physical exposure carry a cost the group can see, such as lost time, a worsening condition, or attention from the force behind the horror?",
          },
          {
            term: "Spotlight",
            text: "Does the specialist's success change the situation in a way that gives other characters something to do before the next decision point, using Specialist acts, situation changes, others respond, party decides, return to specialist?",
          },
          {
            term: "Truth",
            text: "Is the underlying reality stable even when witnesses disagree about its meaning? Keep facts established; let interpretation remain uncertain and testable.",
          },
        ],
      },
      {
        kind: "example",
        heading: "Worked example: the chapel ledger",
        paragraphs: [
          "A coastal town prepares to reopen a storm-damaged chapel. Two workers report a pattern of night visits to its crypt. The party includes an investigator, a doctor, a reporter, an archivist, and a police constable. They need to learn what is being moved through the crypt and whether to stop the reopening ceremony.",
        ],
        items: [
          {
            term: "The role-by-role version",
            text: "The investigator examines the crypt alone and rolls to interpret the traces. The archivist separately checks parish records. The constable waits outside while the doctor studies a worker's injury. The reporter interviews a worker in a private scene. Each discovery is useful, but the scenes happen in sequence and the group meets only after the trail is assembled. By then the ceremony is hours away and the party must hurry to reconcile what each member learned alone.",
          },
          {
            term: "The shared investigation",
            text: "Anyone who examines the crypt finds fresh clay on the floor and a scuffed burial ledger with its last page cut rather than torn. The investigator recognises the clay as riverbank mould used for casting, and notes the cut was deliberate. At the same time the archivist, who accompanied the party, confirms the ledger should be locked in the vestry and recalls that the river path has a night watch. The doctor examines the injured worker and establishes the wound is a recent brush with a narrow tool, but treating the worker properly will delay the group's next move. The constable can demand the ledger formally, which creates a record of the request and alerts the churchwarden. The reporter can publish a narrow verified note about the ledger discrepancy to pressure the warden, but risks exposing the worker who spoke. The party must choose whether to question the warden now, secure the worker's safety, or verify the ledger's claim in the town archive before the ceremony. If the investigator's roll fails, the group still has the clay and the ledger observation, but the delay in interpreting the scene lets the churchwarden move the contents of the crypt.",
          },
          {
            term: "Why it works",
            text: "The investigator deepens the clue without owning it. The authority creates lawful access at a cost of visibility. The reporter turns a private finding into a public consequence. The doctor makes medical knowledge a decision about time and care. The witness carries personal risk. The archivist gives a second independent route to the same conclusion. No single roll stalls the case, and each choice leaves a trace the horror can respond to.",
          },
        ],
      },
      {
        kind: "checklist",
        heading: "Before you run roles in an investigative horror session",
        items: [
          "What can this role change that another character cannot change in the same way?",
          "Who notices, records, or judges the use of that role's access or expertise?",
          "Which other characters can add context, proof, protection, or a competing obligation in the same scene?",
          "Can the essential clue be found if the specialist fails or is absent, with expertise improving quality, speed, certainty, or safety?",
          "What is directly observed and what remains an interpretation the players can debate?",
          "If a roll fails, will it change cost, certainty, danger, or exposure rather than stopping the trail?",
          "What visible choice or consequence brings this scene back into shared play, and how does it raise the horror's pressure?",
        ],
      },
    ],
    codexConnection: {
      heading: "Keep roles, clues, and obligations linked between sessions",
      paragraphs: [
        "Investigative horror campaigns produce a web of evidence, sources, records, and debts that outlasts any single session. The same structure that connects a clue to its source and the faction behind it can also record which role opened the door, what promise was made to keep it open, and which contact now expects repayment.",
        "Record each discovery as a linked entity rather than a line in a notebook, so the next time you prep you can see at a glance which roles contributed, what remains unverified, and where exposure still sits. That makes it easier to return a publication's consequence, a badge's scrutiny, or a scholar's risky text to play without losing the thread.",
      ],
      linkText: "Explore the RPG knowledge graph",
      href: "/solutions/rpg-knowledge-graph",
    },
    relatedTools: [
      {
        title: "Rumour Generator",
        description:
          "Whispers that point the party at people and places worth investigating.",
        href: "/generators/rumour",
      },
      {
        title: "Secret Society Generator",
        description:
          "Hidden organisations with motives, methods, and ranks for conspiracy horror.",
        href: "/generators/secret-society",
      },
      {
        title: "Faction Generator",
        description:
          "Groups with goals and resources that can apply pressure to investigators and their contacts.",
        href: "/generators/faction",
      },
    ],
    relatedForPages: [
      {
        title: "Codex Cryptica for investigative campaigns",
        description:
          "Keep witnesses, evidence, archives, and debts connected across a long-running horror investigation.",
        href: "/for/conspiracy",
      },
      {
        title: "Codex Cryptica for Call of Cthulhu",
        description:
          "Notes and worldbuilding for groups running classic cosmic horror investigation.",
        href: "/for/call-of-cthulhu",
      },
      {
        title: "Codex Cryptica for cosmic horror",
        description:
          "Broader support for dread, unnatural entities, and slow-burn campaigns.",
        href: "/for/cosmic-horror",
      },
    ],
    relatedAnswers: [
      "what-rpg-should-i-play-for-investigative-horror",
      "how-do-you-run-a-mystery-without-railroading",
      "how-do-you-run-a-conspiracy-campaign",
      "how-do-i-run-an-investigator-without-sidelining-the-party",
      "how-do-i-run-a-journalist-or-media-character-in-an-rpg",
      "how-do-i-give-specialist-characters-spotlight",
      "how-do-you-create-a-secret-society-for-an-rpg-campaign",
      "how-do-i-run-a-diplomat-noble-or-courtier-in-an-rpg",
      "how-do-i-run-spies-and-infiltrators-in-an-rpg",
      "how-do-i-run-hackers-or-netrunners-without-splitting-the-party",
      "how-do-you-generate-useful-rpg-rumours",
    ],
    discovery: {
      id: "answer-character-roles-investigative-horror",
      parentCluster: "specialist-roles",
      clusters: ["specialist-roles", "investigative-horror"],
      primaryIntent:
        "how to run character roles in an investigative horror rpg",
      intentAliases: [
        "investigative horror rpg roles",
        "horror investigator archetypes",
        "how to gm investigators in horror",
        "how to run occult experts in rpgs",
        "call of cthulhu investigator roles gm tips",
        "how to run authority figures in horror rpgs",
        "investigative horror character archetypes gm advice",
      ],
      userJob: "adopt-workflow",
      uniqueValue:
        "A genre-entry framework for seven investigative horror archetypes that shows what each role changes about clue flow, authority, danger, and spotlight, with a shared-investigation technique and links to investigator, journalist, and specialist spotlight deep dives.",
      relatedIntents: [
        "answer-investigative-horror-system-selection",
        "answer-run-mystery-without-railroading",
        "answer-conspiracy-campaign",
        "answer-run-investigator-without-sidelining-party",
        "answer-journalist-media-character-rpg",
        "answer-specialist-character-spotlight",
        "answer-run-character-roles-political-intrigue",
        "answer-cyberpunk-party-roles",
      ],
      acknowledgedOverlap: [
        {
          with: "answer-investigative-horror-system-selection",
          reason:
            "That page compares systems for investigative horror; this page gives system-agnostic guidance for running the character roles inside a chosen system.",
        },
        {
          with: "answer-run-mystery-without-railroading",
          reason:
            "That page teaches resilient mystery structure and clue redundancy; this page focuses on how different player-character roles contribute to and distort that structure.",
        },
        {
          with: "answer-conspiracy-campaign",
          reason:
            "That page structures a campaign's underlying truth and evidence map; this page explains how investigator, journalist, scholar, doctor, authority, witness, and fixer roles interact with that trail.",
        },
        {
          with: "answer-run-investigator-without-sidelining-party",
          reason:
            "The investigator answer is the detailed deep dive for one role; this page situates that role among six others and links to it for specialist detail.",
        },
        {
          with: "answer-journalist-media-character-rpg",
          reason:
            "The journalist answer is the detailed deep dive for reporting and publication; this page summarises that role's contribution within the wider investigative horror roster.",
        },
        {
          with: "answer-specialist-character-spotlight",
          reason:
            "The spotlight answer gives reusable scene structures for any expert; this page applies those structures to seven investigative horror archetypes and adds genre-specific pressures.",
        },
        {
          with: "answer-run-character-roles-political-intrigue",
          reason:
            "The political roles page covers overlapping archetypes such as journalist and fixer in a faction campaign; this page covers the same roles as they function inside investigative horror, with distinct clue, danger, and authority pressures.",
        },
        {
          with: "answer-cyberpunk-party-roles",
          reason:
            "The cyberpunk roles page situates specialists inside a shared physical job; this page situates specialist roles inside a shared investigation with clue-flow and horror-specific constraints.",
        },
      ],
    },
    seo: {
      title:
        "How do I run character roles in investigative horror? | Codex Cryptica",
      description:
        "System-agnostic GM guidance for investigative horror roles: investigator, journalist, occultist, doctor, authority, witness, and fixer, with clue flow and spotlight techniques.",
      image:
        "https://assets.codexcryptica.com/og/how-do-i-run-character-roles-in-an-investigative-horror-rpg.jpg",
      imageAlt:
        "Investigators, a reporter, a scholar, and a constable examine clues and records by lamplight in a coastal archive",
    },
  };
