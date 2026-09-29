import type { Entity } from "schema";
import type { ReportInput, ReportSource } from "entity-report-engine";
import { assembleReportInput, connectionPairs } from "./report-input-mapper";

export interface SelectionReportResult {
  input: ReportInput | null;
  source: ReportSource;
  error?: "no-selection";
}

/** Graph/Table path: relationships come from each entity's own connections. */
export function resolveSelectionReportInput(
  origin: "graph" | "table",
  selectedIds: string[],
  getEntity: (id: string) => Entity | undefined,
): SelectionReportResult {
  const ids = [...new Set(selectedIds)];
  const entities = ids.map(getEntity).filter((e): e is Entity => Boolean(e));
  const source: ReportSource = {
    origin,
    entityIds: entities.map((e) => e.id),
  };
  if (entities.length === 0) {
    return { input: null, source, error: "no-selection" };
  }
  return {
    input: assembleReportInput(entities, connectionPairs(entities)),
    source,
  };
}
