import { describe, expect, it } from "vitest";
import { bytesFromIndexedObject } from "../src/index";

describe("bytesFromIndexedObject", () => {
  it("rebuilds bytes in index order from a JSON-serialised typed array", () => {
    const json = JSON.parse(JSON.stringify(new Uint8Array([123, 34, 97, 125])));
    expect(Array.from(bytesFromIndexedObject(json))).toEqual([
      123, 34, 97, 125,
    ]);
  });

  it("returns an empty array for null, undefined or non-object input", () => {
    expect(bytesFromIndexedObject(null).length).toBe(0);
    expect(bytesFromIndexedObject(undefined).length).toBe(0);
    expect(bytesFromIndexedObject(42).length).toBe(0);
  });
});
