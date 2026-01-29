export interface SearchEntry {
  id: string;
  title: string;
  content: string;
  type?: string; // Entity category ID
  keywords?: string;
  path: string;
  updatedAt: number;
}

export interface SearchResult {
  id: string;
  title: string;
  type?: string; // Entity category ID
  path: string;
  excerpt?: string;
  score: number;
  matchType: 'title' | 'content';
  highlights?: Array<{ start: number; length: number }>;
}

export interface SearchOptions {
  limit?: number;
  threshold?: number;
}