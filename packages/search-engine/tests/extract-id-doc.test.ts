import { describe, it, expect } from "vitest";
import { extractIdAndDoc } from "../src";

describe("extractIdAndDoc", () => {
  it("returns id and doc from a FlexSearch enriched object ({ id, doc })", () => {
    const item = { id: "a", doc: { id: "a", title: "Test" } };
    const result = extractIdAndDoc(item);
    expect(result.id).toBe("a");
    expect(result.doc).toEqual({ id: "a", title: "Test" });
  });

  it("returns id and doc from a short-form enriched object ({ d })", () => {
    const item = { d: { id: "b", title: "Short" } };
    const result = extractIdAndDoc(item);
    expect(result.id).toBe("b");
    expect(result.doc).toEqual({ id: "b", title: "Short" });
  });

  it("falls back to item itself when no doc/d present", () => {
    const item = { id: "z", title: "Plain" };
    const result = extractIdAndDoc(item);
    expect(result.id).toBe("z");
    expect(result.doc).toEqual({ id: "z", title: "Plain" });
  });

  it("handles a plain string id", () => {
    const result = extractIdAndDoc("x");
    // id comes from item.id which is undefined on a string, so falls to item itself
    expect(result.doc).toBe("x");
  });

  it("returns the object itself as id when no id field is present", () => {
    const obj = {};
    const result = extractIdAndDoc(obj);
    // item.id is undefined, so id = undefined || item = the object itself
    expect(result.id).toBe(obj);
    expect(result.doc).toBe(obj);
  });

  it("prefers doc.id over top-level id in enriched objects", () => {
    const item = { id: "top", doc: { id: "nested", title: "Nested" } };
    const result = extractIdAndDoc(item);
    // doc branch: id = item.id || item.doc?.id
    expect(result.id).toBe("top");
    expect(result.doc).toEqual({ id: "nested", title: "Nested" });
  });
});
