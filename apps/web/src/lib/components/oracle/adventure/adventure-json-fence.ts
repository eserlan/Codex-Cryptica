export type AdventureJsonFenceResult =
  { ok: true; text: string } | { ok: false; message: string };

export const ADVENTURE_JSON_FENCE_HINT =
  "Only plain JSON or a single fenced JSON block filling the whole file is accepted.";

const FENCE = "```";
const reject = (reason: string): AdventureJsonFenceResult => ({
  ok: false,
  message: `${reason} ${ADVENTURE_JSON_FENCE_HINT}`,
});

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

  const lines = trimmed.split(/\r?\n/);
  const label = lines[0].slice(FENCE.length).trim();
  if (label !== "" && label.toLowerCase() !== "json") {
    return reject("The code block has an unsupported label.");
  }
  const closed = lines.length > 1 && lines[lines.length - 1] === FENCE;
  const body = lines.slice(1, closed ? -1 : undefined);
  if (!closed && /^`{3,}$/.test(lines[lines.length - 1].trim())) {
    return reject("The code block is not closed.");
  }
  if (body.some((line) => line.trimStart().startsWith(FENCE))) {
    return reject(
      closed
        ? "The file has more than one code block."
        : "The file has text after the closing code fence.",
    );
  }
  if (!closed) return reject("The code block is not closed.");
  return { ok: true, text: body.join("\n") };
}
