import { describe, expect, it } from "vitest";
import {
  DEFAULT_SEARCH_ENTITY_ZOOM,
  resolveSearchResultEntityId,
} from "./search-focus";

describe("search focus helpers", () => {
  it("resolves the existing search result id", () => {
    expect(
      resolveSearchResultEntityId({
        id: "my-note",
        path: "my-note.md",
      }),
    ).toBe("my-note");
  });

  it("derives an id from the path when search results are missing ids", () => {
    expect(
      resolveSearchResultEntityId({
        id: undefined,
        path: "folder/the-crone.md",
      }),
    ).toBe("the-crone");
  });

  it("returns null when no usable entity id exists", () => {
    expect(
      resolveSearchResultEntityId({
        id: undefined,
        path: undefined,
      }),
    ).toBeNull();
  });

  it("uses the expected zoom level for search focus", () => {
    expect(DEFAULT_SEARCH_ENTITY_ZOOM).toBe(2);
  });
});
