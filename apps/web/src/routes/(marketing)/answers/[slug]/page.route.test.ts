/** @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/svelte";
import Page from "./+page.svelte";
import { AnswerConfigSchema } from "#lib/content/answers/schema.js";
import { PUBLIC_LAYOUT } from "#lib/components/seo/marketing-shell.js";
import * as discoveryTracking from "#lib/services/analytics/discovery-tracking.js";
import { howManyNpcsDoesAnRpgTownNeed } from "#lib/content/answers/pages/how-many-npcs-does-an-rpg-town-need.js";
import { howDoYouCreateAFantasyCityThatFeelsAlive } from "#lib/content/answers/pages/how-do-you-create-a-fantasy-city-that-feels-alive.js";

vi.mock("$app/paths", () => ({
  base: "",
  asset: (p: string) => p,
  resolve: (p: string) => p,
}));
vi.mock("$app/environment", () => ({ browser: false }));

function renderAnswer(
  sections: unknown[],
  extra: Record<string, unknown> = {},
  related: Array<{ slug: string; question: string }> = [],
) {
  const answer = AnswerConfigSchema.parse({
    slug: "which-classless-rpgs-fit",
    category: "running-the-game",
    question: "Which classless RPGs fit a long campaign?",
    kind: "comparison",
    shortAnswer: "Pick the one whose advancement matches your campaign length.",
    sections,
    relatedAnswers: [],
    publishedAt: "2026-09-01",
    seo: { title: "Classless RPGs", description: "Comparison" },
    ...extra,
  });
  return render(Page, {
    props: { data: { answer, related } as never },
  });
}

describe("contextual naming links", () => {
  it.each([
    howManyNpcsDoesAnRpgTownNeed,
    howDoYouCreateAFantasyCityThatFeelsAlive,
  ])("renders and tracks the fantasy link in $slug", (answer) => {
    const spy = vi
      .spyOn(discoveryTracking, "trackDiscoveryClick")
      .mockImplementation(() => {});
    renderAnswer(answer.sections, { ...answer, relatedAnswers: [] });
    const link = screen.getByRole("link", { name: "Fantasy Name Generator" });
    expect(link.getAttribute("href")).toBe("/generators/fantasy-names");
    link.click();
    expect(spy).toHaveBeenCalledWith({
      sourceKind: "answer",
      sourceId: answer.slug,
      placement: "inline_link",
      targetKind: "generator",
      targetId: "fantasy-names",
    });
    spy.mockRestore();
  });

  it("keeps the broader naming option for other genres", () => {
    const answer = howManyNpcsDoesAnRpgTownNeed;
    renderAnswer(answer.sections, { ...answer, relatedAnswers: [] });
    expect(
      screen
        .getByRole("link", { name: "RPG Name Generator" })
        .getAttribute("href"),
    ).toBe("/generators/names");
  });
});

describe("answer page tables", () => {
  const table = {
    kind: "table",
    heading: "Comparison at a glance",
    headers: ["System", "Advancement", "Harm and survival"],
    rows: [
      [
        "GURPS 4e",
        "Point-buy; see the [SJ Games table](https://www.sjgames.com/t.pdf).",
        "Luck and [our guide](/answers/other) help.",
      ],
    ],
  };

  it("labels each cell with its column so stacked rows stay readable", () => {
    renderAnswer([table]);

    const rowHeader = screen.getByRole("rowheader", { name: "GURPS 4e" });
    const row = rowHeader.closest("tr");
    expect(row).not.toBeNull();
    const cells = within(row as HTMLElement).getAllByRole("cell");
    expect(cells.map((cell) => cell.dataset.label)).toEqual([
      "Advancement",
      "Harm and survival",
    ]);
    expect(screen.getAllByRole("columnheader")).toHaveLength(3);
  });

  it("renders markdown links in cells as anchors instead of raw text", () => {
    renderAnswer([table]);

    const external = screen.getByRole("link", { name: "SJ Games table" });
    expect(external.getAttribute("href")).toBe("https://www.sjgames.com/t.pdf");
    expect(external.getAttribute("target")).toBe("_blank");
    expect(external.getAttribute("rel")).toBe("noopener noreferrer");

    const internal = screen.getByRole("link", { name: "our guide" });
    expect(internal.getAttribute("href")).toBe("/answers/other");
    expect(internal.getAttribute("target")).toBeNull();

    expect(screen.getByTestId("answer-table").textContent).not.toContain("](");
  });

  it("lets wide tables take the content column but keeps two-column ones at reading width", () => {
    renderAnswer([
      table,
      {
        kind: "table",
        headers: ["Die", "Use"],
        rows: [["d20", "Attacks"]],
      },
    ]);

    const [wide, narrow] = screen
      .getAllByTestId("answer-table")
      .map((el) => el.closest("section") as HTMLElement);
    expect(wide.className).not.toContain(PUBLIC_LAYOUT.prose.measure);
    expect(narrow.className).toContain(PUBLIC_LAYOUT.prose.measure);
  });

  it("keeps four-plus column tables stacked until large screens", () => {
    renderAnswer([
      table,
      {
        kind: "table",
        headers: ["System", "Scale", "Upkeep", "Upgrades"],
        rows: [["Ironsworn", "Settlement", "Low", "Assets"]],
      },
    ]);

    const [threeColumns, fourColumns] = screen.getAllByTestId("answer-table");
    const threeCell = within(threeColumns).getAllByRole("cell")[0];
    const fourCell = within(fourColumns).getAllByRole("cell")[0];
    expect(threeCell.className).toContain("max-md:block");
    expect(threeCell.className).not.toContain("max-lg:block");
    expect(fourCell.className).toContain("max-lg:block");
    expect(fourCell.className).not.toContain("max-md:block");
  });

  it("keeps unsafe link syntax as plain text in list items", () => {
    renderAnswer([
      {
        kind: "list",
        items: [{ text: "Never [click](javascript:alert(1)) this." }],
      },
    ]);

    expect(screen.queryByRole("link", { name: "click" })).toBeNull();
    expect(
      screen.getByText("Never [click](javascript:alert(1)) this."),
    ).toBeTruthy();
  });

  it("renders the worked example point crawl diagram when diagram id is specified", () => {
    renderAnswer([
      {
        kind: "example",
        heading: "Copyable example: the road to Morzan's Crypt",
        diagram: "point-crawl-morzan-crypt",
        paragraphs: ["Follow the routes below."],
      },
    ]);

    expect(screen.getByTestId("point-crawl-morzan-diagram")).toBeTruthy();
  });

  it("tracks clicks on site links in prose but not external citations", () => {
    const spy = vi
      .spyOn(discoveryTracking, "trackDiscoveryClick")
      .mockImplementation(() => {});
    renderAnswer([
      {
        kind: "list",
        items: [
          {
            text: "Try the [Fantasy Name Generator](/generators/fantasy-names) or read [the SRD](https://example.com/srd).",
          },
        ],
      },
    ]);

    screen.getByRole("link", { name: "the SRD" }).click();
    expect(spy).not.toHaveBeenCalled();

    screen.getByRole("link", { name: "Fantasy Name Generator" }).click();
    expect(spy).toHaveBeenCalledWith({
      sourceKind: "answer",
      sourceId: "which-classless-rpgs-fit",
      placement: "inline_link",
      targetKind: "generator",
      targetId: "fantasy-names",
    });
    spy.mockRestore();
  });
});

describe("answer page widescreen aside", () => {
  const prose = { kind: "prose", paragraphs: ["Advancement matters."] };

  it("puts related links in a labelled aside and keeps the inline copy for small screens", () => {
    renderAnswer(
      [prose],
      {
        relatedTools: [
          {
            title: "NPC Generator",
            description: "Roll an NPC.",
            href: "/tools/npc-generator",
          },
        ],
      },
      [{ slug: "hex-crawl-basics", question: "How do you run a hex crawl?" }],
    );

    const aside = screen.getByTestId("answer-aside");
    expect(aside.tagName).toBe("ASIDE");
    expect(aside.className).toContain("lg:block");
    const label = document.getElementById(
      aside.getAttribute("aria-labelledby") ?? "",
    );
    expect(label?.textContent?.trim()).toBe("Related");
    expect(within(aside).getByText("NPC Generator")).toBeTruthy();
    expect(within(aside).getByText("How do you run a hex crawl?")).toBeTruthy();

    const inline = screen.getByTestId("answer-related-inline");
    expect(inline.className).toContain("lg:hidden");
    expect(within(inline).getByText("NPC Generator")).toBeTruthy();
  });

  it("renders no aside or empty rail when there is nothing related", () => {
    renderAnswer([prose]);

    expect(screen.queryByTestId("answer-aside")).toBeNull();
    expect(screen.queryByTestId("answer-related-inline")).toBeNull();
    expect(screen.getByRole("article").className).not.toContain("col-span");
  });

  it("centres the article and aligns its measure when there is no aside", () => {
    renderAnswer([prose]);

    const article = screen.getByRole("article");
    expect(article.className).toContain(PUBLIC_LAYOUT.solo.column);
    expect(
      screen.getByRole("navigation", { name: "Breadcrumb" }).className,
    ).toContain(PUBLIC_LAYOUT.prose.measure);
    expect(article.querySelector("section")?.className).toContain(
      PUBLIC_LAYOUT.prose.measure,
    );
  });

  it("keeps the split grid, uncentred, when an aside exists", () => {
    renderAnswer([prose], {}, [{ slug: "hex-crawl-basics", question: "Hex?" }]);

    const article = screen.getByRole("article");
    expect(article.className).toContain(PUBLIC_LAYOUT.split.content);
    expect(article.className).not.toContain("mx-auto");
    expect(article.querySelector("section")?.className).toContain(
      PUBLIC_LAYOUT.prose.measure,
    );
  });
});
