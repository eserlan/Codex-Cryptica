import type { Entity } from "schema";

export type EntitySortKey = "name" | "updated";
export type EntitySortDirection = "asc" | "desc";

export interface EntitySortOptions {
  key: EntitySortKey;
  direction: EntitySortDirection;
}

export function entityEditedAt(entity: Entity): number {
  return entity.modifiedAt ?? entity.updatedAt ?? 0;
}

export function compareExplorerEntities(
  a: Entity,
  b: Entity,
  options: EntitySortOptions,
): number {
  const primary =
    options.key === "updated"
      ? entityEditedAt(a) - entityEditedAt(b)
      : (a.title ?? "").localeCompare(b.title ?? "", undefined, {
          sensitivity: "base",
          numeric: true,
        });
  if (primary !== 0) {
    return options.direction === "asc" ? primary : -primary;
  }

  return (a.title ?? "").localeCompare(b.title ?? "", undefined, {
    sensitivity: "base",
    numeric: true,
  });
}

export function sortExplorerEntities(
  entities: Entity[],
  options: EntitySortOptions,
): Entity[] {
  return [...entities].sort((a, b) => compareExplorerEntities(a, b, options));
}
