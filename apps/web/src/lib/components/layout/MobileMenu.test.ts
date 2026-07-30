/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MobileMenu from "./MobileMenu.svelte";
import { guidedModeStore } from "$lib/stores/ui/guided-mode.svelte";

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
