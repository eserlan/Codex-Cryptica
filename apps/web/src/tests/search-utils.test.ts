import { describe, it, expect } from "vitest";
import { extractIdAndDoc } from "../lib/utils/search-utils";

describe("extractIdAndDoc", () => {
  it("should extract ID from a simple string result", () => {
    const { id, doc } = extractIdAndDoc("node-1");
    expect(id).toBe("node-1");
    expect(doc).toBeUndefined();
  });

  it("should extract ID from an object with i property", () => {
    const { id } = extractIdAndDoc({ i: "node-2" });
    expect(id).toBe("node-2");
  });

  it("should extract ID from an object with id property", () => {
    const { id } = extractIdAndDoc({ id: "node-3" });
    expect(id).toBe("node-3");
  });

  it("should extract ID from an enriched result (doc.id)", () => {
    const result = {
      id: "node-4",
      doc: {
        id: "node-4",
        title: "Title",
        path: "path.md",
        content: "content",
      },
    };
    const { id, doc } = extractIdAndDoc(result);
    expect(id).toBe("node-4");
    expect(doc?.title).toBe("Title");
  });

  it("should fallback to doc.id if top-level id is missing", () => {
    const result = {
      doc: {
        id: "node-5",
        title: "Title",
      },
    };
    const { id } = extractIdAndDoc(result);
    expect(id).toBe("node-5");
  });

  it("should fallback to path if both top-level and doc.id are missing", () => {
    const result = {
      doc: {
        title: "The Crone",
        path: "the-crone.md",
      },
    };
    const { id } = extractIdAndDoc(result);
    expect(id).toBe("the-crone.md");
  });

  it("should return undefined for invalid IDs", () => {
    expect(extractIdAndDoc("undefined").id).toBeUndefined();
    expect(extractIdAndDoc("null").id).toBeUndefined();
    expect(extractIdAndDoc("").id).toBeUndefined();
    expect(extractIdAndDoc(null).id).toBeUndefined();
  });
});
