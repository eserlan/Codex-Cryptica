export interface SearchEntry {
  id: string;
  title: string;
  aliases?: string;
  content: string;
  type?: string; // Entity category ID
  keywords?: string;
  path: string;
  updatedAt: number;
  status?: "active" | "draft";
}

export interface SearchResult {
  id: string;
  title: string;
  type?: string; // Entity category ID
  imageUrl?: string; // Local OPFS path or temporary blob URL
  path: string;
  excerpt?: string;
  score: number;
  matchType: "title" | "aliases" | "content";
  highlights?: Array<{ start: number; length: number }>;
}

export interface SearchOptions {
  limit?: number;
  threshold?: number;
  includeDrafts?: boolean;
}
