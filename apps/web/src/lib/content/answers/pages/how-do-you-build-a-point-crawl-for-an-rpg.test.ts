import { describe, expect, it } from "vitest";
import { howDoYouBuildAPointCrawlForAnRpg } from "./how-do-you-build-a-point-crawl-for-an-rpg";
import { AnswerConfigSchema } from "../schema";

const exampleSection = howDoYouBuildAPointCrawlForAnRpg.sections.find(
  (section) => section.kind === "example",
);
const exampleItems =
  exampleSection && exampleSection.kind === "example"
    ? (exampleSection.items ?? [])
    : [];

describe("how-do-you-build-a-point-crawl-for-an-rpg (#4370)", () => {
  it("validates against AnswerConfigSchema", () => {
    const parsed = AnswerConfigSchema.parse(howDoYouBuildAPointCrawlForAnRpg);
    expect(parsed.slug).toBe("how-do-you-build-a-point-crawl-for-an-rpg");
    expect(parsed.kind).toBe("how-to");
  });

  it("includes the point-crawl-morzan-crypt diagram on the worked example section", () => {
    expect(exampleSection).toBeDefined();
    expect(exampleSection?.kind).toBe("example");
    if (exampleSection && exampleSection.kind === "example") {
      expect(exampleSection.diagram).toBe("point-crawl-morzan-crypt");
      expect(exampleSection.heading).toContain("Morzan's Crypt");
    }
  });

  it("describes the exact six nodes in the example prose", () => {
    const nodesItem = exampleItems.find((item) => item.term === "Nodes");
    expect(nodesItem).toBeDefined();
    expect(nodesItem?.text).toContain("Oakhaven");
    expect(nodesItem?.text).toContain("Toll Bridge");
    expect(nodesItem?.text).toContain("Reed Causeway");
    expect(nodesItem?.text).toContain("Old Watchtower");
    expect(nodesItem?.text).toContain("Hermit's Cairn");
    expect(nodesItem?.text).toContain("Morzan's Crypt");
  });

  it("maintains travel times consistent between routes prose and diagram", () => {
    const routesItem = exampleItems.find((item) => item.term === "Routes");
    expect(routesItem).toBeDefined();
    expect(routesItem?.text).toMatch(/Oakhaven to Toll Bridge:\s*half a day/i);
    expect(routesItem?.text).toMatch(/Oakhaven to Reed Causeway:\s*one day/i);
    expect(routesItem?.text).toMatch(/Watchtower to Crypt:\s*one day/i);
    expect(routesItem?.text).toMatch(/Hermit's Cairn to Crypt:\s*half a day/i);
  });
});
