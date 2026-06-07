/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/svelte";
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
});
