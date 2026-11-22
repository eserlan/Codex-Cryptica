import { describe, expect, it } from "vitest";
import { timeAdvanceSchema, worldTimeSchema } from "../src/world-time-schemas";

describe("world time schemas", () => {
  it("accepts bounded elapsed time and rejects unknown fields or negative time", () => {
    const time = {
      version: 1,
      elapsedMinutes: 0,
      events: [
        {
          id: "event-1",
          turnId: "turn-1",
          atMinute: 0,
          threadId: "thread-1",
          text: "A bell rings",
        },
      ],
    };
    expect(worldTimeSchema.parse(time)).toEqual(time);
    expect(
      worldTimeSchema.safeParse({ ...time, elapsedMinutes: -1 }).success,
    ).toBe(false);
    expect(worldTimeSchema.safeParse({ ...time, extra: true }).success).toBe(
      false,
    );
  });

  it("limits time advances and their developments", () => {
    const advance = {
      minutes: 43_200,
      cause: "Travel",
      developments: [{ threadId: "thread-1", text: "Rain" }],
    };
    expect(timeAdvanceSchema.parse(advance)).toEqual(advance);
    expect(
      timeAdvanceSchema.safeParse({ ...advance, minutes: 0 }).success,
    ).toBe(false);
    expect(
      timeAdvanceSchema.safeParse({
        ...advance,
        developments: Array(4).fill(advance.developments[0]),
      }).success,
    ).toBe(false);
  });
});
