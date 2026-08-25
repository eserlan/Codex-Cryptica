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
  /** Optional operating-model comparison for hosted, self-hosted, and local-first workflows. */
  hostingComparison?: {
    eyebrow: string;
    title: string;
    description: string;
    columns: [string, string, string];
    rows: Array<{
      factor: string;
      values: [string, string, string];
    }>;
  };
  /** Optional product screenshot and supporting copy. */
  productProof?: {
    eyebrow: string;
    title: string;
    description: string;
    imageSrc: string;
    imageAlt: string;
    imageWidth: number;
    imageHeight: number;
    caption: string;
  };
  /** Optional fair-fit guidance for choosing between the compared products. */
  decisionGuidance?: Array<{
    title: string;
    description: string;
    items: string[];
  }>;
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
    title: "Self-Hosted Kanka Alternative: No Server | Codex Cryptica",
    description:
      "Looking for a self-hosted Kanka alternative? Codex keeps your campaign local and offline—no account or campaign server to run. Import a copy and compare.",
    eyebrow: "Looking for a self-hosted Kanka alternative?",
    h1: "Keep the control. Skip the server.",
    subheading:
      "Codex Cryptica keeps your campaign on your own device — no account, hosted campaign service, or server administration required.",
    introText:
      "Kanka self-hosting gives you control by running your own server. Codex gives you control by not needing one. Kanka also offers a capable hosted service with unlimited campaigns and entries on its free plan; Codex takes a different route by keeping the core campaign workflow local-first.\n\nKeep your Kanka campaign exactly where it is. Import a copy into Codex and see whether a local, offline Kanka alternative works better for you.",
    ctaText: "Open Codex — No Account Required",
    secondaryCtaText: "Import a Kanka Copy",
    secondaryCtaHref: "/import/kanka-json",
    keywords: [
      "codex cryptica vs kanka",
      "kanka alternative",
      "kanka self hosted",
      "self hosted kanka alternative",
      "kanka alternative self hosted",
      "local kanka alternative",
      "offline kanka alternative",
      "kanka alternative no server",
    ],
    migrationStrip: [
      { icon: "icon-[lucide--copy]", label: "A Copy of Your Kanka Export" },
      { icon: "icon-[lucide--file-text]", label: "Local Markdown Vault" },
      { icon: "icon-[lucide--network]", label: "Interactive Entity Graph" },
    ],
    hostingComparison: {
      eyebrow: "Self-hosted or local-first?",
      title: "Kanka can be self-hosted. So why Codex?",
      description:
        "Self-hosting and local-first both put you in control, but they ask different things of you. Kanka's free edition can be self-hosted by operating its application services. Codex stores the working campaign on your device, so there is no campaign server to deploy, secure, patch, or keep online. You should still back up your local vault, just as you would any important files.",
      columns: ["Hosted Kanka", "Self-hosted Kanka", "Codex Cryptica"],
      rows: [
        {
          factor: "Who runs the campaign server?",
          values: ["Kanka", "You", "No campaign server"],
        },
        {
          factor: "You maintain infrastructure",
          values: ["No", "Yes", "No"],
        },
        {
          factor: "Campaign data under your control",
          values: ["Hosted, with export", "Yes", "Yes, stored locally"],
        },
        {
          factor: "Offline-first core workflow",
          values: ["No", "Depends on your deployment", "Yes"],
        },
        {
          factor: "Account model",
          values: [
            "Kanka account",
            "Self-managed account",
            "No account required",
          ],
        },
        {
          factor: "Working data",
          values: [
            "Application database, with export",
            "Self-hosted application database",
            "Local vault and portable Markdown",
          ],
        },
      ],
    },
    features: [
      {
        title: "Relationship Graph",
        description:
          "See how characters, factions, locations, and events connect in an interactive graph built from your campaign entities.",
        icon: "icon-[lucide--network]",
      },
      {
        title: "Maps & Timelines",
        description:
          "Organize locations on maps and track events across custom calendars, so geography and campaign history stay connected to your lore.",
        icon: "icon-[lucide--map]",
      },
      {
        title: "Campaign Tools & Generators",
        description:
          "Create NPCs, factions, quests, dungeons, and other table-ready material, then use built-in dice, encounter, and session tools when play begins.",
        icon: "icon-[lucide--sparkles]",
      },
    ],
    productProof: {
      eyebrow: "See the local vault in action",
      title: "A real campaign workspace, not just a file viewer",
      description:
        "Codex turns your local campaign entities into an explorable relationship graph. Follow connections between characters, factions, places, and events while the underlying vault remains under your control.",
      imageSrc: "/images/living-lore-graph.png",
      imageAlt:
        "Codex Cryptica relationship graph connecting campaign characters, locations, and factions",
      imageWidth: 1996,
      imageHeight: 1089,
      caption:
        "The relationship graph is built from the same local vault data you write and organize in Codex Cryptica.",
    },
    comparisonTable: [
      {
        feature: "Deployment model",
        competitorHas: "Hosted service; free edition can be self-hosted",
        codexHas: "Local-first app; no campaign server to operate",
      },
      {
        feature: "Core free-plan capacity",
        competitorHas: "Unlimited campaigns and entries",
        codexHas: "No local campaign or entity limit",
      },
      {
        feature: "Offline core workflow",
        competitorHas:
          "Hosted Kanka requires its service; self-hosting depends on deployment",
        codexHas: "Yes — the core vault is local-first",
      },
      {
        feature: "Account for the core workflow",
        competitorHas: "Kanka account or a self-managed account",
        codexHas: "No account required",
      },
      {
        feature: "Working data and portability",
        competitorHas:
          "Application-managed data with JSON and Markdown exports",
        codexHas: "Browser-local vault with Markdown folder sync",
      },
      {
        feature: "Multi-user collaboration",
        competitorHas:
          "Mature hosted roles, permissions, and multi-device access",
        codexHas: "Local-first workflow with selected-content guest sessions",
      },
    ],
    verdict:
      "Neither approach is universally better. Kanka is the stronger fit when a mature hosted campaign wiki and easy multi-user access matter most.\n\nCodex Cryptica is the stronger fit when you want local working data, offline access, portable Markdown, and control without operating a self-hosted web application.",
    decisionGuidance: [
      {
        title: "Choose Kanka if…",
        description:
          "You want collaboration and hosted access handled for you.",
        items: [
          "A hosted service is your preferred workflow",
          "Easy multi-user collaboration is the priority",
          "You want campaign access across devices through a hosted platform",
          "You prefer a mature hosted campaign wiki experience",
        ],
      },
      {
        title: "Choose Codex Cryptica if…",
        description:
          "You want local control without becoming a server administrator.",
        items: [
          "You want campaign data stored locally",
          "Offline access matters at your table",
          "You prefer portable local files and Markdown",
          "You do not want to operate a self-hosted web application",
          "You want no account dependency for the core workflow",
        ],
      },
    ],
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
        question: "Is Codex Cryptica a self-hosted alternative to Kanka?",
        answer:
          "Codex is an alternative to self-hosting rather than a traditional self-hosted server. Its local-first core stores your campaign on your own device, so you get local control and offline access without deploying a campaign server.",
      },
      {
        question: "Can Kanka be self-hosted?",
        answer:
          "Yes. Kanka documents that its free edition can be self-hosted. That route involves running its application services yourself, and Kanka notes that premium features and official self-hosting support are not included.",
      },
      {
        question: "Do I need to run a server for Codex Cryptica?",
        answer:
          "No. Codex Cryptica's core campaign workflow runs in your browser and stores the vault locally. You do not need to deploy, secure, update, or maintain a campaign server.",
      },
      {
        question:
          "Can I try Codex without deleting or moving my Kanka campaign?",
        answer:
          "Yes. Export your Kanka campaign and import a copy into Codex. Your original Kanka campaign stays where it is while you evaluate the local-first workflow.",
      },
      {
        question: "What happens to my Kanka export in Codex?",
        answer:
          "Codex processes the copied export into a local vault so you can preview and explore the imported campaign. Nothing is removed from your Kanka campaign, and you decide whether to keep using the Codex copy.",
      },
      {
        question: "Does Codex support shared campaigns like Kanka does?",
        answer:
          "Kanka is the more mature choice for ongoing hosted, multi-user editing. Codex focuses on a local-first GM workflow and can share selected content through guest sessions.",
      },
    ],
  },
};
