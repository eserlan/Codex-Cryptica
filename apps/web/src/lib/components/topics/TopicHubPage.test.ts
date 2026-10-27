/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";

vi.mock("$app/paths", () => ({
  base: "",
  asset: (p: string) => p,
  resolve: (p: string) => p,
}));
vi.mock("$app/environment", () => ({ browser: false }));

import TopicHubPage from "./TopicHubPage.svelte";
import { TOPIC_LAYOUT } from "./topic-layout.js";
import { HEIST_TOPIC_CONFIG } from "#lib/content/topics/heists.js";

describe("TopicHubPage layout", () => {
  it("uses the wide canvas rather than a single reading column", () => {
    const { container } = render(TopicHubPage, {
      props: { config: HEIST_TOPIC_CONFIG },
    });

    const article = container.querySelector("article") as HTMLElement;
    expect(article.className).toContain("max-w-7xl");
    expect(article.className).not.toContain("max-w-2xl");
  });

  it("puts the hero beside the lead copy from lg without cropping it", () => {
    const { container } = render(TopicHubPage, {
      props: { config: HEIST_TOPIC_CONFIG },
    });

    const header = container.querySelector("header") as HTMLElement;
    expect(header.className).toContain("lg:grid-cols-12");
    const hero = header.querySelector("figure img") as HTMLImageElement;
    expect(hero.getAttribute("src")).toBe(HEIST_TOPIC_CONFIG.heroImage.src);
    expect(hero.className).toContain("h-auto");
    expect(hero.className).not.toContain("object-cover");
  });

  it("lays guides, examples and tools out as two-column card grids", () => {
    render(TopicHubPage, { props: { config: HEIST_TOPIC_CONFIG } });

    for (const id of ["learn", "examples", "tools"]) {
      const section = document.getElementById(
        `${HEIST_TOPIC_CONFIG.slug}-${id}`,
      )?.parentElement as HTMLElement;
      const list = section.querySelector("ul") as HTMLElement;
      expect(list.className).toContain("md:grid-cols-2");
    }
  });

  it("keeps intro copy at the reading measure", () => {
    render(TopicHubPage, { props: { config: HEIST_TOPIC_CONFIG } });

    const intro = screen.getByText(HEIST_TOPIC_CONFIG.copy.learnIntro);
    expect(intro.className).toContain(TOPIC_LAYOUT.measure);
  });

  it("falls back to a lead-width header and no figure when there is no hero", () => {
    const config = { ...HEIST_TOPIC_CONFIG, heroImage: undefined };
    const { container } = render(TopicHubPage, { props: { config } });

    expect(container.querySelector("header figure")).toBeNull();
    // A grid with a single child would squeeze the copy into one column.
    expect(container.querySelector("header")?.className).not.toContain("grid");
    expect(container.querySelector("header > div")?.className).toContain(
      TOPIC_LAYOUT.lead,
    );
  });

  it("keeps every core guide linked from the guides section", () => {
    render(TopicHubPage, { props: { config: HEIST_TOPIC_CONFIG } });

    const section = document.getElementById(`${HEIST_TOPIC_CONFIG.slug}-learn`)
      ?.parentElement as HTMLElement;
    const hrefs = Array.from(section.querySelectorAll("li a")).map((a) =>
      a.getAttribute("href"),
    );
    expect(hrefs).toEqual(HEIST_TOPIC_CONFIG.coreGuides.map((g) => g.href));
  });
});
