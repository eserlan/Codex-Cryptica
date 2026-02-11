# Timeline Store Interface

```typescript
export interface TemporalMetadata {
  year: number;
  month?: number;
  day?: number;
  label?: string;
}

export interface TimelineEntry {
  entityId: string;
  title: string;
  type: string;
  date: TemporalMetadata;
  eraId?: string;
}

/**
 * Timeline Store Interface (apps/web/src/lib/stores/timeline.svelte.ts)
 */
export interface ITimelineStore {
  // State
  entries: TimelineEntry[]; // Sorted chronologically
  eras: Era[];
  isLoading: boolean;

  // Actions
  addEntry(entry: TimelineEntry): void;
  removeEntry(entityId: string): void;
  setEras(eras: Era[]): void;

  // Queries
  getEntriesByEra(eraId: string): TimelineEntry[];
  getEntriesByType(type: string): TimelineEntry[];
}
```
