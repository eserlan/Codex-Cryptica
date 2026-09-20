import { DISCORD_URL, GITHUB_URL, REDDIT_URL, PATREON_URL } from "$lib/config";

export type ExploreLink = {
  href: string;
  label: string;
  summary: string;
  icon: string;
  external?: boolean;
};

export type ExploreSection = {
  title: string;
  description: string;
  links: ExploreLink[];
};

export const EXPLORE_SECTIONS: ExploreSection[] = [
  {
    title: "Build & Explore",
    description: "See the vault in action and generate content of your own.",
    links: [
      {
        href: "/features",
        label: "Features",
        summary:
          "See the core Codex workflow and the tools that connect your campaign.",
        icon: "icon-[lucide--layout-grid]",
      },
      {
        href: "/worlds",
        label: "Explore Worlds",
        summary: "Browse public vaults other worldbuilders have shared.",
        icon: "icon-[lucide--globe]",
      },
      {
        href: "/examples",
        label: "Examples",
        summary:
          "Curated, unedited generator output you can read in full and take straight to the table.",
        icon: "icon-[lucide--file-text]",
      },
      {
        href: "/generators",
        label: "Generators",
        summary:
          "The reusable generator interface: NPCs, factions, quests, and more, theme by theme.",
        icon: "icon-[lucide--sparkles]",
      },
      {
        href: "/tools",
        label: "Tools",
        summary:
          "Every standalone generator and utility, grouped by what you're building.",
        icon: "icon-[lucide--wrench]",
      },
      {
        href: "/silhouettes",
        label: "Vector Silhouettes",
        summary:
          "Curated, theme-reactive vector RPG silhouettes and token art for characters, creatures, and locations.",
        icon: "icon-[lucide--shapes]",
      },
    ],
  },
  {
    title: "Find Your Setup",
    description:
      "Campaign- and genre-specific guides to running Codex Cryptica.",
    links: [
      {
        href: "/for",
        label: "Campaign Directory",
        summary:
          "Find the right setup for your system, genre, or campaign style.",
        icon: "icon-[lucide--compass]",
      },
    ],
  },
  {
    title: "Learn",
    description:
      "Guides, answers, and the reasoning behind how Codex Cryptica works.",
    links: [
      {
        href: "/answers",
        label: "Answers",
        summary:
          "Short, direct answers to common worldbuilding and vault questions.",
        icon: "icon-[lucide--circle-help]",
      },
      {
        href: "/blog",
        label: "Devlog",
        summary: "Release notes, design decisions, and what's shipping next.",
        icon: "icon-[lucide--newspaper]",
      },
      {
        href: "/responsible-ai-worldbuilding",
        label: "Responsible AI",
        summary:
          "How Codex Cryptica uses AI, and where it deliberately doesn't.",
        icon: "icon-[lucide--shield-check]",
      },
      {
        href: "/migrations",
        label: "Import & Migrate",
        summary:
          "Bring a campaign in from another tool without losing your notes.",
        icon: "icon-[lucide--import]",
      },
      {
        href: "/resources/castle-floorplans",
        label: "Castle Floorplans",
        summary:
          "Curated links to real castle and palace floor plans for mapping your own locations.",
        icon: "icon-[lucide--map]",
      },
      {
        href: "/topics/heists",
        label: "RPG Heists Hub",
        summary:
          "Frameworks, prize design checklists, worked genre examples, and tools for running tabletop heists.",
        icon: "icon-[lucide--lock]",
      },
      {
        href: "/topics/puzzles",
        label: "RPG Puzzles Hub",
        summary:
          "Stall-proof design, hint ladders, worked examples with alternate solutions, and a puzzle generator.",
        icon: "icon-[lucide--puzzle]",
      },
      {
        href: "/my-stuff",
        label: "My Stuff",
        summary:
          "Your local bookmarks, saved answers, and shared generator results.",
        icon: "icon-[lucide--bookmark]",
      },
    ],
  },
  {
    title: "Community & Legal",
    description: "",
    links: [
      {
        href: DISCORD_URL,
        label: "Discord",
        summary: "Talk shop with other worldbuilders and get help fast.",
        icon: "icon-[lucide--message-circle]",
        external: true,
      },
      {
        href: REDDIT_URL,
        label: "Reddit",
        summary:
          "Follow devlogs and discuss Codex Cryptica with the community.",
        icon: "icon-[lucide--message-square]",
        external: true,
      },
      {
        href: GITHUB_URL,
        label: "GitHub",
        summary:
          "Codex Cryptica is open source. Read the code or file an issue.",
        icon: "icon-[lucide--github]",
        external: true,
      },
      {
        href: PATREON_URL,
        label: "Support on Patreon",
        summary: "Back development directly and get supporter perks.",
        icon: "icon-[lucide--heart]",
        external: true,
      },
      {
        href: "/changelog",
        label: "Changelog",
        summary: "Every release, in order.",
        icon: "icon-[lucide--list-checks]",
      },
      {
        href: "/sitemap.xml",
        label: "Sitemap",
        summary: "The full machine-readable list of every public page.",
        icon: "icon-[lucide--list-tree]",
      },
      {
        href: "/llms.txt",
        label: "LLM Docs",
        summary:
          "A plain-text index of the site for AI assistants and crawlers.",
        icon: "icon-[lucide--file-code]",
      },
      {
        href: "/privacy",
        label: "Privacy Policy",
        summary: "",
        icon: "icon-[lucide--lock]",
      },
      {
        href: "/terms",
        label: "Terms of Service",
        summary: "",
        icon: "icon-[lucide--scroll-text]",
      },
    ].filter((link) => link.href),
  },
];
