import { describe, it, expect } from "vitest";
import { diceParser } from "../src/parser";

describe("DiceParser", () => {
  it("should parse standard single die", () => {
    const cmd = diceParser.parse("d20");
    expect(cmd.parts).toHaveLength(1);
    expect(cmd.parts[0]).toMatchObject({ type: "dice", count: 1, sides: 20 });
  });

  it("should parse multiple dice", () => {
    const cmd = diceParser.parse("3d6");
    expect(cmd.parts).toHaveLength(1);
    expect(cmd.parts[0]).toMatchObject({ type: "dice", count: 3, sides: 6 });
  });

  it("should parse dice with modifiers", () => {
    const cmd = diceParser.parse("2d8 + 5");
    expect(cmd.parts).toHaveLength(2);
    expect(cmd.parts[0]).toMatchObject({ type: "dice", count: 2, sides: 8 });
    expect(cmd.parts[1]).toMatchObject({ type: "modifier", value: 5 });
  });

  it("should parse dice with negative modifiers", () => {
    const cmd = diceParser.parse("1d10 - 2");
    expect(cmd.parts).toHaveLength(2);
    expect(cmd.parts[1]).toMatchObject({ type: "modifier", value: -2 });
  });

  it("should parse dice subtraction", () => {
    const cmd = diceParser.parse("1d20 - 1d4");
    expect(cmd.parts).toHaveLength(2);
    expect(cmd.parts[0]).toMatchObject({ type: "dice", count: 1, sides: 20 });
    expect(cmd.parts[1]).toMatchObject({ type: "dice", count: -1, sides: 4 });
  });

  it("should handle consecutive operators gracefully", () => {
    const cmd = diceParser.parse("1d20 -- 5");
    // Result: 1d20, skip empty, - -5 = +5
    expect(cmd.parts).toHaveLength(2);
    expect(cmd.parts[1]).toMatchObject({ type: "modifier", value: 5 });
  });

  it("should parse keep highest (kh)", () => {
    const cmd = diceParser.parse("2d20kh1");
    expect(
      cmd.parts[0].type === "dice" ? cmd.parts[0].options : {},
    ).toMatchObject({ keepHighest: 1 });
  });

  it("should parse keep lowest (kl)", () => {
    const cmd = diceParser.parse("4d6kl3");
    expect(
      cmd.parts[0].type === "dice" ? cmd.parts[0].options : {},
    ).toMatchObject({ keepLowest: 3 });
  });

  it("should parse exploding dice (!)", () => {
    const cmd = diceParser.parse("4d6!");
    expect(
      cmd.parts[0].type === "dice" ? cmd.parts[0].options : {},
    ).toMatchObject({ exploding: true });
  });

  it("should throw error on invalid formula", () => {
    expect(() => diceParser.parse("invalid")).toThrow();
    expect(() => diceParser.parse("")).toThrow();
  });
});
