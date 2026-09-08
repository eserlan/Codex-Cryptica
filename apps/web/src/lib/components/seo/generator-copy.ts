import type { SessionEntity } from "generator-engine";

export interface GeneratorCopyDocument {
  title: string;
  summary?: string;
  labels?: string[];
  content: string;
  lore?: string;
  summaryIncludedInContent?: boolean;
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
