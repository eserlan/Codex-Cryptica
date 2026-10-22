import { getBiome } from "./catalogue";
import { formatRange } from "./format";
import type { Range, ReferenceBiome, Statement } from "./model";

export const MAX_COMPARE = 3;

export const COMPARISON_ROW_IDS = [
  "temperature",
  "seasonality",
  "precipitation",
  "elevation",
  "waterAvailability",
  "landscape",
  "vegetation",
  "wildlife",
  "resources",
  "hazards",
] as const;

export type ComparisonRowId = (typeof COMPARISON_ROW_IDS)[number];

export const COMPARISON_ROW_LABELS: Readonly<Record<ComparisonRowId, string>> =
  {
    temperature: "Temperature (yearly average)",
    seasonality: "Seasons",
    precipitation: "Rainfall and snow",
    elevation: "Height above sea level",
    waterAvailability: "Water",
    landscape: "Landscape",
    vegetation: "Plants",
    wildlife: "Wildlife",
    resources: "Resources",
    hazards: "Hazards",
  };

export type ComparisonCell =
  | { kind: "range"; text: string; note?: string }
  | { kind: "statements"; statements: Statement[] }
  | { kind: "not-applicable" };

export interface ComparisonRow {
  id: ComparisonRowId;
  label: string;
  cells: ComparisonCell[];
}

export type ComparisonResult =
  | {
      ok: true;
      biomes: { id: string; name: string }[];
      rows: ComparisonRow[];
      missing: string[];
    }
  | { ok: false; reason: "needs-two" | "too-many"; missing: string[] };

function rangeCell(range: Range | undefined): ComparisonCell {
  return range
    ? { kind: "range", text: formatRange(range), note: range.note }
    : { kind: "not-applicable" };
}

function statementsCell(statements: readonly Statement[]): ComparisonCell {
  return statements.length > 0
    ? { kind: "statements", statements: [...statements] }
    : { kind: "not-applicable" };
}

const CELL_BUILDERS: Record<
  ComparisonRowId,
  (b: ReferenceBiome) => ComparisonCell
> = {
  temperature: (b) => rangeCell(b.conditions.temperature),
  precipitation: (b) => rangeCell(b.conditions.precipitation),
  elevation: (b) => rangeCell(b.conditions.elevation),
  seasonality: (b) => statementsCell(b.conditions.seasonality),
  waterAvailability: (b) => statementsCell(b.conditions.waterAvailability),
  landscape: (b) => statementsCell(b.landscape),
  vegetation: (b) => statementsCell(b.vegetation),
  wildlife: (b) => statementsCell(b.wildlife),
  resources: (b) => statementsCell(b.resources),
  hazards: (b) => statementsCell(b.hazards),
};

/** Lines up two or three biomes attribute by attribute. */
export function buildComparison(biomeIds: readonly string[]): ComparisonResult {
  const unique = [...new Set(biomeIds)];
  if (unique.length > MAX_COMPARE) {
    return { ok: false, reason: "too-many", missing: [] };
  }
  const found: ReferenceBiome[] = [];
  const missing: string[] = [];
  for (const id of unique) {
    const biome = getBiome(id);
    if (biome) found.push(biome);
    else missing.push(id);
  }
  if (found.length < 2) return { ok: false, reason: "needs-two", missing };

  return {
    ok: true,
    biomes: found.map((b) => ({ id: b.id, name: b.name })),
    missing,
    rows: COMPARISON_ROW_IDS.map((id) => ({
      id,
      label: COMPARISON_ROW_LABELS[id],
      cells: found.map((biome) => CELL_BUILDERS[id](biome)),
    })),
  };
}
