import type { IStorageAdapter, SerializedGraph } from "./types";

export class MemoryAdapter implements IStorageAdapter {
  private graph: SerializedGraph | null = null;

  async init(): Promise<void> {
    // No initialization needed for memory
    return Promise.resolve();
  }

  async loadGraph(): Promise<SerializedGraph | null> {
    return this.graph;
  }

  async saveGraph(graph: SerializedGraph): Promise<void> {
    // In Guest Mode, we might want to prevent saving, or allow ephemeral saving.
    // The interface says "Throws error in Read-Only mode".
    // But MemoryAdapter implies ephemeral state. 
    // If we use this for Guest Mode *viewing*, saving should be blocked at the Store level or here.
    // Let's assume MemoryAdapter allows writing to memory, but the Store enforces ReadOnly.
    // OR, we can make MemoryAdapter strictly ReadOnly if populated from a load.
    
    this.graph = graph;
  }

  isReadOnly(): boolean {
    // Memory adapter itself is writable (ephemeral), 
    // but its persistence is effectively read-only (nothing survives reload).
    // The Store will check `isGuest` which uses this adapter.
    return false; 
  }

  // Helper to hydrate the memory adapter from a fetch
  hydrate(graph: SerializedGraph) {
    this.graph = graph;
  }
}
