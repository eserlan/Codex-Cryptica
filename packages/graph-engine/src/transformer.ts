import type { Entity } from "schema";

export interface GraphNode {
  group: "nodes";
  data: {
    id: string;
    label: string;
    type: string;
    weight: number;
    image?: string;
    thumbnail?: string;
  };
  position?: { x: number; y: number };
}

export interface GraphEdge {
  group: "edges";
  data: {
    id: string;
    source: string;
    target: string;
    label?: string;
    connectionType: string;
    strength?: number;
  };
}

export type GraphElement = GraphNode | GraphEdge;

export class GraphTransformer {
  static entitiesToElements(entities: Entity[]): GraphElement[] {
    // Create a Set of valid entity IDs for O(1) lookups
    const validIds = new Set(entities.map((e) => e.id));

    return entities.flatMap((entity) => {
      const elements: GraphElement[] = [];

      // Create Node
      const nodeData: GraphNode["data"] = {
        id: entity.id,
        label: entity.title,
        type: entity.type,
        weight: entity.connections?.length || 0,
      };
      if (entity.image) nodeData.image = entity.image;
      if (entity.thumbnail) nodeData.thumbnail = entity.thumbnail;

      elements.push({
        group: "nodes",
        data: nodeData,
        position: entity.metadata?.coordinates,
      });

      // Create Edges
      for (const conn of entity.connections || []) {
        // Skip edges to non-existent targets
        if (!validIds.has(conn.target)) continue;

        // Construct a unique edge ID: source-target-type
        const edgeId = `${entity.id}-${conn.target}-${conn.type}`;

        elements.push({
          group: "edges",
          data: {
            id: edgeId,
            source: entity.id,
            target: conn.target,
            label: conn.label || conn.type,
            connectionType: conn.type,
            strength: conn.strength,
          },
        });
      }

      return elements;
    });
  }
}
