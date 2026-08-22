export interface MarkdownSectionForCopy {
  id: string;
  heading: string;
  body: string;
  markdown: string;
}

function slugify(value: string, fallback: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || fallback;
}

export function splitMarkdownForCopy(
  markdown: string,
): MarkdownSectionForCopy[] {
  const normalized = markdown.trim();
  if (!normalized) return [];

  // ⚡ Bolt Optimization: Replace Array.from(matchAll).map() with an imperative iterator loop
  const iterator = normalized.matchAll(/^###\s+(.+)$/gm);
  const sections: MarkdownSectionForCopy[] = [];
  let prevMatch: RegExpExecArray | null = null;
  let index = 0;

  for (const match of iterator) {
    if (!prevMatch) {
      const preamble = normalized.slice(0, match.index ?? 0).trim();
      if (preamble) {
        sections.push({
          id: "section-preamble",
          heading: "",
          body: preamble,
          markdown: preamble,
        });
      }
    } else {
      const heading = prevMatch[1]?.trim() ?? "";
      const start = prevMatch.index ?? 0;
      const headingEnd = start + prevMatch[0].length;
      const end = match.index ?? normalized.length;
      const body = normalized.slice(headingEnd, end).trim();
      const fallback = `section-${sections.length + 1}`;

      sections.push({
        id: `${slugify(heading, fallback)}-${index - 1}`,
        heading,
        body,
        markdown: normalized.slice(start, end).trim(),
      });
    }
    prevMatch = match;
    index++;
  }

  if (prevMatch) {
    const heading = prevMatch[1]?.trim() ?? "";
    const start = prevMatch.index ?? 0;
    const headingEnd = start + prevMatch[0].length;
    const body = normalized.slice(headingEnd).trim();
    const fallback = `section-${sections.length + 1}`;

    sections.push({
      id: `${slugify(heading, fallback)}-${index - 1}`,
      heading,
      body,
      markdown: normalized.slice(start).trim(),
    });
  } else {
    // No matches at all
    return [
      {
        id: "section-1",
        heading: "",
        body: normalized,
        markdown: normalized,
      },
    ];
  }

  return sections;
}
