import type { TemplateSection } from "./types";

export interface ParsedTemplate {
  intro?: string;
  sections: TemplateSection[];
}

const FENCE = /^\s*(```|~~~)/;
const H2 = /^##\s+(.+?)\s*#*\s*$/;

/**
 * Splits markdown into an optional intro and level-2 sections. Deeper headings
 * and anything inside code fences stay in the parent section's hint.
 */
export function parseMarkdownToSections(md: string): ParsedTemplate {
  const introLines: string[] = [];
  const raw: { title: string; lines: string[] }[] = [];
  let inFence = false;

  for (const line of md.split(/\r?\n/)) {
    if (FENCE.test(line)) inFence = !inFence;
    const heading = !inFence ? H2.exec(line) : null;
    if (heading && !line.startsWith("###")) {
      raw.push({ title: heading[1].trim(), lines: [] });
    } else if (raw.length) {
      raw[raw.length - 1].lines.push(line);
    } else {
      introLines.push(line);
    }
  }

  const intro = introLines.join("\n").trim();
  const sections = raw.map((r, i): TemplateSection => {
    const hint = r.lines.join("\n").trim();
    return {
      id: `s${i + 1}`,
      title: r.title,
      ...(hint ? { hint } : {}),
    };
  });

  return intro ? { intro, sections } : { sections };
}
