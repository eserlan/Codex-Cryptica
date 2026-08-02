import type { PresentationTemplate } from "schema";

const CREATED_AT = "2026-08-02T00:00:00.000Z";

function builtIn(
  id: string,
  schemaTemplateId: string,
  name: string,
  description: string,
  source: string,
): PresentationTemplate {
  return {
    id,
    vaultId: null,
    schemaTemplateId,
    name,
    description,
    source,
    formatVersion: 1,
    isBuiltIn: true,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  };
}

const STANDARD_FORM_SOURCE = `## Stats

:::stat-group columns=2
{{stat.hp display="current-max" label="Hit Points"}}
{{stat.ac display="prominent" label="Armor Class"}}
:::
`;

const COMPACT_STAT_BLOCK_SOURCE = `:::card
{{stat.hp display="current-max" label="HP"}}
{{stat.ac display="plain" label="AC"}}
:::
`;

const DASHBOARD_CARD_SOURCE = `:::row
:::card
{{stat.hp display="progress" label="Hit Points"}}
:::
:::card
{{stat.ac display="prominent" label="Armor Class"}}
:::
:::
`;

const MOBILE_QUICK_REFERENCE_SOURCE = `{{stat.hp display="current-max" label="HP"}}
{{stat.ac display="plain" label="AC"}}
`;

/**
 * The four built-in presentation templates required by FR-012/SC-007.
 * Read-only (never editable in place — see spec.md Edge Cases); duplicating
 * one via the editor (T026) produces a separate vault-owned copy.
 *
 * These reference the `hp`/`ac` field ids used by the built-in Stat Sheet
 * schema templates (stat-sheet-templates.svelte.ts) as a reasonable,
 * broadly-compatible default; a MissingFieldNode is rendered harmlessly
 * (FR-009) for any schema that lacks those specific field ids, and users
 * are expected to author their own templates (User Story 2) for schemas
 * with different field naming.
 */
export function getBuiltInPresentationTemplates(
  schemaTemplateId: string,
): PresentationTemplate[] {
  return [
    builtIn(
      `builtin-presentation-standard-form-${schemaTemplateId}`,
      schemaTemplateId,
      "Standard Form",
      "A straightforward, top-to-bottom layout of the sheet's key stats.",
      STANDARD_FORM_SOURCE,
    ),
    builtIn(
      `builtin-presentation-compact-stat-block-${schemaTemplateId}`,
      schemaTemplateId,
      "Compact Stat Block",
      "A dense single-card summary, suited to NPCs and monsters.",
      COMPACT_STAT_BLOCK_SOURCE,
    ),
    builtIn(
      `builtin-presentation-dashboard-card-${schemaTemplateId}`,
      schemaTemplateId,
      "Dashboard",
      "Side-by-side cards for an at-a-glance dashboard view.",
      DASHBOARD_CARD_SOURCE,
    ),
    builtIn(
      `builtin-presentation-mobile-quick-reference-${schemaTemplateId}`,
      schemaTemplateId,
      "Mobile Quick Reference",
      "A minimal single-column layout optimized for quick reference during play.",
      MOBILE_QUICK_REFERENCE_SOURCE,
    ),
  ];
}
