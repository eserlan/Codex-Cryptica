import { similarity } from "../suggest";

/**
 * Matching a folder of pictures to the cards of a deck (issue 2264).
 *
 * Engine logic rather than UI logic: it is string matching over titles and
 * file names, and the app layer stays a thin shell over the package
 * (Constitution I). The wizard shows what this returns before anything is
 * written, so a wrong guess costs a correction rather than a bad import.
 */

/** How a picture found its card. Shown in the preview so a guess reads as one. */
export type CardImageMatchMethod = "name" | "similar" | "order";

export interface CardImageMatch {
  cardIndex: number;
  fileIndex: number;
  method: CardImageMatchMethod;
}

/** Minimum score for a fuzzy pairing — the same bar `suggestNames` uses. */
const SIMILARITY_THRESHOLD = 0.4;

/** "01 - the-tower.jpg" → "thetower"; the leading number is a sort key, not a name. */
function stem(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "");
}

function withoutOrderPrefix(value: string): string {
  return value.replace(/^\s*\d+\s*[-_.)\]]*\s*/, "");
}

export function normaliseName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/** The leading number of "01.jpg" / "12 - foo.png", or undefined if it has none. */
function orderKey(fileName: string): number | undefined {
  const match = /^\s*(\d+)/.exec(stem(fileName));
  return match ? Number(match[1]) : undefined;
}

/**
 * Pairs card titles with image file names, best evidence first.
 *
 * 1. Exact name, ignoring case, separators and any numeric prefix — what a
 *    deck named by hand looks like.
 * 2. Close name, for the near misses ("the-hanged-man" vs "Hanged Man").
 * 3. Position, but only when every picture still unmatched is numbered — a
 *    scanned deck whose files were never named anything else.
 *
 * Never assigns one file to two cards, and never guesses past the evidence:
 * a card with nothing close to it comes back unmatched, on purpose.
 */
export function matchCardImages(
  titles: string[],
  fileNames: string[],
): CardImageMatch[] {
  const matches: CardImageMatch[] = [];
  const takenCards = new Set<number>();
  const takenFiles = new Set<number>();

  const cardKeys = titles.map((title) => normaliseName(title));
  const fileKeys = fileNames.map((name) =>
    normaliseName(withoutOrderPrefix(stem(name))),
  );

  for (const [cardIndex, key] of cardKeys.entries()) {
    if (!key) continue;
    const fileIndex = fileKeys.findIndex(
      (fileKey, i) => fileKey === key && !takenFiles.has(i),
    );
    if (fileIndex === -1) continue;
    matches.push({ cardIndex, fileIndex, method: "name" });
    takenCards.add(cardIndex);
    takenFiles.add(fileIndex);
  }

  // Scored pairs across everything still free, best first, so the strongest
  // pairing wins rather than whichever card happened to come first.
  const scored: { cardIndex: number; fileIndex: number; score: number }[] = [];
  for (const [cardIndex, key] of cardKeys.entries()) {
    if (!key || takenCards.has(cardIndex)) continue;
    for (const [fileIndex, fileKey] of fileKeys.entries()) {
      if (!fileKey || takenFiles.has(fileIndex)) continue;
      const score = similarity(key, fileKey);
      if (score > SIMILARITY_THRESHOLD) {
        scored.push({ cardIndex, fileIndex, score });
      }
    }
  }
  scored.sort((a, b) => b.score - a.score);
  for (const pair of scored) {
    if (takenCards.has(pair.cardIndex) || takenFiles.has(pair.fileIndex)) {
      continue;
    }
    matches.push({
      cardIndex: pair.cardIndex,
      fileIndex: pair.fileIndex,
      method: "similar",
    });
    takenCards.add(pair.cardIndex);
    takenFiles.add(pair.fileIndex);
  }

  const remainingFiles = fileNames
    .map((name, fileIndex) => ({ fileIndex, order: orderKey(name) }))
    .filter((entry) => !takenFiles.has(entry.fileIndex));
  const numbered = remainingFiles.every((entry) => entry.order !== undefined);
  if (numbered && remainingFiles.length > 0) {
    const remainingCards = titles
      .map((_, cardIndex) => cardIndex)
      .filter((cardIndex) => !takenCards.has(cardIndex));
    const ordered = [...remainingFiles].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0),
    );
    for (const [position, cardIndex] of remainingCards.entries()) {
      const file = ordered[position];
      if (!file) break;
      matches.push({ cardIndex, fileIndex: file.fileIndex, method: "order" });
      takenCards.add(cardIndex);
      takenFiles.add(file.fileIndex);
    }
  }

  return matches.sort((a, b) => a.cardIndex - b.cardIndex);
}

/** A title for a card made from a picture's file name: "the-tower.jpg" → "The Tower". */
export function titleFromFileName(fileName: string): string {
  const words = withoutOrderPrefix(stem(fileName))
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!words) return stem(fileName);
  return words
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** Pictures only — a dropped folder carries readmes, .DS_Store and worse. */
export function isImageFile(file: { name: string; type?: string }): boolean {
  if (file.type?.startsWith("image/")) return true;
  return /\.(png|jpe?g|gif|webp|avif|bmp|svg)$/i.test(file.name);
}
