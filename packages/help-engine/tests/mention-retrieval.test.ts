import { describe, expect, it } from "vitest";
import { retrieve } from "../src/retrieval";
import { SCREENS } from "./eval/questions";
import { buildRealBundle } from "./eval/evaluate";

describe("Oracle @ mentions are findable by Cif", () => {
  const bundle = buildRealBundle();
  const top = (question: string, n = 4) =>
    retrieve(question, bundle, SCREENS.graph)
      .chunks.slice(0, n)
      .map((c) => c.chunk.sourceId);

  it.each([
    "How do I mention an entity with @ in the Oracle?",
    "How can I make the Oracle answer about one specific entity when two share a name?",
  ])("finds the mentions guide or workflow for %j", (question) => {
    const sources = top(question);
    expect(
      sources.some(
        (id) => id === "mention-entities" || id === "registry:lore-oracle",
      ),
    ).toBe(true);
  });

  it("does not send an unrelated question to the mentions guide", () => {
    expect(top("How do I back up my vault to Google Drive?")).not.toContain(
      "mention-entities",
    );
  });
});
