import { vault } from "$lib/stores/vault.svelte";
import { notificationStore } from "$lib/stores/ui/notification.svelte";
import { reportPanelStore } from "$lib/stores/ui/report-panel.svelte";
import { useGraphReportGeneration } from "$lib/components/graph/graph-report-generation";
import { useTableReportGeneration } from "$lib/components/table/table-report-generation";

export function openSelectionReport(
  origin: "graph" | "table",
  selectedIds: string[],
): boolean {
  if (new Set(selectedIds).size < 2) {
    notificationStore.notify(
      "Select at least two entities to generate a report.",
      "info",
    );
    return false;
  }
  const run =
    origin === "graph" ? useGraphReportGeneration : useTableReportGeneration;
  const result = run(selectedIds, (id) => vault.entities[id]);
  if (!result.input) {
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
