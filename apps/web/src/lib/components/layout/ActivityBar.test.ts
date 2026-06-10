/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ActivityBar from "./ActivityBar.svelte";
import { discoveryPolicyStore } from "$lib/stores/ui/discovery-policy.svelte";
import { layoutUIStore } from "$lib/stores/ui/layout-ui.svelte";

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

describe("ActivityBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    discoveryPolicyStore.aiDisabled = false;
    discoveryPolicyStore.connectionDiscoveryMode = "suggest";
    layoutUIStore.activeSidebarTool = "none";
    layoutUIStore.toggleSidebarTool = vi.fn();
  });

  it("does not render the AI Assessment shortcut", () => {
    render(ActivityBar);
    expect(screen.queryByTestId("activity-bar-ai-assessment")).toBeNull();
  });

  it("still renders the core sidebar shortcuts", () => {
    render(ActivityBar);
    expect(screen.getByTestId("activity-bar-oracle")).toBeDefined();
    expect(screen.getByTestId("activity-bar-explorer")).toBeDefined();
    expect(screen.getByTestId("activity-bar-quicknote")).toBeDefined();
  });

  it("renders visible labels for views and tools", () => {
    render(ActivityBar);
    expect(screen.getByText("Graph")).toBeTruthy();
    expect(screen.getByText("Map")).toBeTruthy();
    expect(screen.getByText("Canvas")).toBeTruthy();
    expect(screen.getByText("Oracle")).toBeTruthy();
    expect(screen.getByText("Entities")).toBeTruthy();
    expect(screen.getByText("Notes")).toBeTruthy();
  });

  it("opens the Oracle sidebar when the Oracle shortcut is clicked", async () => {
    render(ActivityBar);

    await fireEvent.click(screen.getByTestId("activity-bar-oracle"));

    expect(layoutUIStore.toggleSidebarTool).toHaveBeenCalledWith("oracle");
  });
});
