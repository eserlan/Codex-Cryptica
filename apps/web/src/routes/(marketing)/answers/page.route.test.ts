/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, fireEvent, screen, waitFor } from "@testing-library/svelte";
import Page from "./+page.svelte";
import {
  AnswerConfigSchema,
  type AnswerConfig,
} from "$lib/content/answers/schema";

vi.mock("$app/paths", () => ({ base: "" }));

const mockAnswers: AnswerConfig[] = [
  AnswerConfigSchema.parse({
    slug: "how-do-you-run-a-heist",
    category: "adventure-design",
    question: "How do you run a heist?",
    kind: "framework",
    shortAnswer:
      "Heists work best with phases: legwork, infiltration, complication, extraction.",
    sections: [
      {
        kind: "prose",
        heading: "Phases",
        paragraphs: ["Legwork is critical."],
      },
    ],
    relatedAnswers: [],
    publishedAt: "2026-09-01",
    seo: { title: "How to run a heist", description: "Heist guide" },
  }),
  AnswerConfigSchema.parse({
    slug: "how-to-manage-table-engagement",
    category: "running-the-game",
    question: "How do you keep players engaged at the table?",
    kind: "how-to",
    shortAnswer:
      "Keep pacing active by asking direct questions and rotating spotlights every 10 minutes.",
    sections: [
      {
        kind: "prose",
        heading: "Spotlight",
        paragraphs: ["Rotate spotlight."],
      },
    ],
    relatedAnswers: [],
    publishedAt: "2026-09-02",
    seo: { title: "Player Engagement", description: "Keep players engaged" },
  }),
  AnswerConfigSchema.parse({
    slug: "what-is-a-point-crawl",
    category: "worldbuilding",
    question: "What is a point crawl?",
    kind: "definition",
    shortAnswer:
      "A point crawl connects distinct locations with marked paths rather than a hex grid.",
    sections: [
      { kind: "prose", heading: "Structure", paragraphs: ["Nodes and edges."] },
    ],
    relatedAnswers: [],
    publishedAt: "2026-09-03",
    seo: {
      title: "What is a point crawl",
      description: "Point crawl definition",
    },
  }),
];

describe("/answers route", () => {
  beforeEach(() => {
    // Community aggregate is unreachable by default: the page must render
    // the plain directory (cold start) without network access.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );
  });

  afterEach(() => {
    document.head.innerHTML = "";
    window.history.replaceState({}, "", "/");
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders page header and category directory cards for all 6 categories", () => {
    render(Page, {
      props: { data: { answers: mockAnswers } },
    });

    expect(document.title).toContain("RPG and worldbuilding answers");

    const categoryNav = document.querySelector(
      'nav[aria-label="Category directory"]',
    );
    expect(categoryNav).toBeTruthy();

    const categoryButtons = categoryNav?.querySelectorAll("button");
    expect(categoryButtons?.length).toBe(6);

    const buttonTexts = Array.from(categoryButtons || []).map(
      (b) => b.textContent,
    );
    expect(
      buttonTexts.some((t) => t?.includes("Adventure & Encounter Design")),
    ).toBe(true);
    expect(buttonTexts.some((t) => t?.includes("Running at the Table"))).toBe(
      true,
    );
    expect(
      buttonTexts.some((t) => t?.includes("Worldbuilding & Setting Design")),
    ).toBe(true);
    expect(
      buttonTexts.some((t) => t?.includes("Getting Started & Table Setup")),
    ).toBe(true);
    expect(
      buttonTexts.some((t) => t?.includes("Session Prep & Planning")),
    ).toBe(true);
    expect(
      buttonTexts.some((t) => t?.includes("Notes & Campaign Management")),
    ).toBe(true);
  });

  it("renders format filter chips", () => {
    render(Page, {
      props: { data: { answers: mockAnswers } },
    });

    const formatContainer = document.querySelector(
      'div[role="group"][aria-label="Filter answers by format"]',
    );
    expect(formatContainer).toBeTruthy();
    expect(formatContainer?.textContent).toContain("All Formats");
    expect(formatContainer?.textContent).toContain("How-To");
    expect(formatContainer?.textContent).toContain("Frameworks");
    expect(formatContainer?.textContent).toContain("Definitions");
    expect(formatContainer?.textContent).toContain("Comparisons");
  });

  it("filters answers when a category directory card is clicked and toggles off when clicked again", async () => {
    const { container } = render(Page, {
      props: { data: { answers: mockAnswers } },
    });

    // Click adventure design directory card
    const adventureCard = Array.from(
      container.querySelectorAll('nav[aria-label="Category directory"] button'),
    ).find((b) => b.textContent?.includes("Adventure & Encounter Design"));
    expect(adventureCard).toBeTruthy();
    expect(adventureCard?.getAttribute("aria-pressed")).toBe("false");

    await fireEvent.click(adventureCard!);

    // Should show filtered view with 1 result
    expect(adventureCard?.getAttribute("aria-pressed")).toBe("true");
    expect(adventureCard?.textContent).toContain(
      "Active filter (click to clear)",
    );
    expect(container.textContent).toContain("Showing 1 of 3 answers");
    expect(container.textContent).toContain("How do you run a heist?");
    expect(container.textContent).not.toContain("What is a point crawl?");

    // Click again to toggle off
    await fireEvent.click(adventureCard!);
    expect(adventureCard?.getAttribute("aria-pressed")).toBe("false");
    expect(container.textContent).toContain("What is a point crawl?");
  });

  it("filters answers when search query is entered and shows negative empty state when no match", async () => {
    const { container } = render(Page, {
      props: { data: { answers: mockAnswers } },
    });

    const searchInput = container.querySelector(
      "#answers-search",
    ) as HTMLInputElement;
    expect(searchInput).toBeTruthy();

    await fireEvent.input(searchInput, {
      target: { value: "nonexistent keyword xyz" },
    });

    expect(container.textContent).toContain("No answers found");
    expect(container.textContent).toContain("Clear search & filters");

    const clearButton = container.querySelector(
      'button[aria-label="Clear search"]',
    ) as HTMLButtonElement;
    if (clearButton) {
      await fireEvent.click(clearButton);
      expect(searchInput.value).toBe("");
    }
  });

  it("filters by format kind chips", async () => {
    const { container } = render(Page, {
      props: { data: { answers: mockAnswers } },
    });

    const frameworkChip = Array.from(
      container.querySelectorAll(
        'div[aria-label="Filter answers by format"] button',
      ),
    ).find((b) => b.textContent?.includes("Frameworks"));
    expect(frameworkChip).toBeTruthy();

    await fireEvent.click(frameworkChip!);

    expect(container.textContent).toContain("format: Framework");
    expect(container.textContent).toContain("How do you run a heist?");
    expect(container.textContent).not.toContain("What is a point crawl?");
  });

  it("shows community favourites when the aggregate meets quorum", async () => {
    // Favourite display copy resolves through the real answer registry,
    // independent of the directory data under test.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          items: [
            { slug: "how-do-you-run-a-heist-in-a-tabletop-rpg", yes: 30 },
            { slug: "what-is-a-point-crawl", yes: 18 },
            {
              slug: "how-do-you-build-a-point-crawl-for-an-rpg",
              yes: 12,
            },
            {
              slug: "what-makes-a-good-heist-target-in-a-tabletop-rpg",
              yes: 11,
            },
          ],
        }),
      })),
    );

    render(Page, { props: { data: { answers: mockAnswers } } });

    const section = await screen.findByRole("region", {
      name: "Community favourites",
    });
    const links = section.querySelectorAll("a");
    expect(links).toHaveLength(4);
    expect(links[0].getAttribute("href")).toContain(
      "how-do-you-run-a-heist-in-a-tabletop-rpg",
    );
    expect(section.textContent).toContain("30 readers found this helpful");
  });

  it("hides community favourites when the reader is filtering", async () => {
    window.history.replaceState({}, "", "/answers?q=heist");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          items: [
            { slug: "how-do-you-run-a-heist", yes: 30 },
            { slug: "how-to-manage-table-engagement", yes: 18 },
            { slug: "what-is-a-point-crawl", yes: 12 },
            { slug: "retired-slug", yes: 50 },
          ],
        }),
      })),
    );

    render(Page, { props: { data: { answers: mockAnswers } } });

    await waitFor(() => {
      expect(window.location.search).toContain("q=heist");
    });
    expect(
      screen.queryByRole("region", { name: "Community favourites" }),
    ).toBeNull();
  });

  it("renders the directory normally when the aggregate is unreachable", async () => {
    render(Page, { props: { data: { answers: mockAnswers } } });

    await waitFor(() => {
      expect(screen.getByText("How do you run a heist?")).toBeTruthy();
    });
    expect(
      screen.queryByRole("region", { name: "Community favourites" }),
    ).toBeNull();
  });

  it("ignores inherited kind names in the URL filter", async () => {
    window.history.replaceState({}, "", "/answers?kind=constructor");

    const { container } = render(Page, {
      props: { data: { answers: mockAnswers } },
    });

    await waitFor(() => {
      const allFormats = container.querySelector(
        'div[aria-label="Filter answers by format"] button',
      );
      expect(allFormats?.getAttribute("aria-pressed")).toBe("true");
      expect(window.location.search).not.toContain("kind=");
    });
  });
});
