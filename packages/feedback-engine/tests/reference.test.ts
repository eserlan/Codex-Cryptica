import { describe, expect, test } from "bun:test";
import { createReference, isReference } from "../src/reference";

const fixed = (bytes: number[]) => (n: number) =>
  Uint8Array.from({ length: n }, (_, i) => bytes[i % bytes.length]);

describe("createReference", () => {
  test("formats CC-XXXX-XXXX from Crockford base32 with no I, L, O or U", () => {
    const ref = createReference(fixed([0, 31, 9, 22, 5, 18, 30, 12]));
    expect(ref).toMatch(/^CC-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/);
  });

  test("different random bytes give different references", () => {
    expect(createReference(fixed([1, 2, 3, 4, 5, 6, 7, 8]))).not.toBe(
      createReference(fixed([9, 8, 7, 6, 5, 4, 3, 2])),
    );
  });
});

describe("isReference", () => {
  test("accepts the generated format", () => {
    expect(isReference("CC-7F3K-9Q2M")).toBe(true);
  });

  test("rejects lower case, wrong length, excluded letters and other prefixes", () => {
    expect(isReference("cc-7f3k-9q2m")).toBe(false);
    expect(isReference("CC-7F3K-9Q2")).toBe(false);
    expect(isReference("CC-7F3I-9Q2M")).toBe(false);
    expect(isReference("XX-7F3K-9Q2M")).toBe(false);
  });
});
