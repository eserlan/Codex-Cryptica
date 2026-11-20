export type AdventureJsonFenceResult =
  { ok: true; text: string } | { ok: false; message: string };

export const ADVENTURE_JSON_FENCE_HINT =
  "Only plain JSON or a single fenced JSON block filling the whole file is accepted.";

const FENCE = "```";
const isFenceLine = (text: string, start: number, end: number) => {
  while (start < end && /\s/.test(text[start])) start += 1;
  return text.startsWith(FENCE, start);
};
const rejectionMessage = (reason: string) =>
  `${reason} ${ADVENTURE_JSON_FENCE_HINT}`;
const reject = (reason: string): AdventureJsonFenceResult => ({
  ok: false,
  message: rejectionMessage(reason),
});

function hasFenceLine(text: string, start: number, end: number): boolean {
  while (start < end) {
    const newline = text.indexOf("\n", start);
    let lineEnd = newline < 0 || newline >= end ? end : newline;
    if (lineEnd > start && text[lineEnd - 1] === "\r") lineEnd -= 1;
    if (isFenceLine(text, start, lineEnd)) return true;
    if (newline < 0 || newline >= end) break;
    start = newline + 1;
  }
  return false;
}

type FenceOpening =
  { ok: true; bodyStart: number } | { ok: false; message: string };

function readFenceOpening(trimmed: string): FenceOpening {
  const firstNewline = trimmed.indexOf("\n");
  const openingEnd =
    firstNewline > 0 && trimmed[firstNewline - 1] === "\r"
      ? firstNewline - 1
      : firstNewline;
  const label = trimmed
    .slice(FENCE.length, openingEnd < 0 ? undefined : openingEnd)
    .trim();
  if (label !== "" && label.toLowerCase() !== "json") {
    return {
      ok: false,
      message: rejectionMessage("The code block has an unsupported label."),
    };
  }
  return {
    ok: true,
    bodyStart: firstNewline < 0 ? trimmed.length : firstNewline + 1,
  };
}

type FenceBounds = {
  closed: boolean;
  bodyStart: number;
  bodyEnd: number;
  closingLineStart: number;
  lastLineStart: number;
};

function findFenceBounds(trimmed: string, bodyStart: number): FenceBounds {
  const lastNewline = trimmed.lastIndexOf("\n");
  const lastLineStart = lastNewline + 1;
  const closingLineStart =
    lastNewline > 0 && trimmed[lastNewline - 1] === "\r"
      ? lastNewline - 1
      : lastNewline;
  const closed = lastLineStart > 0 && trimmed.slice(lastLineStart) === FENCE;
  const bodyEnd = lastLineStart > bodyStart ? closingLineStart : bodyStart;
  return { closed, bodyStart, bodyEnd, closingLineStart, lastLineStart };
}

function hasUnclosedFenceLine(
  trimmed: string,
  bounds: FenceBounds,
  innerFenceLine: boolean,
): boolean {
  const lastLine = trimmed.slice(bounds.lastLineStart);
  return !bounds.closed && /^`{3,}$/.test(lastLine.trim()) && !innerFenceLine;
}

function hasUnexpectedFenceLine(
  trimmed: string,
  bounds: FenceBounds,
  innerFenceLine: boolean,
): boolean {
  return (
    innerFenceLine ||
    (!bounds.closed &&
      isFenceLine(trimmed, bounds.lastLineStart, trimmed.length))
  );
}

function fenceProblem(trimmed: string, bounds: FenceBounds): string | null {
  const innerFenceLine = hasFenceLine(
    trimmed,
    bounds.bodyStart,
    bounds.closed
      ? Math.max(bounds.bodyStart, bounds.bodyEnd)
      : bounds.closingLineStart,
  );
  if (hasUnclosedFenceLine(trimmed, bounds, innerFenceLine)) {
    return "The code block is not closed.";
  }
  if (hasUnexpectedFenceLine(trimmed, bounds, innerFenceLine)) {
    return bounds.closed
      ? "The file has more than one code block."
      : "The file has text after the closing code fence.";
  }
  return bounds.closed ? null : "The code block is not closed.";
}

/**
 * Returns the text to parse. Plain text passes through unchanged; a file that
 * is exactly one ``` or ```json fenced block yields its body. Nothing else is
 * repaired.
 */
export function unwrapAdventureJsonFence(
  text: string,
): AdventureJsonFenceResult {
  const trimmed = text.trim();
  if (!trimmed.startsWith(FENCE)) return { ok: true, text };

  const opening = readFenceOpening(trimmed);
  if (!opening.ok) return opening;
  const bounds = findFenceBounds(trimmed, opening.bodyStart);
  const problem = fenceProblem(trimmed, bounds);
  if (problem) return reject(problem);
  return {
    ok: true,
    text: trimmed.slice(bounds.bodyStart, bounds.bodyEnd),
  };
}
