import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  handleChangeType,
  handleDeleteSelected,
  openBulkReport,
  openBulkLabels,
  handleManageLabels,
  withoutIds,
} from "./table-bulk-actions";
import { notificationStore } from "#lib/stores/ui/notification.svelte.js";
import { modalUIStore } from "#lib/stores/ui/modal-ui.svelte.js";
import { vault } from "#lib/stores/vault.svelte.js";
import * as OpenSelectionReport from "#lib/components/reports/open-selection-report.js";
import type { Entity } from "schema";

describe("table-bulk-actions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("withoutIds", () => {
    it("returns remaining ids correctly", () => {
      const selected = new Set(["a", "b", "c"]);
      const removed = new Set(["b"]);
      const remaining = withoutIds(selected, removed);
      expect(Array.from(remaining)).toEqual(["a", "c"]);
    });
  });

  describe("handleChangeType", () => {
    it("aborts if committing", async () => {
      const setCommitting = vi.fn();
      await handleChangeType("newType", ["a"], true, setCommitting);
      expect(setCommitting).not.toHaveBeenCalled();
    });

    it("aborts if no targetIds", async () => {
      const setCommitting = vi.fn();
      await handleChangeType("newType", [], false, setCommitting);
      expect(setCommitting).not.toHaveBeenCalled();
    });

    it("does nothing if unconfirmed", async () => {
      const setCommitting = vi.fn();
      vi.spyOn(notificationStore, "confirm").mockResolvedValue(false);
      await handleChangeType("newType", ["a"], false, setCommitting);
      expect(setCommitting).not.toHaveBeenCalled();
    });

    it("updates successfully", async () => {
      const setCommitting = vi.fn();
      vi.spyOn(notificationStore, "confirm").mockResolvedValue(true);
      vi.spyOn(vault, "bulkUpdate").mockResolvedValue({
        requested: 2,
        items: [],
        cancelledIds: [],
        skippedIds: [],
        succeededIds: ["a", "b"],
        failedIds: [],
      } as any);
      const notifySpy = vi.spyOn(notificationStore, "notify");

      await handleChangeType("newType", ["a", "b"], false, setCommitting);
      expect(setCommitting).toHaveBeenCalledWith(true);
      expect(vault.bulkUpdate).toHaveBeenCalledWith({
        a: { type: "newType" },
        b: { type: "newType" },
      });
      expect(notifySpy).not.toHaveBeenCalled();
      expect(setCommitting).toHaveBeenCalledWith(false);
    });

    it("notifies on partial failure", async () => {
      const setCommitting = vi.fn();
      vi.spyOn(notificationStore, "confirm").mockResolvedValue(true);
      vi.spyOn(vault, "bulkUpdate").mockResolvedValue({
        requested: 2,
        items: [],
        cancelledIds: [],
        skippedIds: [],
        succeededIds: ["a"],
        failedIds: ["b"],
      } as any);
      const notifySpy = vi.spyOn(notificationStore, "notify");

      await handleChangeType("newType", ["a", "b"], false, setCommitting);
      expect(notifySpy).toHaveBeenCalledWith(
        "Changed 1 entities; 1 could not be changed.",
        "error",
      );
    });

    it("notifies and resets committing on error", async () => {
      const setCommitting = vi.fn();
      vi.spyOn(notificationStore, "confirm").mockResolvedValue(true);
      vi.spyOn(vault, "bulkUpdate").mockRejectedValue(
        new Error("Network error"),
      );
      const notifySpy = vi.spyOn(notificationStore, "notify");

      await handleChangeType("newType", ["a"], false, setCommitting);
      expect(notifySpy).toHaveBeenCalledWith("Error: Network error", "error");
      expect(setCommitting).toHaveBeenCalledWith(false);
    });
  });

  describe("handleDeleteSelected", () => {
    it("does nothing if unconfirmed", async () => {
      const setCommitting = vi.fn();
      const updateSelection = vi.fn();
      const clearSelection = vi.fn();
      vi.spyOn(notificationStore, "confirm").mockResolvedValue(false);
      vi.spyOn(vault, "bulkDelete").mockImplementation(() =>
        Promise.resolve({
          requested: 0,
          items: [],
          skippedIds: [],
          failedIds: [],
          cancelledIds: [],
          succeededIds: [] as string[],
        }),
      );

      await handleDeleteSelected(
        ["a", "b"],
        false,
        setCommitting,
        updateSelection,
        clearSelection,
      );

      expect(setCommitting).not.toHaveBeenCalled();
      expect(vault.bulkDelete).not.toHaveBeenCalled();
      expect(updateSelection).not.toHaveBeenCalled();
      expect(clearSelection).not.toHaveBeenCalled();
    });

    it("preserves new selections made while delete was pending", async () => {
      const setCommitting = vi.fn();
      let capturedSelectedIds = new Set(["a", "b"]);
      const updateSelection = (succeededIds: Set<string>) => {
        // the route callback re-reads selectedIds at completion time
        capturedSelectedIds = withoutIds(capturedSelectedIds, succeededIds);
      };
      const clearSelection = vi.fn();

      vi.spyOn(notificationStore, "confirm").mockResolvedValue(true);
      // Simulate delete that takes time
      vi.spyOn(vault, "bulkDelete").mockImplementation(async () => {
        // User clicks row "c" while delete is pending
        capturedSelectedIds = new Set(["a", "b", "c"]);
        return {
          requested: 2,
          items: [],
          skippedIds: [],
          failedIds: [] as string[],
          cancelledIds: [] as string[],
          succeededIds: ["a", "b"],
        };
      });

      await handleDeleteSelected(
        ["a", "b"],
        false,
        setCommitting,
        updateSelection,
        clearSelection,
      );

      // "a" and "b" should be removed, but "c" should remain.
      expect(Array.from(capturedSelectedIds)).toEqual(["c"]);
    });

    it("deletes successfully and clears selection", async () => {
      const setCommitting = vi.fn();
      const updateSelection = vi.fn();
      const clearSelection = vi.fn();
      vi.spyOn(notificationStore, "confirm").mockResolvedValue(true);
      vi.spyOn(vault, "bulkDelete").mockResolvedValue({
        requested: 2,
        items: [],
        skippedIds: [],
        failedIds: [] as string[],
        cancelledIds: [] as string[],
        succeededIds: ["a", "b"],
      });
      const notifySpy = vi.spyOn(notificationStore, "notify");

      await handleDeleteSelected(
        ["a", "b"],
        false,
        setCommitting,
        updateSelection,
        clearSelection,
      );
      expect(vault.bulkDelete).toHaveBeenCalledWith(["a", "b"]);
      expect(updateSelection).toHaveBeenCalledWith(new Set(["a", "b"]));
      expect(clearSelection).toHaveBeenCalled();
      expect(notifySpy).not.toHaveBeenCalled();
    });

    it("notifies on partial failure", async () => {
      const setCommitting = vi.fn();
      const updateSelection = vi.fn();
      const clearSelection = vi.fn();
      vi.spyOn(notificationStore, "confirm").mockResolvedValue(true);
      vi.spyOn(vault, "bulkDelete").mockResolvedValue({
        requested: 2,
        items: [],
        skippedIds: [],
        failedIds: ["b"],
        cancelledIds: [] as string[],
        succeededIds: ["a"],
      });
      const notifySpy = vi.spyOn(notificationStore, "notify");

      await handleDeleteSelected(
        ["a", "b"],
        false,
        setCommitting,
        updateSelection,
        clearSelection,
      );
      expect(updateSelection).toHaveBeenCalledWith(new Set(["a"]));
      expect(notifySpy).toHaveBeenCalledWith(
        "Deleted 1 entities; 1 remain selected for retry.",
        "error",
      );
      expect(clearSelection).not.toHaveBeenCalled();
    });

    it("notifies and resets committing on error", async () => {
      const setCommitting = vi.fn();
      const updateSelection = vi.fn();
      const clearSelection = vi.fn();
      vi.spyOn(notificationStore, "confirm").mockResolvedValue(true);
      vi.spyOn(vault, "bulkDelete").mockRejectedValue(
        new Error("Network error"),
      );
      const notifySpy = vi.spyOn(notificationStore, "notify");

      await handleDeleteSelected(
        ["a", "b"],
        false,
        setCommitting,
        updateSelection,
        clearSelection,
      );
      expect(notifySpy).toHaveBeenCalledWith("Error: Network error", "error");
      expect(setCommitting).toHaveBeenCalledWith(false);
    });

    it("notifies on cancelled partial failure", async () => {
      const setCommitting = vi.fn();
      const updateSelection = vi.fn();
      const clearSelection = vi.fn();
      vi.spyOn(notificationStore, "confirm").mockResolvedValue(true);
      vi.spyOn(vault, "bulkDelete").mockResolvedValue({
        requested: 2,
        items: [],
        skippedIds: [],
        failedIds: [] as string[],
        cancelledIds: ["b"],
        succeededIds: ["a"],
      });
      const notifySpy = vi.spyOn(notificationStore, "notify");

      await handleDeleteSelected(
        ["a", "b"],
        false,
        setCommitting,
        updateSelection,
        clearSelection,
      );
      expect(updateSelection).toHaveBeenCalledWith(new Set(["a"]));
      expect(notifySpy).toHaveBeenCalledWith(
        "Deleted 1 entities; 1 remain selected for retry.",
        "error",
      );
      expect(clearSelection).not.toHaveBeenCalled();
    });
  });

  describe("openBulkReport", () => {
    it("calls openSelectionReport with correct ids", () => {
      const spy = vi
        .spyOn(OpenSelectionReport, "openSelectionReport")
        .mockImplementation(() => false);
      openBulkReport([{ id: "a" } as Entity, { id: "b" } as Entity]);
      expect(spy).toHaveBeenCalledWith("table", ["a", "b"]);
    });
  });

  describe("openBulkLabels", () => {
    it("calls modalUIStore with correct ids", () => {
      const spy = vi
        .spyOn(modalUIStore, "openBulkLabelDialog")
        .mockImplementation(() => {});
      openBulkLabels([{ id: "a" } as Entity, { id: "b" } as Entity]);
      expect(spy).toHaveBeenCalledWith(["a", "b"]);
    });

    it("does nothing if empty", () => {
      const spy = vi
        .spyOn(modalUIStore, "openBulkLabelDialog")
        .mockImplementation(() => {});
      openBulkLabels([]);
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe("handleManageLabels", () => {
    it("calls modalUIStore with correct ids", () => {
      const spy = vi
        .spyOn(modalUIStore, "openBulkLabelDialog")
        .mockImplementation(() => {});
      handleManageLabels(["a", "b"]);
      expect(spy).toHaveBeenCalledWith(["a", "b"]);
    });
  });
});
