import type { PromotionScope } from "session-journal-engine";

/**
 * Session Journal (#3402 slice 4, #3409): the small amount of UI state behind
 * turning journal content into entities, kept out of the view. Which parts are
 * chosen while "Choose parts" is on, and which scope the type-and-name form is
 * open for.
 *
 * Choosing a section and choosing its entries are independent (FR-036); the
 * engine removes any overlap when it builds the entity.
 */
export class JournalPromotionState {
  selecting = $state(false);
  entryIds = $state<string[]>([]);
  sectionIds = $state<string[]>([]);
  formScope = $state<PromotionScope | undefined>(undefined);

  get hasSelection(): boolean {
    return this.entryIds.length > 0 || this.sectionIds.length > 0;
  }

  startSelecting(): void {
    this.selecting = true;
  }

  stopSelecting(): void {
    this.selecting = false;
    this.entryIds = [];
    this.sectionIds = [];
  }

  toggleEntry(id: string): void {
    if (!this.selecting) return;
    this.entryIds = toggle(this.entryIds, id);
  }

  toggleSection(id: string): void {
    if (!this.selecting) return;
    this.sectionIds = toggle(this.sectionIds, id);
  }

  isEntrySelected(id: string): boolean {
    return this.entryIds.includes(id);
  }

  isSectionSelected(id: string): boolean {
    return this.sectionIds.includes(id);
  }

  selectionScope(): PromotionScope {
    return {
      kind: "selection",
      entryIds: [...this.entryIds],
      sectionIds: [...this.sectionIds],
    };
  }

  /** Opens the form for `scope`. Refuses (returns false) when a selection is
   *  empty, since there would be nothing to make. */
  openForm(scope: PromotionScope): boolean {
    if (
      scope.kind === "selection" &&
      scope.entryIds.length === 0 &&
      scope.sectionIds.length === 0
    ) {
      return false;
    }
    this.formScope = scope;
    return true;
  }

  closeForm(): void {
    this.formScope = undefined;
  }

  reset(): void {
    this.stopSelecting();
    this.closeForm();
  }
}

function toggle(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}
