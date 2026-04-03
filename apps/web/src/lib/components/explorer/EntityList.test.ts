/** @vitest-environment jsdom */
import { describe, it, expect } from "vitest";

describe("EntityList Filtering Logic Performance", () => {
  it("should calculate filtered list of 1,000 entities in under 50ms", async () => {
    // 1. Generate 1,000 mock entities
    const mockEntities = Array.from({ length: 1000 }, (_, i) => ({
      id: `entity-${i}`,
      title: `Entry ${i}`,
      type: i % 2 === 0 ? "npc" : "location",
      content: "Some content",
      labels: ["test"],
      connections: [],
      updatedAt: Date.now(),
    }));

    const typeFilters = ["all"];
    const searchQuery = "entry";

    const start = performance.now();

    // Simulating the logic in EntityList.svelte
    const filtered = [];
    const query = searchQuery.trim().toLowerCase();
    const filterAll = typeFilters.includes("all");

    for (let i = 0; i < mockEntities.length; i++) {
      const e = mockEntities[i];
      const matchesSearch =
        e.title.toLowerCase().includes(query) ||
        e.content.toLowerCase().includes(query);
      const matchesType = filterAll || typeFilters.includes(e.type);

      if (matchesSearch && matchesType) {
        filtered.push(e);
      }
    }
    filtered.sort((a, b) => a.title.localeCompare(b.title));

    const end = performance.now();
    const duration = end - start;

    // In node/vitest, 10ms is a safe bet for pure logic
    expect(duration).toBeLessThan(50);
  });
});
