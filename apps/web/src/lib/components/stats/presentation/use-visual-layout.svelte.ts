import {
  type VisualCard,
  parseCardsFromSource,
} from "./visual-card-parser";
import {
  addVisualCard as addVisualCardOp,
  updateCardColumns as updateCardColumnsOp,
  updateTableHeader as updateTableHeaderOp,
  removeVisualCard as removeVisualCardOp,
  addRowToCard as addRowToCardOp,
  removeRowFromCard as removeRowFromCardOp,
  addFieldToCardRow as addFieldToCardRowOp,
  removeFieldFromCardRow as removeFieldFromCardRowOp,
  addValueToTableRow as addValueToTableRowOp,
  updateValueInTableRow as updateValueInTableRowOp,
  removeValueFromTableRow as removeValueFromTableRowOp,
  moveCard as moveCardOp,
  reorderCards as reorderCardsOp,
  moveFieldBetweenRows as moveFieldBetweenRowsOp,
} from "./visual-card-operations";
import { syncSourceFromVisualCards } from "./visual-card-serializer";
import type { StatSheetField } from "schema";

export function useVisualLayout({
  source,
  schemaFields,
  fieldDisplayOverrides,
  onSourceUpdate,
}: {
  source: () => string;
  schemaFields: () => StatSheetField[];
  fieldDisplayOverrides: () => Record<string, { displayMode?: string; hideLabel?: boolean }>;
  onSourceUpdate: (newSource: string) => void;
}) {
  let visualCards = $state<VisualCard[]>(
    parseCardsFromSource(source(), schemaFields())
  );

  let draggedCardIndex = $state<number | null>(null);

  let draggedField = $state<
    | { type: "move"; cardId: string; rowIndex: number; fieldId: string }
    | { type: "sidebar"; fieldId: string }
    | null
  >(null);

  function resetFromSource() {
    visualCards = parseCardsFromSource(source(), schemaFields());
  }

  function handleSyncSourceFromVisualCards(cards: VisualCard[]) {
    onSourceUpdate(syncSourceFromVisualCards(cards, schemaFields(), fieldDisplayOverrides()));
  }

  function addVisualCard(mode: "grid" | "table" = "grid") {
    visualCards = addVisualCardOp(visualCards, mode);
    handleSyncSourceFromVisualCards(visualCards);
  }

  function updateCardColumns(cardId: string, value: number) {
    visualCards = updateCardColumnsOp(visualCards, cardId, value);
    handleSyncSourceFromVisualCards(visualCards);
  }

  function updateTableHeader(cardId: string, headerIndex: number, value: string) {
    visualCards = updateTableHeaderOp(visualCards, cardId, headerIndex, value);
    handleSyncSourceFromVisualCards(visualCards);
  }

  function removeVisualCard(cardId: string) {
    visualCards = removeVisualCardOp(visualCards, cardId);
    handleSyncSourceFromVisualCards(visualCards);
  }

  function addRowToCard(cardId: string) {
    visualCards = addRowToCardOp(visualCards, cardId);
    handleSyncSourceFromVisualCards(visualCards);
  }

  function removeRowFromCard(cardId: string, rowIndex: number) {
    visualCards = removeRowFromCardOp(visualCards, cardId, rowIndex);
    handleSyncSourceFromVisualCards(visualCards);
  }

  function addFieldToCardRow(cardId: string, rowIndex: number, fieldId: string) {
    visualCards = addFieldToCardRowOp(visualCards, cardId, rowIndex, fieldId);
    handleSyncSourceFromVisualCards(visualCards);
  }

  function addValueToTableRow(cardId: string, rowIndex: number) {
    visualCards = addValueToTableRowOp(visualCards, cardId, rowIndex);
    handleSyncSourceFromVisualCards(visualCards);
  }

  function updateValueInTableRow(cardId: string, rowIndex: number, cellIndex: number, value: string) {
    visualCards = updateValueInTableRowOp(visualCards, cardId, rowIndex, cellIndex, value);
    handleSyncSourceFromVisualCards(visualCards);
  }

  function removeValueFromTableRow(cardId: string, rowIndex: number, cellIndex: number) {
    visualCards = removeValueFromTableRowOp(visualCards, cardId, rowIndex, cellIndex);
    handleSyncSourceFromVisualCards(visualCards);
  }

  function removeFieldFromCardRow(cardId: string, rowIndex: number, fieldId: string) {
    visualCards = removeFieldFromCardRowOp(visualCards, cardId, rowIndex, fieldId);
    handleSyncSourceFromVisualCards(visualCards);
  }

  function moveCard(index: number, direction: -1 | 1) {
    visualCards = moveCardOp(visualCards, index, direction);
    handleSyncSourceFromVisualCards(visualCards);
  }

  function handleCardDragStart(index: number) {
    draggedCardIndex = index;
  }

  function handleCardDragOver(e: DragEvent, index: number) {
    if (draggedCardIndex === null || draggedCardIndex === index) return;
    e.preventDefault();
    visualCards = reorderCardsOp(visualCards, draggedCardIndex, index);
    draggedCardIndex = index;
    handleSyncSourceFromVisualCards(visualCards);
  }

  function handleCardDragEnd() {
    draggedCardIndex = null;
  }

  function handleFieldDragStart(e: DragEvent, cardId: string, rowIndex: number, fieldId: string) {
    e.stopPropagation();
    draggedField = { type: "move", cardId, rowIndex, fieldId };
  }

  function handleSidebarFieldDragStart(e: DragEvent, fieldId: string) {
    e.stopPropagation();
    draggedField = { type: "sidebar", fieldId };
  }

  function handleFieldDropRow(e: DragEvent, targetCardId: string, targetRowIndex: number) {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedField) return;

    if (draggedField.type === "sidebar") {
      const fieldId = draggedField.fieldId;
      draggedField = null;
      addFieldToCardRow(targetCardId, targetRowIndex, fieldId);
      return;
    }

    const { cardId: srcCardId, rowIndex: srcRowIndex, fieldId } = draggedField;
    draggedField = null;

    visualCards = moveFieldBetweenRowsOp(
      visualCards,
      srcCardId,
      srcRowIndex,
      fieldId,
      targetCardId,
      targetRowIndex,
    );
    handleSyncSourceFromVisualCards(visualCards);
  }

  return {
    get visualCards() { return visualCards; },
    get draggedCardIndex() { return draggedCardIndex; },
    get draggedField() { return draggedField; },
    resetFromSource,
    handleSyncSourceFromVisualCards,
    addVisualCard,
    updateCardColumns,
    updateTableHeader,
    removeVisualCard,
    addRowToCard,
    removeRowFromCard,
    addFieldToCardRow,
    addValueToTableRow,
    updateValueInTableRow,
    removeValueFromTableRow,
    removeFieldFromCardRow,
    moveCard,
    handleCardDragStart,
    handleCardDragOver,
    handleCardDragEnd,
    handleFieldDragStart,
    handleSidebarFieldDragStart,
    handleFieldDropRow,
  };
}
