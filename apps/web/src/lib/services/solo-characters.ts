import type { Entity } from "schema";

/** The Character entities a solo party can draw from, as id and display name. */
export function characterChoices(
  entities: Record<string, Pick<Entity, "id" | "type" | "title">> | undefined,
): { id: string; name: string }[] {
  return Object.values(entities ?? {})
    .filter((entity) => entity.type === "character")
    .map((entity) => ({ id: entity.id, name: entity.title }));
}
