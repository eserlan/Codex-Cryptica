import { writable } from 'svelte/store';

// Migrating from Zustand to Svelte stores for simplicity in the Svelte app
export const nodes = writable([]);

export const addNode = (node: any) => {
    nodes.update(n => [...n, node]);
};
