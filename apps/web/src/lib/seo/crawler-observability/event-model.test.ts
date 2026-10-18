import { describe, expect, it } from "vitest";
import {
  sanitizeCacheStatus,
  sanitizeCountryCode,
  toAnalyticsEngineDataPoint,
  type AiCrawlerEvent,
} from "./event-model";

describe("event-model", () => {
  describe("sanitizeCacheStatus", () => {
    it("normalises valid Cloudflare cache statuses", () => {
      expect(sanitizeCacheStatus("HIT")).toBe("HIT");
      expect(sanitizeCacheStatus("hit")).toBe("HIT");
      expect(sanitizeCacheStatus("MISS")).toBe("MISS");
      expect(sanitizeCacheStatus("BYPASS")).toBe("BYPASS");
      expect(sanitizeCacheStatus("DYNAMIC")).toBe("DYNAMIC");
    });

    it("returns UNKNOWN for missing or unrecognized values", () => {
      expect(sanitizeCacheStatus("")).toBe("UNKNOWN");
      expect(sanitizeCacheStatus(null)).toBe("UNKNOWN");
      expect(sanitizeCacheStatus("SOMETHING_ELSE")).toBe("UNKNOWN");
    });
  });

  describe("sanitizeCountryCode", () => {
    it("preserves valid 2-letter ISO codes", () => {
      expect(sanitizeCountryCode("US")).toBe("US");
      expect(sanitizeCountryCode("no")).toBe("NO");
      expect(sanitizeCountryCode("GB")).toBe("GB");
    });

    it("returns null for non-ISO or malformed country inputs", () => {
      expect(sanitizeCountryCode("USA")).toBeNull();
      expect(sanitizeCountryCode("12")).toBeNull();
      expect(sanitizeCountryCode("")).toBeNull();
      expect(sanitizeCountryCode(null)).toBeNull();
    });
  });

  describe("toAnalyticsEngineDataPoint", () => {
    it("formats data point with correct blobs and doubles alignment", () => {
      const event: AiCrawlerEvent = {
        timestamp: "2026-09-09T20:00:00.000Z",
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
      };

      const point = toAnalyticsEngineDataPoint(event);
      expect(point.indexes).toEqual(["openai"]);
      expect(point.blobs).toEqual([
        "openai",
        "search_crawler",
        "heist",
        "/answers/how-do-you-run-a-heist-in-a-tabletop-rpg",
        "HIT",
        "US",
        "OAI-SearchBot",
        "ip_range",
      ]);
      expect(point.doubles).toEqual([200, 1]);
    });

    it("handles null cluster and country safely without throwing", () => {
      const event: AiCrawlerEvent = {
        timestamp: "2026-09-09T20:00:00.000Z",
        provider: "perplexity",
        agent: "Perplexity-User",
        agentType: "user_fetch",
        verified: false,
        verificationMethod: "unverified",
        path: "/terms",
        responseStatus: 403,
        cacheStatus: "UNKNOWN",
        primaryContentCluster: null,
        contentClusters: [],
        country: null,
      };

      const point = toAnalyticsEngineDataPoint(event);
      expect(point.blobs?.[2]).toBe("none");
      expect(point.blobs?.[5]).toBe("XX");
      expect(point.doubles).toEqual([403, 0]);
    });
  });
});
