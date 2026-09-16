import type { AnswerConfigInput } from "../schema";

export const howDoYouRunDndForALargeGroupOfPlayers: AnswerConfigInput = {
  slug: "how-do-you-run-dnd-for-a-large-group-of-players",
  category: "session-prep",
  publishedAt: "2026-09-16",
  question: "How do you run D&D for a large group of players?",
  kind: "framework",
  shortAnswer:
    "A table of seven to ten players works when the GM deliberately cuts dead time and structures spotlight, rather than running it exactly like a four-player table. Keep scene goals and stakes obvious from the first line, use visible initiative and prompt the next player before their turn arrives, and let players decide their action while someone else is still resolving theirs. Eight players is not automatically too many: the real constraint is attention and turn time, not encounter balance, and if the table keeps waiting more than playing, splitting into two smaller groups is a legitimate fix rather than a failure.",
  sections: [
    {
      kind: "prose",
      heading: "A big table is a different game, not a slower one",
      paragraphs: [
        'The mistake that breaks most large tables is running them like a small table with extra chairs: the same open-ended "what do you do" prompts, the same unhurried initiative order, the same expectation that every character weighs in before a decision gets made. At four players that produces a lively back-and-forth. At eight it produces twenty minutes to leave a room, three players checking their phones, and a session that covers less ground than a normal four-player night despite running twice as long.',
        "Eight or ten players is not a smaller problem than four, it is a structural one. Combat action economy roughly doubles, initiative overhead compounds every round, and any planning discussion that would take five minutes with four people can genuinely take twenty with ten, because the number of people who need to be heard and the number of people willing to talk are two different numbers that both grow. None of this means the table can't work. It means the GM has to actively manage time and attention instead of letting the table manage itself, which is what a smaller group can often get away with.",
      ],
    },
    {
      kind: "list",
      heading: "Cut the dead time between turns",
      intro:
        "Most of what makes a large table feel slow is not the players, it is the gaps between them acting. Close those gaps directly:",
      items: [
        {
          term: "Use visible initiative and call the next player early",
          text: "Write the order somewhere everyone can see it, physically or on screen, and tell the player after the current one that they're up next before their turn arrives. A player who knows they have sixty seconds to think is ready when it's their turn; a player who finds out cold loses the table another thirty seconds working it out live.",
        },
        {
          term: "Let players plan while others act",
          text: "Explicitly tell the table it's fine to decide an action while someone else resolves theirs, and to whisper questions to you rather than interrupting the current turn. This alone removes a large share of the waiting at an eight-player table, because most of that waiting is players sitting passively rather than genuinely being blocked.",
        },
        {
          term: "Batch or simplify low-value rolls",
          text: "A perception check from every player at the door, or eight separate damage rolls against the same trivial target, rarely changes the outcome. Ask for one check from whoever's build makes sense, or resolve a weak enemy's fate narratively once the outcome is no longer in doubt.",
        },
        {
          term: "Avoid stacking complex enemies to match party size",
          text: 'Doubling the monster count to keep a fight "fair" for a bigger party multiplies the number of individual turns, saves, and conditions you have to track as GM. Fewer, tougher, or more mechanically simple opponents usually produce a faster and equally threatening fight than a swarm of individually complex ones.',
        },
        {
          term: "Give encounters an objective beyond zero HP",
          text: "A fight that ends when the party stops a ritual, breaks a formation, or holds a door for three rounds can end the moment that goal is met, even with enemies still standing. A fight whose only win condition is reducing every combatant to zero hit points has to run its full length regardless of how many players are rolling initiative.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Structure the spotlight instead of leaving it to chance",
      intro:
        "Without deliberate structure, a large table's spotlight gravitates to whichever two or three players are most confident, and everyone else fades into an audience:",
      items: [
        {
          term: "Use a spokesperson for specific tasks only",
          text: "Naming one player to lead a single negotiation or read a single map can genuinely speed a scene up. Letting that same player become the party's default decision-maker for every scene quietly turns the rest of the table into spectators, which is the opposite of what you want.",
        },
        {
          term: "Address quieter players when there's a real opening",
          text: "If a quiet player's character has an obvious reason to notice something or react, ask them directly rather than waiting for them to volunteer into a crowd of louder voices. Don't force a theatrical moment on someone who doesn't want one; a direct, low-stakes question is usually enough to bring them back into the scene.",
        },
        {
          term: "Break crowded social scenes into smaller beats",
          text: "A tavern, court, or camp scene with ten characters and three NPCs works better split into pairs or small groups than run as one continuous conversation. Let the party split up to talk to different NPCs, then cut between the groups, rather than running one slow conversation that only two players are actually part of.",
        },
        {
          term: "Rule fast and check details after the session",
          text: "When a rules question comes up that won't change the immediate outcome either way, make the call and keep moving. Looking it up live in front of ten waiting players costs far more table time than the five minutes it takes to check the exact wording after the session and adjust next time if you got it wrong.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Is eight players too many?",
      paragraphs: [
        "Eight players is not automatically unplayable, but it is well above the size most systems and published adventures implicitly assume, and that gap is where the strain shows up. The constraint is not encounter balance, which scales reasonably predictably with a bit of arithmetic. The constraint is attention and time: how long each player waits between meaningful turns, and how much of a three-hour session is actually spent on play rather than administration and cross-talk.",
        "If a table applies the techniques above and still spends most of a session waiting rather than playing, that's a genuine signal, not a failure of GM skill to push through. Splitting into two smaller groups, alternating weeks, or running parallel scenes for different subsets of the party can solve a problem that no amount of pacing technique fixes on its own. That said, don't treat splitting as the default answer. If the group is playing together partly for the social experience of playing together, a structured eight-player table that runs a bit slower than a four-player one can still be the right trade for that table.",
      ],
    },
    {
      kind: "list",
      heading: "Running beginners in a large group",
      intro:
        "A large table with several new players is its own complication, not just a slower version of a large table of veterans:",
      items: [
        {
          term: "Offer pregens or low-complexity options",
          text: "A new player choosing between a pregenerated character or a mechanically simple class spends less of session one on character-building decisions they don't yet have context for, and more of it actually playing.",
        },
        {
          term: "Hand out one-page references",
          text: "A single page covering their character's core actions and a couple of common rolls answers most of the questions a beginner would otherwise ask mid-turn, without expecting them to hold the whole system in their head.",
        },
        {
          term: "Teach only the rule the current decision needs",
          text: "A ten-minute rules lecture before play loses most of what it covers by the time it's relevant. Explaining a rule at the moment a beginner needs it sticks better and costs less table time overall.",
        },
        {
          term: "Pair without deputising",
          text: "Sitting an experienced player next to a beginner so they can quietly help with rules works well. Letting that experienced player start making decisions on the beginner's behalf does not; check in with the beginner directly so their character stays theirs.",
        },
        {
          term: "Introduce rules through play",
          text: "Let a beginner attempt an action in plain language first, then translate it into the mechanic once they've decided what they want to do, rather than requiring them to name the correct rule before acting.",
        },
      ],
    },
    {
      kind: "example",
      heading: "Worked example: the ruined keep",
      paragraphs: [
        "The same eight-player scene run two different ways: the party has reached a ruined keep where cultists are gathering.",
      ],
      items: [
        {
          term: "Unstructured",
          text: 'The GM describes the keep and asks "what do you do?" Eight players debate which doorway to try first, each independently asking what they see when they peek through. Combat starts when someone finally acts, and the table spends the first two rounds working out initiative order and who goes next, with most players sitting idle while the current turn is resolved.',
        },
        {
          term: "Structured",
          text: "The GM states the objective directly: cultists are gathering in the inner courtyard and will complete a ritual in a few minutes. Two strong details are given, a barred east door and torchlight visible through a collapsed section of wall, then the GM asks for the group's approach as a whole rather than one doorway at a time. Once combat starts, initiative is posted visibly, the GM prompts the next player while resolving the current one's action, and the fight's win condition is reaching the ritual circle rather than clearing every cultist in the keep.",
        },
        {
          term: "Why it works",
          text: "Both versions offer the party the same decisions: which entrance, how to approach the fight, how to spend their actions. The structured version keeps those decisions but removes the waiting around them, so the same eight players cover more ground in the same amount of table time.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Before you run a large table",
      intro: "Check these before sitting down with seven or more players:",
      items: [
        "You have a way to display initiative order that everyone can see without asking.",
        "You've told the table it's fine to plan their action while another player's turn resolves.",
        "Any encounter you've prepped has a win condition beyond reducing every enemy to zero hit points.",
        "You know which one or two players are likely to go quiet, and have a direct, low-pressure way to bring them in.",
        "Beginners at the table have a one-page reference or a pregenerated character rather than a rules lecture.",
        "You have a genuine answer for what you'll do if the session keeps running long on waiting rather than playing.",
      ],
    },
  ],
  codexConnection: {
    heading: "Cutting prep time for the table you actually have",
    paragraphs: [
      "None of the above is solved by a tool: attention and turn time are things the GM manages live, at the table. What a tool can do is shrink the prep load behind a big session, so there's more time to think about pacing and less spent building the roster a large party is about to meet.",
      "Codex Cryptica's encounter and NPC generators produce a playable encounter with an objective already attached, or a quick roster of names and wants for a crowded scene, in the time it would otherwise take to draft them from scratch. That's prep time back, not a fix for the waiting itself.",
    ],
    linkText: "Try the encounter generator",
    href: "/generators/encounter",
  },
  relatedTools: [
    {
      title: "Encounter generator",
      description:
        "Playable encounters with an objective and an activity already in progress, across combat, social, and exploration types.",
      href: "/generators/encounter",
    },
    {
      title: "NPC generator",
      description:
        "Quick names, roles, and immediate wants for the NPCs a large table's scenes actually need.",
      href: "/generators/npc",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for D&D campaigns",
      description:
        "Campaign notes, NPCs, and prep built around running D&D 5e sessions.",
      href: "/for/dungeons-and-dragons",
    },
  ],
  relatedAnswers: [
    "how-do-i-start-gming-for-the-first-time",
    "how-do-you-make-a-tabletop-rpg-session-more-engaging",
    "how-do-i-run-a-successful-session-0",
    "how-much-prep-do-you-need-for-an-rpg-session",
    "how-do-i-balance-rpg-combat-encounters-without-a-tpk",
    "how-do-you-run-a-scene-with-multiple-npcs",
    "can-you-play-a-tabletop-rpg-in-30-minute-sessions",
  ],
  discovery: {
    id: "answer-large-group-dnd",
    parentCluster: "session-prep",
    clusters: ["first-time-gm"],
    primaryIntent: "how do you run dnd for a large group of players",
    intentAliases: [
      "how to dm for 8 players",
      "is 8 players too many for dnd",
      "how to run dnd for a big group",
      "tips for dming 7 players",
      "how to speed up dnd combat with many players",
      "how to keep everyone engaged in a large dnd group",
      "how to dm a large group of beginners",
    ],
    uniqueValue:
      "Answers the large-table intent directly, distinguishing the attention and turn-time constraint from encounter balance, giving concrete criteria for when splitting a group beats pushing through, and covering beginner onboarding at scale, rather than folding it into general session-engagement advice.",
    relatedIntents: [
      "answer-first-time-gm-hub",
      "answer-session-engagement",
      "answer-encounter-balance",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-session-engagement",
        reason:
          "The session-engagement answer covers general techniques for keeping any table invested; this answer addresses the distinct structural problems, turn overhead, spotlight distribution, and decision-making time, that specifically appear once a table grows past roughly six players.",
      },
      {
        with: "answer-encounter-balance",
        reason:
          "The encounter-balance answer addresses combat difficulty and TPK risk; this answer explicitly separates that concern from the large-table problem, which is attention and time rather than whether the fight is fair.",
      },
      {
        with: "answer-run-scene-multiple-npcs",
        reason:
          "Both sit in the session-prep cluster and touch crowded scenes, but this answer is about running many players at once regardless of NPC count, while the multi-NPC answer addresses running many NPCs at once regardless of party size.",
      },
    ],
  },
  seo: {
    title: "How Do You Run D&D for a Large Group? | Codex Cryptica",
    description:
      "Running D&D for 7 to 10 players: cutting dead time between turns, structuring spotlight, whether 8 players is too many, and onboarding beginners at scale.",
    image:
      "https://assets.codexcryptica.com/og/how-do-you-run-dnd-for-a-large-group-of-players.jpg",
    imageAlt:
      "A crowded tabletop RPG table with many players and character sheets around a ruined keep battle map",
  },
};
