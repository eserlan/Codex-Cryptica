import type { GeneratorOutput } from "$lib/services/seo/generator-engine";

const VAMPIRE_MAIN_DOCUMENT_SECTIONS = new Set([
  "Dark Agenda",
  "Internal Conflict",
  "Notable NPCs",
]);

interface MarkdownSection {
  heading: string;
  body: string;
}

function splitMarkdownSections(markdown: string): MarkdownSection[] {
  const normalized = markdown.trim();
  if (!normalized) return [];

  const matches = Array.from(normalized.matchAll(/^###\s+(.+)$/gm));
  if (matches.length === 0) {
    return [];
  }

  return matches.map((match, index) => {
    const heading = match[1]?.trim() ?? "";
    const start = match.index ?? 0;
    const end =
      index + 1 < matches.length
        ? (matches[index + 1].index ?? normalized.length)
        : normalized.length;

    return {
      heading,
      body: normalized.slice(start, end).trim(),
    };
  });
}

export function getGeneratorDocumentLayout(
  generatedData: GeneratorOutput | null,
) {
  if (!generatedData) {
    return { content: "", lore: "" };
  }

  const labels = Array.isArray(generatedData.labels)
    ? generatedData.labels
    : [];

  if (!labels.includes("vampire-clan")) {
    return {
      content: generatedData.content || "",
      lore: generatedData.lore || "",
    };
  }

  const loreSections = splitMarkdownSections(generatedData.lore || "");
  if (loreSections.length === 0) {
    return {
      content: generatedData.content || "",
      lore: generatedData.lore || "",
    };
  }

  const mainDocumentSections: string[] = [];
  const railSections: string[] = [];

  for (const section of loreSections) {
    if (VAMPIRE_MAIN_DOCUMENT_SECTIONS.has(section.heading)) {
      mainDocumentSections.push(section.body);
    } else {
      railSections.push(section.body);
    }
  }

  return {
    content: [generatedData.content, ...mainDocumentSections]
      .filter(Boolean)
      .join("\n\n")
      .trim(),
    lore: railSections.join("\n\n").trim(),
  };
}
