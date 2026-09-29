import type { Entity } from "schema";
import type { Canvas } from "@codex/canvas-engine";
import { buildReport, type ReportScope } from "entity-report-engine";
import { vault } from "$lib/stores/vault.svelte";
import { notificationStore } from "$lib/stores/ui/notification.svelte";
import {
  reportService,
  type ReportService,
} from "$lib/services/report-service";
import { resolveReportSource } from "$lib/services/report-source-resolver";

export type RegenerateOutcome =
  "applied" | "cancelled" | "source-missing" | "failed";

export interface ReportZenActionDeps {
  service: Pick<ReportService, "regenerate" | "export">;
  getEntity: (id: string) => Entity | undefined;
  getCanvas: (id: string) => Canvas | undefined;
  confirm: (options: {
    title: string;
    message: string;
    confirmLabel?: string;
    isDangerous?: boolean;
  }) => Promise<boolean>;
  notify: (message: string, type?: "success" | "info" | "error") => void;
}

const defaultDeps: ReportZenActionDeps = {
  service: reportService,
  getEntity: (id) => vault.entities[id],
  getCanvas: (id) => vault.canvases[id],
  confirm: (options) => notificationStore.confirm(options),
  notify: (message, type) => notificationStore.notify(message, type),
};

export function isReportEntity(
  entity: Pick<Entity, "kind" | "report"> | null | undefined,
): boolean {
  return entity?.kind === "report" && Boolean(entity.report);
}

export async function regenerateReport(
  entity: Entity,
  deps: ReportZenActionDeps = defaultDeps,
): Promise<RegenerateOutcome> {
  const provenance = entity.report;
  if (entity.kind !== "report" || !provenance) return "failed";

  const { input, error } = resolveReportSource(provenance, deps);
  if (!input || error) {
    deps.notify(
      "The original canvas or entities for this report are gone, so it can't be regenerated. Your saved text is unchanged.",
      "info",
    );
    return "source-missing";
  }

  const scope: ReportScope =
    provenance.origin === "canvas"
      ? {
          origin: "canvas",
          canvasId: provenance.canvasId ?? "",
          selection: provenance.selection ?? "entire",
        }
      : { origin: provenance.origin };
  const document = buildReport(input, {
    scope,
    include: provenance.include,
    detail: provenance.detail,
  });

  let first: Awaited<ReturnType<ReportZenActionDeps["service"]["regenerate"]>>;
  try {
    first = await deps.service.regenerate(entity.id, document);
  } catch {
    deps.notify("The report could not be regenerated.", "error");
    return "failed";
  }
  if (first.applied) {
    deps.notify("Report regenerated.", "success");
    return "applied";
  }
  if (!first.hadManualEdits) {
    deps.notify("The report could not be regenerated.", "error");
    return "failed";
  }

  const confirmed = await deps.confirm({
    title: "Overwrite your edits?",
    message:
      "You have edited this report since it was generated. Regenerating replaces your edits with a fresh version.",
    confirmLabel: "Regenerate",
    isDangerous: true,
  });
  if (!confirmed) return "cancelled";

  let second: Awaited<ReturnType<ReportZenActionDeps["service"]["regenerate"]>>;
  try {
    second = await deps.service.regenerate(entity.id, document, {
      confirmed: true,
    });
  } catch {
    deps.notify("The report could not be regenerated.", "error");
    return "failed";
  }
  deps.notify(
    second.applied
      ? "Report regenerated."
      : "The report could not be regenerated.",
    second.applied ? "success" : "error",
  );
  return second.applied ? "applied" : "failed";
}

export async function exportReport(
  entity: Entity,
  deps: ReportZenActionDeps = defaultDeps,
): Promise<boolean> {
  if (!isReportEntity(entity)) return false;
  const ok = await deps.service.export(entity.id, "markdown");
  deps.notify(
    ok ? "Report copied as Markdown." : "The report could not be copied.",
    ok ? "success" : "error",
  );
  return ok;
}
