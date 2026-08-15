/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MobileMenu from "./MobileMenu.svelte";
import { guidedModeStore } from "$lib/stores/ui/guided-mode.svelte";
import { layoutUIStore } from "$lib/stores/ui/layout-ui.svelte";
import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";

// jsdom has no Web Animations API, which Svelte's transitions drive. The
// drawer's open and close behaviour is the subject here, not its animation.
vi.mock("svelte/transition", async (importOriginal) => ({
  ...(await importOriginal<typeof import("svelte/transition")>()),
  fly: () => ({ duration: 0 }),
  fade: () => ({ duration: 0 }),
}));

vi.mock("$app/paths", () => ({
  base: "",
}));

vi.mock("$app/state", () => ({
  page: {
    url: { pathname: "/" },
  },
}));

vi.mock("$lib/config", () => ({
  PATREON_URL: "https://patreon.com/EspenE",
}));

vi.mock("$lib/components/VaultControls.svelte", () => ({
  default: function VaultControlsMock() {
    return {};
  },
}));

describe("MobileMenu", () => {
  beforeEach(() => {
    guidedModeStore.setGuidedMode(true);
    sessionModeStore.isGuestMode = false;
    layoutUIStore.activeSidebarTool = "none";
    layoutUIStore.toggleSidebarTool = vi.fn();
  });

  describe("navigation", () => {
    // The drawer is where the items dropped from the phone Activity Bar are
    // reached, so it has to carry all of them.
    it.each(["random", "shelf", "quicknote", "guest-chat"])(
      "offers %s, which the phone bar leaves out",
      (id) => {
        render(MobileMenu, { isOpen: true });

        expect(screen.getByTestId(`mobile-menu-${id}`)).toBeTruthy();
      },
    );

    // This list was four hardcoded links and had fallen behind the bar.
    it("lists every view, including the ones added after it was written", () => {
      render(MobileMenu, { isOpen: true });

      for (const id of ["graph", "map", "canvas", "timeline", "table"]) {
        expect(screen.getByTestId(`mobile-menu-${id}`)).toBeTruthy();
      }
    });

    it("runs a tool and closes the drawer behind it", async () => {
      render(MobileMenu, { isOpen: true });

      await fireEvent.click(screen.getByTestId("mobile-menu-shelf"));

      expect(layoutUIStore.toggleSidebarTool).toHaveBeenCalledWith("shelf");
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  it("hides Explore Worlds in Guided Mode", () => {
    render(MobileMenu, { isOpen: true });

    expect(screen.queryByRole("link", { name: /explore worlds/i })).toBeNull();
  });

  it("restores Explore Worlds in Full Toolbox mode", () => {
    guidedModeStore.setGuidedMode(false);

    render(MobileMenu, { isOpen: true });

    expect(screen.getByRole("link", { name: /explore worlds/i })).toBeTruthy();
  });

  it("exposes a Guided Mode toggle so mobile users can switch modes", () => {
    render(MobileMenu, { isOpen: true });

    const toggle = screen.getByTestId("guided-mode-toggle");
    expect(toggle).toBeTruthy();
    expect(toggle.getAttribute("aria-checked")).toBe("true");
  });
});
