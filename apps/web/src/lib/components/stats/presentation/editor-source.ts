import {
  PRESENTATION_TEMPLATE_FORMAT_VERSION,
  type StatSheetField,
  type StatSheetTemplate,
} from "schema";
import {
  parseTemplate,
  walkPresentationNodes,
  resolveFieldByKeyOrId,
} from "@codex/stat-sheet-engine";

export function deriveFieldDisplayOverrides(
  src: string,
  schemaFields: StatSheetField[] = [],
): Record<string, { displayMode?: string; hideLabel?: boolean }> {
  const result = parseTemplate(src, PRESENTATION_TEMPLATE_FORMAT_VERSION);
  if (!result.ok) return {};
  const overrides: Record<
    string,
    { displayMode?: string; hideLabel?: boolean }
  > = {};
  walkPresentationNodes(result.ast, (node) => {
    if (node.type !== "field-reference") return;
    const rawFieldId = node.fieldId as string;
    const fieldId =
      resolveFieldByKeyOrId(schemaFields, rawFieldId)?.id ?? rawFieldId;
    const displayMode = node.displayMode as string | undefined;
    const hideLabel = node.hideLabel as boolean | undefined;
    if (displayMode || hideLabel) {
      overrides[fieldId] = {
        ...(displayMode ? { displayMode } : {}),
        ...(hideLabel ? { hideLabel: true } : {}),
      };
    }
  });
  return overrides;
}

export const fieldReference = (field: StatSheetField): string =>
  field.key ?? field.id;

export function generateStarterLayout(schema: StatSheetTemplate): string {
  const cards: string[] = [];
  for (const field of schema.fields) {
    if (field.type === "heading") {
      cards.push(`### ${field.label}\n`);
      continue;
    }
    if (cards.length === 0) cards.push("");
    cards[cards.length - 1] += starterFieldReference(field) + "\n";
  }
  const body = cards.map((card) => `:::card\n${card}:::\n`).join("\n");
  return `## ${schema.name}\n\n${body}`;
}

function starterFieldReference(field: StatSheetField): string {
  const modes: Partial<Record<StatSheetField["type"], string>> = {
    counter: "current-max",
    dice: "plain",
    number: "prominent",
  };
  const mode = modes[field.type];
  return `{{stat.${fieldReference(field)}${mode ? ` display="${mode}"` : ""}}}`;
}
