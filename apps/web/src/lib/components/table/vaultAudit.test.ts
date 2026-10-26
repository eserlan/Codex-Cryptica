import { describe, expect, it } from "vitest";
import { computeVaultAuditCounts, VAULT_AUDIT_PRESETS } from "./vaultAudit";
import type { EntityWithPreview } from "$lib/components/explorer/entityListFiltering";

describe("vaultAudit pure functions", () => {
  describe("computeVaultAuditCounts", () => {
    it("returns zero counts for empty entities array", () => {
      const counts = computeVaultAuditCounts([]);
      expect(counts).toEqual({
        totalEntities: 0,
        missingImages: 0,
        missingDescriptions: 0,
        zeroConnections: 0,
        unlabelled: 0,
        incomplete: 0,
      });
    });

    it("excludes drafts from audit counts and the audited total", () => {
      const entities: EntityWithPreview[] = [
        {
          id: "active",
          title: "Complete Knight",
          type: "character",
          content: "A veteran warrior.",
          image: "https://example.com/knight.png",
          labels: ["Hero"],
          status: "active",
          aliases: [],
          connections: [],
          updatedAt: 0,
        },
        {
          id: "draft",
          title: "Unfinished Draft",
          type: "character",
          content: "",
          image: undefined,
          labels: [],
          status: "draft",
          aliases: [],
          connections: [],
          updatedAt: 0,
        },
      ];

      expect(
        computeVaultAuditCounts(entities, {
          active: { total: 1 },
          draft: { total: 0 },
        }),
      ).toEqual({
        totalEntities: 1,
        missingImages: 0,
        missingDescriptions: 0,
        zeroConnections: 0,
        unlabelled: 0,
        incomplete: 0,
      });
    });

    it("accurately categorizes findings across a sample vault", () => {
      const entities: EntityWithPreview[] = [
        {
          id: "e1",
          title: "Complete Knight",
          type: "character",
          content: "A veteran warrior.",
          image: "https://example.com/knight.png",
          labels: ["Hero"],
          status: "active",
          aliases: [],
          connections: [],
          updatedAt: 0,
        },
        {
          id: "e2",
          title: "Faceless Bard",
          type: "character",
          content: "A singing wanderer.",
          image: undefined, // missing image
          labels: ["Bard"],
          status: "active",
          aliases: [],
          connections: [],
          updatedAt: 0,
        },
        {
          id: "e3",
          title: "Silhouette Rogue",
          type: "character",
          content: "A shadowy thief.",
          image: "silhouette:character/rogue", // missing image (silhouette is not portrait)
          labels: ["Rogue"],
          status: "active",
          aliases: [],
          connections: [],
          updatedAt: 0,
        },
        {
          id: "e4",
          title: "Empty Place",
          type: "location",
          content: "", // missing description
          image: "https://example.com/map.jpg",
          labels: ["Dungeon"],
          status: "active",
          aliases: [],
          connections: [],
          updatedAt: 0,
        },
        {
          id: "e5",
          title: "Untagged Relic",
          type: "item",
          content: "A magical sword.",
          image: "https://example.com/sword.jpg",
          labels: [], // unlabelled
          status: "active",
          aliases: [],
          connections: [],
          updatedAt: 0,
        },
      ];

      const connectionCounts = {
        e1: { inbound: 1, outbound: 1, total: 2 },
        e2: { inbound: 0, outbound: 0, total: 0 }, // zero connections
        e3: { inbound: 1, outbound: 0, total: 1 },
        e4: { inbound: 0, outbound: 0, total: 0 }, // zero connections
        e5: { inbound: 1, outbound: 0, total: 1 },
      };

      const counts = computeVaultAuditCounts(entities, connectionCounts);

      expect(counts.totalEntities).toBe(5);
      // e2 and e3 lack genuine images
      expect(counts.missingImages).toBe(2);
      // e4 lacks description
      expect(counts.missingDescriptions).toBe(1);
      // e2 and e4 have 0 connections
      expect(counts.zeroConnections).toBe(2);
      // e5 is unlabelled
      expect(counts.unlabelled).toBe(1);
      // Incomplete: e2 (0 conn), e4 (no desc & 0 conn), e5 (no labels)
      expect(counts.incomplete).toBe(3);
    });

    it("evaluates large vaults (1,500 entities) in a single fast pass", () => {
      const largeVault: EntityWithPreview[] = Array.from(
        { length: 1500 },
        (_, i) => ({
          id: `ent-${i}`,
          title: `Entity ${i}`,
          type: i % 2 === 0 ? "character" : "location",
          content: i % 3 === 0 ? "" : "Some lore text.",
          image: i % 4 === 0 ? "https://img.com/a.png" : undefined,
          labels: i % 5 === 0 ? [] : ["Tag"],
          status: "active",
          aliases: [],
          connections: [],
          updatedAt: 0,
        }),
      );

      const start = performance.now();
      const counts = computeVaultAuditCounts(largeVault);
      const elapsed = performance.now() - start;

      expect(counts.totalEntities).toBe(1500);
      expect(elapsed).toBeLessThan(100); // well under 100ms
    });
  });

  describe("VAULT_AUDIT_PRESETS", () => {
    it("provides the four required one-click audit presets", () => {
      const ids = VAULT_AUDIT_PRESETS.map((p) => p.id);
      expect(ids).toEqual([
        "characters-missing-portraits",
        "unconnected-characters",
        "sparse-locations",
        "all-flagged",
      ]);
    });

    it("characters-missing-portraits targets characters with missing_image", () => {
      const preset = VAULT_AUDIT_PRESETS.find(
        (p) => p.id === "characters-missing-portraits",
      )!;
      expect(preset.typeFilter).toBe("character");
      expect(preset.columnFilters?.imageMode).toBe("missing_image");
    });

    it("unconnected-characters targets characters with zero connections", () => {
      const preset = VAULT_AUDIT_PRESETS.find(
        (p) => p.id === "unconnected-characters",
      )!;
      expect(preset.typeFilter).toBe("character");
      expect(preset.columnFilters?.connectionsMode).toBe("zero");
    });

    it("sparse-locations targets locations with missing_summary", () => {
      const preset = VAULT_AUDIT_PRESETS.find(
        (p) => p.id === "sparse-locations",
      )!;
      expect(preset.typeFilter).toBe("location");
      expect(preset.columnFilters?.summaryMode).toBe("missing_summary");
    });

    it("all-flagged sets showIncompleteOnly to true", () => {
      const preset = VAULT_AUDIT_PRESETS.find((p) => p.id === "all-flagged")!;
      expect(preset.showIncompleteOnly).toBe(true);
    });
  });
});
