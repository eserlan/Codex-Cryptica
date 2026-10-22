import { BIOME_CATALOGUE } from "./catalogue";
import {
  FILTER_FACETS,
  FILTER_FACET_LABELS,
  type FilterFacet,
  type ReferenceBiome,
  type Statement,
} from "./model";

export interface BiomeQuery {
  text?: string;
  filters?: readonly FilterFacet[];
}

export interface SearchResult {
  biome: ReferenceBiome;
  /** Which parts of the biome the text matched, for result announcements. */
  matchedFields: string[];
}

function normalise(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function joinStatements(statements: readonly Statement[]): string {
  return statements.map((statement) => statement.text).join(" ");
}

function fieldsOf(biome: ReferenceBiome): [string, string][] {
  return [
    ["name", biome.name],
    ["summary", biome.summary],
    ["landscape", joinStatements(biome.landscape)],
    ["vegetation", joinStatements(biome.vegetation)],
    ["wildlife", joinStatements(biome.wildlife)],
    ["resources", joinStatements(biome.resources)],
    ["hazards", joinStatements(biome.hazards)],
    ["variations", joinStatements(biome.variations)],
    [
      "conditions",
      joinStatements([
        ...biome.conditions.seasonality,
        ...biome.conditions.waterAvailability,
        ...biome.conditions.notes,
      ]),
    ],
  ].map(([field, text]) => [field, normalise(text)]);
}

export function searchBiomes(
  query: BiomeQuery,
  catalogue: readonly ReferenceBiome[] = BIOME_CATALOGUE,
): SearchResult[] {
  const words = normalise(query.text ?? "")
    .split(/\s+/)
    .filter(Boolean);
  const filters = query.filters ?? [];
  const results: SearchResult[] = [];

  for (const biome of catalogue) {
    if (!filters.every((facet) => biome.filters.includes(facet))) continue;
    const fields = fieldsOf(biome);
    const everyWordMatches = words.every((word) =>
      fields.some(([, text]) => text.includes(word)),
    );
    if (!everyWordMatches) continue;
    const matchedFields = fields
      .filter(([, text]) => words.some((word) => text.includes(word)))
      .map(([field]) => field);
    results.push({ biome, matchedFields });
  }
  return results;
}

export function listFilterFacets(
  catalogue: readonly ReferenceBiome[] = BIOME_CATALOGUE,
): { facet: FilterFacet; label: string; count: number }[] {
  return FILTER_FACETS.map((facet) => ({
    facet,
    label: FILTER_FACET_LABELS[facet],
    count: catalogue.filter((biome) => biome.filters.includes(facet)).length,
  })).filter((entry) => entry.count > 0);
}
