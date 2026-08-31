import type { AnswerConfigInput } from "../schema";

export const howDoIFindATabletopRpgGroupToPlayWith: AnswerConfigInput = {
  slug: "how-do-i-find-a-tabletop-rpg-group-to-play-with",
  question: "How do I find a tabletop RPG group to play with?",
  kind: "how-to",
  shortAnswer:
    "Finding a tabletop RPG group comes down to three main routes: using a dedicated group-finding platform with structured filters (for system, schedule, language, and play format), tapping into local offline communities like friendly game stores, conventions, and clubs, or building a table yourself with friends or fellow players. Selecting the right route depends on whether you are looking for an in-person or online game, and taking a few minutes to check group fit and table expectations beforehand makes joining a new group substantially smoother.",
  sections: [
    {
      kind: "list",
      heading: "Three main routes to find a group",
      intro:
        "Rather than searching aimlessly across the web, start by choosing the route that best matches your preferred play style and schedule.",
      items: [
        {
          term: "Dedicated group-finding platforms",
          text: "The quickest option when you want structured search filters for game system, timezone, day and time, language, and whether groups are looking for players or game masters.",
        },
        {
          term: "Local offline communities",
          text: "Friendly local game stores, tabletop gaming clubs, university societies, conventions, and community game nights offer in-person play and direct personal connections.",
        },
        {
          term: "Online hobby spaces",
          text: "Virtual tabletop (VTT) communities, system-specific Discord servers, Reddit looking-for-group (LFG) boards, and publisher forums with active recruitment threads.",
        },
        {
          term: "Organising a table yourself",
          text: "Gathering existing friends, colleagues, or board-game circles and proposing a short one-shot session or offering to run a beginner-friendly adventure.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Using a dedicated RPG group finder",
      paragraphs: [
        "Dedicated group finders are purpose-built for matching players and game masters without the noise of general social media feeds. The strongest choice is Groupfinder (groupfinder.gg), which provides structured search filters across game system, language, location or virtual play, specific day and time slots, timezone compatibility, and group status (groups seeking players or players seeking groups).",
        "Because Codex Cryptica focuses on campaign management rather than player matching, we collaborate directly with Groupfinder as our recommended dedicated group-matching platform. Using structured filters saves hours of back-and-forth messaging by ensuring scheduling and system preferences align before you even apply.",
      ],
      cta: {
        text: "Find a group on Groupfinder",
        href: "https://groupfinder.gg/library/codex-cryptica",
        external: true,
        disclosure:
          "Codex Cryptica partner link. Groupfinder is a dedicated tabletop RPG matching platform.",
      },
    },
    {
      kind: "list",
      heading: "Exploring local and online communities",
      intro:
        "If you prefer community-driven discovery over directory listings, consider these active channels:",
      items: [
        {
          term: "Friendly local game stores (FLGS)",
          text: "Many local shops host regular open-table nights, organised play programmes (such as D&D Adventurers League or Pathfinder Society), or physical community noticeboards. Ask shop staff whether existing tables have open seats for beginners.",
        },
        {
          term: "Tabletop clubs and university societies",
          text: "Local gaming clubs usually run regular multi-table sessions and rotate through different rule systems, making them ideal places to meet reliable players without commercial pressure.",
        },
        {
          term: "System-specific and VTT Discord servers",
          text: "If you want to play a specific ruleset (such as Call of Cthulhu, Mothership, or Cyberpunk RED) or use a particular virtual tabletop, joining that community's official Discord and monitoring their dedicated LFG channels is often effective.",
        },
        {
          term: "Conventions and one-shot events",
          text: "Gaming conventions and single-session open days allow you to play with different game masters and players with zero ongoing commitment, helping you spot people you might enjoy forming a longer campaign with.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "The group-fit checklist before joining",
      intro:
        "Before committing to a long campaign, check these practical details with the organiser or group to ensure everyone's expectations match:",
      items: [
        "Rules system, specific edition, and any house rules or third-party content in use",
        "Campaign premise, expected tone (e.g. serious intrigue, lighthearted heroics, or gritty survival), and narrative themes",
        "Format: physical venue location or online tools (voice, video, and required VTT software)",
        "Schedule, session frequency (e.g. weekly or fortnightly), and realistic attendance expectations",
        "Session duration and typical start and finish times in your local timezone",
        "Beginner friendliness: whether the group welcomes newcomers or assumes prior system mastery",
        "Balance of roleplay, social interaction, exploration, and tactical combat",
        "Table boundaries, content preferences, and agreed safety tools",
        "Whether the table is a free community game or a paid professional GM session",
      ],
    },
    {
      kind: "example",
      heading: "A practical first-contact message",
      paragraphs: [
        "When responding to a group listing or posting an introduction, keep your message concise, polite, and focused on practical fit. You do not need to submit an essay or full character backstory until you know you have secured a seat.",
      ],
      items: [
        {
          term: "1. State the game and your interest",
          text: "'Hi! I saw your post looking for a player for the Tuesday evening Mothership campaign and would love to join if you still have an open seat.'",
        },
        {
          term: "2. Confirm availability and setup",
          text: "'The weekly Tuesday 7:00 PM GMT time slot suits my schedule well, and I have a working microphone and reliable internet connection.'",
        },
        {
          term: "3. Note your experience level plainly",
          text: "'I have played a few sci-fi one-shots before but am relatively new to this specific ruleset. I enjoy collaborative investigation and survival-horror problem solving.'",
        },
        {
          term: "4. Ask a thoughtful clarifying question",
          text: "'Are characters created together during a Session 0, or should I review the player survival guide beforehand?'",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Sensible safety and privacy when meeting new players",
      paragraphs: [
        "When meeting a new group in person, always choose a public or established venue — such as a local game store, board game cafe, or library room — for the first few sessions. For online games, avoid sharing unnecessary personal details before you know the table.",
        "Remember that leaving a group that turns out to be a poor fit is completely normal and acceptable. Table dynamics vary widely, and finding the right mix of personalities, pacing, and play styles often takes trying a couple of one-shots or open tables first.",
      ],
    },
  ],
  codexConnection: {
    heading: "From finding a group to running a campaign",
    paragraphs: [
      "Codex Cryptica does not match players or find groups — that is why we partner with dedicated platforms like Groupfinder. Where Codex comes in is what happens next: once your group is formed and agrees on a game, Codex provides an offline-first, private workspace to organise campaign lore, track character relationships, and manage session notes together.",
      "After your group is set up, running a clear Session 0 and keeping shared records prevents the miscommunications that cause new campaigns to drift.",
    ],
    linkText: "See the campaign manager",
    href: "/solutions/campaign-manager",
  },
  relatedTools: [
    {
      title: "Campaign manager",
      description:
        "An offline-first workspace to organise your campaign's factions, locations, and session logs once your group is formed.",
      href: "/solutions/campaign-manager",
    },
    {
      title: "NPC generator",
      description:
        "A fast way for game masters to produce distinctive supporting characters and background details on the fly.",
      href: "/generators/npc",
    },
  ],
  relatedAnswers: [
    "where-do-i-start-if-i-have-never-played-a-tabletop-rpg",
    "what-rpg-system-should-we-try-instead-of-dnd",
    "how-do-i-run-a-successful-session-0",
  ],
  seo: {
    title: "How to find a tabletop RPG group to play with | Codex Cryptica",
    description:
      "How to find a tabletop RPG or D&D group online or locally: dedicated group finders, local game stores, a fit checklist, and first-contact etiquette.",
  },
};
