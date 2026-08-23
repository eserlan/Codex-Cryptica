/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ActivityBar from "./ActivityBar.svelte";
import { page } from "$app/state";
import { discoveryPolicyStore } from "$lib/stores/ui/discovery-policy.svelte";
import { guestChatStore } from "$lib/stores/guest-chat.svelte";
import { layoutUIStore } from "$lib/stores/ui/layout-ui.svelte";
import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";

vi.mock("$lib/stores/theme.svelte", () => ({
  themeStore: {
    activeTheme: { id: "default" },
  },
}));

vi.mock("$app/state", () => ({
  page: {
    url: { pathname: "/" },
  },
}));

vi.mock("$app/paths", () => ({
  base: "",
}));

vi.mock("$lib/stores/guest-chat.svelte", () => ({
  guestChatStore: {
    showChatModal: false,
  },
}));

describe("ActivityBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    discoveryPolicyStore.aiDisabled = false;
    discoveryPolicyStore.connectionDiscoveryMode = "suggest";
    layoutUIStore.activeSidebarTool = "none";
    layoutUIStore.leftSidebarOpen = false;
    layoutUIStore.mainViewMode = "visualization";
    layoutUIStore.toggleSidebarTool = vi.fn();
    guestChatStore.showChatModal = false;
    sessionModeStore.isGuestMode = false;
    page.url.pathname = "/";
  });

  /** The accent bar only renders on the active item. */
  const isActive = (id: string) =>
    screen.getByTestId(`activity-bar-${id}`).querySelector("div") !== null;

  describe("active view", () => {
    it("keeps tables and decks in a single slot", () => {
      render(ActivityBar);

      expect(screen.getByTestId("activity-bar-random")).toBeDefined();
      expect(screen.queryByTestId("activity-bar-tables")).toBeNull();
      expect(screen.queryByTestId("activity-bar-decks")).toBeNull();
    });

    it("lights the random slot on both of the routes behind it", () => {
      page.url.pathname = "/tables";
      const tables = render(ActivityBar);
      expect(isActive("random")).toBe(true);
      tables.unmount();

      page.url.pathname = "/decks";
      render(ActivityBar);
      expect(isActive("random")).toBe(true);
    });

    // /tables starts with /table, and a bare prefix test lit up both (#2247).
    it("does not light the entity table on the random tables route", () => {
      page.url.pathname = "/tables";

      render(ActivityBar);

      expect(isActive("table")).toBe(false);
      expect(isActive("random")).toBe(true);
    });

    it("still lights the entity table on its own route", () => {
      page.url.pathname = "/table";

      render(ActivityBar);

      expect(isActive("table")).toBe(true);
      expect(isActive("random")).toBe(false);
    });

    it("ignores a trailing slash when matching", () => {
      page.url.pathname = "/decks/";

      render(ActivityBar);

      expect(isActive("random")).toBe(true);
      expect(isActive("table")).toBe(false);
    });
  });

  describe("phone overflow", () => {
    const classOf = (id: string) =>
      screen.getByTestId(`activity-bar-${id}`).className;

    // The row does not wrap and every item costs viewport width, so the
    // demoted ones are hidden below `md` and reached from the menu drawer.
    it.each(["adventure", "random", "shelf", "quicknote", "guest-chat"])(
      "hides %s from the bar on a phone",
      (id) => {
        render(ActivityBar);

        expect(classOf(id)).toContain("hidden md:flex");
      },
    );

    it.each(["graph", "map", "canvas", "timeline", "table", "explorer"])(
      "keeps %s in the bar on a phone",
      (id) => {
        render(ActivityBar);

        expect(classOf(id)).not.toContain("hidden");
      },
    );

    it("leaves room by keeping the phone bar under eight items", () => {
      render(ActivityBar);

      const onPhone = screen
        .getByTestId("activity-bar")
        .querySelectorAll("[data-testid^='activity-bar-']:not(.hidden)");

      expect(onPhone.length).toBeLessThanOrEqual(8);
    });

    // Belt and braces: even demoted, a narrow enough phone could still
    // overflow, and clipping with no way to scroll is what started this.
    it("lets the bar scroll rather than clip when it overflows", () => {
      render(ActivityBar);

      const bar = screen.getByTestId("activity-bar");
      expect(bar.className).toContain("overflow-x-auto");
      expect(bar.className).toContain("justify-center-safe");
    });

    // The 44px button is mostly padding around a 20px icon, so removing the
    // gap costs no visual separation between glyphs but buys 42px of width —
    // the difference between fitting a 320px phone and scrolling on one.
    it("packs the phone row edge to edge, without gaps between buttons", () => {
      render(ActivityBar);

      const bar = screen.getByTestId("activity-bar");
      expect(bar.className).toContain("gap-0 md:gap-4");
    });

    // Without this the row squashes below the 44px minimum tap target long
    // before it overflows, so the scroll above never engages.
    it("holds every item at its full size rather than letting it squash", () => {
      render(ActivityBar);

      for (const id of ["graph", "table", "explorer", "oracle"]) {
        expect(classOf(id)).toContain("shrink-0");
      }
    });
  });

  it("does not render the AI Assessment shortcut", () => {
    render(ActivityBar);
    expect(screen.queryByTestId("activity-bar-ai-assessment")).toBeNull();
  });

  it("still renders the core sidebar shortcuts", () => {
    render(ActivityBar);
    expect(screen.getByTestId("activity-bar-adventure")).toBeDefined();
    expect(screen.getByTestId("activity-bar-oracle")).toBeDefined();
    expect(screen.getByTestId("activity-bar-explorer")).toBeDefined();
    expect(screen.getByTestId("activity-bar-quicknote")).toBeDefined();
  });

  it("absorbs the mobile bottom safe area into the activity bar", () => {
    render(ActivityBar);

    const activityBar = screen.getByRole("navigation", {
      name: "Activity Bar",
    });
    expect(activityBar.className).toContain(
      "pb-[env(safe-area-inset-bottom,0px)]",
    );
    expect(activityBar.className).toContain("pt-1");
    expect(activityBar.className).not.toContain("py-1");
  });

  // 4px + 44px + 4px. The padding is what gives, not the buttons: the row is
  // the last thing between a phone's content and the bottom of the screen, but
  // a tap target under 44px is a different kind of cost.
  it("stays 52px tall without shrinking its tap targets", () => {
    render(ActivityBar);

    const activityBar = screen.getByTestId("activity-bar");
    expect(activityBar.className).toContain("min-h-13");
    // min-h must not exceed the padding + button height, or it pads the bar
    // back out to whatever it says.
    expect(activityBar.className).not.toContain("min-h-14");
    expect(screen.getByTestId("activity-bar-graph").className).toContain(
      "h-11",
    );
  });

  it("opens the Oracle sidebar when the Oracle shortcut is clicked", async () => {
    render(ActivityBar);

    await fireEvent.click(screen.getByTestId("activity-bar-oracle"));

    expect(layoutUIStore.toggleSidebarTool).toHaveBeenCalledWith("oracle");
  });

  it("hides the QuickNote shortcut in guest mode", () => {
    sessionModeStore.isGuestMode = true;

    render(ActivityBar);

    expect(screen.queryByTestId("activity-bar-quicknote")).toBeNull();
    expect(screen.getByTestId("activity-bar-oracle")).toBeTruthy();
  });

  it("opens the guest chat modal for guests", async () => {
    sessionModeStore.isGuestMode = true;
    layoutUIStore.leftSidebarOpen = true;

    render(ActivityBar);

    await fireEvent.click(screen.getByTestId("activity-bar-guest-chat"));

    expect(guestChatStore.showChatModal).toBe(true);
    expect(layoutUIStore.leftSidebarOpen).toBe(false);
    expect(layoutUIStore.mainViewMode).toBe("visualization");
  });
});
