
import { type NodeSingular, type Core, type ConcentricLayoutOptions, type LayoutOptions } from 'cytoscape';

/**
 * Calculates the Breadth-First Search (BFS) distance from a source node to all other nodes.
 * @param cy The Cytoscape core instance.
 * @param sourceNodeId The ID of the central node.
 * @returns A map where keys are node IDs and values are their distance from the source.
 */
export const calculateBFSDistances = (cy: Core, sourceNodeId: string): Map<string, number> => {
  const distances = new Map<string, number>();
  const sourceNode = cy.getElementById(sourceNodeId);

  if (sourceNode.empty()) {
    console.warn(`Source node ${sourceNodeId} not found.`);
    return distances;
  }

  // Initialize source distance
  distances.set(sourceNodeId, 0);

  cy.elements().bfs({
    roots: sourceNode,
    visit: (v, _e, _u, _i, depth) => {
        distances.set(v.id(), depth);
    },
    directed: false // Treat graph as undirected for layout purposes
  });

  return distances;
};

/**
 * Options for the Orbit Layout.
 */
export interface OrbitLayoutOptions {
    animationDuration?: number;
    animate?: boolean;
    padding?: number;
    minNodeSpacing?: number;
    fit?: boolean;
}

/**
 * Activates the Orbit Layout centered around a specific node.
 * 
 * Uses Cytoscape's 'concentric' layout.
 * 
 * @param cy The Cytoscape core instance.
 * @param centralNodeId The ID of the node to place at the center.
 * @param options Configuration options.
 */
export const setCentralNode = (cy: Core, centralNodeId: string, options: OrbitLayoutOptions = {}): void => {
    const distances = calculateBFSDistances(cy, centralNodeId);
    
    // Find max distance to handle disconnected components (islands)
    // Islands are not visited by bfs, so they won't be in the map.
    // We can assign them a distance > maxDistance.
    let maxDistance = 0;
    for (const d of distances.values()) {
        if (d > maxDistance) maxDistance = d;
    }

    const islandDistance = maxDistance + 1;

    const layoutOptions: ConcentricLayoutOptions = {
        name: 'concentric',
        fit: options.fit ?? true,
        padding: options.padding ?? 50,
        animate: options.animate ?? true,
        animationDuration: options.animationDuration ?? 500,
        animationEasing: 'ease-in-out-cubic',
        minNodeSpacing: options.minNodeSpacing ?? 50,
        avoidOverlap: true,
        nodeDimensionsIncludeLabels: true,
        concentric: (node: NodeSingular) => {
            const distance = distances.get(node.id());
            if (distance === undefined) {
                // Node is unreachable (island), place in outermost orbit
                return 0; // Lower value = further out
            }
            // Higher value = closer to center
            // We use (islandDistance - distance) so that distance 0 gives the highest value.
            return islandDistance - distance;
        },
        levelWidth: () => 1 // Each integer difference in 'concentric' value is a new level
    };

    cy.layout(layoutOptions).run();
};

/**
 * Clears the Orbit Layout.
 * 
 * Currently, this simply re-runs the default layout. 
 * In a real scenario, this might restore saved positions or run a specific 'default' layout.
 * 
 * @param cy The Cytoscape core instance.
 * @param defaultLayoutName The name of the layout to revert to (e.g. 'cose', 'grid').
 */
export const clearOrbit = (cy: Core, defaultLayoutName: string = 'cose'): void => {
    const layoutOptions: LayoutOptions = {
        name: defaultLayoutName as any,
        animate: true,
        animationDuration: 500,
        fit: true,
        padding: 50
    };
    cy.layout(layoutOptions).run();
};
