import type { SEOImportPageData } from "./seo-pages";

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
