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
}

export const ONBOARDING_TOUR: GuideStep[] = [
  {
    id: "welcome",
    targetSelector: "body",
    title: "Welcome to Codex Cryptica",
    content:
      "This tool gives you absolute control over your campaign notes. Everything stays on your computer for total privacy.",
    position: "bottom",
  },
  {
    id: "vault",
    targetSelector: '[data-testid="open-vault-button"]',
    title: "Open a Vault",
    content:
      "Choose a folder on your computer to store your files. Your lore is saved as standard Markdown files.",
    position: "bottom",
  },
  {
    id: "search",
    targetSelector: '[data-testid="search-input"]',
    title: "Quick Search",
    content:
      "Press `Cmd+K` to search everything. Find NPCs, locations, and events instantly.",
    position: "bottom",
  },
  {
    id: "graph",
    targetSelector: '[data-testid="graph-canvas"]',
    title: "Knowledge Graph",
    content:
      "See how everything connects. Press `C` to start linking people and places together.",
    position: "top",
  },
  {
    id: "oracle",
    targetSelector: '[data-testid="oracle-orb"]',
    title: "Lore Oracle",
    content:
      "Ask the AI questions about your world or type `/draw` to generate character art.",
    position: "top",
  },
  {
    id: "settings",
    targetSelector: '[data-testid="settings-button"]',
    title: "Settings",
    content:
      "Manage your AI keys, change NPC categories, or set up Google Drive syncing.",
    position: "bottom",
  },
];

export const FEATURE_HINTS: Record<string, FeatureHint> = {
  "connect-mode": {
    id: "connect-mode",
    title: "Linking Nodes",
    content:
      "Click one node and then another to create a relationship between them.",
  },
  "oracle-image": {
    id: "oracle-image",
    title: "Saving Art",
    content:
      "You can drag any AI-generated image onto an entry in the sidebar to save it as their portrait.",
  },
  "proposer-discovery": {
    id: "proposer-discovery",
    title: "New Connection Found",
    content:
      "The AI found a potential link in your notes. Check 'Oracle Suggestions' to review it.",
  },
  "node-merging": {
    id: "node-merging",
    title: "Merging Nodes",
    content:
      "You can combine duplicates. Select two or more nodes, right-click, and choose 'Merge Nodes'.",
  },
  "fog-of-war": {
    id: "fog-of-war",
    title: "Hiding Spoilers",
    content:
      "Right-click a node to hide it from the graph. Great for keeping secrets during a session!",
  },
  "vault-switcher": {
    id: "vault-switcher",
    title: "Switching Campaigns",
    content:
      "Click your Vault's name at the top to switch to a different campaign folder.",
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
