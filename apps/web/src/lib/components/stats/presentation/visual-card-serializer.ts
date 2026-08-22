import type { StatSheetField } from "schema";
import type { VisualCard } from "./visual-card-parser";

export function syncSourceFromVisualCards(
  cards: VisualCard[],
  schemaFields: StatSheetField[],
  fieldDisplayOverrides: Record<string, { displayMode?: string; hideLabel?: boolean }>
) {
  let out = "";
  for (const card of cards) {
    if (card.title) {
      out += `### ${card.title}\n`;
    }
    if (card.mode === "table") {
      const headers =
        card.tableHeaders && card.tableHeaders.length > 0
          ? card.tableHeaders
          : ["Field", "Value"];
      const markdownHeaders = headers.map((header) =>
        header.replace(/\r?\n/g, " ").replace(/\|/g, "\\|"),
      );
      out += `| ${markdownHeaders.join(" | ")} |\n`;
      out += `| ${headers.map(() => "---").join(" | ")} |\n`;
      for (const row of card.rows) {
        if (row.length === 0) continue;
        const cells = row.map((cell) => {
          if (cell.kind === "value") {
            return cell.value.replace(/\r?\n/g, " ").replace(/\|/g, "\\|");
          }
          const fid = cell.fieldId;
          const f = schemaFields.find((x) => x.id === fid);
          const override = fieldDisplayOverrides[fid];
          const mode =
            override?.displayMode ??
            (f?.type === "counter" ? "current-max" : undefined);
          const hideLabel = override?.hideLabel;
          if (
            hideLabel ||
            (override?.displayMode &&
              override.displayMode !== "plain" &&
              override.displayMode !==
                (f?.type === "counter" ? "current-max" : undefined))
          ) {
            const attrs = [];
            if (mode) attrs.push(`display="${mode}"`);
            if (hideLabel) attrs.push("hide-label");
            return `{{stat.${fid}${attrs.length > 0 ? " " + attrs.join(" ") : ""}}}`;
          }
          if (mode && mode !== "plain") return `[${fid}:${mode}]`;
          return `[${fid}]`;
        });
        while (cells.length < headers.length) {
          cells.push("-");
        }
        out += `| ${cells.join(" | ")} |\n`;
      }
      out += `\n`;
    } else {
      out += `:::card\n`;
      for (const row of card.rows) {
        if (row.length === 0) continue;
        out += `:::stat-group columns=${card.columns}\n`;
        for (const cell of row) {
          if (cell.kind !== "field") continue;
          const fid = cell.fieldId;
          const f = schemaFields.find((x) => x.id === fid);
          if (f) {
            const override = fieldDisplayOverrides[fid];
            const mode =
              override?.displayMode ??
              (f.type === "counter" ? "current-max" : undefined);
            const hideLabel = override?.hideLabel;
            if (
              hideLabel ||
              (override?.displayMode &&
                override.displayMode !== "plain" &&
                override.displayMode !==
                  (f.type === "counter" ? "current-max" : undefined))
            ) {
              const attrs = [];
              if (mode) attrs.push(`display="${mode}"`);
              if (hideLabel) attrs.push("hide-label");
              out += `{{stat.${fid}${attrs.length > 0 ? " " + attrs.join(" ") : ""}}}\n`;
            } else if (mode && mode !== "plain") {
              out += `[${fid}:${mode}]\n`;
            } else {
              out += `[${fid}]\n`;
            }
          } else {
            out += `[${fid}]\n`;
          }
        }
        out += `:::\n`;
      }
      out += `:::\n\n`;
    }
  }
  return out.trim();
}
