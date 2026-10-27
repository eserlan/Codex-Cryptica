import { render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";

vi.mock("$app/paths", () => ({
  base: "",
  asset: (p: string) => p,
  resolve: (p: string) => p,
}));
vi.mock("$app/environment", () => ({ browser: false }));

import TopicBeginnerHubPage from "./TopicBeginnerHubPage.svelte";
import { DND_BEGINNERS_TOPIC_CONFIG } from "#lib/content/topics/dnd-beginners.js";

describe("TopicBeginnerHubPage", () => {
  it("renders the primary Start Here callout and 4-step loop", () => {
    render(TopicBeginnerHubPage, {
      props: { config: DND_BEGINNERS_TOPIC_CONFIG },
    });

    const startHere = screen.getByTestId("topic-start-here");
    expect(startHere).toBeTruthy();
    expect(screen.getByText("Start here: the basic D&D loop")).toBeTruthy();
    expect(
      screen.getByText(
        "What should a new D&D player know before their first game?",
      ),
    ).toBeTruthy();
  });

  it("renders all learning path steps in order", () => {
    render(TopicBeginnerHubPage, {
      props: { config: DND_BEGINNERS_TOPIC_CONFIG },
    });

    for (const step of DND_BEGINNERS_TOPIC_CONFIG.learningSteps) {
      expect(screen.getByTestId(`learning-step-${step.id}`)).toBeTruthy();
      expect(
        screen.getByRole("heading", { level: 2, name: step.heading }),
      ).toBeTruthy();
    }
  });

  it("renders the Learn Now vs Learn Later comparison section", () => {
    render(TopicBeginnerHubPage, {
      props: { config: DND_BEGINNERS_TOPIC_CONFIG },
    });

    const comparison = screen.getByTestId("topic-scope-comparison");
    expect(comparison).toBeTruthy();
    expect(screen.getByText("Learn now")).toBeTruthy();
    expect(screen.getByText("Learn later")).toBeTruthy();
    expect(screen.getByText("The 4-step play loop")).toBeTruthy();
    expect(screen.getByText("Obscure conditions")).toBeTruthy();
  });

  it("renders the tools section and related links", () => {
    render(TopicBeginnerHubPage, {
      props: { config: DND_BEGINNERS_TOPIC_CONFIG },
    });

    const tools = screen.getByTestId("topic-tools");
    expect(tools).toBeTruthy();
    expect(screen.getByText("Browser Dice Roller")).toBeTruthy();
    expect(screen.getByText("Running D&D (GM Hub)")).toBeTruthy();
  });

  it("uses the wide topic canvas with the path rail beside the article from lg", () => {
    const { container } = render(TopicBeginnerHubPage, {
      props: { config: DND_BEGINNERS_TOPIC_CONFIG },
    });

    expect(container.querySelector("article")?.className).toContain(
      "max-w-7xl",
    );
    expect(container.querySelector("article")?.className).not.toContain(
      "max-w-3xl",
    );
    const nav = screen.getByTestId("topic-path-nav");
    expect(nav.className).toContain("lg:sticky");
    expect(nav.className).toContain("lg:col-start-9");
  });

  it("keeps Start Here before the path links and every step reachable by anchor", () => {
    render(TopicBeginnerHubPage, {
      props: { config: DND_BEGINNERS_TOPIC_CONFIG },
    });

    const nav = screen.getByTestId("topic-path-nav");
    expect(
      screen.getByTestId("topic-start-here").compareDocumentPosition(nav) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    for (const step of DND_BEGINNERS_TOPIC_CONFIG.learningSteps) {
      const link = nav.querySelector(
        `a[href="#${DND_BEGINNERS_TOPIC_CONFIG.slug}-${step.id}"]`,
      );
      expect(link).not.toBeNull();
      expect(
        document.getElementById(
          `${DND_BEGINNERS_TOPIC_CONFIG.slug}-${step.id}`,
        ),
      ).not.toBeNull();
    }
  });

  it("shows the beginner eyebrow and exactly one h1", () => {
    render(TopicBeginnerHubPage, {
      props: { config: DND_BEGINNERS_TOPIC_CONFIG },
    });

    expect(screen.getByText("Beginner Guide Hub")).toBeTruthy();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });
});
