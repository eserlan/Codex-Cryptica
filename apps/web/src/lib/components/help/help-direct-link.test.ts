import { describe, expect, it } from "vitest";
import { getHelpArticleIdFromHash } from "./help-direct-link";

describe("getHelpArticleIdFromHash", () => {
  it("returns the article id from a standalone Help hash", () => {
    expect(getHelpArticleIdFromHash("#help/family-tree")).toBe("family-tree");
  });

  it("returns null for hashes that do not identify an article", () => {
    expect(getHelpArticleIdFromHash("#section/family-tree")).toBeNull();
    expect(getHelpArticleIdFromHash("#help/")).toBeNull();
  });
});
