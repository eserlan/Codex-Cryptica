import { describe, it, expect } from "vitest";
import { extractJsonFromModelResponse } from "./text-generation-context";

describe("extractJsonFromModelResponse", () => {
  it("parses a bare JSON object", () => {
    expect(extractJsonFromModelResponse('{"a":1}')).toEqual({ a: 1 });
  });

  it("extracts JSON embedded in surrounding prose", () => {
    const text = 'Here you go:\n{"name":"Test"}\nHope that helps!';
    expect(extractJsonFromModelResponse(text)).toEqual({ name: "Test" });
  });

  it("returns undefined when no JSON object is present", () => {
    expect(extractJsonFromModelResponse("no json here")).toBeUndefined();
  });

  it("throws when the matched text is not valid JSON", () => {
    expect(() => extractJsonFromModelResponse("{not valid json}")).toThrow();
  });
});
