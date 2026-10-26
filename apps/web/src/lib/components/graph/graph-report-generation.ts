import type { Entity } from "schema";
import {
  resolveSelectionReportInput,
  type SelectionReportResult,
} from "#lib/services/report-selection-input.js";

export function useGraphReportGeneration(
  selectedNodeIds: string[],
  getEntity: (id: string) => Entity | undefined,
): SelectionReportResult {
  return resolveSelectionReportInput("graph", selectedNodeIds, getEntity);
}
