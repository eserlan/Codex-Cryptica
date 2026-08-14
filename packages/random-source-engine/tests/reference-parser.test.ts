import { describe, it, expect } from "vitest";
import { parseReferences } from "../src/resolver";

describe("parseReferences", () => {
  it("finds a single reference with correct offsets", () => {
    const text = "A {creature} appears";
    const refs = parseReferences(text);
    expect(refs).toHaveLength(1);
    expect(refs[0].name).toBe("creature");
    expect(refs[0].raw).toBe("{creature}");
    expect(text.slice(refs[0].start, refs[0].end)).toBe("{creature}");
  });

  it("finds multiple references in one string, in order", () => {
    const refs = parseReferences("A {creature} guarding {treasure}");
    expect(refs.map((r) => r.name)).toEqual(["creature", "treasure"]);
    expect(refs[0].start).toBeLessThan(refs[1].start);
  });

  it("treats an unclosed brace as literal text", () => {
    expect(parseReferences("A {creature appears")).toEqual([]);
  });

  it("treats empty braces as literal text", () => {
    expect(parseReferences("Nothing {} here")).toEqual([]);
  });

  it("treats whitespace-only braces as literal text", () => {
    expect(parseReferences("Nothing {   } here")).toEqual([]);
  });

  it("ignores a stray closing brace", () => {
    expect(parseReferences("A creature} appears")).toEqual([]);
  });

  it("trims surrounding whitespace inside the braces", () => {
    expect(parseReferences("A { creature } appears")[0].name).toBe("creature");
  });

  it("does not treat nested opening braces as a reference", () => {
    // "{a{b}" — the inner {b} is the only well-formed token.
    const refs = parseReferences("{a{b}");
    expect(refs.map((r) => r.name)).toEqual(["b"]);
  });

  it("returns nothing for text with no braces", () => {
    expect(parseReferences("An abandoned shrine")).toEqual([]);
  });
});
