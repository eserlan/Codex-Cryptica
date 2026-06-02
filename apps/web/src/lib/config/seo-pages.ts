export interface SEOPageData {
  slug: string;
  title: string;
  description: string;
  h1: string;
  subheading: string;
  introText: string;
  faq: Array<{
    question: string;
    answer: string;
  }>;
  ctaText: string;
  keywords: string[];
  features: Array<{
    title: string;
    description: string;
    icon: string;
  }>;
}

export interface SEOComparisonPageData extends SEOPageData {
  competitorName: string;
  comparisonTable: Array<{
    feature: string;
    competitorHas: boolean | string;
    codexHas: boolean | string;
  }>;
  verdict: string;
}

export const solutions: Record<string, SEOPageData> = {
  "campaign-manager": {
    slug: "campaign-manager",
    title: "Best Free RPG Campaign Manager | Codex Cryptica",
    description:
      "Manage your TTRPG campaigns with Codex Cryptica's local-first campaign manager. Secure, fast, and feature-rich lore database.",
    h1: "The Ultimate Local-First RPG Campaign Manager",
    subheading:
      "Keep your campaign lore organized, connected, and completely private.",
    introText:
      "Codex Cryptica is a modern RPG campaign management tool designed for GMs who value privacy, speed, and deep worldbuilding relationships. Unlike server-hosted managers, your campaign data remains on your local machine, allowing you to access it offline with zero lag.",
    ctaText: "Start Managing Campaigns",
    keywords: [
      "rpg campaign manager",
      "campaign manager",
      "dnd campaign manager",
      "ttrpg campaign organizer",
    ],
    features: [
      {
        title: "Bidirectional Wiki Links",
        description:
          "Link characters, locations, and sessions instantly with simple wiki-style shortcuts.",
        icon: "icon-[lucide--link]",
      },
      {
        title: "Lore Database",
        description:
          "Structure your campaigns using customizable categories, templates, and timeline metadata.",
        icon: "icon-[lucide--database]",
      },
      {
        title: "Local-First Storage",
        description:
          "All files reside in your browser's private filesystem, offering offline support and security.",
        icon: "icon-[lucide--shield-check]",
      },
    ],
    faq: [
      {
        question: "Is my campaign data safe?",
        answer:
          "Yes. Codex Cryptica uses local-first storage, meaning your campaign files are stored on your device and are never uploaded to a remote server without your permission.",
      },
      {
        question: "Can I use it offline?",
        answer:
          "Absolutely. Because all data is stored locally in your browser's Origin Private File System, the entire editor and graph engine run without an active internet connection.",
      },
    ],
  },
  "worldbuilding-tool": {
    slug: "worldbuilding-tool",
    title:
      "Free Worldbuilding Tool & Interactive Lore Database | Codex Cryptica",
    description:
      "Design rich fantasy worlds with an interactive knowledge graph, customizable timelines, and local-first wiki files.",
    h1: "Interactive Worldbuilding Tool & Campaign Database",
    subheading:
      "Map your fantasy worlds visually with local-first bidirectional linking.",
    introText:
      "Codex Cryptica provides an advanced visual workspace for authors, GMs, and worldbuilders. Construct timelines, link factions, map settlements, and visualize relationships in an interactive knowledge graph that works fully offline.",
    ctaText: "Start Worldbuilding",
    keywords: [
      "worldbuilding tool",
      "free worldbuilding software",
      "fantasy world creator",
      "lore database",
    ],
    features: [
      {
        title: "Interactive Graph View",
        description:
          "Visualize how factions, characters, and events connect in an interactive node-link relationship diagram.",
        icon: "icon-[lucide--git-fork]",
      },
      {
        title: "Chronological Timelines",
        description:
          "Map historical eras, campaign logs, and character life events on a temporal timeline scale.",
        icon: "icon-[lucide--calendar]",
      },
      {
        title: "Private Offline Vaults",
        description:
          "Own your files. Codex Cryptica reads and writes markdown files locally, ensuring zero data lock-in.",
        icon: "icon-[lucide--folder-heart]",
      },
    ],
    faq: [
      {
        question: "Can I export my world data?",
        answer:
          "Yes, your vaults are saved as simple, standard Markdown files with YAML frontmatter. You can open them in any text editor or move them to another tool at any time.",
      },
      {
        question: "Does it support custom calendars?",
        answer:
          "Yes, the chronological timeline engine handles custom calendar definitions, fantasy months, and historical epoch calculations.",
      },
    ],
  },
  "ai-gm-assistant": {
    slug: "ai-gm-assistant",
    title: "Local-First AI GM Assistant & Lore Co-Author | Codex Cryptica",
    description:
      "Co-author campaign notes and generate fantasy details using Codex Cryptica's local-first AI Lore Oracle.",
    h1: "Co-Author Lore with the AI GM Assistant",
    subheading:
      "Prompt, synthesize, and create structured character and quest records with a local AI partner.",
    introText:
      "Supercharge your worldbuilding using Codex Cryptica's integrated Lore Oracle. Generate consistent NPC details, settlement layouts, or plot hooks directly inside your workspace using secure, private AI models that respect your campaign context.",
    ctaText: "Meet the AI Assistant",
    keywords: [
      "ai gm assistant",
      "rpg ai assistant",
      "ai campaign generator",
      "dnd dungeon master assistant",
    ],
    features: [
      {
        title: "Context-Aware Oracle",
        description:
          "The AI co-author reads your active folder structure and notes to generate relevant and cohesive additions.",
        icon: "icon-[lucide--sparkles]",
      },
      {
        title: "Category Templates",
        description:
          "Instantly convert raw AI chat outputs into structured entity files (characters, factions, items) with one click.",
        icon: "icon-[lucide--clipboard-list]",
      },
      {
        title: "Local AI Security",
        description:
          "Keep your prompts private. Configure your own API keys or use the default system proxy to start co-authoring safely.",
        icon: "icon-[lucide--eye-off]",
      },
    ],
    faq: [
      {
        question: "Do I need a paid AI subscription?",
        answer:
          "No. Codex Cryptica provides a shared system proxy for immediate free AI assistance, and allows you to supply your own Gemini API key for unlimited usage.",
      },
      {
        question: "Is my campaign prompt context secure?",
        answer:
          "Yes, your campaign text is sent directly to the LLM API provider and is never stored on our servers.",
      },
    ],
  },
  "local-first-rpg": {
    slug: "local-first-rpg",
    title: "Local-First RPG Wiki & Private Campaign Notes | Codex Cryptica",
    description:
      "A modern, local-first wiki designed for TTRPG campaigns. Completely private, secure, and lightning-fast.",
    h1: "Local-First, Zero-Lockin RPG Campaign Wiki",
    subheading: "True data ownership for game masters and authors.",
    introText:
      "Codex Cryptica is designed around local-first architecture. Instead of renting access to your own campaign notes from server-hosted apps, Codex saves files directly to your device via standard browser APIs, guaranteeing privacy, lifetime access, and maximum performance.",
    ctaText: "Create a Private Vault",
    keywords: [
      "local first rpg",
      "private rpg wiki",
      "offline campaign organizer",
      "secure dungeon master notes",
    ],
    features: [
      {
        title: "100% Data Privacy",
        description:
          "Your files never touch third-party servers. Your world remains confidential, protected from server shutdowns and data leaks.",
        icon: "icon-[lucide--lock]",
      },
      {
        title: "OPFS Performance",
        description:
          "Utilizes browser-native Origin Private File System for database-like speed and robust local indexing.",
        icon: "icon-[lucide--gauge]",
      },
      {
        title: "Zero Lock-In",
        description:
          "Vaults are plain Markdown files with YAML metadata. Move your notes in and out of Codex Cryptica whenever you want.",
        icon: "icon-[lucide--download]",
      },
    ],
    faq: [
      {
        question: "Where are my campaign files stored?",
        answer:
          "Your files are stored in your browser's Origin Private File System (OPFS), which is sandboxed storage on your computer. You can also sync them to local folders or Google Drive.",
      },
      {
        question: "Can I host my campaign online?",
        answer:
          "Yes. Codex supports P2P guest sessions where you can host campaigns directly from your browser to your players.",
      },
    ],
  },
};

export const comparisons: Record<string, SEOComparisonPageData> = {
  obsidian: {
    slug: "obsidian",
    competitorName: "Obsidian",
    title: "Codex Cryptica vs Obsidian: Best RPG Campaign Manager Comparison",
    description:
      "How does Codex Cryptica stack up against Obsidian for RPG campaign management? Compare features, graphs, and offline worldbuilding.",
    h1: "Codex Cryptica vs Obsidian",
    subheading:
      "A local-first comparison for RPG campaign managers and worldbuilders.",
    introText:
      "Both Obsidian and Codex Cryptica offer powerful local-first markdown linking, but they target different goals. Obsidian is a general-purpose note-taking application requiring multiple community plugins to manage campaigns, whereas Codex Cryptica is built from the ground up for TTRPG mechanics, maps, timelines, and relationships.",
    ctaText: "Try Codex Cryptica",
    keywords: [
      "codex cryptica vs obsidian",
      "obsidian rpg campaign manager",
      "best obsidian alternative for dnd",
    ],
    features: [
      {
        title: "RPG Specific Schemas",
        description:
          "Built-in campaign templates for characters, events, factions, and locations, rather than generic blank pages.",
        icon: "icon-[lucide--user]",
      },
      {
        title: "Chronology Timeline Engine",
        description:
          "Native temporal maps supporting custom calendars and historical eras without relying on plugin code.",
        icon: "icon-[lucide--calendar-days]",
      },
      {
        title: "Zero-Setup AI Co-author",
        description:
          "Immediate context-aware RPG generation with no external API configuration needed.",
        icon: "icon-[lucide--sparkles]",
      },
    ],
    comparisonTable: [
      {
        feature: "Local-First Markdown Store",
        competitorHas: "Yes",
        codexHas: "Yes",
      },
      {
        feature: "Out-of-the-box RPG Schemas",
        competitorHas: "No (Requires plugins)",
        codexHas: "Yes",
      },
      {
        feature: "Built-in Interactive Graph",
        competitorHas: "Yes (Generic note link)",
        codexHas: "Yes (Interactive relation mapping)",
      },
      {
        feature: "Custom Campaign Calendars",
        competitorHas: "No",
        codexHas: "Yes",
      },
      {
        feature: "Zero-Setup AI Lore Oracle",
        competitorHas: "No (Requires setup)",
        codexHas: "Yes",
      },
      {
        feature: "P2P Guest Play/Session Hosting",
        competitorHas: "No",
        codexHas: "Yes",
      },
    ],
    verdict:
      "While Obsidian is an exceptional general-purpose tool, Codex Cryptica delivers a specialized workspace dedicated specifically to campaign running and writing, eliminating the need to debug complicated community plugin stacks before game night.",
    faq: [
      {
        question: "Can I import my Obsidian vaults into Codex?",
        answer:
          "Yes. Since Codex uses standard Markdown files and YAML frontmatter, you can open your existing Obsidian campaign folders directly as a Codex Cryptica vault.",
      },
      {
        question: "Do I need to configure plugins in Codex?",
        answer:
          "No, core features like timelines, connection proposals, character generators, and interactive maps are built natively into Codex.",
      },
    ],
  },
  "world-anvil": {
    slug: "world-anvil",
    competitorName: "World Anvil",
    title: "Codex Cryptica vs World Anvil: Private vs Cloud Worldbuilding",
    description:
      "Compare Codex Cryptica and World Anvil. Discover the differences between local-first privacy and online subscription-based worldbuilding.",
    h1: "Codex Cryptica vs World Anvil",
    subheading:
      "Choose between private local vaults and online cloud worldbuilding.",
    introText:
      "World Anvil is a cloud-based suite for worldbuilding, but it stores all your notes on remote servers and locks advanced features behind monthly paywalls. Codex Cryptica provides a modern local-first alternative that is 100% free, private, and runs entirely in your browser with offline support.",
    ctaText: "Get Free Local Vault",
    keywords: [
      "codex cryptica vs world anvil",
      "world anvil alternative",
      "private worldbuilding tool",
    ],
    features: [
      {
        title: "100% Client-Side Privacy",
        description:
          "Your campaign notes remain fully private, encrypted by the sandbox, and are never sent to remote databases.",
        icon: "icon-[lucide--shield-alert]",
      },
      {
        title: "Offline Autonomy",
        description:
          "Work on your campaign at the gaming table, on a plane, or in cabin retreats without requiring internet connection.",
        icon: "icon-[lucide--wifi-off]",
      },
      {
        title: "Standard Markdown Files",
        description:
          "Your world wiki is saved as readable files on your computer. No vendor lock-in or database extraction limits.",
        icon: "icon-[lucide--file-text]",
      },
    ],
    comparisonTable: [
      {
        feature: "Offline Compatibility",
        competitorHas: "No (Cloud only)",
        codexHas: "Yes",
      },
      {
        feature: "Data Privacy & Local Storage",
        competitorHas: "No (Hosted)",
        codexHas: "Yes",
      },
      {
        feature: "Price",
        competitorHas: "Paid tier for privacy/large assets",
        codexHas: "100% Free & Open Source",
      },
      {
        feature: "Page Load Speed",
        competitorHas: "Slow (Server dependent)",
        codexHas: "Instant (Zero-lag local)",
      },
      {
        feature: "No-Setup AI Assistance",
        competitorHas: "No (Behind paywall)",
        codexHas: "Yes",
      },
      {
        feature: "Markdown & Folder Sync",
        competitorHas: "No",
        codexHas: "Yes",
      },
    ],
    verdict:
      "For creators who want total control over their creative property, fast load times, and offline access, Codex Cryptica is the ideal choice. Choose World Anvil if you prefer hosting collaborative wikis directly on their web servers.",
    faq: [
      {
        question: "Is Codex Cryptica completely free?",
        answer:
          "Yes, Codex is free and open-source. There are no paywalls or storage restrictions on your local campaigns.",
      },
      {
        question: "How do players access my Codex campaign?",
        answer:
          "You can host local P2P session maps directly from your browser, allowing players to join without creating an account or paying.",
      },
    ],
  },
  legendkeeper: {
    slug: "legendkeeper",
    competitorName: "LegendKeeper",
    title: "Codex Cryptica vs LegendKeeper: Offline RPG Wiki Comparison",
    description:
      "Compare Codex Cryptica vs LegendKeeper. Learn the benefits of browser-local storage compared to closed cloud wikis.",
    h1: "Codex Cryptica vs LegendKeeper",
    subheading:
      "A comparison of offline-ready RPG wikis and campaign planners.",
    introText:
      "LegendKeeper is a fast, beautifully designed campaign manager, but it is a closed cloud service that requires paid hosting. Codex Cryptica brings the same fluid, interactive wiki experience directly to your browser as a local-first, privacy-respecting tool.",
    ctaText: "Try Private Wiki",
    keywords: [
      "codex cryptica vs legendkeeper",
      "legendkeeper alternative",
      "free campaign wiki",
    ],
    features: [
      {
        title: "Cytoscape Relations Map",
        description:
          "Natively track relationships between factions, guilds, and NPCs using the interactive graph explorer.",
        icon: "icon-[lucide--network]",
      },
      {
        title: "Local Vault Syncing",
        description:
          "Automatically mirror your browser sandbox files to a standard directory on your computer's drive.",
        icon: "icon-[lucide--refresh-cw]",
      },
      {
        title: "Structured Frontmatter",
        description:
          "Integrate custom templates and standard entity metadata directly into the Markdown files.",
        icon: "icon-[lucide--file-json]",
      },
    ],
    comparisonTable: [
      { feature: "Rich Text Editing", competitorHas: "Yes", codexHas: "Yes" },
      {
        feature: "Local-First File Support",
        competitorHas: "No (Cloud database)",
        codexHas: "Yes (OPFS / Folder Sync)",
      },
      {
        feature: "Interactive Graph Relations",
        competitorHas: "No (Map pins only)",
        codexHas: "Yes",
      },
      {
        feature: "AI Co-Author Integration",
        competitorHas: "No",
        codexHas: "Yes",
      },
      {
        feature: "Open Data Access",
        competitorHas: "No (Closed)",
        codexHas: "Yes (Standard Markdown)",
      },
    ],
    verdict:
      "If you love the aesthetic of LegendKeeper but want true data ownership, standard file formats, and no subscription fees, Codex Cryptica provides a powerful, free alternative that keeps your notes safe on your own machine.",
    faq: [
      {
        question: "Can I back up my campaign?",
        answer:
          "Yes, you can copy your vault files directly from your computer, sync them with local directories, or configure automatic Google Drive backups.",
      },
      {
        question: "Does Codex support mapping?",
        answer:
          "Yes, Codex includes spatial canvas and relationship nodes, with encounter tracking features.",
      },
    ],
  },
};
