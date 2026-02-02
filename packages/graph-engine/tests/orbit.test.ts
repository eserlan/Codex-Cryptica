import { describe, it, expect, beforeEach } from 'vitest';
import cytoscape from 'cytoscape';
import { calculateBFSDistances, setCentralNode } from '../src/layouts/orbit';

describe('Orbit Layout Logic', () => {
    let cy: cytoscape.Core;

    beforeEach(() => {
        cy = cytoscape({ headless: true });
        
        // Create a simple star graph
        // Center: A
        // Neighbors: B, C, D
        // Second level: E (connected to B)
        // Disconnected: F
        cy.add([
            { group: 'nodes', data: { id: 'A' } },
            { group: 'nodes', data: { id: 'B' } },
            { group: 'nodes', data: { id: 'C' } },
            { group: 'nodes', data: { id: 'D' } },
            { group: 'nodes', data: { id: 'E' } },
            { group: 'nodes', data: { id: 'F' } },
            { group: 'edges', data: { source: 'A', target: 'B' } },
            { group: 'edges', data: { source: 'A', target: 'C' } },
            { group: 'edges', data: { source: 'A', target: 'D' } },
            { group: 'edges', data: { source: 'B', target: 'E' } },
        ]);
    });

    it('should calculate correct BFS distances', () => {
        const distances = calculateBFSDistances(cy, 'A');
        
        expect(distances.get('A')).toBe(0);
        expect(distances.get('B')).toBe(1);
        expect(distances.get('C')).toBe(1);
        expect(distances.get('D')).toBe(1);
        expect(distances.get('E')).toBe(2);
        // F is disconnected, should not be in map or should be handled
        expect(distances.has('F')).toBe(false);
    });

    it('should set central node and run concentric layout without error', () => {
        // We can't easily test visual positions in headless mode without mocking layout specifics,
        // but we can ensure the function runs and doesn't throw.
        expect(() => setCentralNode(cy, 'A', { animate: false })).not.toThrow();
    });
    
    it('should handle disconnected nodes gracefully', () => {
        // Run layout
        setCentralNode(cy, 'A', { animate: false });
        
        // In a real browser we would check positions. 
        // Here we just verify the graph structure remains intact.
        expect(cy.nodes().length).toBe(6);
    });
});