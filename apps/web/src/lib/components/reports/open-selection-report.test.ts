import { beforeEach, describe, expect, it, vi } from "vitest";

const { notify, entities } = vi.hoisted(() => ({
  notify: vi.fn(),
  entities: {
    a: {
      id: "a",
      type: "character",
      title: "A",
      labels: [],
      connections: [],
      content: "",
    },
    b: {
      id: "b",
      type: "character",
      title: "B",
      labels: [],
      connections: [],
      content: "",
    },
  } as Record<string, unknown>,
}));

vi.mock("$lib/stores/vault.svelte", () => ({ vault: { entities } }));
vi.mock("$lib/stores/ui/notification.svelte", () => ({
  notificationStore: { notify },
}));

import { reportPanelStore } from "$lib/stores/ui/report-panel.svelte";
import { openSelectionReport } from "./open-selection-report";

describe("openSelectionReport", () => {
  beforeEach(() => {
    reportPanelStore.close();
    notify.mockClear();
  });

  it("opens the panel with the selected entities", () => {
    expect(openSelectionReport("table", ["a", "b"])).toBe(true);
    expect(reportPanelStore.request?.source).toEqual({
      origin: "table",
      entityIds: ["a", "b"],
    });
    expect(reportPanelStore.request?.rescope).toBeUndefined();
  });

  it("opens nothing for a single selection, even when duplicated", () => {
    expect(openSelectionReport("graph", ["a"])).toBe(false);
    expect(openSelectionReport("table", ["a", "a"])).toBe(false);
    expect(openSelectionReport("graph", ["a", "missing"])).toBe(false);
    expect(reportPanelStore.request).toBeNull();
    expect(notify).toHaveBeenCalledWith(
      "Select at least two entities to generate a report.",
      "info",
    );
  });

  it("explains and opens nothing for an empty selection", () => {
    expect(openSelectionReport("graph", [])).toBe(false);
    expect(reportPanelStore.request).toBeNull();
    expect(notify).toHaveBeenCalled();
  });
});
