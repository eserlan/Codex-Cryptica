import { describe, expect, it } from "vitest";
import {
  containsTokens,
  normaliseText,
  textFoundIn,
} from "../../src/adventure-json/conversion-score-text";
import { textFoundIn as publicTextFoundIn } from "../../src/adventure-json/conversion-score";

describe("conversion score text matching", () => {
  it("keeps the public matcher and matches at the inclusive 60 percent boundary", () => {
    expect(publicTextFoundIn).toBe(textFoundIn);
    expect(
      textFoundIn("alpha bravo charlie delta echo", "ECHO, charlie; ALPHA"),
    ).toBe(true);
    expect(textFoundIn("alpha bravo charlie delta echo", "alpha bravo")).toBe(
      false,
    );
  });

  it("counts distinct long tokens and rejects empty or short-only text", () => {
    expect(textFoundIn("the oak is old", "the oak is old")).toBe(false);
    expect(textFoundIn("alpha alpha bravo", "ALPHA")).toBe(false);
    expect(textFoundIn("alpha alpha", "ALPHA")).toBe(true);
    expect(textFoundIn("---", "anything")).toBe(false);
    expect(textFoundIn("alpha", "alphabet")).toBe(false);
  });

  it("requires every distinguishing word including short words", () => {
    expect(containsTokens("Oak, bridge opens at noon.", "oak noon")).toBe(true);
    expect(containsTokens("The bridge opens at noon.", "oak noon")).toBe(false);
    expect(containsTokens("oak bridge", "---")).toBe(false);
  });

  it("normalises section names without discarding punctuation or inner spaces", () => {
    expect(normaliseText("  The Mill!  ")).toBe("the mill!");
    expect(normaliseText("The  Mill")).not.toBe(normaliseText("The Mill"));
  });
});
