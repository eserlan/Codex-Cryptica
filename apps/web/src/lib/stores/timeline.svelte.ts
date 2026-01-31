import { vault } from "./vault.svelte";
import { graph } from "./graph.svelte";
import type { Era, TemporalMetadata } from "schema";

export interface TimelineEntry {
  entityId: string;
  title: string;
  type: string;
  date: TemporalMetadata;
  eraId?: string;
}

class TimelineStore {
  includeUndated = $state(false);

  entries = $derived.by(() => {
    const list: TimelineEntry[] = [];
    for (const entity of Object.values(vault.entities)) {
      if (entity.date) {
        list.push({
          entityId: entity.id,
          title: entity.title,
          type: entity.type,
          date: entity.date,
          eraId: this.getEraForYear(entity.date.year)?.id
        });
      } else if (this.includeUndated) {
        list.push({
          entityId: entity.id,
          title: entity.title,
          type: entity.type,
          date: { year: 99999, label: "Undated" }
        });
      }
      
      if (entity.start_date) {
        list.push({
          entityId: entity.id,
          title: `${entity.title} (Start)`,
          type: entity.type,
          date: entity.start_date,
          eraId: this.getEraForYear(entity.start_date.year)?.id
        });
      }
      if (entity.end_date) {
        list.push({
          entityId: entity.id,
          title: `${entity.title} (End)`,
          type: entity.type,
          date: entity.end_date,
          eraId: this.getEraForYear(entity.end_date.year)?.id
        });
      }
    }

    return list.sort((a, b) => {
      if (a.date.year !== b.date.year) return a.date.year - b.date.year;
      if ((a.date.month ?? 1) !== (b.date.month ?? 1)) return (a.date.month ?? 1) - (b.date.month ?? 1);
      if ((a.date.day ?? 1) !== (b.date.day ?? 1)) return (a.date.day ?? 1) - (b.date.day ?? 1);
      return a.title.localeCompare(b.title);
    });
  });

  viewMode = $state<'vertical' | 'horizontal'>('vertical');
  
  // Filtering
  filterType = $state<string | null>(null);
  filterYearStart = $state<number | null>(null);
  filterYearEnd = $state<number | null>(null);

  filteredEntries = $derived.by(() => {
    return this.entries.filter(entry => {
      if (this.filterType && entry.type !== this.filterType) return false;
      if (this.filterYearStart !== null && entry.date.year < this.filterYearStart) return false;
      if (this.filterYearEnd !== null && entry.date.year > this.filterYearEnd) return false;
      return true;
    });
  });
  
  isLoading = $derived(vault.status === 'loading');

  async init() {
    // Eras are now handled by graph store
  }

  private getEraForYear(year: number): Era | undefined {
    return graph.eras.find(era => {
      const starts = year >= era.start_year;
      const ends = era.end_year === undefined || year <= era.end_year;
      return starts && ends;
    });
  }

  toggleViewMode() {
    this.viewMode = this.viewMode === 'vertical' ? 'horizontal' : 'vertical';
  }

  getEntriesByEra(eraId: string): TimelineEntry[] {
    return this.entries.filter(e => e.eraId === eraId);
  }

  getEntriesByType(type: string): TimelineEntry[] {
    return this.entries.filter(e => e.type === type);
  }

  getEntriesInRange(start: number, end: number): TimelineEntry[] {
    return this.entries.filter(e => e.date.year >= start && e.date.year <= end);
  }
}

export const timelineStore = new TimelineStore();
