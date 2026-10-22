import { BIOME_SOURCES } from "./catalogue";
import type { BiomeSource, Range, ReferenceBiome, Statement } from "./model";

const number = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 });

function plain(value: number): string {
  // Use a plain hyphen-minus so the text reads and searches predictably.
  return number.format(value).replace(/[−‐]/g, "-");
}

/** "150 to 400 mm per year". A range is never shown as a single bare number. */
export function formatRange(
  range: Pick<Range, "low" | "high" | "unit">,
): string {
  return range.low === range.high
    ? `${plain(range.low)} ${range.unit}`
    : `${plain(range.low)} to ${plain(range.high)} ${range.unit}`;
}

function allStatements(biome: ReferenceBiome): Statement[] {
  return [
    ...biome.conditions.seasonality,
    ...biome.conditions.waterAvailability,
    ...biome.conditions.notes,
    ...biome.landscape,
    ...biome.vegetation,
    ...biome.wildlife,
    ...biome.resources,
    ...biome.hazards,
    ...biome.variations,
  ];
}

/**
 * Resolved sources for a biome: its own listed sources first, then any other
 * source a statement cites. Unknown ids are skipped.
 */
export function listBiomeSources(biome: ReferenceBiome): BiomeSource[] {
  const ids: string[] = [...biome.sourceIds];
  for (const statement of allStatements(biome)) {
    for (const id of statement.sourceIds) if (!ids.includes(id)) ids.push(id);
  }
  return ids
    .map((id) => BIOME_SOURCES[id])
    .filter((source): source is BiomeSource => Boolean(source));
}
