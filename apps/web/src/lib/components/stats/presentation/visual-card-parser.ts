import { parseTemplate } from "@codex/stat-sheet-engine";
import { PRESENTATION_TEMPLATE_FORMAT_VERSION } from "schema";
import type { StatSheetField } from "schema";

export type VisualCell =
  | { kind: "field"; fieldId: string }
  | { kind: "value"; value: string };

export interface VisualCard {
  id: string;
  title: string;
  columns: number;
  mode?: "grid" | "table";
  tableHeaders?: string[];
  rows: VisualCell[][];
}

export function getUnusedFields(
  cards: VisualCard[],
  schemaFields: StatSheetField[] = [],
): StatSheetField[] {
  const used = new Set(
    cards.flatMap((card) =>
      card.rows.flatMap((row) =>
        row
          .filter((cell) => cell.kind === "field")
          .map((cell) => cell.fieldId),
      ),
    ),
  );
  return schemaFields.filter((f) => f.type !== "heading" && !used.has(f.id));
}

export function parseCardsFromSource(
  src: string,
  schemaFields: StatSheetField[] = []
): VisualCard[] {
  const cards: VisualCard[] = [];
  const res = parseTemplate(src, PRESENTATION_TEMPLATE_FORMAT_VERSION);
  if (!res.ok) return cards;

  function extractFieldIdsFromNode(node: any): string[] {
    const fieldIds: string[] = [];
    if (!node) return fieldIds;
    if (node.type === "field-reference") {
      fieldIds.push(node.fieldId);
    } else if (node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
        fieldIds.push(...extractFieldIdsFromNode(child));
      }
    }
    return fieldIds;
  }

  function processBlockNode(node: any, currentHeadingTitle: string): string {
    let activeTitle = currentHeadingTitle;
    if (node.type === "heading") {
      const textNode = node.children?.find((c: any) => c.type === "text");
      if (textNode && "text" in textNode) {
        activeTitle = textNode.text;
      }
    } else if (node.type === "table") {
      const rows: VisualCell[][] = [];
      const headers = (node.header ?? []).map((cellNodes: any[]) => {
        const t = cellNodes.find((c: any) => c.type === "text");
        return t && "text" in t ? t.text : "Col";
      });
      for (const rowCells of node.rows ?? []) {
        const row: VisualCell[] = [];
        for (const cellNodes of rowCells) {
          const field = cellNodes.find(
            (cell: any) => cell.type === "field-reference",
          );
          const text = cellNodes
            .filter((cell: any) => cell.type === "text")
            .map((cell: any) => cell.text)
            .join("");
          if (field && cellNodes.length === 1) {
            row.push({ kind: "field", fieldId: field.fieldId });
          } else if (text) {
            row.push({ kind: "value", value: text });
          }
        }
        if (row.length > 0) rows.push(row);
      }
      cards.push({
        id: Math.random().toString(36).slice(2, 9),
        title: activeTitle || `Table ${cards.length + 1}`,
        columns: headers.length || 2,
        mode: "table",
        tableHeaders: headers.length > 0 ? headers : ["Field", "Value"],
        rows: rows.length > 0 ? rows : [[]],
      });
      activeTitle = "";
    } else if (node.type === "card") {
      const rows: VisualCell[][] = [];
      for (const child of node.children ?? []) {
        const fIds = extractFieldIdsFromNode(child);
        if (fIds.length > 0) {
          rows.push(fIds.map((fieldId) => ({ kind: "field", fieldId })));
        }
      }
      cards.push({
        id: Math.random().toString(36).slice(2, 9),
        title: activeTitle || `Card ${cards.length + 1}`,
        columns: 2,
        mode: "grid",
        rows: rows.length > 0 ? rows : [[]],
      });
      activeTitle = "";
    } else if (node.type === "group") {
      const cols = node.columns ?? 2;
      for (const child of node.children ?? []) {
        if (child.type === "card") {
          const rows: VisualCell[][] = [];
          for (const cNode of child.children ?? []) {
            const fIds = extractFieldIdsFromNode(cNode);
            if (fIds.length > 0) {
              rows.push(fIds.map((fieldId) => ({ kind: "field", fieldId })));
            }
          }
          cards.push({
            id: Math.random().toString(36).slice(2, 9),
            title: activeTitle || `Card ${cards.length + 1}`,
            columns: cols,
            mode: "grid",
            rows: rows.length > 0 ? rows : [[]],
          });
          activeTitle = "";
        } else {
          const fIds = extractFieldIdsFromNode(child);
          if (fIds.length > 0) {
            cards.push({
              id: Math.random().toString(36).slice(2, 9),
              title: activeTitle || `Group ${cards.length + 1}`,
              columns: cols,
              mode: "grid",
              rows: [fIds.map((fieldId) => ({ kind: "field", fieldId }))],
            });
            activeTitle = "";
          }
        }
      }
    } else if (node.type === "section" || node.type === "row") {
      for (const child of node.children ?? []) {
        activeTitle = processBlockNode(child, activeTitle);
      }
    }
    return activeTitle;
  }

  let titleState = "";
  for (const node of res.ast) {
    titleState = processBlockNode(node, titleState);
  }

  if (cards.length === 0 && schemaFields.length > 0) {
    let currentCard: VisualCard = {
      id: "c1",
      title: "Overview",
      columns: 2,
      mode: "grid",
      rows: [[]],
    };
    for (const f of schemaFields) {
      if (f.type === "heading") {
        if (currentCard.rows.some((r) => r.length > 0)) {
          cards.push(currentCard);
        }
        currentCard = {
          id: Math.random().toString(36).slice(2, 9),
          title: f.label,
          columns: 2,
          mode: "grid",
          rows: [[]],
        };
      } else {
        currentCard.rows[0].push({ kind: "field", fieldId: f.id });
      }
    }
    if (currentCard.rows.some((r) => r.length > 0)) {
      cards.push(currentCard);
    }
  }

  return cards;
}
