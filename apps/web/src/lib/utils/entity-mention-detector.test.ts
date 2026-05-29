import { describe, it, expect } from "vitest";
import {
  detectEntityMentions,
  sortEntityIndex,
  type EntityIndexEntry,
} from "./entity-mention-detector";

// ─── Shared fixtures ────────────────────────────────────────────────────────

const ALDRIC: EntityIndexEntry = { text: "aldric the sage", id: "aldric-1" };
const CRIMSON: EntityIndexEntry = { text: "crimson enclave", id: "crimson-3" };
const SAGE: EntityIndexEntry = { text: "sage", id: "sage-2" };
/** Short-form alias for ALDRIC — resolves to the same entity ID. */
const ALDRIC_ALIAS: EntityIndexEntry = { text: "aldric", id: "aldric-1" };

// ─── sortEntityIndex ─────────────────────────────────────────────────────────

describe("sortEntityIndex", () => {
  it("sorts entries longest-first", () => {
    const sorted = sortEntityIndex([SAGE, ALDRIC, CRIMSON]);
    // "aldric the sage" and "crimson enclave" are both 15 chars; either may be first.
    expect(sorted[0].text.length).toBeGreaterThanOrEqual(sorted[1].text.length);
    expect(sorted[1].text.length).toBeGreaterThanOrEqual(sorted[2].text.length);
    // "sage" (4 chars) must be last.
    expect(sorted[2].text).toBe("sage");
  });

  it("does not mutate the original array", () => {
    const original = [SAGE, ALDRIC];
    sortEntityIndex(original);
    expect(original[0]).toBe(SAGE);
    expect(original[1]).toBe(ALDRIC);
  });

  it("returns empty array unchanged", () => {
    expect(sortEntityIndex([])).toEqual([]);
  });

  it("handles single-entry array", () => {
    expect(sortEntityIndex([ALDRIC])).toEqual([ALDRIC]);
  });
});

// ─── detectEntityMentions ────────────────────────────────────────────────────

describe("detectEntityMentions", () => {
  const sorted = sortEntityIndex([ALDRIC, CRIMSON]);

  // Basic match

  it("detects a basic match in a sentence", () => {
    const matches = detectEntityMentions(
      "She trained under Aldric the Sage.",
      sorted,
      "",
    );
    expect(matches).toHaveLength(1);
    expect(matches[0].entityId).toBe("aldric-1");
    expect(matches[0].matchedText).toBe("Aldric the Sage");
    expect(matches[0].start).toBe(18);
    expect(matches[0].end).toBe(33);
  });

  it("detects multiple matches in one string", () => {
    const matches = detectEntityMentions(
      "Aldric the Sage founded the Crimson Enclave.",
      sorted,
      "",
    );
    expect(matches).toHaveLength(2);
    expect(matches[0].entityId).toBe("aldric-1");
    expect(matches[1].entityId).toBe("crimson-3");
  });

  it("detects all occurrences (not just the first)", () => {
    const matches = detectEntityMentions(
      "Aldric the Sage and again Aldric the Sage",
      sorted,
      "",
    );
    expect(matches).toHaveLength(2);
  });

  // Case handling

  it("is case-insensitive (uppercase input)", () => {
    const matches = detectEntityMentions(
      "ALDRIC THE SAGE was wise.",
      sorted,
      "",
    );
    expect(matches).toHaveLength(1);
  });

  it("is case-insensitive (lowercase input)", () => {
    const matches = detectEntityMentions(
      "aldric the sage led the crimson enclave",
      sorted,
      "",
    );
    expect(matches).toHaveLength(2);
  });

  it("preserves original casing in matchedText", () => {
    const matches = detectEntityMentions(
      "ALDRIC THE SAGE was wise.",
      sorted,
      "",
    );
    expect(matches[0].matchedText).toBe("ALDRIC THE SAGE");
  });

  // Word boundaries

  it("does not match inside a possessive (apostrophe boundary)", () => {
    const sortedAlias = sortEntityIndex([ALDRIC_ALIAS]);
    const matches = detectEntityMentions("Aldric's staff.", sortedAlias, "");
    expect(matches).toHaveLength(0);
  });

  it("does not match when embedded in a longer word (left boundary)", () => {
    const sortedAlias = sortEntityIndex([ALDRIC_ALIAS]);
    const matches = detectEntityMentions("NotAldric spoke.", sortedAlias, "");
    expect(matches).toHaveLength(0);
  });

  it("does not match when embedded in a longer word (right boundary)", () => {
    const sortedAlias = sortEntityIndex([ALDRIC_ALIAS]);
    const matches = detectEntityMentions(
      "Aldricson was here.",
      sortedAlias,
      "",
    );
    expect(matches).toHaveLength(0);
  });

  it("matches name at the very start of the string", () => {
    const matches = detectEntityMentions("Aldric the Sage founded", sorted, "");
    expect(matches).toHaveLength(1);
    expect(matches[0].start).toBe(0);
  });

  it("matches name at the very end of the string", () => {
    const matches = detectEntityMentions(
      "Known as Aldric the Sage",
      sorted,
      "",
    );
    expect(matches).toHaveLength(1);
    expect(matches[0].end).toBe(24);
  });

  it("matches alias at the start of a sentence followed by punctuation", () => {
    const sortedAlias = sortEntityIndex([ALDRIC_ALIAS]);
    const matches = detectEntityMentions("Aldric was wise.", sortedAlias, "");
    expect(matches).toHaveLength(1);
    expect(matches[0].entityId).toBe("aldric-1");
  });

  // Longest-match-wins

  it("longest match wins over shorter alias at the same position", () => {
    const sortedBoth = sortEntityIndex([ALDRIC, ALDRIC_ALIAS]);
    const matches = detectEntityMentions(
      "Aldric the Sage appeared.",
      sortedBoth,
      "",
    );
    expect(matches).toHaveLength(1);
    expect(matches[0].matchedText).toBe("Aldric the Sage");
    expect(matches[0].entityId).toBe("aldric-1");
  });

  it('does not match standalone "sage" when "sage" entity is absent', () => {
    // The sorted index has only ALDRIC + CRIMSON, not SAGE
    const matches = detectEntityMentions("The sage spoke.", sorted, "");
    expect(matches).toHaveLength(0);
  });

  it('matches standalone "sage" when it exists as its own entity', () => {
    const sortedWithSage = sortEntityIndex([ALDRIC, SAGE]);
    const matches = detectEntityMentions("The sage spoke.", sortedWithSage, "");
    expect(matches).toHaveLength(1);
    expect(matches[0].entityId).toBe("sage-2");
  });

  // Self-link suppression

  it("suppresses matches when entityId equals currentEntityId", () => {
    const matches = detectEntityMentions(
      "Aldric the Sage trained here.",
      sorted,
      "aldric-1",
    );
    expect(matches).toHaveLength(0);
  });

  it("suppresses only the matching entity, not others", () => {
    const matches = detectEntityMentions(
      "Aldric the Sage and the Crimson Enclave",
      sorted,
      "aldric-1",
    );
    expect(matches).toHaveLength(1);
    expect(matches[0].entityId).toBe("crimson-3");
  });

  // Alias resolution (US4)

  it("alias resolves to the correct entity ID", () => {
    const sortedAlias = sortEntityIndex([ALDRIC_ALIAS]);
    const matches = detectEntityMentions(
      "Aldric trained her.",
      sortedAlias,
      "",
    );
    expect(matches[0].entityId).toBe("aldric-1");
  });

  it("multiple entities each with their own alias — correct per-span resolution", () => {
    const entities: EntityIndexEntry[] = [
      { text: "crimson enclave", id: "e1" },
      { text: "enclave", id: "e1" }, // alias for e1
      { text: "silver ward", id: "e2" },
      { text: "ward", id: "e2" }, // alias for e2
    ];
    const s = sortEntityIndex(entities);
    const matches = detectEntityMentions(
      "The Enclave and the Ward met.",
      s,
      "",
    );
    expect(matches).toHaveLength(2);
    expect(matches.find((m) => m.matchedText === "Enclave")?.entityId).toBe(
      "e1",
    );
    expect(matches.find((m) => m.matchedText === "Ward")?.entityId).toBe("e2");
  });

  // Edge cases / empty inputs

  it("returns empty array for empty entity index", () => {
    const matches = detectEntityMentions("Aldric the Sage", [], "");
    expect(matches).toHaveLength(0);
  });

  it("returns empty array for empty text", () => {
    const matches = detectEntityMentions("", sorted, "");
    expect(matches).toHaveLength(0);
  });

  it("handles text with no entity names", () => {
    const matches = detectEntityMentions("Nothing to see here.", sorted, "");
    expect(matches).toHaveLength(0);
  });
});
