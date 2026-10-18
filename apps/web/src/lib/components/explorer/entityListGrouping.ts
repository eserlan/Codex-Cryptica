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

function sortGroupKeys(groups: Map<string, Entity[]>): string[] {
  return Array.from(groups.keys()).sort((a, b) =>
    (a ?? "").localeCompare(b ?? ""),
  );
}

function groupEntitiesByCategory(entities: Entity[]): CategoryGroupedEntities {
  const groups = new Map<string, Entity[]>();

  for (const entity of entities) {
    let categoryGroup = groups.get(entity.type);
    if (!categoryGroup) {
      categoryGroup = [];
      groups.set(entity.type, categoryGroup);
    }
    categoryGroup.push(entity);
  }

  return {
    type: "category",
    groups,
    sortedKeys: sortGroupKeys(groups),
  };
}

function groupEntitiesByLabel(entities: Entity[]): LabelGroupedEntities {
  const groups = new Map<string, Entity[]>();
  const unlabeled: Entity[] = [];

  for (const entity of entities) {
    if (!entity.labels || entity.labels.length === 0) {
      unlabeled.push(entity);
      continue;
    }

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

  return {
    type: "label",
    groups,
    sortedKeys: sortGroupKeys(groups),
    unlabeled,
  };
}

export function groupEntitiesForExplorer(
  entities: Entity[],
  viewMode: ExplorerViewMode,
): ExplorerGroupedEntities | null {
  if (viewMode === "list") return null;

  if (viewMode === "category") {
    return groupEntitiesByCategory(entities);
  }

  return groupEntitiesByLabel(entities);
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

function appendGroupEntries(
  entries: GroupEntry[],
  groupKey: string,
  title: string,
  groupType: "label" | "category" | "unlabeled",
  items: Entity[],
  collapsed: boolean,
): void {
  entries.push({
    kind: "group",
    id: `${groupType}:${groupKey}`,
    groupType,
    groupKey,
    title,
    count: items.length,
    collapsed,
  });

  if (collapsed) return;

  for (const entity of items) {
    entries.push({
      kind: "entity",
      id: `${entity.id}:${groupKey}`,
      groupKey,
      entity,
    });
  }
}

function flattenLabelGroups(
  grouped: LabelGroupedEntities,
  collapsedGroups: Set<string>,
): GroupEntry[] {
  const entries: GroupEntry[] = [];

  for (const label of grouped.sortedKeys) {
    const items = grouped.groups.get(label) ?? [];
    appendGroupEntries(
      entries,
      label,
      label,
      "label",
      items,
      collapsedGroups.has(label),
    );
  }

  if (grouped.unlabeled.length > 0) {
    appendGroupEntries(
      entries,
      "unlabeled",
      "Unlabeled",
      "unlabeled",
      grouped.unlabeled,
      false,
    );
  }

  return entries;
}

function flattenCategoryGroups(
  grouped: CategoryGroupedEntities,
  collapsedGroups: Set<string>,
  getCategoryLabel: (id: string) => string,
): GroupEntry[] {
  const entries: GroupEntry[] = [];

  for (const categoryId of grouped.sortedKeys) {
    const items = grouped.groups.get(categoryId) ?? [];
    appendGroupEntries(
      entries,
      categoryId,
      getCategoryLabel(categoryId),
      "category",
      items,
      collapsedGroups.has(categoryId),
    );
  }

  return entries;
}

export function flattenGroupedEntities(
  groupedEntities: ExplorerGroupedEntities | null,
  collapsedLabelGroups: Set<string>,
  collapsedCategoryGroups: Set<string>,
  getCategoryLabel: (id: string) => string,
): GroupEntry[] {
  if (!groupedEntities) return [];

  if (groupedEntities.type === "label") {
    return flattenLabelGroups(groupedEntities, collapsedLabelGroups);
  }

  return flattenCategoryGroups(
    groupedEntities,
    collapsedCategoryGroups,
    getCategoryLabel,
  );
}
