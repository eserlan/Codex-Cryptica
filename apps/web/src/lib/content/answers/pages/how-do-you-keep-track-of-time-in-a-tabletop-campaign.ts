import type { AnswerConfigInput } from "../schema";

export const howDoYouKeepTrackOfTimeInATabletopCampaign: AnswerConfigInput = {
  slug: "how-do-you-keep-track-of-time-in-a-tabletop-campaign",
  category: "campaign-notes",
  question: "How do you keep track of time in a tabletop campaign?",
  kind: "framework",
  shortAnswer:
    "To manage time effectively across a tabletop campaign, track gameplay through three distinct operational tiers: ten-minute dungeon exploration turns for tactical resource expenditure, four-to-six-hour travel watches for overland journey pacing, and an overarching campaign calendar paired with ticking faction clocks to ensure the world advances dynamically whether the party acts or rests.",
  sections: [
    {
      kind: "prose",
      heading: "Time is the primary currency of table tension",
      paragraphs: [
        "In many tabletop campaigns, time is treated as casual background flavour rather than a consequential game mechanic. When a Game Master handwaves the passage of hours, players quickly realise that their decisions carry no logistical weight. They take long rests after every minor skirmish, cast ritual spells indefinitely, and spend entire afternoons searching empty rooms because there is no friction or consequence to delay.",
        "Strict time tracking transforms passive exploration into an active challenge. When every ten minutes spent picking a stubborn lock risks burning down a torch or attracting wandering patrols, choices acquire immediate urgency. Connecting micro-level dungeon actions to macro-level campaign calendars ensures the living world continues moving forward around the protagonists.",
      ],
    },
    {
      kind: "list",
      heading: "The three-tier campaign time framework",
      intro:
        "Structure campaign time across three separate operational tiers to maintain manageable bookkeeping:",
      items: [
        {
          term: "Tactical Dungeon Turns (10 Minutes)",
          text: "Used during subterranean exploration, infiltration, and investigative site crawls. Every major deliberate group action (searching a chamber, picking a complex chest, or tending to wounds) consumes one turn. Every second turn burns torchlight, and every third turn triggers an encounter check.",
        },
        {
          term: "Overland Travel Watches (4 to 6 Hours)",
          text: "Divides the day into four operational blocks: morning travel, afternoon travel, evening camp setup, and night rest. Each watch consumes water, requires navigation checks, and checks for weather fluctuations or wilderness encounters.",
        },
        {
          term: "Campaign Calendar and Faction Clocks",
          text: "The macro calendar logs seasonal changes, holidays, full moons, and trade caravan arrivals. Pair this calendar with segmented faction clocks (four- to eight-segment progress wheels) that advance villain plots and political rivalries whenever players take downtime or extended journeys.",
        },
      ],
      outro:
        "Operating at the correct scale prevents both analysis paralysis in the wilderness and loose handwaving in dangerous vaults.",
    },
    {
      kind: "list",
      heading: "Operational time scales and table mechanics",
      intro:
        "Manage mechanics and table consequences across each scale of campaign time:",
      items: [
        {
          term: "Dungeon Turn (10 minutes)",
          text: "Tracked with a six-sided die counting up from 1 to 6 on the table. Torches extinguish at turn 6; wandering patrol check rolled every 2 turns.",
        },
        {
          term: "Travel Watch (4 to 6 hours)",
          text: "Tracked with a four-box daily card. Deducts rations and water; forced marches inflict physical exhaustion.",
        },
        {
          term: "Campaign Day",
          text: "Logged on a grid calendar marking moon phases and seasons. Resets daily spell slots, incurs lifestyle costs, and shifts regional weather.",
        },
        {
          term: "Faction Downtime (Weeks)",
          text: "Tracked via segmented circular wheels. Advances rival recruitments, fortification building, or village sieges during character downtime.",
        },
      ],
    },
    {
      kind: "example",
      heading: "Worked scenario: Pacing the Barrow Mound Expedition",
      paragraphs: [
        "Contrast unmeasured dungeon exploration against systematic time tracking during a competitive dungeon crawl.",
      ],
      items: [
        {
          term: "The handwaved exploration approach",
          text: "The Game Master did not track time during the descent. The players cast ritual spells four times, thoroughly checked every flagged paving stone, and decided to take an eight-hour rest inside the burial foyer after fighting two skeletons. They suffered no consequences and found the treasure without pressure.",
        },
        {
          term: "The three-tier time tracker approach",
          text: "The Game Master places a large d6 on the table. Each 10-minute turn advances the die by one. Searching an ornate sarcophagus takes one turn. Ritual casting consumes two turns. On turn three, the party lantern guttered and a ghoul patrol attacked. When the players declared they wanted an eight-hour rest, the Game Master calmly noted that eight hours equals forty-eight exploration turns, and advanced the rival mercenary company four-segment clock to completion. When the party woke, the inner crypt was already looted and the mercenaries were marching away with the relic.",
        },
        {
          term: "Why it works",
          text: "Visible time tracking eliminated the five-minute adventuring day without arbitrary restrictions. Players made informed risk-reward trade-offs because every minute spent had an observable, systemic cost.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Campaign time management checklist",
      intro:
        "Incorporate these routine bookkeeping habits into your regular session rhythm:",
      items: [
        "Keep a visible physical tracker (such as a d6 or tokens) on the table for dungeon turns.",
        "Explicitly announce the passage of turns when players undertake prolonged activities.",
        "Establish an in-world campaign calendar with distinct days, months, and seasonal weather trends.",
        "Log the current calendar date at the top of every session recap document.",
        "Advance enemy faction clocks openly or privately whenever the party takes a full day of rest.",
        "Track moon cycles and celestial events if your setting features lycanthropy, tides, or astrological magic.",
      ],
    },
  ],
  codexConnection: {
    heading: "Chronicle campaign timelines in Codex Cryptica",
    paragraphs: [
      "Codex Cryptica includes an integrated campaign timeline and calendar engine. You can log session events, track seasonal shifts, and tie historical milestones directly to world entities.",
      "Manage faction downtime clocks and active villain schedules alongside your session notes, ensuring your campaign world stays reactive and urgent from session one to the finale.",
    ],
    linkText: "Track campaign timelines in Codex Cryptica",
    href: "/solutions/campaign-manager",
  },
  relatedTools: [
    {
      title: "Dungeon generator",
      description:
        "Produce modular dungeon environments complete with patrol routes and environmental hazards.",
      href: "/generators/dungeon-generator",
    },
    {
      title: "Faction generator",
      description:
        "Create competing factions with active agendas and ticking operational timelines.",
      href: "/generators/faction",
    },
    {
      title: "Quest generator",
      description:
        "Generate time-sensitive patron quests, rival expeditions, and escalating threats.",
      href: "/generators/quest",
    },
  ],
  relatedAnswers: [
    "what-should-i-look-for-in-an-rpg-campaign-manager",
    "how-do-you-prep-a-weekly-rpg-session-quickly",
    "how-do-you-run-a-heist-in-a-tabletop-rpg",
    "how-do-you-start-worldbuilding-from-scratch",
  ],
  discovery: {
    id: "answer-track-time-in-campaign",
    parentCluster: "campaign-management",
    primaryIntent: "how to keep track of time in a tabletop campaign",
    intentAliases: [
      "tracking time in dnd",
      "ttrpg time tracking guide",
      "how to track time in an rpg campaign",
      "dungeon turns and travel watches",
      "campaign calendar management",
      "pacing time in tabletop rpgs",
    ],
    userJob: "adopt-workflow",
    uniqueValue:
      "A three-tier tabletop time-tracking framework linking 10-minute dungeon turns, 4-hour travel watches, and ticking faction clocks into an engine of table urgency.",
    relatedIntents: [
      "answer-prep-weekly-session-quickly",
      "answer-run-heist-in-tabletop-rpg",
      "answer-worldbuilding-from-scratch",
    ],
  },
  seo: {
    title:
      "How to Keep Track of Time in a Tabletop RPG Campaign | Codex Cryptica",
    description:
      "Master time tracking in your tabletop RPG. Learn how to manage 10-minute dungeon turns, overland travel watches, and ticking faction clocks to maintain table tension.",
    image:
      "https://assets.codexcryptica.com/og/how-do-you-keep-track-of-time-in-a-tabletop-campaign.jpg",
    imageAlt:
      "Illustration of an adventurer holding a sputtering torch while checking an antique bronze hourglass inside a dark stone dungeon corridor",
  },
};
