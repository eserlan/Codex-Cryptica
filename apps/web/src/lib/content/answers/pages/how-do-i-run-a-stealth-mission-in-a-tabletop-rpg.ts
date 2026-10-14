import type { AnswerConfigInput } from "../schema";

export const howDoIRunAStealthMissionInATabletopRpg: AnswerConfigInput = {
  slug: "how-do-i-run-a-stealth-mission-in-a-tabletop-rpg",
  category: "running-the-game",
  labels: ["heist"],
  publishedAt: "2026-10-14",
  question: "How do I run a stealth mission in a tabletop RPG?",
  kind: "framework",
  shortAnswer:
    "Plan a stealth mission as a short sequence of security zones where players choose how to approach each change in risk, and call for a roll only when the outcome is uncertain and failure would matter. One group check can cover a coherent crossing while new checks belong to new problems such as a fresh patrol, an exposed courtyard or a riskier plan. Use a light suspicion track to make detection gradual, and let a failed roll create a new choice rather than sounding the whole complex at once.",
  sections: [
    {
      kind: "prose",
      heading: "Start with zones and choices, not a roll for every step",
      paragraphs: [
        "A stealth mission works best when you describe a location as two or three security zones with a clear change of risk between them, then ask the players what they do about that change. A perimeter fence with a bored watch, a lit courtyard with a regular patrol, and a sealed tomb entrance with a single alert guard are enough to give the party decisions that matter. The players choose a route, a timing, a disguise, a distraction, or a way to go unseen, and the fiction shifts as a result.",
        "Call for a roll only when the outcome is both uncertain and consequential. If the party has a sound plan, darkness, and no observer in position, let it work and describe progress. If they time a move between patrols, pull a guard away, or use a service tunnel they found through reconnaissance, that preparation can remove a check, change the difficulty, or grant advantage according to your system. Reserve the dice for moments where someone could be seen or heard and that exposure would create a new problem.",
      ],
    },
    {
      kind: "list",
      heading: "One group check, several checks, or fictional positioning",
      intro:
        "Use the same principle for how many checks to call for, and apply your system's own group check, help, advantage, or partial success rules:",
      items: [
        {
          term: "One check for one coherent approach",
          text: "When the party crosses a single zone together with the same intent, such as slipping along a shadowed wall while a patrol passes, resolve it as one check using whatever group resolution your game provides. In D&D 5e that is often a group Stealth check, in other games it is a single roll with help or a combined result. The check answers whether that approach holds for this zone, and you describe who was most exposed if the result is mixed.",
        },
        {
          term: "A new check when circumstances meaningfully change",
          text: "Call for another check when the situation becomes a new problem: a fresh guard pattern, an exposed courtyard with no cover, a noisy obstacle to force, or a sudden change of plan that carries more risk. Each check should attach to a visible change the players can see and react to, not to another ten feet of corridor.",
        },
        {
          term: "Why repeated rolls undermine a capable party",
          text: "If every door and corner needs its own independent Stealth check, even a skilled party becomes likely to fail before the objective. Four independent checks that each need a moderate result turn a strong chance on one roll into a poor chance across the sequence, which can punish careful play. Keep the count low and tie extra checks to new decisions or new exposure rather than to distance travelled.",
        },
        {
          term: "Let preparation replace or reshape a check",
          text: "Reconnaissance, a stolen uniform, a bribed watchman, darkened lamps, a timed distraction, or a quieter route can remove a check entirely or change its terms. Record the effect in the fiction first, then apply the system's modifier. A disguised party member may not need a Stealth check at the gate but may face a Deception or social check instead, with different consequences on a failure.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Reward what characters do before the dice",
      intro:
        "Give fictional preparation a consistent, visible effect so players invest in it:",
      items: [
        {
          term: "Reconnaissance defines the zones",
          text: "Watching the tomb for an hour reveals shift changes, sight lines, a blind corner by the store yard, and an overgrown service door the private guards rarely check. That information lets the party choose which zone to challenge and which to avoid, rather than guessing where the patrols are.",
        },
        {
          term: "Route, timing, and cover change the terms",
          text: "A quieter route through the store yard, waiting for the patrol to turn, or using the shadow of the perimeter wall may reduce difficulty, grant advantage, or let heavily armoured characters move with help instead of rolling alone. Name the trade off so the choice matters: the quiet route is slower and leaves less time at the tomb, the fast route crosses the lit yard.",
        },
        {
          term: "Disguises, distractions, and tools create different checks",
          text: "A borrowed tabard, a crate of supplies, a thrown stone that draws a guard aside, or oil on a hinge do not automatically make someone silent. They change what the roll is about and what failure looks like. A guard drawn away from the courtyard is not there to notice the crossing, but his absence may be noticed later.",
        },
        {
          term: "Magic, bribes, and social leverage follow the same rule",
          text: "A silence effect, a charm, or a coin to the night porter can create an opening that lasts for one zone or one crossing. Price it honestly: a bribed guard may look the other way once but report the approach after his shift, and a spell may leave a trace that a later investigation can find.",
        },
      ],
    },
    {
      kind: "list",
      heading: "A lightweight suspicion track you can use or skip",
      intro:
        "If you want detection to feel gradual without adding a formal subsystem, use this optional four-step tracker and keep it visible on a scrap of paper. Move a marker only when the fiction changes, not on every roll:",
      items: [
        {
          term: "Unaware",
          text: "Guards follow routine. Normal patrols, idle talk, lamps lit. The party can observe, talk quietly, or replan. No extra pressure yet.",
        },
        {
          term: "Suspicious",
          text: "Something seems off: a distant scrape, a lamp guttering, a door left ajar. A guard pauses, glances toward the sound, or alters his path slightly. Players have a clear chance to freeze, withdraw, offer a cover story, or create a distraction before anyone is seen.",
        },
        {
          term: "Investigating",
          text: "A guard moves to check. He lifts a lantern, calls for a second watchman, or follows footprints toward the party's last position. The fiction tightens. Characters who stay risk being spotted, while characters who retreat may keep the mission alive at the cost of time or position.",
        },
        {
          term: "Alarm",
          text: "A whistle, bell, shout, or signal goes up. Doors are barred, lights are raised, and reinforcements are called. Movement becomes louder and faster for both sides. The party must now fight, talk their way out, flee, hide until the search passes, or accept that the trespass will be remembered when they return to town.",
        },
      ],
      outro:
        "Use your game's existing alert, heat, or clock rules if you have them. This tracker is only a shared language for what guards notice and do next, and you can drop it whenever a single roll with clear consequences is enough.",
    },
    {
      kind: "table",
      heading: "What each suspicion level looks like at the tomb",
      headers: ["Level", "Guards do this", "Players can do this"],
      rows: [
        [
          "Unaware",
          "Walk the wall, check the gate on schedule, chat by the brazier",
          "Watch from cover, time the patrol, choose a route",
        ],
        [
          "Suspicious",
          "Pause, look toward sound, change path slightly",
          "Freeze, whisper a cover, toss a distraction, pull back",
        ],
        [
          "Investigating",
          "Advance with a lantern, call a second guard, follow prints",
          "Hide, create a false trail, talk, withdraw, or press on at risk",
        ],
        [
          "Alarm",
          "Raise the bell, bar the tomb door, send for town watch",
          "Fight, bargain, flee, hide until the search passes",
        ],
      ],
    },
    {
      kind: "list",
      heading: "Fail forward without erasing consequences",
      intro:
        "A poor roll should change the situation and create a new choice, but it need not instantly alert the entire complex. Serious failure should still matter, just on a scale the fiction earns:",
      items: [
        {
          term: "Cost time or position",
          text: "The party must wait for the next patrol gap, hide in a shallow niche, or retreat to the last safe point. The delay may close a later window, such as the priest's visit at dawn.",
        },
        {
          term: "Separate someone briefly",
          text: "One character is cut off behind a wall or on the wrong side of a patrol. Give them a clear signal and a short choice while the rest of the party can affect the next beat, then reunite the group quickly.",
        },
        {
          term: "Alert one guard, not the site",
          text: "A guard hears a scrape and moves to Investigating rather than raising the alarm. The party can still talk, distract, or slip away. The guard will remember the incident even if the bell never rings.",
        },
        {
          term: "Leave evidence",
          text: "Mud on a flagstone, a forced latch, a dropped tool, or a bribed guard who now has leverage. The tomb may still be entered, but town guards or the tomb's owners can follow the evidence later and ask questions in town.",
        },
        {
          term: "Close or change a route",
          text: "The service door is now watched, the courtyard lamps are all lit, or the direct path to the tomb is blocked. The party must pay a new price for another way in: a riskier climb, a favour owed, or abandoning equipment.",
        },
        {
          term: "Force a different kind of encounter",
          text: "A guard who finds intruders need not attack. He may demand a bribe, call for papers, order them to leave, or detain one character while the others bargain. Combat, deception, or withdrawal are all valid branches from the same detection.",
        },
        {
          term: "Trigger later repercussions",
          text: "A noisy scramble over the wall or a guard who glimpsed a face can become a report to the town watch. The party may enter the tomb tonight and face questions, a fine, or a barred gate when they return to town tomorrow. That consequence is part of the stealth failure, even if no sword was drawn inside the grounds.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Keep every character in the mission",
      paragraphs: [
        "Stealth missions stall when only the quietest character gets to act while everyone else keeps watch from a hedge. Give each member a defined job that changes the mission's terms. The scout times the patrol and signals when to move, the face carries a cover story or forged papers for the gate, a caster dims a lamp or muffles sound for one crossing, and the heavily armoured character hauls the tools, holds a rope, or creates the distraction that draws eyes away from the tomb for thirty seconds.",
        "When the situation demands a quiet check, let the group help within the game's rules rather than forcing each character to roll alone in succession. One character may lead while others follow the same path, use advantage or help, or accept a slower pace that trades time for a better chance. If a roll fails, put the cost on the zone and the plan, not on a single player, so the group decides whether to press on, hide, negotiate, or change route together.",
      ],
    },
    {
      kind: "prose",
      heading: "Use your system's rules, not a new universal mechanic",
      paragraphs: [
        "The exact procedure for stealth varies by game. D&D 5e uses Stealth checks, often as a group check or against a guard's passive Perception, with advantage and disadvantage to reflect cover and noise. Other games use opposed rolls, clocks that fill on partial successes, or position and effect to describe how risky a move is. Some treat a success with a cost as the default rather than a pass or fail.",
        "Use the rules in front of you rather than replacing them with a universal house system. This answer provides a portable GM procedure for when to call for a roll and how to handle the result: describe zones and risk, let player choices change the terms, roll only when failure would be interesting, and carry the outcome into suspicion and later consequences. Apply that procedure through the check, clock, or roll your system already provides.",
      ],
    },
    {
      kind: "example",
      heading: "Worked example: the privately guarded tomb",
      paragraphs: [
        "The party needs to reach a sealed tomb on private land. The owners pay two guards to walk the perimeter wall and a third to sit by the tomb door. The tomb is not a dungeon to clear; it is a place the party should not yet be seen entering. The example shows a complete run from reconnaissance to lasting consequence, with the same preparation resolved three different ways.",
      ],
      items: [
        {
          term: "Reconnaissance",
          text: "From the lane the party watches for an hour. They learn the pattern: the pair on the wall meet at the north corner, talk for a minute, then separate, leaving the east stretch unobserved for about a minute. The tomb door guard keeps to a lit circle and rarely leaves it. Behind the store yard an overgrown service gate is overgrown and seldom checked, but the path to it is soft ground that holds footprints. The players now have three approaches to choose from: wait for the wall gap and cross the courtyard, talk their way through the main gate with a story, or force the service gate and move through the yard. Each choice carries a different kind of risk.",
        },
        {
          term: "Approach without a roll",
          text: "The party decides to use the wall gap. They move behind the store yard while the guards meet at the north corner. No guard can see them here, and the movement is not uncertain, so the GM does not call for a check. The GM describes the courtyard ahead: open ground, a single lamp, the tomb guard in his circle of light. The players feel the change of risk before any dice appear.",
        },
        {
          term: "First consequential exposure: one check for the courtyard",
          text: "Crossing the courtyard is the first moment where being seen would matter. The GM calls for one group resolution for this zone using the game's own procedure: in D&D 5e a group Stealth check, elsewhere a single roll with help or advantage for the quieter route. The players can take the direct paved path quickly or the softer, darker edge slowly; they choose the darker edge and accept that it will leave prints. They roll once. On a success the party reaches the far wall. On a mixed or partial success the GM moves the tomb guard to Suspicious: he heard a faint sound, lifts his lantern, and looks toward the yard for a long breath. On a failure the guard becomes Investigating and walks toward the sound with the lantern raised. No bell has rung yet, but the party is now in a tighter spot and must choose.",
        },
        {
          term: "New obstacle: when a second check is warranted",
          text: "While the party waits against the far wall, the wall patrol returns earlier than expected and one guard pauses to tighten a loose shutter. The situation has changed: a new observer is in position and the quiet route is now overlooked. If the party wants to reach the tomb door before the patrol moves on, that is a new problem with new exposure and it justifies a new check with different stakes. If instead they wait for the patrol to pass and use the delay to study the tomb lock, no new Stealth check is needed. The GM calls for a check only for the new exposure, not for simply remaining still.",
        },
        {
          term: "Complication: a guard becomes suspicious",
          text: "The heavy fighter scrapes a loose tile while shifting. The tomb guard hears it and steps to Investigating: he moves three paces toward the far wall, lantern high, and calls quietly to the wall patrol, are you there. The party has options. The face can step into dim light with a cover story about retrieving a tool left by the groundskeeper. The caster can extinguish the courtyard lamp for one round with a cantrip that will be noticed later. The scout can toss a stone into the store yard to draw the wall patrol's attention, which may buy time but will leave the patrol Suspicious of that yard tomorrow. The fighter can simply freeze and trust the darkness. Each choice changes who might be seen and what is remembered, and any of them is preferable to treating the scrape as an instant alarm.",
        },
        {
          term: "Consequences that outlast the night",
          text: "If the party panics and scrambles noisily over the wall, they may still escape without a fight, but they leave boot prints, a bent latch on the service gate, and a guard who saw a cloaked figure from behind. The tomb remains unentered, yet the owners now watch the site and the town watch has a description that matches the party's hireling. If the party talks or distracts their way past this guard and enters the tomb quietly, they may get what they came for, but the same evidence remains to be explained when they return to town. Success and failure both produce a next choice rather than a single binary outcome.",
        },
        {
          term: "Clean success, complicated success, and full detection",
          text: "Clean success: the party crosses on the first check, the guard remains Unaware, they open the tomb without being seen, and leave by the service gate before the next patrol. Complicated success: one check is mixed, the guard is Suspicious and then Investigating, the party burns their distraction to slip past, reaches the tomb but must leave quickly and leave prints that become the next day's problem. Full detection: the alarm rises, the wall patrol bars the gate and the tomb guard raises the bell. The party must now fight, bargain, surrender a name and be escorted off the grounds, or flee into the lane with the town watch soon involved. In each branch the players kept choices after the dice, and the difference between branches is the price they pay next.",
        },
        {
          term: "Why it works",
          text: "The GM called for one check per change of risk instead of a roll for every movement, so careful play kept the number of rolls low and each roll mattered. Fiction-first choices removed or reshaped checks rather than adding a bonus on top of many rolls. The suspicion track made detection stepwise and gave the players a chance to respond before the alarm. Failure never erased the mission in one moment but always created a cost the party will meet again, whether at the tomb door or back in town with the watch.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "At-a-glance stealth mission checklist",
      intro: "Run through this before you call for the first check:",
      items: [
        "Sketch two or three zones with one visible change of risk between each, and name what a guard can see from each position.",
        "Decide what reconnaissance can reveal and which route or timing it opens up.",
        "Plan one group resolution per zone at most, and name what would justify an extra check as a new problem.",
        "Note how disguises, bribes, distractions, or spells change the kind of check or remove it for one zone.",
        "Keep a four-step suspicion note handy: Unaware, Suspicious, Investigating, Alarm, and what guards do at each step.",
        "Prepare at least three fail-forward costs: lost time, a closed route, a suspicious guard, evidence left behind, a separated character, a negotiation, or a later report to the town watch.",
        "Give every character a job that changes access, timing, cover, or information, not just a separate Stealth roll.",
        "Use your system's own group check, perception, advantage, and partial success rules rather than inventing new mechanics.",
      ],
    },
  ],
  systemsThatSupportThis: [
    {
      system: "Dungeons & Dragons 5th Edition",
      rationale:
        "Uses group Stealth checks, passive Perception, and advantage or disadvantage to resolve whether a party is noticed under the core ability check rules.",
      href: "https://www.dndbeyond.com/sources/dnd/free-rules/abilities",
    },
    {
      system: "Pathfinder Second Edition",
      rationale:
        "Resolves stealth through the Avoid Notice exploration activity, Stealth versus Perception DC, and degrees of success that make detection stepwise.",
      href: "https://2e.aonprd.com/Rules.aspx?ID=536",
    },
  ],
  codexConnection: {
    heading: "Link guards, places, and consequences across sessions",
    paragraphs: [
      "A stealth mission creates relationships worth keeping: which guards saw what, which route is now watched, and which evidence could bring the town watch to the party later. Codex Cryptica lets you save those people, places, and links once and see them from either side, so a suspicious guard or a barred tomb can return as a visible complication rather than a note lost between sessions.",
    ],
    linkText: "Explore the RPG knowledge graph",
    href: "/solutions/rpg-knowledge-graph",
  },
  relatedTools: [
    {
      title: "Heist generator",
      description:
        "Build a target, its security rings, complications, and a getaway to frame your next stealth approach.",
      href: "/generators/heist",
    },
    {
      title: "Heist topic hub",
      description:
        "The complete heist cluster: frameworks, target design, worked examples, and generation tools.",
      href: "/topics/heists",
    },
  ],
  relatedAnswers: [
    "how-do-you-run-a-heist-in-a-tabletop-rpg",
    "how-do-i-run-spies-and-infiltrators-in-an-rpg",
    "how-do-i-run-a-rogue-or-scout-without-splitting-the-party",
    "how-do-you-run-a-chase-in-a-tabletop-rpg",
    "how-do-i-give-specialist-characters-spotlight",
    "how-do-i-improvise-npcs-in-dnd",
  ],
  discovery: {
    id: "answer-run-stealth-mission-in-tabletop-rpg",
    parentCluster: "running-the-game",
    clusters: ["running-the-game", "adventure-design"],
    primaryIntent: "how to run a stealth mission in a tabletop rpg",
    intentAliases: [
      "how to run stealth checks in a tabletop rpg",
      "single stealth check or multiple checks",
      "how many stealth rolls for a stealth mission",
      "how to handle failed stealth checks",
      "stealth mission escalation and suspicion track",
      "how to keep the whole party involved in stealth",
    ],
    userJob: "adopt-workflow",
    uniqueValue:
      "Teaches a zone-based stealth procedure that limits rolls to consequential exposure, uses fiction-first preparation and group resolution, applies an optional four-step suspicion track, and shows fail-forward costs that reach the town watch rather than rehashing heist planning.",
    relatedIntents: [
      "answer-run-heist-in-tabletop-rpg",
      "answer-run-spies-infiltrators-rpg",
      "answer-run-rogue-scout-without-splitting-party",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-run-heist-in-tabletop-rpg",
        reason:
          "The heist answer structures a full score through casing, engagement, alarms, and escape; this answer focuses on the moment-to-moment resolution of stealth within a mission and when to call for each check.",
      },
      {
        with: "answer-run-spies-infiltrators-rpg",
        reason:
          "The spy answer coordinates an infiltrator and an outside team across a covert operation; this answer covers stealth movement through guarded zones for the whole party and its escalating detection.",
      },
      {
        with: "answer-run-rogue-scout-without-splitting-party",
        reason:
          "The rogue and scout answer handles brief reconnaissance that returns information to the group; this answer handles a sustained stealth mission where every character needs a role and detection is gradual.",
      },
    ],
  },
  seo: {
    title: "How do I run a stealth mission in a tabletop RPG? | Codex Cryptica",
    description:
      "Run tense, fair stealth missions with zones, group checks, fiction-first preparation, a light suspicion track, and fail-forward costs that matter beyond the alarm.",
    image:
      "https://assets.codexcryptica.com/og/how-do-i-run-a-stealth-mission-in-a-tabletop-rpg.jpg",
    imageAlt:
      "Adventurers crouched behind a low wall at night, watching lantern-lit guards patrol before a sealed tomb entrance",
  },
};
