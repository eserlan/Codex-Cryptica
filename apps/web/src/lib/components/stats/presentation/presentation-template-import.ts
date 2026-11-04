import type { StatSheetTemplate } from "schema";
import { importPresentationTemplatePackage } from "@codex/stat-sheet-engine";
import { presentationTemplates } from "#lib/stores/presentation-templates.svelte.js";
import { notificationStore } from "#lib/stores/ui/notification.svelte.js";

type ImportSuccess = Extract<
  ReturnType<typeof importPresentationTemplatePackage>,
  { ok: true }
>;
interface ImportDependencies {
  templates: Pick<
    typeof presentationTemplates,
    "saveTemplate" | "uniqueNameForSchema"
  >;
  notifications: Pick<typeof notificationStore, "notify">;
}
const defaultDependencies: ImportDependencies = {
  templates: presentationTemplates,
  notifications: notificationStore,
};

/** Returns the inline error, or null after a successful import. */
export async function importPresentationFile(
  file: Pick<File, "text">,
  getSchema: () => StatSheetTemplate,
  { templates, notifications }: ImportDependencies = defaultDependencies,
): Promise<string | null> {
  try {
    const text = await file.text();
    // Resolve after reading: the user may have selected another schema in the meantime.
    const schema = getSchema();
    const result = importPresentationTemplatePackage(
      JSON.parse(text),
      [schema.id],
      schema,
    );
    if (!result.ok) return result.message;
    const saved = await templates.saveTemplate({
      schemaTemplateId: result.package.schemaTemplateId,
      name: templates.uniqueNameForSchema(result.package.name, schema.id),
      description: result.package.description ?? null,
      source: result.package.source,
      formatVersion: result.package.formatVersion,
    });
    if (!saved) return "Failed to import template.";
    notifyImportedTemplate(saved.name, result, notifications);
    return null;
  } catch {
    return "This file isn't a valid presentation template.";
  }
}

function notifyImportedTemplate(
  name: string,
  result: ImportSuccess,
  notifications: ImportDependencies["notifications"],
) {
  const unmappedNotice = unmappedFieldNotice(result.unmappedFields);
  notifications.notify(
    `Imported template "${name}"${removedContentNotice(result.removedFragments.length)}${unmappedNotice}`,
    unmappedNotice ? "info" : "success",
  );
}

function unmappedFieldNotice(fields: string[] = []): string {
  return fields.length > 0
    ? ` (Note: unmapped fields: ${fields.join(", ")})`
    : "";
}

function removedContentNotice(count: number): string {
  if (count === 0) return "";
  return ` (${count} disallowed item${count === 1 ? "" : "s"} removed)`;
}
