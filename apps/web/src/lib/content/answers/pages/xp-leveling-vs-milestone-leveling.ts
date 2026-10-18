import type { AnswerConfigInput } from "../schema";

export const xpLevelingVsMilestoneLeveling: AnswerConfigInput = {
  slug: "xp-leveling-vs-milestone-leveling",
  category: "session-prep",
  publishedAt: "2026-09-22",
  question: "XP vs milestone levelling: which should I use?",
  kind: "comparison",
  shortAnswer:
    "Use XP levelling when you want progress to be visible and tied to what characters accomplish; use milestones when you want levels to follow agreed campaign goals or story developments. XP can reward the wrong behaviour if its sources are narrow, while milestones can feel arbitrary if players cannot see what moves them forward. Choose the reward signal and pace your group wants, not a universal winner.",
  sections: [
    {
      kind: "prose",
      heading: "Advancement is a reward signal",
      paragraphs: [
        "XP makes progress cumulative and measurable. When the next level's threshold is known, players can see how close they are, and the GM can assign points to the things the characters do. That is useful in player-directed campaigns, but the award rules teach the table what is worth doing. If defeating enemies is the only reliable source, players may reasonably treat combat as the best route to advancement.",
        "Milestones replace a running total with defined events or accomplishments. The GM has more control over when new abilities arrive, and the whole party can advance together if that is the group's rule. The trade is that players need to understand what counts. A level granted after an unexplained stretch of play can feel like a private decision rather than progress they helped earn.",
      ],
    },
    {
      kind: "list",
      heading: "When each method fits",
      intro:
        "Start with the kind of progress you want players to notice, then account for the work it asks of the GM:",
      items: [
        {
          term: "XP",
          text: "A good fit when play is open-ended, the party chooses its own goals, or incremental progress matters to the group. Decide in advance which accomplishments earn points and how you will treat different routes to the same goal. This takes tracking and consistent awards, but need not mean awarding XP for kills alone.",
        },
        {
          term: "Milestones",
          text: "A good fit when the campaign has clear missions, arcs, chapters, or shared objectives and you want to set the pace around them. Tell players which kinds of developments count, and keep the party's advancement rule consistent. This avoids a running XP total, but requires the GM to make progress and delays legible.",
        },
        {
          term: "Neither is automatically fairer",
          text: "XP can favour one play style if only some activities earn points. Milestones can favour the GM's planned plot if only expected story beats count. Either method works better when players know the rule and see their choices matter under it.",
        },
      ],
    },
    {
      kind: "list",
      heading: "A decision guide by campaign style",
      intro:
        "These are starting points, not prescriptions. A system's own advancement rules may also shape the choice:",
      items: [
        {
          term: "Open sandbox",
          text: "Consider XP or objective-based XP so different player-chosen goals can all move the characters forward. Milestones can work too, but make room for accomplishments the GM did not predict.",
        },
        {
          term: "Procedural dungeon crawl",
          text: "Consider XP for discoveries, treasure recovered, objectives, or encounters, depending on what you want exploration to reward. A milestone after a major site or dungeon section reduces arithmetic but makes the pace less incremental.",
        },
        {
          term: "Strong story arcs",
          text: "Consider milestones tied to clear turning points or completed objectives. If the group wants progress between arcs, show smaller steps towards the next level.",
        },
        {
          term: "Published adventure with expected level bands",
          text: "Milestones can keep advancement near the adventure's intended challenges. Structured objective XP is another option if you want more player choice while preserving a planned pace.",
        },
        {
          term: "Players enjoy tracking progress",
          text: "Use XP or a visible milestone track. Either lets players judge how their actions contribute without asking the GM for a hidden timetable.",
        },
        {
          term: "The group wants little bookkeeping",
          text: "Milestones avoid a running total. Note the next agreed trigger in the campaign record so the rule remains clear without extra arithmetic.",
        },
        {
          term: "Exploration should matter as much as combat",
          text: "Award XP for discoveries and exploration objectives, or set a milestone for reaching and resolving a meaningful site. Name the reward before play makes the choice, where practical.",
        },
        {
          term: "The party should stay at one level",
          text: "Use shared XP awards or group milestones. XP does not have to be individual, and a milestone does not have to advance the whole party unless you choose that rule.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Make the rule and the progress visible",
      paragraphs: [
        "With XP, tell players what earns it and award comparable accomplishments consistently. You can reward recovered treasure, discoveries, completed objectives, faction goals, resolved problems, or role-specific achievements. The categories matter less than the signal: if negotiation and exploration are supposed to count, make sure the award rule actually recognises them. Avoid changing point values after the fact to steer the party towards a preferred plot.",
        "With milestones, name the kind of accomplishment that advances the campaign and track it openly. A short list of objectives or a progress clock can show that the party is moving towards a level without promising that every session produces one. Do not keep the trigger secret and then present the level as a surprise reward; the surprise is rarely worth the uncertainty about whether the players' choices mattered.",
      ],
    },
    {
      kind: "list",
      heading: "Hybrid approaches and their trade-offs",
      intro:
        "You can combine a visible reward signal with paced level-ups, but decide which part of the system controls the level:",
      items: [
        {
          term: "Objective or exploration XP",
          text: "Give points for stated goals, discoveries, or problems solved rather than making defeated enemies the default source. This supports varied approaches, but the GM still needs a fair way to value different accomplishments.",
        },
        {
          term: "A visible milestone track",
          text: "Mark steps towards a shared level-up as the party resolves agreed objectives. Players can see progress while the GM retains some control over the pace; define what earns a mark so the track does not become XP with hidden values.",
        },
        {
          term: "Per-session progress marks",
          text: "Give the group a mark after each session that meets an agreed condition, such as making progress on a chosen objective. This makes progress easy to track, but a fixed mark for attendance alone can reward showing up more than what happened in play.",
        },
        {
          term: "A set number of major accomplishments",
          text: "Advance after the party completes an agreed number of significant goals. It is easy to explain, though goals vary in difficulty, so decide whether each goal counts equally or whether some are worth more than one step.",
        },
        {
          term: "Shared XP awards",
          text: "Give the same points to every character for a session or objective. This keeps the XP total visible without splitting the party by attendance or individual actions, but it means personal achievements do not change level pace unless separately recognised.",
        },
        {
          term: "Small rewards between milestone levels",
          text: "Keep levels tied to campaign events, then recognise intervening play with modest non-level rewards such as a useful contact, access, reputation, or information. These give actions nearer-term consequences without quietly creating a second XP track.",
        },
        {
          term: "Personal rewards, shared party level",
          text: "Give a character-specific reward for a personal goal, such as a contact, training opportunity, or favour, while the party's level still advances together. Keep those rewards useful without making one character's mechanical power outpace the rest of the group.",
        },
      ],
    },
    {
      kind: "example",
      heading: "Four campaigns, four advancement signals",
      paragraphs: [
        "The same group can keep a similar pace with either method, but what players notice and pursue will change with the reward rule:",
      ],
      items: [
        {
          term: "Dungeon crawl",
          text: "A GM awards XP for recovered treasure, mapped passages, and discoveries, so the party sometimes sneaks past a guardian instead of fighting it. With milestones, the party advances after securing a major section; the GM marks the route forward on a visible site map so bypassing a fight still counts when it achieves the objective.",
        },
        {
          term: "Open-world sandbox",
          text: "The characters choose between clearing a bandit road, bargaining with a town council, or finding a lost shrine. Objective XP lets any of those declared goals contribute. A milestone version names several kinds of accomplishment in advance and records which the party has completed, rather than waiting for them to follow the GM's preferred hook.",
        },
        {
          term: "Political intrigue",
          text: "XP can reward securing an alliance, exposing a forged claim, or finding leverage, so advancement reflects more than winning a fight. A milestone can follow a change in who controls the council. Make the change observable: the party's ally gets a vote, a rival loses office, or a new faction controls the harbour.",
        },
        {
          term: "Episodic missions",
          text: "A mission-based campaign can grant XP for its objectives and let players see which parts of the assignment paid off. A milestone version can advance after selected missions or a major season turn. Either way, tell the group whether an optional success is advancement progress or a different kind of reward.",
        },
        {
          term: "Why it works",
          text: "Each method makes a different promise about the link between action and level. Naming that promise, and showing the consequence of progress, lets players choose their approach without guessing what the GM counts.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "How often should characters level up?",
      paragraphs: [
        "There is no useful session count for every campaign. Level frequency depends on the rules, campaign length, starting and intended ending levels, and how long the group wants to use each set of abilities before learning new ones. Decide what pace suits your table, then make the XP awards or milestone steps match it. The separate question of how often to level deserves its own guide; do not use a fixed schedule just because another campaign did.",
      ],
    },
    {
      kind: "checklist",
      heading: "Before choosing an advancement method",
      intro: "Agree on the rule before the next level is close:",
      items: [
        "What activities should count towards advancement: combat, exploration, objectives, social accomplishments, or some mix?",
        "Should characters earn progress individually, or should the whole party advance together?",
        "Can players tell how much progress they have made and what can move them forward?",
        "How much tracking does the group enjoy doing between sessions?",
        "If a player solves a problem in an unexpected way, can that still earn the reward the group agreed on?",
      ],
    },
  ],
  codexConnection: {
    heading: "Keep advancement agreements with campaign notes",
    paragraphs: [
      "Codex Cryptica's campaign manager can keep session notes and campaign records together, giving the group a place to record agreed milestone triggers or XP sources and the events that satisfy them. It does not decide what deserves a level; that remains a table rule.",
    ],
    linkText: "Explore the RPG campaign manager",
    href: "/solutions/campaign-manager",
  },
  relatedTopics: [
    {
      title: "RPG campaign manager",
      description:
        "Keep campaign records and session notes organised alongside advancement rules.",
      href: "/solutions/campaign-manager",
    },
  ],
  relatedAnswers: [
    "how-do-you-prepare-a-sandbox-rpg-campaign",
    "how-do-you-manage-a-campaign-timeline-in-an-rpg",
    "how-do-you-keep-track-of-time-in-a-tabletop-campaign",
  ],
  discovery: {
    id: "answer-xp-leveling-vs-milestone-leveling",
    parentCluster: "character-campaign-progression",
    clusters: ["character-campaign-progression"],
    primaryIntent:
      "choose between xp and milestone levelling in a tabletop rpg campaign",
    intentAliases: [
      "xp vs milestone leveling",
      "should I use XP or milestone leveling",
      "advantages of XP leveling",
      "advantages of milestone leveling",
      "how to award XP without encouraging combat",
      "milestone vs xp d&d",
    ],
    userJob: "evaluate",
    uniqueValue:
      "A system-neutral decision guide comparing the behaviour and pacing signalled by XP and milestone advancement, with hybrid options and worked examples across dungeon, sandbox, intrigue, and mission campaigns.",
    relatedIntents: [
      "answer-sandbox-campaign-prep",
      "answer-manage-campaign-timeline",
      "answer-track-time-in-campaign",
    ],
  },
  seo: {
    title: "XP vs Milestone Levelling: Which Should I Use? | Codex Cryptica",
    description:
      "Compare XP and milestone levelling, see how each shapes player behaviour and campaign pace, and choose a method or hybrid that fits your table.",
    image:
      "https://assets.codexcryptica.com/og/xp-leveling-vs-milestone-leveling.jpg",
    imageAlt:
      "A fantasy campaign map splits into a trail of experience tokens and a milestone track, then meets at a party approaching a lantern-lit doorway",
  },
};
