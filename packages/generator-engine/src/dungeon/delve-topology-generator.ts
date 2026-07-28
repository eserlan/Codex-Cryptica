import type {
  DelveCanvasDocument,
  DelveCanvasNode,
  DelveCanvasEdge,
  DelveRoomNodeData,
  DungeonSectorFrameData,
  DungeonRoomRole,
  PassageType,
  DelveRoomStocking,
} from "./delve-builder-types";

export interface DelveConceptInput {
  conceptId: string;
  title: string;
  size?: "small" | "medium" | "sprawling";
  sectors?: Array<{
    id: string;
    name: string;
    theme?: string;
    description?: string;
    order?: number;
  }>;
  factions?: string[];
  hazards?: string[];
}

const roomCountRanges = {
  small: { minimum: 6, maximum: 9 },
  medium: { minimum: 10, maximum: 14 },
  sprawling: { minimum: 15, maximum: 20 },
} as const;

export class DelveTopologyGenerator {
  constructor(private readonly random: () => number = Math.random) {}

  public generateFromConcept(input: DelveConceptInput): DelveCanvasDocument {
    const size =
      input.size === "small" ||
      input.size === "medium" ||
      input.size === "sprawling"
        ? input.size
        : "medium";
    const rawSectors =
      input.sectors && input.sectors.length > 0
        ? input.sectors
        : [
            {
              id: "sec-default-1",
              name: "Upper Passages",
              theme: "Stone Corridors",
              order: 1,
            },
            {
              id: "sec-default-2",
              name: "Lower Depths",
              theme: "Sunken Chambers",
              order: 2,
            },
          ];

    const sectorNodes: DelveCanvasNode[] = [];
    const roomNodes: DelveCanvasNode[] = [];
    const edges: DelveCanvasEdge[] = [];
    const entranceRoomIds: string[] = [];
    const sectorRoomIdsByIndex: string[][] = [];

    const roomCounts = this.distributeRooms(size, rawSectors.length);

    rawSectors.forEach((sec, sectorIndex) => {
      const roomsInSector = roomCounts[sectorIndex];
      const sectorId = sec.id || `sector-${sectorIndex + 1}`;
      const sectorData: DungeonSectorFrameData = {
        id: sectorId,
        name: sec.name || `Sector ${sectorIndex + 1}`,
        theme: sec.theme || "",
        description: sec.description || "",
        order: sec.order || sectorIndex + 1,
      };

      sectorNodes.push({
        id: sectorId,
        type: "delveSectorGroup",
        position: { x: 0, y: 0 },
        data: sectorData,
      });

      const sectorRoomIds: string[] = [];
      sectorRoomIdsByIndex.push(sectorRoomIds);

      for (let r = 0; r < roomsInSector; r++) {
        const roomId = `room-${sectorIndex + 1}-${r + 1}`;
        sectorRoomIds.push(roomId);

        // Determine role
        let role: DungeonRoomRole = "encounter";
        if (sectorIndex === 0 && r === 0) {
          role = "entrance";
          entranceRoomIds.push(roomId);
        } else if (
          r === roomsInSector - 1 &&
          sectorIndex === rawSectors.length - 1
        ) {
          role = "climax";
        } else if (
          r === roomsInSector - 2 &&
          sectorIndex === rawSectors.length - 1
        ) {
          role = "treasure";
        } else if (r % 3 === 1) {
          role = "hazard";
        } else if (r % 4 === 2) {
          role = "secret";
        } else if (r % 2 === 1) {
          role = "faction";
        }

        const roomStocking: DelveRoomStocking = {
          encounters:
            role === "encounter" || role === "faction"
              ? [input.factions?.[0] || "Guard Sentry"]
              : undefined,
          hazards:
            role === "hazard"
              ? [input.hazards?.[0] || "Collapsing Ceiling"]
              : undefined,
          treasure: role === "treasure" ? ["Ancient Chest"] : undefined,
          secrets: role === "secret" ? ["Concealed Niche"] : undefined,
          atmosphere: sec.theme || "Chilly stone air",
        };
        if (role === "climax") {
          // All categories are candidates here. Location-aware AI decides
          // which subset expresses this delve's actual culmination.
          roomStocking.encounters = [];
          roomStocking.hazards = [];
          roomStocking.treasure = [];
          roomStocking.secrets = [];
        }

        const roomData: DelveRoomNodeData = {
          id: roomId,
          sectorId: sectorId,
          sectorName: sec.name,
          name: `${sec.name} - Area ${r + 1}`,
          role,
          summary: `Area ${r + 1} within ${sec.name}`,
          description: `A ${sec.theme || "dark"} chamber in ${sec.name}.`,
          stocking: roomStocking,
        };

        roomNodes.push({
          id: roomId,
          type: "delveRoom",
          parentId: sectorId,
          extent: "parent",
          position: { x: 0, y: 0 }, // Position calculated later by DelveFlowLayout
          data: roomData,
        });
      }

      // Build a connected branching tree rather than a single room chain.
      // The first three Areas always fork at the sector entrance; later Areas
      // attach to one of the two most recent non-root rooms, producing varied
      // depth without collapsing into either a chain or a giant hub.
      for (let r = 1; r < sectorRoomIds.length; r++) {
        const earliestParent = Math.max(1, r - 2);
        const parentIndex =
          r <= 2
            ? 0
            : earliestParent +
              Math.floor(this.randomValue() * (r - earliestParent));
        const source = sectorRoomIds[parentIndex];
        const target = sectorRoomIds[r];
        let type: PassageType = "standard";
        let condition: string | undefined = undefined;

        if (r === 2 && sectorIndex === 0) {
          type = "conditional";
          condition = "Locked: Requires Iron Key";
        }

        edges.push({
          id: `edge-${source}-${target}`,
          source,
          target,
          type: "delveEdge",
          data: {
            id: `edge-${source}-${target}`,
            sourceRoomId: source,
            targetRoomId: target,
            type,
            bidirectional: true,
            condition,
          },
        });
      }

      // Every sector with at least three Areas gains an alternate route. This
      // makes loops structural rather than an accident of room distribution.
      if (sectorRoomIds.length >= 3) {
        const source = sectorRoomIds[1];
        const target = sectorRoomIds[2];
        edges.push({
          id: `edge-secret-${source}-${target}`,
          source,
          target,
          type: "delveEdge",
          data: {
            id: `edge-secret-${source}-${target}`,
            sourceRoomId: source,
            targetRoomId: target,
            type: "hidden",
            bidirectional: true,
            description: "Concealed revolving wall",
          },
        });
      }

      // Larger sectors may gain a second, conditional cross-connection.
      if (sectorRoomIds.length >= 5 && this.randomValue() < 0.5) {
        const source = sectorRoomIds[2];
        const target = sectorRoomIds[sectorRoomIds.length - 2];
        const alreadyConnected = edges.some(
          (edge) =>
            (edge.source === source && edge.target === target) ||
            (edge.source === target && edge.target === source),
        );
        if (source !== target && !alreadyConnected) {
          edges.push({
            id: `edge-conditional-${source}-${target}`,
            source,
            target,
            type: "delveEdge",
            data: {
              id: `edge-conditional-${source}-${target}`,
              sourceRoomId: source,
              targetRoomId: target,
              type: "conditional",
              bidirectional: true,
              condition: "Accessible only after the sector's ward is disabled",
            },
          });
        }
      }

      // Inter-sector transition edge
      if (sectorIndex > 0) {
        const prevSectorRooms = roomNodes.filter(
          (n) =>
            (n.data as DelveRoomNodeData).sectorId ===
            rawSectors[sectorIndex - 1].id,
        );
        if (prevSectorRooms.length > 0) {
          const source = prevSectorRooms[prevSectorRooms.length - 1].id;
          const target = sectorRoomIds[0];
          edges.push({
            id: `edge-vertical-${source}-${target}`,
            source,
            target,
            type: "delveEdge",
            data: {
              id: `edge-vertical-${source}-${target}`,
              sourceRoomId: source,
              targetRoomId: target,
              type: sectorIndex % 2 === 1 ? "vertical" : "standard",
              bidirectional: true,
              description:
                sectorIndex % 2 === 1
                  ? "Spiral stone stairs leading down"
                  : "Heavy reinforced doorway",
            },
          });
        }
      }
    });

    // Three-or-more-sector delves also receive a route that bypasses the
    // middle depth, creating a meaningful high-level exploration choice.
    if (sectorRoomIdsByIndex.length >= 3) {
      const firstSectorRooms = sectorRoomIdsByIndex[0];
      const finalSectorRooms =
        sectorRoomIdsByIndex[sectorRoomIdsByIndex.length - 1];
      const source = firstSectorRooms[Math.min(1, firstSectorRooms.length - 1)];
      const target = finalSectorRooms[0];
      edges.push({
        id: `edge-bypass-${source}-${target}`,
        source,
        target,
        type: "delveEdge",
        data: {
          id: `edge-bypass-${source}-${target}`,
          sourceRoomId: source,
          targetRoomId: target,
          type: "hidden",
          bidirectional: true,
          description: "A forgotten route bypassing the middle depth",
        },
      });
    }

    const now = Date.now();

    return {
      id: `delve-canvas-${input.conceptId}`,
      conceptId: input.conceptId,
      title: input.title,
      nodes: [...sectorNodes, ...roomNodes],
      edges,
      metadata: {
        size,
        entranceRoomIds,
        createdAt: now,
        updatedAt: now,
      },
    };
  }

  private distributeRooms(
    size: keyof typeof roomCountRanges,
    sectorCount: number,
  ): number[] {
    if (sectorCount <= 0) return [];

    const range = roomCountRanges[size];
    const totalRooms = this.randomInteger(range.minimum, range.maximum);
    const minimumPerSector = totalRooms >= sectorCount * 2 ? 2 : 1;
    const counts = Array.from({ length: sectorCount }, () => minimumPerSector);
    let remaining =
      Math.max(totalRooms, sectorCount * minimumPerSector) -
      sectorCount * minimumPerSector;
    const maxPerSector = Math.max(6, Math.ceil(totalRooms / sectorCount) + 2);

    while (remaining > 0) {
      const eligible = counts
        .map((count, index) => ({ count, index }))
        .filter(({ count }) => count < maxPerSector);
      const candidates =
        eligible.length > 0
          ? eligible.map(({ index }) => index)
          : counts.map((_, index) => index);
      const selected =
        candidates[Math.floor(this.randomValue() * candidates.length)];
      counts[selected] += 1;
      remaining -= 1;
    }

    return counts;
  }

  private randomInteger(minimum: number, maximum: number): number {
    return minimum + Math.floor(this.randomValue() * (maximum - minimum + 1));
  }

  private randomValue(): number {
    const value = this.random();
    if (!Number.isFinite(value)) return 0;
    return Math.min(Math.max(value, 0), 0.999999999);
  }
}
