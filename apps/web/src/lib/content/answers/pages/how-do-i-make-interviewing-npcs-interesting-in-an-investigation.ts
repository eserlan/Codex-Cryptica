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
      "Make the NPC a person with their own view of events and a reason to shape the conversation, not a clue dispenser. Follow the game's clue procedure, but ensure essential information has a reliable route that does not depend on one exact phrase or fragile check. Let specific questions change what the NPC remembers, reveals, or revises. Separate fallible recollections from interpretations and omissions: confidence is not accuracy, and hearsay is not eyewitness testimony.",
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
        heading: "Observations, interpretations, omissions, and confidence",
        intro:
          "A witness gives an account from memory, not an objective record. Separate what they think they experienced from what they think it meant, what they left out, and how certain they feel:",
        items: [
          {
            term: "Observed / remembers",
            text: "What the NPC believes they directly saw, heard, or did: who seemed to be present, when something happened, what they heard, or which objects they handled. Direct recollection is not objective truth. A sincere witness can misremember timing, sequence, distance, identity, colour, clothing, or exact words; memory is limited by where they were, what they noticed, and what they can now recall.",
          },
          {
            term: "Source",
            text: "For each claim, note whether the NPC witnessed it, inferred it, or heard it from someone else. They may be repeating gossip, an official account, a superior's explanation, or a rumour learned later. Ask who told them and when; do not let hearsay quietly become eyewitness testimony.",
          },
          {
            term: "Interpretations",
            text: "What the NPC believes their observations mean: motives they assign, causes they assume, conclusions they have drawn. An earnest witness can remember accurately and still be confidently wrong about why events happened.",
          },
          {
            term: "Omissions",
            text: "Details they left out because they forgot, dismissed the significance, misunderstood the context, or deliberately avoided the topic. Some omissions are innocent, some are protective, and some reflect embarrassment or fear. Use omissions to explain why a further question can surface something new without rewriting what was already said.",
          },
          {
            term: "Confidence",
            text: "How certain the NPC feels about each part of their account. Confidence is useful to portray, but it does not prove accuracy: a hesitant witness may remember correctly, while a certain one may have misheard or filled a gap without noticing.",
          },
        ],
        outro:
          "Keeping these separate helps you answer follow-up questions consistently. You can clarify a memory, challenge an interpretation, or reveal an omission without deciding the whole scene should swing from total openness to total silence.",
      },
      {
        kind: "list",
        heading: "What to give freely",
        intro:
          "Follow the game's clue procedure and give progress-critical information a reliable way forward. In a conversational scene, information an NPC would naturally volunteer should not require a magic phrase or fragile check. Better questions add context and consequences; they do not unlock the only route forward:",
        items: [
          {
            term: "The NPC's useful summary",
            text: "When the party asks a broad question, give the witness's own sense of what mattered: what they think happened, in the order they remember it, with the emphasis they would naturally put on it. This is not an exhaustive transcript, it is how that person would summarise the event to someone asking for help.",
          },
          {
            term: "Useful details they would volunteer",
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
        heading: "Choose the kind of conversation",
        intro:
          "The same witness prep can support different scenes, but their tone and stakes are not interchangeable:",
        items: [
          {
            term: "Interview",
            text: "A cooperative or semi-cooperative exchange focused on gathering information.",
          },
          {
            term: "Questioning a reluctant witness",
            text: "Reassurance, social pressure, or leverage may matter because the witness has a reason to hold back.",
          },
          {
            term: "Interrogating a suspect",
            text: "Incentives, legal risk, deception, and self-protection may dominate; follow the procedures and tone of the game you are playing.",
          },
          {
            term: "Confrontation",
            text: "The party presents evidence and watches how the NPC responds, whether or not the conversation began as an interview.",
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
            term: "Ask how they know",
            text: "“How do you know that?” separates what the witness directly perceived from what someone told them, what they inferred, what they normally expect, or what they learned afterwards. If they say, “He was angry”, ask what they actually saw: “He slammed the ledger shut and left without his coat.” The players can then judge the observation and interpretation for themselves.",
          },
          {
            term: "Surface a contradiction",
            text: "When the party names a detail that does not fit the NPC's account, they might correct a genuine mistake, reinterpret what they saw, double down defensively, admit one part selectively, or find a face-saving way to revise. They may also realise they misunderstood something. A contradiction gives the NPC something to respond to; it does not by itself prove they lied. The conversation changes because the players noticed something, not because they used a prepared keyword.",
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
        heading: "Let the whole party affect the interview",
        intro:
          "One PC may lead the conversation, but evidence and expertise from the whole party should be able to change it:",
        items: [
          {
            term: "Bring other forms of attention",
            text: "A PC can compare testimony with documents, recognise technical language, notice a routine or environmental inconsistency, recall names and relationships, read the room, present physical evidence, or ask a domain-specific follow-up. Let those contributions shape what the lead interviewer can ask, what the witness believes, or what happens next.",
          },
        ],
      },
      {
        kind: "prose",
        heading: "Know when the interview is done",
        paragraphs: [
          "Before the scene, know what decisions this interview could change. When the witness has given their useful account, the actionable follow-ups are clear, and further questions would only repeat material, say so plainly and move on. For example: “You think you've got everything she remembers about the warehouse,” or “He has nothing else on the timeline, but he may know more about the victim's business partners.” This gives the players a clear next step without inviting conversational pixel-hunting.",
          "Pressure may change willingness, not reliability. An intimidated witness might guess, exaggerate their certainty, say what they think the investigators want, conceal something else, or become less cooperative later. A successful intimidation is not a truth serum.",
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
            term: "Deliberate lies",
            text: "A witness can lie, but make the deception specific: decide which claim is false, why they are lying, what truth they are protecting, what evidence could expose it, and how they react when challenged. Lie about something specific; do not make the whole testimony a fog.",
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
            text: "The party keeps the core summary and any detail the NPC would have volunteered. A weak result means less context, fewer precise times, or a useful recollection that remains vague enough to need corroboration elsewhere.",
          },
          {
            term: "An interpretation goes unchallenged",
            text: "The NPC's confident but mistaken reading of events stands for now. The players have the account they were given and can test the interpretation by comparing it with other testimony, physical evidence, or records.",
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
          "You need enough structure to improvise the conversation without scripting a dialogue tree. Keep the witness's account, priorities, and follow-ups in view:",
        items: [
          {
            term: "Observed / remembers",
            text: "One or two things they believe they directly saw, heard, or did.",
          },
          {
            term: "Source",
            text: "For each claim, direct observation, inference, or something heard from someone else.",
          },
          {
            term: "Assumes",
            text: "What they think those observations mean.",
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
            term: "Wants from this conversation",
            text: "What they hope to get from the exchange: protect a colleague, keep their lateness off the record, secure protection before naming someone, be taken seriously, push a pet theory, finish quickly, learn what the party knows, trade information for a favour, or protect an institution's reputation. The investigators want information; the witness should usually want something too.",
          },
          {
            term: "Will revise / open up if…",
            text: "What might change their stance: evidence against an assumption, credible protection, a named mutual contact, an apology, news that another witness has spoken, a believable threat, a contradiction, or a face-saving way to revise their account.",
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
        kind: "prose",
        heading: "A simple interview loop",
        paragraphs: [
          "Open with the NPC's summary, choose an angle, ask a question or present evidence, and let the NPC respond from memory and motive. Update trust or the account, then identify the next lead or contradiction. Repeat while the conversation has something useful to change.",
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
            text: "Observed / remembers: believes she saw the courier enter at about 21:00 and leave without their satchel. Source: direct, though the time is approximate. Confidence: high about the satchel, less certain about the time. Assumes: the courier stole something. Missed significance: a second person used the rear door five minutes later, which Mara assumed was a cleaner. Reluctant to mention: she was meeting someone nearby on a personal errand during her shift. Care about: keeping the job and avoiding a formal report. Wants from this conversation: to keep her own lapse off the record while still being seen as helpful. Will revise / open up if: shown evidence that the rear door was used later, or given a face-saving way to explain why she stepped away. Useful follow-ups: timing, rear entrance, satchel, who else was present. Corroboration / contradiction: the watch log and the courier's itinerary.",
          },
          {
            term: "Flat version",
            text: "Mara recites everything in one speech, including the second person and her own errand, or the GM withholds the satchel until the players say the exact word satchel. Either way, the players have little to decide except to wait or to guess.",
          },
          {
            term: "Responsive version",
            text: "Asked broadly, Mara offers her summary: the courier came around nine, seemed agitated, and left without the satchel, so she assumes a theft. That gives the party a useful account to follow up. Asked about routine, she notes the rear door is normally locked and that she thought she saw it move later but was distracted. A watch log shows the door opened later than she remembers; Mara pauses, then admits she stepped away briefly and is worried about being blamed. Asked who else was present, she recalls someone near the door but is no longer sure it was a cleaner. Each specific question adds context, tests a memory or assumption, or reveals a cost, and the party can compare her account with the watch log and the courier's itinerary.",
          },
          {
            term: "Why it works",
            text: "Essential information has a reliable route without magic wording, while targeted questions still improve the picture. Mara's interpretation is clearly labelled as hers, her memory remains open to correction, the omission has a human reason, and the players leave with a new place to check and a person to corroborate rather than a single solved answer.",
          },
        ],
      },
      {
        kind: "checklist",
        heading: "Quick GM checklist for the next interview",
        intro:
          "Run through these before the scene and keep them visible at the table:",
        items: [
          "You have noted what the NPC remembers, the source of each claim, what they assume, where they are uncertain, and what they missed or avoid.",
          "Their reluctance comes from character or circumstance, not from needing to stall the case.",
          "At least one scene type is cooperative; not every NPC resists or demands a roll.",
          "Progress-critical information has a reliable route under the game's clue procedure, without depending on exact phrasing or a fragile check.",
          "You know three or four follow-up angles that would draw out context, contradictions, relationships, or new leads.",
          "When it fits the game's resolution style, players know what a roll is trying to improve or put at risk.",
          "You have a nearby piece of evidence, record, or other witness the party can use to check the interpretation they were given.",
        ],
      },
    ],
    codexConnection: {
      heading: "Track what each witness actually said",
      paragraphs: [
        "Interviews are easier to run when you can see how claims connect. Keep each NPC as an entity, link their testimony to the people, places, and items it concerns, and note which parts are remembered observations, interpretations, or omissions. When the next witness speaks, you can compare accounts without re-reading pages of notes.",
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
      "how-do-i-handle-players-asking-an-npc-to-tell-us-everything-you-know",
      "how-do-i-handle-divination-magic-without-letting-one-character-solve-every-mystery",
      "how-do-i-improvise-npcs-in-dnd",
    ],
    discovery: {
      id: "answer-interviewing-npcs-investigation",
      parentCluster: "investigative-horror",
      clusters: ["investigative-horror", "adventure-mapping", "session-prep"],
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
        "A witness-centred framework that separates remembered observations, interpretations, and omissions, gives essential information a reliable route without magic wording, and uses active scene goals, targeted questions, and social stakes to change quality and consequence rather than gate progress.",
      relatedIntents: [
        "answer-npc-tell-us-everything",
        "answer-run-mystery-without-railroading",
        "answer-run-investigator-without-sidelining-party",
        "answer-run-scene-multiple-npcs",
        "answer-conspiracy-campaign",
        "answer-specialist-character-spotlight",
      ],
      acknowledgedOverlap: [
        {
          with: "answer-npc-tell-us-everything",
          reason:
            "This answer covers overall witness texture, social stakes, and separating facts from interpretations; the companion answer resolves the specific table dilemma of players asking an NPC to tell them everything they know.",
        },
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
            "The multi-NPC answer structures crowded council scenes through brief friction beats and sub-scenes; this answer structures one-to-one or small-group interviews through remembered observations, interpretations, omissions, and targeted follow-ups.",
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
        "Make NPC interviews active and fallible. Separate memory, interpretation and omission, and let questions change context and consequences without relying on magic wording.",
      image:
        "https://assets.codexcryptica.com/og/how-do-i-make-interviewing-npcs-interesting-in-an-investigation.jpg",
      imageAlt:
        "Two investigators compare a watch log with a night porter during a rain-lit interview",
    },
  };
