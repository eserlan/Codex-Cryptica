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
      "Treat 'tell us everything you know' as an invitation for the witness to provide their natural, concise summary rather than a full transcript of their memory. In-world witnesses do not record events objectively or know which details matter to investigators. Provide the essential lead freely through the NPC's initial summary so the scenario never stalls on missing keywords. Then use specific follow-up questions to jog associative memory, uncover sensory details, reveal contradictions, and explore personal perspectives without making progress contingent on conversational pixel-hunting.",
    sections: [
      {
        kind: "prose",
        heading: "Why 'everything you know' is not an in-world request",
        paragraphs: [
          'When players instruct a witness to "tell us everything you know", they are usually trying to avoid missing an essential clue through imprecise phrasing. At the table, however, human memory does not function as an indexed filing system. Witnesses filter events through their own routines, fears, and assumptions. They do not know what the party is investigating, which objects are out of place, or what constitutes evidence. Expecting a character to download their entire consciousness into a speech is unnatural in fiction and flattens table engagement into passive listening.',
          "The solution is neither to withhold clues punitively nor to recite the entire scenario prep in one monologue. Instead, recognise that broad questions yield broad summaries. The NPC reports what they noticed and what they personally believe mattered. Specific follow-up questions then jog associative recall, bringing forward sensory observations, odd timings, and private doubts that the witness saw no reason to volunteer initially.",
        ],
      },
      {
        kind: "list",
        heading: "What the witness volunteers automatically",
        intro:
          "Never hide the core thread required to keep the investigation moving behind a secret phrase. An NPC should offer these three elements upon any reasonable initial enquiry:",
        items: [
          {
            term: "The natural summary",
            text: "What the NPC believes happened, recounted in the order they remember it and shaped by their personal perspective. This provides the primary lead, establishing where to go or who to look for next.",
          },
          {
            term: "Obvious and undisputed facts",
            text: "Details that anyone in the NPC's position would think are relevant: the broken padlock, the scream heard at midnight, or the carriage that sped toward the north gate.",
          },
          {
            term: "What they told others",
            text: "The version the witness already gave to town guards, neighbours, or their employer. Witnesses readily repeat this baseline narrative, giving the party an immediate anchor to verify against other accounts.",
          },
        ],
      },
      {
        kind: "list",
        heading: "How targeted questions reveal depth",
        intro:
          "Specific follow-up questions should add context, clarity, and alternative angles, not serve as a mandatory password to prevent the adventure from stalling:",
        items: [
          {
            term: "Jogging sensory memory",
            text: "Asking what an NPC heard, smelled, or felt often brings back memories they dismissed as irrelevant. A witness who saw nothing unusual might remember the smell of bitter almonds or the scrape of iron on flagstones.",
          },
          {
            term: "Testing timing and sequence",
            text: "Enquiring about what happened immediately before or after an event forces the NPC to anchor their memories to daily habits, exposing gaps, hurried departures, or unexpected pauses.",
          },
          {
            term: "Probing deviations from routine",
            text: "Asking whether something was ordinary for this location reveals subtle anomalies: an unfamiliar delivery wagon, a lamp left unlit, or a guard absent from their post.",
          },
          {
            term: "Surfacing personal relationships",
            text: "Asking who the victim spent time with or who stood to lose money shifts the conversation from passive observation to local politics, alliances, and grudges.",
          },
        ],
      },
      {
        kind: "list",
        heading: "Filtering testimony through NPC perspective",
        intro:
          "Witnesses perceive the same scene through the lens of their profession, social station, and immediate self-interest:",
        items: [
          {
            term: "The night watchman",
            text: "Notices weapons, broken latches, unfamiliar uniforms, and avenues of escape, but pays little attention to domestic arguments or fine jewellery.",
          },
          {
            term: "The house servant",
            text: "Notices altered moods, moved furniture, missing silver, and unusual visitors, while remaining oblivious to tactical advantages or political intrigue.",
          },
          {
            term: "The dock clerk",
            text: "Notices forged manifests, irregular cargo marks, and overdue barges, filtering events through ledgers, customs duties, and official protocol.",
          },
          {
            term: "The street vendor",
            text: "Notices foot traffic, spending habits, nervous loiterers, and who avoids eye contact with the watch, viewing the district through commerce and street survival.",
          },
        ],
      },
      {
        kind: "prose",
        heading: "Avoiding conversational pixel-hunting",
        paragraphs: [
          "Conversational pixel-hunting happens when a Game Master decides that an essential clue will only be revealed if players ask a single exact question or utter a specific keyword. If the players ask about the victim's visitors, the GM stays silent about the delivery courier because a courier is technically not a visitor. This turns investigative roleplay into an adversarial guessing game where players feel punished for failing to read the GM's mind.",
          "Keep player skill focused on interpreting clues, recognising contradictions, and deciding which leads to pursue. When players ask an open question, answer generously with the NPC's core knowledge. When their follow-up questions touch the general vicinity of a secondary clue, let the witness make the natural mental connection rather than withholding the detail on a technicality.",
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
            text: "The GM gives Vane's natural summary immediately: he found the rear storeroom trashed at dawn, two jars of dried ghostleaf missing, and his apprentice nowhere to be found. The party now has a suspect, a crime scene, and a stolen item. The rogue then asks if anything unusual happened the night before. This jogs Vane's memory: he recalls the bell above the front door ringing briefly around midnight, followed by the distinctive reek of marsh bilge, pointing the party toward the river docks.",
          },
          {
            term: "Why it works",
            text: "The party receives actionable leads right away without needing magic words. The targeted question about the prior evening does not gate basic progress; instead, it rewards player initiative with physical evidence and an unexpected direction to explore.",
          },
        ],
      },
      {
        kind: "checklist",
        heading: "Checklist: Running broad witness questions",
        intro:
          "Keep these six checks in mind whenever players prompt an NPC for everything they know:",
        items: [
          "Deliver the core lead and general summary in the NPC's very first response.",
          "Ensure no essential piece of evidence is hidden behind an exact keyword or specific phrasing.",
          "Frame the account through the NPC's craft, social standing, and personal worries.",
          "Use specific follow-up questions to jog associative memory rather than unlock gated doors.",
          "Separate what the witness actually saw from their personal assumptions about what it meant.",
          "When the witness has shared everything they know, direct the party toward another person, record, or physical scene.",
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
    ],
    discovery: {
      id: "answer-npc-tell-us-everything",
      parentCluster: "adventure-mapping",
      clusters: ["adventure-mapping", "session-prep"],
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
