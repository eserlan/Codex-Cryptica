import type { StatSheetFieldType } from "schema";
import type { LayoutDirectiveName } from "./ast";

/** V1 allowlisted fenced layout directive names (contracts/directive-syntax.md). */
export const ALLOWED_LAYOUT_DIRECTIVES: readonly LayoutDirectiveName[] = [
  "stat-group",
  "section",
  "card",
  "row",
];

export function isAllowedLayoutDirective(
  name: string,
): name is LayoutDirectiveName {
  return (ALLOWED_LAYOUT_DIRECTIVES as readonly string[]).includes(name);
}

/** V1 allowlisted `display=` values for `{{stat.field}}` (contracts/directive-syntax.md). */
export const PRESENTATION_DISPLAY_MODES = [
  "plain",
  "prominent",
  "current-max",
  "counter",
  "progress",
  "checkbox",
  "tag-list",
  "table",
  "notes",
  "name-target",
] as const;

export type PresentationDisplayMode =
  (typeof PRESENTATION_DISPLAY_MODES)[number];

export function isPresentationDisplayMode(
  value: string,
): value is PresentationDisplayMode {
  return (PRESENTATION_DISPLAY_MODES as readonly string[]).includes(value);
}

/** Display modes valid for each Stat Sheet field type (FR-013), and the
 * default mode used when a field has no explicit `display=` or when the
 * requested mode is incompatible with the field's type. */
export const DISPLAY_MODES_BY_FIELD_TYPE: Record<
  StatSheetFieldType,
  { default: PresentationDisplayMode; allowed: PresentationDisplayMode[] }
> = {
  counter: {
    default: "counter",
    allowed: ["counter", "current-max", "progress", "plain", "prominent"],
  },
  number: {
    default: "plain",
    allowed: ["plain", "prominent"],
  },
  text: {
    default: "plain",
    allowed: ["plain", "prominent", "tag-list", "checkbox"],
  },
  longtext: {
    default: "notes",
    allowed: ["notes", "plain"],
  },
  heading: {
    default: "plain",
    allowed: ["plain"],
  },
  dice: {
    default: "plain",
    allowed: ["plain", "prominent", "name-target"],
  },
  "item-table": {
    default: "table",
    allowed: ["table", "plain"],
  },
};

/** Resolves the effective display mode for a field reference: the
 * requested mode if compatible with the field's type, otherwise the
 * type's default (FR-013, Edge Cases). */
export function resolveDisplayMode(
  fieldType: StatSheetFieldType,
  requested: PresentationDisplayMode | undefined,
): { mode: PresentationDisplayMode; wasIncompatible: boolean } {
  const config = DISPLAY_MODES_BY_FIELD_TYPE[fieldType];
  if (!requested) return { mode: config.default, wasIncompatible: false };
  if (config.allowed.includes(requested)) {
    return { mode: requested, wasIncompatible: false };
  }
  return { mode: config.default, wasIncompatible: true };
}
