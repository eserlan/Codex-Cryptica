/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/svelte";
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
import { STAR_SYSTEMS_TOPIC_CONFIG } from "#lib/content/topics/star-systems.js";

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

  it("renders the inline example without an empty examples list", () => {
    render(TopicHubPage, { props: { config: STAR_SYSTEMS_TOPIC_CONFIG } });

    const section = document.getElementById(
      `${STAR_SYSTEMS_TOPIC_CONFIG.slug}-examples`,
    )?.parentElement as HTMLElement;
    const example = STAR_SYSTEMS_TOPIC_CONFIG.inlineExample;
    expect(section.querySelector("h3")?.textContent?.trim()).toBe(
      example.title,
    );
    const terms = Array.from(section.querySelectorAll("dt")).map((dt) =>
      dt.textContent?.trim(),
    );
    expect(terms).toEqual(example.parts.map((part) => part.term));
    expect(section.textContent).toContain(example.highlight);
    expect(section.querySelector("ul")).toBeNull();
  });

  it("renders no inline example card for hubs without one", () => {
    render(TopicHubPage, { props: { config: HEIST_TOPIC_CONFIG } });

    const section = document.getElementById(
      `${HEIST_TOPIC_CONFIG.slug}-examples`,
    )?.parentElement as HTMLElement;
    expect(section.querySelector("dl")).toBeNull();
    expect(section.querySelectorAll("ul > li")).toHaveLength(
      HEIST_TOPIC_CONFIG.workedExamples.length,
    );
  });

  it("renders the Star Systems hero from the config", () => {
    const { container } = render(TopicHubPage, {
      props: { config: STAR_SYSTEMS_TOPIC_CONFIG },
    });

    const hero = container.querySelector("header figure img") as HTMLElement;
    const config = STAR_SYSTEMS_TOPIC_CONFIG.heroImage;
    expect(hero.getAttribute("src")).toBe(config.src);
    expect(hero.getAttribute("alt")).toBe(config.alt);
    expect(hero.getAttribute("width")).toBe("1600");
    expect(hero.getAttribute("height")).toBe("900");
  });

  it("renders the example diagram only when the example has one", () => {
    render(TopicHubPage, { props: { config: STAR_SYSTEMS_TOPIC_CONFIG } });
    const section = document.getElementById(
      `${STAR_SYSTEMS_TOPIC_CONFIG.slug}-examples`,
    )?.parentElement as HTMLElement;
    expect(
      section.querySelector('[data-testid="topic-example-diagram"]'),
    ).not.toBeNull();
    cleanup();

    const { diagram: _diagram, ...inlineExample } =
      STAR_SYSTEMS_TOPIC_CONFIG.inlineExample;
    render(TopicHubPage, {
      props: { config: { ...STAR_SYSTEMS_TOPIC_CONFIG, inlineExample } },
    });
    const bare = document.getElementById(
      `${STAR_SYSTEMS_TOPIC_CONFIG.slug}-examples`,
    )?.parentElement as HTMLElement;
    expect(
      bare.querySelector('[data-testid="topic-example-diagram"]'),
    ).toBeNull();
    expect(
      Array.from(bare.querySelectorAll("dt")).map((d) => d.textContent?.trim()),
    ).toEqual(inlineExample.parts.map((part) => part.term));
  });

  it("renders no diagram on the Heists hub", () => {
    const { container } = render(TopicHubPage, {
      props: { config: HEIST_TOPIC_CONFIG },
    });
    expect(
      container.querySelector('[data-testid="topic-example-diagram"]'),
    ).toBeNull();
  });
});
