import { describe, expect, it } from "vitest";
import { runWithConcurrency, summarizeBulkMutation } from "./bulk-results";

describe("bulk mutation results", () => {
  it("normalizes missing IDs and groups outcomes", () => {
    const result = summarizeBulkMutation(
      ["a", "b", "c", "d"],
      [
        { id: "a", status: "success" },
        { id: "b", status: "failed" },
        { id: "d", status: "cancelled" },
      ],
    );

    expect(result.requested).toBe(4);
    expect(result.succeededIds).toEqual(["a"]);
    expect(result.failedIds).toEqual(["b"]);
    expect(result.skippedIds).toEqual(["c"]);
    expect(result.cancelledIds).toEqual(["d"]);
    expect(result.items).toHaveLength(4);
  });

  it("does not exceed the configured concurrency", async () => {
    let active = 0;
    let maximum = 0;
    const tasks = Array.from({ length: 100 }, (_, index) => async () => {
      active++;
      maximum = Math.max(maximum, active);
      await Promise.resolve();
      active--;
      return index;
    });

    const results = await runWithConcurrency(tasks, 3);

    expect(results).toHaveLength(100);
    expect(results).toEqual(Array.from({ length: 100 }, (_, index) => index));
    expect(maximum).toBeLessThanOrEqual(3);
  });
});
