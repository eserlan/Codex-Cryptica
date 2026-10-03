import type { AnswerConfigInput } from "../schema";

export const howDoIHandlePlayersAskingAnNpcToTellUsEverythingYouKnow: AnswerConfigInput =
  {
    slug: "how-do-i-handle-players-asking-an-npc-to-tell-us-everything-you-know",
    category: "running-the-game",
    publishedAt: "2026-10-04",
    question:
      "How do I handle players asking an NPC to 'tell us everything you know'?",
    kind: "framework",
    shortAnswer:
      "Treat 'tell us everything you know' as a request for the witness's useful summary, not a literal transcript of every memory. Give core facts the NPC would reasonably think are relevant without requiring exact wording, then let specific follow-up questions prompt additional sensory detail, timing, relationships, and context the NPC did not realise mattered. This keeps the investigation moving while still rewarding focused questions, attention to contradictions, and the choice of who to ask next.",
    sections: [
      {
        kind: "prose",
        heading: "Why 'everything you know' is not literally everything",
        paragraphs: [
          "When players say 'tell us everything you know', they are trying to avoid missing a clue because they did not guess the right phrasing. Taken literally, that request would ask an NPC to catalogue every perception, conversation, and assumption from the time in question, which no witness does in practice and which would take longer to deliver than any table wants to sit through.",
          "Memory is associative and selective. People summarise what they think mattered, in the order they remember it, with the emphasis that reflects their role and concerns. They do not know which details are relevant to the investigators, so they leave out things they noticed but dismissed, forgot to connect, or assumed were normal. A specific question can prompt them to remember a sound, a time, or a person they would not have volunteered in a broad summary, without implying they were hiding it.",
        ],
      },
      {
        kind: "list",
        heading: "What the NPC should volunteer without exact wording",
        intro:
          "If a piece of information is needed for the investigation to continue, do not hide it behind a single prepared phrase. Give it through ordinary conversation when the party shows interest in that witness:",
        items: [
          {
            term: "Their summary of events",
            text: "How the NPC would describe what happened if asked for help: what they were doing, what they saw or heard happen, and what they believe it meant. Keep it in their voice and their order, not as a neutral chronology compiled by the GM.",
          },
          {
            term: "Core facts they think are relevant",
            text: "Anything the witness would reasonably connect to the matter at hand belongs in the initial exchange without a special prompt. If they saw a courier leave without a satchel, noticed the rear door ajar, or heard a raised voice shortly before a disappearance, they mention it when the party asks about that period.",
          },
          {
            term: "What they have already told others",
            text: "Many witnesses repeat the version they gave to a guard, a manager, or a neighbour. That prior account is a natural starting point, and later questions can surface what was left out the first time because it seemed unimportant.",
          },
          {
            term: "Their interpretation as interpretation",
            text: "Offer the NPC's own reading of events alongside the facts, and make clear which part is their assumption. An earnest witness can report accurately and still be confidently wrong about motive, cause, or who is responsible, which gives the players something to test against other evidence.",
          },
        ],
      },
      {
        kind: "list",
        heading: "How broad questions and specific follow-ups work together",
        intro:
          "Broad questions get the witness's useful summary. Specific questions uncover context, connections, and overlooked details, not the only clue required to continue the adventure:",
        items: [
          {
            term: "Broad question, broad answer",
            text: "'Tell us everything you know' or 'what happened last night' produces the NPC's sense of what mattered: the sequence they recall, the people they noticed, and their explanation. It is helpful and moves the scene forward, but it is not exhaustive and it is not a substitute for listening to how they frame events.",
          },
          {
            term: "Sensory and timing prompts",
            text: "'What did you hear', 'what did you see from where you stood', and 'what happened immediately before and after' can surface sounds, movements, or timings the summary skipped. Use these to add precision to an existing fact rather than to replace it.",
          },
          {
            term: "Routine and normal behaviour prompts",
            text: "'Was anything unusual' and 'is that normal here' work well when the NPC knows the place but the players do not. The question draws out a comparison between what happened and what usually happens, which the NPC would not think to offer unprompted.",
          },
          {
            term: "People and relationships prompts",
            text: "'Who else was there', 'who would normally be there', and 'who has access to this' often produce another person to speak to, another place to check, or a record to request. This keeps momentum even when the current witness has little more to add on the central fact.",
          },
          {
            term: "Perception and behaviour prompts",
            text: "'How did they seem' and 'did anything strike you about their behaviour' can reveal hesitation, hurry, familiarity, or an interaction the NPC noticed but did not assign meaning to. Treat the answer as observation plus the NPC's reading, so the players can weigh it rather than accept it as settled.",
          },
        ],
      },
      {
        kind: "list",
        heading: "Use the NPC's perspective to shape what they notice",
        intro:
          "The same event looks different through different witnesses. One or two filters are enough to make accounts varied without writing a full biography for each NPC:",
        items: [
          {
            term: "Profession and expertise",
            text: "A guard notices who passed a checkpoint and whether procedure was followed. A servant notices who was served last and who left early. An engineer notices a machine left running when it should have been shut down. A child notices tone, movement, and who seemed afraid, not job titles or formal procedure.",
          },
          {
            term: "Relationships and loyalty",
            text: "A witness may be steadier when describing strangers and more cautious when the account points toward someone they care about. The hesitation is visible, so players can decide whether to press, reassure, or come back later rather than guessing that reticence exists.",
          },
          {
            term: "Assumptions and biases",
            text: "People explain events with the stories available to them. A harbour worker may assume a late boat was smuggling. A temple steward may assume an argument was about doctrine. Those assumptions are useful because they show how the NPC organises what they saw, even when the explanation is wrong.",
          },
          {
            term: "Fears and stakes",
            text: "Admitting what they saw might invite retaliation, embarrassment, or trouble with an authority they distrust. The cost should be shown plainly so the party can address it if they choose, rather than discovering through trial phrasing that the GM wanted them to offer protection first.",
          },
          {
            term: "What they personally care about",
            text: "The detail that matters to this NPC is often the foothold for the next question. A quartermaster cares about missing stores. A musician cares about a song stopped partway through. Start from that foothold when you decide what a specific prompt would prompt them to recall.",
          },
        ],
      },
      {
        kind: "prose",
        heading: "Avoid conversational pixel-hunting",
        paragraphs: [
          "Players should not need to guess the GM's secret wording to obtain information their characters could reasonably obtain. When the party asks a sincere broad question, give them the core of what the NPC would volunteer. Reserve additional detail for the quality, precision, and consequence of follow-ups, not as a gate on essential progress.",
          "Player skill still matters, but in interpreting information rather than in finding the one dialogue option that unlocks it. The group can recognise contradictions, decide who to question next, ask about a neglected angle, connect testimony with physical evidence or records, and choose what the evidence means. Those choices carry weight without turning every NPC conversation into a test of whether the players read the GM's mind.",
          "Where your system uses social or investigative checks, treat failure as a change in clarity, cost, or consequence rather than silence. A weak result might mean less precise timing, a detail that needs corroboration elsewhere, an interpretation left unchallenged for now, or a conversation that takes longer or creates a visible complication. State what a strong result would add before the roll, so the players can decide how to approach the conversation.",
        ],
      },
      {
        kind: "example",
        heading: "Example: the night clerk and the missing charter",
        paragraphs: [
          "The party investigates a missing town charter. They question Tomas Kade, the night clerk who was filing tax ledgers in the hall annex when the steward left with a visitor. You have prepared Tomas with his perspective: a precise clerk who values procedure, wants to avoid blame, and assumes the visitor was a legitimate courier.",
        ],
        items: [
          {
            term: "Broad question first",
            text: "The party says 'tell us everything you know'. Tomas gives his summary: the steward arrived at about ten bells with a courteous stranger in a grey cloak, signed the visitor log, and left carrying a leather case he had not brought in. Tomas assumed this was a scheduled collection, noted the time as he always does, and thought little of it until the charter was reported missing at dawn. That already delivers the visitor, the case, the time, and Tomas's interpretation.",
          },
          {
            term: "Specific questions add depth",
            text: "Asked 'what did you hear', Tomas recalls the steward saying 'the seal must travel separately', which he took to mean wax and ribbon. Asked 'was anything unusual', he notes the steward normally locks the charter chest himself, but this time the visitor carried the case while the steward held only a letter. Asked 'who else was there', he admits the under-clerk Brena passed the annex carrying a dust cloth, though Tomas did not think to ask her what she saw. Each prompt triggers a sensory detail, a comparison to routine, or another person, without rewriting his initial summary.",
          },
          {
            term: "Perspective shapes the detail",
            text: "Because Tomas is a clerk, he is precise about times, the log, and the case, and vague about the visitor's face, which he barely looked at. A guard on the same corridor would have described the visitor's build and gait but missed the comment about the seal. A servant clearing hearths would have noticed the steward's hurried shoes and the visitor's boots still wet from rain. The same core event produces distinct, complementary accounts.",
          },
          {
            term: "Why it works",
            text: "The essential clue, a visiting stranger leaving with a case around ten bells, arrives without magic wording. Follow-ups do not create new essential clues; they add context that sharpens interpretation, suggests who to speak to next, and gives the party a record to check. The challenge is deciding what the case and the steward's comment imply, not discovering the exact question that would have made Tomas mention them.",
          },
        ],
      },
      {
        kind: "checklist",
        heading: "Quick GM checklist for 'tell us everything' questions",
        intro: "Keep this visible the next time the party questions a witness:",
        items: [
          "Core facts the NPC would volunteer in a helpful summary are ready and not locked behind a keyword.",
          "You can state the difference between what the NPC observed and what they believe it means.",
          "You know the NPC's perspective that shapes what they noticed and what they would dismiss.",
          "Three or four specific prompts would draw out more detail: a sensory question, a timing or routine question, and a people or access question.",
          "At least one additional person, place, or record exists that can corroborate or challenge the account.",
          "Weak social or investigative results change cost, precision, or consequence, rather than withholding the core summary.",
          "Player decisions will focus on interpreting information and choosing the next lead, not on guessing the exact phrasing that unlocks a necessary clue.",
        ],
      },
    ],
    codexConnection: {
      heading: "Keep each account linked to the wider case",
      paragraphs: [
        "Witness interviews are easier to run when you can see how claims connect without re-reading pages of notes. Keep each NPC as an entity, link their testimony to the people, places, and records it concerns, and note which parts are observation and which are interpretation.",
        "Codex Cryptica's knowledge graph suits cases with several partial accounts. Record the summary you gave, the useful follow-ups you prepared, and the corroborating evidence the party can check next, then follow the links when a later witness adds or challenges a detail.",
      ],
      linkText: "Map testimony with the knowledge graph",
      href: "/solutions/rpg-knowledge-graph",
    },
    relatedTools: [
      {
        title: "NPC generator",
        description:
          "Create witnesses, clerks, guards, and specialists with distinct perspectives for the next interview.",
        href: "/generators/npc",
      },
      {
        title: "Quest generator",
        description:
          "Turn a fresh witness detail into the next concrete lead, with locations and stakes attached.",
        href: "/generators/quest",
      },
      {
        title: "Rumour generator",
        description:
          "Stock the local talk that shapes what the community believes about the case.",
        href: "/generators/rumour",
      },
    ],
    relatedForPages: [
      {
        title: "Codex Cryptica for investigative campaigns",
        description:
          "Keep witnesses, evidence, and case threads connected across a long-running investigation.",
        href: "/for/conspiracy",
      },
    ],
    relatedAnswers: [
      "how-do-i-make-interviewing-npcs-interesting-in-an-investigation",
      "how-do-you-run-a-mystery-without-railroading",
      "how-do-i-run-an-investigator-without-sidelining-the-party",
      "how-do-i-run-character-roles-in-an-investigative-horror-rpg",
      "what-rpg-should-i-play-for-investigative-horror",
      "how-do-i-give-specialist-characters-spotlight",
      "how-do-you-run-a-conspiracy-campaign",
      "how-do-you-design-rpg-puzzles-that-do-not-stall-the-game",
      "how-do-you-create-quest-hooks-without-railroading",
      "how-do-you-handle-players-going-off-script-as-a-gm",
    ],
    discovery: {
      id: "answer-handle-tell-us-everything-npc",
      parentCluster: "adventure-mapping",
      clusters: ["adventure-mapping", "session-prep"],
      primaryIntent:
        "how to handle players asking npc to tell everything you know",
      intentAliases: [
        "rpg npc interview how to handle tell us everything you know",
        "players ask npc everything they know",
        "how to run npc interrogation rpg",
        "mystery rpg questioning npcs",
        "how to give clues through npcs",
        "investigation rpg npc conversation",
        "how to handle tell us everything you know rpg",
        "npc tells everything they know rpg gm advice",
        "rpg witness tells everything you know how to handle",
      ],
      userJob: "adopt-workflow",
      uniqueValue:
        "A witness-perspective framework that gives core facts without magic wording, uses broad questions for useful summaries and specific prompts for overlooked sensory, timing, and relationship detail, and keeps the challenge on interpretation rather than guessing dialogue options.",
      relatedIntents: [
        "answer-interviewing-npcs-investigation",
        "answer-run-mystery-without-railroading",
        "answer-run-investigator-without-sidelining-party",
        "answer-character-roles-investigative-horror",
        "answer-conspiracy-campaign",
        "answer-rpg-puzzles",
      ],
      acknowledgedOverlap: [
        {
          with: "answer-interviewing-npcs-investigation",
          reason:
            "The interviewing NPCs answer covers the full interview structure of facts, interpretations, omissions, and social stakes; this answer focuses on the specific table moment when players ask for everything at once, showing how to give a useful summary freely while keeping specific follow-ups meaningful.",
        },
        {
          with: "answer-run-mystery-without-railroading",
          reason:
            "The mystery answer covers resilient scenario structure and clue redundancy across an investigation; this answer covers how a single witness answers within that structure, separating exhaustive memory from a helpful summary and deeper follow-ups.",
        },
        {
          with: "answer-run-investigator-without-sidelining-party",
          reason:
            "The investigator answer distributes clue discovery and interpretation among PCs while preserving specialist competence; this answer distributes what a witness knows, how they frame it, and which prompts would jog the detail the party needs next.",
        },
      ],
    },
    seo: {
      title:
        "How to Handle 'Tell Us Everything You Know' NPC Questions | Codex Cryptica",
      description:
        "Handle 'tell us everything' NPC questions without dumping every clue or guessing games. Give core facts freely, use follow-ups for deeper detail.",
      image:
        "https://assets.codexcryptica.com/og/how-do-i-handle-players-asking-an-npc-to-tell-us-everything-you-know.jpg",
      imageAlt:
        "Adventurers question a thoughtful clerk by lamplight while the witness recalls what was seen and heard",
    },
  };
