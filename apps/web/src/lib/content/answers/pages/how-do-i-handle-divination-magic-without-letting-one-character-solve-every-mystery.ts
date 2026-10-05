import type { AnswerConfigInput } from "../schema";

export const howDoIHandleDivinationMagicWithoutLettingOneCharacterSolveEveryMystery: AnswerConfigInput =
  {
    slug: "how-do-i-handle-divination-magic-without-letting-one-character-solve-every-mystery",
    category: "running-the-game",
    publishedAt: "2026-10-05",
    question:
      "How do I handle divination magic without letting one character solve every mystery?",
    kind: "framework",
    shortAnswer:
      "Let divination answer the question it was asked, then make that answer create the party's next decision. Give the caster a truthful, useful result within the spell's actual scope, keep the source's perspective and knowledge honest, and preserve consequence, proof, timing, and access as work the whole group must still do. When one fact no longer settles who ordered it, why, who is compromised, or what to do next, the caster feels powerful and the mystery stays intact.",
    sections: [
      {
        kind: "prose",
        heading: "Why divination feels like it breaks mysteries",
        paragraphs: [
          "An information spell does not bypass a mystery by being too strong. It bypasses the mystery when the adventure treats one question as the whole answer. If a single Commune, Divination, Speak with Dead, Detect Thoughts, Zone of Truth, scrying, or prophecy roll can name culprit, motive, and proof, the caster becomes the party oracle and everyone else waits to hear what was learned.",
          "GMs often respond by making answers evasive, hostile, or uselessly cryptic. The gods answer only in riddles, the dead refuse to speak plainly, every scrying shows fog. That keeps the plot moving for a session, but it teaches players that successful magic is punished. They stop using the tools their characters were built around, or they argue with the ruling, and trust at the table drops.",
          "The alternative is to keep divination honest and limited by what it can actually know. A truthful result that still leaves choices, consequences, access, proof, and timing unresolved lets the caster feel effective without closing the scenario. You do not need to weaken the spell or retcon facts to protect the mystery. You need a mystery with more than one layer and a clear policy for what each effect can and cannot provide.",
        ],
      },
      {
        kind: "list",
        heading: "Answer the question, not the whole case",
        intro:
          "Use these principles to keep divination powerful while keeping group decisions at the centre:",
        items: [
          {
            term: "Honour the ability's scope",
            text: "Give a truthful, useful answer that fits the effect as written, including its range, number of questions, save, and cost. A yes or no from Commune is reliable within the contacted source's knowledge. Speak with Dead knows what the dead person observed in life, not what the killer was thinking. Detect Thoughts reads surface thoughts of a present target, not an absent mastermind. Scrying shows a place or person, not the meaning of what is seen. When the answer is genuinely useful within that scope, players trust the ruling even when it does not solve everything.",
          },
          {
            term: "Make perspective and knowledge matter, not riddles",
            text: "Let the source be limited by what it could actually know, not by an arbitrary decision to be vague. A god may know whether a cult is involved but not which court ally is compromised, because even a higher power is not omniscient about mortal intent. A temple acolyte who died in the courtyard knows who struck them, not who paid the blade. A person compelled by Zone of Truth can be sincere and mistaken, or can refuse to answer. Keep phrasing plain. Reserve cryptic or symbolic delivery for effects where it is explicit in the ability, and keep it readable.",
          },
          {
            term: "Separate knowing from proving, reaching, and deciding",
            text: "Mystery work involves more than identification. After divination, the group still needs proof that will convince others, access to the person or place, timing before the next move, and a decision about whom to trust with what they know. A name without a witness, a document, or a way through the warded door does not resolve the case.",
          },
          {
            term: "Build mysteries with multiple layers",
            text: "Prepare at least three layers for a serious mystery: what happened, who ordered or organised it, and why it matters now. Give each layer separate evidence. If one spell reveals a layer, the other layers and the consequences of exposure still need play. No single question should invalidate the whole structure, and established facts should stay fixed once revealed rather than being quietly changed to blunt a good question.",
          },
          {
            term: "Let repeated divination cost something other than honesty",
            text: "When players ask again, keep answers truthful and track what repeated use invites: depleted spell slots, exhausted contacts, wary targets, political attention, or a source that remembers it was consulted. Change cost, time, access, and risk rather than making every second answer vague. If the same question is asked twice, the answer stays consistent unless the fictional situation has changed.",
          },
        ],
      },
      {
        kind: "list",
        heading: "A shared information loop for every divination scene",
        intro:
          "Use this sequence so the caster's result returns to the table as a group decision:",
        items: [
          {
            term: "Caster asks a meaningful question",
            text: 'Invite a specific, answerable question that ties to the prepared layers. If the question is too broad to fit the effect, narrow it with the player before resolving: for example, split "who is behind this" into what Commune or Speak with Dead can actually cover.',
          },
          {
            term: "Give a truthful answer within scope",
            text: "State the result plainly, include what the source does and does not know, and avoid adding evasive qualifications that punish a success. If the spell allows a limited number of questions, answer exactly that many and let the group plan the next one.",
          },
          {
            term: "Name what uncertainty remains",
            text: "Say aloud what is still unknown after the answer: motive, authorisation, proof, compromised ally, location, timing, or consequence. This keeps the next step visible without withholding what was earned.",
          },
          {
            term: "Turn information into a group decision or action",
            text: "Present at least two viable ways forward that need more than the caster: who to approach, what proof to secure, which door to risk, what to do with a compromised ally, or how to act before a deadline. Bring the scene back to the table so other characters can contribute access, social standing, practical knowledge, or protection.",
          },
          {
            term: "Let consequences follow what the party does with the answer",
            text: "Track who now knows the party asked, which factions react, and how the culprit's timeline changes because questions were asked. A useful answer should create new pressure, not end pressure.",
          },
        ],
      },
      {
        kind: "example",
        heading: "Worked example: murder in a temple",
        paragraphs: [
          "A priest is killed in a hillside temple the night before a relic is to be named. The party includes a cleric who can cast Speak with Dead and Commune, alongside companions who have standing with the temple, access to the town, and knowledge of local politics. The GM has prepared three layers: the attacker and method, the patron who ordered it, and the reason the temple was chosen as the stage.",
        ],
        items: [
          {
            term: "The oracle-trap version",
            text: 'The GM lets Speak with Dead name the whole conspiracy in one answer, or blocks it by ruling the dead spirit speaks only in useless riddles and Commune always answers "unclear." In the first case the rest of the party has nothing to investigate. In the second the cleric\'s prepared magic feels wasted and the group learns to stop asking. Either way one roll replaces the scene.',
          },
          {
            term: "The layered version",
            text: "Speak with Dead is allowed to be good at what it does. The dead priest identifies the masked figure who struck the blow as a temple guard, because that is what they saw. They do not know who ordered it or why, and say so plainly. Commune confirms the murder served a cult that seeks the relic, which answers whether this was a private grudge, but the contacted source does not know which patron in the town council is compromised; it offers that the party's choice of ally will be tested. The GM then names what remains: who in the council sponsored the guard, what proof the conclave will accept, how to reach the guard captain without alerting the cult, and whether to move the relic tonight. The party must interview the watch, decide whom to trust with the relic's location, and secure a witness or document that ties payment to a patron. Their questions also cost time the cult uses to schedule its next move.",
          },
          {
            term: "Why it works",
            text: "Divination is trusted and clearly useful: it reduces uncertainty about identity and involvement on the first pass, without substituting for motive, proof, access, or a choice about a potentially compromised ally. Each spell answers within its natural reach, the mystery keeps its layers, and the new information arrives early enough for the whole group to act. Consequences grow from how the party uses the answer, not from making the answer deliberately weak.",
          },
        ],
      },
      {
        kind: "prose",
        heading: "Handling the table when information magic recurs",
        paragraphs: [
          "If the same situation keeps inviting divination, keep your rulings consistent and add a visible clock. A cult that learns the temple has been questioned may move the relic, change its courier, or approach the compromised patron for cover. A temple superior who hears that Commune was used will want a report and will remember what the party promised when they borrowed sanctuary. Those pressures give repeated divination a fictional weight without making answers contradictory.",
          "Talk openly with the player about how you will run information effects: answers are truthful within scope, sources are limited by what they could know, and no single result will bypass proof, access, and consequence. That agreement preserves trust when the party asks a sharp question and the answer is strong but not final. Pair this guidance with the specialist spotlight framework for scene structure generally, and with the investigative horror and mystery structure answers when your case crosses into sustained investigation.",
        ],
      },
      {
        kind: "checklist",
        heading: "Before you run a mystery with divination at the table",
        intro:
          "Check that your preparation leaves room for good questions to succeed:",
        items: [
          "Write three layers for the mystery: act, authorisation, and reason. Note which questions touch each layer.",
          "For each expected divination effect, note its actual scope, limits, and what a truthful useful answer looks like in one sentence.",
          "Decide what each source could know based on its perspective, not on what would be most convenient to withhold.",
          "List what proof, access, trust, and timing the party still needs after a strong informational hit.",
          "Plan a consequence for asking: time passes, someone notices, attention shifts, or a faction moves. Keep the consequence proportionate.",
          "Prepare at least two group decisions that follow the likeliest answers, so the caster's result returns to the whole party.",
          "Agree with the table that established facts stay fixed and repeated answers remain consistent or change only because the world changed.",
          "Bring answers back early enough to act, so information creates play rather than closing it.",
        ],
      },
    ],
    codexConnection: {
      heading: "Keep divination answers connected to the case",
      paragraphs: [
        "When every answer changes who must be questioned, where access is needed, or which patron is still trusted, a linked record of sources, layers, and proof keeps the mystery coherent. Codex Cryptica's knowledge graph lets you attach each divination result to the entity who provided it, the layer it settled, what remains uncertain, and the decision the party made with it, so the next Commune or Speak with Dead builds on the same case rather than rewriting it.",
      ],
      linkText: "Explore the campaign manager",
      href: "/solutions/campaign-manager",
    },
    relatedTools: [
      {
        title: "RPG knowledge graph",
        description:
          "Link divination sources, layers, proof, and compromised allies so each answer builds on the same case.",
        href: "/solutions/rpg-knowledge-graph",
      },
      {
        title: "NPC generator",
        description:
          "Create temple witnesses, guards, and patrons with motives and ties to the relic.",
        href: "/generators/npc",
      },
    ],
    relatedForPages: [
      {
        title: "Codex Cryptica for Fantasy Worldbuilding",
        description:
          "Organise temples, relics, courts, and cults in one connected workspace for a fantasy campaign.",
        href: "/for/fantasy-worldbuilding",
      },
      {
        title: "Codex Cryptica for Dungeons & Dragons",
        description:
          "Track mysteries, spell sources, and faction consequences across a connected fantasy world.",
        href: "/for/dungeons-and-dragons",
      },
    ],
    relatedAnswers: [
      "how-do-i-give-specialist-characters-spotlight",
      "how-do-i-run-an-investigator-without-sidelining-the-party",
      "how-do-you-run-a-mystery-without-railroading",
      "how-do-i-run-character-roles-in-an-investigative-horror-rpg",
      "how-do-you-run-a-conspiracy-campaign",
      "how-do-i-run-common-character-roles-in-a-fantasy-rpg",
      "how-do-you-run-factions-in-a-sandbox-campaign",
      "how-do-i-handle-players-asking-an-npc-to-tell-us-everything-you-know",
      "how-do-i-make-interviewing-npcs-interesting-in-an-investigation",
    ],
    discovery: {
      id: "answer-handle-divination-magic-without-solving-every-mystery",
      parentCluster: "specialist-roles",
      clusters: ["specialist-roles", "adventure-mapping"],
      primaryIntent:
        "how to handle divination magic without letting one character solve every mystery",
      intentAliases: [
        "how to run divination spells without breaking mysteries",
        "how to stop commune speak with dead scrying from solving the plot",
        "divination magic mystery tabletop rpg",
        "how to adjudicate divination in dnd mysteries",
        "handling prophecy and zone of truth in investigations",
      ],
      userJob: "adopt-workflow",
      uniqueValue:
        "A fantasy specialist-role framework that keeps divination truthful and useful within scope while preserving mystery structure through layers, proof, access, and group decisions, with a reusable information loop and temple murder worked example.",
      relatedIntents: [
        "answer-specialist-character-spotlight",
        "answer-run-investigator-without-sidelining-party",
        "answer-run-mystery-without-railroading",
        "answer-investigative-horror-system-selection",
        "answer-conspiracy-campaign",
      ],
      acknowledgedOverlap: [
        {
          with: "answer-specialist-character-spotlight",
          reason:
            "The spotlight answer gives general scene structures for any specialist; this answer applies that goal to information magic and mystery structure, with spell-scope and source-perspective guidance.",
        },
        {
          with: "answer-run-investigator-without-sidelining-party",
          reason:
            "The investigator answer distributes clue discovery and interpretation across the party; this answer focuses on divination effects that reveal information directly, keeping results honest and routing consequences and proof back to the group.",
        },
        {
          with: "answer-run-mystery-without-railroading",
          reason:
            "The mystery answer builds resilient clue networks and active culprit timelines; this answer builds layered answers and consistent rulings for divination so one truthful result does not collapse the case.",
        },
      ],
    },
    seo: {
      title:
        "Handle Divination Magic Without Solving Every Mystery | Codex Cryptica",
      description:
        "Keep divination honest and useful while protecting your mystery. Use scope, layers, proof, and group decisions to handle the spell.",
      image:
        "https://assets.codexcryptica.com/og/how-do-i-handle-divination-magic-without-letting-one-character-solve-every-mystery.jpg",
      imageAlt:
        "A cleric casts a divination ritual in a temple while companions examine evidence and question a witness",
    },
  };
