import { describe, it, expect } from "vitest";
import {
  buildZenConnections,
  createVisibilityChecker,
  getOutboundConnections,
  getInboundConnections,
  getChildConnections,
} from "./zen-connections";

describe("zen-connections builder", () => {
  const mockEntities: Record<string, any> = {
    "entity-1": {
      id: "entity-1",
      title: "Entity One",
      connections: [
        {
          target: "entity-2",
          type: "ALLY",
          label: "Ally Of",
          strength: 2,
        },
      ],
    },
    "entity-2": {
      id: "entity-2",
      title: "Entity Two",
      connections: [],
    },
    "entity-child": {
      id: "entity-child",
      title: "Child Entity",
      parent: "entity-1",
      connections: [],
    },
    "entity-hidden": {
      id: "entity-hidden",
      title: "Hidden Entity",
      visibility: "private",
      connections: [],
    },
  };

  const mockVault = {
    isGuest: false,
    entities: mockEntities,
    allEntities: Object.values(mockEntities),
    inboundConnections: {
      "entity-2": [
        {
          sourceId: "entity-1",
          connection: {
            target: "entity-2",
            type: "ALLY",
            label: "Ally Of",
            strength: 2,
          },
        },
      ],
    },
    defaultVisibility: "public",
  };

  it("returns an empty array when entity is null or undefined", () => {
    expect(buildZenConnections(null, mockVault)).toEqual([]);
    expect(buildZenConnections(undefined, mockVault)).toEqual([]);
  });

  it("builds outbound connections correctly", () => {
    const checker = createVisibilityChecker(mockVault);
    const outbound = getOutboundConnections(
      mockEntities["entity-1"],
      mockVault,
      checker,
    );
    expect(outbound).toHaveLength(1);
    expect(outbound[0]).toMatchObject({
      id: "entity-2",
      title: "Entity Two",
      displayLabel: "Ally Of",
      type: "ALLY",
      isOutbound: true,
      strength: 2,
    });
  });

  it("builds inbound connections correctly", () => {
    const checker = createVisibilityChecker(mockVault);
    const inbound = getInboundConnections(
      mockEntities["entity-2"],
      mockVault,
      checker,
    );
    expect(inbound).toHaveLength(1);
    expect(inbound[0]).toMatchObject({
      id: "entity-1",
      title: "Entity One",
      displayLabel: "Ally Of",
      type: "ALLY",
      isOutbound: false,
      strength: 2,
    });
  });

  it("builds child connections without duplicating existing connections", () => {
    const checker = createVisibilityChecker(mockVault);
    const existing = new Set<string>();
    const children = getChildConnections(
      mockEntities["entity-1"],
      mockVault,
      checker,
      existing,
    );
    expect(children).toHaveLength(1);
    expect(children[0]).toMatchObject({
      id: "entity-child",
      title: "Child Entity",
      displayLabel: "Child",
      type: "child",
      isChild: true,
    });
  });

  it("builds combined connections through buildZenConnections", () => {
    const result = buildZenConnections(mockEntities["entity-1"], mockVault);
    expect(result.some((c) => c.id === "entity-2" && c.isOutbound)).toBe(true);
    expect(result.some((c) => c.id === "entity-child" && c.isChild)).toBe(true);
  });

  it("filters out invisible entities when in guest mode", () => {
    const guestVault = {
      ...mockVault,
      isGuest: true,
      entities: {
        ...mockEntities,
        "entity-with-hidden": {
          id: "entity-with-hidden",
          title: "Has Hidden",
          connections: [
            {
              target: "entity-hidden",
              type: "SEES",
            },
          ],
        },
      },
    };

    const result = buildZenConnections(
      guestVault.entities["entity-with-hidden"] as any,
      guestVault,
    );
    expect(result).toHaveLength(0);
  });
});
