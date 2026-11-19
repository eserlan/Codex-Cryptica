import { describe, expect, it } from "vitest";
import { recordExcerpts } from "../../src/adventure-json/retrieval-excerpts";
import {
  referenceLine,
  type Line,
} from "../../src/adventure-json/retrieval-text";

describe("retrieval record excerpts", () => {
  const record = {
    id: "scene",
    visibility: "player-visible" as const,
    epistemicStatus: "explicit" as const,
    sourceRef: { page: 2, textQuote: "Unclassified secret" },
  };

  it("splits secret fields, hidden references, and hidden prose into a companion", () => {
    const result = recordExcerpts(
      new Set(["hidden-actor"]),
      "scene",
      record,
      [
        ["Title", "Visible"],
        ["Truth", "Secret", true],
        referenceLine("Actor", "hidden-actor"),
        ["Body", "Ask hidden-actor."],
      ],
      1000,
    );
    expect(result.map((e) => [e.visibility, e.text])).toEqual([
      ["player-visible", "Title: Visible"],
      [
        "gm-only",
        "Truth: Secret\nActor: hidden-actor\nBody: Ask hidden-actor.",
      ],
    ]);
    expect(result[0]!.sourceRef).toEqual({ page: 2 });
    expect(result[1]!.sourceRef).toEqual(record.sourceRef);
  });

  it("keeps a hidden record whole and short ordinary words public", () => {
    const lines: Line[] = [
      ["Body", "A guard waits at a gate."],
      ["Truth", "Secret", true],
    ];
    expect(
      recordExcerpts(new Set(["a"]), "scene", record, lines.slice(0, 1), 1000),
    ).toHaveLength(1);
    const result = recordExcerpts(
      new Set(),
      "scene",
      { ...record, visibility: "gm-only" },
      lines,
      1000,
    );
    expect(result).toHaveLength(1);
    expect(result[0]!.text).toBe(
      "Body: A guard waits at a gate.\nTruth: Secret",
    );
  });

  it("skips an oversized secret's lazy contents after its companion fills", () => {
    let reads = 0;
    function* neverRead() {
      reads++;
      yield "Should not be read";
    }
    const result = recordExcerpts(
      new Set(),
      "scene",
      record,
      [
        ["Secret", "x".repeat(100), true],
        ["More secret", neverRead(), true],
        ["Visible", "Kept"],
      ],
      20,
    );
    expect(reads).toBe(0);
    expect(result[0]!.text).toBe("Visible: Kept");
    expect(result[1]!.text).toHaveLength(21);
  });
});
