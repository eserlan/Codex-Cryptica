import { describe, expect, it } from "vitest";
import { addBannedNameFindings } from "./heist-staged-validation";

describe("stage name findings", () => {
  it("appends one diagnostic with built-in and caller-supplied banned names", () => {
    const hard = ["missing field"];
    addBannedNameFindings(
      ["Elara", "Existing Captain", "Elara"],
      ["Existing Captain"],
      hard,
    );
    expect(hard).toEqual([
      "missing field",
      "banned placeholder name: Elara, Existing Captain",
    ]);
  });

  it("leaves findings untouched when names do not match banned tokens", () => {
    const hard: string[] = [];
    addBannedNameFindings(
      ["Vanessa", "The Sunstone Chalice Lift"],
      ["Captain"],
      hard,
    );
    expect(hard).toEqual([]);
  });
});
