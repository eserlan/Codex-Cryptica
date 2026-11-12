import { describe, expect, it } from "vitest";
import {
  adventureTurnResponseSchema,
  buildAdventureContentInput,
  parseAdventureResponse,
} from "./adventure-response-schema";
import { completeResponse } from "./adventure-generation.test-fixtures";

describe("adventure structured response contract", () => {
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

  it.each(["not-json", '{"kind":"complete"}', '{"kind":"unknown"}'])(
    "rejects malformed or incomplete output: %s",
    (text) => {
      expect(() => parseAdventureResponse(text)).toThrow(
        "invalid-adventure-response",
      );
    },
  );
});
