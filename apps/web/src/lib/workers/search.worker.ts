/// <reference lib="webworker" />

import FlexSearch from 'flexsearch';
import type { SearchEntry, SearchResult, SearchOptions } from 'schema';

import { extractIdAndDoc } from '../utils/search-utils';



let index: any = null;

const initIndex = () => {
  console.log("!!! [Worker v1.2.0 - KEYWORDS] LOADED !!!");
  const config: any = {
    id: 'id',
    index: [
      {
        field: 'title',
        tokenize: 'forward',
        optimize: true,
        resolution: 9
      },
      {
        field: 'keywords',
        tokenize: 'full',
        optimize: true,
        resolution: 9
      },
      {
        field: 'content',
        tokenize: 'forward',
        optimize: true,
        resolution: 9,
        minlength: 2,
        context: {
          depth: 3,
          resolution: 9
        }
      }
    ],
    store: ['id', 'title', 'path', 'content']
  };

  index = new FlexSearch.Document(config);
};

const addDocument = (doc: SearchEntry) => {
  if (!index) initIndex();
  index?.add(doc);
};

const removeDocument = (id: string) => {
  if (!index) return;
  index.remove(id);
};

const search = async (query: string, options: SearchOptions = {}): Promise<SearchResult[]> => {
  if (!index) return [];

  const limit = options.limit || 20;
  const results = await index.searchAsync(query, {
    limit,
    enrich: true,
    suggest: true
  });


  const resultsMap = new Map<string, SearchResult>();

  // Process results from all fields
  for (const fieldResult of results) {
    const field = fieldResult.field as 'title' | 'content' | 'keywords';
    const isTitle = field === 'title';
    const isKeywords = field === 'keywords';
    // Title: 1.0, Keywords: 0.8, Content: 0.5
    const baseScore = isTitle ? 1.0 : (isKeywords ? 0.8 : 0.5);

    for (let i = 0; i < fieldResult.result.length; i++) {
      const item = fieldResult.result[i];
      const { id, doc: entry } = extractIdAndDoc(item);

      if (!id) {
        console.warn(`[Worker] Skipping result with missing ID:`, { field, index: i, itemKeys: Object.keys(item) });
        continue;
      }

      // Calculate a score that combines the field weight with the original rank
      // Higher rank (lower index) = better match.
      // We add a tiny fraction based on index to preserve relative order within the same field type.
      // 1.0 - (index * 0.0001)
      const rankAdjustment = i * 0.0001;
      const currentScore = baseScore - rankAdjustment;

      const existing = resultsMap.get(id);

      if (!existing || currentScore > existing.score) {
        resultsMap.set(id, {
          id,
          title: entry?.title || id,
          path: entry?.path || '',
          matchType: field === 'keywords' ? 'content' : field, // UI doesn't have 'keywords' type yet
          score: currentScore,
          // Only generate excerpt if it's a content match or we don't have one yet
          excerpt: field === 'content' ? getExcerpt(entry?.content || '', query) : existing?.excerpt
        });
      }
    }
  }

  // Convert map to array and sort by score
  const processedResults = Array.from(resultsMap.values()).sort((a, b) => b.score - a.score);

  return processedResults;
};

const getExcerpt = (content: string, query: string): string => {
  const lowerContent = content.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerContent.indexOf(lowerQuery);

  if (index === -1) return content.slice(0, 100);

  const start = Math.max(0, index - 40);
  const end = Math.min(content.length, index + query.length + 40);
  return (start > 0 ? '...' : '') + content.slice(start, end) + (end < content.length ? '...' : '');
};

const clearIndex = () => {
  index = null;
  initIndex();
};

self.onmessage = async (e: MessageEvent) => {
  const { type, payload, id } = e.data;

  try {
    let result;
    switch (type) {
      case 'INIT':
        initIndex();
        result = true;
        break;
      case 'INDEX':
        addDocument(payload);
        result = true;
        break;
      case 'REMOVE':
        removeDocument(payload);
        result = true;
        break;
      case 'SEARCH':
        result = await search(payload.query, payload.options);
        break;
      case 'CLEAR':
        clearIndex();
        result = true;
        break;
      default:
        console.warn('Unknown message type:', type);
        return;
    }

    self.postMessage({ type, id, result });

  } catch (error) {
    console.error('Worker error:', error);
    self.postMessage({ type, id, error: (error as Error).message });
  }
};
