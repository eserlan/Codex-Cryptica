import type { SEOPageData } from "./seo-pages";

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
    secondaryCtaText: "Import Obsidian Vault",
    secondaryCtaHref: "/import/obsidian-vault",
    keywords: [
      "codex cryptica vs obsidian",
      "obsidian rpg campaign manager",
      "best obsidian alternative for dnd",
    ],
    migrationStrip: [
      { icon: "icon-[lucide--folder-open]", label: "Obsidian Vault" },
      { icon: "icon-[lucide--file-text]", label: "Plain Markdown Files" },
      { icon: "icon-[lucide--network]", label: "Interactive Entity Graph" },
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
      { href: "/import/obsidian-vault", label: "Import Obsidian vault" },
      { href: "/vs/world-anvil", label: "vs World Anvil" },
      {
        href: "/free-rpg-campaign-manager",
        label: "Free RPG campaign manager",
      },
      { href: "/worldbuilding-tool", label: "worldbuilding tool" },
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
      { href: "/worldbuilding-tool", label: "worldbuilding tool" },
      {
        href: "/free-rpg-campaign-manager",
        label: "Free RPG campaign manager",
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
    secondaryCtaText: "Import LegendKeeper Export",
    secondaryCtaHref: "/import/legendkeeper-json",
    keywords: [
      "codex cryptica vs legendkeeper",
      "legendkeeper alternative",
      "free campaign wiki",
    ],
    migrationStrip: [
      { icon: "icon-[lucide--cloud-download]", label: "LegendKeeper Export" },
      { icon: "icon-[lucide--file-text]", label: "Plain Markdown Files" },
      { icon: "icon-[lucide--network]", label: "Interactive Entity Graph" },
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
      {
        href: "/import/legendkeeper-json",
        label: "Import LegendKeeper export",
      },
      { href: "/vs/world-anvil", label: "vs World Anvil" },
      { href: "/vs/obsidian", label: "vs Obsidian" },
      { href: "/worldbuilding-tool", label: "worldbuilding tool" },
      {
        href: "/free-rpg-campaign-manager",
        label: "Free RPG campaign manager",
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
    secondaryCtaText: "Import Kanka Export",
    secondaryCtaHref: "/import/kanka-json",
    keywords: [
      "codex cryptica vs kanka",
      "kanka alternative",
      "kanka rpg campaign manager",
      "free kanka alternative",
    ],
    migrationStrip: [
      { icon: "icon-[lucide--cloud-download]", label: "Kanka JSON Export" },
      { icon: "icon-[lucide--file-text]", label: "Plain Markdown Files" },
      { icon: "icon-[lucide--network]", label: "Interactive Entity Graph" },
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
      { href: "/import/kanka-json", label: "Import Kanka export" },
      { href: "/vs/world-anvil", label: "vs World Anvil" },
      {
        href: "/free-rpg-campaign-manager",
        label: "Free RPG campaign manager",
      },
      { href: "/worldbuilding-tool", label: "worldbuilding tool" },
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
