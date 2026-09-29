import { describe, expect, it, vi } from "vitest";
import type { Entity } from "schema";
import {
  DEFAULT_REPORT_INCLUDE,
  buildReport,
  hashReportContent,
  renderReportMarkdown,
  type ReportDocument,
} from "entity-report-engine";
import { ReportService, type ReportServiceDeps } from "./report-service";

const document = (count = 1): ReportDocument =>
  buildReport(
    {
      entities: Array.from({ length: count }, (_, i) => ({
        id: `e${i}`,
        title: `E${i}`,
        type: "character",
        labels: [],
      })),
      relationships: [],
      factionMembership: {},
    },
    {
      scope: { origin: "graph" },
      include: { ...DEFAULT_REPORT_INCLUDE },
      detail: "standard",
    },
  );

const provenance = {
  origin: "graph" as const,
  entityIds: ["e0"],
  include: { ...DEFAULT_REPORT_INCLUDE },
  detail: "standard" as const,
};

function setup(store: Record<string, Entity> = {}) {
  const deps: ReportServiceDeps = {
    getEntity: (id) => store[id],
    createNote: vi.fn(async () => "new-id"),
    updateEntity: vi.fn(async () => true),
    copyContent: vi.fn(async () => true),
    now: () => 1000,
  };
  return { deps, service: new ReportService(deps) };
}

const savedReport = (
  content: string,
  hash = hashReportContent(content),
): Entity =>
  ({
    id: "r1",
    type: "note",
    title: "R",
    kind: "report",
    content,
    labels: ["report"],
    connections: [],
    report: { ...provenance, generatedAt: 1, contentHash: hash },
  }) as unknown as Entity;

describe("ReportService.save", () => {
  it("creates a report note with body in content, no connections and provenance", async () => {
    const { deps, service } = setup();
    const doc = document();
    const result = await service.save(doc, { title: "Party", provenance });
    expect(result).toEqual({ entityId: "new-id", created: true });
    const [title, data] = (deps.createNote as any).mock.calls[0];
    const content = renderReportMarkdown(doc);
    expect(title).toBe("Party");
    expect(data.kind).toBe("report");
    expect(data.labels).toEqual(["report"]);
    expect(data.connections).toBeUndefined();
    expect(data.lore).toBeUndefined();
    expect(data.content.startsWith("## Overview")).toBe(true);
    expect(data.report.contentHash).toBe(hashReportContent(content));
    expect(data.report.generatedAt).toBe(1000);
  });

  it("rejects a report with zero entities and writes nothing", async () => {
    const { deps, service } = setup();
    await expect(service.save(document(0), { provenance })).rejects.toThrow();
    expect(deps.createNote).not.toHaveBeenCalled();
  });

  it("creates a separate entity on every save", async () => {
    const { deps, service } = setup();
    await service.save(document(), { provenance });
    await service.save(document(), { provenance });
    expect(deps.createNote).toHaveBeenCalledTimes(2);
    expect(deps.updateEntity).not.toHaveBeenCalled();
  });
});

describe("ReportService.regenerate", () => {
  it("applies without confirmation when there are no manual edits", async () => {
    const { deps, service } = setup({ r1: savedReport("original") });
    const res = await service.regenerate("r1", document());
    expect(res).toEqual({ hadManualEdits: false, applied: true });
    const updates = (deps.updateEntity as any).mock.calls[0][1];
    expect(updates.report.origin).toBe("graph");
    expect(updates.report.contentHash).toBe(hashReportContent(updates.content));
  });

  it("writes nothing when there are manual edits and it is not confirmed", async () => {
    const { deps, service } = setup({
      r1: savedReport("edited by hand", hashReportContent("original")),
    });
    const res = await service.regenerate("r1", document());
    expect(res).toEqual({ hadManualEdits: true, applied: false });
    expect(deps.updateEntity).not.toHaveBeenCalled();
  });

  it("overwrites edited content once confirmed", async () => {
    const { deps, service } = setup({
      r1: savedReport("edited by hand", hashReportContent("original")),
    });
    const res = await service.regenerate("r1", document(), { confirmed: true });
    expect(res).toEqual({ hadManualEdits: true, applied: true });
    expect(deps.updateEntity).toHaveBeenCalledTimes(1);
  });

  it("fails safely for a note that is not a report", async () => {
    const { deps, service } = setup({
      n: { id: "n", type: "note", title: "N", content: "x" } as Entity,
    });
    expect(await service.regenerate("n", document())).toEqual({
      hadManualEdits: false,
      applied: false,
    });
    expect(await service.regenerate("missing", document())).toEqual({
      hadManualEdits: false,
      applied: false,
    });
    expect(deps.updateEntity).not.toHaveBeenCalled();
  });
});

describe("ReportService.export", () => {
  it("copies the saved markdown", async () => {
    const { deps, service } = setup({ r1: savedReport("## Overview") });
    expect(await service.export("r1", "markdown")).toBe(true);
    expect(deps.copyContent).toHaveBeenCalledWith({ markdown: "## Overview" });
  });

  it("returns false for unknown or non-report entities without copying", async () => {
    const { deps, service } = setup({
      n: { id: "n", type: "note", title: "N", content: "x" } as Entity,
    });
    expect(await service.export("missing", "markdown")).toBe(false);
    expect(await service.export("n", "markdown")).toBe(false);
    expect(deps.copyContent).not.toHaveBeenCalled();
  });

  it("resolves false when the clipboard throws", async () => {
    const { deps, service } = setup({ r1: savedReport("x") });
    (deps.copyContent as any).mockRejectedValueOnce(new Error("denied"));
    expect(await service.export("r1", "markdown")).toBe(false);
  });
});
