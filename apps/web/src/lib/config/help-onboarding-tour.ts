export interface GuideStep {
  id: string;
  targetSelector: string;
  title: string;
  content: string;
  position: "top" | "bottom" | "left" | "right";
}

/**
 * First-run guided tour.
 *
 * Deliberately short (≤4 steps) and built around the core loop a newcomer
 * should complete first: create something → link it → see it connect. Targets
 * are chosen to exist in BOTH layouts without an extra interaction (opening a
 * menu) to reveal them:
 * - The ActivityBar renders as a side rail on desktop and a bottom bar on
 *   phones, but keeps the same `activity-bar-*` testids either way.
 * - The "create your first character" step targets the graph's own
 *   empty-state CTA rather than the header's "New Entity" button — that
 *   button is desktop-only in the header and sits inside a closed hamburger
 *   menu on mobile, so it isn't reliably present either. The empty-state CTA
 *   only renders while the vault has zero entities, which is exactly when
 *   this step is relevant; for a vault that already has entities the step is
 *   pruned and the tour skips straight to "graph" (#1778).
 *
 * (#1777: #1779, #1784, #1787).
 *
 * The longer feature catalogue that used to live here now belongs in the Help
 * center ("What else can Codex Cryptica do?"), not the first-run path.
 *
 * `helpStore.startTour` prunes any step whose target is missing from the DOM
 * before the tour begins, so a layout that happens to hide a target never
 * produces an unanchored tooltip (#1778).
 */
export const ONBOARDING_TOUR: GuideStep[] = [
  {
    id: "welcome",
    targetSelector: "body",
    title: "Welcome: this is your world",
    // Deliberately agnostic about whether the vault is empty or already
    // populated (e.g. a converted demo already has characters in it) — this
    // step always shows regardless of entity count, so it must not presuppose
    // either state. The next step's own copy handles the empty-vault case.
    content:
      "Everything you create here stays on your device. No account, nothing uploaded. Let's take a quick look at how your world comes together.",
    position: "bottom",
  },
  {
    // Targets the graph's own empty-state CTA, which only exists while the
    // vault has zero entities — exactly when this instruction is relevant.
    // For a vault that already has entities (e.g. a converted demo), this
    // step is pruned by pruneStepsToDom() and the tour skips straight to
    // "graph" (#1778) — that user doesn't need to be told how to create an
    // entity. Deliberately NOT targeting the header's "New Entity" button:
    // it's desktop-only in the header and lives inside a closed hamburger
    // menu on mobile, so it isn't a reliable, always-visible target either.
    id: "create-entity",
    targetSelector: '[data-testid="graph-empty-state-cta"]',
    title: "Create your first character",
    content:
      "Click here to add a character, place, or faction. That's all it takes to start; one person or place is enough.",
    position: "right",
  },
  {
    id: "graph",
    targetSelector: '[data-testid="activity-bar-graph"]',
    title: "Watch it connect",
    content:
      "Mention another name in your notes (like a home town or an ally) and Codex Cryptica suggests a connection. Accept it, then open the Graph to see it appear.",
    position: "right",
  },
  {
    id: "oracle",
    targetSelector: '[data-testid="activity-bar-oracle"]',
    title: "Optional AI help, and more when you want it",
    // Closes the tour with two "optional depth" mentions rather than adding a
    // 5th step: the Oracle, and a pointer to the Help Center. A dedicated
    // step here would re-inflate the ≤4-step tour we deliberately trimmed
    // (#1779) — this keeps the tour itself minimal while still surfacing the
    // fuller guides for anyone who wants them, per the assessment's
    // recommendation to move the exhaustive feature list out of onboarding
    // and into an optional Help gallery.
    content:
      "Stuck for ideas? The Oracle can suggest names, plot hooks, and summaries whenever you want it, always optional, your world works fully without it. For deeper guides (family trees, calendars, generators, sharing with players), the Help Center is in Settings any time.",
    position: "right",
  },
];
