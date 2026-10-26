import { vault } from "#lib/stores/vault.svelte.js";
import { notificationStore } from "#lib/stores/ui/notification.svelte.js";
import { reportPanelStore } from "#lib/stores/ui/report-panel.svelte.js";
import { useGraphReportGeneration } from "#lib/components/graph/graph-report-generation.js";
import { useTableReportGeneration } from "#lib/components/table/table-report-generation.js";

export function openSelectionReport(
  origin: "graph" | "table",
  selectedIds: string[],
): boolean {
  const run =
    origin === "graph" ? useGraphReportGeneration : useTableReportGeneration;
  const result = run(selectedIds, (id) => vault.entities[id]);
  if (!result.input || (result.source.entityIds?.length ?? 0) < 2) {
    notificationStore.notify(
      "Select at least two entities to generate a report.",
      "info",
    );
    return false;
  }
  reportPanelStore.open({
    input: result.input,
    source: result.source,
    defaultTitle: `${origin === "graph" ? "Graph" : "Table"} selection report`,
  });
  return true;
}
