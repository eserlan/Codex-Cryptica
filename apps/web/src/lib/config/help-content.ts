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
  "lore-oracle": {
    id: "lore-oracle",
    title: "AI Oracle",
    content:
      "Chat with the AI about your world. Ask questions, brainstorm ideas, or get help writing descriptions directly from your notes.",
    icon: "icon-[lucide--sparkles]",
  },
  "visual-graph": {
    id: "visual-graph",
    title: "Visual Graph",
    content:
      "Navigate your lore through a dynamic, interactive map. See exactly how characters, locations, and events intertwine.",
    icon: "icon-[lucide--share-2]",
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
      "Connect people and locations. Click one item then another to link them together.",
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
    title: "Combine Entries",
    content:
      "Merge duplicate notes. Pick two or more items to combine them into one.",
    icon: "icon-[lucide--git-merge]",
  },
  "fog-of-war": {
    id: "fog-of-war",
    title: "Hide Secrets",
    content:
      "Keep secrets hidden. Hide items from your map so players don't see them during a session.",
    icon: "icon-[lucide--eye-off]",
  },
  "vault-switcher": {
    id: "vault-switcher",
    title: "Switching Stories",
    content:
      "Change your campaign. Click the folder name at the top to switch to a different story.",
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
  "zen-templates": {
    id: "zen-templates",
    title: "Change the Look",
    content:
      "Instantly change the way the app looks and speaks. Pick a new style like Fantasy or Sci-Fi to change colors, fonts, and even the words used in the buttons.",
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
      "Explore the tool with pre-loaded sample data. Any changes you make are transient. Click 'Save as Campaign' in Settings or the Oracle to keep your work.",
    icon: "icon-[lucide--play-circle]",
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
