export interface CoachMark {
  id: string;
  icon: string;
  title: string;
  body: string;
  targetSelector: string;
}

/**
 * Mobile-only graph coach marks (GraphView.svelte).
 *
 * Deliberately `isMobile`-scoped, NOT extended to touch tablets: this content
 * and its targets are mobile-chrome-specific — the bottom ActivityBar,
 * GraphToolbar's collapsed FAB, and AppHeader's collapsed search icon all
 * only render in that exact form below the `md` (768px) breakpoint. A touch
 * tablet (769-1279px) gets the desktop side-rail ActivityBar, GraphToolbar's
 * full inline toolbar (no FAB — it only collapses on `isMobile`), and —
 * depending on width — either the collapsed or full search input (AppHeader
 * collapses at `lg`, 1024px, which cuts through the middle of the tablet
 * range). None of that matches what these marks describe.
 *
 * `targetSelector` identifies the real element each mark describes, so it
 * can be spotlighted — otherwise the card is just floating text with nothing
 * visually tying it to the button/bar in question (#1785 follow-up: a user
 * couldn't tell which "dark button" the graph-controls step meant, and the
 * card was even briefly found to sit ON TOP of that exact button).
 *
 * Lives here (not inline in GraphView.svelte) so a selector-drift contract
 * test can assert every targetSelector still resolves to a real element —
 * the exact bug class that broke the main tour (#1787).
 */
export const COACH_MARKS: CoachMark[] = [
  {
    id: "activity-bar",
    icon: "icon-[lucide--layout-grid]",
    title: "Views & tools",
    body: "Switch between Graph, Map, Canvas and more from the bar at the bottom.",
    targetSelector: '[data-testid="activity-bar"]',
  },
  {
    id: "graph-fab",
    icon: "icon-[lucide--sliders-horizontal]",
    title: "Graph controls",
    body: "The dark button opens layout, filters, and display options. Drag to pan, pinch to zoom, and tap a node to open it.",
    targetSelector: '[data-testid="graph-controls-fab"]',
  },
  {
    id: "graph-search",
    icon: "icon-[lucide--search]",
    title: "Find anything",
    body: "Tap the search icon to jump to any entity by name.",
    targetSelector: '[data-testid="mobile-search-button"]',
  },
];
