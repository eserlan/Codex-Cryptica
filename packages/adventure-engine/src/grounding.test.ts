import { describe, expect, it } from "bun:test";
import { selectGroundingCandidates } from "./grounding";

describe("selectGroundingCandidates", () => {
  it("prioritises and deduplicates anchors before relevant records", () => {
    expect(selectGroundingCandidates(["a", "a", "b"], ["b", "c"])).toEqual([
      "a",
      "b",
      "c",
    ]);
    expect(selectGroundingCandidates([], [])).toEqual([]);
  });

  it("bounds optional candidates and rejects too many required anchors", () => {
    const ids = Array.from({ length: 30 }, (_, index) => String(index));
    expect(selectGroundingCandidates(["required"], ids)).toHaveLength(24);
    expect(() => selectGroundingCandidates(ids, [])).toThrow(
      "grounding-anchor-budget-exceeded",
    );
  });
});

it("keeps the existing prompt allocator authoritative", async () => {
  const { allocatePromptBudget } = await import("./context-budget");
  const result = allocatePromptBudget({
    behavior: "",
    state: "{}",
    input: "{}",
    transcript: "[]",
    anchors: [],
    relevant: [
      {
        recordId: "a",
        displayName: "A",
        content: "a".repeat(20_000),
        lore: "l".repeat(20_000),
        role: "turn-source",
      },
    ],
  });
  expect(result.relevant[0].content.length).toBeLessThanOrEqual(12_000);
  expect(result.relevant[0].lore!.length).toBeLessThanOrEqual(6_000);
});

it("deduplicates canonical choices and follows the committed current location", async () => {
  const { requiredGroundingSources } = await import("./grounding");
  const references = requiredGroundingSources({
    sourceRecords: [{ recordId: "pc", role: "player-character" }],
    playerCharacter: { kind: "canonical", recordId: "pc", name: "Mara" },
    worldEntry: {
      location: { kind: "canonical", recordId: "start", name: "Starting town" },
    },
    visibleState: {
      location: {
        source: "canonical",
        sourceRecordId: "current",
        text: "Current town",
      },
    },
  } as any);
  expect(references.map((reference) => reference.recordId)).toEqual([
    "pc",
    "start",
    "current",
  ]);
  expect(
    requiredGroundingSources({
      sourceRecords: [],
      playerCharacter: {
        kind: "provisional",
        name: "Mara",
        description: "Guide",
      },
      visibleState: {},
    } as any),
  ).toEqual([]);
});
