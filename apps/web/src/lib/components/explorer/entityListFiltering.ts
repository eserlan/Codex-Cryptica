import type { Entity } from "schema";

export interface FilterOptions {
  searchQuery: string;
  typeFilters: Set<string>;
  labelFilters: Set<string>;
  allowedTypes: string[] | null;
  showDraftsOnly: boolean;
}

export function filterEntities(
  allEntities: Entity[],
  options: FilterOptions,
): Entity[] {
  const filtered: Entity[] = [];
  const query = options.searchQuery.trim().toLowerCase();
  const filterAllTypes = options.typeFilters.size === 0;
  const activeLabels = Array.from(options.labelFilters);
  const allowedTypeSet = options.allowedTypes
    ? new Set(options.allowedTypes)
    : null;

  // Structured query parsing: #label or @label, and raw text (unified under labels)
  const tokens = query ? query.split(/\s+/) : [];
  const textTokens: string[] = [];
  const labelTokens: string[] = [];

  for (let j = 0; j < tokens.length; j++) {
    const t = tokens[j];
    if (t.startsWith("#") || t.startsWith("@")) {
      const label = t.slice(1);
      if (label) labelTokens.push(label);
    } else {
      textTokens.push(t);
    }
  }
  const remainingTextQuery = textTokens.join(" ");

  for (let i = 0; i < allEntities.length; i++) {
    const e = allEntities[i];

    if (allowedTypeSet && !allowedTypeSet.has(e.type)) {
      continue;
    }

    // Filter by draft status
    if (options.showDraftsOnly && e.status !== "draft") {
      continue;
    }
    if (!options.showDraftsOnly && e.status === "draft") {
      continue;
    }

    const matchesType = filterAllTypes || options.typeFilters.has(e.type);
    if (!matchesType) continue;

    // AND logic for sidebar label pills. Legacy entities without labels fall
    // back to tags, matching how label chips are rendered (Constitution XII).
    const effectiveLabels = e.labels?.length ? e.labels : (e.tags ?? []);
    const matchesLabels =
      activeLabels.length === 0 ||
      activeLabels.every((f) => effectiveLabels.includes(f));
    if (!matchesLabels) continue;

    // Filter by specified label tokens (#label or @label). Legacy entities
    // without labels fall back to tags, matching the sidebar pill logic above.
    const matchesLabelTokens = labelTokens.every((l) =>
      effectiveLabels.some((label) => label.toLowerCase() === l),
    );
    if (!matchesLabelTokens) continue;

    // Match remaining raw text queries (no longer checking e.tags)
    const matchesText =
      !remainingTextQuery ||
      e.title.toLowerCase().includes(remainingTextQuery) ||
      e.content.toLowerCase().includes(remainingTextQuery) ||
      e.labels?.some((l) => l.toLowerCase().includes(remainingTextQuery)) ||
      e.aliases?.some((a) => a.toLowerCase().includes(remainingTextQuery));

    if (matchesText) {
      filtered.push(e);
    }
  }

  return filtered.sort((a, b) => a.title.localeCompare(b.title));
}

export function countEntityTypes(
  allEntities: Entity[],
  options: {
    allowedTypes: string[] | null;
    showDraftsOnly: boolean;
  },
): Map<string, number> {
  const allowedTypeSet = options.allowedTypes
    ? new Set(options.allowedTypes)
    : null;
  const counts = new Map<string, number>();
  for (let i = 0; i < allEntities.length; i++) {
    const e = allEntities[i];
    if (allowedTypeSet && !allowedTypeSet.has(e.type)) {
      continue;
    }
    if (options.showDraftsOnly && e.status !== "draft") {
      continue;
    }
    if (!options.showDraftsOnly && e.status === "draft") {
      continue;
    }
    counts.set(e.type, (counts.get(e.type) || 0) + 1);
  }
  return counts;
}
