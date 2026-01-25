import type { Entity } from 'schema';

export interface GraphNode {
  group: 'nodes';
  data: {
    id: string;
    label: string;
    type: string;
    weight: number;
    image?: string;
  };
  position?: { x: number; y: number };
}

export interface GraphEdge {
  group: 'edges';
  data: {
    id: string;
    source: string;
    target: string;
    label?: string;
    strength?: number;
  };
}

export type GraphElement = GraphNode | GraphEdge;

export class GraphTransformer {
  static entitiesToElements(entities: Entity[]): GraphElement[] {
    const elements: GraphElement[] = [];

    for (const entity of entities) {
      // Create Node
      elements.push({
        group: 'nodes',
        data: {
          id: entity.id,
          label: entity.title,
          type: entity.type,
          weight: entity.connections?.length || 0, // Basic weight based on connectivity
          image: entity.image
        },
        position: entity.metadata?.coordinates
      });

      // Create Edges
      for (const conn of (entity.connections || [])) {
        // Construct a unique edge ID: source-target-type
        const edgeId = `${entity.id}-${conn.target}-${conn.type}`;

        elements.push({
          group: 'edges',
          data: {
            id: edgeId,
            source: entity.id,
            target: conn.target,
            label: conn.type,
            strength: conn.strength
          }
        });
      }
    }

    return elements;
  }
}
