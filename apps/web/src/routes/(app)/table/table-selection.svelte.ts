import type { Entity } from "schema";
import * as bulkActions from "#lib/components/table/table-bulk-actions.js";

/** Selection and context-menu state for the currently visible table rows. */
export class TableSelection {
  selectedIds = $state<Set<string>>(new Set());
  private lastSelectedId = $state<string | null>(null);
  contextMenu = $state<{ x: number; y: number; targetIds: string[] } | null>(
    null,
  );
  private isCommitting = $state(false);

  constructor(
    private readonly getRows: () => Entity[],
    private readonly actions: Pick<
      typeof bulkActions,
      | "handleManageLabels"
      | "handleChangeType"
      | "handleDeleteSelected"
      | "openBulkReport"
      | "openBulkLabels"
    > = bulkActions,
  ) {}

  get selectedVisible() {
    return this.getRows().filter((e) => this.selectedIds.has(e.id));
  }
  get allSelected() {
    const rows = this.getRows();
    return rows.length > 0 && rows.every((e) => this.selectedIds.has(e.id));
  }
  get someSelected() {
    return this.selectedVisible.length > 0 && !this.allSelected;
  }

  toggleRow = (id: string, options?: { shift?: boolean; ctrl?: boolean }) => {
    const next = new Set(this.selectedIds);
    if (options?.shift && this.lastSelectedId && this.lastSelectedId !== id) {
      this.toggleRange(next, id, this.lastSelectedId);
    } else {
      this.toggleSingleRow(next, id);
    }
    this.selectedIds = next;
  };

  private toggleRange(next: Set<string>, id: string, anchorId: string) {
    const rows = this.getRows();
    const currentIndex = rows.findIndex((e) => e.id === id);
    const anchorIndex = rows.findIndex((e) => e.id === anchorId);
    if (currentIndex === -1 || anchorIndex === -1) return;
    const shouldSelect = this.selectedIds.has(anchorId);
    for (
      let i = Math.min(currentIndex, anchorIndex);
      i <= Math.max(currentIndex, anchorIndex);
      i++
    ) {
      if (shouldSelect) next.add(rows[i].id);
      else next.delete(rows[i].id);
    }
  }

  private toggleSingleRow(next: Set<string>, id: string) {
    if (next.has(id)) {
      next.delete(id);
      if (this.lastSelectedId === id) this.lastSelectedId = null;
    } else {
      next.add(id);
      this.lastSelectedId = id;
    }
  }

  toggleAll = () => {
    if (this.allSelected) {
      this.clearSelection();
      return;
    }
    const rows = this.getRows();
    this.selectedIds = new Set(rows.map((e) => e.id));
    this.lastSelectedId = rows.length > 0 ? rows[0].id : null;
  };

  clearSelection = () => {
    this.selectedIds = new Set();
    this.lastSelectedId = null;
  };
  reset = () => {
    this.clearSelection();
    this.contextMenu = null;
  };
  closeContextMenu = () => {
    this.contextMenu = null;
  };

  handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    if (this.contextMenu) this.closeContextMenu();
    else this.clearSelection();
  };

  handleRowContextMenu = (id: string, x: number, y: number) => {
    if (!this.selectedIds.has(id)) {
      this.selectedIds = new Set([id]);
      this.lastSelectedId = id;
    }
    this.contextMenu = { x, y, targetIds: Array.from(this.selectedIds) };
  };

  handleManageLabels = () => {
    if (this.contextMenu)
      this.actions.handleManageLabels(this.contextMenu.targetIds);
  };

  handleChangeType = (type: string) => {
    if (!this.contextMenu) return;
    this.actions.handleChangeType(
      type,
      this.contextMenu.targetIds,
      this.isCommitting,
      this.setCommitting,
    );
  };

  handleDeleteSelected = () => {
    if (!this.contextMenu) return;
    this.actions.handleDeleteSelected(
      this.contextMenu.targetIds,
      this.isCommitting,
      this.setCommitting,
      (succeededIds) => {
        this.selectedIds = bulkActions.withoutIds(
          new Set(this.selectedIds),
          succeededIds,
        );
      },
      this.clearSelection,
    );
  };

  private setCommitting = (value: boolean) => {
    this.isCommitting = value;
  };
  openBulkReport = () => this.actions.openBulkReport(this.selectedVisible);
  openBulkLabels = () => this.actions.openBulkLabels(this.selectedVisible);
}
