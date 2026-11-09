import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildOperationPipelineBody,
  normalizeGenerateContentRequest,
} from "./generation-request";

afterEach(() => vi.restoreAllMocks());

describe("generation request normalisation", () => {
  it.each([
    "hello",
    ["hello"],
    { parts: ["hello"] },
    { contents: [{ parts: [{ text: "hello" }] }] },
  ])("normalises supported input %j without mutating it", (request) => {
    const before = JSON.stringify(request);
    expect(normalizeGenerateContentRequest(request, undefined)).toEqual({
      contents: [{ role: "user", parts: [{ text: "hello" }] }],
      generationConfig: {},
      finalSysInst: undefined,
      isPlainTextRequest: true,
    });
    expect(JSON.stringify(request)).toBe(before);
  });

  it("sanitises scalar text and respects system instruction precedence", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const request = {
      contents: [{ parts: [{ text: 42 }] }],
      system_instruction: { parts: [{ text: "request instruction" }] },
      generation_config: { response_modalities: ["TEXT"] },
    };
    expect(normalizeGenerateContentRequest(request, undefined)).toMatchObject({
      contents: [{ parts: [{ text: "42" }] }],
      finalSysInst: "request instruction",
      isPlainTextRequest: true,
    });
    expect(
      normalizeGenerateContentRequest(request, "model instruction")
        .finalSysInst,
    ).toBe("model instruction");
    expect(
      normalizeGenerateContentRequest(
        { ...request, systemInstruction: "string instruction" },
        undefined,
      ).finalSysInst,
    ).toBe("string instruction");
  });

  it.each([
    { contents: [{ parts: [{ inlineData: { data: "image" } }] }] },
    {
      contents: [{ parts: [{ text: "draw" }] }],
      generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
    },
  ])("keeps non-text requests off the operation pipeline", (request) => {
    expect(
      normalizeGenerateContentRequest(request, undefined).isPlainTextRequest,
    ).toBe(false);
  });

  it("preserves empty parts and stringifies simple non-string inputs", () => {
    expect(
      normalizeGenerateContentRequest({ contents: [{}] }, undefined).contents,
    ).toEqual([{ role: "user", parts: [] }]);
    expect(
      normalizeGenerateContentRequest(null, undefined).contents[0].parts,
    ).toEqual([{ text: "null" }]);
  });
});

describe("operation pipeline body", () => {
  it("maps roles and snake-case settings, preserving zero values and schemas", () => {
    expect(
      buildOperationPipelineBody({
        finalSysInst: "system",
        contents: [
          {
            role: "model",
            parts: [{ text: "a" }, { inlineData: {} }, { text: "b" }],
          },
          { role: "other" },
        ],
        generationConfig: {
          response_mime_type: "application/json",
          response_schema: { type: "array" },
          temperature: 0,
          top_p: 0,
          max_output_tokens: 0,
        },
      }),
    ).toEqual({
      operation: "structured-generation",
      messages: [
        { role: "system", content: "system" },
        { role: "assistant", content: "ab" },
        { role: "user", content: "" },
      ],
      schema: { type: "array" },
      temperature: 0,
      topP: 0,
      maxOutputTokens: 0,
    });
  });

  it("omits absent optional settings and uses freeform generation", () => {
    expect(
      buildOperationPipelineBody({ contents: [], generationConfig: undefined }),
    ).toEqual({ operation: "freeform-generation", messages: [] });
  });

  it("prefers camel-case settings when both spellings are supplied", () => {
    expect(
      buildOperationPipelineBody({
        contents: [],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {},
          response_schema: { ignored: true },
          topP: 1,
          top_p: 0,
          maxOutputTokens: 10,
          max_output_tokens: 0,
        },
      }),
    ).toMatchObject({
      schema: {},
      topP: 1,
      maxOutputTokens: 10,
      operation: "structured-generation",
    });
  });
});
