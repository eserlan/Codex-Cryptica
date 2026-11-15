import type { AnswerConfigInput } from "../schema";

export const howDoIGetAStalledRpgInvestigationMovingAgain: AnswerConfigInput = {
  slug: "how-do-i-get-a-stalled-rpg-investigation-moving-again",
  category: "running-the-game",
  publishedAt: "2026-11-15",
  question: "How do I get a stalled RPG investigation moving again?",
  kind: "how-to",
  shortAnswer:
    "Pause and separate what the party has established from what it has only guessed, then restore one actionable lead through the fiction. Recap the facts the characters know, ask what the players want to test, and let a witness, a record or a suspect's next move create a fair opening they can choose to pursue. Do not rewrite the truth to match a wrong theory, and do not send in a non-player character to announce the solution.",
  sections: [
    {
      kind: "prose",
      heading: "A stall means the next action has gone missing",
      paragraphs: [
        "Players can argue about theories for a long time and still be playing well. The stall begins when nobody at the table can name a person to question, a place to check or a test to run. At that point, more hints about the culprit rarely help. The party needs a lead it can act on, in language it recognises as available.",
        "Your job as Game Master (GM) in the next few minutes is diagnostic. Work out why the next action disappeared, repair only that problem, and hand the choice back. Keep any talk of better mystery design for after the session. This page is about recovery during play.",
      ],
      cta: {
        text: "Read how to design a mystery that resists stalling",
        href: "/answers/how-do-you-run-a-mystery-without-railroading",
      },
    },
    {
      kind: "list",
      heading: "Diagnose the blockage before you add anything",
      intro:
        "These blockages look alike from behind the screen, but each one asks for a different response. Check them against the clues as the players actually received them, not as they read in your notes:",
      items: [
        {
          term: "A clue was missed",
          text: "The party never visited the place, never opened the record or failed the check you placed in front of it. They cannot use evidence they never received. Give that evidence another honest route into play, or accept that the route is closed and work from what remains.",
        },
        {
          term: "A clue was misunderstood",
          text: "The players have the fact but read it differently from you, often because a term, a custom or a piece of setting knowledge means something else to them. Clarify what their characters would understand, then let them redraw their own conclusion.",
        },
        {
          term: "A detail has been forgotten",
          text: "The fact was given clearly, perhaps several sessions ago, and nobody wrote it down. Remind the table of what the characters know. A short recap is fair play, not a correction and not a hint about what matters.",
        },
        {
          term: "A fair but wrong theory has taken hold",
          text: "The established evidence permits the party's reading and nothing they have fairly seen rules it out. Do not punish the reasoning. Offer a test that could distinguish the two readings and let the result do the work.",
        },
        {
          term: "No next action is visible",
          text: "The party may have plenty of evidence and still believe every witness has been exhausted and every door is shut. The blockage is presentational. Restate the leads they already hold in plain terms and name the ones they have not yet followed.",
        },
        {
          term: "A lead is being deliberately ignored",
          text: "Sometimes the party has weighed a lead and chosen something else, because it looks dangerous, dull or morally costly. That is a choice, not a stall. Let the world respond to the choice they made instead of dragging them back to the lead they declined.",
        },
      ],
      outro:
        "Only the first three need you to repair information. The fourth needs a fair test, the fifth needs clarity, and the sixth needs you to respect the decision and play what follows from it.",
    },
    {
      kind: "list",
      heading: "Separate established facts from working theories",
      intro:
        "Before you intervene, sort the case into four piles, on paper if the argument has been running a while:",
      items: [
        {
          term: "Established facts",
          text: "What the party found, where they found it, and what a witness actually said. These stay fixed. Do not soften a witness statement or reinterpret a physical trace later to suit the plot you wanted.",
        },
        {
          term: "Possible interpretations",
          text: "What those facts might mean, including readings you had not considered. Hold more than one at once while the evidence permits it, and note what would tell them apart.",
        },
        {
          term: "Missing evidence",
          text: "What nobody has yet had a fair chance to learn. Distinguish a gap the party can still investigate from a gap you created by placing the only copy of a fact behind a failed roll.",
        },
        {
          term: "A theory treated as a fact",
          text: "The point where discussion usually hardens. If the plan depends on a suspect being guilty, ask what established fact supports that and what test could still prove the party wrong.",
        },
      ],
    },
    {
      kind: "list",
      heading: "A five-minute recovery procedure",
      intro:
        "Take a short pause, then work through these steps in order. Stop as soon as the party has a next action it wants to take:",
      ordered: true,
      items: [
        {
          text: "Restate the established facts in two or three sentences, and label the current theory as a theory. Use the party's own findings, not your notes.",
        },
        {
          text: 'Ask what the players want to test. Try: "What would change your mind about the miller?" or "Which part of that theory are you least sure of?" Their answer tells you which test would actually help.',
        },
        {
          text: "Make the available leads plain. Name the witnesses not yet questioned, the records not yet checked and the places not yet visited, without ranking them or steering towards one.",
        },
        {
          text: "Provide one fair opening in the fiction if no lead is live: a witness who approaches for their own reason, a consequence that has become visible, or a suspect doing the next thing their plan requires. Keep it actionable rather than explanatory.",
        },
        {
          text: "Advance a suspect or witness only when their own motives and the elapsed time make it plausible, and show the party something it can observe, follow or question.",
        },
        {
          text: "End the pause by asking what the party does next, and accept the answer. If they set the new opening aside, play the consequences of the course they chose.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Reintroduce evidence honestly",
      intro:
        "A missed clue can return to play without the world bending to rescue the plot. Use a route that follows from people, places and consequences already established:",
      items: [
        {
          term: "An independent source",
          text: "The same fact recorded elsewhere: a toll ledger that repeats what a gate guard saw, a copy of a letter, a second witness to the same event. The source must have its own reason to exist, and it should confirm the fact, not interpret it for the party.",
        },
        {
          term: "A new chance to observe consequences",
          text: "Evidence leaves effects that keep happening: grain keeps going missing, a wounded accomplice still needs a healer, a forged signature has to be used again. Let the party encounter the effect and trace it back themselves.",
        },
        {
          term: "A witness who approaches for their own reasons",
          text: "Someone comes forward because they are frightened, want payment, have quarrelled with the culprit or need the party's help with a problem of their own. They bring one fact and their own view of it. They do not arrive carrying the whole case.",
        },
        {
          term: "A suspect's necessary next step",
          text: "Most plans require the culprit to move, hide, sell, silence or flee something. That step creates fresh traces the party can find. This is often the strongest route back, because the evidence appears whether or not the party goes looking for it.",
        },
      ],
      outro:
        "Never change what actually happened to reward an incorrect guess, and never relocate a clue so that it appears wherever the party happens to look next. Players notice both, and the deductions they made earlier stop feeling worth making.",
    },
    {
      kind: "table",
      heading: "Give suspects an agenda, not a timer",
      headers: [
        "Suspect",
        "Agenda and next credible action",
        "Trigger",
        "What the party can observe",
      ],
      rows: [
        [
          "The culprit",
          "Move or sell what the crime gained them before it can be traced",
          "A buyer arrives, a pass is about to close with snow, or a search is announced",
          "Fresh cart tracks, a hired porter, an item offered for sale in the wrong place",
        ],
        [
          "An accomplice",
          "Distance themselves once the risk grows, by leaving, confessing in part or destroying one item",
          "News that the party has questioned someone nearby",
          "A packed bag, a burned letter, a sudden willingness to talk about one detail only",
        ],
        [
          "An innocent suspect",
          "Protect their own secret, which is unrelated to the crime but looks bad",
          "The party's questions come close to that secret",
          "Evasive answers on one topic, plain dealing on everything else, a verifiable alibi for the night itself",
        ],
        [
          "A witness staying silent",
          "Wait until speaking is safer than silence",
          "The culprit threatens them, or the party offers protection they believe",
          "Hints that they know the routine of a place, requests to meet somewhere private",
        ],
      ],
    },
    {
      kind: "prose",
      heading: "Let time pressure come from the fiction",
      paragraphs: [
        "Time should advance because people in the fiction have reasons to act, not because the discussion at the table has lasted long enough to earn a penalty. Thoughtful debate is part of investigation play. If nobody is pursuing the culprit, the culprit still has a plan, and its next step is a fair consequence. If the party is actively working the case, do not manufacture a deadline to hurry them off a theory they are enjoying testing.",
        "When you do advance someone, state the trigger plainly to yourself before you describe anything: who acted, why now, and what trace it leaves. If you cannot answer those three, the move is a punishment in disguise. Wait, or use a plainer opening from the recovery procedure above.",
      ],
    },
    {
      kind: "list",
      heading: "Know which kind of mystery you are running",
      intro:
        "Recovery works differently depending on where the truth of the case lives. Be clear with yourself, and with the table, about which model you agreed to:",
      items: [
        {
          term: "Fixed-truth mystery",
          text: "You, or a published scenario, settled what happened before play began. This person did it, for this reason, and the clues are evidence of it. The party may reach the truth by routes you never planned, but the truth does not move to meet their best guess. Recovery means restoring a fair route to evidence, never adopting the wrong theory to end an awkward silence.",
        },
        {
          term: "Emergent-solution mystery",
          text: "Some games build the answer at the table. In Brindlewood Bay, the players assemble open-ended clues into a theory and roll the Theorize move, which can establish their solution as what happened. There, accepting the party's theory is the written procedure, not a rescue. No culprit was fixed in advance, so nothing has been secretly rewritten.",
        },
        {
          term: "The middle ground",
          text: "Many home campaigns fix the central crime and improvise motives, accomplices and fallout around it. Keep track of which layer is which. A wrong theory can create a copycat, a rival investigator or a suspect with a real but separate secret, without becoming the answer to the original crime.",
        },
      ],
      outro:
        "Do not substitute one model for the other in secret mid-case. If the table would rather play the emergent kind, agree that openly between sessions and adopt a game or procedure that supports it.",
    },
    {
      kind: "example",
      heading: "Worked example: a murder in a mountain village",
      paragraphs: [
        "Odo the miller has been found dead by his mill race. Your fixed truth: Bram the charcoal burner killed him after Odo discovered that Bram had been stealing winter grain from the mill store and selling it down the valley. The village has six locations the party can work: the mill, the inn, the chapel, the smithy, Bram's charcoal camp in the pines, and the toll bridge on the valley road. Two hours into the session, the party is still debating. Here is how the stall formed, and two honest ways out of it.",
      ],
      items: [
        {
          term: "The two missed clues",
          text: "At the mill, the party examined the body and the race but never searched the store, so they missed the split grain sack dusted with charcoal. At the toll bridge, they asked the keeper about strangers but never asked to see the toll ledger, which records Bram's cart crossing before dawn on the night Odo died. Neither clue is available to them, and neither failure was a choice: one room went unsearched and one question went unasked.",
        },
        {
          term: "The false theory",
          text: "The party has settled on Ivo the bell-ringer. Odo argued with him about the chapel tithe in front of witnesses, and rope fibre on Odo's coat matches the bell rope. The fibre is there because Ivo helped lift the body from the race, which the smith mentioned once, early, and nobody wrote down. The theory is fair on the evidence as received. Correcting it by announcement would teach the party to stop reasoning.",
        },
        {
          term: "What not to do",
          text: "The headman does not arrive at the inn, announce that Bram has confessed to him in private, and ask the party to make the arrest. Nobody has a new decision to make, Ivo is cleared by decree rather than by evidence, and the two hours of deduction turn out to have been waiting for you to speak. The same failure in smaller form: an unnamed shepherd appears, says he saw everything, and leaves.",
        },
        {
          term: "Route one: a witness with his own errand",
          text: "The goatherd comes down from the high pasture because two of his goats have strayed towards the charcoal camp and Bram drove them off roughly, which is unlike him. While asking the party's help, he mentions that Bram's kiln has been smoking at night, although charcoal burners in this valley burn by day so the smoke can be watched. The party now has observable things to test: the kiln, the camp, and the split sack still waiting in the mill store if they think to look. The goatherd knows nothing about a murder and will say so.",
        },
        {
          term: "Route two: the culprit's next necessary step",
          text: "Bram still holds stolen grain and the pass will close with the next snow. He hires two porters at the inn to move sacks to the toll bridge at first light, paying in coin he should not have. The porters talk, because porters do. The party can watch the yard, follow the sacks, check the mill brand stamped on them, or question the toll keeper again, this time with a reason to ask about carts. Each option tests the Ivo theory against the world rather than replacing it: the tithe argument stays real, and the party still has to explain the rope fibre before its case holds together.",
        },
        {
          term: "How the recovery ends",
          text: "Either route returns a next action the party chose for itself. If the players instead decide to arrest Ivo tonight, make the cost of that plain, that he helped lift the body and has not yet been asked about that morning, and then respect the decision if they proceed. The case continues through the ledger, the sacks and Bram's movements. It does not continue through Ivo gasping a name he never knew.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "At-table quick reference",
      intro:
        "Keep this beside your notes. Sample prompts are included in the wording the table hears:",
      items: [
        '"Here is what you have established, and here is the theory built on it." Recap facts only, and label the theory as a theory.',
        '"What would change your mind, and how could you test that?" Let the answer choose your next opening.',
        '"These leads are still open: the ledger, the camp, the smith." Name unvisited places, unchecked records and unquestioned witnesses without ranking them.',
        "Check which blockage you have: missed, misunderstood or forgotten evidence, a fair wrong theory, no visible next action, or a lead the party has deliberately declined.",
        "Bring one fair opening into the fiction: an independent source, a visible consequence, a witness with their own errand, or a suspect's necessary next step.",
        '"You have never asked him about that night. Do you want to before you act?" State what an irreversible step would close off, without revealing the answer.',
        "If the party proceeds on a wrong theory with the costs in view, let the consequences stand and do not rewrite the culprit.",
        "Note the clue the party never received, and give its fact a second route in the next case you prepare.",
      ],
    },
  ],
  systemsThatSupportThis: [
    {
      system: "Brindlewood Bay",
      rationale:
        "The Theorize move lets players assemble open-ended clues into a proposed solution and roll to establish whether it becomes what happened, which makes it an emergent-solution procedure rather than a fixed culprit to recover.",
      href: "https://www.gauntlet-rpg.com/brindlewood-bay.html",
    },
    {
      system: "GUMSHOE",
      rationale:
        "Investigative abilities deliver core clues without a roll when used in a relevant scene, so a stall is more often about interpretation and next actions than about evidence that never reached the table.",
      href: "https://pelgranepress.com/gumshoe/files/GUMSHOE%20SRD%20CC%20version.pdf",
    },
  ],
  codexConnection: {
    heading: "Keep the case sorted while you recover it",
    paragraphs: [
      "A stall is easier to diagnose when you can see, at a glance, which clues the party has established, which links are only their current theory, and which witnesses have not yet been questioned. That view is what the four piles above are for.",
      "Codex Cryptica's knowledge graph suits that record during a live case: connect evidence, people and places, mark which links are confirmed and which are the party's reading, and the next open lead is visible before the debate hardens.",
    ],
    linkText: "Map clues and suspects in Codex Cryptica",
    href: "/solutions/rpg-knowledge-graph",
  },
  relatedTools: [
    {
      title: "Mystery and investigation generator",
      description:
        "Build a fair case with a fixed truth, distinct suspects, testable clues and several independent leads before the session starts.",
      href: "/generators/mystery-investigation",
    },
  ],
  relatedAnswers: [
    "how-do-you-run-a-mystery-without-railroading",
    "how-do-you-handle-players-reaching-the-wrong-conclusion-in-an-rpg-mystery",
    "how-do-i-make-interviewing-npcs-interesting-in-an-investigation",
  ],
  discovery: {
    id: "answer-stalled-investigation-recovery",
    parentCluster: "adventure-mapping",
    clusters: ["adventure-mapping"],
    primaryIntent: "how do i get a stalled rpg investigation moving again",
    intentAliases: [
      "rpg investigation has stalled what to do",
      "players missed the clues rpg mystery",
      "stalled mystery session gm recovery",
      "how to restart a stuck rpg investigation",
      "players stuck on a mystery rpg",
      "mystery investigation momentum gm advice",
    ],
    userJob: "adopt-workflow",
    uniqueValue:
      "An in-play recovery procedure for a stalled investigation: diagnose whether evidence was missed, misunderstood, forgotten or fairly misread, separate established facts from theories, restore one actionable lead through a witness, record or suspect agenda, and preserve the fixed truth and player agency without an NPC solution dump. Distinct from mystery design before play and from handling a wrong conclusion that is about to become irreversible.",
    relatedIntents: [
      "answer-run-mystery-without-railroading",
      "answer-players-wrong-conclusion-mystery",
      "answer-interviewing-npcs-investigation",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-run-mystery-without-railroading",
        reason:
          "That answer covers resilient mystery structure, clue redundancy and culprit timelines designed before play; this answer covers the in-play recovery once an investigation has already stalled at the table.",
      },
      {
        with: "answer-players-wrong-conclusion-mystery",
        reason:
          "That answer covers the decision after a party has formed a plausible but wrong conclusion and may act irreversibly on it; this answer covers the wider stall, including missed and forgotten clues and the absence of any visible next action.",
      },
      {
        with: "answer-interviewing-npcs-investigation",
        reason:
          "That answer structures individual witness interviews through memory, interpretation and omission; this answer uses witnesses as one of several honest routes for restoring a lead when the whole investigation has stalled.",
      },
    ],
  },
  seo: {
    title: "Stalled RPG Investigation? Get It Moving Again | Codex Cryptica",
    description:
      "Keep RPG mysteries moving when clues are missed: diagnose the stall, reveal fair leads, advance NPC agendas, and preserve player agency.",
    image:
      "https://assets.codexcryptica.com/og/how-do-i-get-a-stalled-rpg-investigation-moving-again.jpg",
    imageAlt:
      "Investigators examine footprints by lantern light in a snow-covered mountain village while a goatherd approaches with his flock",
  },
};
