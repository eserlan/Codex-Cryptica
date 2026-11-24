import { describe, expect, it } from "bun:test";
import { scoreAuthoredBeats, type AuthoredBeat } from "../src";

describe("authored evaluation beats", () => {
  const beats: AuthoredBeat[] = [
    {
      id: "ledger-clue",
      label: "The public ledger records a scheduled test.",
      requiredEvidence: ["public ledger", "scheduled test"],
      partialEvidence: ["watch record"],
    },
  ];

  it("marks a beat present when every required evidence phrase appears", () => {
    expect(
      scoreAuthoredBeats(
        "The public ledger records a scheduled test at noon.",
        beats,
      ),
    ).toEqual([
      {
        id: "ledger-clue",
        label: "The public ledger records a scheduled test.",
        status: "present",
        matchedRequiredEvidence: ["public ledger", "scheduled test"],
        matchedPartialEvidence: [],
      },
    ]);
  });

  it("marks a beat partial when only some of its required evidence appears", () => {
    expect(
      scoreAuthoredBeats("The public ledger is open on the desk.", beats)[0]
        ?.status,
    ).toBe("partial");
  });

  it("accepts a fixture-authored partial cue when required evidence is absent", () => {
    expect(
      scoreAuthoredBeats("The watch record is old and damp.", beats)[0],
    ).toMatchObject({
      status: "partial",
      matchedPartialEvidence: ["watch record"],
    });
  });

  it("marks missing or unrelated output absent", () => {
    expect(scoreAuthoredBeats(undefined, beats)[0]?.status).toBe("absent");
    expect(
      scoreAuthoredBeats("A gull crosses the bay.", beats)[0]?.status,
    ).toBe("absent");
  });

  it("matches punctuation and case without changing the authored cues", () => {
    expect(
      scoreAuthoredBeats("PUBLIC ledger — a SCHEDULED TEST.", beats)[0]?.status,
    ).toBe("present");
  });

  it("rejects empty evidence and duplicate beat IDs", () => {
    expect(() =>
      scoreAuthoredBeats("anything", [
        { id: "empty", label: "Empty", requiredEvidence: ["  !!!  "] },
      ]),
    ).toThrow("must include non-empty required evidence");
    expect(() => scoreAuthoredBeats("anything", [...beats, ...beats])).toThrow(
      "must have unique IDs",
    );
  });
});
