/** @vitest-environment jsdom */

/**
 * Guards against the exact bug class behind #1787: a component refactor
 * renames or removes a `data-testid`, nobody updates the tour/coach-mark
 * config pointing at it, and users get a spotlight (or a floating tooltip)
 * pointing at nothing. A plain source grep can't catch this for *dynamic*
 * testids (e.g. ActivityBar's `` `activity-bar-${view.id}` ``) — only
 * rendering the real component and querying for the concrete selector proves
 * it still resolves. This test does that for every selector actually
 * referenced by ONBOARDING_TOUR / COACH_MARKS, grouped by which component
 * owns the target:
 *
 * - ActivityBar & AppHeader targets: rendered for real (cheap, no heavy deps).
 * - GraphToolbar's mobile FAB: rendered for real in its collapsed-FAB state
 *   (layoutUIStore.isMobile + menu closed), which — confirmed by reading the
 *   component — never mounts Minimap/GraphViewPresets/TimelineControls, so no
 *   extra mocking is needed.
 * - GraphView's empty-state CTA testid: GraphView itself calls into
 *   cytoscape/graph-engine on mount, making a full render disproportionately
 *   expensive for this one assertion. Its target is a static string passed as
 *   a prop (`ctaTestId="graph-empty-state-cta"`), not computed, so a
 *   source-level check is equally reliable for this specific case and is
 *   used instead — documented here as a deliberate, narrow exception.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { render } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ONBOARDING_TOUR, COACH_MARKS } from "./help-content";

import ActivityBar from "$lib/components/layout/ActivityBar.svelte";
import AppHeader from "$lib/components/layout/AppHeader.svelte";
import GraphToolbar from "$lib/components/graph/GraphToolbar.svelte";
import { discoveryPolicyStore } from "$lib/stores/ui/discovery-policy.svelte";
import { guestChatStore } from "$lib/stores/guest-chat.svelte";
import { layoutUIStore } from "$lib/stores/ui/layout-ui.svelte";
import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
import { guestStore } from "$lib/stores/guest.svelte";

vi.mock("$lib/stores/theme.svelte", () => ({
  themeStore: { activeTheme: { id: "default" } },
}));
vi.mock("$app/state", () => ({ page: { url: { pathname: "/" } } }));
vi.mock("$app/paths", () => ({ base: "" }));
vi.mock("$lib/stores/guest-chat.svelte", () => ({
  guestChatStore: { showChatModal: false },
}));
vi.mock("$lib/config", () => ({ IS_STAGING: false }));
vi.mock("$lib/stores/search.svelte", () => ({
  searchStore: { open: vi.fn(), query: "", setQuery: vi.fn() },
}));
vi.mock("$lib/components/VaultControls.svelte", () => ({
  default: function VaultControlsMock() {
    return {};
  },
}));
vi.mock("$lib/components/layout/app-header-actions", () => ({
  openFrontPage: vi.fn(),
}));

/** Every targetSelector referenced by the tour and mobile coach marks. */
const allTargetSelectors = [
  ...ONBOARDING_TOUR.map((s) => s.targetSelector),
  ...COACH_MARKS.map((m) => m.targetSelector),
].filter((sel) => sel !== "body");

function testIdFromSelector(selector: string): string {
  const match = selector.match(/data-testid="([^"]+)"/);
  if (!match) throw new Error(`Could not parse testid from "${selector}"`);
  return match[1];
}

describe("onboarding selector contract", () => {
  beforeEach(() => {
    discoveryPolicyStore.aiDisabled = false;
    discoveryPolicyStore.connectionDiscoveryMode = "suggest";
    layoutUIStore.activeSidebarTool = "none";
    layoutUIStore.leftSidebarOpen = false;
    layoutUIStore.mainViewMode = "visualization";
    layoutUIStore.isMobile = false;
    guestChatStore.showChatModal = false;
    sessionModeStore.isGuestMode = false;
    sessionModeStore.sharedMode = false;
    guestStore.guestRoster = {};
  });

  it("references at least one selector from each owning component (sanity check on the test itself)", () => {
    // If this ever fails, the grouping below needs updating — it means the
    // tour/coach-mark config no longer references one of these components at
    // all, which isn't a bug, just a sign this test needs re-scoping.
    const activityBarTargets = allTargetSelectors.filter((s) =>
      s.includes('data-testid="activity-bar'),
    );
    const appHeaderTargets = allTargetSelectors.filter((s) =>
      s.includes("mobile-search-button"),
    );
    const graphToolbarTargets = allTargetSelectors.filter((s) =>
      s.includes("graph-controls-fab"),
    );
    expect(activityBarTargets.length).toBeGreaterThan(0);
    expect(appHeaderTargets.length).toBeGreaterThan(0);
    expect(graphToolbarTargets.length).toBeGreaterThan(0);
  });

  it("ActivityBar targets all resolve on the real component", () => {
    const { container } = render(ActivityBar);

    const targets = allTargetSelectors.filter((s) =>
      s.includes('data-testid="activity-bar'),
    );
    for (const selector of targets) {
      expect(
        container.querySelector(selector),
        `Expected ActivityBar to render an element matching ${selector}`,
      ).not.toBeNull();
    }
  });

  it("AppHeader targets all resolve on the real component", () => {
    const { container } = render(AppHeader, {
      props: { isMobileMenuOpen: false },
    });

    const targets = allTargetSelectors.filter((s) =>
      s.includes("mobile-search-button"),
    );
    for (const selector of targets) {
      expect(
        container.querySelector(selector),
        `Expected AppHeader to render an element matching ${selector}`,
      ).not.toBeNull();
    }
  });

  it("GraphToolbar's mobile FAB target resolves on the real component", () => {
    layoutUIStore.isMobile = true;

    const { container } = render(GraphToolbar, {
      props: {
        cy: undefined,
        isLayoutRunning: false,
        onApplyLayout: async () => {},
        selectedCount: 0,
      },
    });

    const targets = allTargetSelectors.filter((s) =>
      s.includes("graph-controls-fab"),
    );
    for (const selector of targets) {
      expect(
        container.querySelector(selector),
        `Expected GraphToolbar (mobile) to render an element matching ${selector}`,
      ).not.toBeNull();
    }
  });

  it("GraphView's empty-state CTA testid is still wired (source check — see file docstring)", () => {
    const remaining = allTargetSelectors.filter(
      (s) =>
        !s.includes('data-testid="activity-bar') &&
        !s.includes("mobile-search-button") &&
        !s.includes("graph-controls-fab"),
    );
    // Every selector not covered by a render-based check above must be
    // accounted for here explicitly, so a newly-added tour/coach-mark step
    // can't silently skip contract coverage.
    for (const selector of remaining) {
      const testId = testIdFromSelector(selector);
      expect(
        testId,
        `Unrecognized target "${selector}" has no contract check — add one`,
      ).toBe("graph-empty-state-cta");
    }

    const graphViewSource = readFileSync(
      path.resolve(__dirname, "../components/GraphView.svelte"),
      "utf-8",
    );
    expect(graphViewSource).toContain('"graph-empty-state-cta"');

    const emptyStateSource = readFileSync(
      path.resolve(__dirname, "../components/ui/EmptyState.svelte"),
      "utf-8",
    );
    expect(emptyStateSource).toContain("data-testid={ctaTestId}");
  });
});
