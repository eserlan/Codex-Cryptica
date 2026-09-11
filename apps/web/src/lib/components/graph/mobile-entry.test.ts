import { describe, expect, it } from "vitest";
import { resolveMobileEntryId } from "./mobile-entry";
import type { Entity } from "schema";

const entity = (id: string, overrides: Partial<Entity> = {}): Entity =>
  ({
    id,
    title: id,
    type: "note",
    labels: [],
    connections: [],
    content: "",
    ...overrides,
  }) as Entity;

describe("resolveMobileEntryId", () => {
  it("prefers an explicitly selected entity", () => {
    const entities = [
      entity("important", { labels: ["important"] }),
      entity("selected"),
    ];

    expect(resolveMobileEntryId(entities, "selected", {})).toBe("selected");
  });

  it("falls back from important to recent to connected and then first", () => {
    expect(
      resolveMobileEntryId(
        [entity("a"), entity("important", { labels: ["Important"] })],
        null,
        {},
      ),
    ).toBe("important");
    expect(
      resolveMobileEntryId(
        [entity("old", { updatedAt: 1 }), entity("recent", { modifiedAt: 2 })],
        null,
        {},
      ),
    ).toBe("recent");
    expect(
      resolveMobileEntryId([entity("a"), entity("hub")], null, { hub: [{}] }),
    ).toBe("hub");
    expect(
      resolveMobileEntryId([entity("first"), entity("second")], null, {}),
    ).toBe("first");
  });

  it("returns null for an empty graph", () => {
    expect(resolveMobileEntryId([], null, {})).toBeNull();
  });
});
