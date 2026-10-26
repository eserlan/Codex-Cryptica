import type { Category } from "schema";
import type { EntityWithPreview } from "$lib/components/explorer/entityListFiltering";
import { getIconClass } from "$lib/utils/icons";

export interface DistributionItem {
  id: string;
  label: string;
  labelValue?: string;
  count: number;
  totalCount: number;
  percentage: number;
  color?: string;
  icon?: string;
  isUnlabelled?: boolean;
}

export interface VaultDistributionSummary {
  totalUniqueEntities: number;
  filteredUniqueEntities: number;
  isFiltered: boolean;
  categories: DistributionItem[];
  labels: DistributionItem[];
  unlabelledCount: number;
  unlabelledTotalCount: number;
}

export function getEntityEffectiveLabels(e: EntityWithPreview): string[] {
  if (e.labels && e.labels.length > 0) {
    return e.labels;
  }
  const tags = (e as { tags?: string[] }).tags;
  return tags && tags.length > 0 ? tags : [];
}

function capitalize(s: string): string {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function calcPercentage(count: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((count / total) * 1000) / 10;
}

function sortDistributionItems(items: DistributionItem[]): DistributionItem[] {
  return items.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    if (b.totalCount !== a.totalCount) return b.totalCount - a.totalCount;
    return a.label.localeCompare(b.label);
  });
}

function countTypeFrequencies(
  entities: EntityWithPreview[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (let i = 0; i < entities.length; i++) {
    const t = entities[i].type;
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return counts;
}

interface LabelCountResult {
  counts: Map<string, number>;
  unlabelled: number;
}

function countEntityLabels(entities: EntityWithPreview[]): LabelCountResult {
  const counts = new Map<string, number>();
  let unlabelled = 0;

  for (let i = 0; i < entities.length; i++) {
    const labels = getEntityEffectiveLabels(entities[i]);
    if (labels.length === 0) {
      unlabelled++;
      continue;
    }
    for (const l of new Set(labels)) {
      counts.set(l, (counts.get(l) ?? 0) + 1);
    }
  }

  return { counts, unlabelled };
}

function computeCategoryItems(
  allEntities: EntityWithPreview[],
  filteredEntities: EntityWithPreview[],
  categoriesList: readonly Category[],
): DistributionItem[] {
  const allCounts = countTypeFrequencies(allEntities);
  const filteredCounts = countTypeFrequencies(filteredEntities);
  const categoryMap = new Map<string, Category>(
    categoriesList.map((c) => [c.id, c]),
  );

  const totalFiltered = filteredEntities.length;
  const items: DistributionItem[] = [];

  for (const [typeId, totalCount] of allCounts.entries()) {
    const count = filteredCounts.get(typeId) ?? 0;
    const cat = categoryMap.get(typeId);
    items.push({
      id: typeId,
      label: cat?.label ?? capitalize(typeId),
      count,
      totalCount,
      percentage: calcPercentage(count, totalFiltered),
      color: cat?.color ?? "#10b981",
      icon: getIconClass(cat?.icon),
    });
  }

  return sortDistributionItems(items);
}

function computeLabelItems(
  allEntities: EntityWithPreview[],
  filteredEntities: EntityWithPreview[],
): {
  items: DistributionItem[];
  unlabelledFiltered: number;
  unlabelledTotal: number;
} {
  const allData = countEntityLabels(allEntities);
  const filteredData = countEntityLabels(filteredEntities);
  const totalFiltered = filteredEntities.length;
  const items: DistributionItem[] = [];

  for (const [label, totalCount] of allData.counts.entries()) {
    const count = filteredData.counts.get(label) ?? 0;
    items.push({
      id: `label:${label}`,
      label,
      labelValue: label,
      count,
      totalCount,
      percentage: calcPercentage(count, totalFiltered),
      icon: "icon-[lucide--tag]",
    });
  }

  if (allData.unlabelled > 0) {
    items.push({
      id: "synthetic:unlabelled",
      label: "Unlabelled",
      count: filteredData.unlabelled,
      totalCount: allData.unlabelled,
      percentage: calcPercentage(filteredData.unlabelled, totalFiltered),
      isUnlabelled: true,
      icon: "icon-[lucide--tag-off]",
    });
  }

  return {
    items: sortDistributionItems(items),
    unlabelledFiltered: filteredData.unlabelled,
    unlabelledTotal: allData.unlabelled,
  };
}

export function computeVaultDistribution(
  allEntities: EntityWithPreview[],
  filteredEntities: EntityWithPreview[],
  categoriesList: readonly Category[] = [],
): VaultDistributionSummary {
  const totalUniqueEntities = allEntities.length;
  const filteredUniqueEntities = filteredEntities.length;
  const isFiltered = totalUniqueEntities !== filteredUniqueEntities;

  const categories = computeCategoryItems(
    allEntities,
    filteredEntities,
    categoriesList,
  );

  const {
    items: labels,
    unlabelledFiltered,
    unlabelledTotal,
  } = computeLabelItems(allEntities, filteredEntities);

  return {
    totalUniqueEntities,
    filteredUniqueEntities,
    isFiltered,
    categories,
    labels,
    unlabelledCount: unlabelledFiltered,
    unlabelledTotalCount: unlabelledTotal,
  };
}
