import { describe, expect, it } from "vitest";
import { unwrapAdventureJsonFence } from "./adventure-json-fence.js";

const body = '{\n  "a": 1\n}';

describe("unwrapAdventureJsonFence", () => {
  it("returns plain text unchanged, including fences inside strings", () => {
    for (const text of ['{"a":1}', '{"a":"```"}', '  {"a":"x\\n```"}\n']) {
      expect(unwrapAdventureJsonFence(text)).toEqual({ ok: true, text });
    }
  });

  it.each([
    ["json label", "```json\n" + body + "\n```\n"],
    ["no label", "```\n" + body + "\n```"],
    ["upper-case label", "```JSON\n" + body + "\n```"],
    ["CRLF", "```json\r\n" + body.replace(/\n/g, "\r\n") + "\r\n```\r\n"],
    ["blank lines around", "\n\n```json\n" + body + "\n```\n\n\n"],
    ["space before label", "``` json\n" + body + "\n```"],
    ["trailing spaces on opening line", "```json \t\n" + body + "\n```"],
  ])("unwraps a single fence with %s", (_name, text) => {
    const result = unwrapAdventureJsonFence(text);
    expect(result.ok).toBe(true);
    if (result.ok) expect(JSON.parse(result.text)).toEqual({ a: 1 });
  });

  it.each([
    ["prose before", "Here is your adventure:\n```json\n{}\n```", null],
    ["prose after", "```json\n{}\n```\nEnjoy!", "text after"],
    ["two blocks", "```json\n{}\n```\n\n```json\n{}\n```", "more than one"],
    ["nested fence line", "```json\n{}\n  ```\n{}\n```", "more than one"],
    ["indented closing fence", "```json\n{}\n  ```", "not closed"],
    ["four-backtick closing line", "```json\n{}\n````", "not closed"],
    [
      "indented four-backtick closing line",
      "```json\n{}\n  ````",
      "not closed",
    ],
    ["unclosed", "```json\n{}\n", "not closed"],
    ["only an opening fence", "```", "not closed"],
    ["other label", "```javascript\n{}\n```", "unsupported label"],
    ["jsonc label", "```jsonc\n{}\n```", "unsupported label"],
    ["closing fence with text", "```json\n{}\n```x", "text after"],
  ])("rejects %s", (_name, text, reason) => {
    const result = unwrapAdventureJsonFence(text);
    if (reason === null) {
      expect(result).toEqual({ ok: true, text });
      return;
    }
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain(reason);
      expect(result.message).toContain("single fenced JSON block");
    }
  });
});
