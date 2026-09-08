import { describe, expect, it } from "vitest";
import {
  applyRefinementProposal,
  buildRefinementPrompt,
  normalizeRefinementDocument,
  parseRefinementResponse,
} from "./generator-refinement";

const source = normalizeRefinementDocument({
  id: "draft-1",
  type: "character",
  kind: "npc",
  title: "Mara Venn",
  summary: "A cautious courier.",
  content: "Mara carries messages through the flood districts.",
  lore: "She owes the Lantern Guild one impossible favour.",
  labels: ["courier"],
  status: "draft",
});

describe("generator refinement core", () => {
  it("normalizes a source without losing its identity or metadata", () => {
    expect(source).toMatchObject({
      id: "draft-1",
      type: "character",
      kind: "npc",
      title: "Mara Venn",
      labels: ["courier"],
    });
  });

  it("merges partial proposals over the latest source", () => {
    expect(
      applyRefinementProposal(source, {
        content: "Mara carries sealed messages through the flood districts.",
      }),
    ).toMatchObject({
      title: "Mara Venn",
      summary: "A cautious courier.",
      content: "Mara carries sealed messages through the flood districts.",
      lore: source.lore,
      labels: source.labels,
    });
  });

  it("rejects a proposal that cannot produce usable content", () => {
    expect(() =>
      applyRefinementProposal({ ...source, content: "", lore: undefined }, {}),
    ).toThrow(/usable draft content/);
  });

  it("parses fenced JSON and rejects malformed fields", () => {
    expect(
      parseRefinementResponse('```json\n{"content":"Updated"}\n```'),
    ).toEqual({
      content: "Updated",
    });
    expect(() => parseRefinementResponse('{"labels":"not an array"}')).toThrow(
      /labels field was invalid/,
    );
  });

  it("builds an instruction-first prompt from the source", () => {
    const prompt = buildRefinementPrompt(
      source,
      "Make the courier more hopeful",
    );
    expect(prompt).toContain("highest priority");
    expect(prompt).toContain("Mara Venn");
    expect(prompt).toContain("Make the courier more hopeful");
  });
});
