// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/svelte";

/**
 * The route page wires the tool to the arrival link and to analytics. The
 * component tests cover the tool itself; this pins the page's own wiring.
 */
const { arrived } = vi.hoisted(() => ({ arrived: vi.fn() }));
vi.mock("$lib/services/analytics/idea-developer-tracking", () => ({
  ideaDeveloperTracker: {
    arrived,
    submitted: vi.fn(),
    turnSubmitted: vi.fn(),
    resultShown: vi.fn(),
    generatorOpened: vi.fn(),
    signupStarted: vi.fn(),
  },
}));

import Page from "./+page.svelte";
import { ideaDeveloperStore } from "$lib/stores/idea-developer.svelte";

beforeEach(() => {
  arrived.mockClear();
  ideaDeveloperStore.clear();
  ideaDeveloperStore.setMode("develop");
});

afterEach(() => {
  cleanup();
  window.history.replaceState({}, "", "/");
});

describe("Idea Developer page", () => {
  it("renders the tool with the notice beside the submit button", () => {
    render(Page);
    expect(
      screen.getByRole("heading", { level: 1, name: /develop your rpg idea/i }),
    ).toBeTruthy();
    const area = screen.getByTestId("submit-area");
    expect(area.contains(screen.getByTestId("conversation-notice"))).toBe(true);
  });

  it("says what the tool does and does not do", () => {
    render(Page);
    expect(screen.getByText(/what it does, and what it doesn't/i)).toBeTruthy();
    expect(screen.getByText(/or give it a score/i)).toBeTruthy();
  });

  it("records an arrival and preselects the suggested mode", async () => {
    window.history.replaceState(
      {},
      "",
      "/?from=answer&source=is-my-rpg-campaign-idea-good&mode=assess",
    );
    render(Page);
    await waitFor(() => expect(ideaDeveloperStore.mode).toBe("assess"));
    expect(arrived).toHaveBeenCalledTimes(1);
    expect(arrived).toHaveBeenCalledWith({
      sourceKind: "answer",
      sourceId: "is-my-rpg-campaign-idea-good",
      suggestedMode: "assess",
    });
    expect(document.activeElement?.id).toBe("idea-developer-input");
  });

  it("records nothing and changes nothing on a plain visit", async () => {
    render(Page);
    await Promise.resolve();
    expect(arrived).not.toHaveBeenCalled();
    expect(ideaDeveloperStore.mode).toBe("develop");
  });

  it("does not record an arrival for a link with unusable parameters", async () => {
    window.history.replaceState({}, "", "/?from=answer&source=Not%20A%20Slug");
    render(Page);
    await Promise.resolve();
    expect(arrived).not.toHaveBeenCalled();
  });

  it("keeps the page out of search results until launch", () => {
    render(Page);
    const robots = document.head.querySelector('meta[name="robots"]');
    expect(robots?.getAttribute("content")).toMatch(/noindex/);
  });
});
