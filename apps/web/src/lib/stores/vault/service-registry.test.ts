import { describe, expect, it, vi, beforeEach } from "vitest";
import { ServiceRegistry } from "./service-registry";

const mocks = vi.hoisted(() => {
  const searchService = {
    index: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
    search: vi.fn().mockResolvedValue([]),
  };

  const clearStyleCache = vi.fn();
  const expandQuery = vi.fn().mockResolvedValue("expanded-query");

  return { searchService, clearStyleCache, expandQuery };
});

vi.mock("../../services/search", () => ({
  searchService: mocks.searchService,
}));

vi.mock("../../services/ai", () => ({
  contextRetrievalService: {
    clearStyleCache: mocks.clearStyleCache,
  },
  textGenerationService: {
    expandQuery: mocks.expandQuery,
  },
}));

describe("ServiceRegistry", () => {
  let registry: ServiceRegistry;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = new ServiceRegistry();
  });

  it("lazy-loads and caches the search and AI services", async () => {
    expect(registry.services).toBeNull();

    const services = await registry.ensureInitialized();

    expect(services.search).toBe(mocks.searchService);
    expect(registry.services).toBe(services);

    await services.ai.expandQuery("key", "query", []);
    services.ai.clearStyleCache();

    expect(mocks.expandQuery).toHaveBeenCalledWith("key", "query", []);
    expect(mocks.clearStyleCache).toHaveBeenCalled();

    const second = await registry.ensureInitialized();
    expect(second).toBe(services);
  });

  it("clears cached services", async () => {
    const first = await registry.ensureInitialized();
    registry.clear();

    expect(registry.services).toBeNull();

    const second = await registry.ensureInitialized();
    expect(second).not.toBe(first);
  });
});
