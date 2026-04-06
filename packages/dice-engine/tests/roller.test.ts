import { describe, it, expect, vi, beforeAll } from "vitest";
import { diceEngine } from "../src/roller";
import { diceParser } from "../src/parser";

describe("DiceEngine", () => {
  beforeAll(() => {
    if (typeof global.crypto === "undefined") {
      (global as any).crypto = {
        getRandomValues: (arr: Uint32Array) => {
          for (let i = 0; i < arr.length; i++) {
            arr[i] = Math.floor(Math.random() * 0xffffffff);
          }
          return arr;
        },
      };
    }
  });

  it("should roll a single die within range", () => {
    const cmd = diceParser.parse("d20");
    const res = diceEngine.execute(cmd);
    expect(res.total).toBeGreaterThanOrEqual(1);
    expect(res.total).toBeLessThanOrEqual(20);
    expect(res.parts[0].rolls).toHaveLength(1);
  });

  it("should sum multiple dice and modifiers", () => {
    const cmd = diceParser.parse("2d6 + 5");
    const res = diceEngine.execute(cmd);
    const sumRolls = res.parts[0].rolls!.reduce((a, b) => a + b, 0);
    expect(res.total).toBe(sumRolls + 5);
  });

  it("should handle dice subtraction", () => {
    const cmd = diceParser.parse("1d1 - 1d1"); // 1 - 1 = 0
    const res = diceEngine.execute(cmd);
    expect(res.total).toBe(0);
    expect(res.parts[0].value).toBe(1);
    expect(res.parts[1].value).toBe(-1);
  });

  it("should handle keep highest (kh)", () => {
    const _callIdx = 0;
    const values = [9, 14]; // (9%20)+1=10, (14%20)+1=15
    const spy = vi
      .spyOn(crypto, "getRandomValues")
      .mockImplementation((arr: any) => {
        // The engine uses a buffer, so we need to fill the beginning of the buffer
        // Note: the engine calls this when bufferIndex >= length.
        // For testing, we can force a flush by calling a private method or just filling the whole thing
        // but here we just mock the values the engine will consume.
        for (let i = 0; i < values.length; i++) {
          arr[i] = values[i];
        }
        return arr;
      });

    // We must reset the buffer to force a fetch
    (diceEngine as any).bufferIndex = 256;

    const cmd = diceParser.parse("2d20kh1");
    const res = diceEngine.execute(cmd);

    expect(res.total).toBe(15);
    expect(res.parts[0].rolls).toEqual([15]);
    expect(res.parts[0].dropped).toEqual([10]);

    spy.mockRestore();
  });

  it("should handle exploding dice (!)", () => {
    const _callIdx = 0;
    const values = [5, 2]; // (5%6)+1=6 (Explode), (2%6)+1=3
    const spy = vi
      .spyOn(crypto, "getRandomValues")
      .mockImplementation((arr: any) => {
        for (let i = 0; i < values.length; i++) {
          arr[i] = values[i];
        }
        return arr;
      });

    (diceEngine as any).bufferIndex = 256;

    const cmd = diceParser.parse("1d6!");
    const res = diceEngine.execute(cmd);

    expect(res.total).toBe(9); // 6 + 3
    expect(res.parts[0].rolls).toHaveLength(2);

    spy.mockRestore();
  });

  describe("Statistical Fairness (Rejection Sampling)", () => {
    const runFairnessTest = (sides: number, iterations: number = 5000) => {
      const cmd = diceParser.parse(`1d${sides}`);
      const counts = new Array(sides + 1).fill(0);

      for (let i = 0; i < iterations; i++) {
        const res = diceEngine.execute(cmd);
        counts[res.total]++;
      }

      const expected = iterations / sides;
      // Use a more realistic variance margin for random samples
      // 3 standard deviations is usually safe.
      // For 5000 rolls of d6, mean=833, stddev=~26. 3*stddev=~80.
      const margin = expected * 0.35;

      for (let i = 1; i <= sides; i++) {
        expect(
          counts[i],
          `Side ${i} distribution bias detected`,
        ).toBeGreaterThan(expected - margin);
        expect(counts[i], `Side ${i} distribution bias detected`).toBeLessThan(
          expected + margin,
        );
      }
    };

    it("should be fair for d2 (Coin Flip)", () => runFairnessTest(2));
    it("should be fair for d6 (Cube)", () => runFairnessTest(6));
    it("should be fair for d20 (Icosahedron)", () => runFairnessTest(20));
  });
});
