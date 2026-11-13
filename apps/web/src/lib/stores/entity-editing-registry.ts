/**
 * Entities open in an editor on this device. Cloud Backup holds a pulled change
 * back from any of them: the editors write every field on save, so a change
 * applied mid-edit would be overwritten.
 */
export class EntityEditingRegistry {
  private counts = new Map<string, number>();
  private listeners = new Set<() => void>();

  /** Marks an entity as being edited; the returned function releases it. */
  begin(id: string): () => void {
    this.counts.set(id, (this.counts.get(id) ?? 0) + 1);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      const left = (this.counts.get(id) ?? 1) - 1;
      if (left > 0) this.counts.set(id, left);
      else this.counts.delete(id);
      if (this.counts.size === 0) {
        for (const listener of [...this.listeners]) listener();
      }
    };
  }

  isEditing(id: string): boolean {
    return this.counts.has(id);
  }

  /** Calls back when the last open editor closes; returns the unsubscribe. */
  onAllReleased(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const entityEditingRegistry = new EntityEditingRegistry();
