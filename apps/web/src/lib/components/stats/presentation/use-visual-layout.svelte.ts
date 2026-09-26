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
import { systemIdGenerator } from "$lib/utils/runtime-deps";

export function useVisualLayout({
  source,
  schemaFields,
  fieldDisplayOverrides,
  onSourceUpdate,
  idGenerator = systemIdGenerator.uuid,
}: {
  source: () => string;
  schemaFields: () => StatSheetField[];
  fieldDisplayOverrides: () => Record<string, { displayMode?: string; hideLabel?: boolean }>;
  onSourceUpdate: (newSource: string) => void;
  idGenerator?: () => string;
}) {
  let localCards = $state<VisualCard[]>(parseCardsFromSource(source(), schemaFields(), idGenerator));

  let lastSyncedSource = $state(source());

  $effect(() => {
    if (source() !== lastSyncedSource) {
      localCards = parseCardsFromSource(source(), schemaFields(), idGenerator);
      lastSyncedSource = source();
    }
  });

  let draggedCardIndex = $state<number | null>(null);

  let draggedField = $state<
    | { type: "move"; cardId: string; rowIndex: number; fieldId: string }
    | { type: "sidebar"; fieldId: string }
    | null
  >(null);

  function resetFromSource() {
    localCards = parseCardsFromSource(source(), schemaFields(), idGenerator);
  }

  function handleSyncSourceFromVisualCards(cards: VisualCard[]) {
    const newSource = syncSourceFromVisualCards(cards, schemaFields(), fieldDisplayOverrides());
    lastSyncedSource = newSource;
    onSourceUpdate(newSource);
  }

  function addVisualCard(mode: "grid" | "table" = "grid") {
    localCards = addVisualCardOp(localCards, mode, idGenerator);
    handleSyncSourceFromVisualCards(localCards);
  }

  function updateCardColumns(cardId: string, value: number) {
    localCards = updateCardColumnsOp(localCards, cardId, value);
    handleSyncSourceFromVisualCards(localCards);
  }

  function updateTableHeader(cardId: string, headerIndex: number, value: string) {
    localCards = updateTableHeaderOp(localCards, cardId, headerIndex, value);
    handleSyncSourceFromVisualCards(localCards);
  }

  function removeVisualCard(cardId: string) {
    localCards = removeVisualCardOp(localCards, cardId);
    handleSyncSourceFromVisualCards(localCards);
  }

  function addRowToCard(cardId: string) {
    localCards = addRowToCardOp(localCards, cardId);
    handleSyncSourceFromVisualCards(localCards);
  }

  function removeRowFromCard(cardId: string, rowIndex: number) {
    localCards = removeRowFromCardOp(localCards, cardId, rowIndex);
    handleSyncSourceFromVisualCards(localCards);
  }

  function addFieldToCardRow(cardId: string, rowIndex: number, fieldId: string) {
    localCards = addFieldToCardRowOp(localCards, cardId, rowIndex, fieldId);
    handleSyncSourceFromVisualCards(localCards);
  }

  function addValueToTableRow(cardId: string, rowIndex: number) {
    localCards = addValueToTableRowOp(localCards, cardId, rowIndex);
    handleSyncSourceFromVisualCards(localCards);
  }

  function updateValueInTableRow(cardId: string, rowIndex: number, cellIndex: number, value: string) {
    localCards = updateValueInTableRowOp(localCards, cardId, rowIndex, cellIndex, value);
    handleSyncSourceFromVisualCards(localCards);
  }

  function removeValueFromTableRow(cardId: string, rowIndex: number, cellIndex: number) {
    localCards = removeValueFromTableRowOp(localCards, cardId, rowIndex, cellIndex);
    handleSyncSourceFromVisualCards(localCards);
  }

  function removeFieldFromCardRow(cardId: string, rowIndex: number, fieldId: string) {
    localCards = removeFieldFromCardRowOp(localCards, cardId, rowIndex, fieldId);
    handleSyncSourceFromVisualCards(localCards);
  }

  function moveCard(index: number, direction: -1 | 1) {
    localCards = moveCardOp(localCards, index, direction);
    handleSyncSourceFromVisualCards(localCards);
  }

  function handleCardDragStart(index: number) {
    draggedCardIndex = index;
  }

  function handleCardDragOver(e: DragEvent, index: number) {
    if (draggedCardIndex === null || draggedCardIndex === index) return;
    e.preventDefault();
    localCards = reorderCardsOp(localCards, draggedCardIndex, index);
    draggedCardIndex = index;
    handleSyncSourceFromVisualCards(localCards);
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

    localCards = moveFieldBetweenRowsOp(
      localCards,
      srcCardId,
      srcRowIndex,
      fieldId,
      targetCardId,
      targetRowIndex,
    );
    handleSyncSourceFromVisualCards(localCards);
  }

  return {
    get visualCards() { return localCards; },
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
