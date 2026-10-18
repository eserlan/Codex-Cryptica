import type { ReportRelationshipInput, ReportRelationshipLine } from "../types";

/** e.g. "Vargas — friend → Lajos" */
export function renderRelationshipReference(
  line: ReportRelationshipLine,
): string {
  return `${line.sourceTitle} — ${line.label} → ${line.targetTitle}`;
}

export function renderRelationshipLine(
  rel: ReportRelationshipInput,
  titlesById: ReadonlyMap<string, string>,
): string {
  return renderRelationshipReference({
    sourceTitle: titlesById.get(rel.sourceId) ?? rel.sourceId,
    label: rel.label,
    targetTitle: titlesById.get(rel.targetId) ?? rel.targetId,
  });
}
