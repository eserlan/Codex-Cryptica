export type AdventureJsonFenceResult =
  { ok: true; text: string } | { ok: false; message: string };

export const ADVENTURE_JSON_FENCE_HINT =
  "Only plain JSON or a single fenced JSON block filling the whole file is accepted.";

const FENCE = "```";
const isFenceLine = (text: string, start: number, end: number) => {
  while (start < end && /\s/.test(text[start])) start += 1;
  return text.startsWith(FENCE, start);
};
const reject = (reason: string): AdventureJsonFenceResult => ({
  ok: false,
  message: `${reason} ${ADVENTURE_JSON_FENCE_HINT}`,
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

  const firstNewline = trimmed.indexOf("\n");
  const openingEnd =
    firstNewline > 0 && trimmed[firstNewline - 1] === "\r"
      ? firstNewline - 1
      : firstNewline;
  const label = trimmed
    .slice(FENCE.length, openingEnd < 0 ? undefined : openingEnd)
    .trim();
  if (label !== "" && label.toLowerCase() !== "json") {
    return reject("The code block has an unsupported label.");
  }

  const lastNewline = trimmed.lastIndexOf("\n");
  const lastLineStart = lastNewline + 1;
  const closed = lastLineStart > 0 && trimmed.slice(lastLineStart) === FENCE;
  const bodyStart = firstNewline < 0 ? trimmed.length : firstNewline + 1;
  const precedingLineEnd = lastNewline < 0 ? trimmed.length : lastNewline;
  const closingSeparatorLength =
    lastNewline > 0 && trimmed[lastNewline - 1] === "\r" ? 2 : 1;
  const bodyInteriorEnd =
    lastLineStart > bodyStart
      ? lastLineStart - closingSeparatorLength
      : bodyStart;
  const innerFenceLine = hasFenceLine(
    trimmed,
    bodyStart,
    closed ? Math.max(bodyStart, bodyInteriorEnd) : precedingLineEnd,
  );
  const lastLine = trimmed.slice(lastLineStart);
  if (!closed && /^`{3,}$/.test(lastLine.trim()) && !innerFenceLine) {
    return reject("The code block is not closed.");
  }
  if (
    innerFenceLine ||
    (!closed && isFenceLine(trimmed, lastLineStart, trimmed.length))
  ) {
    return reject(
      closed
        ? "The file has more than one code block."
        : "The file has text after the closing code fence.",
    );
  }
  if (!closed) return reject("The code block is not closed.");
  return {
    ok: true,
    text: trimmed.slice(bodyStart, Math.max(bodyStart, bodyInteriorEnd)),
  };
}
