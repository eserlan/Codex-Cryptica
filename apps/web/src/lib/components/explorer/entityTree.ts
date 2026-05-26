import type { Entity } from "schema";

export interface TreeNode {
  entity: Entity;
  children: TreeNode[];
  isMatchingQuery: boolean;
}

export function buildEntityTree(
  entities: Entity[],
  filteredEntities: Entity[],
): TreeNode[] {
  // 1. Build a lookup record of all entities in the vault by ID
  const allEntitiesMap = new Map<string, Entity>();
  for (const e of entities) {
    allEntitiesMap.set(e.id, e);
  }

  // 2. Identify the set of all visible entities.
  // It contains all matching entities (filteredEntities) plus all their ancestors.
  const visibleIds = new Set<string>();
  const matchingIds = new Set<string>(filteredEntities.map((e) => e.id));

  for (const match of filteredEntities) {
    let current: Entity | undefined = match;
    while (current) {
      visibleIds.add(current.id);
      if (current.parent) {
        current = allEntitiesMap.get(current.parent);
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
    const parentId = node.entity.parent;
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
