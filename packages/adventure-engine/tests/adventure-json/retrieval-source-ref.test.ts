import { describe, expect, it } from "vitest";
import {
  boundSourceRef,
  boundSourceRefQuote,
  withoutTextQuote,
} from "../../src/adventure-json/retrieval-source-ref";
import type { AdventureJsonExcerpt } from "../../src/adventure-json/retrieval-types";

describe("retrieval source references", () => {
  it("preserves short source references and removes player-unsafe quotes", () => {
    const sourceRef = { page: 4, chapter: "Arrival", textQuote: "Secret" };
    expect(boundSourceRef(sourceRef, 100)).toBe(sourceRef);
    expect(withoutTextQuote(sourceRef)).toEqual({
      page: 4,
      chapter: "Arrival",
    });
    expect(withoutTextQuote({ textQuote: "Secret" })).toBeUndefined();
    expect(boundSourceRef(undefined, 100)).toBeUndefined();
  });

  it("bounds unbounded metadata without mutating the input", () => {
    const sourceRef = {
      chapter: "x".repeat(1000),
      section: "y".repeat(1000),
      anchor: "z".repeat(1000),
      textQuote: "q".repeat(1000),
    };
    expect(boundSourceRef(sourceRef, 16)).toEqual({
      chapter: "x".repeat(17),
      section: "y".repeat(17),
      anchor: "z".repeat(17),
      textQuote: "qqq",
    });
    expect(sourceRef.textQuote).toHaveLength(1000);
  });

  it("reports quote truncation independently from excerpt text", () => {
    const excerpt: AdventureJsonExcerpt = {
      id: "s",
      kind: "scene",
      visibility: "gm-only",
      epistemicStatus: "explicit",
      text: "Body",
      sourceRef: { page: 3, textQuote: "long quote" },
    };
    expect(boundSourceRefQuote(excerpt, 16)).toEqual({
      excerpt: { ...excerpt, sourceRef: { page: 3, textQuote: "lo" } },
      truncated: true,
    });
    expect(boundSourceRefQuote(excerpt, 100)).toEqual({
      excerpt,
      truncated: false,
    });
  });
});
