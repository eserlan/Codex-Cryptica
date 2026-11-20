import type { VisualLine } from "./pdf-text-lines";

const READ_ALOUD_CUE_RE = /^(?:>\s*)?(?:\*\*)?Read aloud:(?:\*\*)?\s*(.*)$/i;
const GM_ONLY_CUE_RE = /^(?:>\s*)?(?:\*\*)?GM only:(?:\*\*)?\s*(.*)$/i;
const SCENE_CONDITION_CUE_RE =
  /^(?:[-*•]\s*)?(?:\*\*)?Scene condition:(?:\*\*)?\s*(.*)$/i;
const ALT_SOLUTION_CUE_RE =
  /^(?:[-*•]\s*)?(?:\*\*)?By ([^:*]+):(?:\*\*)?\s*(.*)$/i;
const MOTIVATION_INLINE_RE = /(?:\*\*)?Motivation:(?:\*\*)?\s*/gi;
const BULLET_LINE_RE = /^(?:[-*•]|\d+[.)])\s+/;
const SOURCE_ID_MARKER_RE = /^<!--\s*source-id:\s*([a-z0-9-]+)\s*-->$/;

export function isSourceIdMarker(text: string): boolean {
  return SOURCE_ID_MARKER_RE.test(text);
}

export function isCueLine(text: string): boolean {
  return (
    READ_ALOUD_CUE_RE.test(text) ||
    GM_ONLY_CUE_RE.test(text) ||
    SCENE_CONDITION_CUE_RE.test(text) ||
    ALT_SOLUTION_CUE_RE.test(text)
  );
}

type ActiveCueBlock =
  | { kind: "read-aloud"; text: string }
  | { kind: "gm-only"; text: string }
  | { kind: "scene-condition"; text: string }
  | { kind: "alt-solution"; method: string; text: string }
  | { kind: "prose"; text: string };

function matchCueBlock(text: string): ActiveCueBlock | null {
  const readAloud = text.match(READ_ALOUD_CUE_RE);
  if (readAloud) return { kind: "read-aloud", text: readAloud[1].trim() };

  const gmOnly = text.match(GM_ONLY_CUE_RE);
  if (gmOnly) return { kind: "gm-only", text: gmOnly[1].trim() };

  const condition = text.match(SCENE_CONDITION_CUE_RE);
  if (condition) {
    return { kind: "scene-condition", text: condition[1].trim() };
  }

  const altSolution = text.match(ALT_SOLUTION_CUE_RE);
  if (altSolution) {
    return {
      kind: "alt-solution",
      method: altSolution[1].trim(),
      text: altSolution[2].trim(),
    };
  }

  return null;
}

function flushCueBlock(block: ActiveCueBlock | null, out: string[]): void {
  if (!block) return;
  switch (block.kind) {
    case "read-aloud":
      out.push(`> **Read aloud:** ${block.text.trim()}`, "");
      break;
    case "gm-only":
      out.push(`> **GM only:** ${block.text.trim()}`, "");
      break;
    case "scene-condition":
      out.push(`- **Scene condition:** ${block.text.trim()}`);
      break;
    case "alt-solution":
      out.push(`- **By ${block.method}:** ${block.text.trim()}`);
      break;
    case "prose": {
      const normalized = block.text
        .trim()
        .replace(MOTIVATION_INLINE_RE, "**Motivation:** ");
      out.push(normalized);
      break;
    }
  }
}

function shouldContinueBlock(
  prevLine: VisualLine | null,
  line: VisualLine,
): boolean {
  if (!prevLine || prevLine.pageNumber !== line.pageNumber) return false;
  if (BULLET_LINE_RE.test(line.text)) return false;
  const maxFont = Math.max(line.fontSize, prevLine.fontSize);
  return prevLine.y - line.y <= maxFont * 1.65;
}

const EMBEDDED_CUE_RE = /\b(?:Read aloud|GM only):/gi;

function splitEmbeddedCueLines(line: VisualLine): VisualLine[] {
  const markers = [...line.text.matchAll(EMBEDDED_CUE_RE)];
  if (markers.length === 0) return [line];
  if (markers.length === 1 && (markers[0].index ?? 0) === 0) return [line];
  const segments: VisualLine[] = [];
  const firstIndex = markers[0].index ?? 0;
  const prefix = line.text.slice(0, firstIndex).trim();
  if (prefix.length > 0) segments.push({ ...line, text: prefix });
  markers.forEach((marker, i) => {
    const start = marker.index ?? 0;
    const end = markers[i + 1]?.index ?? line.text.length;
    const text = line.text.slice(start, end).trim();
    if (text.length > 0) segments.push({ ...line, text });
  });
  return segments;
}

export function normalizeSectionLines(lines: VisualLine[]): string[] {
  const out: string[] = [];
  let active: ActiveCueBlock | null = null;
  let prevLine: VisualLine | null = null;

  for (const line of lines.flatMap(splitEmbeddedCueLines)) {
    const text = line.text;
    if (isSourceIdMarker(text)) {
      flushCueBlock(active, out);
      active = null;
      out.push(text);
      prevLine = line;
      continue;
    }

    const cue = matchCueBlock(text);
    if (cue) {
      flushCueBlock(active, out);
      active = cue;
      prevLine = line;
      continue;
    }

    if (active && shouldContinueBlock(prevLine, line)) {
      active.text = `${active.text} ${text}`.trim();
    } else {
      flushCueBlock(active, out);
      active = { kind: "prose", text };
    }
    prevLine = line;
  }

  flushCueBlock(active, out);
  return out;
}
