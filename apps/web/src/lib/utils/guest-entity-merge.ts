import type { Entity } from "schema";

export function mergeGuestEntityUpdate(
  currentEntity: Entity | undefined,
  updatedEntity: Entity,
): Entity {
  return {
    ...currentEntity,
    ...updatedEntity,
    content:
      updatedEntity.content !== undefined && updatedEntity.content !== ""
        ? updatedEntity.content
        : currentEntity?.content,
    _path:
      typeof updatedEntity._path === "string"
        ? [updatedEntity._path]
        : (updatedEntity._path ?? currentEntity?._path),
  } as Entity;
}
