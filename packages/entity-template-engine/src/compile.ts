import type { DraftTemplate } from "./types";

/**
 * Turns a template's sections into the markdown body a new entity starts with.
 * Deterministic, so the editor preview equals the note that gets created.
 */
export function compileTemplate(
  t: Pick<DraftTemplate, "sections"> & { intro?: string },
): string {
  const parts: string[] = [];
  const intro = t.intro?.trim();
  if (intro) parts.push(intro);
  for (const section of t.sections) {
    const hint = section.hint?.trim();
    parts.push(hint ? `## ${section.title}\n\n${hint}` : `## ${section.title}`);
  }
  return parts.length ? `${parts.join("\n\n")}\n` : "";
}
