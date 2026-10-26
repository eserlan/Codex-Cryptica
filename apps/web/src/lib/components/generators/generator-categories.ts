import type { GeneratorId } from "generator-engine";
import {
  GENERATOR_CATALOGUE,
  GENERATOR_CATEGORIES,
  type GeneratorCategoryId,
} from "#lib/content/generator-catalogue.js";

/**
 * The in-app generator picker uses the same categories as the public
 * /generators index, so a generator sits in the same place in both.
 */
export const GENERATOR_SECTION_CATEGORIES = GENERATOR_CATEGORIES;

export type GeneratorSectionId = GeneratorCategoryId;

// In-app generators without a public page of their own.
const IN_APP_ONLY_SECTIONS: Partial<Record<GeneratorId, GeneratorSectionId>> = {
  event: "complications",
  "random-table": "complications",
};

export const GENERATOR_SECTION_MAP: Partial<
  Record<GeneratorId, GeneratorSectionId>
> = {
  ...Object.fromEntries(
    GENERATOR_CATALOGUE.flatMap((entry) =>
      entry.generatorId ? [[entry.generatorId, entry.category]] : [],
    ),
  ),
  ...IN_APP_ONLY_SECTIONS,
};

export function resolveGeneratorSection(gen: {
  id: GeneratorId;
  entityType: string;
}): GeneratorSectionId {
  const mapped = GENERATOR_SECTION_MAP[gen.id];
  if (mapped) return mapped;
  if (gen.entityType === "character") return "characters";
  if (gen.entityType === "faction") return "factions";
  if (gen.entityType === "creature") return "realms";
  if (gen.entityType === "location") return "places";
  if (gen.entityType === "event") return "adventures";
  return "items";
}
