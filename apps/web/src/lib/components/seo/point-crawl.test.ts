import { describe, it, expect } from "vitest";
import { pointCrawlConfig } from "$lib/services/seo/generator-config";
import { generatorEngine } from "$lib/services/seo/generator-engine";
import type {
  PointCrawlNetwork,
  PointCrawlNode,
  PointCrawlRoute,
  PointCrawlRegenTarget,
} from "generator-engine";

describe("Point Crawl Web Services & Config", () => {
  it("exports valid pointCrawlConfig", () => {
    expect(pointCrawlConfig.genres).toBeDefined();
    expect(pointCrawlConfig.genres.length).toBeGreaterThan(0);
    expect(pointCrawlConfig.scales).toBeDefined();
    expect(pointCrawlConfig.pointCounts).toBeDefined();
  });

  it("generates point crawl output with pointCrawl in local mode", async () => {
    const output = await generatorEngine.generatePointCrawl({
      genre: "Classic Fantasy",
      scale: "Wilderness",
      pointCount: 6,
      useAI: false,
    });

    expect(output.type).toBe("note");
    expect(output.title).toBeDefined();
    expect(output.summary).toBeDefined();
    expect(output.content).toBeDefined();
    expect(output.lore).toBeDefined();
    expect(output.labels).toContain("point-crawl");
    expect(output.pointCrawl).toBeDefined();

    const crawl = output.pointCrawl as PointCrawlNetwork;
    expect(crawl.nodes.length).toBeGreaterThanOrEqual(6);
    expect(crawl.routes.length).toBeGreaterThan(0);
  });

  it("regenerates a specific node surgically", async () => {
    const initial = await generatorEngine.generatePointCrawl({
      genre: "Classic Fantasy",
      scale: "Wilderness",
      pointCount: 6,
      useAI: false,
    });

    const crawl = initial.pointCrawl as PointCrawlNetwork;
    const targetNode = crawl.nodes[0];
    const target: PointCrawlRegenTarget = { kind: "node", id: targetNode.id };

    const result = await generatorEngine.regeneratePointCrawlPart(
      crawl,
      target,
      {
        instruction: "Make it a glowing crystal cave",
        useAI: false,
      },
    );

    const updatedNode = result.crawl.nodes.find(
      (n: PointCrawlNode) => n.id === targetNode.id,
    );
    expect(updatedNode).toBeDefined();
    expect(result.crawl.nodes.length).toBe(crawl.nodes.length);
    expect(result.crawl.routes.length).toBe(crawl.routes.length);
  });

  it("regenerates a specific route surgically", async () => {
    const initial = await generatorEngine.generatePointCrawl({
      genre: "Classic Fantasy",
      scale: "Wilderness",
      pointCount: 6,
      useAI: false,
    });

    const crawl = initial.pointCrawl as PointCrawlNetwork;
    const targetRoute = crawl.routes[0];
    const target: PointCrawlRegenTarget = { kind: "route", id: targetRoute.id };

    const result = await generatorEngine.regeneratePointCrawlPart(
      crawl,
      target,
      {
        instruction: "Add a collapsing rope bridge",
        useAI: false,
      },
    );

    const updatedRoute = result.crawl.routes.find(
      (r: PointCrawlRoute) => r.id === targetRoute.id,
    );
    expect(updatedRoute).toBeDefined();
    expect(result.crawl.nodes.length).toBe(crawl.nodes.length);
    expect(result.crawl.routes.length).toBe(crawl.routes.length);
  });
});
