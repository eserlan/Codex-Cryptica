import type { AnswerConfigInput } from "../schema";

export const howDoIMakeInterviewingNpcsInterestingInAnInvestigation: AnswerConfigInput =
  {
    slug: "how-do-i-make-interviewing-npcs-interesting-in-an-investigation",
    category: "running-the-game",
    publishedAt: "2026-10-03",
    question:
      "How do I make interviewing NPCs interesting in an investigation?",
    kind: "framework",
    shortAnswer:
      "Make the NPC a person with their own view of events, not a clue dispenser. Give essential information freely through ordinary conversation, then let specific questions change what the NPC remembers, reveals, or revises. Separate what they saw, what they think it meant, and what they missed or avoid mentioning, so testimony is imperfect without every witness being a liar and no single question needs magic wording to keep the investigation moving.",
    sections: [
      {
        kind: "prose",
        heading: "Why interviews turn flat",
        paragraphs: [
          "Investigation interviews most often stall in one of two ways. In the first, the NPC delivers everything they know as a tidy monologue and the players simply listen. In the second, the NPC withholds a necessary clue until the players guess the exact question the GM prepared, and the scene becomes a guessing game with no clear way forward. Both remove meaningful choice.",
          "The stronger alternative treats the interview as a conversation with a person who has a partial view of events and reasons to frame it in a particular way. The players still obtain what they need to continue, but their questions, approach, and reading of the NPC determine how much context, contradiction, and consequence they carry into their next decision.",
        ],
      },
      {
        kind: "list",
        heading: "Facts, interpretations, and omissions",
        intro:
          "Every witness account mixes three kinds of material. Naming them lets testimony be unreliable without making everyone dishonest:",
        items: [
          {
            term: "Facts",
            text: "Things the NPC directly observed or did: who was present, what time something happened, what was seen or heard, what objects were moved. This is the most stable part of their account, though still limited by where they were and what they noticed.",
          },
          {
            term: "Interpretations",
            text: "What the NPC believes those facts mean: motives they assign, causes they assume, conclusions they have drawn. An earnest witness can report facts accurately and still be confidently wrong about why they happened.",
          },
          {
            term: "Omissions",
            text: "Details they left out because they forgot, dismissed the significance, misunderstood the context, or deliberately avoided the topic. Some omissions are innocent, some are protective, and some reflect embarrassment or fear. Use omissions to explain why a further question can surface something new without rewriting what was already said.",
          },
        ],
        outro:
          "Keeping these separate helps you answer follow-up questions consistently. You can confirm a fact, challenge an interpretation, or reveal an omission without deciding the whole scene should swing from total openness to total silence.",
      },
      {
        kind: "list",
        heading: "What to give freely",
        intro:
          "Players should not need to discover a hidden dialogue option to obtain the clue that lets the investigation continue. Offer it through ordinary conversation:",
        items: [
          {
            term: "The NPC's useful summary",
            text: "When the party asks a broad question, give the witness's own sense of what mattered: what they think happened, in the order they remember it, with the emphasis they would naturally put on it. This is not an exhaustive transcript, it is how that person would summarise the event to someone asking for help.",
          },
          {
            term: "Core facts they would volunteer",
            text: "Anything the NPC would reasonably consider relevant belongs in the initial exchange without a special prompt. If they saw the courier leave without the satchel, they mention it. If they noticed the rear door open, they mention that too when it seems connected to what the party asked about.",
          },
          {
            term: "What they have already told others",
            text: "Witnesses often repeat the version they gave to a guard, a manager, or a neighbour. That prior account is a natural place to start, and later questions can draw out what was left out of the first telling because it seemed unimportant at the time.",
          },
        ],
      },
      {
        kind: "list",
        heading: "Make questions matter without requiring magic wording",
        intro:
          "Better questions should improve the quality, context, and consequences of what the NPC shares, not provide the only route forward:",
        items: [
          {
            term: "Jog a memory",
            text: "Specific prompts about senses, timing, and routine help the NPC recall something they had not volunteered. Asking what they heard, who else was nearby, what happened immediately before or after, or whether something was unusual for that place and time are all forms of this.",
          },
          {
            term: "Surface a contradiction",
            text: "When the party names a detail that does not fit the NPC's interpretation, the NPC can hesitate, revise, or explain why they saw it differently. The conversation changes because the players noticed something, not because they used a prepared keyword.",
          },
          {
            term: "Shift trust and caution",
            text: "How the question is framed changes the NPC's willingness. A respectful, precise approach can steady a nervous witness. Pressing on a sore subject, revealing how much the party already knows, or questioning their judgement can make the same NPC guarded or eager to redirect attention.",
          },
          {
            term: "Open a new lead",
            text: "Follow-ups about relationships, habits, and what was normal for the location often produce another person to speak to, another place to check, or another record to request. This keeps momentum even when the current witness has little more to add on the central fact.",
          },
        ],
      },
      {
        kind: "list",
        heading: "Give the NPC motives, relationships, and stakes",
        intro:
          "An interview becomes a scene when the information has a social cost. Decide one or two pressures that shape how this person talks:",
        items: [
          {
            term: "Protection and loyalty",
            text: "The witness may be guarding a family member, a colleague, or an employer. They still answer other questions cooperatively, but anything that points toward the protected person meets hesitation, redirection, or a request for reassurance.",
          },
          {
            term: "Fear and reputation",
            text: "Admitting what they saw could invite retaliation, embarrassment, or trouble with an authority they distrust. Their reluctance then comes from circumstance, not from the GM needing to slow the investigation. Show the reason plainly so the players can address it if they choose.",
          },
          {
            term: "Eagerness and private theories",
            text: "Some witnesses want the party to reach a particular conclusion, or are keen to help but confidently wrong about what they saw. Their enthusiasm is useful, and their mistaken interpretation is a chance to test the players' judgement rather than to mislead them through deceit.",
          },
          {
            term: "Vary the posture across the case",
            text: "Not every NPC should resist or demand a check. Mix cooperative witnesses, nervous witnesses, talkative gossips, distracted bystanders, partial observers, experts who can interpret a detail, and hostile suspects. Variety keeps questioning from feeling like every conversation is an interrogation.",
          },
        ],
      },
      {
        kind: "list",
        heading: "Use rolls to change quality, not to erase the scene",
        intro:
          "Where your system uses social or investigative checks, treat failure as a change in cost, clarity, or consequence rather than a blank result:",
        items: [
          {
            term: "Fewer optional details",
            text: "The party keeps the core summary and any fact the NPC would have volunteered. A weak result means less context, fewer precise times, or a useful detail that remains vague enough to need corroboration elsewhere.",
          },
          {
            term: "An interpretation goes unchallenged",
            text: "The NPC's confident but mistaken reading of events stands for now. The players have the facts they were given, and can test the interpretation by comparing it with other testimony, physical evidence, or records.",
          },
          {
            term: "The relationship or situation shifts",
            text: "The conversation may take longer, the NPC may want something in return, or they may become wary and share less in future. The party may also reveal what they are investigating, which can have consequences with other interested parties.",
          },
          {
            term: "Make the stakes visible before the roll",
            text: "State what a strong result would add and what a weak one would risk, so the players can decide how to approach the conversation and whether to accept a cost, seek another witness, or try a different angle.",
          },
        ],
      },
      {
        kind: "list",
        heading: "A lightweight witness prep template",
        intro:
          "You need enough structure to improvise the conversation without scripting a dialogue tree. Six fields are usually enough:",
        items: [
          {
            term: "Knows",
            text: "One or two facts they directly observed.",
          },
          {
            term: "Assumes",
            text: "What they think those facts mean.",
          },
          {
            term: "Missed significance",
            text: "A detail they noticed but did not realise mattered.",
          },
          {
            term: "Reluctant to mention",
            text: "One thing they avoid discussing, plus the plain reason why.",
          },
          {
            term: "Care about",
            text: "What matters to them personally in this situation.",
          },
          {
            term: "Useful follow-ups",
            text: "Three or four natural prompts that would draw out more: timing, another person, a routine, an unusual sound, a record, a location.",
          },
        ],
      },
      {
        kind: "example",
        heading: "Example: Mara Venn at the warehouse",
        paragraphs: [
          "The party questions Mara Venn, a night porter who was closing the yard office when a courier left the warehouse. Prepared with the template above, the scene stays responsive without needing a fixed script.",
        ],
        items: [
          {
            term: "Prep",
            text: "Knows: saw the courier enter at about 21:00 and leave without their satchel. Assumes: the courier stole something. Missed significance: a second person used the rear door five minutes later, which Mara assumed was a cleaner. Reluctant to mention: she was meeting someone nearby on a personal errand during her shift. Care about: keeping the job and avoiding a formal report. Useful follow-ups: timing, rear entrance, satchel, who else was present.",
          },
          {
            term: "Flat version",
            text: "Mara recites everything in one speech, including the second person and her own errand, or the GM withholds the satchel until the players say the exact word satchel. Either way, the players have little to decide except to wait or to guess.",
          },
          {
            term: "Responsive version",
            text: "Asked broadly, Mara offers her summary: the courier came at nine, seemed agitated, and left without the satchel, so she assumes a theft. That already gives the party the courier, the time, and the missing satchel. Asked about routine, she notes the rear door is normally locked and that she thought she saw it move later but was distracted. Asked who else was present, she hesitates before admitting she stepped away briefly and is worried about being blamed. Each specific question jogs a fact, exposes her assumption, or reveals a cost, and the party can compare her account with the watch log and the courier's itinerary.",
          },
          {
            term: "Why it works",
            text: "The core facts arrive without magic wording, but targeted questions still improve the picture. The NPC's interpretation is available and clearly labelled as hers, the omission has a human reason, and the players leave with a new place to check and a person to corroborate rather than a single solved answer.",
          },
        ],
      },
      {
        kind: "checklist",
        heading: "Quick GM checklist for the next interview",
        intro:
          "Run through these before the scene and keep them visible at the table:",
        items: [
          "You have given the NPC one thing they know, one thing they assume, and one thing they missed or avoid.",
          "Their reluctance comes from character or circumstance, not from needing to stall the case.",
          "At least one scene type is cooperative; not every NPC resists or demands a roll.",
          "The essential clue is available through ordinary conversation, without exact phrasing.",
          "You know three or four follow-up angles that would draw out context, contradictions, relationships, or new leads.",
          "You can state what a strong or weak social or investigation roll would change, without turning failure into silence.",
          "You have a nearby piece of evidence, record, or other witness the party can use to check the interpretation they were given.",
        ],
      },
    ],
    codexConnection: {
      heading: "Track what each witness actually said",
      paragraphs: [
        "Interviews are easier to run when you can see how claims connect. Keep each NPC as an entity, link their testimony to the people, places, and items it concerns, and note which parts are fact, interpretation, or omission. When the next witness speaks, you can compare facts without re-reading pages of notes.",
        "Codex Cryptica's graph and note linking suit a case with several imperfect accounts. Record the useful follow-ups from your prep on the entity, then follow the links to the location or record the party checks next.",
      ],
      linkText: "Map NPC testimony in Codex Cryptica",
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
      "how-do-you-run-a-mystery-without-railroading",
      "how-do-i-run-an-investigator-without-sidelining-the-party",
      "how-do-i-run-character-roles-in-an-investigative-horror-rpg",
      "how-do-you-run-a-scene-with-multiple-npcs",
      "how-do-you-run-a-conspiracy-campaign",
      "how-do-i-give-specialist-characters-spotlight",
      "how-do-you-design-rpg-puzzles-that-do-not-stall-the-game",
      "how-do-you-create-quest-hooks-without-railroading",
      "how-do-you-handle-players-going-off-script-as-a-gm",
      "what-rpg-should-i-play-for-investigative-horror",
    ],
    discovery: {
      id: "answer-interviewing-npcs-investigation",
      parentCluster: "adventure-mapping",
      clusters: ["adventure-mapping", "session-prep"],
      primaryIntent:
        "how do i make interviewing npcs interesting in an investigation",
      intentAliases: [
        "how to run npc interviews rpg",
        "rpg witness interview",
        "investigation rpg npcs",
        "how to roleplay interrogations rpg",
        "mystery rpg conversations",
        "make npc questioning interesting",
        "detective rpg gm advice",
        "rpg npc interrogation techniques",
        "how to run witness questioning in an rpg",
      ],
      userJob: "adopt-workflow",
      uniqueValue:
        "A witness-centred framework that separates facts, interpretations, and omissions, gives core clues without magic wording, and uses targeted questions and social stakes to change quality and consequence rather than gate progress.",
      relatedIntents: [
        "answer-run-mystery-without-railroading",
        "answer-run-investigator-without-sidelining-party",
        "answer-run-scene-multiple-npcs",
        "answer-conspiracy-campaign",
        "answer-specialist-character-spotlight",
      ],
      acknowledgedOverlap: [
        {
          with: "answer-run-mystery-without-railroading",
          reason:
            "The mystery answer covers resilient scenario structure and clue redundancy across an investigation; this answer covers the distinct skill of running individual witness interviews through personal perspective, social stakes, and follow-up questions.",
        },
        {
          with: "answer-run-investigator-without-sidelining-party",
          reason:
            "Both address investigations, but the investigator answer distributes clue discovery and interpretation among PCs while preserving a specialist's competence; this answer structures what a single NPC knows, withholds, or misreads and how the conversation reacts to the party.",
        },
        {
          with: "answer-run-scene-multiple-npcs",
          reason:
            "The multi-NPC answer structures crowded council scenes through brief friction beats and sub-scenes; this answer structures one-to-one or small-group interviews through facts, interpretations, and omissions and targeted follow-ups.",
        },
        {
          with: "answer-specialist-character-spotlight",
          reason:
            "The spotlight answer gives a framework for any specialist PC to contribute without isolating the party; this answer gives a framework for shaping interview NPC behaviour and testimony regardless of which PC is present.",
        },
      ],
    },
    seo: {
      title: "How to Make NPC Interviews Interesting | Codex Cryptica",
      description:
        "Stop flat NPC interviews. Use facts, interpretations and omissions, give core clues freely, and let better questions change context and consequences.",
      image:
        "https://assets.codexcryptica.com/og/how-do-i-run-an-investigator-without-sidelining-the-party.jpg",
      imageAlt:
        "An investigator studies evidence at a lantern-lit table while companions question a witness in a stone archive",
    },
  };
