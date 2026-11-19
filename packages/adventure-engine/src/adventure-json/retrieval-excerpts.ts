import { MAX_ADVENTURE_RETRIEVAL_CHARS } from "../source-package/retrieval";
import { createAdventureJsonHiddenIdMatcher } from "./retrieval-privacy";
import { boundSourceRef, withoutTextQuote } from "./retrieval-source-ref";
import { buildText, readLine, type Line } from "./retrieval-text";
import type {
  AdventureJsonExcerpt,
  AdventureJsonExcerptKind,
} from "./retrieval-types";
import type { Visibility } from "./schema";

export type ExcerptRecord = Pick<
  AdventureJsonExcerpt,
  "id" | "visibility" | "epistemicStatus" | "sourceRef"
>;

/**
 * Builds a record excerpt, moving secret lines and structured references to
 * hidden records into an immediately following GM-only companion.
 */
export function recordExcerpts(
  hiddenIds: ReadonlySet<string>,
  kind: AdventureJsonExcerptKind,
  record: ExcerptRecord,
  lines: Iterable<Line>,
  cap: number,
): AdventureJsonExcerpt[] {
  const boundedSourceRef = boundSourceRef(record.sourceRef, cap);
  const excerpt = (visibility: Visibility, from: Iterable<Line>) => {
    const sourceRef =
      boundedSourceRef === undefined
        ? undefined
        : visibility === "player-visible"
          ? withoutTextQuote(boundedSourceRef)
          : boundedSourceRef;
    return {
      id: record.id,
      kind,
      visibility,
      epistemicStatus: record.epistemicStatus,
      ...(sourceRef !== undefined ? { sourceRef } : {}),
      text: buildText(from, cap),
    };
  };
  // A record that is not player-visible is GM-only as a whole: stream it in.
  if (record.visibility !== "player-visible") {
    return [excerpt(record.visibility, lines)];
  }
  const { kept, companion } = splitRecordLines(hiddenIds, lines, cap);
  if (companion.lines.length === 0) {
    return [excerpt(record.visibility, kept.lines)];
  }
  return [
    excerpt(record.visibility, kept.lines),
    excerpt("gm-only", companion.lines),
  ];
}

function splitRecordLines(
  hiddenIds: ReadonlySet<string>,
  lines: Iterable<Line>,
  cap: number,
): { kept: SplitText; companion: SplitText } {
  // One pass splits the lines. Once the player-visible text is over `cap`,
  // admission trims or drops it and skips its companion, so reading stops
  // there; oversized or lazily built fields are never read in full. A part
  // that is never read is in neither text, so it cannot leak.
  const limit = cap + 1;
  const kept = new SplitText();
  const companion = new SplitText();
  for (const raw of lines) {
    if (kept.length >= limit) break;
    if (isStructuredSecret(raw, hiddenIds) && companion.length >= limit) {
      continue;
    }
    const line = readLine(raw, limit);
    const moved = shouldMoveLine(raw, line, hiddenIds);
    if (!moved) kept.push(line);
    else if (companion.length < limit) companion.push(line);
  }
  return { kept, companion };
}

function isStructuredSecret(
  line: Line,
  hiddenIds: ReadonlySet<string>,
): boolean {
  return line[2] === true || (line[3] ?? []).some((id) => hiddenIds.has(id));
}

function shouldMoveLine(
  raw: Line,
  boundedLine: Line,
  hiddenIds: ReadonlySet<string>,
): boolean {
  return (
    isStructuredSecret(raw, hiddenIds) ||
    lineMentionsHiddenId(boundedLine, hiddenIds)
  );
}

function lineMentionsHiddenId(
  line: Line,
  hiddenIds: ReadonlySet<string>,
): boolean {
  if (hiddenIds.size === 0) return false;
  const matcher = hiddenIdMatcher(hiddenIds);
  return matcher(buildText([line], MAX_ADVENTURE_RETRIEVAL_CHARS + 1));
}

const hiddenIdMatchers = new WeakMap<
  ReadonlySet<string>,
  (text: string) => boolean
>();

function hiddenIdMatcher(ids: ReadonlySet<string>): (text: string) => boolean {
  const cached = hiddenIdMatchers.get(ids);
  if (cached) return cached;
  const matcher = createAdventureJsonHiddenIdMatcher(ids);
  hiddenIdMatchers.set(ids, matcher);
  return matcher;
}

/** Lines bound for one excerpt, with the length `buildText` would give them. */
class SplitText {
  lines: Line[] = [];
  length = 0;

  push(line: Line): void {
    const parts = line[1] as string[] | string | undefined;
    if (parts === undefined || parts.length === 0) return;
    const list = typeof parts === "string" ? [parts] : parts;
    if (this.length > 0) this.length += 1;
    this.length += line[0].length + 2;
    list.forEach((part, i) => (this.length += part.length + (i > 0 ? 2 : 0)));
    this.lines.push(line);
  }
}
