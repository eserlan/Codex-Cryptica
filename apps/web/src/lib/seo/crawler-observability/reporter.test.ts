import { describe, expect, it } from "vitest";
import {
  aggregateCrawlerEvents,
  findUnfetchedClusterRoutes,
  formatActivitySummaryTable,
  formatCoverageGapReport,
} from "./reporter";
import type { AiCrawlerEvent } from "./event-model";

describe("reporter", () => {
  const sampleEvents: AiCrawlerEvent[] = [
    {
      timestamp: "2026-09-09T10:15:00.000Z",
      provider: "openai",
      agent: "OAI-SearchBot",
      agentType: "search_crawler",
      verified: true,
      verificationMethod: "ip_range",
      path: "/answers/how-do-you-run-a-heist-in-a-tabletop-rpg",
      responseStatus: 200,
      cacheStatus: "HIT",
      primaryContentCluster: "heist",
      contentClusters: ["heist"],
      country: "US",
    },
    {
      timestamp: "2026-09-09T10:16:00.000Z",
      provider: "openai",
      agent: "OAI-SearchBot",
      agentType: "search_crawler",
      verified: true,
      verificationMethod: "ip_range",
      path: "/answers/how-do-you-run-a-heist-in-a-tabletop-rpg",
      responseStatus: 200,
      cacheStatus: "HIT",
      primaryContentCluster: "heist",
      contentClusters: ["heist"],
      country: "US",
    },
    {
      timestamp: "2026-09-09T11:00:00.000Z",
      provider: "openai",
      agent: "ChatGPT-User",
      agentType: "user_fetch",
      verified: true,
      verificationMethod: "ip_range",
      path: "/generators/heist",
      responseStatus: 200,
      cacheStatus: "DYNAMIC",
      primaryContentCluster: "heist",
      contentClusters: ["heist"],
      country: "US",
    },
    {
      timestamp: "2026-09-09T12:00:00.000Z",
      provider: "perplexity",
      agent: "PerplexityBot",
      agentType: "search_crawler",
      verified: true,
      verificationMethod: "ip_range",
      path: "/generators/rumour",
      responseStatus: 403,
      cacheStatus: "UNKNOWN",
      primaryContentCluster: "rumour",
      contentClusters: ["rumour"],
      country: "US",
    },
  ];

  describe("aggregateCrawlerEvents", () => {
    it("aggregates events by date, provider, agentType, and cluster", () => {
      const aggregates = aggregateCrawlerEvents(sampleEvents);

      expect(aggregates).toHaveLength(3);

      const oaiSearch = aggregates.find(
        (a) => a.provider === "openai" && a.agentType === "search_crawler",
      );
      expect(oaiSearch).toBeDefined();
      expect(oaiSearch?.requests).toBe(2);
      expect(oaiSearch?.uniquePaths).toBe(1);
      expect(oaiSearch?.status2xx).toBe(2);
      expect(oaiSearch?.blockedOrErrors).toBe(0);

      const oaiUser = aggregates.find(
        (a) => a.provider === "openai" && a.agentType === "user_fetch",
      );
      expect(oaiUser).toBeDefined();
      expect(oaiUser?.requests).toBe(1);
      expect(oaiUser?.uniquePaths).toBe(1);

      const perplexity = aggregates.find((a) => a.provider === "perplexity");
      expect(perplexity).toBeDefined();
      expect(perplexity?.blockedOrErrors).toBe(1);
    });
  });

  describe("formatActivitySummaryTable", () => {
    it("renders markdown table matching Issue #2864 specification", () => {
      const aggregates = aggregateCrawlerEvents(sampleEvents);
      const table = formatActivitySummaryTable(aggregates);

      expect(table).toContain(
        "| Date | Provider | Agent type | Cluster | Requests | Unique paths | 2xx | Blocked/errors |",
      );
      expect(table).toContain(
        "| 2026-09-09 | openai | search_crawler | heist | 2 | 1 | 2 | 0 |",
      );
      expect(table).toContain(
        "| 2026-09-09 | openai | user_fetch | heist | 1 | 1 | 1 | 0 |",
      );
      expect(table).toContain(
        "| 2026-09-09 | perplexity | search_crawler | rumour | 1 | 1 | 0 | 1 |",
      );
    });

    it("handles empty aggregate array", () => {
      expect(formatActivitySummaryTable([])).toBe(
        "No crawler activity recorded for the selected period.",
      );
    });
  });

  describe("findUnfetchedClusterRoutes & formatCoverageGapReport", () => {
    it("identifies unfetched cluster routes", () => {
      const unfetched = findUnfetchedClusterRoutes(sampleEvents, ["heist"]);
      const heistGaps = unfetched.get("heist");

      expect(heistGaps).toBeDefined();
      // Should include the heist example which was not visited
      expect(heistGaps).toContain(
        "/examples/the-breakwater-vault-space-western-heist",
      );
      // Should NOT include visited answer
      expect(heistGaps).not.toContain(
        "/answers/how-do-you-run-a-heist-in-a-tabletop-rpg",
      );

      const report = formatCoverageGapReport(unfetched);
      expect(report).toContain("Unfetched Cluster Routes");
      expect(report).toContain(
        "/examples/the-breakwater-vault-space-western-heist",
      );
    });
  });
});
