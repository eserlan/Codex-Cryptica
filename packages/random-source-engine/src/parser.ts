import type {
  Card,
  RandomSource,
  SelectionMode,
  Spread,
  TableEntry,
} from "./types";

/**
 * Vault file format for a Random Source: YAML frontmatter plus a Markdown
 * table body.
 *
 * The body is a Markdown table on purpose — it round-trips through the paste
 * importer (FR-033) and stays legible when a user opens the file directly or
 * reads it in an export.
 *
 * The frontmatter is written and read by hand rather than through a YAML
 * library: the shape is small, fixed, and fully under our control, and this
 * keeps the package dependency-free (Constitution III).
 */

export type ParseResult<T> =
  { ok: true; value: T } | { ok: false; error: string };

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

/** `|` would break the Markdown table, so it is escaped on the way out. */
function escapeCell(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\|/g, "\\|");
}

function unescapeCell(text: string): string {
  return text.replace(/\\\|/g, "|").replace(/\\\\/g, "\\");
}

/** Splits a Markdown table row on unescaped pipes. */
function splitRow(row: string): string[] {
  const cells: string[] = [];
  let current = "";
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === "\\" && i + 1 < row.length) {
      current += ch + row[i + 1];
      i++;
    } else if (ch === "|") {
      cells.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current);
  // Leading and trailing pipes produce empty edge cells.
  return cells.slice(1, -1).map((c) => unescapeCell(c.trim()));
}

export function serialiseRandomSource(source: RandomSource): string {
  const fm: string[] = ["---"];
  fm.push(`id: ${source.id}`);
  fm.push(`name: ${source.name}`);
  fm.push(`kind: ${source.kind}`);
  if (source.description !== undefined) {
    fm.push(`description: ${source.description}`);
  }
  fm.push(`labels: [${source.labels.join(", ")}]`);

  if (source.kind === "table" && source.selection) {
    fm.push(
      source.selection.mode === "ranged"
        ? `selection: ranged d${source.selection.die.sides}`
        : "selection: weighted",
    );
  }

  if (source.kind === "deck" && source.deckOptions) {
    fm.push(`drawMode: ${source.deckOptions.drawMode}`);
    fm.push(`allowReversals: ${source.deckOptions.allowReversals}`);
    for (const spread of source.spreads ?? []) {
      fm.push(
        `spread: ${spread.id} | ${spread.name} | ${spread.positions.join(" / ")}`,
      );
    }
  }
  fm.push("---", "");

  const body: string[] = [];
  if (source.kind === "table") {
    const ranged = source.selection?.mode === "ranged";
    body.push(ranged ? "| id | range | result |" : "| id | weight | result |");
    body.push("| --- | --- | --- |");
    for (const e of source.entries ?? []) {
      const second = ranged
        ? `${e.range?.min ?? ""}-${e.range?.max ?? ""}`
        : String(e.weight ?? 1);
      body.push(`| ${e.id} | ${second} | ${escapeCell(e.text)} |`);
    }
  } else {
    body.push("| id | title | body | reversed | image |");
    body.push("| --- | --- | --- | --- | --- |");
    for (const c of source.cards ?? []) {
      body.push(
        `| ${c.id} | ${escapeCell(c.title)} | ${escapeCell(c.body)} | ${escapeCell(
          c.reversedMeaning ?? "",
        )} | ${c.imagePath ?? ""} |`,
      );
    }
  }

  return fm.join("\n") + body.join("\n") + "\n";
}

export function parseRandomSource(markdown: string): ParseResult<RandomSource> {
  const match = markdown.match(FRONTMATTER);
  if (!match) return { ok: false, error: "No frontmatter found" };

  const [, fmBlock, bodyBlock] = match;
  const fm = new Map<string, string>();
  const spreads: Spread[] = [];

  for (const line of fmBlock.split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key === "spread") {
      const [id, name, positions] = value.split("|").map((p) => p.trim());
      if (id && name) {
        spreads.push({
          id,
          name,
          positions: positions ? positions.split("/").map((p) => p.trim()) : [],
        });
      }
    } else {
      fm.set(key, value);
    }
  }

  const id = fm.get("id");
  const name = fm.get("name");
  const kind = fm.get("kind");
  if (!id) return { ok: false, error: "Missing id" };
  if (!name) return { ok: false, error: "Missing name" };
  if (kind !== "table" && kind !== "deck") {
    return { ok: false, error: `Unknown kind: ${kind ?? "(none)"}` };
  }

  const labelsRaw = fm.get("labels") ?? "[]";
  const labels = labelsRaw
    .replace(/^\[|\]$/g, "")
    .split(",")
    .map((l) => l.trim())
    .filter(Boolean);

  const source: RandomSource = { id, name, kind, labels };
  const description = fm.get("description");
  if (description !== undefined) source.description = description;

  const rows = bodyBlock
    .split(/\r?\n/)
    .map((r) => r.trim())
    .filter((r) => r.startsWith("|"));
  // Drop the header and the alignment row.
  const dataRows = rows.slice(2);

  if (kind === "table") {
    const selectionRaw = fm.get("selection") ?? "weighted";
    let selection: SelectionMode;
    if (selectionRaw.startsWith("ranged")) {
      const sides = Number(selectionRaw.replace(/[^0-9]/g, ""));
      if (!Number.isFinite(sides) || sides <= 0) {
        return { ok: false, error: "Ranged table has no valid die" };
      }
      selection = { mode: "ranged", die: { sides } };
    } else {
      selection = { mode: "weighted" };
    }
    source.selection = selection;

    const entries: TableEntry[] = [];
    for (const row of dataRows) {
      const [entryId, second, text] = splitRow(row);
      if (!entryId) continue;
      const entry: TableEntry = { id: entryId, text: text ?? "" };
      if (selection.mode === "ranged") {
        const [min, max] = (second ?? "").split("-").map(Number);
        entry.range = { min, max };
      } else {
        entry.weight = Number(second) || 1;
      }
      entries.push(entry);
    }
    source.entries = entries;
  } else {
    const cards: Card[] = [];
    for (const row of dataRows) {
      const [cardId, title, body, reversed, image] = splitRow(row);
      if (!cardId) continue;
      const card: Card = { id: cardId, title: title ?? "", body: body ?? "" };
      if (reversed) card.reversedMeaning = reversed;
      if (image) card.imagePath = image;
      cards.push(card);
    }
    source.cards = cards;
    source.deckOptions = {
      drawMode:
        fm.get("drawMode") === "with-replacement"
          ? "with-replacement"
          : "without-replacement",
      allowReversals: fm.get("allowReversals") === "true",
    };
    source.spreads = spreads;
  }

  return { ok: true, value: source };
}
