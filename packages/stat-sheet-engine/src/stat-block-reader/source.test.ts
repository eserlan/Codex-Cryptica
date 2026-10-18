import { describe, expect, it } from "vitest";
import { assertSourceLength, prepareStatBlockSource } from "./source";
import {
  StatBlockSourceEmptyError,
  StatBlockSourceTooLongError,
  STAT_BLOCK_SOURCE_LIMIT,
} from "./errors";

describe("prepareStatBlockSource", () => {
  it("strips Foundry export noise from JSON input", () => {
    const raw = JSON.stringify({
      name: "Hill Brute",
      _stats: { coreVersion: "12" },
      img: "icons/x.png",
      prototypeToken: { name: "Hill Brute" },
      effects: [{ name: "Rage", icon: "icons/fire.svg" }],
      system: { details: { cr: 3 } },
    });
    const cleaned = JSON.parse(prepareStatBlockSource(raw));
    expect(cleaned).toEqual({
      name: "Hill Brute",
      effects: [{ name: "Rage" }],
      system: { details: { cr: 3 } },
    });
  });

  it("leaves plain text unchanged", () => {
    const text = "Hill Brute\nArmor Class 13";
    expect(prepareStatBlockSource(text)).toBe(text);
  });

  it("leaves malformed JSON unchanged rather than throwing", () => {
    const broken = "{ not really json";
    expect(prepareStatBlockSource(broken)).toBe(broken);
  });
});

describe("assertSourceLength", () => {
  it("accepts exactly the limit", () => {
    expect(() =>
      assertSourceLength("a".repeat(STAT_BLOCK_SOURCE_LIMIT)),
    ).not.toThrow();
  });

  it("refuses one character over the limit", () => {
    expect(() =>
      assertSourceLength("a".repeat(STAT_BLOCK_SOURCE_LIMIT + 1)),
    ).toThrow(StatBlockSourceTooLongError);
  });

  it("refuses empty and whitespace-only input", () => {
    expect(() => assertSourceLength("")).toThrow(StatBlockSourceEmptyError);
    expect(() => assertSourceLength("   \n\t ")).toThrow(
      StatBlockSourceEmptyError,
    );
  });
});
