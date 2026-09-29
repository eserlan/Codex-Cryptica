import type { EntityTemplate, TemplateDefaults } from "./types";

const sameType = (t: EntityTemplate, type: string) =>
  t.entityType.toLowerCase() === type.toLowerCase();

/** The markdown a new entity starts with. */
export function templateMarkdown(t: EntityTemplate): string {
  return t.markdown;
}

/**
 * The template that a new entity of `type` starts from: the chosen default if
 * it still exists for this type, else a legacy file, else the built-in row.
 */
export function effectiveDefaultId(
  type: string,
  templates: EntityTemplate[],
  defaults: TemplateDefaults,
): string | undefined {
  const chosen =
    defaults.defaults[type.toLowerCase()] ?? defaults.defaults[type];
  const chosenTemplate = chosen
    ? templates.find((t) => t.id === chosen && sameType(t, type))
    : undefined;
  if (chosenTemplate) return chosenTemplate.id;

  return (
    templates.find((t) => t.source === "legacy" && sameType(t, type))?.id ??
    templates.find((t) => t.source === "builtin" && sameType(t, type))?.id
  );
}

export interface ResolveInput {
  type: string;
  templates: EntityTemplate[];
  defaults: TemplateDefaults;
  /** Used only when no template row exists for the type. */
  themeBuiltin?: string;
  genericBuiltin?: string;
}

/** FR-018 order. Pure, never throws, never does I/O. "" means a blank note. */
export function resolveTemplateMarkdown(input: ResolveInput): string {
  const id = effectiveDefaultId(input.type, input.templates, input.defaults);
  const found = id ? input.templates.find((t) => t.id === id) : undefined;
  if (found) return templateMarkdown(found);
  return input.themeBuiltin ?? input.genericBuiltin ?? "";
}
