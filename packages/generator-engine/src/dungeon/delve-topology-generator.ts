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

export class DelveTopologyGenerator {
  public generateFromConcept(input: DelveConceptInput): DelveCanvasDocument {
    const size = input.size || "medium";
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

    // Target room count per sector
    const roomsPerSector = size === "small" ? 3 : size === "medium" ? 4 : 5;

    rawSectors.forEach((sec, sectorIndex) => {
      const sectorId = sec.id || `sector-${sectorIndex + 1}`;
      const sectorData: DungeonSectorFrameData = {
        id: sectorId,
        name: sec.name || `Sector ${sectorIndex + 1}`,
        theme: sec.theme || "Dungeon Chamber",
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

      for (let r = 0; r < roomsPerSector; r++) {
        const roomId = `room-${sectorIndex + 1}-${r + 1}`;
        sectorRoomIds.push(roomId);

        // Determine role
        let role: DungeonRoomRole = "encounter";
        if (sectorIndex === 0 && r === 0) {
          role = "entrance";
          entranceRoomIds.push(roomId);
        } else if (
          r === roomsPerSector - 1 &&
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

      // Connect rooms within this sector
      for (let r = 0; r < sectorRoomIds.length - 1; r++) {
        const source = sectorRoomIds[r];
        const target = sectorRoomIds[r + 1];
        let type: PassageType = "standard";
        let condition: string | undefined = undefined;

        if (r === 1 && sectorIndex === 0) {
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

      // Add a secret loop shortcut within sector if room count >= 4
      if (sectorRoomIds.length >= 4) {
        const source = sectorRoomIds[0];
        const target = sectorRoomIds[3];
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
}
