import type { AnswerConfigInput } from "../schema";

export const howDoIRunAOneShotRpgSession: AnswerConfigInput = {
  slug: "how-do-i-run-a-one-shot-rpg-session",
  category: "running-the-game",
  publishedAt: "2026-11-04",
  question: "How do I run a one-shot RPG session?",
  kind: "how-to",
  shortAnswer:
    "Run a one-shot RPG session by treating the agreed slot as the whole story: open with a short table contract and a situation that needs a decision at once, then repeat a simple loop of describing the situation, asking what the characters do, resolving it fairly with the rules, and narrating the consequences. Share the spotlight deliberately, make plain temporary rulings instead of pausing play for research, let unexpected plans change the route, and bring the central problem to a real conclusion with time left for consequences and a brief epilogue for each character.",
  sections: [
    {
      kind: "prose",
      heading: "Start with a short table contract",
      paragraphs: [
        "Say the practical terms out loud before anyone rolls dice. Name the finish time and treat it as a hard stop, not a hope. Name the genre and tone in one sentence, restate any boundaries the group has agreed, and say how you will handle a rule nobody knows: a quick check if it takes a moment, otherwise a temporary ruling that stands for the evening and can be looked up afterwards.",
        "Introduce pre-generated characters, or characters made for this premise, by connection rather than biography. Each player needs a name, one thing their character is good at, and one reason they care about another character or about the problem in front of them. That takes minutes. Save longer histories for a campaign. If you are still deciding what to prepare before the players arrive, [How do I prepare an RPG session step by step?](/answers/how-do-i-prepare-an-rpg-session-step-by-step) covers that work. This page starts when everyone is seated.",
      ],
    },
    {
      kind: "prose",
      heading: "Open in the situation, not in a briefing",
      paragraphs: [
        "Give one evocative sentence, one problem the characters can act on, and one decision that cannot wait. Skip shopping, travel for its own sake, and introductions in a tavern where nothing is at stake. Players learn the premise faster by responding to it than by listening to it.",
        "A usable opening sounds like this: the rain has cut the coast road, the watchtower signal lamp has gone dark, and someone is tapping a plea for help from the top window while figures move around the ground floor. What do you do? The group already knows where they are, why it matters, and that waiting has a cost. They do not yet know who holds the tower, and finding out is play rather than exposition.",
      ],
    },
    {
      kind: "list",
      heading: "Use one repeatable loop for every scene",
      intro:
        "Most of a one-shot runs on the same four moves, whatever the system. Repeat them until the central problem is resolved:",
      items: [
        {
          term: "Describe the situation",
          text: "Say what the characters can see, hear and smell, what is changing, and what will happen if nobody acts. Keep it to the facts a character could act on.",
        },
        {
          term: "Ask what they do",
          text: "Put the question to a named player or to the group, and wait for an intention before you ask for a roll. A clear intention makes the stakes and the method obvious.",
        },
        {
          term: "Resolve it fairly",
          text: "Use the system procedure that fits the intention. State the stakes before the dice land, so a success, a partial success and a failure all have an agreed meaning.",
        },
        {
          term: "Narrate the consequence and ask again",
          text: "Show how the world changed, including the cost when there is one, then describe the new situation. Play has moved even when the characters have not got what they wanted.",
        },
      ],
      outro:
        "When you are unsure what to do next, return to the loop. Describe, ask, resolve, narrate. A stall usually means the players lack a visible stake or a readable option, and the next description can supply one of those without taking the decision away from them.",
    },
    {
      kind: "list",
      heading: "Share the spotlight on purpose",
      intro:
        "In a single evening nobody gets a later session in which to shine, so distribute attention during this one:",
      items: [
        {
          term: "Invite, do not ambush",
          text: "Ask a quieter player for an opportunity rather than an answer. Try: your character is closest to the door, what catches your eye, or your character grew up on this coast, what would they know about the tower stairs? The player can offer a detail, ask a question, or pass, and each of those keeps them in the scene.",
        },
        {
          term: "Give each character one decision that matters",
          text: "Note, even mentally, who has changed the fiction so far. Before the finale, make sure every character has made at least one choice whose result the group can still see, whether that is a route chosen, a promise made, or a risk taken.",
        },
        {
          term: "Steer a dominant player sideways",
          text: "Thank them for the plan, then ask who is carrying it out and what the others are doing while it happens. Most takeovers shrink once the camera moves, because the plan itself needs hands elsewhere.",
        },
        {
          term: "Handle a split party by cutting between groups",
          text: "Run a few minutes with one group, stop on a tense moment, and cut to the other. Keep each cut short, let information travel only when a character could carry it, and reunite the party before the finale unless the system handles separated scenes well.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Keep the rules under the fiction",
      paragraphs: [
        "Teach each rule at the moment it is first needed, in one sentence, and then use it. A new player does not need the grappling rules during the opening scene on the cliff path. When a rule is unclear, say what you are doing plainly: I do not remember the exact wording, so tonight a fall from this height costs you your next action rather than damage, and we will check it after the game. Write the ruling down if it may come up again, and apply it the same way for characters and opponents alike.",
        "Some moments do need exact resolution. Use the full procedure where the result decides the ending, where a character might die or be removed from play, or where the table is arguing about what happened. Speed up everywhere else. This balance shifts with the group. Beginners need fewer procedures explained more slowly, and benefit from being told what a roll can and cannot change before they make it. A table that knows the system well may want the exact rule for a clever combination they have built a plan around, and giving it to them is respect for their preparation rather than pedantry. Tactical games also repay precision in combat, because position and action order carry the decision. Rules-light and investigative games usually repay the opposite: settle what the characters learn, charge a cost in time, noise or safety, and move on before the deduction goes cold.",
      ],
    },
    {
      kind: "list",
      heading: "Answer unexpected plans with consequences, not refusal",
      intro:
        "Players will ignore the door you prepared. That is the game working, so respond to the plan they actually made:",
      items: [
        {
          term: "Support a workable alternative",
          text: "If the approach could succeed, set its stakes and resolve it, even when it skips a scene you liked. A rescued captive reached by the roof is still rescued, and the skipped guard post can matter later as an alarm that was never raised.",
        },
        {
          term: "Move essential information, keep the choice real",
          text: "If the party never visits the harbour office, the harbourmaster's warning can arrive as a note on a captured smuggler or as something a rescued prisoner overheard. Move the fact, not the decision: the players still chose their route, and the route still changes what the information costs them.",
        },
        {
          term: "Let failure change the situation instead of ending it",
          text: "A failed roll should rarely mean nothing happens. It can mean the thing works slowly, noisily, at a price, or with a new problem attached. Reserve a flat stop for actions that were impossible from the start, and say so before the roll rather than after it.",
        },
        {
          term: "Avoid a fixed scene order",
          text: "Hold your material as places, people and pressures rather than as a sequence. If the party reaches the finale early by a route you did not expect, run the finale early and let the unused scenes go. An ending that arrives while the table still has energy beats a complete tour of your notes.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Keep tension visible and the session moving",
      paragraphs: [
        "When discussion circles, change the situation rather than repeating the question. A patrol turns the corner, the tide covers the causeway, the captive starts shouting, or the signal lamp flares and goes out again. A change the characters can react to restarts the loop. Keep the stakes where players can see them: say what the smugglers are trying to do, what the rising water will cut off, and roughly how long the characters have, in fictional terms they can plan around.",
        "Use optional scenes only when they offer a decision the party wants. Cut transitions, not choices: narrate the climb down and start at the boathouse door. Check the clock at natural breaks and adjust early, while you still have scenes you can shorten. [How do I pace an RPG one-shot?](/answers/how-do-i-pace-an-rpg-one-shot) gives the time budgets, halfway checkpoint and cutting order for that adjustment, and [How do you write a one-shot adventure?](/answers/how-do-you-write-a-one-shot-adventure) covers building the scenario itself. Read together, the three pages run plan, pace and play in that order.",
      ],
    },
    {
      kind: "example",
      heading: "Worked example: The dark watchtower",
      paragraphs: [
        "A storm has cut the coast road. Four pre-generated characters, a coastwise scout, a former signal keeper, a strong ferryman and a novice healer, have reached the headland because the watchtower lamp that guides boats through the reef has gone dark. The keeper's assistant, Mirel, is trapped in the lamp room. Smugglers below mean to keep the lamp dark until a laden ship wrecks on the reef, then salvage the cargo. Success means Mirel safe and the lamp lit before the ship arrives. A compromise might light the lamp but let the smugglers escape, or free Mirel while the ship still runs aground. Failure means the wreck happens and the group must answer for a dark tower. The Game Master (GM) runs it as follows.",
      ],
      items: [
        {
          term: "The sixty-second opening",
          text: "The GM states the finish time, the tone, and the rule for unknown rules, then says: rain is coming off the sea in sheets. The tower above you is dark for the first time in twenty years, and a ship's bell is ringing somewhere out in the murk. From the top window, faint and regular, comes a tapping: three taps, a pause, three taps. Below, lamplight spills once from the ground floor door and is shut off. What do you do? Play starts with a decision, and the tapping gives the group a fact to act on.",
        },
        {
          term: "A quieter player gets a real choice",
          text: "Two players debate forcing the door. The GM turns to the healer's player, who has not spoken: your character notices the tapping changes when the wind drops. What do you make of it? The player suggests Mirel is counting the smugglers as they pass the stairs. The GM accepts the reading and confirms the pattern tells the party when the stair is clear. The healer now holds information the plan depends on, offered as an observation rather than demanded as a performance.",
        },
        {
          term: "An unexpected approach",
          text: "Instead of the stairs, the scout proposes climbing the outside wall to the lamp room while the ferryman rows the smugglers' own boat out and strands them. The GM had prepared a fight on the stairs and drops it without comment. Both plans can work, so the GM sets stakes for each: the climb is quiet but exposed, and the boat can be taken only if its guard is distracted. The party splits the work, and the skipped stair fight becomes a risk that returns if either group raises the alarm.",
        },
        {
          term: "A setback that is not a dead end",
          text: "Halfway up, the scout's roll fails. The GM had stated the stake before the roll: a failure means being seen or losing time, not falling to certain death on a first mistake. The scout slips to a ledge, a shutter bangs, and the lamp room door below opens as a smuggler comes to look. The climb still stands, the smugglers are now alert, and the ferryman must move at once or lose the boat. The failure cost time and secrecy, which are the currencies a one-shot can spend.",
        },
        {
          term: "An earned finale",
          text: "With the alarm half raised, the group converges on the lamp rather than on a last fight. The former signal keeper relights it under pressure, the healer talks Mirel down from the window ledge where she hid, and the scout and ferryman hold the stair door for the minutes the lamp needs to catch. Whether the ship turns in time depends on how much time the earlier setback cost, which the GM states openly before the final roll.",
        },
        {
          term: "Epilogue in three versions",
          text: "Success: the ship alters course, Mirel names the smugglers to the harbour watch, and each player adds one sentence about what their character does at dawn. Compromise: the lamp lights but the smugglers slip away in the confusion, so the tower is safe and the coast is not. Failure: the ship grounds on the reef, the finale becomes a rescue in the surf, and the epilogue deals with who the characters saved and what they tell the inquiry. Each version ends the story the table actually played, and none of them needs extra scenes invented to fill time.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "End the situation, then close the table",
      paragraphs: [
        "A one-shot is finished when the central problem has been settled, not when every corridor has been searched. Watch for the moment the players' choices have decided the outcome, then resist adding one more obstacle to use up prepared material. Leave enough of the slot for consequences: what the rescued person does, what the antagonists get away with, and what changes in the place the party leaves behind. A final combat is one way to settle a problem. It is a poor default when negotiation, a chase, a rescue under pressure or a public exposure would settle it faster and fit the choices already made.",
        "Close by giving each character a short final beat. Ask each player for one image of their character after the events: an hour later, the next morning, or a year on. Then step out of the fiction. Thank the table, ask briefly what landed and what dragged, and note any temporary ruling you promised to check. Offer a continuation only if the group asks for one. A one-shot that ends cleanly is a success in its own right, and the offer of more should be an invitation rather than an apology for stopping.",
      ],
    },
    {
      kind: "checklist",
      heading: "During-play cheat sheet",
      intro:
        "Keep this beside your notes and use it when you are unsure what to do next:",
      items: [
        "State the immediate situation in facts the characters can act on, then ask what they do.",
        "Offer a quieter player an observation or opportunity to respond to, not an answer they must produce.",
        "When play stalls, introduce a change with consequences instead of repeating the question.",
        "When players seem confused, clarify the stakes and the readable options, then let them choose.",
        "When you are behind time, skip transitions and travel, and protect the choices that decide the ending.",
        "In the last stretch, bring the separate threads back to the central conflict and resolve that conflict.",
        "Finish with consequences for the place and people involved, one closing beat per character, and a short word of thanks and debrief.",
      ],
    },
  ],
  relatedAnswers: [
    "how-do-i-pace-an-rpg-one-shot",
    "how-do-you-write-a-one-shot-adventure",
    "how-do-i-prepare-an-rpg-session-step-by-step",
    "how-do-you-handle-players-going-off-script-as-a-gm",
    "how-do-i-give-specialist-characters-spotlight",
    "how-do-i-start-gming-for-the-first-time",
  ],
  discovery: {
    id: "answer-run-one-shot-rpg-session",
    parentCluster: "session-prep",
    clusters: ["session-prep", "adventure-mapping"],
    primaryIntent: "how to run a one shot rpg session",
    intentAliases: [
      "how to run a one shot",
      "one shot dm tips",
      "running a one shot rpg",
      "gm a one shot for beginners",
      "how to gm a one-shot session",
      "running a single session rpg at the table",
    ],
    userJob: "adopt-workflow",
    uniqueValue:
      "Teaches Game Masters to facilitate a one-shot live at the table, from the opening contract and first decision through spotlight sharing, temporary rulings, unexpected plans and a complete ending with epilogues, using a repeatable describe, ask, resolve and narrate loop.",
    acknowledgedOverlap: [
      {
        with: "answer-pace-rpg-one-shot",
        reason:
          "The pacing answer budgets table time backwards from the hard stop with checkpoints and a cutting order; this answer covers live facilitation, adjudication and closing the table, and links to the pacing budgets instead of repeating them.",
      },
      {
        with: "answer-write-one-shot-adventure",
        reason:
          "The writing answer designs the scenario before play with a four-beat structure; this answer assumes a scenario exists and teaches how to facilitate it at the table.",
      },
      {
        with: "answer-prepare-session-step-by-step",
        reason:
          "The step-by-step answer covers preparation before the session for ongoing play; this answer starts at the table opening and covers during-play decisions through the epilogue.",
      },
    ],
    relatedIntents: [
      "answer-pace-rpg-one-shot",
      "answer-write-one-shot-adventure",
      "answer-prepare-session-step-by-step",
    ],
  },
  seo: {
    title: "How Do I Run a One-Shot RPG Session? | Codex Cryptica",
    description:
      "Run a one-shot RPG session from the first decision to the epilogue: a repeatable GM loop, spotlight sharing, plain rulings, fail-forward setbacks and a live cheat sheet.",
    image:
      "https://assets.codexcryptica.com/og/how-do-i-run-a-one-shot-rpg-session.jpg",
    imageAlt:
      "Adventurers in wool cloaks approaching a dark coastal watchtower in rain at twilight, with a figure waving from a lit upper window",
  },
};
