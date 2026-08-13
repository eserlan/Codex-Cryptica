import { describe, it, expect } from "vitest";
import { DelveTopologyGenerator } from "./delve-topology-generator";
import { DelveConnectivityValidator } from "./delve-connectivity-validator";
import type { DelveCanvasDocument } from "./delve-builder-types";

describe("DelveConnectivityValidator", () => {
  const sampleConcept = {
    conceptId: "conn-test-1",
    title: "Connectivity Test Dungeon",
    size: "small" as const,
    sectors: [{ id: "s1", name: "Main Hall", order: 1 }],
  };

  it("validates fully connected canvas topology as valid", () => {
    const generator = new DelveTopologyGenerator();
    const doc = generator.generateFromConcept(sampleConcept);

    const validator = new DelveConnectivityValidator();
    const result = validator.validateGraphConnectivity(doc);

    expect(result.isValid).toBe(true);
    expect(result.orphanedRoomIds).toHaveLength(0);
    expect(result.missingEntrance).toBe(false);
  });

  it("detects orphaned room nodes disconnected from all entrance rooms", () => {
    const generator = new DelveTopologyGenerator();
    const doc = generator.generateFromConcept(sampleConcept);

    // Add an isolated orphan room node
    const orphanDoc: DelveCanvasDocument = {
      ...doc,
      nodes: [
        ...doc.nodes,
        {
          id: "room-orphan-999",
          type: "delveRoom",
          position: { x: 500, y: 500 },
          data: {
            id: "room-orphan-999",
            sectorId: "s1",
            sectorName: "Main Hall",
            name: "Isolated Chamber",
            role: "secret",
            summary: "No entrance path",
            description: "Completely cut off",
            stocking: {},
          },
        },
      ],
    };

    const validator = new DelveConnectivityValidator();
    const result = validator.validateGraphConnectivity(orphanDoc);

    expect(result.isValid).toBe(false);
    expect(result.orphanedRoomIds).toContain("room-orphan-999");
  });

  it("flags missingEntrance when no room has the entrance role", () => {
    const generator = new DelveTopologyGenerator();
    const doc = generator.generateFromConcept(sampleConcept);

    // Remove entrance role from all rooms
    const noEntranceDoc: DelveCanvasDocument = {
      ...doc,
      nodes: doc.nodes.map((node) => {
        if (node.type === "delveRoom") {
          return {
            ...node,
            data: { ...(node.data as any), role: "encounter" },
          };
        }
        return node;
      }),
    };

    const validator = new DelveConnectivityValidator();
    const result = validator.validateGraphConnectivity(noEntranceDoc);

    expect(result.missingEntrance).toBe(true);
    expect(result.isValid).toBe(false);
  });
});
