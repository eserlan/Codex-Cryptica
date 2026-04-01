import { beforeEach, describe, expect, it, vi } from "vitest";

let searchFocus: typeof import("./search-focus");

beforeEach(async () => {
  vi.resetModules();
  searchFocus = await import("./search-focus");
});

describe("search focus helpers", () => {
  it("resolves the existing search result id", () => {
    expect(
      searchFocus.resolveSearchResultEntityId({
        id: "my-note",
        path: "my-note.md",
      }),
    ).toBe("my-note");
  });

  it("derives an id from the path when search results are missing ids", () => {
    expect(
      searchFocus.resolveSearchResultEntityId({
        id: undefined,
        path: "folder/the-crone.md",
      }),
    ).toBe("the-crone");
  });

  it("returns null when no usable entity id exists", () => {
    expect(
      searchFocus.resolveSearchResultEntityId({
        id: undefined,
        path: undefined,
      }),
    ).toBeNull();
  });

  it("uses the expected zoom level for search focus", () => {
    expect(searchFocus.DEFAULT_SEARCH_ENTITY_ZOOM).toBe(2);
  });

  it("buffers search focus events until they are consumed", () => {
    searchFocus.dispatchSearchEntityFocus("buffered-note", 3);

    expect(searchFocus.consumePendingSearchEntityFocus()).toEqual({
      entityId: "buffered-note",
      zoom: 3,
    });
  });

  it("does not replay a focus event after it has already been handled", () => {
    searchFocus.dispatchSearchEntityFocus("live-note", 4);
    searchFocus.markSearchEntityFocusHandled(1);

    expect(searchFocus.consumePendingSearchEntityFocus()).toBeNull();
  });
});
