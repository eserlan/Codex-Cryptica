import type { Entity, Connection } from "schema";
import { sanitizeId } from "../../utils/markdown";
import type { LocalEntity, BatchCreateInput } from "./types";
import { deleteOpfsEntry } from "../../utils/opfs";

/**
 * ENTITY MUTATION GUARDRAIL:
 * Metadata updates and other modifications are tracked via updatedAt.
 */

function applyAutoLabels(entity: LocalEntity): LocalEntity {
  const hasEndDate =
    entity.end_date &&
    typeof entity.end_date.year === "number" &&
    Number.isFinite(entity.end_date.year);
  const labels = entity.labels ? [...entity.labels] : [];
  const hasPastLabel = labels.includes("past");

  if (hasEndDate && !hasPastLabel) {
    labels.push("past");
  } else if (!hasEndDate && hasPastLabel) {
    const index = labels.indexOf("past");
    if (index !== -1) {
      labels.splice(index, 1);
    }
  }

  entity.labels = labels;
  return entity;
}

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

  const entity = {
    id,
    type,
    title,
    tags: [],
    labels: [],
    connections: [],
    content: "",
    lore: "",
    metadata: {},
    updatedAt: Date.now(),
    createdAt: Date.now(),
    modifiedAt: Date.now(),
    ...initialData,
  } as LocalEntity;

  if (entity.parent) {
    entity.parent = sanitizeId(entity.parent);
  }

  return applyAutoLabels(entity);
}

export function updateEntity(
  entities: Record<string, LocalEntity>,
  id: string,
  updates: Partial<LocalEntity>,
): { entities: Record<string, LocalEntity>; updated: LocalEntity | null } {
  const entity = entities[id];
  if (!entity) return { entities, updated: null };

  let updated = {
    ...entity,
    ...updates,
    updatedAt: Date.now(),
    modifiedAt: Date.now(),
    // createdAt is preserved via the spread above; never overwritten on update.
  } as LocalEntity;

  if (updated.parent) {
    updated.parent = sanitizeId(updated.parent);
  }

  updated = applyAutoLabels(updated);

  return {
    entities: { ...entities, [id]: updated },
    updated,
  };
}

export async function deleteEntity(
  vaultDir: FileSystemDirectoryHandle,
  entities: Record<string, LocalEntity>,
  id: string,
  inboundConnections?: Record<string, { sourceId: string; connection: any }[]>,
  childrenIds?: string[],
): Promise<{
  entities: Record<string, LocalEntity>;
  deletedEntity: LocalEntity | null;
  modifiedIds: string[];
}> {
  const entity = entities[id];
  if (!entity) return { entities, deletedEntity: null, modifiedIds: [] };

  const path = entity._path || [`${id}.md`];

  // 1. Delete file from OPFS
  await deleteOpfsEntry(vaultDir, path, vaultDir.name);

  // 2. Delete images from OPFS
  if (entity.image) {
    try {
      const imagePath = entity.image.split("/");
      await deleteOpfsEntry(vaultDir, imagePath, vaultDir.name);
    } catch (e) {
      console.warn("Failed to delete image", e);
    }
  }
  if (entity.thumbnail) {
    try {
      const thumbPath = entity.thumbnail.split("/");
      await deleteOpfsEntry(vaultDir, thumbPath, vaultDir.name);
    } catch (e) {
      console.warn("Failed to delete thumbnail", e);
    }
  }

  // 3. Remove from memory
  const newEntities = { ...entities };
  delete newEntities[id];

  // 4. Cleanup connections FROM other nodes TO this node
  // Since inboundConnections is now derived or state-managed, we can surgically target only affected entities.
  const modifiedIds: string[] = [];
  let targetIdsToCleanup: Set<string>;

  if (inboundConnections) {
    const incomingSourceIds =
      inboundConnections[id]?.map((c) => c.sourceId) || [];

    let childIds = childrenIds;
    if (!childIds) {
      childIds = [];
      for (const entityId in newEntities) {
        if (newEntities[entityId].parent === id) {
          childIds.push(entityId);
        }
      }
    }

    targetIdsToCleanup = new Set([...incomingSourceIds, ...childIds]);
  } else {
    targetIdsToCleanup = new Set(Object.keys(newEntities));
  }

  for (const sourceId of targetIdsToCleanup) {
    const sourceEntity = newEntities[sourceId];
    if (!sourceEntity) continue;
    let isModified = false;
    const updatedEntity = { ...sourceEntity };

    const hasConnection = sourceEntity.connections.some((c) => c.target === id);
    if (hasConnection) {
      updatedEntity.connections = sourceEntity.connections.filter(
        (c) => c.target !== id,
      );
      isModified = true;
    }

    if (sourceEntity.parent === id) {
      updatedEntity.parent = undefined;
      isModified = true;
    }

    if (isModified) {
      newEntities[sourceId] = updatedEntity;
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

  const normalizedLabel = label.trim().toLowerCase();
  if (!normalizedLabel) return { entities, updated: null };

  const labels = entity.labels || [];
  if (labels.some((l) => l.toLowerCase() === normalizedLabel))
    return { entities, updated: null };

  const updated = {
    ...entity,
    labels: [...labels, normalizedLabel],
    updatedAt: Date.now(),
    modifiedAt: Date.now(),
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

  const normalizedLabel = label.trim().toLowerCase();
  const labels = entity.labels || [];
  if (!labels.some((l) => l.toLowerCase() === normalizedLabel))
    return { entities, updated: null };

  const updated = {
    ...entity,
    labels: labels.filter((l) => l.toLowerCase() !== normalizedLabel),
    updatedAt: Date.now(),
    modifiedAt: Date.now(),
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
  strength: number = 1.0,
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
    strength,
  };

  const updatedSource = {
    ...source,
    connections: [...source.connections, connection],
    updatedAt: Date.now(),
    modifiedAt: Date.now(),
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
    updatedAt: Date.now(),
    modifiedAt: Date.now(),
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
    updatedAt: Date.now(),
    modifiedAt: Date.now(),
  } as LocalEntity;

  return {
    entities: { ...entities, [sourceId]: updatedSource },
    updatedSource,
  };
}

export function bulkAddLabel(
  entities: Record<string, LocalEntity>,
  ids: string[],
  label: string,
): { entities: Record<string, LocalEntity>; modifiedIds: string[] } {
  const newEntities = { ...entities };
  const modifiedIds: string[] = [];
  const normalizedLabel = label.trim().toLowerCase();

  for (const id of ids) {
    const entity = newEntities[id];
    if (!entity) continue;
    const labels = entity.labels || [];
    if (labels.some((l) => l.toLowerCase() === normalizedLabel)) continue;

    newEntities[id] = {
      ...entity,
      labels: [...labels, normalizedLabel],
      updatedAt: Date.now(),
      modifiedAt: Date.now(),
    } as LocalEntity;
    modifiedIds.push(id);
  }

  return { entities: newEntities, modifiedIds };
}

export function bulkRemoveLabel(
  entities: Record<string, LocalEntity>,
  ids: string[],
  label: string,
): { entities: Record<string, LocalEntity>; modifiedIds: string[] } {
  const newEntities = { ...entities };
  const modifiedIds: string[] = [];
  const normalizedLabel = label.trim().toLowerCase();

  for (const id of ids) {
    const entity = newEntities[id];
    if (!entity) continue;
    const labels = entity.labels || [];
    if (!labels.some((l) => l.toLowerCase() === normalizedLabel)) continue;

    newEntities[id] = {
      ...entity,
      labels: labels.filter((l) => l.toLowerCase() !== normalizedLabel),
      updatedAt: Date.now(),
      modifiedAt: Date.now(),
    } as LocalEntity;
    modifiedIds.push(id);
  }

  return { entities: newEntities, modifiedIds };
}

export function batchCreateEntities(
  entities: Record<string, LocalEntity>,
  newEntitiesList: BatchCreateInput[],
): { entities: Record<string, LocalEntity>; created: LocalEntity[] } {
  const newEntities = { ...entities };
  const created: LocalEntity[] = [];

  for (const item of newEntitiesList) {
    let entity: LocalEntity;

    if ("id" in item) {
      entity = {
        ...item,
        updatedAt: Date.now(),
        createdAt: (item as Partial<Entity>).createdAt ?? Date.now(),
        modifiedAt: Date.now(),
      } as LocalEntity;
    } else {
      entity = createEntity(
        item.title,
        item.type as any,
        item.initialData,
        newEntities,
      );
    }

    newEntities[entity.id] = entity;
    created.push(entity);
  }

  return { entities: newEntities, created };
}

export function detectCycle(
  entityId: string,
  potentialParentId: string | undefined,
  entities: Record<string, LocalEntity>,
): boolean {
  if (!potentialParentId) return false;
  if (entityId === potentialParentId) return true;

  let currentId: string | undefined = potentialParentId;
  const visited = new Set<string>();

  while (currentId) {
    if (visited.has(currentId)) {
      return true;
    }
    visited.add(currentId);

    if (currentId === entityId) {
      return true;
    }

    const currentEntity: LocalEntity | undefined = entities[currentId];
    currentId = currentEntity?.parent;
  }

  return false;
}
