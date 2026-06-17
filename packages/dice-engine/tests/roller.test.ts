import { describe, it, expect, beforeAll } from "vitest";
import { diceEngine, DiceEngine } from "../src/roller";
import { diceParser } from "../src/parser";

describe("DiceEngine", () => {
  beforeAll(() => {
    if (typeof globalThis.crypto === "undefined") {
      (globalThis as any).crypto = {
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
    const values = [9, 14]; // (9%20)+1=10, (14%20)+1=15
    const cryptoProvider = {
      getRandomValues: (arr: Uint32Array) => {
        for (let i = 0; i < values.length; i++) {
          arr[i] = values[i];
        }
        return arr;
      },
    };
    const engine = new DiceEngine(cryptoProvider);

    const cmd = diceParser.parse("2d20kh1");
    const res = engine.execute(cmd);

    expect(res.total).toBe(15);
    expect(res.parts[0].rolls).toEqual([15]);
    expect(res.parts[0].dropped).toEqual([10]);
  });

  it("should handle exploding dice (!)", () => {
    const values = [5, 2]; // (5%6)+1=6 (Explode), (2%6)+1=3
    const cryptoProvider = {
      getRandomValues: (arr: Uint32Array) => {
        for (let i = 0; i < values.length; i++) {
          arr[i] = values[i];
        }
        return arr;
      },
    };
    const engine = new DiceEngine(cryptoProvider);

    const cmd = diceParser.parse("1d6!");
    const res = engine.execute(cmd);

    expect(res.total).toBe(9); // 6 + 3
    expect(res.parts[0].rolls).toHaveLength(2);
  });

  it("should properly set timestamp using the injected clock", () => {
    const fixedTime = 1620000000000;
    const mockClock = { now: () => fixedTime };
    // Use the default (lazy) crypto provider; only the clock is injected here.
    const engine = new DiceEngine(undefined, mockClock);

    const cmd = diceParser.parse("1d20");
    const res = engine.execute(cmd);

    expect(res.timestamp).toBe(fixedTime);
  });

  // `globalThis.crypto` is a read-only getter in this runtime, so override it
  // via defineProperty (plain assignment throws) and restore afterwards.
  const setCrypto = (value: unknown) =>
    Object.defineProperty(globalThis, "crypto", { value, configurable: true });

  it("should lazily resolve crypto to support late polyfills", () => {
    const originalCrypto = globalThis.crypto;
    try {
      setCrypto(undefined);
      const engine = new DiceEngine(); // constructed while crypto is absent

      // Late polyfill, after construction.
      setCrypto({
        getRandomValues: (arr: Uint32Array) => {
          for (let i = 0; i < arr.length; i++) arr[i] = 5;
          return arr;
        },
      });

      const res = engine.execute(diceParser.parse("1d20"));
      expect(res.total).toBe(6); // (5%20)+1
    } finally {
      setCrypto(originalCrypto);
    }
  });

  it("should throw error when crypto is unavailable during execution", () => {
    const originalCrypto = globalThis.crypto;
    try {
      setCrypto(undefined);
      const engine = new DiceEngine();
      expect(() => engine.execute(diceParser.parse("1d20"))).toThrow(
        "CryptoProvider (or globalThis.crypto) is not available",
      );
    } finally {
      setCrypto(originalCrypto);
    }
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
