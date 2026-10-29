import { describe, expect, it } from "vitest";
import {
  generatePointCrawlNetworkLocal,
  pointCrawlNodeRoleLabel,
  pointCrawlNodeRoleSymbol,
} from "generator-engine";
import { pointCrawlHeading } from "./point-crawl-heading";

describe("pointCrawlHeading", () => {
  it("recognises current and older generated headings", () => {
    const crawl = generatePointCrawlNetworkLocal({ pointCount: 6 });
    const node = crawl.nodes[0];
    const title = `1. ${node.name}`;
    const label = pointCrawlNodeRoleLabel(node);
    const symbol = pointCrawlNodeRoleSymbol(node);
    expect(
      pointCrawlHeading(`${title} (${symbol} ${label})`, crawl)?.label,
    ).toBe(label);
    expect(pointCrawlHeading(`${title} *(${label})*`, crawl)?.label).toBe(
      label,
    );
    expect(pointCrawlHeading("Unrelated heading", crawl)).toBeUndefined();
    expect(pointCrawlHeading(`${title} (${symbol} ${label})`)).toBeUndefined();
  });
});
