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
  /** Show the Responsible AI trust banner before the final CTA. */
  aiTrustSection?: boolean;
}

export interface SEOComparisonPageData extends SEOPageData {
  competitorName: string;
  comparisonTable: Array<{
    feature: string;
    competitorHas: boolean | string;
    codexHas: boolean | string;
  }>;
  verdict: string;
  /** Optional migration path strip shown below the hero CTAs. */
  migrationStrip?: Array<{ icon: string; label: string }>;
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
    eyebrow: "Codex Cryptica vs World Anvil",
    h1: "Your World Is Yours.",
    subheading: "No subscriptions. No cloud lock-in.",
    introText:
      "Import your World Anvil export and keep building. Your lore lives as local Markdown files — yours to keep, edit, and explore as a connected graph.",
    ctaText: "Get Free Local Vault",
    secondaryCtaText: "Import World Anvil Export",
    secondaryCtaHref: "/import/world-anvil-export",
    keywords: [
      "codex cryptica vs world anvil",
      "world anvil alternative",
      "private worldbuilding tool",
    ],
    features: [
      {
        title: "Bring Your World Anvil Export",
        description:
          "Already have years of lore in World Anvil? Import your export and pick up where you left off — no copy-pasting, no rebuilding from scratch.",
        icon: "icon-[lucide--package-open]",
      },
      {
        title: "Your Lore, Your Files",
        description:
          "Your world wiki is saved as plain Markdown files on your own device. No vendor lock-in, no export gatekeeping, no account required.",
        icon: "icon-[lucide--file-text]",
      },
      {
        title: "Core Vault Works Offline",
        description:
          "Write, search, and explore your campaign graph without an internet connection. No server latency at the game table.",
        icon: "icon-[lucide--wifi-off]",
      },
    ],
    migrationStrip: [
      { icon: "icon-[lucide--cloud-download]", label: "World Anvil Export" },
      { icon: "icon-[lucide--file-text]", label: "Plain Markdown Vault" },
      { icon: "icon-[lucide--network]", label: "Interactive Entity Graph" },
    ],
    comparisonTable: [
      {
        feature: "Storage location",
        competitorHas: "Remote hosted platform",
        codexHas: "Browser storage / local Markdown vault",
      },
      {
        feature: "Offline core workflow",
        competitorHas: "Cloud-dependent",
        codexHas: "Yes — core vault works offline",
      },
      {
        feature: "Native local Markdown vault",
        competitorHas: "No",
        codexHas: "Yes",
      },
      {
        feature: "World export",
        competitorHas: "Guild feature for full world export",
        codexHas: "Local files by default",
      },
      {
        feature: "Private worlds",
        competitorHas: "Guild (paid) feature",
        codexHas: "Private by default",
      },
      {
        feature: "AI assistance",
        competitorHas: "External AI tools / not local-vault focused",
        codexHas: "Optional BYO-key vault-aware assistance",
      },
      {
        feature: "Graph-based lore exploration",
        competitorHas: "Wiki-link/article based",
        codexHas: "Core feature",
      },
      {
        feature: "Price",
        competitorHas: "Freemium / paid tiers",
        codexHas: "Free, source-available",
      },
    ],
    verdict:
      "Your world should not feel trapped.\n\nChoose Codex Cryptica if you want full ownership of your lore, offline-first access, plain Markdown files, and no subscription fees.\n\nChoose World Anvil if hosted publishing, subscriber features, public presentation, and community wikis are your priority.",
    faq: [
      {
        question: "Is Codex Cryptica completely free?",
        answer:
          "Yes, Codex is free and open-source. There are no paywalls or storage restrictions on your local campaigns.",
      },
      {
        question: "Can I import my World Anvil content?",
        answer:
          "Yes. Export your world from World Anvil and import it directly into Codex Cryptica. Your articles become local Markdown files you own outright.",
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
    aiTrustSection: true,
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
  },
};
