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
      "Give players a reason to follow each turn: make the initiative order visible, announce who is acting and who is next, and let changing threats, reactions, shared objectives, and assists make other characters' choices matter. Keep turns focused, give new players quick references, and treat phones or side conversations as clues about waiting time and encounter design before treating them as a discipline problem.",
    sections: [
      {
        kind: "prose",
        heading: "A long wait is a design signal",
        paragraphs: [
          "When attention drops during combat, it is tempting to explain the problem as poor player behaviour. Sometimes a group does need to agree on phones and side conversations. First look at what players are being asked to attend to: if several turns pass without changing what their characters can do, there may be little reason to keep watching.",
          "Combat engagement does not require every player to act on every turn. It does require a readable situation where another character's action, an enemy's move, or a changing objective can affect what you might do next. The GM's job is to make those changes clear and give players room to respond.",
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
            text: "Use the system's existing reactions, assists, and teamwork rules. An ally's position or action can set up another character's turn, and a threatened companion can make everyone watch for a chance to intervene. Do not promise a reaction where the rules do not allow one; show the danger clearly so players can plan around it.",
          },
          {
            term: "Give the fight a shared objective",
            text: "A hostage crossing the room, a closing escape route, or a signal that must be stopped makes the whole party care about events outside their own damage total. Tell players what is visibly at stake and show progress or setbacks as they happen.",
          },
          {
            term: "Keep turns focused",
            text: "Resolve the action, state what visibly changed, then pass the turn. Encourage players to have a likely action in mind, while leaving room to change it when a new threat or result makes their plan obsolete.",
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
        ],
      },
      {
        kind: "list",
        heading: "Read disengagement before setting a rule",
        intro:
          "Agree on table expectations, then check whether the encounter is giving people enough to follow:",
        items: [
          {
            term: "Talk about phones plainly",
            text: "Set a shared expectation for devices and cross-talk, with sensible room for breaks or urgent messages. Ask what makes it hard to stay with the fight before imposing a blanket ban.",
          },
          {
            term: "Look for repeated quiet stretches",
            text: "If the same players check out in particular fights, notice whether their turns are far apart, the objective is unclear, or the choices repeat. Change that part of the encounter and see whether attention follows.",
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
          "Put the initiative order where the table can see it, and call the next player before their turn.",
          "Choose one visible threat or objective that can change during the fight.",
          "Check that players can use the system's reaction or assist rules when an ally's turn creates an opening.",
          "Give new players a short reference for the actions they use most often.",
          "Invite planning between turns while allowing players to adapt to new information.",
          "If attention keeps dropping, ask what the wait feels like before reaching for a timer or phone rule.",
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
        "Focuses on attention between combat turns, showing how initiative cues, shared objectives, reactions, visible changes, and beginner support give players a reason to follow the fight. It treats disengagement as feedback about wait time and encounter design, rather than only a behaviour problem.",
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
        "Use clear initiative cues, changing threats, shared objectives, and useful player roles to keep attention on the fight between turns.",
      image:
        "https://assets.codexcryptica.com/og/how-do-i-keep-players-engaged-during-other-players-turns-in-combat.jpg",
      imageAlt:
        "Adventurers coordinate around a fighter in a rain-darkened stone courtyard",
    },
  };
