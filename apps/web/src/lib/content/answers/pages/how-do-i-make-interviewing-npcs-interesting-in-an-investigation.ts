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
      "Make the NPC a person with their own view of events, not a clue dispenser. Follow the game's clue procedure, but ensure the investigation has a reliable way forward that does not depend on one exact phrase or fragile check. Separate what the NPC believes they saw, what they think it meant, and what they missed or avoid mentioning: direct recollection is not objective truth, and confidence is not accuracy.",
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
        heading: "Observations, interpretations, and omissions",
        intro:
          "Every witness account mixes three kinds of material. Keep a fourth question in mind too: where did each claim come from? Naming these distinctions lets testimony be imperfect without making everyone dishonest:",
        items: [
          {
            term: "Observations and recollections",
            text: "What the NPC believes they directly saw, heard, or did: who seemed to be present, when something happened, what they noticed, or what they moved. Directly remembered is not the same as objectively true. A sincere witness can misremember timing, sequence, distance, identity, colour, clothing, or what they heard; recollection is limited by where they were, what they noticed, and what they can now recall.",
          },
          {
            term: "Source",
            text: "For each claim, note whether the NPC witnessed it, inferred it, or heard it from someone else. They may be repeating gossip, an official account, a superior's explanation, or a rumour learned later. Ask who told them and when; do not let hearsay quietly become eyewitness testimony.",
          },
          {
            term: "Interpretations",
            text: "What the NPC believes their recollections mean: motives they assign, causes they assume, and conclusions drawn later. An earnest witness can be confident and wrong, uncertain and right, or accurate about one detail but mistaken about another. Confidence, hesitation, and nervousness are not automatic truth detectors.",
          },
          {
            term: "Omissions",
            text: "Details they left out because they forgot, missed the significance, misunderstood the context, or deliberately avoided the topic. Some omissions are innocent, some protective, and some reflect embarrassment or fear. Use omissions to explain why a further question can surface something new without rewriting what was already said.",
          },
        ],
        outro:
          "Keep confidence separate from accuracy: decide what the witness is sure of and where they are genuinely unsure. You can clarify a recollection, ask about its source, challenge an interpretation, or reveal an omission without making the whole scene swing from total openness to total silence.",
      },
      {
        kind: "list",
        heading: "What to give freely",
        intro:
          "Do not make progress-critical information depend on one exact phrase or one fragile check. Follow the game's clue procedure, but ensure the investigation has a reliable way forward. In systems where core clues are freely available, offer them through ordinary conversation:",
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
            text: "Targeted prompts can bring out prepared or fictionally supported details the NPC had not volunteered, or clarify uncertainty already present. Keep any new recollection consistent with where they were, what they could perceive, what held their attention, and what has already been established. Asking about senses, timing, routine, or what happened just before or after can help; repeated questions should not create new evidence from nowhere.",
          },
          {
            term: "Ask how they know",
            text: "“How do you know that?” separates what the witness directly perceived from what someone told them, what they inferred, what they normally expect, or what they learned afterwards. If they say, “He was angry”, ask what they actually saw: “He slammed the ledger shut and left without his coat.” The players can then judge the observation and interpretation for themselves.",
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
        kind: "prose",
        heading: "Know when the interview is done",
        paragraphs: [
          "Before the scene, know what decisions this interview could change. When the witness has given their useful account, the actionable follow-ups are clear, and further questions would only repeat material, say so plainly and move on. For example: “You think you've got everything she remembers about the warehouse,” or “He has nothing else on the timeline, but he may know more about the victim's business partners.” This gives the players a clear next step without inviting conversational pixel-hunting.",
          "Pressure may change willingness, not reliability. An intimidated witness might guess, exaggerate their certainty, say what they think the investigators want, conceal something else, or become less cooperative later. A successful intimidation is not a truth serum.",
          "An interview can also be a group effort. Different PCs can ask the main questions, check the timeline, compare notes or documents, recognise technical details, watch for inconsistencies where the system supports it, bring up prior evidence, or offer reassurance and credibility. Let those contributions matter without reducing the scene to one Face roll.",
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
            text: "Do not roll merely because the scene is social. Roll when the outcome is uncertain and the result would change something meaningful; if a cooperative witness knows the answer and has no reason to withhold it, give it. Checks can help calm a frightened witness, obtain sensitive context, persuade someone to accept risk, spot an inconsistency where the system supports it, or avoid a social cost while pressing hard. Mix cooperative witnesses, nervous witnesses, talkative gossips, distracted bystanders, partial observers, experts who can interpret a detail, and hostile suspects.",
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
            term: "Know what the roll can change",
            text: "Where the system benefits from explicit stakes, make the likely gain and risk clear before the roll. Otherwise, at least know what success or failure can change, so the roll adds context, cost, or consequence instead of deciding whether the investigation continues.",
          },
        ],
      },
      {
        kind: "list",
        heading: "A lightweight witness prep template",
        intro:
          "You need enough structure to improvise the conversation without scripting a dialogue tree. Note only what will help you run the account consistently:",
        items: [
          {
            term: "Observed / remembers",
            text: "What they believe they directly saw, heard, or did.",
          },
          {
            term: "Source",
            text: "Direct observation, inference, or something heard from someone else.",
          },
          {
            term: "Assumes / concludes",
            text: "What they think their recollections mean, and how confident they are.",
          },
          {
            term: "Uncertain about",
            text: "Where their memory or understanding is genuinely incomplete or unsure.",
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
          {
            term: "Corroboration / contradiction",
            text: "What other witness, record, or physical evidence could support or challenge the account.",
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
            text: "Observed / remembers: believes she saw the courier enter at about 21:00 and leave without their satchel. Source: direct, though the time is approximate. Assumes / concludes: the courier stole something. Confident about: the missing satchel; uncertain about: the exact time and the person at the rear door. Missed significance: she saw someone use the rear door five minutes later but assumed it was a cleaner. Reluctant to mention: she was meeting someone nearby on a personal errand during her shift. Why: she fears being blamed. Cares about: keeping the job and avoiding a formal report. Useful follow-ups: timing, rear entrance, satchel, who else was present. Corroboration / contradiction: the watch log and the courier's itinerary.",
          },
          {
            term: "Flat version",
            text: "Mara recites everything in one speech, including the second person and her own errand, or the GM withholds the satchel until the players say the exact word satchel. Either way, the players have little to decide except to wait or to guess.",
          },
          {
            term: "Responsive version",
            text: "Asked broadly, Mara offers her summary: the courier came at about nine, seemed agitated, and left without the satchel, so she assumes a theft. The party has a reliable lead to follow. Asked how she knows he was agitated, she recalls that he shut the ledger hard and left without his coat. Asked about routine, she says the rear door is normally locked and that she thought she saw it move later, but was distracted. Asked who else was present, she hesitates before admitting she stepped away briefly and is worried about being blamed. Each specific question clarifies a supported recollection, source, assumption, or cost; the party can compare her account with the watch log and the courier's itinerary.",
          },
          {
            term: "Why it works",
            text: "The lead arrives through the game's reliable clue procedure, without magic wording, while targeted questions still improve the picture. Mara's interpretation is clearly hers, her memory remains fallible, and the players leave with a place to check and an account to corroborate rather than a single solved answer.",
          },
        ],
      },
      {
        kind: "checklist",
        heading: "Quick GM checklist for the next interview",
        intro:
          "Run through these before the scene and keep them visible at the table:",
        items: [
          "You have noted what the NPC remembers, the source of each claim, what they assume, and what remains uncertain.",
          "Their reluctance comes from character or circumstance, not from needing to stall the case.",
          "A roll has a meaningful uncertain outcome; cooperative witnesses can simply give information they know and will share.",
          "Progress-critical information has a reliable route under the game's clue procedure, without one exact phrase or fragile check.",
          "You know three or four follow-up angles that would draw out context, contradictions, relationships, or new leads.",
          "You know what success or failure can change; where the system benefits from it, you have made the likely stakes clear before the roll.",
          "You know what could corroborate or contradict the account, and when further questions would only repeat what the witness has said.",
        ],
      },
    ],
    codexConnection: {
      heading: "Track what each witness actually said",
      paragraphs: [
        "Interviews are easier to run when you can see how claims connect. Keep each NPC as an entity, link their testimony to the people, places, and items it concerns, and note which parts are recollection, hearsay, interpretation, or omission. When the next witness speaks, you can compare accounts without re-reading pages of notes.",
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
      parentCluster: "session-prep",
      clusters: ["session-prep"],
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
        "A witness-centred framework that separates fallible recollections, interpretations, and omissions, tracks where claims came from, and uses targeted questions and social stakes to change quality and consequence rather than gate progress.",
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
        "Make NPC interviews matter with fallible recollections, clear sources, useful follow-up questions, and a reliable route through the investigation.",
      image:
        "https://assets.codexcryptica.com/og/how-do-i-make-interviewing-npcs-interesting-in-an-investigation.jpg",
      imageAlt:
        "An investigator studies evidence at a lantern-lit table while companions question a witness in a stone archive",
    },
  };
