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

  it("offers an optional packageSceneId in the complete visible patch", () => {
    const visiblePatch =
      adventureTurnResponseSchema.oneOf[0].properties.visiblePatch;
    expect(visiblePatch.properties.packageSceneId).toBeDefined();
    expect(visiblePatch.required).not.toContain("packageSceneId");
    const base = JSON.parse(completeResponse) as {
      visiblePatch: Record<string, unknown>;
    };
    expect(parseAdventureResponse(completeResponse)).toMatchObject({
      kind: "complete",
    });
    expect(
      parseAdventureResponse(
        JSON.stringify({
          ...base,
          visiblePatch: { ...base.visiblePatch, packageSceneId: "scene-2" },
        }),
      ),
    ).toMatchObject({ visiblePatch: { packageSceneId: "scene-2" } });
  });

  it("offers optional bounded packageEvents", () => {
    const complete = adventureTurnResponseSchema.oneOf[0];
    expect(complete.properties.packageEvents.maxItems).toBe(8);
    expect(complete.properties.packageEvents.items.additionalProperties).toBe(
      false,
    );
    expect(complete.required).not.toContain("packageEvents");
    const base = JSON.parse(completeResponse) as Record<string, unknown>;
    const event = {
      recordId: "enc-1",
      kind: "encounter",
      to: "resolved",
      certainty: "confirmed",
      note: "Done.",
    };
    const parse = (packageEvents: unknown) =>
      parseAdventureResponse(JSON.stringify({ ...base, packageEvents }));
    expect(parseAdventureResponse(completeResponse)).toMatchObject({
      kind: "complete",
    });
    expect(parse([event])).toMatchObject({ packageEvents: [event] });
    expect(() => parse(Array(9).fill(event))).toThrow(
      "invalid-adventure-response",
    );
    expect(() => parse([{ ...event, id: "x" }])).toThrow(
      "invalid-adventure-response",
    );
  });

  it("offers optional bounded causalCommitments", () => {
    const complete = adventureTurnResponseSchema.oneOf[0];
    expect(complete.properties.causalCommitments.maxItems).toBe(4);
    expect(complete.required).not.toContain("causalCommitments");
    const base = JSON.parse(completeResponse) as Record<string, unknown>;
    const entry = {
      kind: "motive",
      commitmentClass: "supporting-explanation",
      subject: "Mara",
      summary: "Guides travellers to fund the mill repairs.",
    };
    const parse = (causalCommitments: unknown) =>
      parseAdventureResponse(JSON.stringify({ ...base, causalCommitments }));
    expect(parse([entry])).toMatchObject({ causalCommitments: [entry] });
    expect(() => parse(Array(5).fill(entry))).toThrow(
      "invalid-adventure-response",
    );
    expect(() => parse([{ ...entry, kind: "unknown" }])).toThrow(
      "invalid-adventure-response",
    );
  });

  it("offers optional bounded actorEvents", () => {
    const complete = adventureTurnResponseSchema.oneOf[0];
    expect(complete.properties.actorEvents.maxItems).toBe(8);
    expect(complete.required).not.toContain("actorEvents");
    const base = JSON.parse(completeResponse) as Record<string, unknown>;
    const event = {
      actorId: "actor-maren-holt",
      status: "present",
      disposition: "hostile",
      fact: "Refused to talk.",
      certainty: "confirmed",
      note: "Maren turned hostile.",
    };
    const parse = (actorEvents: unknown) =>
      parseAdventureResponse(JSON.stringify({ ...base, actorEvents }));
    expect(parse([event])).toMatchObject({ actorEvents: [event] });
    expect(() => parse(Array(9).fill(event))).toThrow(
      "invalid-adventure-response",
    );
    expect(() => parse([{ ...event, id: "x" }])).toThrow(
      "invalid-adventure-response",
    );
    expect(() => parse([{ ...event, disposition: "angry" }])).toThrow(
      "invalid-adventure-response",
    );
    expect(() => parse([{ ...event, status: "unknown" }])).toThrow(
      "invalid-adventure-response",
    );
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
