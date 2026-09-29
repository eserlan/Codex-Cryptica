import { renderCharacterSummary } from "./presentation/character";
import { renderFactionSummary } from "./presentation/faction";
import { renderGenericSummary } from "./presentation/generic";
import { renderRelationshipReference } from "./presentation/relationship";
import type { ReportDocument, ReportSection } from "./types";

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

function demoteHeadings(text: string): string {
  return text.replace(
    /^(#{1,6})(\s)/gm,
    (_, hashes: string, space: string) =>
      `${"#".repeat(Math.min(6, hashes.length + 3))}${space}`,
  );
}

interface BodyView {
  title: string;
  type?: string;
  portraitUrl?: string;
  summary?: string;
  description?: string;
  notes?: string;
  secrets?: string;
  relationships: string[];
  affiliations?: string[];
  members?: string[];
}

const blockquote = (text: string) =>
  text
    .split("\n")
    .map((line, i) => (i === 0 ? `> **GM only:** ${line}` : `> ${line}`))
    .join("\n");

const labelled = (label: string, items?: string[]) =>
  items?.length ? `**${label}:** ${items.join(", ")}` : undefined;

function relationshipBlock(lines: string[]): string | undefined {
  return lines.length
    ? `**Relationships**\n${lines.map((r) => `- ${r}`).join("\n")}`
    : undefined;
}

function renderSection(view: BodyView): string {
  const parts = [
    `### ${view.title}`,
    view.type && `*${view.type}*`,
    view.portraitUrl && `![${view.title}](${view.portraitUrl})`,
    view.description ?? view.summary,
    labelled("Members", view.members),
    labelled("Affiliations", view.affiliations),
    relationshipBlock(view.relationships),
    view.notes && `**Notes**\n\n${demoteHeadings(view.notes)}`,
    view.secrets && blockquote(view.secrets),
  ];
  return parts.filter(Boolean).join("\n\n");
}

function viewFor(
  section: ReportSection,
  detail: ReportDocument["detail"],
): BodyView {
  switch (section.kind) {
    case "character":
      return renderCharacterSummary(
        section.entity,
        section.relationships,
        section.affiliations,
        detail,
      );
    case "faction":
      return renderFactionSummary(
        section.entity,
        section.members,
        section.relationships,
        detail,
      );
    default:
      return renderGenericSummary(section.entity, detail);
  }
}

export function renderReportMarkdown(document: ReportDocument): string {
  const { overview, sections, detail } = document;
  const parts: string[] = [
    `## Overview\n\n${[
      plural(overview.entityCount, "entity", "entities"),
      plural(overview.relationshipCount, "relationship", "relationships"),
      plural(overview.factionCount, "faction", "factions"),
    ].join(" · ")}`,
  ];

  const entities = sections.filter((s) => s.kind !== "faction");
  const factions = sections.filter((s) => s.kind === "faction");
  if (entities.length)
    parts.push(
      `## Entities\n\n${entities.map((s) => renderSection(viewFor(s, detail))).join("\n\n")}`,
    );
  if (factions.length)
    parts.push(
      `## Factions\n\n${factions.map((s) => renderSection(viewFor(s, detail))).join("\n\n")}`,
    );
  if (document.relationshipSummary.length)
    parts.push(
      `## Relationship Summary\n\n${document.relationshipSummary
        .map((l) => `- ${renderRelationshipReference(l)}`)
        .join("\n")}`,
    );
  return `${parts.join("\n\n")}\n`;
}
