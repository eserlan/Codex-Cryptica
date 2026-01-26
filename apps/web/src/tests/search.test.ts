// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { MockWorker } = vi.hoisted(() => {
  class MockWorker {
    onmessage: ((event: MessageEvent) => void) | null = null;
    
    constructor() {
      // confirm construction
    }

    postMessage(data: any) {
      setTimeout(() => {
        if (this.onmessage) {
          let result = undefined;
          const error = undefined;
          
          if (data.type === 'INIT') result = true;
          if (data.type === 'INDEX') result = true;
          if (data.type === 'SEARCH') result = [{ id: '1', title: 'Test', score: 1 }];
          
          this.onmessage({
            data: {
              type: data.type,
              id: data.id,
              result,
              error
            }
          } as MessageEvent);
        }
      }, 10);
    }
    
    terminate() {}
  }
  
  // Make it available globally so when SearchService calls `new SearchWorker()` 
  // (which is mapped to this) it works in the test env.
  if (typeof window !== 'undefined') {
    (window as any).Worker = MockWorker;
  }
  (global as any).Worker = MockWorker;

  return { MockWorker };
});

vi.mock('../lib/workers/search.worker?worker', () => {
  return {
    default: MockWorker
  };
});

// Import after mock
import { SearchService } from '$lib/services/search';

describe('SearchService', () => {
  let service: SearchService;

  beforeEach(() => {
    // Ensure window is defined (jsdom should handle this)
    if (typeof window === 'undefined') {
      throw new Error('Window is undefined in test');
    }
    service = new SearchService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize', async () => {
    await expect(service.init()).resolves.toBe(true);
  });

  it('should index an entry', async () => {
    const entry = {
      id: '1',
      title: 'Test Note',
      content: '# Content',
      path: '/test.md',
      updatedAt: Date.now()
    };
    await expect(service.index(entry)).resolves.toBe(true);
  });

  it('should perform a search', async () => {
    const results = await service.search('query');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('1');
  });
});
