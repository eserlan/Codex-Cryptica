import type { Entity } from "schema";
import type { LocalEntity } from "$lib/stores/vault/types";

export function mergeGuestEntityUpdate(
  currentEntity: LocalEntity | undefined,
  updatedEntity: Entity,
): LocalEntity {
  const normalizedUpdate = {
    ...updatedEntity,
    _path:
      typeof updatedEntity._path === "string"
        ? [updatedEntity._path]
        : updatedEntity._path,
  } satisfies LocalEntity;

  return {
    ...currentEntity,
    ...normalizedUpdate,
    content:
      updatedEntity.content !== undefined && updatedEntity.content !== ""
        ? updatedEntity.content
        : (currentEntity?.content ?? ""),
    _path: normalizedUpdate._path ?? currentEntity?._path,
  };
}
