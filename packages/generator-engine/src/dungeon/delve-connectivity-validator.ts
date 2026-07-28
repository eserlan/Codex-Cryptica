import type {
  DelveCanvasDocument,
  DelveRoomNodeData,
} from "./delve-builder-types";

export interface ConnectivityValidationResult {
  isValid: boolean;
  orphanedRoomIds: string[];
  missingEntrance: boolean;
}

export class DelveConnectivityValidator {
  public validateGraphConnectivity(
    doc: DelveCanvasDocument,
  ): ConnectivityValidationResult {
    const roomNodes = doc.nodes.filter((n) => n.type === "delveRoom");
    const roomIds = new Set(roomNodes.map((r) => r.id));

    const entranceRooms = roomNodes.filter(
      (n) => (n.data as DelveRoomNodeData).role === "entrance",
    );

    if (entranceRooms.length === 0) {
      return {
        isValid: false,
        orphanedRoomIds: Array.from(roomIds),
        missingEntrance: true,
      };
    }

    // Build adjacency list for BFS traversal
    const adjacency = new Map<string, Set<string>>();
    roomIds.forEach((id) => adjacency.set(id, new Set()));

    doc.edges.forEach((edge) => {
      const u = edge.source;
      const v = edge.target;
      if (roomIds.has(u) && roomIds.has(v)) {
        adjacency.get(u)?.add(v);
        if (edge.data?.bidirectional !== false) {
          adjacency.get(v)?.add(u);
        }
      }
    });

    // Traverse from all entrances using BFS
    const visited = new Set<string>();
    const queue: string[] = entranceRooms.map((r) => r.id);

    queue.forEach((id) => visited.add(id));

    while (queue.length > 0) {
      const current = queue.shift()!;
      const neighbors = adjacency.get(current) || new Set();

      neighbors.forEach((next) => {
        if (!visited.has(next)) {
          visited.add(next);
          queue.push(next);
        }
      });
    }

    const orphanedRoomIds = Array.from(roomIds).filter(
      (id) => !visited.has(id),
    );

    return {
      isValid: orphanedRoomIds.length === 0,
      orphanedRoomIds,
      missingEntrance: false,
    };
  }
}
