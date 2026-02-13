import type { SearchResult } from "schema";
import { isEntityVisible } from "schema";
import { searchService } from "$lib/services/search";
import { vault } from "./vault.svelte";
import { ui } from "./ui.svelte";

class SearchStore {
  query = $state("");
  // Use $state.raw for results since they are potentially large and don't need deep reactivity
  results = $state.raw<SearchResult[]>([]);
  isOpen = $state(false);
  selectedIndex = $state(0);
  isLoading = $state(false);
  recents = $state<SearchResult[]>([]);

  constructor() {
    this.recents = this.loadRecents();
  }

  private normalizeRecent(entry: SearchResult): SearchResult | null {
    if (entry.id !== undefined && entry.id !== null && entry.id !== "")
      return entry;
    if (!entry.path) return null;
    const pathSegments = entry.path.split("/");
    const basename = pathSegments[pathSegments.length - 1] || entry.path;
    const derivedId = basename.replace(/\.md$/, "");
    if (!derivedId) return null;
    return { ...entry, id: derivedId };
  }

  private loadRecents(): SearchResult[] {
    if (typeof localStorage === "undefined") return [];
    try {
      const raw = localStorage.getItem("search_recents");
      if (!raw) return [];
      const parsed = JSON.parse(raw) as SearchResult[];
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((entry) => this.normalizeRecent(entry))
        .filter((entry): entry is SearchResult => Boolean(entry && entry.path));
    } catch (error) {
      console.warn("SearchStore: Failed to parse recent searches.", error);
      return [];
    }
  }

  open() {
    this.recents = this.loadRecents();
    this.isOpen = true;
    this.query = "";
    this.results = this.recents.length > 0 ? this.recents : [];
    this.selectedIndex = 0;
  }

  close() {
    this.isOpen = false;
  }

  async setQuery(query: string) {
    this.query = query;
    this.isLoading = true;
    this.selectedIndex = 0;

    try {
      if (!query.trim()) {
        this.results = this.recents;
        this.isLoading = false;
        return;
      }

      const results = await searchService.search(query, { limit: 20 });

      // Filter results based on visibility settings
      const settings = {
        sharedMode: ui.sharedMode,
        defaultVisibility: vault.defaultVisibility,
      };

      const filteredResults = results.filter((result) => {
        const entity = vault.entities[result.id];
        if (!entity) return false;
        return isEntityVisible(entity, settings);
      });

      this.results = filteredResults;
    } catch (error) {
      console.error("Search failed:", error);
      this.results = [];
    } finally {
      this.isLoading = false;
    }
  }

  setSelectedIndex(index: number) {
    if (this.results.length === 0) return;
    let newIndex = index;
    if (newIndex < 0) newIndex = this.results.length - 1;
    if (newIndex >= this.results.length) newIndex = 0;
    this.selectedIndex = newIndex;
  }

  selectCurrent(): SearchResult | null {
    if (this.results.length > 0 && this.results[this.selectedIndex]) {
      const selected = this.results[this.selectedIndex];
      const normalized = this.normalizeRecent(selected);
      if (!normalized) {
        return null;
      }

      // Add to recents
      this.recents = [
        normalized,
        ...this.recents.filter((r) => r.id !== normalized.id),
      ].slice(0, 5);

      if (typeof localStorage !== "undefined") {
        localStorage.setItem("search_recents", JSON.stringify(this.recents));
      }
      return selected;
    }
    return null;
  }
}

export const searchStore = new SearchStore();
