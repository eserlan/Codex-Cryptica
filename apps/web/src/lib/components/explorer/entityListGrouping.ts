import type { Entity } from "schema";

export type ExplorerViewMode = "list" | "label";

export type LabelGroupedEntities = {
  type: "label";
  groups: Map<string, Entity[]>;
  sortedKeys: string[];
  unlabeled: Entity[];
};

export function groupEntitiesForExplorer(
  entities: Entity[],
  viewMode: ExplorerViewMode,
): LabelGroupedEntities | null {
  if (viewMode === "list") return null;

  const groups = new Map<string, Entity[]>();
  const unlabeled: Entity[] = [];

  for (const entity of entities) {
    if (!entity.labels || entity.labels.length === 0) {
      unlabeled.push(entity);
      continue;
    }

    for (const label of entity.labels) {
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
