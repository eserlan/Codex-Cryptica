import { render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";

vi.mock("$app/paths", () => ({ base: "" }));
vi.mock("$app/environment", () => ({ browser: false }));

import TopicBeginnerHubPage from "./TopicBeginnerHubPage.svelte";
import { DND_BEGINNERS_TOPIC_CONFIG } from "$lib/content/topics/dnd-beginners";

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
});
