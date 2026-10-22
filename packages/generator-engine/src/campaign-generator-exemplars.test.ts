import { describe, expect, it } from "vitest";
import { EXEMPLARS } from "./campaign-generator-exemplars";

/**
 * The exemplars are shown to the model as examples of shape. When they share
 * a world, the model copies that world, so these checks keep them apart.
 */

/** The anchors that the model kept copying. Each may appear in one exemplar. */
const MOTIF = /\b(bell|ledger|tide|harbou?r|salt|chapel|lantern|debt)s?\b/i;

/** Most exemplars may share a content word only up to this many. */
const SHARED_LIMIT = 8;

// Words a schema or heading needs, plus ordinary English. Everything else in
// the prose counts toward the overlap limit.
const STOPWORDS = new Set([
  "about",
  "above",
  "after",
  "again",
  "against",
  "also",
  "although",
  "another",
  "around",
  "because",
  "been",
  "before",
  "being",
  "below",
  "between",
  "both",
  "could",
  "does",
  "down",
  "during",
  "each",
  "either",
  "else",
  "even",
  "every",
  "from",
  "have",
  "here",
  "into",
  "just",
  "keep",
  "like",
  "make",
  "many",
  "more",
  "most",
  "much",
  "must",
  "never",
  "none",
  "only",
  "other",
  "over",
  "past",
  "play",
  "players",
  "party",
  "same",
  "should",
  "since",
  "some",
  "such",
  "take",
  "than",
  "that",
  "their",
  "them",
  "then",
  "there",
  "these",
  "they",
  "this",
  "those",
  "through",
  "till",
  "toward",
  "under",
  "until",
  "upon",
  "very",
  "were",
  "what",
  "when",
  "where",
  "which",
  "while",
  "will",
  "with",
  "within",
  "without",
  "would",
  "yours",
  "your",
  "hook",
  "hooks",
  "clue",
  "clues",
  "evidence",
  "truth",
  "gm",
  "notes",
  "section",
  "sections",
  "reference",
  "quick",
  "checks",
  "mechanics",
  "stakes",
  "goal",
  "goals",
  "outcome",
  "outcomes",
  "success",
  "failure",
  "reward",
  "rewards",
  "complication",
  "complications",
  "threat",
  "location",
  "locations",
  "situation",
  "status",
  "environment",
  "participants",
  "possible",
  "approaches",
  "approach",
  "secret",
  "trait",
  "stance",
  "duty",
  "motive",
  "wants",
  "right",
  "needs",
  "leverage",
  "connection",
  "structure",
  "emphasis",
  "discoveries",
  "reality",
  "actually",
  "happening",
  "essentially",
  "danger",
  "level",
  "immediate",
  "objective",
  "pressure",
  "consequence",
  "consequences",
  "escalation",
  "npc",
  "npcs",
  "faction",
  "factions",
  "adventure",
  "lore",
  "content",
  "summary",
  "title",
  "labels",
  "connections",
  "settlement",
  "scene",
  "scenes",
  "player",
  "character",
  "characters",
  "world",
  "people",
  "person",
  "item",
  "items",
  "object",
  "objects",
  "place",
  "places",
  "history",
  "power",
  "conflict",
  "conflicts",
  "public",
  "private",
  "secrets",
  "known",
  "reveal",
  "reveals",
  "revealed",
  "hidden",
  "hiding",
  "needed",
  "need",
  "uses",
  "used",
  "using",
  "part",
  "parts",
  "point",
  "points",
  "first",
  "second",
  "third",
  "last",
  "next",
  "time",
  "times",
  "day",
  "days",
  "night",
  "nights",
  "week",
  "weeks",
  "month",
  "months",
  "year",
  "years",
  "hour",
  "hours",
  "moment",
  "early",
  "later",
  "soon",
  "open",
  "close",
  "closed",
  "local",
  "large",
  "small",
  "high",
  "low",
  "old",
  "new",
  "true",
  "false",
  "alive",
  "dead",
  "safe",
  "safely",
  "easy",
  "hard",
  "clear",
  "plain",
  "simple",
  "real",
  "fake",
  "good",
  "bad",
  "best",
  "worst",
  "main",
  "key",
  "core",
  "full",
  "whole",
  "single",
  "double",
  "general",
  "specific",
  "common",
  "rare",
  "strange",
  "odd",
  "unusual",
  "normal",
  "regular",
  "standard",
  "basic",
  "careful",
  "quiet",
  "loud",
  "three",
  "whose",
]);

/** Every string value inside an exemplar, skipping the labels field. */
function proseOf(json: string): string {
  const parsed = JSON.parse(json) as Record<string, unknown>;
  const strings: string[] = [];
  const walk = (value: unknown, key = "") => {
    if (key === "labels" || key === "connections" || key === "type") return;
    if (typeof value === "string") strings.push(value);
    else if (Array.isArray(value)) value.forEach((item) => walk(item));
    else if (value && typeof value === "object")
      Object.entries(value).forEach(([k, v]) => walk(v, k));
  };
  walk(parsed);
  return strings.join("\n");
}

function wordsOf(prose: string): Set<string> {
  return new Set(
    prose
      .toLowerCase()
      .split(/[^a-z']+/)
      .map((word) => word.replace(/^'+|'+$/g, ""))
      .filter((word) => word.length > 4 && !STOPWORDS.has(word)),
  );
}

/** Words that appear in more than `limit` entries, with the entries holding them. */
function sharedWords(
  entries: Record<string, string>,
  limit = 2,
): Map<string, string[]> {
  const holders = new Map<string, string[]>();
  for (const [id, json] of Object.entries(entries)) {
    for (const word of wordsOf(proseOf(json))) {
      holders.set(word, [...(holders.get(word) ?? []), id]);
    }
  }
  return new Map([...holders].filter(([, ids]) => ids.length > limit));
}

function motifHolders(entries: Record<string, string>): Map<string, string[]> {
  const holders = new Map<string, string[]>();
  for (const [id, json] of Object.entries(entries)) {
    const match = proseOf(json).match(MOTIF);
    if (match) {
      const motif = match[0].toLowerCase().replace(/s$/, "");
      holders.set(motif, [...(holders.get(motif) ?? []), id]);
    }
  }
  return holders;
}

describe("campaign generator exemplars", () => {
  it("keeps any content word within a quarter of the exemplars", () => {
    const shared = sharedWords(EXEMPLARS, SHARED_LIMIT);
    expect([...shared.keys()]).toEqual([]);
  });

  it("keeps each motif in at most one exemplar", () => {
    const over = [...motifHolders(EXEMPLARS)].filter(
      ([, ids]) => ids.length > 1,
    );
    expect(over).toEqual([]);
  });

  it("flags a crafted overlapping pair of exemplars", () => {
    const fixture = {
      a: '{"title":"Silver Tide","summary":"The tide rises.","content":"Waves crash on the pier."}',
      b: '{"title":"Quiet Tide","summary":"A tide turns.","content":"Waves crash on the pier."}',
      c: '{"title":"Brass Engine","summary":"A steam engine.","content":"Gears turn."}',
    };
    expect(motifHolders(fixture).get("tide")).toEqual(["a", "b"]);
    expect(sharedWords(fixture, 1).has("waves")).toBe(true);
    expect(sharedWords(fixture, 1).has("engine")).toBe(false);
    expect(sharedWords(fixture, 2).has("waves")).toBe(false);
  });
});
