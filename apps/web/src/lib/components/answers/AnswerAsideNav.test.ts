/** @vitest-environment jsdom */

import { describe, expect, it } from "vitest";
import { fireEvent, render } from "@testing-library/svelte";
import AnswerAsideNav from "./AnswerAsideNav.svelte";
import { AnswerConfigSchema } from "#lib/content/answers/schema.js";

const mockAnswer = AnswerConfigSchema.parse({
  slug: "test-answer",
  question: "What is a point crawl?",
  shortAnswer:
    "A method of structuring travel along discrete points of interest.",
  category: "worldbuilding",
  kind: "definition",
  publishedAt: "2026-08-30",
  labels: ["solo-rpg"],
  seo: {
    title: "Point Crawl vs Hex Crawl",
    description: "Understanding point crawl navigation in TTRPG campaigns.",
  },
  sections: [
    {
      kind: "prose",
      paragraphs: ["A point crawl simplifies travel into defined nodes."],
    },
  ],
  relatedTopics: [
    {
      title: "Wilderness Exploration",
      description: "Running exploration and survival procedures.",
      href: "/for/wilderness-exploration",
    },
  ],
  relatedTools: [
    {
      title: "Point Crawl Generator",
      description: "Interactive point crawl network generator.",
      href: "/tools/point-crawl-generator",
    },
  ],
  relatedForPages: [
    {
      title: "Solo RPG Guide",
      description: "How to use point crawls in solo campaigns.",
      href: "/for/solo-rpg",
    },
  ],
});

describe("AnswerAsideNav", () => {
  it("renders related topic hubs, tools, guides, and related answers", () => {
    const related = [
      {
        slug: "hex-crawl-basics",
        question: "How do you run a hex crawl?",
        shortAnswer: "Divide the map into hexes and explore.",
        category: "adventure-design" as const,
        kind: "how-to" as const,
      },
    ];

    const { getByText } = render(AnswerAsideNav, {
      props: {
        answer: mockAnswer,
        related,
        headingId: "aside-heading",
      },
    });

    expect(document.getElementById("aside-heading")?.textContent?.trim()).toBe(
      "Related",
    );

    expect(getByText("Topic Hubs")).toBeTruthy();
    expect(getByText("Wilderness Exploration")).toBeTruthy();
    expect(getByText("Tools")).toBeTruthy();
    expect(getByText("Point Crawl Generator")).toBeTruthy();
    expect(getByText("Guides")).toBeTruthy();
    expect(getByText("Solo RPG Guide")).toBeTruthy();
    expect(getByText("Other answers")).toBeTruthy();
    expect(getByText("How do you run a hex crawl?")).toBeTruthy();
  });

  it("omits groups that have no links instead of rendering empty headings", () => {
    const sparse = AnswerConfigSchema.parse({
      ...mockAnswer,
      relatedTopics: [],
      relatedForPages: [],
    });

    const { getByText, queryByText } = render(AnswerAsideNav, {
      props: { answer: sparse },
    });

    expect(getByText("Tools")).toBeTruthy();
    expect(queryByText("Topic Hubs")).toBeNull();
    expect(queryByText("Guides")).toBeNull();
    expect(queryByText("Other answers")).toBeNull();
  });

  it("shows six other answers and reveals the rest on request", async () => {
    const related = Array.from({ length: 9 }, (_, i) => ({
      slug: `answer-${i}`,
      question: `Question ${i}?`,
    }));

    const { getByRole, getByText, queryByText } = render(AnswerAsideNav, {
      props: { answer: mockAnswer, related },
    });

    expect(getByText("Question 5?")).toBeTruthy();
    expect(queryByText("Question 6?")).toBeNull();

    const toggle = getByRole("button", { name: /show 3 more/i });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(
      document.getElementById(toggle.getAttribute("aria-controls")!),
    ).toBeTruthy();

    await fireEvent.click(toggle);
    expect(getByText("Question 8?")).toBeTruthy();
    expect(toggle.getAttribute("aria-expanded")).toBe("true");

    await fireEvent.click(getByRole("button", { name: /show fewer/i }));
    expect(queryByText("Question 8?")).toBeNull();
  });

  it("has no toggle when every other answer already fits", () => {
    const { queryByRole } = render(AnswerAsideNav, {
      props: {
        answer: mockAnswer,
        related: [{ slug: "one", question: "Only one?" }],
      },
    });

    expect(queryByRole("button", { name: /more/i })).toBeNull();
  });
});
