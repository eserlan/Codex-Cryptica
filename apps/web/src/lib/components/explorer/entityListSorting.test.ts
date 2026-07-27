import { describe, expect, it } from "vitest";
import type { Entity } from "schema";
import { entityEditedAt, sortExplorerEntities } from "./entityListSorting";

function entity(
  id: string,
  title: string,
  updatedAt?: number,
  modifiedAt?: number,
): Entity {
  return {
    id,
    title,
    type: "note",
    status: "active",
    labels: [],
    tags: [],
    aliases: [],
    connections: [],
    content: "",
    updatedAt,
    modifiedAt,
  };
}

describe("entityListSorting", () => {
  it("sorts names in either direction without mutating the source", () => {
    const source = [
      entity("2", "Vault 10"),
      entity("1", "archive"),
      entity("3", "Vault 2"),
    ];

    expect(
      sortExplorerEntities(source, { key: "name", direction: "asc" }).map(
        (item) => item.title,
      ),
    ).toEqual(["archive", "Vault 2", "Vault 10"]);
    expect(
      sortExplorerEntities(source, { key: "name", direction: "desc" }).map(
        (item) => item.title,
      ),
    ).toEqual(["Vault 10", "Vault 2", "archive"]);
    expect(source.map((item) => item.id)).toEqual(["2", "1", "3"]);
  });

  it("prefers modifiedAt and sorts missing dates last when newest is first", () => {
    const source = [
      entity("old", "Old", 10),
      entity("missing", "Missing"),
      entity("new", "New", 20, 30),
    ];

    expect(entityEditedAt(source[2])).toBe(30);
    expect(
      sortExplorerEntities(source, {
        key: "updated",
        direction: "desc",
      }).map((item) => item.id),
    ).toEqual(["new", "old", "missing"]);
    expect(
      sortExplorerEntities(source, {
        key: "updated",
        direction: "asc",
      }).map((item) => item.id),
    ).toEqual(["missing", "old", "new"]);
  });
});
