import { describe, it, expect } from "vitest";
import { RandomSourceEngine } from "../src/engine";
import { MAX_RESOLUTION_DEPTH, type RandomSource } from "../src/types";

/**
 * The roll budget (SC-003, R7): p95 under 50 ms in-process, on a table the size
 * of a d100 import scaled up tenfold, resolving all the way down to the depth
 * cap.
 *
 * A budget rather than a benchmark: it guards against an accidental quadratic
 * — re-parsing references per entry, say — not against normal variation.
 */
describe("roll performance", () => {
  const ENTRY_COUNT = 1000;
  const ROLLS = 200;
  const BUDGET_MS = 50;

  /** A chain `level-0` → `level-1` → … as deep as resolution is allowed to go. */
  function buildChain(): RandomSource[] {
    return Array.from({ length: MAX_RESOLUTION_DEPTH }, (_, level) => ({
      id: `t${level}`,
      name: `level-${level}`,
      kind: "table" as const,
      labels: [],
      selection: { mode: "weighted" as const },
      entries: Array.from({ length: ENTRY_COUNT }, (_, i) => ({
        id: `e${level}-${i}`,
        text:
          level === MAX_RESOLUTION_DEPTH - 1
            ? `leaf ${i}`
            : `entry ${i} with {level-${level + 1}}`,
        weight: 1,
      })),
    }));
  }

  it("stays inside the budget at full depth", () => {
    const sources = buildChain();
    const byName = new Map(sources.map((s) => [s.name, s]));
    const ctx = { lookup: (name: string) => byName.get(name) };
    const engine = new RandomSourceEngine();

    // Warm up, so the first roll's JIT cost is not measured as the budget.
    for (let i = 0; i < 10; i++) engine.roll(sources[0], ctx);

    const timings: number[] = [];
    for (let i = 0; i < ROLLS; i++) {
      const start = performance.now();
      engine.roll(sources[0], ctx);
      timings.push(performance.now() - start);
    }

    timings.sort((a, b) => a - b);
    const p95 = timings[Math.floor(timings.length * 0.95)];
    expect(p95).toBeLessThan(BUDGET_MS);
  });
});
