import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Entity } from "schema";
import {
  handleChangeType,
  handleDeleteSelected,
  handleManageLabels,
  openBulkLabels,
  openBulkReport,
  withoutIds,
} from "./table-bulk-actions";

const mocks = vi.hoisted(() => ({
  confirm: vi.fn(),
  notify: vi.fn(),
  bulkDelete: vi.fn(),
  bulkUpdate: vi.fn(),
  openBulkLabelDialog: vi.fn(),
  openSelectionReport: vi.fn(),
}));

vi.mock("$lib/stores/ui/notification.svelte", () => ({
  notificationStore: { confirm: mocks.confirm, notify: mocks.notify },
}));
vi.mock("$lib/stores/ui/modal-ui.svelte", () => ({
  modalUIStore: { openBulkLabelDialog: mocks.openBulkLabelDialog },
}));
vi.mock("$lib/stores/vault.svelte", () => ({
  vault: { bulkDelete: mocks.bulkDelete, bulkUpdate: mocks.bulkUpdate },
}));
vi.mock("$lib/components/reports/open-selection-report", () => ({
  openSelectionReport: mocks.openSelectionReport,
}));

describe("table bulk actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.confirm.mockResolvedValue(true);
  });

  it("does not delete or change selection when confirmation is cancelled", async () => {
    mocks.confirm.mockResolvedValue(false);
    const setCommitting = vi.fn();
    const updateSelection = vi.fn();

    await handleDeleteSelected(["e1"], false, setCommitting, updateSelection);

    expect(mocks.bulkDelete).not.toHaveBeenCalled();
    expect(setCommitting).not.toHaveBeenCalled();
    expect(updateSelection).not.toHaveBeenCalled();
  });

  it("removes succeeded IDs from the current selection after a partial delete", async () => {
    let finishDelete!: (result: {
      succeededIds: string[];
      failedIds: string[];
      cancelledIds: string[];
    }) => void;
    mocks.bulkDelete.mockReturnValue(
      new Promise((resolve) => {
        finishDelete = resolve;
      }),
    );
    let selectedIds = new Set(["e1", "e2"]);
    const setCommitting = vi.fn();
    const updateSelection = (succeededIds: string[]) => {
      selectedIds = withoutIds(selectedIds, new Set(succeededIds));
    };

    const deletion = handleDeleteSelected(
      ["e1", "e2"],
      false,
      setCommitting,
      updateSelection,
    );
    await vi.waitFor(() => expect(mocks.bulkDelete).toHaveBeenCalled());

    selectedIds = new Set(["e2", "e3"]);
    finishDelete({ succeededIds: ["e1"], failedIds: ["e2"], cancelledIds: [] });
    await deletion;

    expect([...selectedIds]).toEqual(["e2", "e3"]);
    expect(setCommitting).toHaveBeenNthCalledWith(1, true);
    expect(setCommitting).toHaveBeenNthCalledWith(2, false);
    expect(mocks.notify).toHaveBeenCalledWith(
      "Deleted 1 entities; 1 remain selected for retry.",
      "error",
    );
  });

  it("confirms type changes and reports partial failures", async () => {
    mocks.bulkUpdate.mockResolvedValue({
      succeededIds: ["e1"],
      failedIds: ["e2"],
      skippedIds: [],
    });
    const setCommitting = vi.fn();

    await handleChangeType("location", ["e1", "e2"], false, setCommitting);

    expect(mocks.bulkUpdate).toHaveBeenCalledWith({
      e1: { type: "location" },
      e2: { type: "location" },
    });
    expect(setCommitting).toHaveBeenNthCalledWith(1, true);
    expect(setCommitting).toHaveBeenNthCalledWith(2, false);
    expect(mocks.notify).toHaveBeenCalledWith(
      "Changed 1 entities; 1 could not be changed.",
      "error",
    );
  });

  it("does not change entity types when confirmation is cancelled", async () => {
    mocks.confirm.mockResolvedValue(false);
    const setCommitting = vi.fn();

    await handleChangeType("location", ["e1"], false, setCommitting);

    expect(mocks.bulkUpdate).not.toHaveBeenCalled();
    expect(setCommitting).not.toHaveBeenCalled();
  });

  it("opens reports and label dialogs for selected entities", () => {
    const entities = [{ id: "e1" }, { id: "e2" }] as Entity[];

    openBulkReport(entities);
    openBulkLabels(entities);
    handleManageLabels(["e3"]);
    openBulkLabels([]);
    handleManageLabels([]);

    expect(mocks.openSelectionReport).toHaveBeenCalledWith("table", [
      "e1",
      "e2",
    ]);
    expect(mocks.openBulkLabelDialog).toHaveBeenNthCalledWith(1, ["e1", "e2"]);
    expect(mocks.openBulkLabelDialog).toHaveBeenNthCalledWith(2, ["e3"]);
  });
});
