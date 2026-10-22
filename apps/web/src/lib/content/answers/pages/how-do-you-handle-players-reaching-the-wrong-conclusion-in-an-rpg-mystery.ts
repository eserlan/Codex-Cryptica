import type { AnswerConfigInput } from "../schema";

export const howDoYouHandlePlayersReachingTheWrongConclusionInAnRpgMystery: AnswerConfigInput =
  {
    slug: "how-do-you-handle-players-reaching-the-wrong-conclusion-in-an-rpg-mystery",
    category: "running-the-game",
    publishedAt: "2026-10-21",
    question:
      "How do you handle players reaching the wrong conclusion in an RPG mystery?",
    kind: "framework",
    shortAnswer:
      "When players reach a reasonable but incorrect conclusion, do not automatically correct them or rewrite the truth. First check whether the clues you actually gave fairly support their reading. Let them test the theory, let the world respond honestly, and make the stakes of acting on it clear enough that the choice is informed. If they still act, consequences can stand, even if the original mystery becomes unsolvable. Change the underlying answer only where your table has agreed to a mystery style in which the players' theory helps establish what is true.",
    sections: [
      {
        kind: "prose",
        heading: "The players are not wrong in the way a failed roll is wrong",
        paragraphs: [
          "This problem is different from a missed clue or a poor roll. The players have listened, compared notes and reasoned from the evidence in front of them. The evidence genuinely permits more than one reading, and they have settled on the one you did not intend. Telling them they are wrong, out of character, teaches them to wait for your verdict instead of investigating.",
          "That does not mean every wrong conclusion must be protected. It means your first job is to work out what kind of wrong it is. A fair misreading, a gap in the clues you gave, and a conclusion the players reached because a session break swallowed a fact need different responses. The sections below separate those cases, then set out what you can do before an irreversible action closes the case.",
        ],
      },
      {
        kind: "list",
        heading: "Diagnose the situation before you intervene",
        intro:
          "Run through these checks in your head, or during a short break, before you add anything new. Be honest about the clues as the players received them, not as they read in your notes:",
        items: [
          {
            term: "Fair misinterpretation",
            text: "The established clues support the players' theory as well as, or nearly as well as, your intended answer, and nothing they have fairly been shown rules it out. This is genuine ambiguity. Their reasoning is sound; the world simply has not yet given them a way to tell the two readings apart. Let the theory stand as reasonable and give play a chance to distinguish it.",
          },
          {
            term: "Unclear or inadequate clue design",
            text: "Your notes contain a distinction the table never received. Perhaps the one clue that rules out the innocent suspect sat behind a failed roll, was described once in a crowded scene, or depended on a detail you improvised differently on the night. If players solve the mystery incorrectly because the discriminating evidence never reached them, the fault is in the delivery, not the deduction. Repair it with a fair route to that evidence rather than punishing the conclusion.",
          },
          {
            term: "Forgotten information",
            text: "The clue was given, clearly, weeks ago, and nobody wrote it down or remembers it. A brief, in-fiction reminder is fair here: an NPC mentions the fact again in a new context, a note resurfaces, or you recap it plainly at the start of the session. Reminding players of what their characters already know is not a correction of their theory.",
          },
          {
            term: "A player and character knowledge gap",
            text: "The characters would know something the players do not: how a guild marks its ledgers, what a priest may or may not do, how long a body takes to cool. Tell the players what their characters know, or let a relevant skill supply it. Do not let a conclusion rest on ignorance their characters would not share.",
          },
          {
            term: "An inference you assumed was obvious",
            text: "You treated a step in the reasoning as self-evident and never put its support into play. If the players cannot be expected to make that step from what they have, the theory they built instead is a reasonable response to the evidence as given. Check your own chain before you judge theirs.",
          },
        ],
        outro:
          "These factors can overlap. Repair information the characters should reasonably have received or remember; then, if the theory remains plausible, let it stand and let the players decide what to do. A delivery fault is yours to fix; their inference is still theirs.",
      },
      {
        kind: "prose",
        heading: "Keep facts distinct from deductions",
        paragraphs: [
          "Established facts are the shared record of play: what the party found, where, and what a witness actually said. Deductions are what anyone, players or non-player characters (NPCs), makes of those facts. Hold the first steady and let the second move. Do not quietly change a clue, soften a witness statement, or reinterpret a physical trace to serve the intended plot.",
          "A wrong theory can stay reasonable until new information distinguishes it from the truth: a record contradicts a date, a witness's account does not fit, or a test gives a result only one theory predicts. The party owns its deduction; you supply honest material against which to test it.",
        ],
      },
      {
        kind: "table",
        heading: "Responses a GM can choose, and what each one costs",
        headers: ["Response", "Use it when", "Trade-off to accept"],
        rows: [
          [
            "Offer a fair test or contradiction in the fiction",
            "The theory can still be checked and the discriminating evidence could plausibly come into play now",
            "The players may ignore the lead, and the new material must arise from the world as it stands, not appear the moment they err",
          ],
          [
            "Let them act and follow the fallout",
            "They have had a genuine chance to test the theory, the stakes were legible, and they chose to proceed",
            "The original solution may become unreachable and the campaign changes direction",
          ],
          [
            "Adapt the answer to fit their theory",
            "Your table has agreed to an emergent or collaborative mystery style where a strong theory can establish the truth",
            "It needs agreed procedures and must remain consistent with clues already established",
          ],
          [
            "Let the investigation fail",
            "The decisive choice was informed, the risk was clear, and your group accepts failure as a possible ending for a mystery",
            "Some players may find a closed case unsatisfying unless the consequences give them a new situation to play",
          ],
        ],
      },
      {
        kind: "prose",
        heading: "What a fair intervention looks like",
        paragraphs: [
          "A fair intervention gives the players something to do, not something to believe: a witness to interview, a record to check, a physical test, or an NPC with their own reason to dispute the accusation. Let the party pursue or set it aside; do not announce the answer or send an NPC carrying only the missing fact.",
          "Offer it before the irreversible step. Add a cost only when time pressure, limited access, or someone's motives establish one. If the test is honest, the players may correct their own conclusion.",
        ],
      },
      {
        kind: "prose",
        heading: "Handle irreversible decisions by making the finality legible",
        paragraphs: [
          "Killing a suspect, burning an archive, or making a public accusation can close routes that questioning would have left open. Before the party acts, state the likely consequences they can see: whether the witness can be questioned under the rules, whether another copy exists, or whether an accusation can be withdrawn. Do not reveal hidden stakes or hint that this NPC is too important to lose.",
          "If you ask, are you sure, clarify what the players believe will happen; do not use it as a veto. Check that they understand what evidence remains and what recovery the rules allow. If they proceed with that picture, respect the choice and use the system's procedure for uncertainty where it has one.",
        ],
      },
      {
        kind: "list",
        heading: "Decide which kind of mystery you are running",
        intro:
          "Whether you should change the mystery solution depends first on the kind of game the table agreed to play. Confusing the two models is where most bad corrections come from:",
        items: [
          {
            term: "Pre-authored mystery",
            text: "You, or a published scenario, have fixed an underlying truth: this person did it, for this reason, and the clues are evidence of it. Players may reach it by routes you never planned, and NPCs may react in ways you improvise, but the truth itself does not move to meet the loudest theory. Changing it because the party argued well converts deduction into persuasion of the GM. Their success should come from finding out, so let a wrong answer be wrong here, and let it be testable.",
          },
          {
            term: "Emergent-solution mystery",
            text: "Some games build the answer at the table. In Brindlewood Bay, for example, the players assemble clues into a theory and roll the Theorize move; a strong result can establish their solution as what happened. There, adopting the party's theory is not a rescue or a reward for confidence, it is the procedure working as written. The GM has not secretly rewritten a culprit, because no culprit was fixed in advance.",
          },
          {
            term: "The middle ground most campaigns occupy",
            text: "Many home games fix the central truth but improvise motives, minor culprits, and consequences freely. Be clear with yourself about which layer is which. You can let the players' wrong theory create a real accomplice, a copycat, or a rival investigation without making it the answer to the original crime. That honours what they noticed while keeping the established facts intact.",
          },
        ],
        outro:
          "If your group wants to move from the first model towards the second, say so between sessions and agree it openly. Changing the contract silently, mid-case, is what feels like a cheat in either direction.",
      },
      {
        kind: "example",
        heading: "Worked example: the priest, the cult, and the last witness",
        paragraphs: [
          "The party has spent three sessions investigating disappearances around a harbour shrine. They have concluded that Father Anselm, the shrine priest, leads a cult that takes victims from the night ferry, and they plan to kill him tonight in the shrine vestry. In your notes, Anselm is innocent. Worse, he is the last living witness who saw the real conspirators move a victim, and he has not yet told anyone. Work through the decision in this order.",
        ],
        items: [
          {
            term: "Check the established clues first",
            text: "List what the party actually has, from play rather than from your prep. They found Anselm's seal on a shrine storeroom manifest, heard that he argues with the ferry captain, and know he visits the docks at night. In your notes, the seal was borrowed by the harbour clerk, the argument was about unpaid burial fees, and the night visits are to give last rites at the sailors' hostel. Then ask which of those explanations the players have ever had a route to. If the only evidence that the seal was borrowed sat in a ledger they failed to open because of one poor roll, this is a clue delivery problem. Give the ledger, or another honest route to the same fact, a way back into play. If the manifest, the argument, and the visits were all described as openly as your intended reading, and a witness has already mentioned that Anselm tends the dying at the hostel, the cult theory is a fair misreading and you should not correct it directly.",
          },
          {
            term: "Offer one fair last test, inside the fiction",
            text: "Before tonight's ambush, let something the party can act on come into view. The hostel keeper, whom Anselm visits, asks the party for help because Anselm has not come for two nights and a dying sailor is asking for him. Or the ferry captain, confronted with the accusation, laughs and says Anselm's quarrel with him is about burial money, then offers the account book to prove it. Or Anselm, if confronted openly before weapons are drawn, asks what seal they mean and points out that the clerk keeps it in the harbour office. Each option lets the players test the accusation, ask a follow-up, or watch how the accused behaves when he could still run. None of them states that he is innocent, and the party remains free to decide the keeper is lying or the book is forged.",
          },
          {
            term: "Make the stakes of the killing plain",
            text: "When they settle on the vestry ambush, describe what is observable: Anselm is unarmed, alone, and the only person at the shrine who has not yet been questioned about the night of the third disappearance. Say, in character-neutral terms, that killing Anselm ends the chance to question him while alive, and that the shrine congregation will treat an unexplained killing as murder. If the system allows speaking with or restoring the dead, that remains possible by its rules. If a player asks whether Anselm might know more, answer honestly from what the characters know: they have never asked him. That is a statement of the table's own position, not a hint about your notes. Then ask them to confirm they want to go ahead on that basis.",
          },
          {
            term: "If they proceed, let it stand",
            text: "Anselm dies without revealing what he saw, because he never understood that the men he saw loading a bound figure onto a cart were the conspirators; he thought they were press-gangers and kept quiet from fear. Do not have him gasp a name with his last breath unless that fits what he knows and would say. The chance to question him while alive is gone; use any established means of speaking with him if the system allows it. The congregation finds the body, the city watch opens a murder investigation with the party among its suspects, and the real conspirators learn that he can no longer testify in person. The trail still runs through physical evidence, the clerk's records, and whatever the conspirators do next, emboldened.",
          },
          {
            term: "Continue without making them retroactively right",
            text: "Do not declare that Anselm was a cultist after all or invent a witness to restore his testimony. The party may cover up the killing, confess and bargain for mercy, challenge the accusation against the ferry captain, or watch the conspirators overreach. The case changes; their plan does not succeed anyway.",
          },
          {
            term: "Alternate outcome: the truth may stay unknown",
            text: "Use this branch only if earlier play has already closed the other routes: for example, a storm erased the physical trail and the clerk's only record was destroyed, and this system offers no way to question or restore the dead. Do not add those losses now to force a failure. If the party kills Anselm, the original truth may never be known. An innocent man is dead; the shrine demands accountability, the party's trust in one another may change, and the conspirators prosper. Close the case honestly and play those consequences. Continuing play does not guarantee a solved mystery.",
          },
        ],
      },
      {
        kind: "prose",
        heading: "Let a failed investigation become the next situation",
        paragraphs: [
          "A mystery that cannot be solved as posed is not automatically a campaign that has stopped. Carry forward the consequences already prepared by the fiction and assess what remains: the party may expose part of the conspiracy or stop the next disappearance, but the original truth can stay unknown. Use established corroborating sources and any recovery the rules support; do not invent either after the fact.",
        ],
      },
      {
        kind: "checklist",
        heading: "At the table: a short procedure for a wrong conclusion",
        intro:
          "Keep this beside your notes for the moment a confident theory starts driving irreversible plans:",
        items: [
          "Name the theory as the players hold it, and the action they are about to take on it.",
          "Check the clues as given in play: does established evidence fairly support their reading, or did a distinction never reach the table?",
          "If evidence was missing, unclear, or forgotten, repair its delivery directly and let the players draw their own conclusion; add a cost only when circumstances establish one.",
          "Remind players of anything their characters would know that the theory overlooks.",
          "Before an irreversible step, offer a fair in-fiction test if one fits; do not require a cost, deadline, or risk.",
          "State what the action is likely to close off, including known sources and rules-supported recovery, without revealing the correct solution.",
          "If they proceed, apply consequences according to what is actually lost; preserve established sources and rules-supported recovery, and do not invent a convenient rescue.",
          "Move play into the fallout already prepared by the fiction; later progress need not be harder unless the loss or circumstances make it so.",
          "Between sessions, note which clues the party never received and strengthen the next case's routes, rather than relitigating this one.",
        ],
      },
    ],
    systemsThatSupportThis: [
      {
        system: "Brindlewood Bay",
        rationale:
          "The Theorize move lets the players assemble open-ended clues into a proposed solution and roll, modified by the clues used, to establish whether that theory becomes what happened. It is an emergent-solution procedure, so adopting the table's theory is the rule working as written rather than a GM correction.",
        href: "https://www.gauntlet-rpg.com/brindlewood-bay.html",
      },
      {
        system: "GUMSHOE",
        rationale:
          "Investigative abilities give core clues without a roll when used in a relevant scene, which reduces wrong conclusions caused by evidence that never reached the table and keeps uncertainty on interpretation and choice rather than on whether the party may proceed.",
        href: "https://pelgranepress.com/gumshoe/files/GUMSHOE%20SRD%20CC%20version.pdf",
      },
    ],
    codexConnection: {
      heading: "Keep facts and theories in separate places",
      paragraphs: [
        "A wrong conclusion is easier to handle fairly when you can see what the party found, what they think it means, and what remains untested. Keeping each clue linked to its source, and each suspect linked to the evidence for and against them, gives you that view without deciding the theory for the players.",
        "Codex Cryptica's knowledge graph suits that record: connect evidence, witnesses, and places, and note which links are established facts and which are the party's current reading. When the party is about to act on a theory, you can check in moments what they have genuinely been shown.",
      ],
      linkText: "Map clues and suspects in Codex Cryptica",
      href: "/solutions/rpg-knowledge-graph",
    },
    relatedAnswers: [
      "how-do-you-run-a-mystery-without-railroading",
      "how-do-i-run-an-investigator-without-sidelining-the-party",
      "how-do-i-make-interviewing-npcs-interesting-in-an-investigation",
      "how-do-i-run-character-roles-in-an-investigative-horror-rpg",
      "what-rpg-should-i-play-for-investigative-horror",
      "how-do-i-handle-divination-magic-without-letting-one-character-solve-every-mystery",
      "how-do-you-handle-players-going-off-script-as-a-gm",
      "how-do-i-handle-players-asking-an-npc-to-tell-us-everything-you-know",
    ],
    discovery: {
      id: "answer-players-wrong-conclusion-mystery",
      parentCluster: "adventure-mapping",
      clusters: ["adventure-mapping", "investigative-horror"],
      primaryIntent:
        "how to handle players reaching a plausible but wrong conclusion in an rpg mystery",
      intentAliases: [
        "players solve the mystery incorrectly",
        "wrong conclusion in an rpg investigation",
        "should a gm change the mystery solution",
        "players reached the wrong conclusion rpg",
        "what if players accuse the wrong suspect rpg",
        "players wrong theory mystery gm advice",
      ],
      userJob: "adopt-workflow",
      uniqueValue:
        "A diagnostic and response procedure for the specific case where players reason fairly from the evidence to an incorrect conclusion: separate fair ambiguity from clue delivery faults, offer a testable in-fiction check before irreversible action, signal finality without revealing the answer, and carry consequences into new play without rewriting the culprit or restoring what was destroyed. Distinct from general mystery structure and anti-railroading advice.",
      relatedIntents: [
        "answer-run-mystery-without-railroading",
        "answer-run-investigator-without-sidelining-party",
        "answer-interviewing-npcs-investigation",
        "answer-character-roles-investigative-horror",
        "answer-investigative-horror-system-selection",
      ],
      acknowledgedOverlap: [
        {
          with: "answer-run-mystery-without-railroading",
          reason:
            "That answer covers resilient mystery structure, clue redundancy, and culprit timelines so investigations do not stall; this answer covers the in-play decision after a party has already formed a reasonable but incorrect theory and may act irreversibly on it.",
        },
        {
          with: "answer-run-investigator-without-sidelining-party",
          reason:
            "That answer shares clue discovery and interpretation across the party; this answer concerns the GM's response when the party's shared interpretation is wrong, including when to repair clue delivery and when to let consequences stand.",
        },
        {
          with: "answer-interviewing-npcs-investigation",
          reason:
            "That answer structures witness interviews and separates memory from interpretation; this answer uses interviews as one possible fair test before an irreversible act and focuses on diagnosing and answering a wrong party conclusion.",
        },
      ],
    },
    seo: {
      title:
        "Players Reached the Wrong Conclusion in a Mystery | Codex Cryptica",
      description:
        "Players reasoned fairly to the wrong culprit. Diagnose the clue gap, offer a fair test, signal irreversible stakes, and continue without rewriting the truth.",
      image:
        "https://assets.codexcryptica.com/og/how-do-you-handle-players-reaching-the-wrong-conclusion-in-an-rpg-mystery.jpg",
      imageAlt:
        "Investigators compare conflicting notes and a harbour manifest by lantern light while a priest walks past the docks at night",
    },
  };
