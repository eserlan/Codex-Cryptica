import type { Entity } from "schema";

export type ExplorerViewMode = "list" | "label" | "category";

export type LabelGroupedEntities = {
  type: "label";
  groups: Map<string, Entity[]>;
  sortedKeys: string[];
  unlabeled: Entity[];
};

export type CategoryGroupedEntities = {
  type: "category";
  groups: Map<string, Entity[]>;
  sortedKeys: string[];
};

export type ExplorerGroupedEntities =
  LabelGroupedEntities | CategoryGroupedEntities;

export function groupEntitiesForExplorer(
  entities: Entity[],
  viewMode: ExplorerViewMode,
): ExplorerGroupedEntities | null {
  if (viewMode === "list") return null;

  if (viewMode === "category") {
    const groups = new Map<string, Entity[]>();

    for (const entity of entities) {
      let categoryGroup = groups.get(entity.type);
      if (!categoryGroup) {
        categoryGroup = [];
        groups.set(entity.type, categoryGroup);
      }
      categoryGroup.push(entity);
    }

    const sortedKeys = Array.from(groups.keys()).sort((a, b) =>
      (a ?? "").localeCompare(b ?? ""),
    );

    return {
      type: "category",
      groups,
      sortedKeys,
    };
  }

  const groups = new Map<string, Entity[]>();
  const unlabeled: Entity[] = [];

  for (const entity of entities) {
    if (!entity.labels || entity.labels.length === 0) {
      unlabeled.push(entity);
      continue;
    }

    // Deduplicate labels for this entity to prevent duplicate entries in the same group
    const uniqueLabels = new Set(entity.labels);
    for (const label of uniqueLabels) {
      let labelGroup = groups.get(label);
      if (!labelGroup) {
        labelGroup = [];
        groups.set(label, labelGroup);
      }
      labelGroup.push(entity);
    }
  }

  const sortedKeys = Array.from(groups.keys()).sort((a, b) =>
    (a ?? "").localeCompare(b ?? ""),
  );

  return {
    type: "label",
    groups,
    sortedKeys,
    unlabeled,
  };
}

export type GroupEntry =
  | {
      kind: "group";
      id: string;
      groupType: "label" | "category" | "unlabeled";
      groupKey: string;
      title: string;
      count: number;
      collapsed: boolean;
    }
  | {
      kind: "entity";
      id: string;
      groupKey: string;
      entity: Entity;
    };

export function flattenGroupedEntities(
  groupedEntities: ExplorerGroupedEntities | null,
  collapsedLabelGroups: Set<string>,
  collapsedCategoryGroups: Set<string>,
  getCategoryLabel: (id: string) => string,
): GroupEntry[] {
  if (!groupedEntities) return [];
  const entries: GroupEntry[] = [];

  if (groupedEntities.type === "label") {
    for (const label of groupedEntities.sortedKeys) {
      const items = groupedEntities.groups.get(label) ?? [];
      const collapsed = collapsedLabelGroups.has(label);
      entries.push({
        kind: "group",
        id: `label:${label}`,
        groupType: "label",
        groupKey: label,
        title: label,
        count: items.length,
        collapsed,
      });
      if (!collapsed) {
        for (const entity of items) {
          entries.push({
            kind: "entity",
            id: `${entity.id}:${label}`,
            groupKey: label,
            entity,
          });
        }
      }
    }
    if (groupedEntities.unlabeled.length > 0) {
      entries.push({
        kind: "group",
        id: "label:unlabeled",
        groupType: "unlabeled",
        groupKey: "unlabeled",
        title: "Unlabeled",
        count: groupedEntities.unlabeled.length,
        collapsed: false,
      });
      for (const entity of groupedEntities.unlabeled) {
        entries.push({
          kind: "entity",
          id: `${entity.id}:unlabeled`,
          groupKey: "unlabeled",
          entity,
        });
      }
    }
  } else {
    for (const categoryId of groupedEntities.sortedKeys) {
      const items = groupedEntities.groups.get(categoryId) ?? [];
      const collapsed = collapsedCategoryGroups.has(categoryId);
      entries.push({
        kind: "group",
        id: `category:${categoryId}`,
        groupType: "category",
        groupKey: categoryId,
        title: getCategoryLabel(categoryId),
        count: items.length,
        collapsed,
      });
      if (!collapsed) {
        for (const entity of items) {
          entries.push({
            kind: "entity",
            id: `${entity.id}:${categoryId}`,
            groupKey: categoryId,
            entity,
          });
        }
      }
    }
  }

  return entries;
}
