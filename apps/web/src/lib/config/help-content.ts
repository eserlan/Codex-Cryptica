/**
 * Static content for the Help and Guide System.
 * Bundled with the application to ensure 100% offline availability.
 */

export interface GuideStep {
  id: string;
  targetSelector: string;
  title: string;
  content: string;
  position: "top" | "bottom" | "left" | "right";
}

import { loadHelpArticles, type HelpArticle } from "$lib/content/loader";

export type { HelpArticle };

export interface FeatureHint {
  id: string;
  title: string;
  content: string;
  icon?: string;
}

/**
 * LocalStorage keys for feature hints.
 * Used to track which hints the user has already seen.
 */
export const HINT_KEYS = {
  ORACLE_CONNECTION: "oracle-hint-seen",
  FRONT_PAGE: "front-page-hint-seen",
  VTT_MODE: "vtt-mode-hint-seen",
} as const;

export const ONBOARDING_TOUR: GuideStep[] = [
  {
    id: "welcome",
    targetSelector: "body",
    title: "Welcome to Codex Cryptica",
    content:
      "This tool gives you absolute control over your world notes. Everything stays on your computer for total privacy.",
    position: "bottom",
  },
  {
    id: "vault",
    targetSelector: '[data-testid="open-vault-button"]',
    title: "Vault Management",
    content:
      "This is your active story. Click here to switch between different worlds or create a new vault.",
    position: "bottom",
  },
  {
    id: "graph",
    targetSelector: '[data-testid="nav-graph"]',
    title: "Knowledge Graph",
    content:
      "The primary view of your world. See how Character, Locations, and Events connect through an interactive web.",
    position: "bottom",
  },
  {
    id: "map",
    targetSelector: '[data-testid="nav-map"]',
    title: "Tactical Maps",
    content:
      "Plot your world data onto geographic or tactical canvases with persistent pins and Fog of War.",
    position: "bottom",
  },
  {
    id: "canvas",
    targetSelector: '[data-testid="nav-canvas"]',
    title: "Spatial Canvas",
    content:
      "Design custom layouts like conspiracy boards or quest flowcharts on an infinite board.",
    position: "bottom",
  },
  {
    id: "search",
    targetSelector: '[data-testid="search-input"]',
    title: "Quick Search",
    content:
      "Find anything instantly. Press `Cmd+K` from anywhere to search NPCs, locations, and lore.",
    position: "bottom",
  },
  {
    id: "oracle",
    targetSelector: '[data-testid="activity-bar-oracle"]',
    title: "Lore Oracle",
    content:
      "Consult the AI about your world or perform utility tasks like /roll and /create.",
    position: "right",
  },
  {
    id: "explorer",
    targetSelector: '[data-testid="activity-bar-explorer"]',
    title: "Entity Explorer",
    content:
      "Quickly find and filter your characters and locations via the persistent sidebar.",
    position: "right",
  },
  {
    id: "dice",
    targetSelector: '[data-testid="dice-roller-button"]',
    title: "Polyhedral Dice",
    content:
      "Quick access to the Die Roller modal for all your standard RPG dice needs.",
    position: "bottom",
  },
  {
    id: "importer",
    targetSelector: '[data-testid="import-vault-button"]',
    title: "Archive Importer",
    content:
      "Quickly bring your existing notes or JSON data into the Codex via the dedicated importer.",
    position: "bottom",
  },
  {
    id: "settings",
    targetSelector: '[data-testid="settings-button"]',
    title: "System Settings",
    content:
      "Configure your AI keys, adjust visual themes, and manage NPC categories.",
    position: "bottom",
  },
];

export const FEATURE_HINTS: Record<string, FeatureHint> = {
  "lore-oracle": {
    id: "lore-oracle",
    title: "AI Oracle",
    content:
      "Chat with the AI about your world. Ask questions, brainstorm ideas, or get help writing descriptions directly from your notes. Use the system proxy for free access, or add your own API key for direct connection.",
    icon: "icon-[lucide--sparkles]",
  },
  "oracle-connection-modes": {
    id: "oracle-connection-modes",
    title: "Oracle Connection Modes",
    content:
      "The Oracle works in two modes: System Proxy (free, uses shared access) or Custom API Key (direct connection to Google Gemini). The status badge in the Oracle sidebar shows which mode is active.",
    icon: "icon-[lucide--cloud]",
  },
  "visual-graph": {
    id: "visual-graph",
    title: "Visual Graph",
    content:
      "Navigate your lore through a dynamic, interactive web. Nodes grow visually larger as visible links accumulate around them, making major lore hubs easy to identify at a glance.",
    icon: "icon-[lucide--share-2]",
  },
  "front-page": {
    id: "front-page",
    title: "World Front Page",
    content:
      "Use the briefing field to edit the world blurb directly. If it is empty, the Generate Briefing button appears inside the field; if it already has text, the generate action moves to the bottom next to Save Briefing. Tagged `frontpage` entities stay pinned at the top of recent entities and show their chronicle/body preview there.",
    icon: "icon-[lucide--house]",
  },
  "local-folder-sync": {
    id: "local-folder-sync",
    title: "Local Folder Sync",
    content:
      "Keep your internal archive in sync with a folder on your machine. This allows you to use external tools like Obsidian to edit your world data seamlessly.",
    icon: "icon-[lucide--folder-sync]",
  },
  "total-privacy": {
    id: "total-privacy",
    title: "Total Privacy",
    content:
      "Your notes stay on your device. We use local storage for maximum security with no cloud accounts required.",
    icon: "icon-[lucide--shield-check]",
  },
  "connect-mode": {
    id: "connect-mode",
    title: "Linking Notes",
    content:
      "Connect people and locations. Click one item then another to link them together, or right-click two selected items to connect them.",
    icon: "icon-[lucide--link]",
  },
  "oracle-image": {
    id: "oracle-image",
    title: "AI Generated Art",
    content:
      "Save art made by the Artificial Intelligence (AI). You can drag any image created by the AI onto an entry to save it as their portrait.",
    icon: "icon-[lucide--image]",
  },
  "proposer-discovery": {
    id: "proposer-discovery",
    title: "AI Suggestions",
    content:
      "The AI finds new links in your notes and suggests connections you might have missed.",
    icon: "icon-[lucide--lightbulb]",
  },
  "node-merging": {
    id: "node-merging",
    title: "Multi-Selection Actions",
    content:
      "Use the toolbar to quickly Apply Labels to multiple items or Merge duplicates into a single entry.",
    icon: "icon-[lucide--layers]",
  },
  "fog-of-war": {
    id: "fog-of-war",
    title: "Hide Secrets",
    content:
      "Keep secrets hidden. Hide items from your map so players don't see them during a session. Press `P` to toggle the preview.",
    icon: "icon-[lucide--eye-off]",
  },
  "vault-switcher": {
    id: "vault-switcher",
    title: "Switching Stories",
    content:
      "Change your world. Click the folder name at the top to switch to a different story.",
    icon: "icon-[lucide--folder-sync]",
  },
  "era-date-picker": {
    id: "era-date-picker",
    title: "Pick Dates",
    content:
      "Pick years quickly without typing. Click the grid to zoom into specific decades and years.",
    icon: "icon-[lucide--calendar]",
  },
  "import-resume": {
    id: "import-resume",
    title: "Smart Importing",
    content:
      "Safe file loading. If a file import stops, just pick the file again to finish where you left off.",
    icon: "icon-[lucide--file-up]",
  },
  themes: {
    id: "themes",
    title: "Themes",
    content:
      "Instantly transform the look and feel of your workspace. Choose from a variety of distinct visual themes—from Ancient Parchment to Sci-Fi Terminal—to perfectly match the genre of your story.",
    icon: "icon-[lucide--palette]",
  },
  "draw-button": {
    id: "draw-button",
    title: "Instant Visualization",
    content:
      "For Advanced Tier users: Instantly generate visuals for your lore. Look for the 'DRAW' button on Oracle responses or in the sidepanel for entities without images. The AI respects your 'Art Style' notes.",
    icon: "icon-[lucide--brush]",
  },
  "demo-mode": {
    id: "demo-mode",
    title: "Demo Mode",
    content:
      "Explore the tool with pre-loaded sample data. Any changes you make are transient. Click 'Save as World' in Settings or the Oracle to keep your work.",
    icon: "icon-[lucide--play-circle]",
  },
  "ai-disabled": {
    id: "ai-disabled",
    title: "AI Disabled",
    content:
      "Prefer a non-AI experience? Enable AI Disabled in Settings to disable all AI-powered features. The Oracle remains available for utility commands like /roll, /create, /connect and /merge.",
    icon: "icon-[lucide--zap-off]",
  },
  "seo-prerendering": {
    id: "seo-prerendering",
    title: "SEO Prerendering",
    content:
      "Our marketing and legal pages are pre-baked as static HTML for instant loading and perfect search engine indexing, while your data remains private and client-side.",
    icon: "icon-[lucide--search]",
  },
  "map-mode": {
    id: "map-mode",
    title: "Map Mode",
    content:
      "Plot your world data onto custom geographic or tactical canvases with persistent pins and Fog of War.",
    icon: "icon-[lucide--map]",
  },
  "vtt-mode": {
    id: "vtt-mode",
    title: "VTT Mode",
    content:
      "Turn the map into a lightweight tactical board. Add tokens, move them with grid snapping, manage initiative, measure distances, and save encounters without changing the underlying map.",
    icon: "icon-[lucide--swords]",
  },
  "vtt-entity-list": {
    id: "vtt-entity-list",
    title: "VTT Entity List",
    content:
      "Open Vault Entities in the VTT sidebar to search your world notes, then drag characters, creatures, or items straight onto the map to create tokens. A ghost marker follows your cursor so placement stays precise.",
    icon: "icon-[lucide--panel-right]",
  },
  "spatial-canvas": {
    id: "spatial-canvas",
    title: "Spatial Canvas",
    content:
      "Design custom layouts like conspiracy boards or quest flowcharts. Drag entities onto the infinite board, draw visual links with custom themed labels, and navigate via name-based URL slugs. Includes a theme-aware MiniMap for seamless navigation.",
    icon: "icon-[lucide--layout-dashboard]",
  },
  "the-archive": {
    id: "the-archive",
    title: "The Archive",
    content:
      "Visit our blog for deep dives into data sovereignty and tactical world-building guides. Check out our Comprehensive Help Guide for a full system manual.",
    icon: "icon-[lucide--archive]",
  },
  "dice-rolling": {
    id: "dice-rolling",
    title: "Die Roller",
    content:
      "Perform polyhedral dice rolls via the /roll command in Oracle chat or using the dedicated Die Roller modal. Click dice icons in quick succession to roll multiple dice at once, and use the reroll button to instantly repeat any previous roll.",
    icon: "icon-[lucide--dices]",
  },
  "entity-explorer": {
    id: "entity-explorer",
    title: "Entity Explorer",
    content:
      "Quickly browse and filter all your world entities via the persistent sidebar. Search by title, labels, or alternative names (aliases). Switch between List and Label views to group entities by their labels. Click label pills to filter the explorer, or use Ctrl/Cmd+Click to combine multiple labels for a focused drill-down.",
    icon: "icon-[lucide--database]",
  },
  "activity-bar": {
    id: "activity-bar",
    title: "Navigation Hub",
    content:
      "Access your core tools (Oracle, Explorer) via the Activity Bar on the leftmost edge. Tools remain persistent as you switch between Graph, Map, and Canvas views.",
    icon: "icon-[lucide--layout-panel-left]",
  },
  "proactive-discovery": {
    id: "proactive-discovery",
    title: "Proactive Discovery",
    content:
      "While you chat, the Oracle can identify new characters, locations, and items. In Settings, choose whether discoveries are off, shown as chips for review, or saved automatically as drafts.",
    icon: "icon-[lucide--search-check]",
  },
  "oracle-automation": {
    id: "oracle-automation",
    title: "Oracle Automation",
    content:
      "Entity Discovery controls record creation. Connection Discovery controls graph links. Keep connections on Suggest if you want proposed edges reviewed before they appear on the graph.",
    icon: "icon-[lucide--sliders-horizontal]",
  },
  "draft-review": {
    id: "draft-review",
    title: "Reviewing Drafts",
    content:
      "Entities created via Auto-Archive appear as 'Drafts'. Find them in the Review tab of the Entity Explorer or as semi-transparent 'Ghost' nodes on the graph canvas. Click Verify to make them permanent.",
    icon: "icon-[lucide--clipboard-check]",
  },
};

let initialArticles: HelpArticle[] = [];
try {
  initialArticles = loadHelpArticles();
} catch (e) {
  console.error("Failed to load help articles:", e);
  // We fall back to empty array to allow the app to build/run without help content
  // instead of crashing the entire module initialization.
}

export const HELP_ARTICLES: HelpArticle[] = initialArticles;
