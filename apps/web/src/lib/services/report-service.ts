import type { Entity, ReportProvenance } from "schema";
import {
  hashReportContent,
  renderReportMarkdown,
  type ReportDocument,
} from "entity-report-engine";
import { vault } from "$lib/stores/vault.svelte";
import { systemClock } from "$lib/utils/runtime-deps";
import type { LocalEntity } from "$lib/stores/vault/types";
import { clipboardService } from "$lib/services/ClipboardService";

export type ReportSaveProvenance = Omit<
  ReportProvenance,
  "contentHash" | "generatedAt"
>;

export interface ReportServiceDeps {
  now: () => number;
  copyContent: (content: { markdown: string }) => Promise<boolean>;
  getEntity: (id: string) => Entity | undefined;
  updateEntity: (id: string, updates: Partial<LocalEntity>) => Promise<boolean>;
  createNote: (title: string, initialData: Partial<Entity>) => Promise<string>;
}

const defaultDeps: ReportServiceDeps = {
  now: () => systemClock.now(),
  copyContent: (content) => clipboardService.copyContent(content),
  getEntity: (id) => vault.entities[id],
  updateEntity: (id, updates) => vault.updateEntity(id, updates),
  createNote: (title, initialData) =>
    vault.createEntity("note", title, initialData),
};

export class ReportService {
  constructor(private readonly deps: ReportServiceDeps = defaultDeps) {}

  async save(
    document: ReportDocument,
    options: { title?: string; provenance: ReportSaveProvenance },
  ): Promise<{ entityId: string; created: true }> {
    if (document.overview.entityCount === 0) {
      throw new Error("A report needs at least one entity.");
    }
    const content = renderReportMarkdown(document);
    const now = this.deps.now();
    const title =
      options.title?.trim() ||
      `Report ${new Date(now).toISOString().slice(0, 10)}`;
    const entityId = await this.deps.createNote(title, {
      content,
      kind: "report",
      labels: ["report"],
      report: {
        ...options.provenance,
        generatedAt: now,
        contentHash: hashReportContent(content),
      },
    });
    return { entityId, created: true };
  }

  async regenerate(
    entityId: string,
    document: ReportDocument,
    options: { confirmed?: boolean } = {},
  ): Promise<{ hadManualEdits: boolean; applied: boolean }> {
    const entity = this.deps.getEntity(entityId);
    if (!entity || entity.kind !== "report" || !entity.report) {
      return { hadManualEdits: false, applied: false };
    }
    const hadManualEdits =
      hashReportContent(entity.content ?? "") !== entity.report.contentHash;
    if (hadManualEdits && !options.confirmed) {
      return { hadManualEdits, applied: false };
    }
    const content = renderReportMarkdown(document);
    const applied = await this.deps.updateEntity(entityId, {
      content,
      report: {
        ...entity.report,
        generatedAt: this.deps.now(),
        contentHash: hashReportContent(content),
      },
    });
    return { hadManualEdits, applied };
  }

  async export(entityId: string, format: "markdown"): Promise<boolean> {
    const entity = this.deps.getEntity(entityId);
    if (format !== "markdown" || !entity || entity.kind !== "report") {
      return false;
    }
    try {
      return await this.deps.copyContent({ markdown: entity.content ?? "" });
    } catch {
      return false;
    }
  }
}

export const reportService = new ReportService();
