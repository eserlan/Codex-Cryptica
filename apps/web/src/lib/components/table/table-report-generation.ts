import type { Entity } from "schema";
import {
  resolveSelectionReportInput,
  type SelectionReportResult,
} from "$lib/services/report-selection-input";

export function useTableReportGeneration(
  selectedEntityIds: string[],
  getEntity: (id: string) => Entity | undefined,
): SelectionReportResult {
  return resolveSelectionReportInput("table", selectedEntityIds, getEntity);
}
