/**
 * Contract for the Client-Side Search Service.
 * This defines the interface between the UI (Svelte components) and the Search Worker/Service.
 */

export interface SearchEntry {
  id: string;
  title: string;
  content: string;
  path: string;
  updatedAt: number;
}

export interface SearchResult {
  id: string;
  title: string;
  path: string; // Added for navigation
  excerpt?: string;
  score: number;
  matchType: 'title' | 'content';
  // highlights could be complex to serialize, maybe handle on client or simple ranges
}

export interface SearchOptions {
  limit?: number;
  threshold?: number; // Fuzzy threshold
}

export interface SearchService {
  /**
   * Initialize the index.
   */
  init(): Promise<void>;

  /**
   * Add or update a note in the index.
   */
  index(entry: SearchEntry): Promise<void>;

  /**
   * Remove a note from the index.
   */
  remove(id: string): Promise<void>;

  /**
   * Perform a search query.
   */
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;

  /**
   * Clear the entire index.
   */
  clear(): Promise<void>;
}
