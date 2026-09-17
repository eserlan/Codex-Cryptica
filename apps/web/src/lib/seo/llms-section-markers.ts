/**
 * Shared markers for the machine-maintained generator section in
 * `apps/web/static/llms.txt` (#3163). Kept dependency-free so the vitest
 * suite, the sync script, and the llms-full generator can all agree on the
 * exact marker strings without importing app code.
 */
export const LLMS_GENERATORS_START = "<!-- LLMS-GENERATORS:START -->";
export const LLMS_GENERATORS_END = "<!-- LLMS-GENERATORS:END -->";

/** Lines between the markers, or null when the markers are absent. */
export function extractMarkedSection(
  text: string,
  start: string,
  end: string,
): string | null {
  const startIndex = text.indexOf(start);
  const endIndex = text.indexOf(end);
  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    return null;
  }
  return text.slice(startIndex + start.length, endIndex);
}

/** Replace the lines between the markers. Throws when markers are absent. */
export function replaceMarkedSection(
  text: string,
  start: string,
  end: string,
  lines: string[],
): string {
  const startIndex = text.indexOf(start);
  const endIndex = text.indexOf(end);
  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    throw new Error(
      `[llms-generators] Markers missing: expected ${start} ... ${end}.`,
    );
  }
  return (
    text.slice(0, startIndex + start.length) +
    "\n" +
    lines.join("\n") +
    "\n" +
    text.slice(endIndex)
  );
}
