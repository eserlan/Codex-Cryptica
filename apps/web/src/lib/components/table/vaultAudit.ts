import {
  hasEntityImage,
  evaluateEntityMissingFields,
  type ConnectionSummaryLike,
  type EntityWithPreview,
  type TableColumnFilters,
} from "$lib/components/explorer/entityListFiltering";

export interface VaultAuditCounts {
  totalEntities: number;
  missingImages: number;
  missingDescriptions: number;
  zeroConnections: number;
  unlabelled: number;
  incomplete: number;
}

function hasDescription(e: EntityWithPreview): boolean {
  return Boolean(
    e.summary?.trim() || e.contentPreview?.trim() || e.content?.trim(),
  );
}

function hasZeroConnections(
  id: string,
  connectionCounts?: Record<string, ConnectionSummaryLike>,
): boolean {
  const summary = connectionCounts?.[id];
  if (!summary) return true;
  const total =
    summary.total ?? (summary.inbound ?? 0) + (summary.outbound ?? 0);
  return total === 0;
}

function isUnlabelled(e: EntityWithPreview): boolean {
  const labels = e.labels?.length
    ? e.labels
    : ((e as { tags?: string[] }).tags ?? []);
  return labels.length === 0;
}

export function computeVaultAuditCounts(
  entities: EntityWithPreview[],
  connectionCounts?: Record<string, ConnectionSummaryLike>,
): VaultAuditCounts {
  let missingImages = 0;
  let missingDescriptions = 0;
  let zeroConnections = 0;
  let unlabelled = 0;
  let incomplete = 0;

  for (let i = 0; i < entities.length; i++) {
    const e = entities[i];
    if (!hasEntityImage(e)) missingImages++;
    if (!hasDescription(e)) missingDescriptions++;
    if (hasZeroConnections(e.id, connectionCounts)) zeroConnections++;
    if (isUnlabelled(e)) unlabelled++;
    if (evaluateEntityMissingFields(e, connectionCounts?.[e.id]).isIncomplete) {
      incomplete++;
    }
  }

  return {
    totalEntities: entities.length,
    missingImages,
    missingDescriptions,
    zeroConnections,
    unlabelled,
    incomplete,
  };
}

export interface VaultAuditPreset {
  id: string;
  title: string;
  description: string;
  icon: string;
  typeFilter?: string;
  columnFilters?: TableColumnFilters;
  showIncompleteOnly?: boolean;
}

export const VAULT_AUDIT_PRESETS: readonly VaultAuditPreset[] = [
  {
    id: "characters-missing-portraits",
    title: "Characters missing portraits",
    description: "Characters with no image or only a placeholder",
    icon: "icon-[lucide--user-x]",
    typeFilter: "character",
    columnFilters: { imageMode: "missing_image" },
  },
  {
    id: "unconnected-characters",
    title: "Unconnected characters",
    description: "Characters with zero connections to other entities",
    icon: "icon-[lucide--git-fork]",
    typeFilter: "character",
    columnFilters: { connectionsMode: "zero" },
  },
  {
    id: "sparse-locations",
    title: "Sparse locations",
    description: "Locations lacking a description or chronicle summary",
    icon: "icon-[lucide--map-pin-off]",
    typeFilter: "location",
    columnFilters: { summaryMode: "missing_summary" },
  },
  {
    id: "all-flagged",
    title: "All flagged entities",
    description: "Entities missing descriptions, labels, or connections",
    icon: "icon-[lucide--alert-triangle]",
    showIncompleteOnly: true,
  },
];
