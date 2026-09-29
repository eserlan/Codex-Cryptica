/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { vaultState, openSelectionReport } = vi.hoisted(() => ({
  vaultState: { isGuest: false },
  openSelectionReport: vi.fn(),
}));

vi.mock("$lib/stores/vault.svelte", () => ({ vault: vaultState }));
vi.mock("$lib/components/reports/open-selection-report", () => ({
  openSelectionReport,
}));

import GraphReportAction from "./GraphReportAction.svelte";

function fakeCy(ids: string[]) {
  return {
    $: () => ({
      map: (fn: (n: { id: () => string }) => string) =>
        ids.map((id) => fn({ id: () => id })),
    }),
    on: vi.fn(),
    off: vi.fn(),
  } as any;
}

describe("GraphReportAction", () => {
  beforeEach(() => {
    vaultState.isGuest = false;
    openSelectionReport.mockClear();
  });

  it("opens a report for the selected nodes", async () => {
    render(GraphReportAction, { props: { cy: fakeCy(["a", "b"]) } });
    await fireEvent.click(screen.getByTestId("graph-generate-report"));
    expect(openSelectionReport).toHaveBeenCalledWith("graph", ["a", "b"]);
  });

  it("is hidden with no selection", () => {
    render(GraphReportAction, { props: { cy: fakeCy([]) } });
    expect(screen.queryByTestId("graph-generate-report")).toBeNull();
  });

  it("is hidden for a guest", () => {
    vaultState.isGuest = true;
    render(GraphReportAction, { props: { cy: fakeCy(["a"]) } });
    expect(screen.queryByTestId("graph-generate-report")).toBeNull();
  });
});
