export interface SearchEntry {
  id: string;
  title: string;
  content: string;
  keywords?: string;
  path: string;
  updatedAt: number;
}

export interface SearchResult {
  id: string;
  title: string;
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
