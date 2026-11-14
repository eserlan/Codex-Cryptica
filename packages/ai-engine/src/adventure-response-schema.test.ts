import { describe, expect, it } from "vitest";
import {
  adventureTurnResponseSchema,
  buildAdventureContentInput,
  isInvalidAdventureResponse,
  parseAdventureResponse,
} from "./adventure-response-schema";
import { completeResponse } from "./adventure-generation.test-fixtures";

describe("adventure structured response contract", () => {
  it("distinguishes repairable validation failures from provider errors", () => {
    expect(
      isInvalidAdventureResponse(new Error("invalid-adventure-response")),
    ).toBe(true);
    expect(isInvalidAdventureResponse(new Error("provider-failed"))).toBe(
      false,
    );
    expect(isInvalidAdventureResponse("invalid-adventure-response")).toBe(
      false,
    );
  });
  it("supplies the same schema for buffered and streamed content", () => {
    expect(buildAdventureContentInput("prompt")).toEqual({
      contents: [{ role: "user", parts: [{ text: "prompt" }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: adventureTurnResponseSchema,
      },
    });
    expect(
      adventureTurnResponseSchema.oneOf.map(
        (schema) => schema.properties.kind.enum[0],
      ),
    ).toEqual(["complete", "roll-required"]);
  });

  it("parses complete and roll-required proposals", () => {
    expect(parseAdventureResponse(completeResponse)).toMatchObject({
      kind: "complete",
      narration: "The road opens.",
    });
    expect(
      parseAdventureResponse(
        JSON.stringify({
          kind: "roll-required",
          uncertainty: "Can you cross?",
          stakes: "A fall",
          sourceRecordIds: [],
        }),
      ),
    ).toMatchObject({ kind: "roll-required" });
  });

  it("accepts optional bounded sceneTransition/personRefs and rejects oversized arrays", () => {
    const base = JSON.parse(completeResponse) as Record<string, unknown>;
    expect(
      parseAdventureResponse(
        JSON.stringify({
          ...base,
          personRefs: ["person-1"],
          sceneTransition: { sceneId: "scene-1", title: "Harbour" },
          moveTo: { name: "Kettleford Mill", cues: ["river", "village"] },
          placeCues: ["market", "busy"],
        }),
      ),
    ).toMatchObject({
      kind: "complete",
      moveTo: { name: "Kettleford Mill", cues: ["river", "village"] },
      placeCues: ["market", "busy"],
    });
    const completeProps = adventureTurnResponseSchema.oneOf[0].properties;
    expect(completeProps.placeCues).toBeDefined();
    expect(completeProps.moveTo.properties.cues).toBeDefined();
    expect(
      completeProps.visiblePatch.properties.activeCharacters.properties.add
        .items.properties.cues,
    ).toBeDefined();
    expect(
      completeProps.visiblePatch.properties.activeCharacters.properties.update
        .items.properties.cues,
    ).toBeDefined();
    expect(() =>
      parseAdventureResponse(
        JSON.stringify({
          ...base,
          personRefs: Array.from({ length: 9 }, (_, i) => `p-${i}`),
        }),
      ),
    ).toThrow("invalid-adventure-response");
  });

  it.each(["not-json", '{"kind":"complete"}', '{"kind":"unknown"}'])(
    "rejects malformed or incomplete output: %s",
    (text) => {
      expect(() => parseAdventureResponse(text)).toThrow(
        "invalid-adventure-response",
      );
    },
  );
});
