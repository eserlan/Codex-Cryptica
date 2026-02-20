import type { Entity, Connection } from "schema";
import { sanitizeId } from "../../utils/markdown";
import type { LocalEntity } from "./types";
import { deleteOpfsEntry } from "../../utils/opfs";

/**
 * ENTITY MUTATION GUARDRAIL:
 * All functions that modify an entity MUST set `synced: false` to ensure
 * the Sync Reminder system correctly tracks unsaved changes.
 */

export function createEntity(
  title: string,
  type: Entity["type"] = "note",
  initialData: Partial<Entity> = {},
  existingEntities: Record<string, LocalEntity>,
): LocalEntity {
  const baseId = initialData.id || sanitizeId(title) || "untitled";

  // Ensure unique ID if not explicitly requested via initialData or if requested ID is already taken
  let id = baseId;
  if (!initialData.id || existingEntities[id]) {
    let counter = 1;
    while (existingEntities[id]) {
      id = `${baseId}-${counter}`;
      counter++;
    }
  }

  return {
    id,
    type,
    title,
    tags: [],
    labels: [],
    connections: [],
    content: "",
    lore: "",
    metadata: {},
    synced: false,
    ...initialData,
  } as LocalEntity;
}

export function updateEntity(
  entities: Record<string, LocalEntity>,
  id: string,
  updates: Partial<LocalEntity>,
): { entities: Record<string, LocalEntity>; updated: LocalEntity | null } {
  const entity = entities[id];
  if (!entity) return { entities, updated: null };

  const updated = { ...entity, ...updates, synced: false } as LocalEntity;
  return {
    entities: { ...entities, [id]: updated },
    updated,
  };
}

export async function deleteEntity(
  vaultDir: FileSystemDirectoryHandle,
  entities: Record<string, LocalEntity>,
  id: string,
): Promise<{
  entities: Record<string, LocalEntity>;
  deletedEntity: LocalEntity | null;
  modifiedIds: string[];
}> {
  const entity = entities[id];
  if (!entity) return { entities, deletedEntity: null, modifiedIds: [] };

  const path = entity._path || [`${id}.md`];

  // 1. Delete file from OPFS
  await deleteOpfsEntry(vaultDir, path);

  // 2. Delete images from OPFS
  if (entity.image) {
    try {
      const imagePath = entity.image.split("/");
      await deleteOpfsEntry(vaultDir, imagePath);
    } catch (e) {
      console.warn("Failed to delete image", e);
    }
  }
  if (entity.thumbnail) {
    try {
      const thumbPath = entity.thumbnail.split("/");
      await deleteOpfsEntry(vaultDir, thumbPath);
    } catch (e) {
      console.warn("Failed to delete thumbnail", e);
    }
  }

  // 3. Remove from memory
  const newEntities = { ...entities };
  delete newEntities[id];

  // 4. Cleanup connections FROM other nodes TO this node
  // Since inboundConnections is now derived, we just need to ensure
  // any entity that linked to this one is updated.
  const modifiedIds: string[] = [];
  for (const sourceId in newEntities) {
    const sourceEntity = newEntities[sourceId];
    const hasConnection = sourceEntity.connections.some((c) => c.target === id);
    if (hasConnection) {
      newEntities[sourceId] = {
        ...sourceEntity,
        connections: sourceEntity.connections.filter((c) => c.target !== id),
      };
      modifiedIds.push(sourceId);
    }
  }

  return {
    entities: newEntities,
    deletedEntity: entity,
    modifiedIds,
  };
}

export function addLabel(
  entities: Record<string, LocalEntity>,
  id: string,
  label: string,
): { entities: Record<string, LocalEntity>; updated: LocalEntity | null } {
  const entity = entities[id];
  if (!entity) return { entities, updated: null };

  const labels = entity.labels || [];
  if (labels.includes(label)) return { entities, updated: null };

  const updated = {
    ...entity,
    labels: [...labels, label],
    synced: false,
  } as LocalEntity;
  return {
    entities: { ...entities, [id]: updated },
    updated,
  };
}

export function removeLabel(
  entities: Record<string, LocalEntity>,
  id: string,
  label: string,
): { entities: Record<string, LocalEntity>; updated: LocalEntity | null } {
  const entity = entities[id];
  if (!entity) return { entities, updated: null };

  const labels = entity.labels || [];
  if (!labels.includes(label)) return { entities, updated: null };

  const updated = {
    ...entity,
    labels: labels.filter((l) => l !== label),
    synced: false,
  } as LocalEntity;
  return {
    entities: { ...entities, [id]: updated },
    updated,
  };
}

export function addConnection(
  entities: Record<string, LocalEntity>,
  sourceId: string,
  targetId: string,
  type: string,
  label?: string,
): {
  entities: Record<string, LocalEntity>;
  updatedSource: LocalEntity | null;
} {
  const source = entities[sourceId];
  if (!source) return { entities, updatedSource: null };

  const connection: Connection = {
    target: targetId,
    type,
    label,
    strength: 1,
  };

  const updatedSource = {
    ...source,
    connections: [...source.connections, connection],
    synced: false,
  } as LocalEntity;

  return {
    entities: { ...entities, [sourceId]: updatedSource },
    updatedSource,
  };
}

export function updateConnection(
  entities: Record<string, LocalEntity>,
  sourceId: string,
  targetId: string,
  oldType: string,
  newType: string,
  newLabel?: string,
): {
  entities: Record<string, LocalEntity>;
  updatedSource: LocalEntity | null;
} {
  const source = entities[sourceId];
  if (!source) return { entities, updatedSource: null };

  const connections = source.connections.map((c) => {
    if (c.target === targetId && c.type === oldType) {
      return { ...c, type: newType, label: newLabel };
    }
    return c;
  });

  const updatedSource = {
    ...source,
    connections,
    synced: false,
  } as LocalEntity;

  return {
    entities: { ...entities, [sourceId]: updatedSource },
    updatedSource,
  };
}

export function removeConnection(
  entities: Record<string, LocalEntity>,
  sourceId: string,
  targetId: string,
  type: string,
): {
  entities: Record<string, LocalEntity>;
  updatedSource: LocalEntity | null;
} {
  const source = entities[sourceId];
  if (!source) return { entities, updatedSource: null };

  const connections = source.connections.filter(
    (c) => !(c.target === targetId && c.type === type),
  );

  const updatedSource = {
    ...source,
    connections,
    synced: false,
  } as LocalEntity;

  return {
    entities: { ...entities, [sourceId]: updatedSource },
    updatedSource,
  };
}
