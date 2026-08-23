import { describe, it, expect } from "vitest";
import { createIncrementalJsonScanner } from "./incremental-json";

describe("createIncrementalJsonScanner", () => {
  it("emits nothing until the first key/value pair is complete", () => {
    const scan = createIncrementalJsonScanner();
    expect(scan('{"nam')).toEqual([]);
    expect(scan('{"name": "Ma')).toEqual([]);
  });

  it("emits a string field as soon as its closing quote and terminator arrive", () => {
    const scan = createIncrementalJsonScanner();
    expect(scan('{"name": "Ma')).toEqual([]);
    expect(scan('{"name": "Maw of the Uncounted"')).toEqual([
      { key: "name", value: "Maw of the Uncounted" },
    ]);
  });

  it("does not re-emit an already-reported field on later calls", () => {
    const scan = createIncrementalJsonScanner();
    scan('{"name": "Maw"');
    expect(scan('{"name": "Maw", "summary": "A')).toEqual([]);
    expect(
      scan('{"name": "Maw", "summary": "A wagon-sized aberration"'),
    ).toEqual([{ key: "summary", value: "A wagon-sized aberration" }]);
  });

  it("emits multiple fields that complete between calls, in order", () => {
    const scan = createIncrementalJsonScanner();
    const events = scan('{"name": "Maw", "summary": "Desert horror", "hp": 42');
    expect(events).toEqual([
      { key: "name", value: "Maw" },
      { key: "summary", value: "Desert horror" },
    ]);
  });

  it("waits for a nested object value to fully close before emitting", () => {
    const scan = createIncrementalJsonScanner();
    expect(scan('{"stats": {"str": 18, "dex": 1')).toEqual([]);
    expect(scan('{"stats": {"str": 18, "dex": 12}')).toEqual([
      { key: "stats", value: { str: 18, dex: 12 } },
    ]);
  });

  it("waits for a nested array value to fully close before emitting", () => {
    const scan = createIncrementalJsonScanner();
    expect(scan('{"tags": ["desert", "aberr')).toEqual([]);
    expect(scan('{"tags": ["desert", "aberration"]')).toEqual([
      { key: "tags", value: ["desert", "aberration"] },
    ]);
  });

  it("handles escaped quotes and braces inside a string value", () => {
    const scan = createIncrementalJsonScanner();
    const events = scan(
      String.raw`{"quote": "She said \"beware the {maw}\" and left"`,
    );
    expect(events).toEqual([
      { key: "quote", value: 'She said "beware the {maw}" and left' },
    ]);
  });

  it("handles a nested array of objects", () => {
    const scan = createIncrementalJsonScanner();
    const events = scan(
      '{"abilities": [{"name": "Bite", "dmg": 12}, {"name": "Swallow", "dmg": 20}]',
    );
    expect(events).toEqual([
      {
        key: "abilities",
        value: [
          { name: "Bite", dmg: 12 },
          { name: "Swallow", dmg: 20 },
        ],
      },
    ]);
  });

  it("handles boolean, null, and numeric primitive values", () => {
    const scan = createIncrementalJsonScanner();
    const events = scan(
      '{"legendary": true, "extinct": false, "sighted": null, "cr": 7.5',
    );
    expect(events).toEqual([
      { key: "legendary", value: true },
      { key: "extinct", value: false },
      { key: "sighted", value: null },
    ]);
  });

  it("tolerates a leading code fence and prose before the object", () => {
    const scan = createIncrementalJsonScanner();
    const events = scan('Sure, here you go:\n```json\n{"name": "Maw"');
    expect(events).toEqual([{ key: "name", value: "Maw" }]);
  });

  it("stops cleanly on trailing unbalanced garbage without emitting a bad field", () => {
    const scan = createIncrementalJsonScanner();
    const events = scan('{"name": "Maw"} \n\nSome trailing commentary {');
    expect(events).toEqual([{ key: "name", value: "Maw" }]);
  });

  it("returns nothing for a buffer with no object at all", () => {
    const scan = createIncrementalJsonScanner();
    expect(scan("Thinking about the request...")).toEqual([]);
  });

  it("processes a field-by-field growing stream end to end", () => {
    const scan = createIncrementalJsonScanner();
    const chunks = [
      '{"nam',
      'e": "Maw of the Uncounted", "sum',
      'mary": "A wagon-sized desert aberration",',
      ' "lore": "Once a car',
      'avan beast, twisted by old magic."}',
    ];

    let buffer = "";
    const allFields: Array<{ key: string; value: unknown }> = [];
    for (const chunk of chunks) {
      buffer += chunk;
      allFields.push(...scan(buffer));
    }

    expect(allFields).toEqual([
      { key: "name", value: "Maw of the Uncounted" },
      { key: "summary", value: "A wagon-sized desert aberration" },
      { key: "lore", value: "Once a caravan beast, twisted by old magic." },
    ]);
  });
});
