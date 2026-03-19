import { describe, it, expect } from "vitest";
import { rebuildInboundMap } from "./relationships";
import type { LocalEntity } from "./types";

describe("relationships", () => {
  describe("rebuildInboundMap", () => {
    it("should build an inbound map from entities", () => {
      const entities: Record<string, LocalEntity> = {
        "node-1": {
          id: "node-1",
          title: "Node 1",
          content: "",
          lore: "",
          type: "npc",
          connections: [
            { target: "node-2", label: "knows" },
            { target: "node-3", label: "hates" },
          ],
          tags: [],
          labels: [],
        } as any,
        "node-2": {
          id: "node-2",
          title: "Node 2",
          content: "",
          lore: "",
          type: "location",
          connections: [{ target: "node-1", label: "is-in" }],
          tags: [],
          labels: [],
        } as any,
      };

      const inboundMap = rebuildInboundMap(entities);

      expect(inboundMap["node-2"]).toHaveLength(1);
      expect(inboundMap["node-2"][0].sourceId).toBe("node-1");
      expect(inboundMap["node-2"][0].connection.label).toBe("knows");

      expect(inboundMap["node-3"]).toHaveLength(1);
      expect(inboundMap["node-3"][0].sourceId).toBe("node-1");
      expect(inboundMap["node-3"][0].connection.label).toBe("hates");

      expect(inboundMap["node-1"]).toHaveLength(1);
      expect(inboundMap["node-1"][0].sourceId).toBe("node-2");
      expect(inboundMap["node-1"][0].connection.label).toBe("is-in");
    });

    it("should handle multiple inbound connections to the same target", () => {
      const entities: Record<string, LocalEntity> = {
        "node-1": {
          id: "node-1",
          connections: [{ target: "target" }],
        } as any,
        "node-2": {
          id: "node-2",
          connections: [{ target: "target" }],
        } as any,
      };

      const inboundMap = rebuildInboundMap(entities);

      expect(inboundMap["target"]).toHaveLength(2);
      expect(inboundMap["target"][0].sourceId).toBe("node-1");
      expect(inboundMap["target"][1].sourceId).toBe("node-2");
    });

    it("should handle empty entities", () => {
      const inboundMap = rebuildInboundMap({});
      expect(inboundMap).toEqual({});
    });

    it("should handle entities with no connections", () => {
      const entities: Record<string, LocalEntity> = {
        "node-1": {
          id: "node-1",
          connections: [],
        } as any,
      };
      const inboundMap = rebuildInboundMap(entities);
      expect(inboundMap).toEqual({});
    });

    it("should skip connections without target", () => {
      const entities: Record<string, LocalEntity> = {
        "node-1": {
          id: "node-1",
          connections: [
            { target: "", label: "invalid" },
            { target: undefined, label: "invalid" },
          ],
        } as any,
      };
      const inboundMap = rebuildInboundMap(entities);
      expect(inboundMap).toEqual({});
    });
  });
});
