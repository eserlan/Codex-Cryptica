/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AppHeader from "./AppHeader.svelte";
import { uiStore } from "$lib/stores/ui.svelte";

vi.mock("svelte", async () => {
  // @ts-expect-error - force the client Svelte runtime so testing-library can mount
  return await import("../../../../../../node_modules/svelte/src/index-client.js");
});

vi.mock("$app/navigation", () => ({
  goto: vi.fn(),
}));

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

vi.mock("$lib/stores/ui.svelte", () => ({
  uiStore: {
    isStaging: false,
    showDiceModal: false,
    showSettings: false,
    toggleSettings: vi.fn(),
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
    uiStore.isStaging = false;
  });

  it("renders a staging banner when the staging flag is enabled", () => {
    uiStore.isStaging = true;

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
});
