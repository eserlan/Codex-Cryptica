/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { Entity } from "schema";

vi.mock("./ReportZenActions", async (orig) => ({
  ...(await orig<typeof import("./ReportZenActions")>()),
  regenerateReport: vi.fn(),
  exportReport: vi.fn(),
}));

import ReportZenButtons from "./ReportZenButtons.svelte";

const base = { id: "n", type: "note", title: "N", content: "x" };

describe("ReportZenButtons", () => {
  it("shows Regenerate and Export for a report", () => {
    const entity = {
      ...base,
      kind: "report",
      report: { origin: "graph" },
    } as unknown as Entity;
    render(ReportZenButtons, { props: { entity } });
    expect(screen.getByTestId("report-regenerate-button")).toBeTruthy();
    expect(screen.getByTestId("report-export-button")).toBeTruthy();
  });

  it("shows nothing for an ordinary note", () => {
    render(ReportZenButtons, { props: { entity: base as unknown as Entity } });
    expect(screen.queryByTestId("report-regenerate-button")).toBeNull();
    expect(screen.queryByTestId("report-export-button")).toBeNull();
  });
});
