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
    // Although the in-memory store is technically writable, this adapter is used
    // for guest/ephemeral contexts where the system should be treated as read-only
    // from the caller's perspective. Report `true` here to avoid implying that
    // persistent writes are allowed.
    return true; 
  }

  // Helper to hydrate the memory adapter from a fetch
  hydrate(graph: SerializedGraph) {
    this.graph = graph;
  }
}
