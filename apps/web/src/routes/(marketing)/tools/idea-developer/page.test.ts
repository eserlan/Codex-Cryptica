// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/svelte";

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
import { IDEA_DEVELOPER_COPY } from "$lib/content/idea-developer-notice";
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
  it("shows the notice at the bottom of the page, below the tool", () => {
    render(Page);
    const notice = screen.getByTestId("conversation-notice");
    const tool = screen.getByTestId("submit-area");
    const explainer = document.getElementById("how-it-works")!;
    const after = Node.DOCUMENT_POSITION_FOLLOWING;
    expect(tool.compareDocumentPosition(notice) & after).toBeTruthy();
    expect(explainer.compareDocumentPosition(notice) & after).toBeTruthy();
  });

  it("does not hide the notice behind a collapsed section, dialog or hidden element", () => {
    render(Page);
    const notice = screen.getByTestId("conversation-notice");
    expect(
      notice.closest(
        "details, dialog, [role='dialog'], [hidden], [aria-hidden='true']",
      ),
    ).toBeNull();
  });

  it("links the notice to the privacy page and the help entry", () => {
    render(Page);
    const copy = IDEA_DEVELOPER_COPY.notice;
    const notice = within(screen.getByTestId("conversation-notice"));
    expect(
      notice
        .getByRole("link", { name: copy.privacyLabel })
        .getAttribute("href"),
    ).toBe(copy.privacyHref);
    expect(
      notice.getByRole("link", { name: copy.helpLabel }).getAttribute("href"),
    ).toBe(copy.helpHref);
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
