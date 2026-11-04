import type { AnswerConfigInput } from "../schema";

export const howDoIRunAOneShotRpgSession: AnswerConfigInput = {
  slug: "how-do-i-run-a-one-shot-rpg-session",
  category: "running-the-game",
  publishedAt: "2026-11-04",
  question: "How do I run a one-shot RPG session?",
  kind: "how-to",
  shortAnswer:
    "Run a one-shot by opening with a short table contract and a situation that needs a decision at once. Repeat one loop: describe what the characters can see, ask what they do, resolve it fairly, and narrate what changes. Share the spotlight deliberately, use plain temporary rulings rather than pausing for research, and let failed or unexpected attempts change the route. Bring the central problem to a conclusion within the agreed slot, leaving time for consequences and a closing beat for each character.",
  sections: [
    {
      kind: "prose",
      heading: "Start with a short table contract",
      paragraphs: [
        "Say the practical terms out loud before anyone rolls dice. Name the finish time and treat it as a hard stop, not a hope. Name the genre and tone in one sentence, restate any boundaries the group has agreed, and say how you will handle a rule nobody knows: a quick check if it takes a moment, otherwise a temporary ruling that stands for the evening and can be looked up afterwards.",
        "Introduce pre-generated characters, or characters made for this premise, by connection rather than biography. Each player needs a name, one thing their character is good at, and one reason they care about another character or about the problem in front of them. That takes minutes. Save longer histories for a campaign. If the pregens (pre-generated characters), premise brief and run sheet are not ready yet, [How do I plan a one-shot RPG session?](/answers/how-do-i-plan-a-one-shot-rpg-session) covers that preparation before anyone arrives.",
      ],
    },
    {
      kind: "prose",
      heading: "Open in the situation, not in a briefing",
      paragraphs: [
        "Give one evocative sentence, one problem the characters can act on, and one decision that cannot wait. Skip shopping, travel for its own sake, and introductions in a tavern where nothing is at stake. Players learn the premise faster by responding to it than by listening to it.",
        "A usable opening sounds like this: rain is coming sideways off the sea, the lamp at Harrow Watch is dark for the second night, and halfway up the stair the bridge ropes are hanging loose while the tide is rising over the lower steps. What do you do? The group already knows where they are, why it matters, and that waiting has a cost. They do not yet know how the keeper is hurt, and finding out is play rather than exposition.",
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
          term: "Resolve it as the system provides",
          text: "Use the procedure the game actually specifies for that intention, and roll only when that procedure calls for a roll. State before the roll what its outcome categories mean here, using the categories the system itself provides rather than assuming every game has a partial success.",
        },
        {
          term: "Narrate the consequence and ask again",
          text: "Show what changed and what did not. An attempt can fail outright without ending the evening: describe the resulting situation plainly and name the choices that remain, then ask what the characters do next.",
        },
      ],
      outro:
        "When you are unsure what to do next, return to the loop. Describe, ask, resolve, narrate. Keeping play moving is not the same as guaranteeing progress: a failed attempt may leave the problem exactly where it was, provided the players can see a different choice to make next.",
    },
    {
      kind: "list",
      heading: "Share the spotlight on purpose",
      intro:
        "In a single evening nobody gets a later session in which to shine, so distribute attention during this one:",
      items: [
        {
          term: "Invite, do not ambush",
          text: "Ask a quieter player for an opportunity rather than an answer. Try: your character is closest to the stair, you can see the keeper cannot put weight on one leg, do you want to call up and ask what happened, or stay quiet for now? The player can act on the observation, ask a question, or pass, and each of those keeps them in the scene.",
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
        "Teach each rule at the moment it is first needed, in one sentence, and then use it. A new player does not need the grappling rules during the opening scene on the cliff path. When a minor procedural point is unclear, say what you are doing plainly: I do not remember the exact wording for whether a shuttered lantern stays lit in this rain, so tonight it stays lit while it is carried under a cloak, and we will check it after the game. Write the ruling down if it may come up again, and apply it the same way for everyone. Do not use a temporary ruling to rewrite a consequential procedure, such as how falling damage or character death works. Pause and look those up, or ask the table to agree a substitute knowing what it changes.",
        "Some moments do need exact resolution. Use the full procedure where the result decides the ending, where a character might die or be removed from play, or where the table is arguing about what happened. Speed up everywhere else. This balance shifts with the group. Beginners need fewer procedures explained more slowly, and benefit from being told what a roll can and cannot change before they make it. A table that knows the system well may want the exact rule for a clever combination they have built a plan around, and giving it to them is respect for their preparation rather than pedantry. Tactical games also repay precision in combat, because position and action order carry the decision. Rules-light and investigative games usually repay the opposite: settle what the characters learn through the procedure that game provides, and move on before the deduction goes cold.",
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
          text: "If nobody questions the assistant at the tower, the fact he is hiding can still surface from the rotten bridge posts or from the logbook entry about them. Move the fact, not the decision: the players still chose their route, and the route still changes what the information costs them.",
        },
        {
          term: "Let a failure stand, then show what remains",
          text: "A failed attempt may simply fail: the bridge repair does not hold, the lock stays shut, the keeper will not be persuaded. Say so, describe the situation as it now stands, and name the other approaches still open so the group can choose a different one. Some systems provide success at a cost, and a group may agree to use that technique where its rules allow it, but treat it as that system's or that table's choice rather than a default to apply everywhere. If an action was impossible from the start, say so before any roll instead of rolling and then ruling it out.",
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
        "When discussion circles, first work out what the players need. If the stakes or the readable options are unclear, restate them. If a rule is unfamiliar, explain the part needed for this decision. If the group is weighing a genuine choice, say so and offer an honest table-time check: we have been on this for a few minutes, do you want to decide or hear the options again? Only advance a threat, such as the tide covering the lower stair or a patrol reaching the corner, when the fiction already established it: a tide track the players can see filling, a patrol route mentioned earlier, weather that has been worsening all scene. An established pressure arriving on schedule gives the group new information to react to. Inventing danger because the players paused turns deliberation itself into a trigger for punishment and overrides the clarification they may actually need. Keep the visible stakes in fictional terms they can plan around: what the rising water will cut off, and roughly how long before it does.",
        "Use optional scenes only when they offer a decision the party wants. Cut transitions, not choices: narrate the climb down and start at the boathouse door. Check the clock at natural breaks and adjust early, while you still have scenes you can shorten. [How do I pace an RPG one-shot?](/answers/how-do-i-pace-an-rpg-one-shot) gives the time budgets, halfway checkpoint and cutting order for that adjustment, and [How do you write a one-shot adventure?](/answers/how-do-you-write-a-one-shot-adventure) covers building the scenario itself. Read together with [How do I plan a one-shot RPG session?](/answers/how-do-i-plan-a-one-shot-rpg-session), the sequence is plan, pace and run.",
      ],
    },
    {
      kind: "example",
      heading: "Worked example: The dark watchtower",
      paragraphs: [
        "This is the same storm-isolated watchtower planned in [How do I plan a one-shot RPG session?](/answers/how-do-i-plan-a-one-shot-rpg-session): Harrow Watch has been cut off for two days, its lamp is dark, and keeper Ansa Vale is trapped with a broken leg while her assistant Pell hides that he panicked and dropped the lamp oil. Four pregens go up before the tide turns at midnight: the keeper's younger sibling, the ferryman who owes Ansa money, the watch volunteer who found the lamp dark, and the surgeon who treated the last keeper. Ansa has the logbook with her in the lamp room. The oil flask Pell dropped is in the store room below it. On the run sheet, success means getting Ansa down. Saving Ansa but losing the logbook and the lamp is a partial result. Retreating without her, or being cut off by the tide themselves, is failure. The Game Master (GM) runs it as follows.",
      ],
      items: [
        {
          term: "The sixty-second opening",
          text: "The GM states the finish time, the tone, and the rule for unknown rules, then uses the first line from the run sheet: rain is coming sideways off the sea, the lamp above you is dark for the second night, and halfway up the stair you can see the bridge ropes hanging loose. What do you do? Play starts with a decision, and the loose ropes and the dark lamp give the group facts to act on.",
        },
        {
          term: "A quieter player gets a real choice",
          text: "Two players debate the bridge. The GM turns to the surgeon's player, who has not spoken, and offers an actionable observation with an invitation the player may pass on: from here you can see Ansa in the lamp room doorway. She is waving you off, then pointing at her leg and shaking her head. She cannot walk. Do you want to call up and ask her to throw the logbook down first, or would you rather get up there and splint the leg before anyone moves her? You can also let the others decide. The player chooses to call up, learns Ansa will not leave without the logbook, and now holds a fact the descent plan depends on. The choice was offered, not demanded as a performance, and passing would have left the decision with the group.",
        },
        {
          term: "An unexpected approach",
          text: "Instead of repairing the bridge, the climber-minded watch volunteer proposes climbing the outside wall to the lamp room while the ferryman and the sibling wait on the headland ledge below the wall, ready to receive anyone lowered from above. The GM had expected bridge repair first and drops that assumption without comment. Both plans can work, so the GM states what each involves under the game's own procedures: the climb is direct but exposed to the wind, and it bypasses the store room and the bridge. The volunteer reaches the lamp room and helps the surgeon climb the same rope, so the leg can be treated before any descent. In the lamp room the GM points out the iron lifting ring set into the masonry, used for hauling oil up the wall. The unrepaired bridge stays unusable, which will matter when they bring Ansa down.",
        },
        {
          term: "A setback that is not a dead end",
          text: "From the lamp room, the volunteer tries to make the bridge route usable for the descent by anchoring a separate handline to a bridge post at the lamp-room end of the bridge. The GM states the risk before the roll: the posts may be rotten, and if the anchor fails that line and route are gone. The roll fails and the post pulls out, taking the handline with it. That method is closed because its timber anchor has failed. It is a genuine failure, not a slower success. Rigging and abandoning the line has used the time until the harbour bell. The tide track the GM has kept visible fills its next mark, the lower stair goes under water, and the store room floods, so the dropped oil flask can no longer be reached. The GM then describes what is different about the method that remains and asks the group to choose. The wall rope can be anchored to the iron lifting ring set in the lamp room masonry, not to timber, and two people at the top can control the lowering while the ferryman and sibling receive Ansa on the ledge below. She would need her leg splinted first and could not help herself down. The ledge is awash, so a logbook lowered in her arms would be soaked. The other choice is to climb down, retreat, and return at first light, leaving Ansa in the tower overnight. The GM asks: do you lower her on the wall rope now, with those costs in view, or do you retreat?",
        },
        {
          term: "An earned finale",
          text: "The group chooses the wall lowering. The surgeon splints Ansa's leg. The volunteer and Pell control the rope from the lifting ring, with Pell admitting, as he takes the strain, that the flask he dropped is now under water in the store room. The ferryman and sibling receive Ansa on the awash ledge. As the group accepted beforehand, she comes down clutching the logbook in a canvas satchel, and spray over the ledge soaks it through. The ink runs and the recent pages are ruined. Ansa is safe on the headland, the logbook is lost, and the lamp stays dark because its oil can no longer be reached. The surgeon, volunteer and Pell then climb down the wall rope themselves. The GM narrates only what that chosen method produced, then stops adding obstacles.",
        },
        {
          term: "Epilogue for the played ending",
          text: "At dawn Ansa is in the ferryman's cottage with her leg splinted, the soaked logbook drying page by page in front of the fire with its recent entries gone, and Pell explaining the dropped flask to the harbour watch while the lamp waits for new oil. The GM asks each player for one sentence about what their character does that morning, thanks the table, and asks briefly what landed and what dragged. No extra scene is invented to fill the remaining minutes.",
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
        "When play stalls or players seem confused, clarify the stakes and the readable options, then let them choose. Advance a patrol, tide or antagonist only when the fiction already established it; otherwise offer an honest check on table time.",
        "When you are behind time, skip transitions and travel, and protect the choices that decide the ending.",
        "In the last stretch, bring the separate threads back to the central conflict and resolve that conflict.",
        "Finish with consequences for the place and people involved, one closing beat per character, and a short word of thanks and debrief.",
      ],
    },
  ],
  relatedAnswers: [
    "how-do-i-plan-a-one-shot-rpg-session",
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
        with: "answer-plan-one-shot-rpg-session",
        reason:
          "The planning answer covers operational preparation before the players arrive, including pregens, the premise brief, a one-page run sheet and tested assets; this answer starts at the table opening and covers facilitating that prepared material through the epilogue. Together they form a Plan then Run path.",
      },
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
      "answer-plan-one-shot-rpg-session",
      "answer-pace-rpg-one-shot",
      "answer-write-one-shot-adventure",
      "answer-prepare-session-step-by-step",
    ],
  },
  seo: {
    title: "How Do I Run a One-Shot RPG Session? | Codex Cryptica",
    description:
      "Run a one-shot RPG session from the first decision to the epilogue: a repeatable GM loop, spotlight sharing, honest failures, plain rulings and a live cheat sheet.",
    image:
      "https://assets.codexcryptica.com/og/how-do-i-run-a-one-shot-rpg-session.jpg",
    imageAlt:
      "Adventurers in wool cloaks approaching a dark coastal watchtower in rain at twilight, with a figure waving from a lit upper window",
  },
};
