import type { AnswerConfigInput } from "../schema";

export const howDoIHandlePlayersAskingAnNpcToTellUsEverythingYouKnow: AnswerConfigInput =
  {
    slug: "how-do-i-handle-players-asking-an-npc-to-tell-us-everything-you-know",
    category: "running-the-game",
    publishedAt: "2026-10-03",
    question:
      'How do I handle players asking an NPC to "tell us everything you know"?',
    kind: "framework",
    shortAnswer:
      "Treat 'tell us everything you know' as a request for the witness's best relevant summary, not an exhaustive transcript of memory. Resolve the scope first—everything about the burglary, the victim, or last night—then give the account, including what the witness recalls, believes, and remains unsure about. Follow the game's clue procedure, but keep investigation moving through a reliable route that does not depend on one exact phrase or fragile check. Targeted questions can clarify prepared or fictionally supported details, uncertainty, and sources without creating new evidence through repetition.",
    sections: [
      {
        kind: "prose",
        heading: "Why ‘tell us everything’ still produces a summary",
        paragraphs: [
          "People do say ‘tell us everything you know’ in-world. The phrase is a natural request for a useful account, not a literal demand for every memory. The NPC answers what they reasonably think is being asked, using the scope established by the conversation. If that scope is unclear, they can briefly ask, ‘About the break-in, or everything that’s happened here this week?’",
          "Resolve the scope first, then give the witness's best relevant summary. They do not know what the party is investigating or which details count as evidence, and their recollections may be incomplete or mistaken. Do not withhold a useful account because the players phrased the request broadly, or recite every note from the scenario in one monologue. Follow-up questions can focus attention on prepared or fictionally supported details the witness had not thought relevant, clarify uncertainty, or distinguish direct observation from inference; asking repeatedly does not create new evidence.",
        ],
      },
      {
        kind: "list",
        heading: "Resolve the scope, then give a useful account",
        intro:
          "The implied subject usually makes a broad request clear: everything about the burglary, the victim, last night, or a particular symbol. Once the scope is clear, give the witness's useful account in layers:",
        items: [
          {
            term: "Initial broad summary",
            text: "What the witness thinks happened, the relevant observations and recollections they can readily bring to mind, and one or more leads that keep the investigation moving. Mark confidence naturally: “I saw…”, “I think…”, “I heard from…”, or “I'm not sure, but…”. A sincere witness can misremember timing, sequence, or identity without lying.",
          },
          {
            term: "Targeted depth",
            text: "Follow-ups clarify uncertainty, sensory detail, source, relationships, contradictions, or context the witness did not initially think relevant. Keep those details consistent with where the witness was, what they could perceive, what had their attention, and what is already established.",
          },
          {
            term: "External corroboration",
            text: "Records, physical evidence, another witness, or specialist interpretation can support, challenge, or add context to the account. The witness's recollection is evidence about what they remember, not automatically an objective record of events.",
          },
        ],
      },
      {
        kind: "list",
        heading: "How targeted questions reveal depth",
        intro:
          "Specific follow-ups should focus the witness on details supported by the fiction, add context and clarity, or offer another angle—not serve as a mandatory password or generate facts through repetition:",
        items: [
          {
            term: "Jogging sensory memory",
            text: "Asking what a witness heard, smelled, or felt can focus them on a prepared detail they dismissed as irrelevant, if the circumstances support it. They might recall lamp oil on a visitor's coat or the clank of a distinctive machine nearby.",
          },
          {
            term: "Testing timing and sequence",
            text: "Asking what happened immediately before or after an event can help the witness place a recollection against daily habits and identify uncertainty, hurried departures, or unexpected pauses. It may also show that their remembered sequence is mistaken.",
          },
          {
            term: "Probing deviations from routine",
            text: "Asking whether something was ordinary for this location reveals subtle anomalies: an unfamiliar delivery wagon, a lamp left unlit, or a guard absent from their post.",
          },
          {
            term: "Surfacing personal relationships",
            text: "Asking who the victim spent time with or who stood to lose money shifts the conversation from passive observation to local politics, alliances, and grudges.",
          },
          {
            term: "Asking how they know",
            text: "“How do you know that?” separates direct observation from inference, routine expectation, hearsay, or knowledge acquired afterwards. The witness may be certain, tentative, or mistaken; let the players hear which kind of account they are weighing.",
          },
        ],
      },
      {
        kind: "list",
        heading: "Filtering testimony through NPC perspective",
        intro:
          "Profession, current task, training, relationships, and personal stakes all shape what an NPC was likely to notice. Treat these as attention tendencies, not rules for what a person must perceive:",
        items: [
          {
            term: "The night watchman",
            text: "May be especially alert to access points, weapons, and unfamiliar movement because those are part of the job. An individual witness may notice something entirely different because of where their attention was at that moment.",
          },
          {
            term: "The house servant",
            text: "May know household routines, regular visitors, and when something has been moved, while another servant in the same house might be focused on a particular person or task.",
          },
          {
            term: "The dock clerk",
            text: "May pay close attention to cargo marks, manifests, and schedules, especially when checking an arrival, but may miss activity outside that task.",
          },
          {
            term: "The street vendor",
            text: "May recognise regular customers, changes in foot traffic, or unusual loitering, depending on the stall, the day's trade, and what had their attention.",
          },
        ],
      },
      {
        kind: "prose",
        heading: "Avoiding conversational pixel-hunting",
        paragraphs: [
          "Conversational pixel-hunting happens when a Game Master decides that an essential clue will only be revealed if players ask a single exact question or utter a specific keyword. If the players ask about the victim's visitors, the GM stays silent about the delivery courier because a courier is technically not a visitor. This turns investigative roleplay into an adversarial guessing game where players feel punished for failing to read the GM's mind.",
          "Keep player skill focused on interpreting accounts, recognising contradictions, and deciding which leads to pursue. When players ask an open question, answer generously within the understood scope. If they ask about a nearby detail, share it when the witness could reasonably know or recall it; do not withhold it on a technicality or invent it because they repeated a question.",
        ],
      },
      {
        kind: "example",
        heading: "Worked example: The burgled apothecary",
        paragraphs: [
          "Master Vane, a nervous herbalist in a river ward, has had his storehouse ransacked. The party arrives to investigate and immediately asks him to tell them everything he knows.",
        ],
        items: [
          {
            term: "The weak approach",
            text: "The GM treats 'tell us everything' as an invalid prompt. Vane stammers that he does not know where to start. When players ask about intruders, the GM withholds the smashed skylight because the players asked who came through the door, forcing four rounds of guessing before the party discovers how the thief entered.",
          },
          {
            term: "The framework approach",
            text: "The GM clarifies, “Everything about the break-in?” Vane gives his best account: he found the rear storeroom trashed at dawn, two jars of dried ghostleaf missing, and his apprentice nowhere to be found. He thinks the apprentice left before closing, but admits he did not see them go. The party has leads without a roll or magic words. Asked, “How do you know the apprentice left early?”, Vane explains that a neighbouring shopkeeper told him. The GM has prepared the brief midnight doorbell and the smell of wet rope by the back steps; when the party asks about the night before, Vane can place them in the account as uncertain details that point toward the river docks.",
          },
          {
            term: "Why it works",
            text: "The broad summary gives the party actionable leads, and the follow-up clarifies where Vane's knowledge came from before adding supported detail. The investigation has a reliable route forward without making every secondary clue automatic or every uncertainty a hidden test.",
          },
        ],
      },
      {
        kind: "checklist",
        heading: "Checklist: Running broad witness questions",
        intro:
          "Keep these checks in mind whenever players ask an NPC to tell them everything they know:",
        items: [
          "Resolve what the request is about, briefly clarifying in character if its scope is unclear.",
          "Give the witness's useful summary, including relevant recollections, confidence, and one or more leads.",
          "Follow the game's clue procedure, with a reliable route to progress that does not depend on one exact phrase or fragile check.",
          "Use targeted questions to clarify prepared or fictionally supported detail, source, uncertainty, and inference.",
          "Account for the witness's task, training, relationships, and attention without treating role as destiny.",
          "When the witness has given their useful account and more questions would only repeat material, say so plainly. Remind the table of the leads already available, then let the players choose what to pursue.",
        ],
      },
      {
        kind: "prose",
        heading: "Know when the interview is done",
        paragraphs: [
          "For example: “You think Vane has told you everything relevant he can currently recall about last night. The missing apprentice, rear storeroom, and river smell are your clearest leads.” This signals that further questions would repeat the account while leaving the next move to the players.",
        ],
      },
    ],
    systemsThatSupportThis: [
      {
        system: "GUMSHOE",
        rationale:
          "Investigative abilities ensure that any character with a relevant skill automatically gains the core clue without a roll, while point spends provide extra nuance, context, or tactical edges.",
        href: "https://pelgranepress.com/gumshoe/files/GUMSHOE%20SRD%20CC%20version.pdf",
      },
      {
        system: "Monster of the Week",
        rationale:
          "The Investigate a Mystery move resolves questioning through a structured list of targeted questions, giving players clear inquiry angles rather than requiring them to guess the Keeper's thoughts.",
        href: "https://evilhat.com/product/monster-of-the-week/",
      },
      {
        system: "Brindlewood Bay",
        rationale:
          "The Meddling Move provides open-ended clues that players combine through the Theorise Move, removing the need for the GM to withhold testimony until a specific keyword is spoken.",
        href: "https://www.gauntlet-rpg.com/brindlewood-bay.html",
      },
    ],
    codexConnection: {
      heading: "Organise witness accounts on the campaign graph",
      paragraphs: [
        "When multiple NPCs give overlapping or conflicting testimony, keeping track of who said what can quickly overwhelm session notes. Codex Cryptica lets you link witness statements directly to NPC profiles, locations, and discovered clues in an interconnected knowledge graph.",
        "By separating direct observations from witness interpretations in entity notes, you can easily spot discrepancies and trace follow-up leads as your investigation unfolds.",
      ],
      linkText: "Explore the campaign knowledge graph",
      href: "/solutions/rpg-knowledge-graph",
    },
    relatedTools: [
      {
        title: "NPC generator",
        description:
          "Create witnesses, experts, and suspects with distinct voices, motives, and habits for the next interview.",
        href: "/generators/npc",
      },
      {
        title: "Quest generator",
        description:
          "Turn a witness account into the next concrete lead, with fresh locations and stakes.",
        href: "/generators/quest",
      },
      {
        title: "Rumour generator",
        description:
          "Stock the surrounding talk that shapes what locals believe about the case.",
        href: "/generators/rumour",
      },
    ],
    relatedAnswers: [
      "how-do-i-make-interviewing-npcs-interesting-in-an-investigation",
      "how-do-you-run-a-mystery-without-railroading",
      "how-do-i-run-an-investigator-without-sidelining-the-party",
      "how-do-i-run-character-roles-in-an-investigative-horror-rpg",
      "how-do-i-give-specialist-characters-spotlight",
      "how-do-you-run-a-scene-with-multiple-npcs",
      "how-do-you-run-a-conspiracy-campaign",
      "how-do-you-design-rpg-puzzles-that-do-not-stall-the-game",
    "how-do-i-handle-divination-magic-without-letting-one-character-solve-every-mystery",
  ],
    discovery: {
      id: "answer-npc-tell-us-everything",
      parentCluster: "session-prep",
      clusters: ["session-prep"],
      primaryIntent:
        "how do i handle players asking an npc to tell us everything you know",
      intentAliases: [
        "rpg players ask npc everything they know",
        "how to handle broad npc questions rpg",
        "players ask witness everything in rpg",
        "npc interview tell us everything",
        "avoiding conversational pixel hunting in rpgs",
        "how to run npc questioning in mystery rpg",
      ],
      userJob: "adopt-workflow",
      uniqueValue:
        "A practical method for resolving broad witness questioning by returning an in-character summary, offering core clues freely, and using targeted follow-up questions to uncover memory and context without gating progress.",
      relatedIntents: [
        "answer-interviewing-npcs-investigation",
        "answer-run-mystery-without-railroading",
        "answer-run-investigator-without-sidelining-party",
        "answer-run-scene-multiple-npcs",
      ],
      acknowledgedOverlap: [
        {
          with: "answer-interviewing-npcs-investigation",
          reason:
            "The companion interview answer covers overall witness texture, social stakes, and separating facts from interpretations; this answer resolves the specific table dilemma of players asking an NPC to tell them everything they know.",
        },
        {
          with: "answer-run-mystery-without-railroading",
          reason:
            "The mystery answer covers overall scenario structure and clue distribution across locations; this answer focuses on conversational mechanics at the table when questioning an individual witness.",
        },
      ],
    },
    seo: {
      title:
        "How to Handle 'Tell Us Everything You Know' in RPGs | Codex Cryptica",
      description:
        "Handle broad NPC questions in RPG investigations without clue dumps or pixel-hunting. Give summaries freely and use follow-ups for depth.",
      image:
        "https://assets.codexcryptica.com/og/how-do-i-handle-players-asking-an-npc-to-tell-us-everything-you-know.jpg",
      imageAlt:
        "A Game Master describes a witness recounting a crime scene to investigators seated around a tavern table",
    },
  };
