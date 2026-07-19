import type { Entity } from "schema";
import { sanitizeId } from "../../utils/markdown";
import { systemClock } from "$lib/utils/runtime-deps";

export interface TreeNode {
  entity: Entity;
  children: TreeNode[];
  isMatchingQuery: boolean;
}

export function buildEntityTree(
  entities: Entity[],
  filteredEntities: Entity[],
): TreeNode[] {
  // 1. Build a lookup record of all entities in the vault by SANITIZED ID
  const allEntitiesMap = new Map<string, Entity>();
  for (const e of entities) {
    allEntitiesMap.set(sanitizeId(e.id), e);
  }

  // 1b. Recursively discover missing parents (directories/folders) and create virtual entities
  const virtualEntities = new Map<string, Entity>();
  let foundNewMissing = true;
  while (foundNewMissing) {
    foundNewMissing = false;
    const currentCandidates = [
      ...allEntitiesMap.values(),
      ...virtualEntities.values(),
    ];

    for (const e of currentCandidates) {
      if (e.parent) {
        const parentId = sanitizeId(e.parent);
        if (!allEntitiesMap.has(parentId) && !virtualEntities.has(parentId)) {
          let title = e.parent;
          const pathRaw = (e as any)._path;
          const path: string[] | undefined = Array.isArray(pathRaw)
            ? pathRaw
            : typeof pathRaw === "string"
              ? pathRaw.split("/")
              : undefined;

          if (path && path.length > 1) {
            for (let i = path.length - 2; i >= 0; i--) {
              if (sanitizeId(path[i]) === parentId) {
                title = path[i];
                break;
              }
            }
          }

          if (title === parentId && title.length > 0) {
            title = title.charAt(0).toUpperCase() + title.slice(1);
          }

          let virtualParent: string | undefined = undefined;
          if (path && path.length > 1) {
            for (let i = path.length - 2; i >= 0; i--) {
              if (sanitizeId(path[i]) === parentId && i > 0) {
                virtualParent = sanitizeId(path[i - 1]);
                break;
              }
            }
          }

          virtualEntities.set(parentId, {
            id: parentId,
            type: "note",
            title: title,
            status: "active",
            parent: virtualParent,
            tags: [],
            labels: [],
            connections: [],
            content: "",
            lore: "",
            _path: path,
            updatedAt: systemClock.now(),
            isVirtual: true,
          } as any);

          foundNewMissing = true;
        }
      }
    }
  }

  // Add virtual entities to the main map
  for (const [id, ve] of virtualEntities.entries()) {
    allEntitiesMap.set(id, ve);
  }

  // 2. Identify the set of all visible entities.
  // It contains all matching entities (filteredEntities) plus all their ancestors.
  const visibleIds = new Set<string>();
  const matchingIds = new Set<string>(
    filteredEntities.map((e) => sanitizeId(e.id)),
  );

  for (const match of filteredEntities) {
    let current: Entity | undefined = match;
    while (current) {
      const currentSanitizedId = sanitizeId(current.id);
      visibleIds.add(currentSanitizedId);
      if (current.parent) {
        current = allEntitiesMap.get(sanitizeId(current.parent));
      } else {
        break;
      }
    }
  }

  // 3. For each visible entity, create a tree node.
  const treeNodesMap = new Map<string, TreeNode>();
  for (const id of visibleIds) {
    const ent = allEntitiesMap.get(id);
    if (ent) {
      treeNodesMap.set(id, {
        entity: ent,
        children: [],
        isMatchingQuery: matchingIds.has(id),
      });
    }
  }

  // 4. Build the tree links
  const roots: TreeNode[] = [];
  for (const node of treeNodesMap.values()) {
    const parentId = node.entity.parent
      ? sanitizeId(node.entity.parent)
      : undefined;
    if (parentId && treeNodesMap.has(parentId)) {
      const parentNode = treeNodesMap.get(parentId)!;
      parentNode.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Helper to sort tree nodes recursively
  const sortTreeNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.entity.title.localeCompare(b.entity.title));
    for (const node of nodes) {
      if (node.children.length > 0) {
        sortTreeNodes(node.children);
      }
    }
  };

  sortTreeNodes(roots);
  return roots;
}
