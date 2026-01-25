import { describe, it, expect } from 'vitest';
import { GraphTransformer } from './transformer';
import type { Entity } from 'schema';

describe('GraphTransformer', () => {
  it('should transform entities to nodes and edges', () => {
    const entities: Entity[] = [
      {
        id: 'n1',
        type: 'npc',
        title: 'Node 1',
        tags: [],
        connections: [
          { target: 'n2', type: 'knows', strength: 0.5 }
        ],
        content: ''
      },
      {
        id: 'n2',
        type: 'location',
        title: 'Node 2',
        tags: [],
        connections: [],
        content: ''
      }
    ];

    const elements = GraphTransformer.entitiesToElements(entities);

    expect(elements).toHaveLength(3); // 2 nodes + 1 edge

    const node1 = elements.find(e => e.group === 'nodes' && e.data.id === 'n1');
    expect(node1).toBeDefined();
    expect(node1?.data.label).toBe('Node 1');

    const edge = elements.find(e => e.group === 'edges' && e.data.source === 'n1');
    expect(edge).toBeDefined();
    expect(edge?.data.target).toBe('n2');
    expect(edge?.data.strength).toBe(0.5);
  });

  it("should handle entities with missing connections", () => {
    const entities: any[] = [
      {
        id: "n1",
        type: "npc",
        title: "Node 1",
        content: "",
      },
    ];

    const elements = GraphTransformer.entitiesToElements(entities);
    expect(elements).toHaveLength(1);
    expect(elements[0].group).toBe("nodes");
  });

  it("should handle entities with missing metadata", () => {
    const entities: any[] = [
      {
        id: "n1",
        type: "npc",
        title: "Node 1",
        connections: [],
        content: "",
      },
    ];

    const elements = GraphTransformer.entitiesToElements(entities);
    expect(elements).toHaveLength(1);
    expect((elements[0] as any).position).toBeUndefined();
  });

  it("should transform image field", () => {
    const entities: Entity[] = [
      {
        id: "n1",
        type: "npc",
        title: "Node 1",
        tags: [],
        connections: [],
        content: "",
        image: "http://example.com/img.png"
      },
    ];

    const elements = GraphTransformer.entitiesToElements(entities);
    const node = elements.find(e => e.group === 'nodes' && e.data.id === 'n1');
    expect(node?.data.image).toBe("http://example.com/img.png");
  });
});
