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
  /** Hero badge text. Defaults to "100% Local-First Campaign Wiki". */
  eyebrow?: string;
  /** Optional second button in the hero. */
  secondaryCtaText?: string;
  secondaryCtaHref?: string;
  /** Links shown in a "Related pages" section above the FAQ. */
  relatedLinks?: Array<{ href: string; label: string }>;
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
      "Manage your TTRPG campaigns with Codex Cryptica's secure, zero-lag, local-first campaign manager. Keep your notes private and fully offline.",
    h1: "The Ultimate Local-First RPG Campaign Manager",
    subheading:
      "Keep your campaign lore organized, connected, and completely private.",
    introText:
      "Codex Cryptica is a modern RPG campaign management tool designed for GMs who value privacy, speed, and deep worldbuilding relationships. Unlike server-hosted managers, your campaign data remains on your local machine, delivering instant, zero-lag note loading during live sessions, even fully offline.",
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
          "Yes. Codex Cryptica stores all campaign files directly on your own device. Your notes are never uploaded to a remote server, giving you complete privacy and instant loading speeds.",
      },
      {
        question: "Can I use it offline?",
        answer:
          "Absolutely. Because all data is stored on your local device, the entire campaign manager, editor, and interactive graph run perfectly without an internet connection.",
      },
    ],
    relatedLinks: [
      { href: "/solutions/worldbuilding-tool", label: "Worldbuilding tool" },
      { href: "/solutions/local-first-rpg", label: "Local-first RPG" },
      {
        href: "/free-rpg-campaign-manager",
        label: "Free RPG campaign manager",
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
    relatedLinks: [
      { href: "/solutions/campaign-manager", label: "Campaign manager" },
      { href: "/solutions/rpg-knowledge-graph", label: "RPG knowledge graph" },
      { href: "/vs/obsidian", label: "vs Obsidian" },
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
    relatedLinks: [
      { href: "/solutions/ai-dm-assistant", label: "AI DM assistant" },
      {
        href: "/solutions/ai-worldbuilding-tool",
        label: "AI worldbuilding tool",
      },
      { href: "/tools/dnd-npc-generator", label: "D&D NPC generator" },
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
    relatedLinks: [
      {
        href: "/solutions/offline-rpg-campaign-manager",
        label: "Offline campaign manager",
      },
      {
        href: "/solutions/local-first-worldbuilding-tool",
        label: "Local-first worldbuilding",
      },
      { href: "/vs/world-anvil", label: "vs World Anvil" },
    ],
  },
  "ai-dm-assistant": {
    slug: "ai-dm-assistant",
    eyebrow: "AI-Assisted Game Mastering",
    title: "AI DM Assistant | AI Game Master Helper for TTRPG | Codex Cryptica",
    description:
      "Use Codex Cryptica's built-in AI DM assistant to draft lore, generate NPCs, revise session notes, and answer campaign questions — all without leaving your vault.",
    h1: "AI DM Assistant for Tabletop GMs",
    subheading:
      "Draft, revise, and expand your campaign lore with a built-in AI co-author.",
    introText:
      "Codex Cryptica includes an AI-assisted writing layer called the Lore Oracle. It reads your campaign context, answers questions about your world, helps you draft NPC descriptions and faction goals, and suggests revisions to existing entries — all running locally with your own API key.",
    ctaText: "Try the Lore Oracle",
    secondaryCtaText: "See AI generators",
    secondaryCtaHref: "/tools/dnd-npc-generator",
    keywords: [
      "ai dm assistant",
      "ai game master helper",
      "ai dungeon master tool",
      "rpg ai assistant",
      "ttrpg ai writing tool",
    ],
    features: [
      {
        title: "Context-Aware Lore Oracle",
        description:
          "The AI reads your existing campaign entities and drafts new content that fits your established world.",
        icon: "icon-[lucide--bot]",
      },
      {
        title: "Inline Revision Suggestions",
        description:
          "Select any text in your notes and ask the Oracle to expand, condense, or rewrite it in your campaign's voice.",
        icon: "icon-[lucide--pencil]",
      },
      {
        title: "Bring Your Own API Key",
        description:
          "Connect your Gemini or OpenAI key for full AI generation — no subscription or data sent to Codex servers.",
        icon: "icon-[lucide--key]",
      },
    ],
    relatedLinks: [
      { href: "/tools/dnd-npc-generator", label: "D&D NPC generator" },
      { href: "/tools/quest-hook-generator", label: "Quest hook generator" },
      { href: "/solutions/ai-gm-assistant", label: "AI GM assistant solution" },
    ],
    faq: [
      {
        question: "Does the AI DM assistant require a subscription?",
        answer:
          "No. You bring your own API key (Gemini or OpenAI). Codex never charges for AI usage — you pay only your API provider's standard rates.",
      },
      {
        question: "Does the AI see my campaign notes?",
        answer:
          "Only when you ask it to. The Oracle reads selected entities or passages you explicitly share with it. Nothing is sent automatically.",
      },
      {
        question: "Can it generate NPCs, quests, and factions?",
        answer:
          "Yes. The public generators on this site use the same underlying AI layer. When used inside the app it also has access to your existing campaign context.",
      },
    ],
  },
  "ai-worldbuilding-tool": {
    slug: "ai-worldbuilding-tool",
    eyebrow: "AI-Assisted Worldbuilding",
    title:
      "AI Worldbuilding Tool | AI-Assisted Lore & World Design | Codex Cryptica",
    description:
      "Build richer worlds faster with Codex Cryptica's AI worldbuilding tools. Generate factions, places, histories, and lore drafts that stay consistent with your existing campaign.",
    h1: "AI-Assisted Worldbuilding Tool",
    subheading:
      "Expand your world's depth with AI-generated lore that fits your campaign.",
    introText:
      "Codex Cryptica combines a local-first campaign wiki with an AI co-author that understands your world. Ask it to draft a new faction's history, suggest names for a city district, or write a rumour your party might hear — all grounded in the lore you've already written.",
    ctaText: "Start Building Your World",
    secondaryCtaText: "Try name generator",
    secondaryCtaHref: "/tools/fantasy-name-generator",
    keywords: [
      "ai worldbuilding tool",
      "ai worldbuilding",
      "ai lore generator",
      "worldbuilding ai assistant",
      "fantasy world builder ai",
    ],
    features: [
      {
        title: "Entity-Aware Generation",
        description:
          "The AI reads your existing characters, locations, and factions before generating new content, keeping lore consistent.",
        icon: "icon-[lucide--sparkles]",
      },
      {
        title: "Graph-Connected Wiki",
        description:
          "Every generated entry links to related entities in your campaign graph — people, places, and events stay connected.",
        icon: "icon-[lucide--network]",
      },
      {
        title: "Local-First Privacy",
        description:
          "All your worldbuilding notes stay on your device. AI calls are direct to your API key — no data stored on Codex servers.",
        icon: "icon-[lucide--shield-check]",
      },
    ],
    relatedLinks: [
      {
        href: "/tools/fantasy-name-generator",
        label: "Fantasy name generator",
      },
      { href: "/tools/faction-generator", label: "Faction generator" },
      { href: "/solutions/worldbuilding-tool", label: "Worldbuilding tool" },
    ],
    faq: [
      {
        question: "How is this different from ChatGPT for worldbuilding?",
        answer:
          "The Lore Oracle has access to your existing campaign entities so it generates content that fits your established lore rather than generic fantasy tropes.",
      },
      {
        question: "Can I use it for non-D&D settings?",
        answer:
          "Yes. Codex supports any genre — sci-fi, horror, historical, urban fantasy — and the AI adapts to the tone and terminology of your world.",
      },
      {
        question: "Does it work offline?",
        answer:
          "The wiki and graph work fully offline. AI generation requires an internet connection to reach your API provider.",
      },
    ],
  },
  "rpg-knowledge-graph": {
    slug: "rpg-knowledge-graph",
    eyebrow: "Campaign Knowledge Graph",
    title:
      "RPG Knowledge Graph | Visual Campaign Map for TTRPGs | Codex Cryptica",
    description:
      "Visualise your RPG campaign as an interactive knowledge graph. See how characters, factions, locations, and events connect in Codex Cryptica's built-in graph engine.",
    h1: "RPG Campaign Knowledge Graph",
    subheading:
      "See the full web of relationships in your campaign at a glance.",
    introText:
      "Codex Cryptica's graph engine maps every entity in your campaign — characters, factions, locations, events — as nodes connected by relationships. Zoom out to see the big picture, click a node to dive into its lore, and use the graph to spot connections you might have missed during prep.",
    ctaText: "Explore the Graph",
    keywords: [
      "rpg knowledge graph",
      "campaign knowledge graph",
      "ttrpg relationship graph",
      "dnd campaign graph",
      "worldbuilding graph tool",
    ],
    features: [
      {
        title: "Interactive Relationship Map",
        description:
          "Drag, zoom, and filter a live graph of every entity and connection in your campaign.",
        icon: "icon-[lucide--git-fork]",
      },
      {
        title: "Automatic Link Detection",
        description:
          "Wiki-style [[links]] in your notes automatically appear as edges in the graph — no manual wiring needed.",
        icon: "icon-[lucide--link]",
      },
      {
        title: "Filter by Entity Type",
        description:
          "Focus on characters, factions, or locations independently to untangle complex political webs.",
        icon: "icon-[lucide--filter]",
      },
    ],
    relatedLinks: [
      { href: "/solutions/campaign-manager", label: "Campaign manager" },
      { href: "/solutions/worldbuilding-tool", label: "Worldbuilding tool" },
    ],
    faq: [
      {
        question: "How big can the graph get?",
        answer:
          "The graph engine handles hundreds of entities smoothly. Very large campaigns can use filtering to keep the view manageable.",
      },
      {
        question: "Can I export the graph?",
        answer:
          "Yes. You can export a PNG snapshot of the current graph view for use in session notes or sharing with players.",
      },
      {
        question: "Does the graph update automatically?",
        answer:
          "Yes. Every time you add a [[link]] in your notes the graph updates in real time — no sync or rebuild needed.",
      },
    ],
  },
  "offline-rpg-campaign-manager": {
    slug: "offline-rpg-campaign-manager",
    eyebrow: "Offline-First Campaign Tool",
    title: "Offline RPG Campaign Manager | No Internet Needed | Codex Cryptica",
    description:
      "Run your TTRPG campaign manager completely offline. Codex Cryptica stores all notes locally in your browser, works without internet, and never requires a server.",
    h1: "Offline RPG Campaign Manager",
    subheading:
      "Prep your sessions anywhere — no internet, no server, no problem.",
    introText:
      "Codex Cryptica is built on the browser's Origin Private File System, which means it runs entirely on your device. Open your campaign at the table, on a train, or at a remote cabin. Your notes load instantly and every edit saves locally without a network call.",
    ctaText: "Open Offline App",
    keywords: [
      "offline rpg campaign manager",
      "offline campaign manager",
      "dnd campaign manager offline",
      "ttrpg offline tool",
      "campaign manager no internet",
    ],
    features: [
      {
        title: "100% Offline Operation",
        description:
          "The full wiki, graph, and timeline work without any internet connection after the first page load.",
        icon: "icon-[lucide--wifi-off]",
      },
      {
        title: "Instant Local Loading",
        description:
          "Notes load from your device's file system in milliseconds — no server round-trip or CDN dependency.",
        icon: "icon-[lucide--zap]",
      },
      {
        title: "Optional Cloud Sync",
        description:
          "When you want a backup, sync your vault to Google Drive or a local folder — on your terms.",
        icon: "icon-[lucide--cloud]",
      },
    ],
    relatedLinks: [
      { href: "/solutions/local-first-rpg", label: "Local-first RPG" },
      {
        href: "/free-rpg-campaign-manager",
        label: "Free RPG campaign manager",
      },
    ],
    faq: [
      {
        question: "Does Codex work without wifi at the game table?",
        answer:
          "Yes. Once the app has loaded once, everything works offline. Your notes, graph, and timelines are all stored locally.",
      },
      {
        question: "Will I lose my data if I clear my browser?",
        answer:
          "Only if you clear browser storage explicitly. We recommend syncing to a local folder or Google Drive as a backup before clearing.",
      },
      {
        question: "Does it work on mobile?",
        answer:
          "Yes. Codex is responsive and works on tablet and mobile browsers, though a larger screen is recommended for map and graph views.",
      },
    ],
  },
  "local-first-worldbuilding-tool": {
    slug: "local-first-worldbuilding-tool",
    eyebrow: "Privacy-First Worldbuilding",
    title:
      "Local-First Worldbuilding Tool | Private & Offline | Codex Cryptica",
    description:
      "Build your fantasy world with a local-first worldbuilding tool that keeps every note on your device. No cloud uploads, no subscription, no vendor lock-in.",
    h1: "Local-First Worldbuilding Tool",
    subheading:
      "Your world, your files — private, offline, and completely yours.",
    introText:
      "Most worldbuilding tools store your creative work on someone else's server. Codex Cryptica takes the opposite approach: everything lives in your browser's local file system, exportable as standard Markdown files you can open in any editor. Your intellectual property stays with you.",
    ctaText: "Start Your World",
    keywords: [
      "local first worldbuilding",
      "private worldbuilding tool",
      "offline worldbuilding",
      "worldbuilding tool no account",
      "self-hosted worldbuilding",
    ],
    features: [
      {
        title: "No Account Required",
        description:
          "Open the app and start building. Your vault is created locally in seconds with no sign-up form.",
        icon: "icon-[lucide--user-x]",
      },
      {
        title: "Standard Markdown Files",
        description:
          "Every note is a plain Markdown file. Open them in VS Code, Obsidian, or any text editor — no export needed.",
        icon: "icon-[lucide--file-text]",
      },
      {
        title: "No Vendor Lock-In",
        description:
          "Your world exists as files on your machine. Delete the app and your data is still there, untouched.",
        icon: "icon-[lucide--unlock]",
      },
    ],
    relatedLinks: [
      { href: "/solutions/local-first-rpg", label: "Local-first RPG" },
      { href: "/solutions/worldbuilding-tool", label: "Worldbuilding tool" },
      { href: "/vs/world-anvil", label: "vs World Anvil" },
    ],
    faq: [
      {
        question: "Is my world truly private?",
        answer:
          "Yes. Codex uses the browser's Origin Private File System. Your notes never leave your device unless you explicitly sync or export them.",
      },
      {
        question: "What happens if I change browsers?",
        answer:
          "Export your vault as a zip or sync to a local folder. You can reimport it in any browser or open the Markdown files directly.",
      },
      {
        question: "Can I collaborate with my players?",
        answer:
          "Yes. You can share selected entries or host a P2P session where invited players view your world in read-only mode.",
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
    relatedLinks: [
      { href: "/vs/world-anvil", label: "vs World Anvil" },
      {
        href: "/solutions/local-first-worldbuilding-tool",
        label: "Local-first worldbuilding",
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
    relatedLinks: [
      { href: "/vs/obsidian", label: "vs Obsidian" },
      { href: "/vs/kanka-alternative", label: "vs Kanka" },
      {
        href: "/solutions/local-first-worldbuilding-tool",
        label: "Local-first worldbuilding",
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
    relatedLinks: [
      { href: "/vs/world-anvil", label: "vs World Anvil" },
      { href: "/vs/obsidian", label: "vs Obsidian" },
      {
        href: "/solutions/offline-rpg-campaign-manager",
        label: "Offline campaign manager",
      },
    ],
  },
  "kanka-alternative": {
    slug: "kanka-alternative",
    competitorName: "Kanka",
    title: "Codex Cryptica vs Kanka: Local vs Cloud Campaign Manager",
    description:
      "Compare Codex Cryptica and Kanka for TTRPG campaign management. See how a local-first private vault stacks up against Kanka's cloud-hosted shared wiki.",
    h1: "Codex Cryptica vs Kanka",
    subheading:
      "Private local vaults vs cloud-hosted campaign wikis — which fits your table?",
    introText:
      "Kanka is a popular cloud-hosted campaign management platform with strong sharing features, but it stores all your world data on remote servers and restricts some features behind paid tiers. Codex Cryptica offers the same rich wiki and relationship graph as a fully local, free, offline-first alternative.",
    ctaText: "Try Free Local Vault",
    keywords: [
      "codex cryptica vs kanka",
      "kanka alternative",
      "kanka rpg campaign manager",
      "free kanka alternative",
    ],
    features: [
      {
        title: "No Monthly Tier Limits",
        description:
          "All Codex features — graph, AI, timelines, maps — are free with no entity count caps or paywalled modules.",
        icon: "icon-[lucide--circle-dollar-sign]",
      },
      {
        title: "Works Without Internet",
        description:
          "Every note, map, and relationship loads from your local device. No server dependency at the game table.",
        icon: "icon-[lucide--wifi-off]",
      },
      {
        title: "Standard Portable Files",
        description:
          "Your campaign is plain Markdown. Move it to any editor, back it up anywhere, or share specific files directly.",
        icon: "icon-[lucide--file-text]",
      },
    ],
    comparisonTable: [
      {
        feature: "Offline Support",
        competitorHas: "No (Cloud only)",
        codexHas: "Yes",
      },
      {
        feature: "Local File Storage",
        competitorHas: "No (Remote database)",
        codexHas: "Yes (OPFS / Folder Sync)",
      },
      {
        feature: "Free Entity Limit",
        competitorHas: "Limited on free tier",
        codexHas: "Unlimited",
      },
      {
        feature: "AI Writing Assistant",
        competitorHas: "No",
        codexHas: "Yes (BYO API key)",
      },
      {
        feature: "Interactive Graph",
        competitorHas: "Limited",
        codexHas: "Yes (Full relation graph)",
      },
      {
        feature: "Open File Format",
        competitorHas: "No (Proprietary)",
        codexHas: "Yes (Standard Markdown)",
      },
    ],
    verdict:
      "Kanka excels at team-shared cloud wikis, but if you value offline access, data privacy, and no subscription fees, Codex Cryptica delivers a richer local experience with the same wiki depth and no monthly cost.",
    relatedLinks: [
      { href: "/vs/world-anvil", label: "vs World Anvil" },
      { href: "/vs/obsidian", label: "vs Obsidian" },
      { href: "/solutions/local-first-rpg", label: "Local-first RPG" },
    ],
    faq: [
      {
        question: "Can I import my Kanka campaign into Codex?",
        answer:
          "Kanka supports JSON export. You can use the Codex importer or manually convert the JSON to Markdown files and open them as a vault.",
      },
      {
        question: "Does Codex support shared campaigns like Kanka does?",
        answer:
          "Yes. Codex supports P2P guest sessions where you share selected pages with invited players without uploading data to a server.",
      },
    ],
  },
};
