/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";

const pathState = vi.hoisted(() => ({ base: "" }));
vi.mock("$app/paths", () => ({
  get base() {
    return pathState.base;
  },
  asset: (p: string) => p,
  resolve: (p: string) => `${pathState.base}${p}`,
}));
vi.mock("$app/environment", () => ({ browser: false }));

import TopicHubPage from "./TopicHubPage.svelte";
import { TOPIC_LAYOUT } from "./topic-layout.js";
import { HEIST_TOPIC_CONFIG } from "#lib/content/topics/heists.js";
import { STAR_SYSTEMS_TOPIC_CONFIG } from "#lib/content/topics/star-systems.js";
import * as discoveryTracking from "#lib/services/analytics/discovery-tracking.js";

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

  describe("primary action", () => {
    afterEach(() => {
      pathState.base = "";
      vi.restoreAllMocks();
    });

    it("renders an accessible, focusable generator link before the thesis", () => {
      const { container } = render(TopicHubPage, {
        props: { config: STAR_SYSTEMS_TOPIC_CONFIG },
      });

      const cta = screen.getByTestId("topic-primary-cta");
      const link = screen.getByRole("link", {
        name: /Generate a Star System/,
      });
      expect(cta.contains(link)).toBe(true);
      expect(link.getAttribute("href")).toBe("/generators/star-system");
      expect(link.getAttribute("tabindex")).not.toBe("-1");
      expect(link.className).toContain("min-h-[44px]");
      expect(link.className).toContain("focus-visible:outline");

      const header = container.querySelector("header") as HTMLElement;
      const thesis = document.getElementById("star-systems-thesis")
        ?.parentElement as HTMLElement;
      expect(
        header.compareDocumentPosition(cta) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(
        cta.compareDocumentPosition(thesis) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it("prefixes the href with the base path", () => {
      pathState.base = "/codex";
      render(TopicHubPage, { props: { config: STAR_SYSTEMS_TOPIC_CONFIG } });

      expect(
        screen
          .getByRole("link", { name: /Generate a Star System/ })
          .getAttribute("href"),
      ).toBe("/codex/generators/star-system");
    });

    it("renders nothing for hubs without a primary action", () => {
      render(TopicHubPage, { props: { config: HEIST_TOPIC_CONFIG } });

      expect(screen.queryByTestId("topic-primary-cta")).toBeNull();
    });

    it("tracks each link once as a topic_primary_cta click", async () => {
      const spy = vi
        .spyOn(discoveryTracking, "trackDiscoveryClick")
        .mockImplementation(() => {});
      render(TopicHubPage, { props: { config: STAR_SYSTEMS_TOPIC_CONFIG } });

      await fireEvent.click(
        screen.getByRole("link", { name: /Generate a Star System/ }),
      );
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0][0]).toMatchObject({
        sourceKind: "topic",
        sourceId: "star-systems",
        placement: "topic_primary_cta",
        targetKind: "generator",
        targetId: "star-system",
      });

      await fireEvent.click(
        screen.getByRole("link", { name: "Or learn the method first" }),
      );
      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy.mock.calls[1][0]).toMatchObject({
        placement: "topic_primary_cta",
        targetKind: "answer",
        targetId: "how-to-create-a-sci-fi-star-system-for-an-rpg",
      });
    });
  });
});
