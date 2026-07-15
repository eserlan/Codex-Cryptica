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
  /** Large emotional tagline rendered between h1 and subheading. Use \n to split lines. */
  tagline?: string;
  /** Optional second button in the hero. */
  secondaryCtaText?: string;
  secondaryCtaHref?: string;
  /** Links shown in a "Related pages" section above the FAQ. */
  relatedLinks?: Array<{ href: string; label: string }>;
  /** Show the Responsible AI trust banner before the FAQ section. */
  aiTrustSection?: boolean;
}

export const solutions: Record<string, SEOPageData> = {
  "campaign-manager": {
    slug: "campaign-manager",
    title: "How to Manage RPG Campaigns with Codex Cryptica | Features & Setup",
    description:
      "A feature-by-feature guide to managing TTRPG campaigns in Codex Cryptica: linked lore graphs, private Markdown notes, timelines, and offline prep — all local-first.",
    h1: "RPG Campaign Manager Features & Setup Guide",
    subheading:
      "Everything you need to plan, run, and track campaigns — no cloud account required.",
    introText:
      "Codex Cryptica is a local-first RPG campaign manager built for GMs who want power without complexity. This guide walks through the core features: bidirectional wiki links, interactive lore graphs, timeline tracking, and offline-first storage. Your campaign data lives on your device and loads in milliseconds — even at the table without Wi-Fi.",
    ctaText: "Explore Campaign Manager",
    keywords: [
      "rpg campaign manager features",
      "how to manage ttrpg campaigns",
      "dnd campaign manager setup",
      "ttrpg campaign organizer guide",
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
        question:
          "What makes Codex Cryptica different from other RPG campaign managers?",
        answer:
          "Codex Cryptica is fully local-first: your notes are stored on your own device, not a remote server. That means instant load times, complete privacy, and full offline support — features most cloud-based campaign managers can't offer.",
      },
      {
        question: "Can I use Codex Cryptica offline?",
        answer:
          "Yes. Codex Cryptica operates fully offline by storing files locally on your device. Codex Cryptica's local-first markdown capabilities, interactive relationship graph, and campaign manager run entirely in the browser without requiring an internet connection.",
      },
    ],
    relatedLinks: [
      { href: "/", label: "RPG campaign manager" },
      {
        href: "/free-rpg-campaign-manager",
        label: "Free RPG campaign manager",
      },
      { href: "/solutions/worldbuilding-tool", label: "Worldbuilding tool" },
      { href: "/solutions/local-first-rpg", label: "Local-first RPG" },
    ],
  },
  "worldbuilding-tool": {
    slug: "worldbuilding-tool",
    title: "Free Structured Worldbuilding Tool & Wiki Schemas | Codex Cryptica",
    description:
      "Organize your campaign database with custom worldbuilding templates, structured schemas, entity metadata, and relational graphs.",
    h1: "Free Structured Worldbuilding Tool & Wiki Schemas",
    subheading:
      "Design your lore database with free templates and auto-generated links.",
    introText:
      "For complex worldbuilding projects, simple document folders aren't enough. Codex Cryptica provides a free, structured worldbuilding tool that utilizes predefined entity schemas for characters, factions, locations, items, and events. Maintain complete metadata lists, tag assets, and keep your entire campaign database organized under standard Markdown frontmatter.",
    ctaText: "Start Structuring Your World",
    keywords: [
      "structured worldbuilding tool",
      "worldbuilding templates",
      "worldbuilding schemas",
      "campaign wiki setup",
    ],
    features: [
      {
        title: "Custom Entity Schemas",
        description:
          "Predefined templates for kingdoms, NPC stats, pantheons, factions, and quests out-of-the-box.",
        icon: "icon-[lucide--database]",
      },
      {
        title: "Frontmatter Metadata",
        description:
          "Structure key stats in YAML frontmatter for quick database query filters and clean data views.",
        icon: "icon-[lucide--file-json]",
      },
      {
        title: "Direct Link Discovery",
        description:
          "Wiki-style syntax automatically maps connections across markdown notes for instant traversal.",
        icon: "icon-[lucide--link]",
      },
    ],
    faq: [
      {
        question: "What templates does this worldbuilding tool support?",
        answer:
          "Codex Cryptica includes pre-configured structures for NPCs, factions, settlements, items, timelines, and pantheons, letting you start writing immediately.",
      },
      {
        question: "Can I customize the frontmatter schema?",
        answer:
          "Yes. You can customize and edit YAML frontmatter metadata keys directly inside Codex Cryptica's editor. Codex Cryptica reads and updates structured frontmatter dynamically without locking your campaign notes into a proprietary format.",
      },
    ],
    relatedLinks: [
      { href: "/", label: "worldbuilding tool" },
      { href: "/worldbuilding-tool", label: "Worldbuilding tool guide" },
      { href: "/solutions/campaign-manager", label: "Campaign manager" },
      { href: "/solutions/rpg-knowledge-graph", label: "RPG knowledge graph" },
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
      { href: "/", label: "RPG campaign manager" },
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
      { href: "/", label: "RPG campaign manager" },
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
      "AI Worldbuilding Tool | Private Lore & Campaign Co-Author | Codex Cryptica",
    description:
      "Generate rich lore, plot hooks, and characters client-side with Codex Cryptica's context-aware AI worldbuilding assistant.",
    h1: "AI Worldbuilding Tool & Co-Author",
    subheading:
      "Expand your campaign details with private, context-aware AI generators.",
    introText:
      "Create deep fantasy lore without writing from scratch. Codex Cryptica's AI worldbuilding tools help you draft detailed characters, histories, and locations. The built-in Lore Oracle reads your active vault's context, ensuring new additions stay consistent with your established world. All prompts are processed directly via your own API key under strict creative privacy.",
    ctaText: "Try AI Assistant Features",
    secondaryCtaText: "Try name generator",
    secondaryCtaHref: "/tools/fantasy-name-generator",
    keywords: [
      "ai worldbuilding tool",
      "ai lore generator",
      "fantasy world builder ai",
      "rpg co-author bot",
    ],
    features: [
      {
        title: "Entity-Aware Generation",
        description:
          "The AI reads your active campaign folders to draft NPC descriptions, rumors, and locations.",
        icon: "icon-[lucide--sparkles]",
      },
      {
        title: "Visual Concept Review",
        description:
          "Generates custom entity headers and reviews image prompt drafts in the app sidebars before generating.",
        icon: "icon-[lucide--image]",
      },
      {
        title: "Zero-Harvest Privacy",
        description:
          "Runs direct to your API endpoint without caching or storing your worldbuilding notes on external databases.",
        icon: "icon-[lucide--eye-off]",
      },
    ],
    relatedLinks: [
      { href: "/", label: "worldbuilding tool" },
      { href: "/worldbuilding-tool", label: "Worldbuilding tool guide" },
      {
        href: "/solutions/worldbuilding-tool",
        label: "Structured worldbuilding tool",
      },
      { href: "/tools/dnd-npc-generator", label: "DnD NPC generator" },
    ],
    faq: [
      {
        question: "How does the AI co-author understand my world?",
        answer:
          "The Lore Oracle reads the active vault workspace context and selected entities to generate details consistent with your custom history.",
      },
      {
        question: "Is my creative writing safe from model training?",
        answer:
          "Yes. All AI interactions within Codex Cryptica are client-directed API calls made directly to your configured provider. Codex Cryptica does not collect, scrape, or store your notes on external databases, keeping your creative writing private.",
      },
    ],
  },
  "rpg-knowledge-graph": {
    slug: "rpg-knowledge-graph",
    eyebrow: "Campaign Knowledge Graph",
    title:
      "RPG Knowledge Graph | Interactive Campaign Wiki Map | Codex Cryptica",
    description:
      "Visualize your worldbuilding connections. Map characters, factions, and events in an interactive node-link relationship graph.",
    h1: "RPG Campaign Knowledge Graph",
    subheading: "Explore the web of relationships in your campaign visually.",
    introText:
      "Track complex political factions and overlapping character relationships at a glance. Codex Cryptica's RPG knowledge graph reads bidirectional links in your markdown files and automatically maps them to interactive nodes. Filter by entity category, focus on specific hubs, and navigate your lore visually.",
    ctaText: "Explore Visual Graph",
    keywords: [
      "rpg knowledge graph",
      "campaign relationship map",
      "worldbuilding graph tool",
      "ttrpg network nodes",
    ],
    features: [
      {
        title: "Saved Graph Views",
        description:
          "Save customized graph filters and view configurations to switch layouts and focus states instantly.",
        icon: "icon-[lucide--network]",
      },
      {
        title: "Auto-Detected Connections",
        description:
          "Wiki bracket links in markdown automatically construct visual edges in real-time, zero wiring required.",
        icon: "icon-[lucide--link]",
      },
      {
        title: "Category Filters",
        description:
          "Toggle nodes for characters, factions, settlements, and events to isolate specific campaign webs.",
        icon: "icon-[lucide--filter]",
      },
    ],
    relatedLinks: [
      { href: "/", label: "worldbuilding tool" },
      { href: "/worldbuilding-tool", label: "Worldbuilding tool guide" },
      {
        href: "/solutions/worldbuilding-tool",
        label: "Structured worldbuilding tool",
      },
      { href: "/solutions/campaign-manager", label: "Campaign manager" },
    ],
    faq: [
      {
        question: "How are connections added to the RPG graph?",
        answer:
          "Adding standard wiki bracket links [[NPC Name]] inside your markdown documents automatically draws visual edges on the canvas.",
      },
      {
        question: "Can I filter the graph views?",
        answer:
          "Yes. Codex Cryptica's interactive graph explorer allows you to filter nodes by category, isolate specific relationships, focus on central hubs, and save custom view configurations for instant campaign navigation.",
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
      { href: "/", label: "RPG campaign manager" },
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
      "Local-First Worldbuilding Tool | Private Campaign Wiki | Codex Cryptica",
    description:
      "Own your creative writing. A local-first worldbuilding tool with offline markdown storage, zero server uploads, and no subscription fees.",
    h1: "Local-First Worldbuilding Tool",
    subheading:
      "Write offline with complete data sovereignty and Markdown files.",
    introText:
      "Your fantasy world is your intellectual property. Codex Cryptica is a local-first worldbuilding tool that saves all entries as standard Markdown files directly to your device. No sign-up, no monthly fees, and no risk of server shutdowns. Access your wiki instantly at the table, with or without internet connection.",
    ctaText: "Start Building Privately",
    keywords: [
      "local first worldbuilding",
      "private worldbuilding wiki",
      "offline campaign software",
      "markdown lore database",
    ],
    features: [
      {
        title: "Client-Side Sandbox",
        description:
          "Uses the browser's high-speed Origin Private File System (OPFS) to cache and index your notes securely.",
        icon: "icon-[lucide--lock]",
      },
      {
        title: "Standard Markdown Storage",
        description:
          "Saves files with standard YAML frontmatter so you can open them in Obsidian, VS Code, or any reader.",
        icon: "icon-[lucide--file-text]",
      },
      {
        title: "Optional Sync Mirrors",
        description:
          "Link local directories via File System Access API or back up to Google Drive on demand.",
        icon: "icon-[lucide--refresh-cw]",
      },
    ],
    relatedLinks: [
      { href: "/", label: "worldbuilding tool" },
      { href: "/worldbuilding-tool", label: "Worldbuilding tool guide" },
      {
        href: "/solutions/worldbuilding-tool",
        label: "Structured worldbuilding tool",
      },
      {
        href: "/solutions/offline-rpg-campaign-manager",
        label: "Offline campaign manager",
      },
    ],
    faq: [
      {
        question: "Where are my world files stored?",
        answer:
          "All Codex Cryptica campaign files are stored locally in your browser's Origin Private File System (OPFS). Your intellectual property remains entirely on your machine and is never sent to external servers.",
      },
      {
        question: "Can I sync or backup my local-first world?",
        answer:
          "Yes. Codex Cryptica allows you to back up and sync files by mirroring your local vault to a folder on your computer's hard drive via the File System Access API, or by linking it to a Google Drive backup folder.",
      },
    ],
  },
};

export const featuresConfig: Record<string, SEOPageData> = {
  "local-first-rpg-campaign-manager": {
    slug: "local-first-rpg-campaign-manager",
    title:
      "Local-First RPG Campaign Manager | Private Campaign Wiki | Codex Cryptica",
    description:
      "Manage campaigns locally with zero latency, offline mode, and markdown files. The private, local-first alternative to World Anvil and Kanka.",
    h1: "Local-First RPG Campaign Manager",
    subheading:
      "Complete privacy and lightning-fast campaign prep directly on your device.",
    introText:
      "Most campaign managers keep your creative output locked behind a subscription on remote cloud servers. Codex Cryptica is local-first: all notes, wikis, and relationship maps reside strictly on your own device, offering offline access and instant note loading during live tabletop sessions.",
    ctaText: "Create Local Vault",
    keywords: [
      "local first rpg campaign manager",
      "private rpg campaign tracker",
      "offline dm planner",
      "local campaign wiki",
    ],
    features: [
      {
        title: "Sandboxed Local Storage",
        description:
          "Utilizes modern browser APIs (OPFS) to read and write notes directly to your machine's filesystem.",
        icon: "icon-[lucide--lock]",
      },
      {
        title: "Bidirectional Graph Links",
        description:
          "Connect NPCs, locations, and quests with simple wiki links. Codex constructs a live relation graph automatically.",
        icon: "icon-[lucide--git-fork]",
      },
      {
        title: "No Account Required",
        description:
          "Launch the app and start writing immediately. Your data remains yours — no sign-up forms, no subscription fees.",
        icon: "icon-[lucide--user-x]",
      },
    ],
    faq: [
      {
        question: "Where are my campaign files located?",
        answer:
          "Your files are stored locally in your browser's sandboxed filesystem. You can sync them to a local directory on your drive or back them up via Google Drive.",
      },
      {
        question: "Can I use this without internet?",
        answer:
          "Yes. Once loaded, the campaign manager, graph explorer, and timelines work 100% offline, making it perfect for table prep or remote play sessions.",
      },
    ],
    relatedLinks: [
      { href: "/", label: "RPG campaign manager" },
      {
        href: "/solutions/offline-rpg-campaign-manager",
        label: "Offline RPG campaign manager",
      },
      {
        href: "/free-rpg-campaign-manager",
        label: "Free RPG campaign manager",
      },
    ],
  },
  "private-offline-worldbuilding-tool": {
    slug: "private-offline-worldbuilding-tool",
    title:
      "Private Offline Worldbuilding Tool | Safe TTRPG Lore Wiki | Codex Cryptica",
    description:
      "Build fantasy worlds with absolute data privacy. Write lore, map settlements, and track timelines offline without data harvesting.",
    h1: "Private Offline Worldbuilding Tool",
    subheading:
      "Keep your intellectual property safe with local Markdown files.",
    introText:
      "As creators, your worlds are your intellectual property. Codex Cryptica protects your notes from server shutdowns and automated data harvesting. Write detailed histories, custom calendars, and wiki pages offline, stored as standard Markdown files you own forever.",
    ctaText: "Start Building Privately",
    keywords: [
      "private worldbuilding tool",
      "offline lore database",
      "local fantasy world wiki",
      "no subscription worldbuilder",
    ],
    features: [
      {
        title: "Markdown File Sovereignty",
        description:
          "Your lore is saved as standard Markdown files with frontmatter. Edit them in any text editor — no vendor lock-in.",
        icon: "icon-[lucide--file-text]",
      },
      {
        title: "Chronology Timeline Engine",
        description:
          "Track campaign events, historical epochs, and character bios on linear timelines using custom calendar definitions.",
        icon: "icon-[lucide--calendar]",
      },
      {
        title: "Anti-Data-Harvesting Protection",
        description:
          "Since all files remain strictly offline and local-first, your worldbuilding is completely safe from cloud-scraping.",
        icon: "icon-[lucide--shield]",
      },
    ],
    faq: [
      {
        question: "Can I move my world to another tool later?",
        answer:
          "Yes. Because Codex Cryptica saves your vault as standard Markdown, you can open your folders in Obsidian, VS Code, or other markdown readers at any time.",
      },
      {
        question: "How does it protect my data from cloud scraping?",
        answer:
          "There are no cloud database connections. All files are written directly to your device. AI features are entirely optional and require explicit toggle.",
      },
    ],
    relatedLinks: [
      { href: "/", label: "worldbuilding tool" },
      {
        href: "/solutions/worldbuilding-tool",
        label: "Structured worldbuilding tool",
      },
      {
        href: "/solutions/local-first-worldbuilding-tool",
        label: "Local-first worldbuilding",
      },
    ],
  },
  "ai-gm-assistant": {
    slug: "ai-gm-assistant",
    title: "Local-First AI GM Assistant & Lore Co-Author | Codex Cryptica",
    description:
      "Co-author campaign notes and generate fantasy details using Codex Cryptica's local-first AI Lore Oracle. Zero data leakage, full creative privacy.",
    h1: "AI GM Assistant & Lore Oracle",
    subheading:
      "Co-author lore, design NPCs, and outline plots with absolute privacy.",
    introText:
      "Supercharge your worldbuilding using Codex Cryptica's integrated local-first Lore Oracle. Unlike cloud-based TTRPG campaign managers that scrape your creative writing to train proprietary AI models, Codex Cryptica operates on a zero-data-leakage architecture. Your notes, worldbuilding details, and campaign secrets are processed directly using secure API keys on your own terms. We never harvest, log, or sell your intellectual property to cloud scrapers.",
    ctaText: "Try AI Assistant Features",
    keywords: [
      "ai gm assistant",
      "rpg ai assistant",
      "dnd dungeon master assistant",
      "lore co-author",
    ],
    features: [
      {
        title: "Context-Aware Generation",
        description:
          "The Lore Oracle reads your active folder structure and notes to generate relevant and cohesive additions.",
        icon: "icon-[lucide--sparkles]",
      },
      {
        title: "Category Templates",
        description:
          "Instantly convert raw AI chat outputs into structured entity files (characters, factions, items) with one click.",
        icon: "icon-[lucide--clipboard-list]",
      },
      {
        title: "Zero-Scrape Guarantee",
        description:
          "Your campaign text is processed client-side. We do not store, log, or harvest your creative notes to train external models. Your intellectual property stays strictly local.",
        icon: "icon-[lucide--lock]",
      },
    ],
    faq: [
      {
        question: "How does Codex protect my world from cloud AI scrapers?",
        answer:
          "Traditional online wikis store your campaign notes in cloud databases where they are vulnerable to automated scraping and model training. Codex Cryptica stores everything locally in your browser's sandboxed filesystem. When you use the Lore Oracle, calls are made directly to the AI provider via your own API key under strict zero-retention developer policies — your creative output is never scraped or logged by us.",
      },
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
      { href: "/", label: "RPG campaign manager" },
      { href: "/solutions/ai-dm-assistant", label: "AI DM assistant" },
      {
        href: "/solutions/ai-worldbuilding-tool",
        label: "AI worldbuilding tool",
      },
    ],
  },
};

export interface SEOImportPageData extends SEOPageData {
  competitorName: string;
}

export const importsConfig: Record<string, SEOImportPageData> = {
  "obsidian-vault": {
    slug: "obsidian-vault",
    competitorName: "Obsidian",
    title: "Import Obsidian Vault to Codex Cryptica | Free Markdown Migration",
    description:
      "Import your Obsidian TTRPG campaign vault. Convert Markdown files, wiki-links, and YAML frontmatter into a local-first campaign wiki.",
    h1: "Obsidian Vault Importer",
    subheading:
      "Seamlessly convert your Obsidian markdown campaign files into Codex Cryptica.",
    introText:
      "Migrate your Obsidian RPG notes seamlessly. Drop your Markdown files directly to parse frontmatter, resolve wiki links, and construct a live local-first campaign wiki in Codex Cryptica.",
    ctaText: "Start Obsidian Migration",
    keywords: [
      "import obsidian vault",
      "obsidian to markdown",
      "obsidian dnd import",
      "obsidian migration",
    ],
    features: [
      {
        title: "Frontmatter Parsing",
        description:
          "Standard Obsidian YAML headers are automatically mapped to characters, factions, and locations.",
        icon: "icon-[lucide--file-json]",
      },
      {
        title: "Link Resolution",
        description:
          "Wiki-style bidirectional links [[like this]] are retained and instantly wired in the campaign graph.",
        icon: "icon-[lucide--link]",
      },
      {
        title: "Offline Sandbox Preview",
        description:
          "Inspect the parsed structure and content hierarchy completely offline in the web parser before exporting.",
        icon: "icon-[lucide--eye]",
      },
    ],
    faq: [
      {
        question: "Will I lose my Obsidian folder hierarchy?",
        answer:
          "Codex Cryptica flattens imported files and preserves all campaign structure through wiki-links, tags, and semantic relationships instead of nested folders.",
      },
      {
        question: "Is there any character limit or paywall for importing?",
        answer:
          "No, Codex is free and open-source. All parsing and vault generation is computed local-first in your browser.",
      },
    ],
    relatedLinks: [
      { href: "/vs/obsidian", label: "Codex vs Obsidian" },
      {
        href: "/solutions/local-first-worldbuilding-tool",
        label: "Local-first worldbuilding",
      },
    ],
  },
  "world-anvil-export": {
    slug: "world-anvil-export",
    competitorName: "World Anvil",
    title:
      "Import World Anvil Export to Codex Cryptica | Free RPG Lore Importer",
    description:
      "Convert your World Anvil JSON backup into standard Markdown. Import characters, locations, and articles into a secure local vault.",
    h1: "World Anvil JSON Importer",
    subheading: "Extract your campaign lore from World Anvil cloud backups.",
    introText:
      "Free your lore from the cloud. Drop your World Anvil JSON export payload to extract articles, clean html formatting, and preview your campaign wiki offline.",
    ctaText: "Start World Anvil Migration",
    keywords: [
      "import world anvil",
      "world anvil backup export",
      "world anvil json to markdown",
    ],
    features: [
      {
        title: "HTML to Markdown Cleanup",
        description:
          "Converts World Anvil's HTML-heavy editor blocks into clean, standard Markdown.",
        icon: "icon-[lucide--file-text]",
      },
      {
        title: "Category Mapping",
        description:
          "Maps World Anvil article templates (NPCs, Locations, Items) directly to Codex entities.",
        icon: "icon-[lucide--database]",
      },
      {
        title: "Asset Preservation",
        description:
          "Identifies image links and attachment sources within the JSON file for easy local references.",
        icon: "icon-[lucide--image]",
      },
    ],
    faq: [
      {
        question: "How do I get my World Anvil export file?",
        answer:
          "Go to your World Anvil campaign settings, navigate to the export tab, and request a JSON format download of your articles.",
      },
      {
        question: "Are private articles imported?",
        answer:
          "Yes. Since the JSON backup contains all articles, your private lore is fully imported and kept secure on your local drive.",
      },
    ],
    aiTrustSection: true,
    relatedLinks: [
      { href: "/vs/world-anvil", label: "Codex vs World Anvil" },
      { href: "/solutions/local-first-rpg", label: "Local-first RPG" },
    ],
  },
  "kanka-json": {
    slug: "kanka-json",
    competitorName: "Kanka",
    title: "Import Kanka JSON to Codex Cryptica | TTRPG Campaign Migration",
    description:
      "Convert your Kanka campaign JSON export into offline Markdown files. Preview characters, locations, and factions instantly.",
    h1: "Kanka Campaign JSON Importer",
    subheading:
      "Convert your Kanka campaign JSON export into a local-first offline wiki.",
    introText:
      "Migrate from Kanka to a local-first RPG wiki. Upload your campaign JSON file to parse nested articles, extract tags, and build a local vault.",
    ctaText: "Start Kanka Migration",
    keywords: ["import kanka json", "kanka campaign export", "kanka migration"],
    features: [
      {
        title: "Relations Extraction",
        description:
          "Maintains character connections, organization hierarchies, and family trees.",
        icon: "icon-[lucide--network]",
      },
      {
        title: "Entry Parsing",
        description:
          "Cleans and transforms Kanka HTML elements into markdown notes.",
        icon: "icon-[lucide--clipboard-list]",
      },
      {
        title: "Metadata Restoration",
        description:
          "Imports tags, attributes, and private GM notes into corresponding Markdown frontmatter keys.",
        icon: "icon-[lucide--tags]",
      },
    ],
    faq: [
      {
        question: "Where do I find Kanka export options?",
        answer:
          "Navigate to your Kanka campaign's settings page under utilities, and execute a backup download of the entire campaign in JSON format.",
      },
      {
        question: "Are Kanka maps imported?",
        answer:
          "The importer extracts map coordinates and pin descriptions, letting you map locations inside Codex's spatial canvases.",
      },
    ],
    relatedLinks: [
      { href: "/vs/kanka-alternative", label: "Codex vs Kanka" },
      { href: "/solutions/local-first-rpg", label: "Local-first RPG" },
    ],
  },
  "legendkeeper-json": {
    slug: "legendkeeper-json",
    competitorName: "LegendKeeper",
    title:
      "Import LegendKeeper JSON to Codex Cryptica | Local-First RPG Importer",
    description:
      "Convert LegendKeeper backup JSON into standard Markdown. Preview pages and hierarchies offline before starting your local vault.",
    h1: "LegendKeeper JSON Importer",
    subheading:
      "Extract your LegendKeeper pages and visual maps into local Markdown files.",
    introText:
      "Own your LegendKeeper campaign notes. Drop your LegendKeeper export files to extract categories, content blocks, and entity structures client-side.",
    ctaText: "Start LegendKeeper Migration",
    keywords: [
      "import legendkeeper",
      "legendkeeper json backup",
      "legendkeeper offline export",
    ],
    features: [
      {
        title: "Slate Editor Conversion",
        description:
          "Transforms LegendKeeper's internal block formats into clean, human-readable markdown files.",
        icon: "icon-[lucide--refresh-cw]",
      },
      {
        title: "Hierarchy Preservation",
        description:
          "Maintains nested parent-child article folders, keeping directories identical to your workspace.",
        icon: "icon-[lucide--folder-tree]",
      },
      {
        title: "Image Extraction",
        description:
          "Scans and maps online asset attachments, letting you download or preview them locally.",
        icon: "icon-[lucide--image]",
      },
    ],
    faq: [
      {
        question: "How do I generate a LegendKeeper export?",
        answer:
          "Go to your LegendKeeper project settings and download a backup export archive of the project.",
      },
      {
        question: "Do my map pins translate to Codex?",
        answer:
          "Yes, the coordinates and wiki linkages are extracted and can be mapped directly onto the Codex campaign canvas.",
      },
    ],
    relatedLinks: [
      { href: "/vs/legendkeeper", label: "Codex vs LegendKeeper" },
      {
        href: "/solutions/offline-rpg-campaign-manager",
        label: "Offline campaign manager",
      },
    ],
  },
};

export const worldbuildingToolRoot: SEOPageData = {
  slug: "worldbuilding-tool",
  eyebrow: "Free TTRPG Worldbuilding Hub",
  title: "Free Worldbuilding Tool & Lore Database | Codex Cryptica",
  description:
    "Create, link, and organize world maps, history, and factions. Codex Cryptica is a free, local-first worldbuilding tool running 100% in your browser.",
  h1: "Free Worldbuilding Tool & Lore Database",
  subheading:
    "Map your fantasy worlds visually with local-first bidirectional linking.",
  introText:
    "Codex Cryptica is a free worldbuilding tool and private lore database designed to keep your creative assets safe and organized on your own device. Plan characters, locations, factions, and items with standard Markdown files that load instantly. See the connections between your notes using our built-in relationship maps and chronological timelines, all running 100% in your browser.",
  ctaText: "Start Worldbuilding",
  keywords: [
    "free worldbuilding tool",
    "worldbuilding software",
    "fantasy worldbuilder",
    "lore database",
  ],
  features: [
    {
      title: "Interactive Canvas & Graph",
      description:
        "Visualize relationships and draw map pins dynamically across factions, NPCs, and events.",
      icon: "icon-[lucide--network]",
    },
    {
      title: "Fantasy Timelines",
      description:
        "Map campaign history and character journals using chronological eras and custom calendars.",
      icon: "icon-[lucide--calendar-days]",
    },
    {
      title: "Local-First Privacy",
      description:
        "Your files never leave your device. Stored securely in your browser's private filesystem.",
      icon: "icon-[lucide--shield-check]",
    },
  ],
  faq: [
    {
      question: "Is Codex Cryptica completely free?",
      answer:
        "Yes. Codex Cryptica is a client-side local-first campaign wiki. All databases and files are run on your machine with no subscriptions required.",
    },
    {
      question: "Can I use Codex Cryptica offline?",
      answer:
        "Absolutely. Once the initial web app is loaded, Codex Cryptica's editor, interactive relationship graph, and timeline system run fully offline without requiring network access.",
    },
    {
      question: "Can I import existing wiki files into Codex Cryptica?",
      answer:
        "Yes, Codex Cryptica supports importing Markdown folders from Obsidian or importing export packages from World Anvil and LegendKeeper directly.",
    },
  ],
  relatedLinks: [
    { href: "/", label: "worldbuilding tool" },
    {
      href: "/solutions/worldbuilding-tool",
      label: "Structured worldbuilding tool",
    },
    { href: "/solutions/ai-worldbuilding-tool", label: "AI worldbuilding" },
    {
      href: "/solutions/local-first-worldbuilding-tool",
      label: "Local-first worldbuilding",
    },
    { href: "/solutions/rpg-knowledge-graph", label: "RPG knowledge graph" },
  ],
};
