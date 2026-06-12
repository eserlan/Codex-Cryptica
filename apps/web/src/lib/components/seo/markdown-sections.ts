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

  const matches = Array.from(normalized.matchAll(/^###\s+(.+)$/gm));
  if (matches.length === 0) {
    return [
      {
        id: "section-1",
        heading: "",
        body: normalized,
        markdown: normalized,
      },
    ];
  }

  const sections: MarkdownSectionForCopy[] = [];
  const preamble = normalized.slice(0, matches[0].index ?? 0).trim();

  if (preamble) {
    sections.push({
      id: "section-preamble",
      heading: "",
      body: preamble,
      markdown: preamble,
    });
  }

  for (const [index, match] of matches.entries()) {
    const heading = match[1]?.trim() ?? "";
    const start = match.index ?? 0;
    const headingEnd = start + match[0].length;
    const end =
      index + 1 < matches.length
        ? (matches[index + 1].index ?? normalized.length)
        : normalized.length;
    const body = normalized.slice(headingEnd, end).trim();
    const fallback = `section-${sections.length + 1}`;

    sections.push({
      id: `${slugify(heading, fallback)}-${index}`,
      heading,
      body,
      markdown: normalized.slice(start, end).trim(),
    });
  }

  return sections;
}
