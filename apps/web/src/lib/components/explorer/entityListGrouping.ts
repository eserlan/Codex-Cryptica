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
      a.localeCompare(b),
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
    a.localeCompare(b),
  );

  return {
    type: "label",
    groups,
    sortedKeys,
    unlabeled,
  };
}
