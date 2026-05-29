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

  it("shows AI Assessment when enabled", () => {
    render(ActivityBar);
    expect(screen.getByTestId("activity-bar-ai-assessment")).toBeDefined();
  });

  it("hides AI Assessment when AI is disabled", () => {
    discoveryPolicyStore.aiDisabled = true;
    render(ActivityBar);
    expect(screen.queryByTestId("activity-bar-ai-assessment")).toBeNull();
  });

  it("hides AI Assessment when connection discovery is off", () => {
    discoveryPolicyStore.connectionDiscoveryMode = "off";
    render(ActivityBar);
    expect(screen.queryByTestId("activity-bar-ai-assessment")).toBeNull();
  });

  it("shows AI Assessment when connection discovery is auto-apply", () => {
    discoveryPolicyStore.connectionDiscoveryMode = "auto-apply";
    render(ActivityBar);
    expect(screen.getByTestId("activity-bar-ai-assessment")).toBeDefined();
  });
});
