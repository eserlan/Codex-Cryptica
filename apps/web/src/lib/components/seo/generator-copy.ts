import type { SessionEntity } from "generator-engine";

export interface GeneratorCopyDocument {
  title: string;
  summary?: string;
  labels?: string[];
  content: string;
  lore?: string;
  summaryIncludedInContent?: boolean;
}

export interface ParsedGeneratorShareMarkdown {
  summary?: string;
  content: string;
}

/** Remove the document headers added by buildGeneratorMarkdown for remixing. */
export function parseGeneratorShareMarkdown(
  markdown: string,
): ParsedGeneratorShareMarkdown {
  let remainder = markdown.replace(/^# [^\n]+\n?/, "").trimStart();
  const summaryMatch = remainder.match(/^\*([^*\n]+)\*\n*/);
  const summary = summaryMatch?.[1];
  if (summaryMatch) remainder = remainder.slice(summaryMatch[0].length);
  remainder = remainder.replace(/^Labels:[^\n]*(?:\n|$)/, "").trim();
  return { summary, content: remainder };
}

export function buildGeneratorMarkdown(
  document: GeneratorCopyDocument,
): string {
  const summary =
    document.summary && !document.summaryIncludedInContent
      ? `*${document.summary}*`
      : "";
  const labels = document.labels ? `Labels: ${document.labels.join(", ")}` : "";

  return [
    `# ${document.title}`,
    summary,
    labels,
    "",
    document.content,
    "",
    document.lore ?? "",
  ]
    .filter((line) => line !== undefined)
    .join("\n")
    .trim();
}

export function buildSectionMarkdown(markdown: string): string {
  return markdown.trim();
}

export function buildSessionEntityMarkdown(entity: SessionEntity): string {
  const summaryIncludedInContent = Boolean(
    entity.summary &&
    entity.content.trim().startsWith(`*${entity.summary.trim()}*`),
  );

  return buildGeneratorMarkdown({
    title: entity.title,
    summary: entity.summary,
    labels: entity.labels,
    content: entity.content,
    lore: entity.lore,
    summaryIncludedInContent,
  });
}
