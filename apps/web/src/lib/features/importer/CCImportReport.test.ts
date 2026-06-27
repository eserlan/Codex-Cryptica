/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { ImportReport } from "@codex/importer";
import CCImportReport from "./CCImportReport.svelte";

const report: ImportReport = {
  sourceSystem: "scabard",
  sourceLabel: "Scabard Campaign 42",
  committedAt: Date.now(),
  entitiesCreated: 2,
  entitiesUpdated: 1,
  itemsSkipped: 3,
  relationshipsCreated: 4,
  unresolvedReferences: [
    {
      fromRef: "hero-1",
      toRef: "town-9",
      type: "located_in",
      reason: 'toRef "town-9" could not be resolved',
    },
  ],
  assetsImported: 0,
  assetsSkipped: [{ id: "asset-1", reason: "No bytes provided" }],
  typeFallbacks: [{ sourceRef: "scabard:item:hero-1", sourceType: undefined }],
  warnings: [{ code: "TYPE_FALLBACK", message: "Used default type" }],
  failures: [
    {
      ref: "hero-1",
      stage: "connection",
      message: "write failed",
    },
  ],
};

describe("CCImportReport", () => {
  it("renders summary counts and report sections", () => {
    render(CCImportReport, {
      report,
      onDone: vi.fn(),
    });

    expect(screen.getByText("Scabard Campaign 42")).toBeTruthy();
    expect(screen.getByText("Created")).toBeTruthy();
    expect(screen.getByText("Updated")).toBeTruthy();
    expect(screen.getByText("Skipped")).toBeTruthy();
    expect(screen.getByText("Links")).toBeTruthy();
    expect(
      screen.getByText('toRef "town-9" could not be resolved'),
    ).toBeTruthy();
    expect(screen.getByText("write failed")).toBeTruthy();
  });

  it("fires done when dismissed", async () => {
    const onDone = vi.fn();

    render(CCImportReport, {
      report,
      onDone,
    });

    await fireEvent.click(screen.getByRole("button", { name: "Done" }));

    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
