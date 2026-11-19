import type { StatSheetField } from "schema";

/** Selection, drag/drop and keyboard ordering for one editor instance. */
export class StatSheetFieldOrder {
  constructor(
    private fields: () => StatSheetField[],
    private persist: (fields: StatSheetField[]) => void,
    private focusField: (id: string) => void = (id) => {
      requestAnimationFrame(() => {
        document
          .querySelector<HTMLElement>(
            `[data-field-id="${id}"] [data-testid="stat-sheet-drag-handle"]`,
          )
          ?.focus();
      });
    },
  ) {}

  draggedIndex = $state<number | null>(null);
  dragOverIndex = $state<number | null>(null);
  selectedFieldId = $state<string | null>(null);

  handleDragStart = (e: DragEvent, index: number) => {
    this.draggedIndex = index;
    this.selectedFieldId = this.fields()[index]?.id ?? null;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(index));
    }
  };

  handleDragOver = (e: DragEvent, index: number) => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "move";
    }
    if (this.dragOverIndex !== index) {
      this.dragOverIndex = index;
    }
  };

  handleDrop = (e: DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (this.draggedIndex === null || this.draggedIndex === targetIndex) {
      this.draggedIndex = null;
      this.dragOverIndex = null;
      return;
    }

    const next = [...this.fields()];
    const [moved] = next.splice(this.draggedIndex, 1);
    next.splice(targetIndex, 0, moved);

    this.draggedIndex = null;
    this.dragOverIndex = null;
    this.selectedFieldId = moved.id;
    this.persist(next);
  };

  handleDragEnd = () => {
    this.draggedIndex = null;
    this.dragOverIndex = null;
  };

  handleFieldKeyDown = (e: KeyboardEvent, index: number) => {
    if ((e.altKey || e.ctrlKey) && e.key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();
      this.moveField(index, -1);
    } else if ((e.altKey || e.ctrlKey) && e.key === "ArrowDown") {
      e.preventDefault();
      e.stopPropagation();
      this.moveField(index, 1);
    }
  };

  handleContainerKeyDown = (e: KeyboardEvent) => {
    if (
      (e.altKey || e.ctrlKey) &&
      (e.key === "ArrowUp" || e.key === "ArrowDown")
    ) {
      if (!this.selectedFieldId) return;
      const index = this.fields().findIndex(
        (f) => f.id === this.selectedFieldId,
      );
      if (index === -1) return;
      e.preventDefault();
      e.stopPropagation();
      this.moveField(index, e.key === "ArrowUp" ? -1 : 1);
    }
  };

  moveField = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= this.fields().length) return;
    const movedId = this.fields()[index].id;
    this.selectedFieldId = movedId;
    const next = [...this.fields()];
    [next[index], next[target]] = [next[target], next[index]];
    this.persist(next);

    this.focusField(movedId);
  };
}
