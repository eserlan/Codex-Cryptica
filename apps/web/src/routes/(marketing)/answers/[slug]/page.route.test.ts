/** @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/svelte";
import Page from "./+page.svelte";
import { AnswerConfigSchema } from "#lib/content/answers/schema.js";
import * as discoveryTracking from "#lib/services/analytics/discovery-tracking.js";

vi.mock("$app/paths", () => ({
  base: "",
  asset: (p: string) => p,
  resolve: (p: string) => p,
}));
vi.mock("$app/environment", () => ({ browser: false }));

function renderAnswer(sections: unknown[]) {
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
  });
  return render(Page, {
    props: { data: { answer, related: [] } as never },
  });
}

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

  it("breaks wide tables out of the reading column but not two-column ones", () => {
    renderAnswer([
      table,
      {
        kind: "table",
        headers: ["Die", "Use"],
        rows: [["d20", "Attacks"]],
      },
    ]);

    const [wide, narrow] = screen.getAllByTestId("answer-table");
    expect(wide.className).toContain("lg:-translate-x-1/2");
    expect(narrow.className).not.toContain("lg:-translate-x-1/2");
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
