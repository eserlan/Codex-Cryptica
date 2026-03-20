import { describe, it, expect, vi } from "vitest";

// Mock the SearchEngine and exposeSearchEngine from @codex/search-engine
const mockSearchEngine = vi.fn();
const mockExposeSearchEngine = vi.fn();

vi.mock("@codex/search-engine", () => ({
  SearchEngine: mockSearchEngine,
  exposeSearchEngine: mockExposeSearchEngine,
}));

describe("search.worker.ts", () => {
  it("initializes SearchEngine and exposes it", async () => {
    // Import the worker to trigger its side effects
    await import("./search.worker");

    // Verify SearchEngine was instantiated
    expect(mockSearchEngine).toHaveBeenCalledTimes(1);

    // Verify exposeSearchEngine was called with the engine instance
    expect(mockExposeSearchEngine).toHaveBeenCalledWith(
      expect.any(mockSearchEngine)
    );
  });
});
