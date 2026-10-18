import { describe, expect, it } from "vitest";
import { extractJsonObject } from "../src/index";

describe("extractJsonObject", () => {
  it("returns a clean JSON object unchanged", () => {
    const raw = '{"title":"A","lore":"b"}';
    expect(extractJsonObject(raw)).toBe(raw);
  });

  it("extracts a fenced JSON object and prefers it over prose objects", () => {
    expect(
      extractJsonObject(
        'Example: {"title":"example"}\n```json\n{"title":"final"}\n```',
      ),
    ).toBe('{"title":"final"}');
  });

  it("extracts an unlabelled fenced object", () => {
    expect(extractJsonObject('```\n{"title":"A"}\n```')).toBe('{"title":"A"}');
  });

  it("matches JSON fence labels case-insensitively", () => {
    expect(extractJsonObject('```JSON\n{"title":"A"}\n```')).toBe(
      '{"title":"A"}',
    );
  });

  it("extracts the first balanced object from surrounding prose", () => {
    expect(extractJsonObject('Here is the result: {"title":"A"} Thanks.')).toBe(
      '{"title":"A"}',
    );
  });

  it("extracts only the first object when a reply contains multiple objects", () => {
    expect(extractJsonObject('{"title":"A"} {"title":"B"}')).toBe(
      '{"title":"A"}',
    );
  });

  it("ignores stray closing braces after the first balanced object", () => {
    expect(extractJsonObject('{"title":"A"}}}}')).toBe('{"title":"A"}');
  });

  it("tracks nested objects and arrays", () => {
    const raw = '{"items":[{"title":"A"},{"title":"B"}]}';
    expect(extractJsonObject(`prefix ${raw} suffix`)).toBe(raw);
  });

  it("does not treat braces inside strings as structure", () => {
    const raw = '{"lore":"a } b { c"}';
    expect(extractJsonObject(raw)).toBe(raw);
  });

  it("handles escaped quotes and backslashes inside strings", () => {
    const raw = String.raw`{"lore":"she said \"hi\" at C:\\vault"}`;
    expect(extractJsonObject(raw)).toBe(raw);
    expect(JSON.parse(extractJsonObject(raw))).toEqual({
      lore: 'she said "hi" at C:\\vault',
    });
  });

  it("leaves an explicit array envelope intact for caller validation", () => {
    const raw = '[{"title":"A"}]';
    expect(extractJsonObject(raw)).toBe(raw);
    expect(Array.isArray(JSON.parse(extractJsonObject(raw)))).toBe(true);
  });

  it("leaves an explicit string envelope intact for caller validation", () => {
    const raw = '"{\\"title\\":\\"A\\"}"';
    expect(extractJsonObject(raw)).toBe(raw);
    expect(typeof JSON.parse(extractJsonObject(raw))).toBe("string");
  });

  it("leaves fenced array envelopes intact", () => {
    const raw = '```json\n[{"title":"A"}]\n```';
    expect(extractJsonObject(raw)).toBe('[{"title":"A"}]');
  });

  it("returns non-JSON text unchanged", () => {
    expect(extractJsonObject("  no JSON here  ")).toBe("no JSON here");
  });

  it("leaves primitive JSON scalar envelopes for caller validation", () => {
    for (const raw of ["42", "true", "false", "null"]) {
      expect(extractJsonObject(raw)).toBe(raw);
    }
  });

  it("returns malformed balanced JSON for the caller to reject", () => {
    expect(extractJsonObject('{"title":} trailing')).toBe('{"title":}');
  });

  it("returns an unclosed object from its opening brace without repairing it", () => {
    expect(extractJsonObject('prefix {"title":"A"')).toBe('{"title":"A"');
  });

  it("does not mistake another language label for an unlabelled JSON fence", () => {
    const raw = "```typescript\nconst value = 1;\n```";
    expect(extractJsonObject(raw)).toBe(raw);
  });
});
