/**
 * A light markdown subset for the body of a map note.
 *
 * A note is read off the map at a glance, so it gets emphasis, headings and
 * bullets and nothing else: no links, no tables, no images. The body stays a
 * plain string, which is what the note editor edits and what goes over the
 * wire to guests — the markup is interpreted only when the note face is
 * drawn, so nothing here has to be sanitised.
 */

/** A stretch of body text sharing one set of emphasis marks. */
export interface NoteTextRun {
  text: string;
  bold: boolean;
  italic: boolean;
}

/** One source line of a note body, with its markers resolved. */
export interface NoteBlock {
  runs: NoteTextRun[];
  /** A `#`-prefixed line, drawn heavier and a touch larger. */
  heading: boolean;
  /** A `-`/`*`/`+`-prefixed line, drawn with a bullet and a hanging indent. */
  bullet: boolean;
}

const HEADING_PATTERN = /^\s{0,3}#{1,3}\s+(.*)$/;
const BULLET_PATTERN = /^\s{0,3}[-*+]\s+(.*)$/;

/**
 * Matched in this order so the longest marker wins: `***both***` before
 * `**bold**` before `*italic*`. Each alternative requires a non-marker first
 * character so an unpaired marker is left alone as literal text.
 */
const INLINE_PATTERN =
  /\*\*\*([^*]+?)\*\*\*|\*\*([^*]+?)\*\*|\*([^*]+?)\*|__([^_]+?)__|_([^_]+?)_/;

function pushRun(runs: NoteTextRun[], run: NoteTextRun) {
  if (!run.text) return;
  const last = runs[runs.length - 1];
  // Adjacent runs of the same style are one run, so the layout below never
  // splits a word across two runs that would then be measured separately.
  if (last && last.bold === run.bold && last.italic === run.italic) {
    last.text += run.text;
    return;
  }
  runs.push(run);
}

/** Splits one line into emphasis runs. */
export function parseNoteInline(line: string): NoteTextRun[] {
  const runs: NoteTextRun[] = [];
  let rest = line;

  for (;;) {
    const match = INLINE_PATTERN.exec(rest);
    if (!match) break;

    pushRun(runs, {
      text: rest.slice(0, match.index),
      bold: false,
      italic: false,
    });

    const [, both, bold, italic, boldUnderscore, italicUnderscore] = match;
    if (both !== undefined) {
      pushRun(runs, { text: both, bold: true, italic: true });
    } else if (bold !== undefined || boldUnderscore !== undefined) {
      pushRun(runs, {
        text: (bold ?? boldUnderscore)!,
        bold: true,
        italic: false,
      });
    } else {
      pushRun(runs, {
        text: (italic ?? italicUnderscore)!,
        bold: false,
        italic: true,
      });
    }

    rest = rest.slice(match.index + match[0].length);
  }

  pushRun(runs, { text: rest, bold: false, italic: false });
  return runs;
}

/**
 * Turns a note body into the blocks the note face draws. Blank lines are
 * dropped rather than kept as spacing: a sticky note has room for very few
 * lines, and spending one on nothing costs the GM a line of what they wrote.
 */
export function parseNoteMarkdown(body: string): NoteBlock[] {
  const blocks: NoteBlock[] = [];

  for (const rawLine of body.split("\n")) {
    const line = rawLine.trimEnd();
    if (!line.trim()) continue;

    const heading = HEADING_PATTERN.exec(line);
    if (heading) {
      blocks.push({
        runs: parseNoteInline(heading[1]),
        heading: true,
        bullet: false,
      });
      continue;
    }

    const bullet = BULLET_PATTERN.exec(line);
    if (bullet) {
      blocks.push({
        runs: parseNoteInline(bullet[1]),
        heading: false,
        bullet: true,
      });
      continue;
    }

    blocks.push({
      runs: parseNoteInline(line.trim()),
      heading: false,
      bullet: false,
    });
  }

  return blocks;
}

/** One word of a laid-out line, carrying the style it is drawn in. */
export interface NoteLayoutWord extends NoteTextRun {
  heading: boolean;
}

export interface NoteLayoutLine {
  words: NoteLayoutWord[];
  heading: boolean;
  /** True on the first line of a bullet, which is the one that gets the dot. */
  bullet: boolean;
  /** True on the wrapped continuation lines of a bullet, which hang indented. */
  indented: boolean;
}

export interface NoteLayoutResult {
  lines: NoteLayoutLine[];
  /** True when the body did not fit, so the caller can mark the overflow. */
  truncated: boolean;
}

export interface NoteLayoutOptions {
  maxWidth: number;
  maxLines: number;
  /** Width of the bullet marker and the indent its wrapped lines hang at. */
  bulletIndent: number;
  measure: (text: string, style: NoteLayoutWord) => number;
}

/**
 * Wraps parsed blocks into drawable lines. Words carry their own style, so a
 * line can mix weights and the measurement stays per-word rather than
 * per-line.
 */
export function layoutNoteMarkdown(
  blocks: NoteBlock[],
  options: NoteLayoutOptions,
): NoteLayoutResult {
  const { maxWidth, maxLines, bulletIndent, measure } = options;
  const lines: NoteLayoutLine[] = [];
  let truncated = false;

  const spaceWidth = (word: NoteLayoutWord) => measure(" ", word);

  outer: for (const block of blocks) {
    const words: NoteLayoutWord[] = [];
    for (const run of block.runs) {
      for (const text of run.text.split(/\s+/)) {
        if (text) words.push({ ...run, text, heading: block.heading });
      }
    }
    if (words.length === 0) continue;

    let current: NoteLayoutWord[] = [];
    let currentWidth = 0;
    let isFirstLineOfBlock = true;

    const flush = () => {
      lines.push({
        words: current,
        heading: block.heading,
        bullet: block.bullet && isFirstLineOfBlock,
        indented: block.bullet && !isFirstLineOfBlock,
      });
      isFirstLineOfBlock = false;
      current = [];
      currentWidth = 0;
    };

    for (const word of words) {
      const indent = block.bullet ? bulletIndent : 0;
      const width = measure(word.text, word);
      const withSpace =
        current.length === 0 ? width : currentWidth + spaceWidth(word) + width;

      // The first word of a line is taken unconditionally: a single word
      // wider than the note still has to go somewhere.
      if (current.length === 0 || indent + withSpace <= maxWidth) {
        current.push(word);
        currentWidth = withSpace;
        continue;
      }

      flush();
      if (lines.length >= maxLines) {
        truncated = true;
        break outer;
      }
      current.push(word);
      currentWidth = width;
    }

    if (current.length > 0) {
      flush();
      if (lines.length >= maxLines) {
        // Only a real leftover counts as truncation — a body that ends
        // exactly on the last line fitted.
        const isLastBlock = block === blocks[blocks.length - 1];
        if (!isLastBlock) truncated = true;
        break outer;
      }
    }
  }

  return { lines, truncated };
}
