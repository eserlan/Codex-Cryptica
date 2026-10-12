import {
  layoutNoteMarkdown,
  parseNoteMarkdown,
  type NoteLayoutWord,
} from "./note-markdown";
import { measureTextCached, TAU } from "./render-cache";
import type { CanvasCache } from "./renderer-types";

/**
 * Draws a collapsed note as a marker rather than a shrunken page. It borrows
 * the map pin's shape deliberately — a folded-away note is doing a pin's job,
 * so it should read like one — but keeps the note's own colour so the two
 * stay tellable apart.
 */
export function drawCollapsedNote(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  color: string,
) {
  const radius = Math.max(1, Math.min(width, height) / 2);

  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, TAU);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
  ctx.lineWidth = Math.max(1, radius * 0.18);
  ctx.stroke();

  // A turned-down corner inside the dot, so a collapsed note is not mistaken
  // for an ordinary pin at a glance.
  const fold = radius * 0.55;
  ctx.beginPath();
  ctx.moveTo(-fold, fold);
  ctx.lineTo(fold, fold);
  ctx.lineTo(fold, -fold);
  ctx.closePath();
  ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
  ctx.fill();
}

/** How much of the note's corner is turned down, as a share of its short side. */
const NOTE_FOLD_RATIO = 0.22;
const NOTE_TEXT_COLOR = "rgba(28, 25, 23, 0.85)";
/** Below this on-screen size the body text is illegible, so only the paper is drawn. */
const NOTE_MIN_TEXT_SIZE = 44;
/** How much larger a `#` heading line is drawn than the note's body text. */
const HEADING_SCALE = 1.15;

/**
 * Draws a sticky note centred on the current origin. Expects the caller to
 * have already translated, rotated and clipped to the token's shape — the
 * dog-eared corner is deliberately left unfilled so the map shows through it.
 */
export function drawNoteFace(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  color: string,
  body: string,
  cache: CanvasCache,
) {
  const left = -width / 2;
  const top = -height / 2;
  const fold = Math.min(width, height) * NOTE_FOLD_RATIO;

  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(left + width - fold, top);
  ctx.lineTo(left + width, top + fold);
  ctx.lineTo(left + width, top + height);
  ctx.lineTo(left, top + height);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();

  // The turned-down corner, shaded so the fold reads as a fold.
  ctx.beginPath();
  ctx.moveTo(left + width - fold, top);
  ctx.lineTo(left + width, top + fold);
  ctx.lineTo(left + width - fold, top + fold);
  ctx.closePath();
  ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
  ctx.fill();

  drawNoteText(ctx, left, top, width, height, body, cache);
}

function drawNoteText(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  width: number,
  height: number,
  body: string,
  cache: CanvasCache,
) {
  const text = body.trim();
  if (!text || Math.min(width, height) < NOTE_MIN_TEXT_SIZE) return;

  const fontSize = Math.max(8, Math.min(15, height * 0.13));
  const lineHeight = fontSize * 1.3;
  const padding = Math.max(4, width * 0.08);
  const maxWidth = width - padding * 2;
  const maxLines = Math.max(1, Math.floor((height - padding * 2) / lineHeight));
  const bulletIndent = fontSize;

  const fontFor = (word: NoteLayoutWord) => {
    const size = Math.round(word.heading ? fontSize * HEADING_SCALE : fontSize);
    const weight = word.bold || word.heading ? "700" : "400";
    const slant = word.italic ? "italic " : "";
    return `${slant}${weight} ${size}px ui-sans-serif, system-ui, sans-serif`;
  };
  const widthOf = (value: string, word: NoteLayoutWord) =>
    measureTextCached(ctx, value, fontFor(word), cache).width;

  const { lines, truncated } = layoutNoteMarkdown(parseNoteMarkdown(body), {
    maxWidth,
    maxLines,
    bulletIndent,
    measure: widthOf,
  });
  if (lines.length === 0) return;

  if (truncated) markTruncatedNote(lines);
  drawNoteLines(ctx, lines, {
    left,
    top,
    padding,
    fontSize,
    lineHeight,
    bulletIndent,
    fontFor,
    widthOf,
  });
}

function markTruncatedNote(
  lines: ReturnType<typeof layoutNoteMarkdown>["lines"],
) {
  // Anything that did not fit is signalled rather than silently dropped, so
  // the GM knows to open the note for the rest.
  const lastLine = lines[lines.length - 1];
  const lastWord = lastLine.words[lastLine.words.length - 1];
  if (lastWord) lastWord.text = `${lastWord.text}…`;
}

function drawNoteLines(
  ctx: CanvasRenderingContext2D,
  lines: ReturnType<typeof layoutNoteMarkdown>["lines"],
  layout: {
    left: number;
    top: number;
    padding: number;
    fontSize: number;
    lineHeight: number;
    bulletIndent: number;
    fontFor: (word: NoteLayoutWord) => string;
    widthOf: (value: string, word: NoteLayoutWord) => number;
  },
) {
  const {
    left,
    top,
    padding,
    fontSize,
    lineHeight,
    bulletIndent,
    fontFor,
    widthOf,
  } = layout;
  ctx.fillStyle = NOTE_TEXT_COLOR;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const y = top + padding + i * lineHeight;
    let x = left + padding + (line.bullet || line.indented ? bulletIndent : 0);

    if (line.bullet) {
      drawNoteBullet(
        ctx,
        left + padding + bulletIndent * 0.4,
        y + fontSize * 0.6,
        fontSize,
      );
    }

    for (let w = 0; w < line.words.length; w++) {
      const word = line.words[w];
      ctx.font = fontFor(word);
      if (w > 0) x += widthOf(" ", word);
      ctx.fillText(word.text, x, y);
      x += widthOf(word.text, word);
    }
  }
}

function drawNoteBullet(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  fontSize: number,
) {
  ctx.beginPath();
  ctx.arc(x, y, Math.max(1, fontSize * 0.13), 0, TAU);
  ctx.fill();
}
