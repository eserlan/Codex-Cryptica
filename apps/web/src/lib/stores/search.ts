import { writable } from 'svelte/store';
import type { SearchResult } from 'schema';
import { searchService } from '$lib/services/search';

function createSearchStore() {
  const { subscribe, update } = writable<{
    query: string;
    results: SearchResult[];
    isOpen: boolean;
    selectedIndex: number;
    isLoading: boolean;
    recents: SearchResult[];
  }>({
    query: '',
    results: [],
    isOpen: false,
    selectedIndex: 0,
    isLoading: false,
    recents: []
  });

  // Clear stale recents to prevent ID: undefined pollution
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('search_recents');
    console.log('SearchStore: Cleared stale recents from localStorage');
  }

  return {
    subscribe,
    open: () => update(s => {
      // When opening with empty query, show recents
      return {
        ...s,
        isOpen: true,
        query: '',
        results: s.recents.length > 0 ? s.recents : [], // Show recents initially
        selectedIndex: 0
      };
    }),
    close: () => update(s => ({ ...s, isOpen: false })),
    setQuery: async (query: string) => {
      update(s => ({ ...s, query, isLoading: true, selectedIndex: 0 }));

      try {
        if (!query.trim()) {
          update(s => ({ ...s, results: s.recents, isLoading: false }));
          return;
        }

        const results = await searchService.search(query, { limit: 20 });
        update(s => ({ ...s, results, isLoading: false }));
      } catch (error) {
        console.error('Search failed:', error);
        update(s => ({ ...s, results: [], isLoading: false }));
      }
    },
    setSelectedIndex: (index: number) => update(s => {
      if (s.results.length === 0) return s;
      let newIndex = index;
      if (newIndex < 0) newIndex = s.results.length - 1;
      if (newIndex >= s.results.length) newIndex = 0;
      return { ...s, selectedIndex: newIndex };
    }),
    selectCurrent: () => {
      let selected: SearchResult | null = null;
      update(s => {
        if (s.results.length > 0 && s.results[s.selectedIndex]) {
          selected = s.results[s.selectedIndex];

          // Add to recents
          const newRecents = [selected, ...s.recents.filter(r => r.id !== selected!.id)].slice(0, 5);
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('search_recents', JSON.stringify(newRecents));
          }
          return { ...s, recents: newRecents };
        }
        return s;
      });
      return selected;
    }
  };
}

export const searchStore = createSearchStore();