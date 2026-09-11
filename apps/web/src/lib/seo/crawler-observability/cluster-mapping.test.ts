import { describe, expect, it } from "vitest";
import {
  buildRouteClusterMap,
  normalizePath,
  resolvePathCluster,
} from "./cluster-mapping";
import type { DiscoveryEntry } from "../../content/discovery/schema";

describe("cluster-mapping", () => {
  describe("normalizePath", () => {
    it("strips query strings and hash anchors", () => {
      expect(normalizePath("/answers/test?utm_source=chatgpt&id=123")).toBe(
        "/answers/test",
      );
      expect(normalizePath("/answers/test#heading-1")).toBe("/answers/test");
      expect(normalizePath("/answers/test?foo=bar#baz")).toBe("/answers/test");
    });

    it("handles absolute URLs and normalises case and slashes", () => {
      expect(normalizePath("https://codexcryptica.com/generators/heist/")).toBe(
        "/generators/heist",
      );
      expect(normalizePath("http://localhost:5173/Answers/Some-Slug")).toBe(
        "/answers/some-slug",
      );
    });

    it("handles root path and edge inputs", () => {
      expect(normalizePath("/")).toBe("/");
      expect(normalizePath("")).toBe("/");
      expect(normalizePath("///")).toBe("/");
    });
  });

  describe("resolvePathCluster", () => {
    it("resolves canonical heist routes to heist cluster", () => {
      const answer = resolvePathCluster(
        "/answers/how-do-you-run-a-heist-in-a-tabletop-rpg?utm_source=openai",
      );
      expect(answer.primaryContentCluster).toBe("heist");
      expect(answer.contentClusters).toContain("heist");

      const example = resolvePathCluster(
        "/examples/the-breakwater-vault-space-western-heist",
      );
      expect(example.primaryContentCluster).toBe("heist");
      expect(example.contentClusters).toContain("heist");

      const generator = resolvePathCluster("/generators/heist");
      expect(generator.primaryContentCluster).toBe("heist");
      expect(generator.contentClusters).toContain("heist");
    });

    it("resolves canonical rumour and religion routes", () => {
      const rumour = resolvePathCluster(
        "/answers/how-do-you-generate-useful-rpg-rumours",
      );
      expect(rumour.primaryContentCluster).toBe("rumour");
      expect(rumour.contentClusters).toContain("rumour");

      const religion = resolvePathCluster(
        "/answers/how-do-you-create-a-believable-fictional-religion",
      );
      expect(religion.primaryContentCluster).toBe("religion");
      expect(religion.contentClusters).toContain("religion");
    });

    it("returns null primary cluster and empty list for unclustered routes", () => {
      const terms = resolvePathCluster("/terms");
      expect(terms.primaryContentCluster).toBeNull();
      expect(terms.contentClusters).toEqual([]);

      const privacy = resolvePathCluster("/privacy");
      expect(privacy.primaryContentCluster).toBeNull();
      expect(privacy.contentClusters).toEqual([]);
    });

    it("handles multi-cluster entries accurately from custom registry", () => {
      const mockEntries: DiscoveryEntry[] = [
        {
          id: "multi-heist-puzzle",
          pageKind: "example",
          canonicalPath: "/examples/puzzle-vault-heist",
          primaryIntent: "puzzle vault heist example",
          intentAliases: [],
          userJob: "see-an-example",
          uniqueValue: "Demonstrates a puzzle-heavy vault heist score.",
          relatedIntents: [],
          parentCluster: "heist",
          clusters: ["heist", "puzzles"],
          indexable: true,
          status: "live",
          acknowledgedOverlap: [],
        },
      ];

      const customMap = buildRouteClusterMap(mockEntries);
      const result = resolvePathCluster(
        "/examples/puzzle-vault-heist",
        customMap,
      );
      expect(result.primaryContentCluster).toBe("heist");
      expect(result.contentClusters).toEqual(["heist", "puzzles"]);
    });
  });
});
