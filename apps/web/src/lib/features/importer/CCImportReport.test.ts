/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { ImportReport } from "@codex/importer";
import CCImportReport from "./CCImportReport.svelte";

function baseReport(overrides: Partial<ImportReport> = {}): ImportReport {
  return {
    sourceSystem: "cif",
    sourceLabel: "Test World",
    committedAt: Date.now(),
    entitiesCreated: 1,
    entitiesUpdated: 0,
    itemsSkipped: 0,
    relationshipsCreated: 0,
    unresolvedReferences: [],
    assetsImported: 0,
    assetsSkipped: [],
    typeFallbacks: [],
    duplicatesSkipped: [],
    warnings: [],
    failures: [],
    ...overrides,
  };
}

describe("CCImportReport — duplicatesSkipped (T021/FR-013)", () => {
  it("renders no duplicates section when nothing was skipped", () => {
    render(CCImportReport, { report: baseReport(), onDone: vi.fn() });

    expect(
      document.querySelector('[data-testid="import-report-duplicates"]'),
    ).toBeNull();
  });

  it("renders the duplicates-skipped section and its entries", () => {
    render(CCImportReport, {
      report: baseReport({
        duplicatesSkipped: [
          { fromRef: "cif:entity:a", toRef: "cif:entity:b", type: "knows" },
        ],
      }),
      onDone: vi.fn(),
    });

    const section = document.querySelector(
      '[data-testid="import-report-duplicates"]',
    );
    expect(section).toBeTruthy();
    expect(screen.getByText("cif:entity:a -> cif:entity:b")).toBeTruthy();
    expect(screen.getByText("knows")).toBeTruthy();
  });
});
