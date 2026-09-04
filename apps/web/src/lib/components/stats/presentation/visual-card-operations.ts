import type { VisualCard } from "./visual-card-parser";

/**
 * Creates a new VisualCard with default settings.
 */
export function createVisualCard(
  mode: "grid" | "table" = "grid",
  count: number = 0,
  idGenerator: () => string = () => Math.random().toString(36).slice(2, 9),
): VisualCard {
  return {
    id: idGenerator(),
    title: mode === "table" ? `Table ${count + 1}` : `Section ${count + 1}`,
    columns: 2,
    mode,
    tableHeaders:
      mode === "table" ? ["Stat / Item", "Value / Dice"] : undefined,
    rows: [[]],
  };
}

/**
 * Appends a new VisualCard to the list of cards.
 */
export function addVisualCard(
  cards: VisualCard[],
  mode: "grid" | "table" = "grid",
  idGenerator?: () => string,
): VisualCard[] {
  return [...cards, createVisualCard(mode, cards.length, idGenerator)];
}

/**
 * Updates columns count for a card, clamping between 1 and 6,
 * and adjusts tableHeaders/rows if the card is in table mode.
 */
export function updateCardColumns(
  cards: VisualCard[],
  cardId: string,
  value: number,
): VisualCard[] {
  const columns = Math.max(1, Math.min(6, Math.round(value) || 1));
  return cards.map((card) => {
    if (card.id !== cardId) return card;
    if (card.mode !== "table") return { ...card, columns };

    const existingHeaders = card.tableHeaders ?? [];
    return {
      ...card,
      columns,
      tableHeaders: Array.from(
        { length: columns },
        (_, index) => existingHeaders[index] ?? `Column ${index + 1}`,
      ),
      rows: card.rows.map((row) => row.slice(0, columns)),
    };
  });
}

/**
 * Updates a single table header text by column index.
 */
export function updateTableHeader(
  cards: VisualCard[],
  cardId: string,
  headerIndex: number,
  value: string,
): VisualCard[] {
  return cards.map((card) => {
    if (card.id !== cardId || card.mode !== "table") return card;
    if (headerIndex < 0 || headerIndex >= card.columns) return card;
    const existingHeaders = card.tableHeaders ?? [];
    const headers = Array.from(
      { length: card.columns },
      (_, index) => existingHeaders[index] ?? `Column ${index + 1}`,
    );
    headers[headerIndex] = value;
    return { ...card, tableHeaders: headers };
  });
}

/**
 * Updates card title.
 */
export function updateCardTitle(
  cards: VisualCard[],
  cardId: string,
  title: string,
): VisualCard[] {
  return cards.map((c) => (c.id === cardId ? { ...c, title } : c));
}

/**
 * Removes a VisualCard by id.
 */
export function removeVisualCard(
  cards: VisualCard[],
  cardId: string,
): VisualCard[] {
  return cards.filter((c) => c.id !== cardId);
}

/**
 * Appends an empty row to a card.
 */
export function addRowToCard(
  cards: VisualCard[],
  cardId: string,
): VisualCard[] {
  return cards.map((c) =>
    c.id === cardId ? { ...c, rows: [...c.rows, []] } : c,
  );
}

/**
 * Removes a row by index from a card. If all rows are removed, preserves a single empty row.
 */
export function removeRowFromCard(
  cards: VisualCard[],
  cardId: string,
  rowIndex: number,
): VisualCard[] {
  return cards.map((c) => {
    if (c.id !== cardId) return c;
    const nextRows = c.rows.filter((_, idx) => idx !== rowIndex);
    return { ...c, rows: nextRows.length > 0 ? nextRows : [[]] };
  });
}

/**
 * Adds a stat sheet field cell to a specified row.
 */
export function addFieldToCardRow(
  cards: VisualCard[],
  cardId: string,
  rowIndex: number,
  fieldId: string,
): VisualCard[] {
  return cards.map((c) => {
    if (c.id !== cardId) return c;
    const nextRows = c.rows.map((r, idx) =>
      idx === rowIndex && (c.mode !== "table" || r.length < c.columns)
        ? [...r, { kind: "field" as const, fieldId }]
        : r,
    );
    return { ...c, rows: nextRows };
  });
}

/**
 * Removes a field cell with matching fieldId from a row.
 */
export function removeFieldFromCardRow(
  cards: VisualCard[],
  cardId: string,
  rowIndex: number,
  fieldId: string,
): VisualCard[] {
  return cards.map((c) => {
    if (c.id !== cardId) return c;
    const nextRows = c.rows.map((r, idx) =>
      idx === rowIndex
        ? r.filter((cell) => cell.kind !== "field" || cell.fieldId !== fieldId)
        : r,
    );
    return { ...c, rows: nextRows };
  });
}

/**
 * Adds a custom value cell to a table row if capacity permits.
 */
export function addValueToTableRow(
  cards: VisualCard[],
  cardId: string,
  rowIndex: number,
): VisualCard[] {
  return cards.map((card) => {
    if (card.id !== cardId || card.mode !== "table") return card;
    return {
      ...card,
      rows: card.rows.map((row, index) =>
        index === rowIndex && row.length < card.columns
          ? [...row, { kind: "value" as const, value: "" }]
          : row,
      ),
    };
  });
}

/**
 * Updates the text content of a custom value cell in a table row.
 */
export function updateValueInTableRow(
  cards: VisualCard[],
  cardId: string,
  rowIndex: number,
  cellIndex: number,
  value: string,
): VisualCard[] {
  return cards.map((card) => {
    if (card.id !== cardId || card.mode !== "table") return card;
    return {
      ...card,
      rows: card.rows.map((row, index) =>
        index === rowIndex
          ? row.map((cell, rowCellIndex) =>
              rowCellIndex === cellIndex && cell.kind === "value"
                ? { ...cell, value }
                : cell,
            )
          : row,
      ),
    };
  });
}

/**
 * Removes a cell by cellIndex from a table row.
 */
export function removeValueFromTableRow(
  cards: VisualCard[],
  cardId: string,
  rowIndex: number,
  cellIndex: number,
): VisualCard[] {
  return cards.map((card) => {
    if (card.id !== cardId || card.mode !== "table") return card;
    return {
      ...card,
      rows: card.rows.map((row, index) =>
        index === rowIndex
          ? row.filter((_, rowCellIndex) => rowCellIndex !== cellIndex)
          : row,
      ),
    };
  });
}

/**
 * Moves a card up (-1) or down (+1) in the visualCards array.
 */
export function moveCard(
  cards: VisualCard[],
  index: number,
  direction: -1 | 1,
): VisualCard[] {
  if (index < 0 || index >= cards.length) return cards;
  const target = index + direction;
  if (target < 0 || target >= cards.length) return cards;
  const copy = [...cards];
  const temp = copy[index];
  copy[index] = copy[target];
  copy[target] = temp;
  return copy;
}

/**
 * Reorders a card from one index to another (for drag and drop).
 */
export function reorderCards(
  cards: VisualCard[],
  fromIndex: number,
  toIndex: number,
): VisualCard[] {
  if (
    fromIndex < 0 ||
    fromIndex >= cards.length ||
    toIndex < 0 ||
    toIndex >= cards.length ||
    fromIndex === toIndex
  ) {
    return cards;
  }
  const copy = [...cards];
  const item = copy.splice(fromIndex, 1)[0];
  copy.splice(toIndex, 0, item);
  return copy;
}

/**
 * Moves a field cell from a source card row to a target card row.
 */
export function moveFieldBetweenRows(
  cards: VisualCard[],
  srcCardId: string,
  srcRowIndex: number,
  fieldId: string,
  targetCardId: string,
  targetRowIndex: number,
): VisualCard[] {
  return cards.map((c) => {
    if (c.id !== srcCardId && c.id !== targetCardId) return c;
    let nextRows = c.rows;
    if (c.id === srcCardId) {
      nextRows = nextRows.map((r, idx) =>
        idx === srcRowIndex
          ? r.filter(
              (cell) => cell.kind !== "field" || cell.fieldId !== fieldId,
            )
          : r,
      );
    }
    if (c.id === targetCardId) {
      nextRows = nextRows.map((r, idx) =>
        idx === targetRowIndex && (c.mode !== "table" || r.length < c.columns)
          ? [...r, { kind: "field" as const, fieldId }]
          : r,
      );
    }
    return { ...c, rows: nextRows };
  });
}
