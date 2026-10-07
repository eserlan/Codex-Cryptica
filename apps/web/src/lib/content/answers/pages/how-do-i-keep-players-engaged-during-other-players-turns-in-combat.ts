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
      "Measure how long players wait between meaningful decisions and reduce avoidable delays. Give players a reason to follow each turn: make the initiative order visible, announce who is acting and who is next, and let meaningful changes make other characters' choices matter. Invite planning without locking in a choice, and treat phones or side conversations as clues about waiting time and encounter design before treating them as a discipline problem.",
    sections: [
      {
        kind: "prose",
        heading: "A long wait is a design signal",
        paragraphs: [
          "When attention drops during combat, it is tempting to explain the problem as poor player behaviour. Sometimes a group does need to agree on phones and side conversations. First look at what players are being asked to attend to: if several turns pass without changing what their characters can do, there may be little reason to keep watching.",
          "Engagement improves when the situation changes often enough to reward attention. Combat engagement does not require every player to act on every turn or visibly watch every roll. Some players think while looking away, doodling, fidgeting, or checking notes; aim for situational awareness and easy re-entry, not a constant performance of attention. A player who can quickly answer 'what changed, what matters, and what might I do?' can be engaged without tracking every detail.",
          "Meaningful changes between turns are only part of the pace. Long turns, spell or ability lookups, repeated rereading, unclear targets or battlefield positions, extended rulings, avoidable arithmetic or condition bookkeeping, slow virtual-tabletop interaction, narration longer than the decision, and decisions that begin only when a player's name is called can all make each turn drag. Reduce decision and resolution delays as well as the gaps between turns.",
        ],
      },
      {
        kind: "list",
        heading: "Audit the wait",
        intro:
          "Ask how long it is from the end of one meaningful decision to the next decision that matters to this player. If that gap is routinely several minutes, inspect the encounter before asking players to pay closer attention:",
        items: [
          {
            term: "Encounter size and turn complexity",
            text: "Check how many player, NPC, and monster turns sit between a player's meaningful choices. Reduce the number of opponents or simplify routine turns where the system permits.",
          },
          {
            term: "Rules and information friction",
            text: "Look for repeated lookups, unclear positions or conditions, arithmetic, and slow map or virtual-tabletop interaction. Make the battlefield easier to read and move lookups out of the critical path where possible.",
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
            text: "Keep initiative visible and say who is acting now and who is on deck. The next player can think ahead, while everyone else can follow the order without asking where the fight stands.",
          },
          {
            term: "Make threats move in public",
            text: "Describe the archer drawing a bead on the healer, the gate beginning to buckle, or the ritual reaching its final verse. A clear change gives players who are not acting a new problem to weigh, even if the rules do not grant them a response right then.",
          },
          {
            term: "Let characters help one another",
            text: "Use the system's existing reactions, assists, and teamwork rules where they apply. An ally's position or action can set up another character's turn, and a threatened companion can make others care about the outcome. Do not promise a reaction where the rules do not allow one; extra off-turn decisions can create interrupt chains and lengthen a round, so add them only where they solve a specific problem.",
          },
          {
            term: "Use a shared objective when it helps",
            text: "A shared objective need not be a countdown or escort: the party might control space, protect a fragile resource, escape with information, delay rather than win, identify the real threat, force an enemy to reveal something, reach or hold a position, or decide whether to continue or withdraw. Do not bolt on an external objective just to manufacture attention; a straightforward fight can still matter when positions matter, allies set each other up, enemy behaviour changes, resources are at stake, or the fiction is important. Show progress and setbacks when there is an objective to follow.",
          },
          {
            term: "Use a clear turn rhythm",
            text: "Keep the loop brief: declare, resolve, state the visible change, then cue the next turn. This helps everyone track movement, changed conditions, objective progress, new threats, and openings without extended narration after every attack.",
          },
          {
            term: "Prepare options, not commitments",
            text: "Encourage players to consider a likely target, ability, relevant rule, and fallback while others act. They should not have to lock in a choice before the battlefield changes; leave room to respond to new threats and results.",
          },
          {
            term: "Offer a quick re-entry cue",
            text: "Before a turn after a long gap, briefly recap what changed: 'Since your last turn, the gate is half-broken, the scout reached the stairs, and the archer moved onto the roof.' That restores the situation without requiring a player to remember every detail or listen to the whole battlefield being narrated again.",
          },
          {
            term: "Keep turns focused",
            text: "Summarise the battlefield at turn start only when needed; ask for the player's intent before drilling into mechanics; and resolve routine enemy actions quickly. Prepare monster abilities, use visible condition markers, avoid re-explaining familiar rules every round, and batch identical, low-complexity NPCs where the system allows. Then resolve the action, state what changed, and pass the turn. Leave room to adapt when a new threat or result changes the plan.",
          },
          {
            term: "Give the table small jobs",
            text: "A willing player can track initiative, remind the group of conditions, or look up a rule while you run the scene. Share the jobs around and make them optional; the aim is to include people, not turn a player into unpaid staff.",
          },
        ],
      },
      {
        kind: "prose",
        heading: "Teach the routine without putting new players on the clock",
        paragraphs: [
          "New players often go quiet because they are searching a character sheet or trying to remember what a feature does. Give each beginner a short reference for their common attacks, movement, and a few signature abilities. When their turn comes, ask what they want to accomplish in plain language, then help translate that into the rules. Familiarity grows through play; a hard timer can make a learner feel tested instead.",
          "A gentle reminder that players may plan while others act can help, provided it does not interrupt the active turn or force a decision before the situation is clear. Avoid hard turn timers as a default. They can prompt decisiveness at a table that wants that pressure, but they can also create frustration for new players, players checking a complex ability, or anyone adapting to a changed battlefield.",
          "If a turn stalls, make the next useful choice easier to see: clarify the target, point to the relevant rule, or offer a short recap. Simplifying repeated arithmetic or condition tracking can also help. The goal is fewer avoidable pauses, not speed at the cost of a meaningful choice.",
        ],
      },
      {
        kind: "list",
        heading: "Read disengagement before setting a rule",
        intro:
          "Attention can follow a turn for tactical or narrative reasons: it may change positioning, spend a shared resource, threaten an ally, advance an objective, reveal an enemy's capability, or resolve a relationship or emotional beat. First shorten waits, clarify the situation, show what changed, make consequences shared where useful, and invite planning. Revisit table expectations only if needed.",
        items: [
          {
            term: "Check the round and the changing situation",
            text: "Is the round simply too long? Does the battlefield materially change between turns? Is there a shared objective beyond damage? Can players see who is next and prepare options? If the same players check out in particular fights, notice whether their meaningful decisions are far apart, the situation is unclear, or their choices repeat; change that part of the encounter and see whether attention follows.",
          },
          {
            term: "Account for a large party",
            text: "With many players, long waits are partly structural. Use fewer or simpler opponents. Where the system permits, group identical enemies, resolve routine movement together, avoid separate narration for several nearly identical attacks, and pre-roll or plan obvious NPC actions. Keep boss and elite actions distinct when they create meaningful decisions. The aim is to keep meaningful changes frequent, not to speed through every choice.",
          },
          {
            term: "Look for avoidable delays and resolved fights",
            text: "Are rules lookups or enemy activations adding unnecessary latency? Is the outcome already clear, or is the session combat-heavy? Where the system and fiction allow, enemies might flee, surrender, or lose morale; the objective might resolve; or remaining resistance might be summarised. Keep playing out retreat, morale, or attrition when those are meaningful parts of the game.",
          },
          {
            term: "Consider the session's combat load",
            text: "If players follow the first fight but disengage during the third, ask: are players disengaging from this combat, or from how much combat the session contains? Fewer or shorter fights, different scene types or stakes, and ending resolved fights sooner may help.",
          },
          {
            term: "Talk about table expectations",
            text: "Only after checking the encounter, agree on expectations for devices and cross-talk, with sensible room for breaks or urgent messages. Ask what makes it hard to stay with the fight before imposing a blanket ban.",
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
          "Keep turns focused: resolve routine enemy actions quickly and use visible condition markers where helpful.",
          "Use a visible threat or shared objective when it adds meaningful choices to the fight.",
          "If attention keeps dropping, check turn length, meaningful changes, unnecessary delays, resolved fights, and the session's combat load before discussing table expectations.",
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
      "how-do-i-prepare-a-dnd-session",
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
        "Starts by diagnosing the wait between meaningful combat decisions, then shows how initiative cues, meaningful changes, shared stakes, responsive preparation, and beginner support help players follow the fight without demanding constant visible attention.",
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
