import { describe, it, expect, vi } from "vitest";

describe("search.worker", () => {
  it("should initialize and expose the search engine", async () => {
    // We mock @codex/search-engine before dynamically importing the worker
    const SearchEngineMock = vi.fn();
    const exposeSearchEngineMock = vi.fn();

    vi.doMock("@codex/search-engine", () => {
      return {
        SearchEngine: SearchEngineMock,
        exposeSearchEngine: exposeSearchEngineMock,
      };
    });

    // Import the worker to trigger its side effects (initialization)
    await import("../../lib/workers/search.worker");

    expect(SearchEngineMock).toHaveBeenCalled();
    expect(exposeSearchEngineMock).toHaveBeenCalledWith(expect.any(SearchEngineMock));
  });
});
