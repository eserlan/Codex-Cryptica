import { describe, it, expect } from "vitest";
import { whatIsAPointCrawl } from "./what-is-a-point-crawl";
import { pointCrawlVsHexCrawl } from "./point-crawl-vs-hex-crawl";
import { whatRpgMapMakingToolShouldIUse } from "./what-rpg-map-making-tool-should-i-use";
import { slugMeta } from "../../../components/seo/generator-page-meta";
import type { AnswerConfigInput } from "../schema";

const GENERATOR_HREF = "/generators/point-crawl";

const proseCtaHrefs = (page: AnswerConfigInput) =>
  page.sections.flatMap((section) =>
    section.kind === "prose" && section.cta ? [section.cta.href] : [],
  );

describe("point-crawl cross-links (#4369)", () => {
  it("gives the definition page a prose action to the generator", () => {
    expect(proseCtaHrefs(whatIsAPointCrawl)).toContain(GENERATOR_HREF);
  });

  it("gives the comparison page a prose action and a related tool for the generator", () => {
    expect(proseCtaHrefs(pointCrawlVsHexCrawl)).toContain(GENERATOR_HREF);
    expect(
      pointCrawlVsHexCrawl.relatedTools?.some(
        (tool) => tool.href === GENERATOR_HREF,
      ),
    ).toBe(true);
  });

  it("lists the generator in the map-maker chooser as a planning diagram, not a tactical map", () => {
    const row = whatRpgMapMakingToolShouldIUse.sections
      .flatMap((section) => (section.kind === "table" ? section.rows : []))
      .find((cells) => cells[0].startsWith("Node-and-route"));

    expect(row?.[1]).toContain("planning diagram");
    expect(row?.[1]).toContain("not a tactical grid or an illustrated map");
    expect(
      whatRpgMapMakingToolShouldIUse.relatedTools?.some(
        (tool) => tool.href === GENERATOR_HREF,
      ),
    ).toBe(true);
  });

  it("sends generator readers to the how-to and comparison pages first", () => {
    const hrefs =
      slugMeta["point-crawl"].relatedLinks?.map((link) => link.href) ?? [];

    expect(hrefs.slice(0, 2)).toEqual([
      "/answers/how-do-you-build-a-point-crawl-for-an-rpg",
      "/answers/point-crawl-vs-hex-crawl",
    ]);
    expect(hrefs).toContain("/answers/what-is-a-point-crawl");
    expect(hrefs).toContain("/examples/the-receding-tide-road-point-crawl");
  });

  it("describes the comparison page example consistently with its edited provenance", () => {
    const link = pointCrawlVsHexCrawl.relatedTools?.find(
      (tool) => tool.href === "/examples/the-receding-tide-road-point-crawl",
    );
    expect(link?.description).toContain("lightly edited");
    expect(link?.description).not.toContain("unedited");
  });

  it("links to the published point crawl example from the answers (#4373)", () => {
    const EXAMPLE_HREF = "/examples/the-receding-tide-road-point-crawl";
    expect(
      whatIsAPointCrawl.relatedTools?.some(
        (tool) => tool.href === EXAMPLE_HREF,
      ),
    ).toBe(true);
    expect(
      pointCrawlVsHexCrawl.relatedTools?.some(
        (tool) => tool.href === EXAMPLE_HREF,
      ),
    ).toBe(true);
  });
});
