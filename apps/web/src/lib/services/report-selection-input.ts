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
  // ⚡ Bolt Optimization: Replace [...new Set].map().filter() and entities.map() with an imperative loop
  // This avoids intermediate array allocations and reduces GC pressure when processing selections.
  const idSet = new Set(selectedIds);
  const entities: Entity[] = [];
  const entityIds: string[] = [];

  for (const id of idSet) {
    const e = getEntity(id);
    if (e) {
      entities.push(e);
      entityIds.push(e.id);
    }
  }

  const source: ReportSource = {
    origin,
    entityIds,
  };
  if (entities.length === 0) {
    return { input: null, source, error: "no-selection" };
  }
  return {
    input: assembleReportInput(entities, connectionPairs(entities)),
    source,
  };
}
