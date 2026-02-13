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
  "node-merging": {
    id: "node-merging",
    title: "Consolidation Power",
    content:
      "You can merge multiple nodes to eliminate duplicates. Select 2+ nodes in the graph, right-click, and choose 'Merge Nodes'.",
  },
};

export const HELP_ARTICLES: HelpArticle[] = loadHelpArticles();
