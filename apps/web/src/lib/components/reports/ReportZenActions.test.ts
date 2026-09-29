import { describe, expect, it, vi } from "vitest";
import type { Entity } from "schema";
import {
  exportReport,
  isReportEntity,
  regenerateReport,
  type ReportZenActionDeps,
} from "./ReportZenActions";

const provenance = {
  origin: "graph" as const,
  entityIds: ["a"],
  include: {
    descriptions: true,
    relationships: true,
    factionsAffiliations: true,
    portraits: true,
    notes: true,
    gmOnlySecrets: false,
  },
  detail: "standard" as const,
  generatedAt: 1,
  contentHash: "x",
};
const report = {
  id: "r",
  type: "note",
  title: "R",
  kind: "report",
  content: "x",
  report: provenance,
} as unknown as Entity;
const source = {
  id: "a",
  type: "character",
  title: "A",
  labels: [],
  connections: [],
  content: "",
} as unknown as Entity;

function deps(over: Partial<ReportZenActionDeps> = {}): ReportZenActionDeps {
  return {
    service: {
      regenerate: vi.fn(async () => ({ hadManualEdits: false, applied: true })),
      export: vi.fn(async () => true),
    },
    getEntity: (id) => (id === "a" ? source : undefined),
    getCanvas: () => undefined,
    confirm: vi.fn(async () => true),
    notify: vi.fn(),
    ...over,
  };
}

describe("isReportEntity", () => {
  it("is true only for report notes with provenance", () => {
    expect(isReportEntity(report)).toBe(true);
    expect(isReportEntity({ kind: "delve-dossier" } as Entity)).toBe(false);
    expect(isReportEntity({ kind: "report" } as Entity)).toBe(false);
    expect(isReportEntity(undefined)).toBe(false);
  });
});

describe("regenerateReport", () => {
  it("applies directly when there are no manual edits", async () => {
    const d = deps();
    expect(await regenerateReport(report, d)).toBe("applied");
    expect(d.confirm).not.toHaveBeenCalled();
  });

  it("asks first when edited, and does nothing if declined", async () => {
    const regenerate = vi.fn(async () => ({
      hadManualEdits: true,
      applied: false,
    }));
    const d = deps({
      service: { regenerate, export: vi.fn() },
      confirm: vi.fn(async () => false),
    });
    expect(await regenerateReport(report, d)).toBe("cancelled");
    expect(regenerate).toHaveBeenCalledTimes(1);
  });

  it("applies with confirmation when edited and confirmed", async () => {
    const regenerate = vi
      .fn()
      .mockResolvedValueOnce({ hadManualEdits: true, applied: false })
      .mockResolvedValueOnce({ hadManualEdits: true, applied: true });
    const d = deps({ service: { regenerate, export: vi.fn() } });
    expect(await regenerateReport(report, d)).toBe("applied");
    expect(regenerate).toHaveBeenLastCalledWith("r", expect.anything(), {
      confirmed: true,
    });
  });

  it("explains and changes nothing when the source is gone", async () => {
    const regenerate = vi.fn();
    const d = deps({
      service: { regenerate, export: vi.fn() },
      getEntity: () => undefined,
    });
    expect(await regenerateReport(report, d)).toBe("source-missing");
    expect(regenerate).not.toHaveBeenCalled();
    expect(d.notify).toHaveBeenCalled();
  });

  it("fails safely for a non-report entity", async () => {
    const d = deps();
    expect(await regenerateReport(source, d)).toBe("failed");
  });
});

describe("exportReport", () => {
  it("copies a report", async () => {
    const d = deps();
    expect(await exportReport(report, d)).toBe(true);
    expect(d.service.export).toHaveBeenCalledWith("r", "markdown");
  });

  it("does nothing for an ordinary note", async () => {
    const d = deps();
    expect(await exportReport(source, d)).toBe(false);
    expect(d.service.export).not.toHaveBeenCalled();
  });
});
