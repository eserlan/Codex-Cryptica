import { describe, expect, it } from "vitest";
import { isUnrelatedSuggestedSearch } from "./retrieval-evidence";

/**
 * Offline evaluation set for the no-match guard (#4066). Each case pairs a
 * question with the hit set search suggested and the right outcome:
 * - `keep`: the hit is genuinely related; rejecting it is a false no-match.
 * - `reject`: no suggested hit supports the question.
 *
 * The records are synthetic, written to look like real campaign notes. This is
 * a stand-in until the anonymised real-Vault holdout in #4068 exists; it does
 * not measure real-world accuracy.
 */

const vault = {
  entities: {
    elara: {
      id: "elara",
      title: "Elara Voss",
      content:
        "Grand Archmage of the Violet Spire. She mentored Corin before the war.",
      aliases: ["Grand Archmage", "the Violet Witch"],
      labels: ["npc", "mage"],
    },
    corin: {
      id: "corin",
      title: "Corin Ashdown",
      content: "A disgraced knight who now sells maps in Pagen harbour.",
      aliases: [],
      labels: ["npc"],
      metadata: { faction: "Harbour Guild", born: "Year 412" },
    },
    pagen: {
      id: "pagen",
      title: "Pagen",
      content:
        "A walled port city. Its markets open at dawn and close at the second bell.",
      lore: "The tide gates were sealed during the Drowned Winter.",
      aliases: ["the Port of Pagen"],
      labels: ["city"],
    },
    dragon: {
      id: "dragon",
      title: "Ancient Dragon",
      content: "It guards the northern mountain pass and hoards silver.",
      aliases: ["Old Wyrm"],
      labels: ["creature"],
    },
    ledger: {
      id: "ledger",
      title: "The Night Ledger",
      content: "An inventory of provisions.",
      lore: "The sapphire beacon is submerged beneath the eastern reef.",
      labels: ["item"],
    },
    council: {
      id: "council",
      title: "Council of Nine",
      content:
        "Rules Pagen. Votes are cast in secret; ties are broken by the Harbourmaster.",
      labels: ["faction"],
      tags: ["politics"],
    },
    zoldmezo: {
      id: "zoldmezo",
      title: "Elira Zöldmező",
      content: "Elveszett gyógynövényész a folyóparton.",
      labels: ["npc"],
    },
    eclipse: {
      id: "eclipse",
      title: "The Red Eclipse",
      content: "Happened in Year 430. Every lantern in the realm went dark.",
      labels: ["event"],
    },
    feud: {
      id: "feud",
      title: "Ashdown–Voss Feud",
      content: "Corin blames Elara for his exile from the Order.",
      labels: ["relationship"],
    },
    tavern: {
      id: "tavern",
      title: "The Gilded Gull",
      content: "A tavern on the docks with cheap ale.",
      labels: ["location"],
    },
  },
} as any;

type Outcome = "keep" | "reject";
interface Case {
  category: string;
  query: string;
  hits: string[];
  expected: Outcome;
}

const CASES: Case[] = [
  // Direct names and aliases
  {
    category: "direct",
    query: "Who is Elara Voss?",
    hits: ["elara"],
    expected: "keep",
  },
  {
    category: "direct",
    query: "Tell me about Corin Ashdown",
    hits: ["corin"],
    expected: "keep",
  },
  {
    category: "direct",
    query: "Describe the Council of Nine",
    hits: ["council"],
    expected: "keep",
  },
  {
    category: "direct",
    query: "What is the Night Ledger?",
    hits: ["ledger"],
    expected: "keep",
  },
  {
    category: "direct",
    query: "Where is the Gilded Gull tavern?",
    hits: ["tavern"],
    expected: "keep",
  },
  {
    category: "alias",
    query: "What does the Grand Archmage want?",
    hits: ["elara"],
    expected: "keep",
  },
  {
    category: "alias",
    query: "Is the Violet Witch dangerous?",
    hits: ["elara"],
    expected: "keep",
  },
  {
    category: "alias",
    query: "Where does the Old Wyrm sleep?",
    hits: ["dragon"],
    expected: "keep",
  },
  {
    category: "alias",
    query: "Trade routes into the Port of Pagen",
    hits: ["pagen"],
    expected: "keep",
  },
  // Word forms
  {
    category: "word-form",
    query: "Which dragons guard the mountains?",
    hits: ["dragon"],
    expected: "keep",
  },
  {
    category: "word-form",
    query: "Who mentors young mages?",
    hits: ["elara"],
    expected: "keep",
  },
  {
    category: "word-form",
    query: "How do the councils vote?",
    hits: ["council"],
    expected: "keep",
  },
  {
    category: "word-form",
    query: "Which knights were disgraced?",
    hits: ["corin"],
    expected: "keep",
  },
  {
    category: "word-form",
    query: "Lanterns going dark across realms",
    hits: ["eclipse"],
    expected: "keep",
  },
  {
    category: "word-form",
    query: "Hoarding silver beasts",
    hits: ["dragon"],
    expected: "keep",
  },
  // Lore-only, metadata, labels and tags
  {
    category: "lore-only",
    query: "Where is the sapphire beacon?",
    hits: ["ledger"],
    expected: "keep",
  },
  {
    category: "lore-only",
    query: "When were the tide gates sealed?",
    hits: ["pagen"],
    expected: "keep",
  },
  {
    category: "lore-only",
    query: "What happened in the Drowned Winter?",
    hits: ["pagen"],
    expected: "keep",
  },
  {
    category: "metadata",
    query: "Members of the Harbour Guild",
    hits: ["corin"],
    expected: "keep",
  },
  {
    category: "metadata",
    query: "Characters born in Year 412",
    hits: ["corin"],
    expected: "keep",
  },
  {
    category: "labels",
    query: "List every creature nearby",
    hits: ["dragon"],
    expected: "keep",
  },
  {
    category: "labels",
    query: "Local politics and power",
    hits: ["council"],
    expected: "keep",
  },
  // Multi-entity and relationships
  {
    category: "multi",
    query: "How is Elara connected to Corin?",
    hits: ["feud", "elara", "corin"],
    expected: "keep",
  },
  {
    category: "multi",
    query: "Compare the Council and the Harbour Guild",
    hits: ["council", "corin"],
    expected: "keep",
  },
  {
    category: "relationship",
    query: "Why was Corin exiled from the Order?",
    hits: ["feud"],
    expected: "keep",
  },
  {
    category: "relationship",
    query: "Who blames whom for the exile?",
    hits: ["feud"],
    expected: "keep",
  },
  // Temporal
  {
    category: "temporal",
    query: "What happened in Year 430?",
    hits: ["eclipse"],
    expected: "keep",
  },
  {
    category: "temporal",
    query: "When do the markets open each dawn?",
    hits: ["pagen"],
    expected: "keep",
  },
  {
    category: "temporal",
    query: "Events before the war",
    hits: ["elara"],
    expected: "keep",
  },
  // Narrow facts
  {
    category: "narrow-fact",
    query: "Who breaks ties in council votes?",
    hits: ["council"],
    expected: "keep",
  },
  {
    category: "narrow-fact",
    query: "What does Corin sell?",
    hits: ["corin"],
    expected: "keep",
  },
  {
    category: "narrow-fact",
    query: "How cheap is the ale at the docks?",
    hits: ["tavern"],
    expected: "keep",
  },
  // Ambiguous names: a near-name hit still shares words, so it is kept
  // (choosing between near-names is the resolver's job, not this guard's).
  {
    category: "ambiguous",
    query: "Who is Elira Voss?",
    hits: ["elara", "zoldmezo"],
    expected: "keep",
  },
  {
    category: "ambiguous",
    query: "Tell me about Ashdown",
    hits: ["corin", "feud"],
    expected: "keep",
  },
  // Non-English and Unicode
  {
    category: "unicode",
    query: "Ki az Elira Zöldmező?",
    hits: ["zoldmezo"],
    expected: "keep",
  },
  {
    category: "unicode",
    query: "Hvem er Elara Voss?",
    hits: ["elara"],
    expected: "keep",
  },
  {
    category: "unicode",
    query: "Hvor ligger Pagen havn?",
    hits: ["pagen"],
    expected: "keep",
  },
  // Follow-ups and short prompts are never auto-rejected
  { category: "follow-up", query: "Why?", hits: ["tavern"], expected: "keep" },
  {
    category: "follow-up",
    query: "Tell me more",
    hits: ["dragon"],
    expected: "keep",
  },
  {
    category: "follow-up",
    query: "And her?",
    hits: ["council"],
    expected: "keep",
  },
  {
    category: "follow-up",
    query: "Spaceships?",
    hits: ["eclipse"],
    expected: "keep",
  },
  // Creative requests that mention a known subject
  {
    category: "creative",
    query: "Write a rumour about the Gilded Gull",
    hits: ["tavern"],
    expected: "keep",
  },
  {
    category: "creative",
    query: "Invent a rival for Corin",
    hits: ["corin"],
    expected: "keep",
  },
  // Absent subjects and unsupported questions
  {
    category: "absent",
    query: "quantum tomato whale engine",
    hits: ["zoldmezo"],
    expected: "reject",
  },
  {
    category: "absent",
    query: "Who rules the Frostfang clans?",
    hits: ["tavern"],
    expected: "reject",
  },
  {
    category: "absent",
    query: "Describe the obsidian lighthouse keepers",
    hits: ["dragon"],
    expected: "reject",
  },
  {
    category: "absent",
    query: "Explain the gnomish clockwork railway",
    hits: ["council", "tavern"],
    expected: "reject",
  },
  {
    category: "absent",
    query: "What is Professor Quill's laboratory?",
    hits: ["elara"],
    expected: "reject",
  },
  {
    category: "unsupported",
    query: "Which spaceships orbit Jupiter?",
    hits: ["eclipse"],
    expected: "reject",
  },
  {
    category: "unsupported",
    query: "Python async iterator tutorial",
    hits: ["ledger"],
    expected: "reject",
  },
  {
    category: "unsupported",
    query: "Recipe for blueberry pancakes",
    hits: ["tavern", "pagen"],
    expected: "reject",
  },
  {
    category: "unsupported",
    query: "Stock prices for electric cars",
    hits: ["corin"],
    expected: "reject",
  },
];

const outcome = (c: Case): Outcome =>
  isUnrelatedSuggestedSearch(
    c.query,
    c.hits.map((id) => ({ id })),
    vault,
  )
    ? "reject"
    : "keep";

describe("no-match guard evaluation set (#4066, stand-in for #4068)", () => {
  it("has at least 50 cases across positive and negative categories", () => {
    expect(CASES.length).toBeGreaterThanOrEqual(50);
    expect(CASES.some((c) => c.expected === "reject")).toBe(true);
  });

  it("never rejects a related hit (false no-match rate is 0)", () => {
    const falseNoMatch = CASES.filter(
      (c) => c.expected === "keep" && outcome(c) === "reject",
    ).map((c) => `${c.category}: ${c.query}`);
    expect(falseNoMatch).toEqual([]);
  });

  it("rejects every unsupported hit set", () => {
    const missed = CASES.filter(
      (c) => c.expected === "reject" && outcome(c) === "keep",
    ).map((c) => `${c.category}: ${c.query}`);
    expect(missed).toEqual([]);
  });
});
