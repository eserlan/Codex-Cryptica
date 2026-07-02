/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AppHeader from "./AppHeader.svelte";
import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";

vi.mock("$app/paths", () => ({
  base: "",
}));

vi.mock("$lib/config", () => ({
  IS_STAGING: false,
}));

vi.mock("$lib/stores/search.svelte", () => ({
  searchStore: {
    open: vi.fn(),
    query: "",
    setQuery: vi.fn(),
  },
}));

vi.mock("../VaultControls.svelte", () => ({
  default: function VaultControlsMock() {
    return {};
  },
}));

vi.mock("./app-header-actions", () => ({
  openFrontPage: vi.fn(),
}));

describe("AppHeader", () => {
  beforeEach(() => {
    sessionModeStore.isStaging = false;
    sessionModeStore.isGuestMode = false;
  });

  it("renders a staging banner when the staging flag is enabled", () => {
    sessionModeStore.isStaging = true;

    render(AppHeader);

    const banner = screen.getByTestId("staging-banner");
    expect(banner.textContent).toContain("STAGING PREVIEW");
    expect(banner.textContent).toContain(
      "Changes here do not affect production.",
    );
  });

  it("hides the staging banner in production", () => {
    render(AppHeader);

    expect(screen.queryByTestId("staging-banner")).toBeNull();
  });

  it("shows search controls outside guest mode", () => {
    render(AppHeader);

    expect(screen.getByTestId("search-input")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Search" })).toBeTruthy();
  });

  it("keeps search controls visible in guest mode", () => {
    sessionModeStore.isGuestMode = true;

    render(AppHeader);

    expect(screen.getByTestId("search-input")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Search" })).toBeTruthy();
  });
});
