import { writable } from "svelte/store";
import type { SearchResult } from "schema";
import { isEntityVisible } from "schema";
import { searchService } from "$lib/services/search";
import { vault } from "./vault.svelte";
import { ui } from "./ui.svelte";

function createSearchStore() {
  const normalizeRecent = (entry: SearchResult): SearchResult | null => {
    if (entry.id !== undefined && entry.id !== null && entry.id !== "")
      return entry;
    if (!entry.path) return null;
    const pathSegments = entry.path.split("/");
    const basename = pathSegments[pathSegments.length - 1] || entry.path;
    const derivedId = basename.replace(/\.md$/, "");
    if (!derivedId) return null;
    return { ...entry, id: derivedId };
  };

  const loadRecents = (): SearchResult[] => {
    if (typeof localStorage === "undefined") return [];
    try {
      const raw = localStorage.getItem("search_recents");
      if (!raw) return [];
      const parsed = JSON.parse(raw) as SearchResult[];
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((entry) => normalizeRecent(entry))
        .filter((entry): entry is SearchResult => Boolean(entry && entry.path));
    } catch (error) {
      console.warn("SearchStore: Failed to parse recent searches.", error);
      return [];
    }
  };

  const recents = loadRecents();

  const { subscribe, update } = writable<{
    query: string;
    results: SearchResult[];
    isOpen: boolean;
    selectedIndex: number;
    isLoading: boolean;
    recents: SearchResult[];
  }>({
    query: "",
    results: [],
    isOpen: false,
    selectedIndex: 0,
    isLoading: false,
    recents,
  });

  return {
    subscribe,
    open: () =>
      update((s) => {
        // Refresh recents on open to ensure we catch changes from other tabs/sessions
        const currentRecents = loadRecents();
        // When opening with empty query, show recents
        return {
          ...s,
          isOpen: true,
          query: "",
          recents: currentRecents,
          results: currentRecents.length > 0 ? currentRecents : [], // Show recents initially
          selectedIndex: 0,
        };
      }),
    close: () => update((s) => ({ ...s, isOpen: false })),
    setQuery: async (query: string) => {
      update((s) => ({ ...s, query, isLoading: true, selectedIndex: 0 }));

      try {
        if (!query.trim()) {
          update((s) => ({ ...s, results: s.recents, isLoading: false }));
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

        update((s) => ({ ...s, results: filteredResults, isLoading: false }));
      } catch (error) {
        console.error("Search failed:", error);
        update((s) => ({ ...s, results: [], isLoading: false }));
      }
    },
    setSelectedIndex: (index: number) =>
      update((s) => {
        if (s.results.length === 0) return s;
        let newIndex = index;
        if (newIndex < 0) newIndex = s.results.length - 1;
        if (newIndex >= s.results.length) newIndex = 0;
        return { ...s, selectedIndex: newIndex };
      }),
    selectCurrent: () => {
      let selected: SearchResult | null = null;
      update((s) => {
        if (s.results.length > 0 && s.results[s.selectedIndex]) {
          selected = s.results[s.selectedIndex];
          const normalized = normalizeRecent(selected);
          if (!normalized) {
            return s;
          }

          // Add to recents
          const newRecents = [
            normalized,
            ...s.recents.filter((r) => r.id !== normalized.id),
          ].slice(0, 5);
          if (typeof localStorage !== "undefined") {
            localStorage.setItem("search_recents", JSON.stringify(newRecents));
          }
          return { ...s, recents: newRecents };
        }
        return s;
      });
      return selected;
    },
    // Expose update for testing/extensions
    update,
  };
}

export const searchStore = createSearchStore();
