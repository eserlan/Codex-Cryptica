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
        content: "Discover a new way to manage your RPG campaigns with **local-first sovereignty** and AI-powered lore expansion. Your data never leaves your device.",
        position: "bottom"
    },
    {
        id: "vault",
        targetSelector: '[data-testid="open-vault-button"]',
        title: "Your Archive",
        content: "Connect to a local folder on your computer. All your lore will be stored as human-readable Markdown files.",
        position: "bottom"
    },
    {
        id: "search",
        targetSelector: '[data-testid="search-input"]',
        title: "Omni-Search",
        content: "Press `Cmd+K` to search through your entire campaign. We use fuzzy matching to find exactly what you're looking for.",
        position: "bottom"
    },
    {
        id: "graph",
        targetSelector: '[data-testid="graph-canvas"]',
        title: "Knowledge Graph",
        content: "Visualize the connections between your NPCs, locations, and artifacts. Press `C` to enter Connect Mode and link entities.",
        position: "top"
    },
    {
        id: "oracle",
        targetSelector: '[data-testid="oracle-orb"]',
        title: "Lore Oracle",
        content: "Ask the AI anything about your world. It understands the context of your graph and helps you expand your lore.",
        position: "top"
    },
    {
        id: "settings",
        targetSelector: '[data-testid="settings-button"]',
        title: "Configuration",
        content: "Manage your categories, AI settings, and cloud synchronization here.",
        position: "bottom"
    }
];

export const FEATURE_HINTS: Record<string, FeatureHint> = {
    "connect-mode": {
        id: "connect-mode",
        title: "Connect Mode",
        content: "Click a source node, then click a target node to create a connection."
    },
    "oracle-image": {
        id: "oracle-image",
        title: "Visualizing Lore",
        content: "You can drag generated images onto any entity in the detail panel to save them as thumbnails."
    }
};

export const HELP_ARTICLES: HelpArticle[] = [
    {
        id: "intro",
        title: "Getting Started",
        tags: ["basics", "vault"],
        content: "## Welcome to the Archive\n\nCodex Cryptica is designed to give you **absolute sovereignty** over your lore. Everything you write is saved as a Markdown file in your local vault.\n\n### Core Concepts\n- **Entities**: The building blocks of your world (NPCs, Locations, Items).\n- **Chronicles**: The main text content of an entity.\n- **Lore**: Hidden attributes and meta-data used by the Oracle for context."
    },
    {
        id: "graph-basics",
        title: "Knowledge Graph",
        tags: ["navigation", "connections"],
        content: "## Mastering the Graph\n\nThe graph is your primary way to navigate. \n\n### Shortcuts\n- `C`: Toggle Connect Mode.\n- `Scroll`: Zoom in/out.\n- `Drag`: Pan the view.\n- `Click Node`: Focus entity and open detail panel."
    },
    {
        id: "oracle-guide",
        title: "The Lore Oracle",
        tags: ["ai", "gemini", "rag"],
        content: "## AI Intelligence\n\nThe Oracle is powered by **Google Gemini**. It doesn't just 'chat'; it retrieves relevant lore from your graph to provide context-aware answers.\n\n### Features\n- **Context Fusion**: Combines visible chronicles and hidden lore.\n- **Image Generation**: Type `/draw [description]` to visualize your world."
    },
    {
        id: "offline-sync",
        title: "Privacy & Sync",
        tags: ["offline", "google drive", "security"],
        content: "## Local-First Always\n\nYour data is yours. \n\n### Cloud Sync\nYou can optionally enable **Google Drive Mirroring** in the settings. This creates a one-to-one copy of your local files in your Drive, enabling multi-device sync without a centralized server."
    }
];
