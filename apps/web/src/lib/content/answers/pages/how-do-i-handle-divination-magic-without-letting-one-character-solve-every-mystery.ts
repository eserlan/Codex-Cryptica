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
      "Let information magic answer the question it was asked, then let the players decide what to do with the result. Give them exactly the information quality the effect guarantees: do not weaken a guaranteed result or upgrade a limited effect into guaranteed truth. A spell may settle a small mystery outright; the larger situation can still leave meaningful choices about access, persuasion, timing, trust, rescue, or consequence.",
    sections: [
      {
        kind: "prose",
        heading: "Why divination feels like it breaks mysteries",
        paragraphs: [
          "This answer uses *divination* broadly for magic that gathers information, including effects from other schools such as Speak with Dead and Zone of Truth. Information magic does not break a mystery by being strong. A mystery becomes brittle when one hidden answer is the whole situation, or when the GM changes established facts to blunt a good question.",
          "GMs often respond by making answers evasive, hostile, or uselessly cryptic. The gods answer only in riddles, the dead refuse to speak plainly, every scrying shows fog. That keeps the plot moving for a session, but it teaches players that successful magic is punished. They stop using the tools their characters were built around, or they argue with the ruling, and trust at the table drops.",
          "Give the player exactly the information quality the effect guarantees. Do not weaken a guaranteed result, and do not upgrade a limited effect into guaranteed truth. Sometimes the spell should simply solve the small question or even the small mystery; that is part of the character's power. The wider situation can still ask what the party will do with what they learned.",
        ],
      },
      {
        kind: "list",
        heading: "Answer the question, not the whole case",
        intro:
          "Use these principles to honour the effect while keeping the group's decisions in play:",
        items: [
          {
            term: "Honour exactly what the effect guarantees",
            text: "Give the information quality the effect promises, including its range, questions, saves, resistance, and limits. Commune gives correct answers within the contacted deity or proxy's knowledge, with its own rule for receiving no answer after repeated castings. Speak with Dead does not guarantee truth in every situation: its answers are usually brief, cryptic, or repetitive, and a corpse has no compulsion to answer truthfully if it is antagonised or recognises the caster as an enemy. Zone of Truth prevents deliberate lies after a failed save, but a target can refuse or evade and may be sincerely mistaken. Scrying shows what its sensor can perceive; Detect Thoughts reveals thoughts the target is actually having. Do not make an effect more evasive than its rules require or erase a limitation the rules include.",
          },
          {
            term: "Separate the kinds of information magic",
            text: "For a source-query such as Commune, Divination, or Speak with Dead, ask who or what answers, what it knows, whether it must answer, whether truth is guaranteed, and what answer format the effect allows. For testimony such as Zone of Truth, check the save, whether an answer is required, whether the target can evade, and whether they could be mistaken. For observation such as Scrying or Clairvoyance, define what the sensor can perceive, what is outside its view, and whether the target can resist or detect it; seeing something does not automatically explain it. For thought-reading such as Detect Thoughts, check whether the effect reaches surface or deeper thoughts, whether the target is present, what resistance applies, and what they actually know.",
          },
          {
            term: "Build important mysteries from independent questions",
            text: "Questions might concern identity, location, method, motive, timing, allegiance, a target's next move, who can be trusted, or what happens next. What happened, who arranged it, and why it matters now is one useful pattern, not a required structure. Let a strong answer settle whatever it truly settles; established facts stay fixed when a player asks a sharp question.",
          },
          {
            term: "Ask what remains actionable",
            text: "After a revelation, the next task might be proof, access, persuasion, timing, rescue, confrontation, prevention, trust, or dealing with a consequence. Proof matters when someone must be convinced; it is irrelevant if the party only needs to choose a safe tunnel, find a monster, or rescue a captive. Do not invent a proof requirement just to keep investigation going.",
          },
          {
            term: "Use the effect's repeat-use rules first",
            text: "Established facts stay consistent. Repeated use follows the effect's own rules first; only add fictional costs when the setting or situation supports them. A ritual during a deadline costs elapsed time, and a visible rite may draw attention if observers are present. A target reacts only if the effect or established fiction gives them reason to know; a deity or patron may care if that relationship is already part of the game. Sometimes spending the spell or other stated resource is the only cost.",
          },
        ],
      },
      {
        kind: "list",
        heading: "A quick adjudication template",
        intro:
          "Before resolving a question, note the effect's limits and the information it can actually provide:",
        items: [
          {
            term: "Effect and guarantee",
            text: "What does it guarantee, and what does it not guarantee?",
          },
          {
            term: "Source, sensor, or target",
            text: "Who or what provides the information, and what can it know or perceive?",
          },
          {
            term: "Truth and compulsion",
            text: "Is truth guaranteed? Must the source or target answer?",
          },
          {
            term: "Limits and resistance",
            text: "What save, resistance, answer format, or repeated-use rule applies?",
          },
          {
            term: "Question, answer, and remaining uncertainty",
            text: "What did the player ask? What information did they gain? What genuinely remains unknown?",
          },
          {
            term: "Actions now possible",
            text: "What can the party do with this information?",
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
            text: "Invite a specific, answerable question. If it is too broad for the effect, clarify its limits with the player before resolving; do not narrow a question merely to preserve the mystery.",
          },
          {
            term: "Give the guaranteed information quality",
            text: "State the result plainly, including what the source knows or what the sensor can perceive. Do not add evasive qualifications that weaken a success, and do not promise truth if the effect does not. Follow its limits and repeat-use rules.",
          },
          {
            term: "Name what uncertainty remains",
            text: "If something remains unknown, say what it is: motive, proof, access, a compromised ally, location, timing, or consequence. Do not add uncertainty just to keep the mystery alive; sometimes the question is settled.",
          },
          {
            term: "Turn information into a group decision or action",
            text: "State the unresolved pressure clearly and let the players decide how to act on the information. Know the relevant details—where the guard is, who protects them, what happens if they are alerted, what evidence exists, or what deadline matters—then bring the scene back to the table for everyone to contribute.",
          },
          {
            term: "Apply only supported costs and consequences",
            text: "Let consequences follow the spell's rules, elapsed time, established fiction, or active opposition. A faction may advance because time passed, or an observer may notice a visible rite. Do not assume a private, undetectable, instantaneous effect alerts its target or creates backlash. The only added consequence may be spending the spell or resource.",
          },
        ],
      },
      {
        kind: "example",
        heading: "Worked example: murder in a temple",
        paragraphs: [
          "A priest is killed in a hillside temple the night before a relic is to be named. The party includes a cleric who can cast Speak with Dead and Commune, alongside companions who have standing with the temple, access to the town, and knowledge of local politics. The GM has prepared several independent questions: who struck the blow, who paid them, why the temple was chosen, where the relic is now, and what the conspirators will do next.",
        ],
        items: [
          {
            term: "The oracle-trap version",
            text: 'The GM lets Speak with Dead name the whole conspiracy in one answer, regardless of what the corpse knew or whether it would tell the truth, or blocks it by ruling the dead spirit speaks only in useless riddles and Commune always answers "unclear." In the first case the effect is being given guarantees it does not make. In the second the cleric\'s prepared magic feels wasted. Either way, the GM is ignoring what the effects actually say.',
          },
          {
            term: "The layered version",
            text: "The cleric is not antagonistic towards the priest's corpse, and the priest does not recognise them as an enemy. It answers briefly: the masked figure who struck the blow was a temple guard, whom the priest saw. It cannot say who paid the guard because it did not know. Commune confirms the murder served a cult that seeks the relic, within the contacted source's knowledge. Those answers leave questions about the patron, access to the guard captain, and whether to move the relic tonight. The GM states the unresolved pressure and lets the party choose what to do; if the ritual took time and the cult's plans were already advancing, its next move may be closer.",
          },
          {
            term: "A sharp question succeeds decisively",
            text: 'The cleric asks Commune, "Is Councillor Varro the patron who paid the guard to kill the priest?" The contacted deity knows, and answers, "Yes." Varro is now identified; the GM accepts that loss of uncertainty. The remaining play is whether to confront him, establish what evidence others will accept, protect the relic, or discover what he has already set in motion. If the party only needs to know who paid, the question is settled.',
          },
          {
            term: "Why it works",
            text: "The effects provide the information their rules allow, and the GM accepts a decisive answer when a sharp question earns one. Sometimes that solves the small mystery outright. Play continues only where the larger situation leaves something meaningful to decide; it does not need to preserve uncertainty or require proof for its own sake.",
          },
        ],
      },
      {
        kind: "prose",
        heading: "Handling the table when information magic recurs",
        paragraphs: [
          "If the same situation keeps inviting information magic, apply each effect's repeated-use rules and keep established facts consistent. Add a visible clock when events are already time-sensitive. A cult may move the relic because its plans are advancing, or a temple superior may ask for a report if they witnessed the rite or already expect one. Do not make private or undetectable magic automatically alert anyone, and do not invent backlash just because the player used a feature.",
          "Talk openly with the player about how information effects work at your table: honour their guarantees, keep sources limited by what they could know, and follow the effect's own rules. The result may be strong, final, or enough to resolve the whole question. Pair this guidance with the specialist spotlight framework for scene structure generally, and with the investigative horror and mystery structure answers when your case crosses into sustained investigation.",
        ],
      },
      {
        kind: "checklist",
        heading: "Before you run a mystery with divination at the table",
        intro:
          "Check that your preparation leaves room for good questions to succeed:",
        items: [
          "Build important mysteries from multiple independent questions, such as identity, location, method, motive, timing, allegiance, or consequence.",
          "For each expected information effect, note what it guarantees, what it does not, and the information quality a successful use provides.",
          "Decide what each source could know based on its perspective, not on what would be most convenient to withhold.",
          "Ask what is actionable after a strong answer. Proof, access, persuasion, timing, rescue, confrontation, prevention, trust, and consequence are possibilities, not mandatory requirements.",
          "Apply costs and consequences only when the effect's rules, elapsed time, established fiction, or active opposition support them.",
          "State the unresolved pressure and let the players choose their response; prepare the relevant situation, not a menu of approved actions.",
          "Keep established facts fixed and follow explicit repeated-use rules before adding fictional costs.",
          "Bring answers back early enough to act, so information creates play rather than closing it.",
        ],
      },
    ],
    codexConnection: {
      heading: "Keep divination answers connected to the case",
      paragraphs: [
        "When an answer settles one question and leaves others actionable, a linked record of sources, decisions, and open questions keeps the case coherent. Codex Cryptica's knowledge graph lets you attach each information result to its source, what it established, what remains uncertain, and the party's response, so the next Commune or Speak with Dead builds on the same case rather than rewriting it.",
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
        "A fantasy specialist-role framework for information magic that honours each effect's guarantees, lets a spell settle a mystery when it can, and returns remaining decisions to the group, with a reusable adjudication template and temple murder example.",
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
            "The investigator answer distributes clue discovery and interpretation across the party; this answer focuses on information effects, their different guarantees, and the actions that may remain after a result.",
        },
        {
          with: "answer-run-mystery-without-railroading",
          reason:
            "The mystery answer builds resilient clue networks and active culprit timelines; this answer focuses on adjudicating information effects and accepting decisive answers without requiring every mystery to remain open.",
        },
      ],
    },
    seo: {
      title:
        "Handle Divination Magic Without Solving Every Mystery | Codex Cryptica",
      description:
        "Adjudicate information magic by its actual guarantees, keep consequences grounded in rules and fiction, and let strong answers lead to meaningful choices.",
      image:
        "https://assets.codexcryptica.com/og/how-do-i-handle-divination-magic-without-letting-one-character-solve-every-mystery.jpg",
      imageAlt:
        "A cleric casts a divination ritual in a temple while companions examine evidence and question a witness",
    },
  };
