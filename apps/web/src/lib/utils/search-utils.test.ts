import { describe, it, expect } from "vitest";
import { extractIdAndDoc, type SearchDocument } from "./search-utils";

describe("extractIdAndDoc", () => {
  it("extracts id when item is a primitive string or number", () => {
    expect(extractIdAndDoc("entity-123")).toEqual({
      id: "entity-123",
      doc: undefined,
    });
    expect(extractIdAndDoc(456)).toEqual({
      id: "456",
      doc: undefined,
    });
  });

  it("canonicalizes missing/empty string IDs to undefined", () => {
    expect(extractIdAndDoc("")).toEqual({ id: undefined, doc: undefined });
    expect(extractIdAndDoc("undefined")).toEqual({
      id: undefined,
      doc: undefined,
    });
    expect(extractIdAndDoc("null")).toEqual({
      id: undefined,
      doc: undefined,
    });
  });

  it("returns undefined for null or non-object primitives", () => {
    expect(extractIdAndDoc(null)).toEqual({ id: undefined, doc: undefined });
    expect(extractIdAndDoc(undefined)).toEqual({
      id: undefined,
      doc: undefined,
    });
    expect(extractIdAndDoc(true)).toEqual({ id: undefined, doc: undefined });
  });

  it("extracts top-level id and doc when both are present", () => {
    const doc: SearchDocument = {
      id: "doc-1",
      title: "Doc Title",
      content: "Content",
      path: "/docs/1",
    };
    expect(extractIdAndDoc({ id: "item-1", doc })).toEqual({
      id: "item-1",
      doc,
    });
  });

  it("supports FlexSearch abbreviated properties 'd', 'key', and 'i'", () => {
    const doc: SearchDocument = {
      id: "doc-2",
      title: "Second Doc",
      content: "Some text",
      path: "/docs/2",
    };
    expect(extractIdAndDoc({ key: "key-123", d: doc })).toEqual({
      id: "key-123",
      doc,
    });
    expect(extractIdAndDoc({ i: "i-456", d: doc })).toEqual({
      id: "i-456",
      doc,
    });
  });

  it("falls back to doc.id when top-level id is missing", () => {
    const doc: SearchDocument = {
      id: "inner-id",
      title: "Inner Doc",
      content: "Text",
      path: "/docs/inner",
    };
    expect(extractIdAndDoc({ doc })).toEqual({
      id: "inner-id",
      doc,
    });
  });

  it("falls back to doc.path when neither top-level id nor doc.id exists", () => {
    const docWithoutId = {
      title: "Path Doc",
      content: "Text",
      path: "/docs/by-path",
    } as unknown as SearchDocument;

    expect(extractIdAndDoc({ doc: docWithoutId })).toEqual({
      id: "/docs/by-path",
      doc: docWithoutId,
    });
  });
});
