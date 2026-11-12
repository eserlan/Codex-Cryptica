import { describe, expect, it } from "bun:test";
import { applyRegionProposal, undoRegion } from "../../src";
import { NOW, run, stateWith } from "./fixtures";

describe("performance (SC-002)", () => {
  it("selects, generates, applies and undoes the largest request (469 hexes) well inside the budget", () => {
    const fixed = stateWith(
      Object.fromEntries(
        Array.from({ length: 400 }, (_, i) => [
          `${30 + (i % 20)},${Math.floor(i / 20)}`,
          "forest" as const,
        ]),
      ),
    );
    const start = performance.now();
    const proposal = run(fixed, "PERF-1", { radius: 12 });
    const applied = applyRegionProposal(fixed, proposal, {}, NOW);
    const undone = undoRegion(applied.state, applied.undo);
    const elapsed = performance.now() - start;
    expect(Object.keys(proposal.hexes)).toHaveLength(469);
    expect(undone).toEqual(fixed);
    expect(elapsed).toBeLessThan(50);
  });
});
