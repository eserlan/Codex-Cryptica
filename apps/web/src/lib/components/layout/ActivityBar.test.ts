/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("svelte", async () => {
  // @ts-expect-error - force the client Svelte runtime so testing-library can mount
  return await import("../../../../../../node_modules/svelte/src/index-client.js");
});

import ActivityBar from "./ActivityBar.svelte";
import { uiStore } from "$lib/stores/ui.svelte";

vi.mock("$lib/stores/ui.svelte", () => ({
  uiStore: {
    aiDisabled: false,
    connectionDiscoveryMode: "suggest",
    activeSidebarTool: null,
    toggleSidebarTool: vi.fn(),
  },
}));

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
    uiStore.aiDisabled = false;
    uiStore.connectionDiscoveryMode = "suggest";
  });

  it("shows AI Assessment when enabled", () => {
    render(ActivityBar);
    expect(screen.getByTestId("activity-bar-ai-assessment")).toBeDefined();
  });

  it("hides AI Assessment when AI is disabled", () => {
    uiStore.aiDisabled = true;
    render(ActivityBar);
    expect(screen.queryByTestId("activity-bar-ai-assessment")).toBeNull();
  });

  it("hides AI Assessment when connection discovery is off", () => {
    uiStore.connectionDiscoveryMode = "off";
    render(ActivityBar);
    expect(screen.queryByTestId("activity-bar-ai-assessment")).toBeNull();
  });

  it("shows AI Assessment when connection discovery is auto-apply", () => {
    uiStore.connectionDiscoveryMode = "auto-apply";
    render(ActivityBar);
    expect(screen.getByTestId("activity-bar-ai-assessment")).toBeDefined();
  });
});
