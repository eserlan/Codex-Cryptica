/**
 * How the public Features page organises what the product does.
 *
 * The page used to render `Object.values(FEATURE_HINTS)` straight out of the
 * config: 68 equally weighted cards in whatever order they happened to sit in
 * the file, including internals like SEO prerendering and UI mechanics like
 * "Adjustable Sidebars". That is a changelog wearing a marketing page's
 * clothes, and it is the most literal form of the "reads like an automatically
 * dumped changelog" finding in the UX assessment.
 *
 * So the page groups by the job a reader is trying to do, and everything that
 * is a mechanic rather than a capability moves to Help. The ordering is
 * deliberate: build, connect, run, then AI. Leading with AI on a page whose
 * problem is looking machine-made would be answering the wrong question.
 *
 * `FEATURE_HINTS` itself is untouched. It is keyed by id and consumed in-app by
 * `FeatureHint.svelte`, so this file references ids rather than moving them.
 *
 * Every hint must appear exactly once across `FEATURE_GROUPS` and
 * `HELP_ONLY_HINT_IDS`. The test enforces that, so adding a hint without
 * deciding where it belongs fails rather than silently vanishing from the page.
 */

export interface FeatureGroup {
  id: string;
  /** The job, in the reader's terms. */
  title: string;
  /** What they get out of it, one sentence. */
  outcome: string;
  /**
   * Hint ids in display order. The first `leadCount` carry the group; the rest
   * are listed compactly, so a group of eighteen does not become another wall
   * of identical cards.
   */
  hintIds: string[];
  leadCount: number;
  /**
   * A real interface capture, not decorative art, per the chunk 14 scope.
   * Taken from the cyberpunk demo vault in dark appearance: 35 connected
   * entities, which is the density a screenshot has to show to mean anything.
   *
   * Served from R2 through Cloudflare Images, like the demo portraits and blog
   * imagery, so the CDN negotiates AVIF or WebP per browser. Screenshots are
   * recaptured whenever the interface changes, and each revision would
   * otherwise sit in git history forever. See docs/deployment/assets.md.
   */
  image: string;
  imageAlt: string;
}

export const FEATURE_GROUPS: FeatureGroup[] = [
  {
    id: "build",
    title: "Build the world",
    outcome:
      "Get a campaign out of your head and into a structure you can navigate.",
    leadCount: 4,
    image:
      "https://assets.codexcryptica.com/cdn-cgi/image/format=auto,quality=80/screenshots/feature-build.jpg",
    imageAlt:
      "The entity explorer open beside a 35-entity campaign graph, listing characters, factions and locations.",
    hintIds: [
      "guided-mode-quick-start",
      "guided-mode-intent-create",
      "entity-explorer",
      "entity-hierarchy",
      "table-view-filters",
      "search-indexing",
      "quicknote-scratchpad",
      "era-date-picker",
      "creature-packs",
      "front-page",
      "vault-switcher",
      "presentation-templates",
    ],
  },
  {
    id: "connect",
    title: "See how it connects",
    outcome:
      "The relationships between people, places and events become visible instead of remembered.",
    leadCount: 4,
    image:
      "https://assets.codexcryptica.com/cdn-cgi/image/format=auto,quality=80/screenshots/feature-connect.jpg",
    imageAlt:
      "A campaign graph of 35 linked entities with one netrunner selected, their connections highlighted across the web.",
    hintIds: [
      "visual-graph",
      "connect-mode",
      "entity-auto-link",
      "spatial-canvas",
      "family-tree",
      "lineage-controls",
      "world-chronology",
      "entity-timeline",
      "node-merging",
    ],
  },
  {
    id: "run",
    title: "Run the session",
    outcome: "What you prepared is usable at the table, with your players.",
    leadCount: 4,
    image:
      "https://assets.codexcryptica.com/cdn-cgi/image/format=auto,quality=80/screenshots/feature-run.jpg",
    imageAlt:
      "The map view of a campaign, with locations placed and ready for a session.",
    hintIds: [
      "vtt-mode",
      "map-mode",
      "fog-of-war",
      "guest-entity-links",
      "vtt-entity-list",
      "dice-rolling",
      "voice-chat",
      "guest-character-chat",
      "public-world-directory",
    ],
  },
  {
    id: "unstuck",
    title: "Get unstuck",
    outcome: "A draft when you need one, that you edit rather than accept.",
    leadCount: 4,
    image:
      "https://assets.codexcryptica.com/cdn-cgi/image/format=auto,quality=80/screenshots/feature-unstuck.jpg",
    imageAlt:
      "The public vampire clan generator with its form on the left and a generated draft on the right.",
    hintIds: [
      "lore-oracle",
      "in-app-generators",
      "proposer-discovery",
      "draft-review",
      "oracle-connection-modes",
      "oracle-memory",
      "oracle-automation",
      "proactive-discovery",
      "ai-revision",
      "oracle-image",
      "draw-button",
      "image-stature",
      "adventure-generator",
      "dungeon-generator",
      "world-generator",
      "language-generator",
      "news-sheet-generator",
      "delve-structural-builder",
    ],
  },
  {
    id: "yours",
    title: "Your data stays yours",
    outcome:
      "Local files you own, and all of it works with the AI switched off.",
    leadCount: 4,
    image:
      "https://assets.codexcryptica.com/cdn-cgi/image/format=auto,quality=80/screenshots/feature-yours.jpg",
    imageAlt:
      "The entity table listing all 35 entities with their types, connection counts, summaries and labels.",
    hintIds: [
      "total-privacy",
      "local-folder-sync",
      "ai-disabled",
      "cif-importer",
      "vault-save",
      "vault-load",
      "import-resume",
    ],
  },
];

/**
 * Hints that stay in Help rather than appearing on the Features page.
 *
 * Not a dumping ground: each is here because it describes how to operate the
 * interface, or how the product is built, rather than something a reader would
 * come looking for.
 */
export const HELP_ONLY_HINT_IDS = [
  // Interface mechanics. Useful in context, meaningless as a selling point.
  "touch-graph-gestures",
  "keyboard-navigation",
  "activity-bar",
  "adjustable-sidebars",
  "guided-mode-toggle",
  "guided-mode-suggestions",
  "getting-started",
  // Ways in, which belong on the welcome screen rather than in a feature list.
  "demo-mode",
  // Implementation detail with no user-facing job. Named in the assessment as
  // the clearest example of a changelog entry masquerading as a feature.
  "seo-prerendering",
  // Named after its implementation, and the capability it powers is already
  // covered by search in "Build the world".
  "p2p-connection-manager",
  // Says the same thing as "AI Disabled", which carries it in the privacy group.
  "generator-local-mode",
  // Decoration rather than a job. Distinctive, but it belongs in a gallery, not
  // in a list of what the product does for you.
  "themes",
  // A pointer to the blog and the help guide. Both are reachable from the
  // shell's nav and footer on every public page, so listing them as a product
  // feature is a third route to the same place.
  "the-archive",
] as const;
