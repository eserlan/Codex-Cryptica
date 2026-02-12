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

export interface HelpArticle {
  id: string;
  title: string;
  tags: string[];
  content: string;
}

export interface FeatureHint {
  id: string;
  title: string;
  content: string;
}

export const ONBOARDING_TOUR: GuideStep[] = [
  {
    id: "welcome",
    targetSelector: "body",
    title: "Welcome to Codex Cryptica",
    content:
      "Discover a new way to manage your RPG campaigns with **local-first sovereignty** and AI-powered lore expansion. Your data never leaves your device.",
    position: "bottom",
  },
  {
    id: "vault",
    targetSelector: '[data-testid="open-vault-button"]',
    title: "Your Archive",
    content:
      "Connect to a local folder on your computer. All your lore will be stored as human-readable Markdown files.",
    position: "bottom",
  },
  {
    id: "search",
    targetSelector: '[data-testid="search-input"]',
    title: "Omni-Search",
    content:
      "Press `Cmd+K` to search through your entire campaign. We use fuzzy matching to find exactly what you're looking for.",
    position: "bottom",
  },
  {
    id: "graph",
    targetSelector: '[data-testid="graph-canvas"]',
    title: "Knowledge Graph",
    content:
      "Visualize the connections between your NPCs, locations, and artifacts. Press `C` to enter Connect Mode and link entities.",
    position: "top",
  },
  {
    id: "oracle",
    targetSelector: '[data-testid="oracle-orb"]',
    title: "Lore Oracle",
    content:
      "Ask the AI anything about your world. It understands the context of your graph and helps you expand your lore.",
    position: "top",
  },
  {
    id: "settings",
    targetSelector: '[data-testid="settings-button"]',
    title: "Configuration",
    content:
      "Manage your categories, AI settings, and cloud synchronization here.",
    position: "bottom",
  },
];

export const FEATURE_HINTS: Record<string, FeatureHint> = {
  "connect-mode": {
    id: "connect-mode",
    title: "Connect Mode",
    content:
      "Click a source node, then click a target node to create a connection.",
  },
  "oracle-image": {
    id: "oracle-image",
    title: "Visualizing Lore",
    content:
      "You can drag generated images onto any entity in the detail panel to save them as thumbnails.",
  },
  "proposer-discovery": {
    id: "proposer-discovery",
    title: "Hidden Connections Found",
    content:
      "The Oracle has detected potential relationships in your lore. Check the 'Oracle Suggestions' section in the detail panel to review them.",
  },
};

export const HELP_ARTICLES: HelpArticle[] = [
  {
    id: "intro",
    title: "Getting Started",
    tags: ["basics", "vault"],
    content:
      "## Welcome to the Archive\n\nCodex Cryptica is designed to give you **absolute sovereignty** over your lore. Everything you write is saved as a Markdown file in your local vault.\n\n### Core Concepts\n- **Entities**: The building blocks of your world (NPCs, Locations, Items).\n- **Chronicles**: The main text content of an entity.\n- **Lore**: Hidden attributes and meta-data used by the Oracle for context.",
  },
  {
    id: "proposer-guide",
    title: "Connections Proposer",
    tags: ["ai", "connections", "discovery"],
    content:
      "## Automated Discovery\n\nThe **Connections Proposer** works in the background to find hidden links between your entities. It uses the Lore Oracle to analyze your writing and suggest relationships you might have missed.\n\n### How it Works\n1. **Background Scan**: When you view an entity, the system silently checks for potential links to other records.\n2. **Review**: Suggestions appear at the bottom of the detail panel.\n3. **Apply**: Click the checkmark to create a real connection.\n4. **Dismiss**: Click 'X' to ignore. Dismissed suggestions are saved in history just in case.",
  },
  {
    id: "graph-basics",
    title: "Knowledge Graph",
    tags: ["navigation", "connections"],
    content:
      "## Mastering the Graph\n\nThe graph is your primary way to navigate. \n\n### Shortcuts\n- `C`: Toggle Connect Mode.\n- `Scroll`: Zoom in/out.\n- `Drag`: Pan the view.\n- `Click Node`: Focus entity and open detail panel.",
  },
  {
    id: "oracle-guide",
    title: "The Lore Oracle",
    tags: ["ai", "gemini", "rag"],
    content:
      "## AI Intelligence\n\nThe Oracle is powered by **Google Gemini**. It doesn't just 'chat'; it retrieves relevant lore from your graph to provide context-aware answers.\n\n### Features\n- **Context Fusion**: Combines visible chronicles and hidden lore.\n- **Image Generation**: Type `/draw [description]` to visualize your world.",
  },
  {
    id: "offline-sync",
    title: "Privacy & Sync",
    tags: ["offline", "google drive", "security"],
    content:
      "## Local-First Always\n\nYour data is yours. \n\n### Cloud Sync\nYou can optionally enable **Google Drive Mirroring** in the settings. This creates a one-to-one copy of your local files in your Drive, enabling multi-device sync without a centralized server.",
  },
  {
    id: "gemini-api-key",
    title: "Acquiring a Gemini API Key",
    tags: ["ai", "gemini", "setup"],
    content:
      "## How to get your Gemini API Key\n\nCodex Cryptica uses Google Gemini to power the Lore Oracle. Follow these steps to get a free key:\n\n1. **Visit Google AI Studio**: Go to [aistudio.google.com](https://aistudio.google.com/app/apikey).\n2. **Sign In**: Use your standard Google Account.\n3. **Create API Key**: Click on 'Get API key' in the sidebar, then click 'Create API key in new project'.\n4. **Copy & Paste**: Copy the generated key and paste it into the **Intelligence** tab in Settings.\n\n### Why do I need this?\nUsing your own key ensures higher availability, faster response times, and access to the 'Advanced' tier for complex world-building tasks.",
  },
];
