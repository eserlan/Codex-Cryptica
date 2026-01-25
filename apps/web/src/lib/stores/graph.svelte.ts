import { vault } from './vault.svelte';
import { GraphTransformer } from 'graph-engine';

class GraphStore {
    // Svelte 5 derived state
    elements = $derived(GraphTransformer.entitiesToElements(vault.allEntities));

    stats = $derived({
        nodeCount: this.elements.filter(e => e.group === 'nodes').length,
        edgeCount: this.elements.filter(e => e.group === 'edges').length
    });
}

export const graph = new GraphStore();
