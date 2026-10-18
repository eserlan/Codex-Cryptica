import { describe, expect, it } from "vitest";
import { parseFencedJson } from "./llm-response-utils";

describe("parseFencedJson", () => {
  it("parses plain and fenced JSON", () => {
    expect(parseFencedJson('{"a":1}')).toEqual({ a: 1 });
    expect(parseFencedJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it("tolerates a trailing comma before a closing brace or bracket", () => {
    expect(parseFencedJson('{"a": "b",\n"c": "d",\n}')).toEqual({
      a: "b",
      c: "d",
    });
    expect(parseFencedJson('{"list": [1, 2,],}')).toEqual({ list: [1, 2] });
  });

  it("leaves commas and escaped quotes inside strings untouched", () => {
    expect(parseFencedJson('{"a": "x, }", "b": "say \\"hi,\\" ]",}')).toEqual({
      a: "x, }",
      b: 'say "hi," ]',
    });
  });

  it("still throws on genuinely malformed JSON", () => {
    expect(() => parseFencedJson('{"a": "b" "c": 1}')).toThrow();
    expect(() => parseFencedJson('{"a": ')).toThrow();
  });
});
