import { describe, it, expect, vi } from "vitest";
import { recordTableRoll } from "./record-table-roll";

const source = { id: "src-1", name: "Tavern patrons", kind: "table" } as any;
const clock = { now: () => 5000 };

const outcome = (value: number | undefined, rollParts?: any[]) =>
  ({
    finalText: "a one-eyed smuggler",
    chain: [{ dieValue: value, rollParts }],
  }) as any;

describe("recordTableRoll", () => {
  it("records a table roll into the shared history as a table result", async () => {
    const history = { addResult: vi.fn(async (..._args: any[]) => {}) };
    await recordTableRoll(history as any, {
      source,
      outcome: outcome(14),
      dieSides: 20,
      dieLabel: "d20",
      clock,
    });
    expect(history.addResult).toHaveBeenCalledWith(
      {
        total: 14,
        parts: [{ type: "dice", sides: 20, rolls: [14], value: 14 }],
        formula: "d20",
        timestamp: 5000,
      },
      "table",
      {
        label: "Tavern patrons",
        source: {
          sourceId: "src-1",
          sourceName: "Tavern patrons",
          kind: "table",
          finalText: "a one-eyed smuggler",
          chain: [{ dieValue: 14, rollParts: undefined }],
        },
      },
    );
  });

  it("uses the chain's own parts when it has them", async () => {
    const history = { addResult: vi.fn(async (..._args: any[]) => {}) };
    const parts = [{ type: "modifier", value: 2 }];
    await recordTableRoll(history as any, {
      source,
      outcome: outcome(12, parts),
      dieSides: 20,
      dieLabel: "d20+2",
      clock,
    });
    expect(history.addResult.mock.calls[0][0].parts).toBe(parts);
  });

  it("records a total of 0 with no parts when there is no die value", async () => {
    const history = { addResult: vi.fn(async (..._args: any[]) => {}) };
    await recordTableRoll(history as any, {
      source,
      outcome: outcome(undefined),
      dieSides: 20,
      dieLabel: "d20",
      clock,
    });
    const roll = history.addResult.mock.calls[0][0];
    expect(roll.total).toBe(0);
    expect(roll.parts).toEqual([]);
  });

  it("propagates a history failure to the caller", async () => {
    const history = {
      addResult: vi.fn(async () => {
        throw new Error("db down");
      }),
    };
    await expect(
      recordTableRoll(history as any, {
        source,
        outcome: outcome(3),
        dieSides: 6,
        dieLabel: "d6",
        clock,
      }),
    ).rejects.toThrow("db down");
  });
});
