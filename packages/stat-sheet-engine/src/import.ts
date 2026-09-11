import type { StatSheetTemplate } from "schema";
import { migrateTemplatePackage } from "./migrations";

export function importTemplatePackage(
  input: unknown,
  options: { id: string; name?: string },
): StatSheetTemplate {
  const pkg = migrateTemplatePackage(input);
  return {
    id: options.id,
    name: options.name?.trim() || pkg.template.name,
    description: pkg.template.description,
    category: pkg.template.category,
    isBuiltIn: false,
    fields: pkg.template.fields.map((field) => ({ ...field })),
  };
}
