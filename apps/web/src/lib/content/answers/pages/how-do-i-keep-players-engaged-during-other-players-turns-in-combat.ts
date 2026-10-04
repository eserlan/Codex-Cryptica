import type { AnswerConfigInput } from "../schema";

export const howDoIKeepPlayersEngagedDuringOtherPlayersTurnsInCombat: AnswerConfigInput =
  {
    slug: "how-do-i-keep-players-engaged-during-other-players-turns-in-combat",
    category: "running-the-game",
    publishedAt: "2026-10-04",
    question:
      "How do I keep players engaged during other players' turns in combat?",
    kind: "framework",
    shortAnswer:
      "Before adding attention techniques, measure how long players wait between meaningful decisions and reduce avoidable dead time. Then make the situation and its changes clear, give players useful shared stakes where they fit, and invite planning without expecting constant visible attention. Treat phones or side conversations as clues about waiting time and encounter design before treating them as a discipline problem.",
    sections: [
      {
        kind: "prose",
        heading: "A long wait is a design signal",
        paragraphs: [
          "Before adding engagement techniques, measure how long players are actually waiting between meaningful decisions. A player may wait through one long turn, spell or ability lookups, analysis paralysis, too many separate NPC turns, an unclear battlefield, repeated arithmetic or condition tracking, slow virtual-tabletop interaction, or narration that takes longer than the decision itself. If the delay is structural, fix that before asking players to pay closer attention. Reduce dead time first; add engagement hooks second.",
          "Combat does not require everyone to act on every turn, and engagement does not require everyone to look attentive every second. Doodling, fidgeting, standing, checking a character sheet, quietly planning, or taking brief notes can all sit alongside engagement. The useful test is whether a player can re-enter the shared situation when needed, not whether they remain visibly still.",
        ],
      },
      {
        kind: "list",
        heading: "Audit the wait",
        intro:
          "Ask: how long is it from the end of one meaningful decision to the next decision that matters to this player? If that gap is routinely several minutes, inspect the encounter before adding more activity:",
        items: [
          {
            term: "Encounter size and turn complexity",
            text: "Check how many player, NPC, and monster turns sit between a player's meaningful choices. Reduce the number of opponents or simplify their turns where the system permits.",
          },
          {
            term: "Rules and information friction",
            text: "Look for repeated lookups, unclear positions or conditions, arithmetic, and slow map or VTT interaction. Make the battlefield easier to read and move lookups out of the critical path where possible.",
          },
          {
            term: "Initiative and enemy actions",
            text: "Consider whether the initiative structure creates long gaps, and whether low-value or identical enemy actions can be grouped where the system permits.",
          },
        ],
      },
      {
        kind: "list",
        heading: "Give attention somewhere useful to go",
        intro:
          "Use a few repeatable cues to keep the table oriented and involved between turns:",
        items: [
          {
            term: "Name the current and next turns",
            text: "If your game uses an ordered initiative sequence, keep it visible and make the current and next turn clear. Ask the next player to prepare a likely action, while reminding them that the current turn may change the situation and their plan. Keep the current turn's outcome visible and concise: preparedness should not mean ignoring what is happening now.",
          },
          {
            term: "Make threats move in public",
            text: "Show changes that matter to the fiction: an archer drawing a bead on the healer, a gate beginning to buckle, or an enemy revealing a new ability. These may change positioning, threaten an ally, reveal what an enemy can do, or alter the stakes. A clear change gives players something to follow even when the rules do not grant them a response right then.",
          },
          {
            term: "Let characters help one another",
            text: "Use the system's existing reactions, assists, and teamwork rules where they apply. An ally's position or action can set up another character's turn, and a threatened companion can make others care about the outcome. Extra off-turn decisions can also create interrupt chains and lengthen a round, so do not add reactions just to keep people busy if they add more decision overhead than meaningful play.",
          },
          {
            term: "Use a shared objective when it helps",
            text: "A hostage crossing the room, a closing escape route, or a signal that must be stopped can give the fight a stronger decision structure. Do not bolt on an external objective just to manufacture attention: a straightforward fight can still matter when positions matter, allies set each other up, enemy behaviour changes, resources are at stake, or the fiction is important. Show progress and setbacks when there is an objective to follow.",
          },
          {
            term: "Keep turns focused",
            text: "Summarise the battlefield at turn start only when needed; ask for the player's intent before drilling into mechanics; and resolve routine enemy actions quickly. Prepare monster abilities, use visible condition markers, avoid re-explaining familiar rules every round, and move lookups out of the critical path when possible. Batch identical, low-complexity NPCs where the system allows. Then resolve the action, state what changed, and pass the turn. Leave room to adapt when a new threat or result changes the plan.",
          },
          {
            term: "Give the table small jobs",
            text: "Offer optional roles such as tracking initiative or conditions to players who enjoy them. These jobs can help the table run smoothly, but they are secondary: do not substitute administrative work for meaningful participation or make anyone responsible for fixing a dull wait.",
          },
        ],
      },
      {
        kind: "prose",
        heading: "Teach the routine without putting new players on the clock",
        paragraphs: [
          "New players often go quiet because they are searching a character sheet or trying to remember what a feature does. Give each beginner a short reference for common attacks, movement, and a few signature abilities. When their turn comes, ask what they want to accomplish in plain language, then help translate that into the rules. Familiarity grows through play; a hard timer can make a learner feel tested instead.",
          "A gentle reminder that players may plan while others act can help, provided it does not interrupt the active turn or force a decision before the situation is clear. Avoid hard turn timers as a default. They can prompt decisiveness at a table that wants that pressure, but they can also create frustration for new players, players checking a complex ability, or anyone adapting to a changed battlefield.",
        ],
      },
      {
        kind: "list",
        heading: "Read disengagement before setting a rule",
        intro:
          "Attention can follow a turn for tactical or narrative reasons: it may change positioning, spend a shared resource, threaten an ally, advance an objective, reveal an enemy's capability, or resolve a relationship or emotional beat. First shorten waits, clarify the situation, show what changed, make consequences shared where useful, and invite planning. Revisit table expectations only if needed.",
        items: [
          {
            term: "Talk about phones plainly",
            text: "Set a shared expectation for devices and cross-talk, with sensible room for breaks or urgent messages. Ask what makes it hard to stay with the fight before imposing a blanket ban.",
          },
          {
            term: "Look for repeated quiet stretches",
            text: "If the same players check out in particular fights, notice whether their meaningful decisions are far apart, the situation is unclear, or the choices repeat. Change that part of the encounter and see whether attention follows. A fight does not need a hostage, ritual clock, collapsing gate, or escape route to hold interest.",
          },
          {
            term: "Account for a large party",
            text: "With many players, long waits are partly structural. Use fewer or simpler opponents, resolve low-stakes actions together where the system permits it, or split the group if most of the session becomes waiting. Attention cues cannot remove every delay created by a crowded initiative order.",
          },
        ],
      },
      {
        kind: "example",
        heading: "A fight that keeps changing",
        paragraphs: [
          "The party is holding a courtyard while a wounded scout tries to reach the bell tower. The scout's progress and the enemies' actions matter to every character, even when only one player is resolving a turn.",
        ],
        items: [
          {
            term: "The static version",
            text: "Enemies stand in a line and trade attacks with the nearest characters. The GM calls each name in the initiative order, but the battlefield looks much the same after every turn. Players who cannot act have little new information to use.",
          },
          {
            term: "The changing version",
            text: "The GM posts initiative and calls, 'Mara is up, Jory is next.' The enemies move to cut off the scout. Mara blocks a narrow stair, and the GM marks the scout halfway to the bell. Jory changes his planned shot to cover the route, while the next player watches for the scout's signal. The fight has a visible objective, and each turn changes the choices still available.",
          },
          {
            term: "Why it works",
            text: "Players can follow a shared problem rather than wait for a personal turn. They are free to revise their plans as the situation changes, and the GM has clear events to announce without narrating every movement at length.",
          },
        ],
      },
      {
        kind: "checklist",
        heading: "Before the next fight",
        items: [
          "Measure the gap between meaningful decisions and shorten routine waits.",
          "Clarify the situation, then show what changed after each turn.",
          "Make consequences shared where useful; invite planning while leaving room to adapt.",
          "If your game uses ordered initiative, show who is acting and who is next.",
          "Use existing reaction or assist rules where they fit, without adding off-turn overhead.",
          "Give new players a short reference for the actions they use most often.",
          "Revisit table expectations only if attention still drops after pacing and clarity improve.",
        ],
      },
    ],
    codexConnection: {
      heading: "Prepare a fight with more than one thing at stake",
      paragraphs: [
        "Codex Cryptica's encounter generator can help draft an encounter with an objective or situation beyond defeating every opponent. Use that as preparation, then decide how progress and threats will be shown at the table. The tool can supply material to build on; it cannot manage initiative or keep players attentive for you.",
      ],
      linkText: "Try the encounter generator",
      href: "/generators/encounter",
    },
    relatedTools: [
      {
        title: "Encounter generator",
        description:
          "Draft an encounter premise with an objective to shape around your party and rules system.",
        href: "/generators/encounter",
      },
    ],
    relatedAnswers: [
      "how-do-i-make-combat-faster-without-making-it-less-exciting",
      "how-do-i-balance-rpg-combat-encounters-without-a-tpk",
      "how-do-you-run-dnd-for-a-large-group-of-players",
      "how-do-you-make-a-tabletop-rpg-session-more-engaging",
      "how-do-i-give-specialist-characters-spotlight",
    ],
    discovery: {
      id: "answer-player-engagement-combat-turns",
      parentCluster: "session-prep",
      primaryIntent:
        "how to keep players engaged during other players turns in combat",
      intentAliases: [
        "how to keep players engaged between turns in combat",
        "players disengage during combat turns",
        "how to stop players checking phones during combat",
        "how to keep players paying attention during initiative",
      ],
      uniqueValue:
        "Starts by diagnosing the wait between meaningful combat decisions, then shows how clearer changes, shared stakes, initiative cues, and beginner support can keep players engaged without demanding constant visible attention.",
      relatedIntents: [
        "answer-session-engagement",
        "answer-large-group-dnd",
        "answer-encounter-balance",
      ],
      acknowledgedOverlap: [
        {
          with: "answer-party-cohesion",
          reason:
            "The party-cohesion answer addresses cooperation and shared stakes between characters; this answer focuses on attention and decision-making between combat turns, including when the party already works well together.",
        },
        {
          with: "answer-session-engagement",
          reason:
            "The session-engagement answer covers scene purpose and spotlight across a whole session; this answer is specifically about giving players useful attention and choices between combat turns.",
        },
        {
          with: "answer-large-group-dnd",
          reason:
            "The large-group answer covers the structural overhead of running many players; this answer applies to parties of any size and focuses on attention during the gaps between combat turns.",
        },
        {
          with: "answer-encounter-balance",
          reason:
            "The encounter-balance answer helps set fair combat difficulty; this answer addresses player attention and shared decision-making while a fight is underway.",
        },
      ],
    },
    seo: {
      title:
        "How do I keep players engaged during combat turns? | Codex Cryptica",
      description:
        "Measure waiting time between meaningful combat decisions, shorten avoidable delays, then use clear changes and shared stakes to keep players engaged.",
      image:
        "https://assets.codexcryptica.com/og/how-do-i-keep-players-engaged-during-other-players-turns-in-combat.jpg",
      imageAlt:
        "Adventurers coordinate around a fighter in a rain-darkened stone courtyard",
    },
  };
