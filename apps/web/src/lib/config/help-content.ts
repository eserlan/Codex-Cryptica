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
 * LocalStorage keys for hints that persist their "seen" state directly via
 * LocalStorage (as opposed to `helpStore`). Add a key here only when wiring
 * another such hint.
 */
export const HINT_KEYS = {
  ORACLE_CONNECTION: "oracle-hint-seen",
  IN_APP_GENERATORS: "in-app-generators-hint-seen",
  CREATURE_PACKS: "creature-packs-hint-seen",
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
  "oracle-memory": {
    id: "oracle-memory",
    title: "Oracle Memory",
    content:
      "The Oracle remembers your chat and the notes it has already seen, so each new question only sends what changed — replies come back quicker and use less of your quota. To do this on the free System Proxy, your conversation and the notes it references are briefly stored on Google's servers (up to 55 days) and then expire. Your vault always stays on your computer; only the chat does this. To keep everything fully on your device, use your own API key instead of the System Proxy.",
    icon: "icon-[lucide--brain]",
  },
  "family-tree": {
    id: "family-tree",
    title: "Family Tree",
    content:
      "Open the Family tab on any character to see their parents, partner, children, and siblings laid out as a tree. Add family from the buttons below the tree — connect an existing character or create a new one — and the matching link is added to both people automatically. In the full-screen view, choose Lineage to explore every recorded generation. Drag to pan, scroll or pinch to zoom, and use the branch controls or Show all generations to reveal more. The tree is built from your normal connections, so nothing is stored twice.",
    icon: "icon-[lucide--network]",
  },
  "lineage-controls": {
    id: "lineage-controls",
    title: "Explore the lineage",
    content:
      "Drag to pan, scroll or pinch to zoom, and use ⊞ to expand a branch. Choose Show all generations to reveal the whole recorded lineage.",
    icon: "icon-[lucide--git-branch]",
  },
  "visual-graph": {
    id: "visual-graph",
    title: "Visual Graph",
    content:
      "Navigate your lore through a dynamic, interactive web. Nodes grow visually larger as visible links accumulate around them, making major lore hubs easy to identify at a glance.",
    icon: "icon-[lucide--share-2]",
  },
  "world-chronology": {
    id: "world-chronology",
    title: "World Chronology",
    content:
      "Browse your world's history in Calendar mode (month grid) or Agenda mode (chronological list). The calendar shows your world's own year — use Previous / Next to navigate months, or click the month title to jump straight to a year with the scroll picker. Click an entry to open it in the detail panel; double-click to open it full-screen. Double-click an empty area of any date cell to open the entity creation form with that date pre-filled as the start date. Drag an entity from the left sidebar onto any calendar day to set its start or end date. If an entity has a date, click that date text in the detail panel to jump the calendar straight to it. Approximate and undated events appear only in Agenda mode under 'Undated/Approximate'. Use the Type, Label, and 'include undated' toggles to narrow what's visible.",
    icon: "icon-[lucide--calendar-days]",
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
    title: "Load and Save Folders",
    content:
      "Use the linked folder as an external copy of your world. Save writes your internal archive to the folder for backups or editing in tools like Obsidian. Load pulls folder changes back into the app when you want to bring them in.",
    icon: "icon-[lucide--folder-sync]",
  },
  "cif-importer": {
    id: "cif-importer",
    title: "Codex Interchange Format (CIF) Import",
    content:
      "Drop a .cif.json file exported by another compatible worldbuilding tool to bring its entities, hierarchy, and links into your vault — entirely offline, with nothing sent anywhere. Broken files are rejected before you ever see a review screen, naming what's wrong. Re-importing a later export matches existing entries by their stable identity (never by title), so you can update, skip, or create per entry and see exactly what changed. Relationship labels like 'mother of' become real family links, the same as anywhere else in the app.",
    icon: "icon-[lucide--file-json-2]",
  },
  "search-indexing": {
    id: "search-indexing",
    title: "Search Indexing",
    content:
      "Search builds quietly in the background when a large vault opens. Early results may be incomplete while indexing is still running. If indexing fails, use Retry indexing to rebuild the local search index for the current vault.",
    icon: "icon-[lucide--search-check]",
  },
  "vault-save": {
    id: "vault-save",
    title: "Save to Folder",
    content:
      "The 'SAVE TO FOLDER' button writes your internal work to the linked folder. It only enables when you have unsaved changes, keeping the folder copy current.",
    icon: "icon-[lucide--upload-cloud]",
  },
  "vault-load": {
    id: "vault-load",
    title: "Load from Folder",
    content:
      "Use 'LOAD FROM FOLDER' in the Vault Selector to refresh your internal archive with changes from the linked folder. A safety gate warns you if unsaved internal work would be overwritten.",
    icon: "icon-[lucide--download-cloud]",
  },
  "public-world-directory": {
    id: "public-world-directory",
    title: "Public World Directory",
    content:
      "Sharing by link and listing publicly are separate choices. A guest snapshot stays unlisted until you open Publishing Settings, review the public preview, and save a directory listing. The public directory exposes only the saved title, description, labels, optional cover image, optional owner name, and the read-only guest link. All listed worlds display a provenance and copyright notice confirming they are user-created and independently published without rights-holder endorsement. Authors must confirm they have the legal right to publish their content, and visitors may report potential copyright concerns for moderation review.",
    icon: "icon-[lucide--globe]",
  },
  "guest-entity-links": {
    id: "guest-entity-links",
    title: "Sharing a Link to an Entry",
    content:
      "In a shared world, every entry has a link button (next to the entry title in the side panel and in the full-screen view). It copies a direct link that opens that entry full-screen for anyone you send it to. While browsing a shared world, the address bar also carries the current entry, so copying the address works too.",
    icon: "icon-[lucide--link]",
  },
  "table-view-filters": {
    id: "table-view-filters",
    title: "Table View Filters",
    content:
      "In table view, click a type badge or a label chip on any row to filter the table down to matching entries; click again (or use Clear) to remove the filter. Active label filters appear next to the type pills above the table. Every column header with an arrow, including Labels, can be clicked to sort.",
    icon: "icon-[lucide--filter]",
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
      "Select dates seamlessly using smooth, center-snapping scroll wheels. Features side-by-side vertical tracks, intercalary anchors, inline repair warnings on calendar change, and quick keyboard year/day overrides.",
    icon: "icon-[lucide--settings-2]",
  },
  "keyboard-navigation": {
    id: "keyboard-navigation",
    title: "Keyboard Navigation",
    content:
      "Use `Shift+Left` and `Shift+Right` arrows to quickly navigate back and forward through your recently viewed entities. Navigation history is preserved during your session. Shortcuts are disabled while editing text or when modals are open.",
    icon: "icon-[lucide--keyboard]",
  },
  "import-resume": {
    id: "import-resume",
    title: "Smart Importing",
    content:
      "Safe file loading. If a file import stops, just pick the file again to finish where you left off.",
    icon: "icon-[lucide--file-up]",
  },
  "creature-packs": {
    id: "creature-packs",
    title: "Creature Packs",
    content:
      "Populate a new vault fast with Creature Packs — curated sets of ready-to-use creatures. Open the Importer, scroll to the Creature Packs section, click a pack to preview every creature, deselect any you don't want, then import the rest. Each creature lands as a normal, fully editable entity in your vault. Works without an AI connection.",
    icon: "icon-[lucide--book-open]",
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
      "For Advanced Tier users: Instantly generate visuals for your lore. Look for the DRAW button on Oracle responses, entity panels, Zen mode, and graph nodes. The AI uses Art Direction from normal notes or entities, then Category Defaults and the active Default Art Style.",
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
  "voice-chat": {
    id: "voice-chat",
    title: "Session Voice Chat",
    content:
      "Talk to your players without leaving the app. While hosting a live session, press the Voice button in the header to open a voice channel. Connected players can join from their own header, mute their microphone, and see who else is talking.",
    icon: "icon-[lucide--mic]",
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
      "Quickly browse and filter all your world entities via the persistent sidebar. Search by title, labels, or alternative names (aliases). Switch between List and Label views to group entities by their labels. Click label pills to filter the explorer, or use Ctrl/Cmd+Click to combine multiple labels for a focused drill-down. On desktop widths of 1280px and above, keeping Entity Explorer open turns the main workspace into a side-by-side reader so you can select an entity on the left and read or edit it on the right. On smaller screens, selection keeps the existing full-screen Zen Mode behavior.",
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
      "Entity Discovery controls whether Oracle surfaces discovered records as suggestions. Connection Discovery controls whether Oracle surfaces link suggestions after it creates or updates a record.",
    icon: "icon-[lucide--sliders-horizontal]",
  },
  "adjustable-sidebars": {
    id: "adjustable-sidebars",
    title: "Adjustable Sidebars",
    content:
      "Dynamically resize the left and right sidebars to suit your workspace needs. Hover over the inner edge of a sidebar and drag left or right. Your custom widths are automatically saved across sessions.",
    icon: "icon-[lucide--separator-vertical]",
  },
  "draft-review": {
    id: "draft-review",
    title: "Reviewing Drafts",
    content:
      "Draft entities stay separate from your active lore until you review them. Open the Review tab in Entity Explorer, or use the draft controls in the entity panel, to approve or reject them.",
    icon: "icon-[lucide--clipboard-check]",
  },
  "ai-revision": {
    id: "ai-revision",
    title: "AI Description Revision",
    content:
      "Instantly generate or refine entity descriptions. The AI produces both a player-facing 'Chronicle' and a GM-facing 'Lore' entry based on your existing notes, tags, and connections. Review and save changes directly within the entity detail view.",
    icon: "icon-[lucide--sparkles]",
  },
  "p2p-connection-manager": {
    id: "p2p-connection-manager",
    title: "P2P Connection Manager",
    content:
      "Seamlessly establish peer-to-peer connections between campaign hosts and trusted guests. Features an active heartbeat monitor to maintain connection stability, measure round-trip latency, and support automatic reconnection backoffs during brief signal drops.",
    icon: "icon-[lucide--wifi]",
  },
  "quicknote-scratchpad": {
    id: "quicknote-scratchpad",
    title: "QuickNote Fast Scratchpad",
    content:
      "Capture fleeting ideas instantly. Press Ctrl+I or Cmd+I from anywhere to toggle the glassmorphic fast scratchpad. Jot down thoughts, auto-save drafts, and use the 'Elevate' button to let the AI structure your raw notes into complete Character, Location, or Item draft entities.",
    icon: "icon-[lucide--zap]",
  },
  "entity-hierarchy": {
    id: "entity-hierarchy",
    title: "Nested Entities",
    content:
      "Organize your world hierarchically. Drag and drop entities in the explorer to nest them under parents (e.g. putting a tavern inside a city). Expand/collapse nodes using the chevron. When you delete a parent, its children are promoted to the root level. Cycle detection prevents recursive loop errors.",
    icon: "icon-[lucide--folder-tree]",
  },
  "entity-auto-link": {
    id: "entity-auto-link",
    title: "Entity Links in Content",
    content:
      "When reading an entity's content or lore, names of other vault entities are automatically highlighted as clickable links. Click any highlighted name to navigate directly to that entity. Links work with full titles and registered aliases. They only appear in read mode — the editor shows plain text while you are writing.",
    icon: "icon-[lucide--link]",
  },
  "guest-character-chat": {
    id: "guest-character-chat",
    title: "Guest Character Chat",
    content:
      "Invite world participants to chat in-character with NPCs. GMs can enable guest chat on specific characters, configure a 'Public' or 'Hybrid' context scope, and review synced transcripts to promote emergent lore directly into official rumors.",
    icon: "icon-[lucide--messages-square]",
  },
  "in-app-generators": {
    id: "in-app-generators",
    title: "Campaign Generators",
    content:
      "Generate NPCs, factions, settlements, and magic items directly inside your vault. Every draft is reviewed before saving — nothing is written until you confirm.",
    icon: "icon-[lucide--wand-2]",
  },
  "entity-timeline": {
    id: "entity-timeline",
    title: "Entity Timeline",
    content:
      "Open any entity's detail panel and click the Timeline tab to see a chronological list of the events linked to that entity — battles, foundings, discoveries, and more. Events are sorted earliest to latest. Undated events appear at the end under an Undated heading. Click any event to open its full detail page. The timeline is read-only; to add an event to an entity's history, link the event using the entity's connections.",
    icon: "icon-[lucide--clock]",
  },
  "generator-local-mode": {
    id: "generator-local-mode",
    title: "Generators Work Offline",
    content:
      "The generators always work, even without a connection. Offline, Codex builds drafts from its built-in tables and saves them on your device — this is Local Mode. The AI Lore Co-Author option writes richer, one-of-a-kind lore but needs the internet, so it's switched off until you reconnect. If the AI is ever unavailable mid-generation, Codex quietly falls back to a local draft and lets you know.",
    icon: "icon-[lucide--wifi-off]",
  },
  "language-generator": {
    id: "language-generator",
    title: "Fictional Languages",
    content:
      "Design custom language profiles (conlangs) detailing pronunciation guidelines, naming structures, example names, and glossary dictionaries. Other generators like NPC and Settlement will automatically respect these profiles to keep naming styles culturally and linguistically consistent.",
    icon: "icon-[lucide--languages]",
  },
  "news-sheet-generator": {
    id: "news-sheet-generator",
    title: "News Sheets (In-World News)",
    content:
      "Create an in-world news sheet for your campaign — a lead headline, short articles, street rumours, classifieds, and adverts, all written the way the publication's owner would allow. The handout part is safe to show players; the GM section keeps the truth behind the stories and the adventure hooks. Generated inside a vault, the sheet reports on your existing places, factions, and events.",
    icon: "icon-[lucide--newspaper]",
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
