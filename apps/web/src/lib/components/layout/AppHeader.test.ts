/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AppHeader from "./AppHeader.svelte";
import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
import { guidedModeStore } from "$lib/stores/ui/guided-mode.svelte";
import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";

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
    guidedModeStore.setGuidedMode(true);
    modalUIStore.showSettings = false;
    modalUIStore.activeSettingsTab = "vault";
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

  it("opens Help and legal information from the guest header", async () => {
    sessionModeStore.isGuestMode = true;

    render(AppHeader);

    await fireEvent.click(
      screen.getByRole("button", {
        name: "Open Help and legal information",
      }),
    );

    expect(modalUIStore.showSettings).toBe(true);
    expect(modalUIStore.activeSettingsTab).toBe("help");
  });

  it("keeps Help open when the guest entry is used again", async () => {
    sessionModeStore.isGuestMode = true;
    modalUIStore.openSettings("help");

    render(AppHeader);

    await fireEvent.click(
      screen.getByRole("button", {
        name: "Open Help and legal information",
      }),
    );

    expect(modalUIStore.showSettings).toBe(true);
    expect(modalUIStore.activeSettingsTab).toBe("help");
  });

  it("hides advanced toolbar utilities in Guided Mode", () => {
    render(AppHeader);

    expect(screen.queryByTestId("dice-roller-button")).toBeNull();
    expect(
      screen.queryByRole("link", { name: "Explore public worlds" }),
    ).toBeNull();
  });

  it("restores advanced toolbar utilities in Full Toolbox mode", () => {
    guidedModeStore.setGuidedMode(false);

    render(AppHeader);

    expect(screen.getByTestId("dice-roller-button")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Explore public worlds" }),
    ).toBeTruthy();
  });
});
