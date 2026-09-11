import type { PresentationTemplate, StatSheetTemplate } from "schema";
import type { TemplateDecision } from "./types";

/**
 * Template dependency resolution.
 *
 * Comparison is done on value-free projections rather than stored records.
 * Stored records carry vault-scoped and bookkeeping fields that differ between
 * vaults for templates an author would call identical, so comparing them raw
 * would raise a conflict on every import and train people to click through the
 * prompt (research R6).
 */

/** Fields that identify a schema template; everything else is bookkeeping. */
function projectSchemaTemplate(template: StatSheetTemplate): string {
  return stableStringify({
    name: template.name,
    description: template.description ?? null,
    category: template.category ?? null,
    fields: template.fields ?? [],
  });
}

/**
 * Mirrors the envelope `exportPresentationTemplate` produces — formatVersion,
 * name, description, schemaTemplateId, source — which is already the
 * project's definition of a presentation template's identity.
 */
function projectPresentationTemplate(template: PresentationTemplate): string {
  return stableStringify({
    formatVersion: template.formatVersion,
    name: template.name,
    description: template.description ?? null,
    schemaTemplateId: template.schemaTemplateId,
    source: template.source,
  });
}

/** Key-ordered JSON, so property order can never masquerade as a difference. */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries
    .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`)
    .join(",")}}`;
}

export interface DecideTemplateInput {
  flavour: "schema" | "presentation";
  incoming: StatSheetTemplate | PresentationTemplate;
  existing: StatSheetTemplate | PresentationTemplate | null;
}

/**
 * Decides how one template dependency resolves against the target vault.
 *
 * A conflict is returned `unresolved`, defaulting to keeping what the target
 * vault already has — the choice is the author's to make, and the default must
 * never be the one that silently replaces their existing template (FR-016).
 */
export function decideTemplate(input: DecideTemplateInput): TemplateDecision {
  const { flavour, incoming, existing } = input;
  const base = {
    templateId: incoming.id,
    templateName: incoming.name,
    flavour,
  } as const;

  if (!existing) {
    return { ...base, kind: "bring-in", unresolved: false };
  }

  const project =
    flavour === "schema"
      ? (t: StatSheetTemplate | PresentationTemplate) =>
          projectSchemaTemplate(t as StatSheetTemplate)
      : (t: StatSheetTemplate | PresentationTemplate) =>
          projectPresentationTemplate(t as PresentationTemplate);

  if (project(incoming) === project(existing)) {
    return { ...base, kind: "reuse-existing", unresolved: false };
  }

  return { ...base, kind: "conflict-keep-existing", unresolved: true };
}
