import { describe, expect, it, vi } from "vitest";
import { publishBatch } from "./publish-batch";

describe("publishBatch", () => {
  it("publishes every item when each request succeeds", async () => {
    const publish = vi.fn(async (value: string) => `${value}-listing`);

    await expect(
      publishBatch(
        [
          { id: "one", value: "one" },
          { id: "two", value: "two" },
        ],
        publish,
      ),
    ).resolves.toEqual([
      { id: "one", status: "success", value: "one-listing" },
      { id: "two", status: "success", value: "two-listing" },
    ]);
  });

  it("continues after a failure so only failed items need retrying", async () => {
    const publish = vi.fn(async (value: string) => {
      if (value === "broken") throw new Error("Network unavailable");
      return `${value}-listing`;
    });

    const results = await publishBatch(
      [
        { id: "one", value: "one" },
        { id: "broken", value: "broken" },
        { id: "two", value: "two" },
      ],
      publish,
    );

    expect(results.map((result) => [result.id, result.status])).toEqual([
      ["one", "success"],
      ["broken", "failed"],
      ["two", "success"],
    ]);
  });

  it("does not start queued work after cancellation", async () => {
    const controller = new AbortController();
    const publish = vi.fn(async (value: string) => {
      controller.abort();
      return value;
    });

    const results = await publishBatch(
      [
        { id: "one", value: "one" },
        { id: "two", value: "two" },
      ],
      publish,
      { signal: controller.signal },
    );

    expect(publish).toHaveBeenCalledTimes(1);
    expect(results).toEqual([{ id: "one", status: "success", value: "one" }]);
  });
});
