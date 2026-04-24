import type { SearchResult } from "schema";
import { isEntityVisible } from "schema";
import { searchService as defaultSearchService } from "$lib/services/search";
import { debugStore } from "./debug.svelte";
import { vault as defaultVault } from "./vault.svelte";
import { ui as defaultUi } from "./ui.svelte";

export class SearchStore {
  query = $state("");
  results = $state<SearchResult[]>([]);
  isOpen = $state(false);
  selectedIndex = $state(0);
  isLoading = $state(false);
  recents = $state<SearchResult[]>([]);

  // Dependencies
  private vault: typeof defaultVault;
  private ui: typeof defaultUi;
  private searchService: typeof defaultSearchService;

  constructor(
    vault: typeof defaultVault = defaultVault,
    ui: typeof defaultUi = defaultUi,
    searchService: typeof defaultSearchService = defaultSearchService,
  ) {
    this.vault = vault;
    this.ui = ui;
    this.searchService = searchService;
    this.recents = this.loadRecents();
    if (typeof window !== "undefined") {
      window.addEventListener("vault-switched", () => this.reset());
    }
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

  private getStorageKey(): string {
    return `search_recents_${this.vault.activeVaultId || "default"}`;
  }

  private loadRecents(): SearchResult[] {
    if (typeof localStorage === "undefined") return [];
    try {
      const key = this.getStorageKey();
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as SearchResult[];
      if (!Array.isArray(parsed)) return [];

      // ⚡ Bolt Optimization: Replace chained .map().filter() with a single imperative loop.
      const normalized: SearchResult[] = [];
      const len = parsed.length;
      for (let i = 0; i < len; i++) {
        const entry = this.normalizeRecent(parsed[i]);
        if (entry && entry.path) {
          normalized.push(entry);
        }
      }
      return normalized;
    } catch (error) {
      console.warn("SearchStore: Failed to parse recent searches.", error);
      return [];
    }
  }

  reset() {
    this.query = "";
    this.results = [];
    this.selectedIndex = 0;
    this.isLoading = false;
    this.isOpen = false;
    this.recents = this.loadRecents();
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

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
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

      debugStore.log(`[SearchStore] Searching for: "${query}"`);
      const results = await this.searchService.search(query, {
        limit: 20,
        includeDrafts: true,
      });
      debugStore.log(`[SearchStore] Found ${results.length} raw results.`);

      // Filter results based on visibility settings
      const settings = {
        sharedMode: this.ui.sharedMode,
        defaultVisibility: this.vault.defaultVisibility,
      };

      // ⚡ Bolt Optimization: Replace .filter() with an imperative loop
      const filteredResults: SearchResult[] = [];
      const len = results.length;
      for (let i = 0; i < len; i++) {
        const result = results[i];
        const entity = this.vault.entities[result.id];
        if (!entity) {
          debugStore.warn(
            `[SearchStore] Result entity not found in vault: ${result.id}`,
          );
          continue;
        }
        if (isEntityVisible(entity, settings)) {
          filteredResults.push(result);
        }
      }

      debugStore.log(
        `[SearchStore] ${filteredResults.length} results visible.`,
      );
      this.results = filteredResults;
    } catch (error) {
      debugStore.error("[SearchStore] Search failed", error);
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
      // ⚡ Bolt Optimization: Replace spread with .filter() and .slice() with a single imperative loop
      const nextRecents: SearchResult[] = [normalized];
      const len = this.recents.length;
      for (let i = 0; i < len; i++) {
        const r = this.recents[i];
        if (r.id !== normalized.id) {
          nextRecents.push(r);
          if (nextRecents.length === 5) break;
        }
      }
      this.recents = nextRecents;

      if (typeof localStorage !== "undefined") {
        localStorage.setItem(
          this.getStorageKey(),
          JSON.stringify(this.recents),
        );
      }
      return selected;
    }
    return null;
  }
}

const SEARCH_KEY = "__codex_search_instance__";
export const searchStore: SearchStore =
  (globalThis as any)[SEARCH_KEY] ??
  ((globalThis as any)[SEARCH_KEY] = new SearchStore());
