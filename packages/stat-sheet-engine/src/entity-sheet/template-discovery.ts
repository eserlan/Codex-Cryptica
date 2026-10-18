import type { StatSheetTemplate } from "schema";

/**
 * Template categories worth suggesting for an entity category beyond an
 * exact match (#3960). Template categories come from the public directory's
 * list (`StatSheetEntityCategorySchema`), which uses some names the default
 * vault categories do not — "settlement", "organization", "npc".
 */
export const RELATED_SHEET_CATEGORIES: Readonly<
  Record<string, readonly string[]>
> = {
  character: ["npc"],
  npc: ["character"],
  creature: ["npc", "threat"],
  location: ["settlement"],
  settlement: ["location"],
  faction: ["organization"],
  organization: ["faction"],
};

export interface PartitionedSheetTemplates<T> {
  /** Exact category matches first, then related categories. */
  readonly suggested: T[];
  /** Everything else, including templates with no category. */
  readonly other: T[];
}

/**
 * Splits templates into the ones suggested for an entity's category and the
 * rest, keeping the input order within each group. Nothing is hidden: every
 * template stays selectable for every category.
 */
// fallow-ignore-next-line complexity
export function partitionTemplatesForCategory<
  T extends Pick<StatSheetTemplate, "category"> & { systemId?: string | null },
>(
  templates: readonly T[],
  entityCategory: string | null | undefined,
  systemId?: string | null,
): PartitionedSheetTemplates<T> {
  const category = entityCategory?.trim().toLowerCase();
  const sys = systemId?.trim().toLowerCase();
  if (!category) {
    if (sys) {
      const matchSys = templates.filter(
        (t) => t.systemId?.toLowerCase() === sys,
      );
      const rest = templates.filter((t) => t.systemId?.toLowerCase() !== sys);
      return { suggested: matchSys, other: rest };
    }
    return { suggested: [], other: [...templates] };
  }

  const related = new Set(
    Object.hasOwn(RELATED_SHEET_CATEGORIES, category)
      ? RELATED_SHEET_CATEGORIES[category]
      : [],
  );
  const exactMatchingSystem: T[] = [];
  const exactOtherSystem: T[] = [];
  const nearMatchingSystem: T[] = [];
  const nearOtherSystem: T[] = [];
  const other: T[] = [];

  for (const template of templates) {
    const templateCategory = template.category?.trim().toLowerCase();
    const templateSys = template.systemId?.trim().toLowerCase();
    const matchesSystem = Boolean(sys && templateSys === sys);

    if (templateCategory === category) {
      if (matchesSystem) exactMatchingSystem.push(template);
      else exactOtherSystem.push(template);
    } else if (templateCategory && related.has(templateCategory)) {
      if (matchesSystem) nearMatchingSystem.push(template);
      else nearOtherSystem.push(template);
    } else {
      other.push(template);
    }
  }

  return {
    suggested: [
      ...exactMatchingSystem,
      ...exactOtherSystem,
      ...nearMatchingSystem,
      ...nearOtherSystem,
    ],
    other,
  };
}
