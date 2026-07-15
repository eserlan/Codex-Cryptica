import type { SEOPageData } from "./seo-pages";

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
