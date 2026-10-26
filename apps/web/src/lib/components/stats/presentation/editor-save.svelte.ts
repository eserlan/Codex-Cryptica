import {
  PRESENTATION_TEMPLATE_FORMAT_VERSION,
  type PresentationTemplate,
} from "schema";
import { sanitizeSource } from "@codex/stat-sheet-engine";
import { presentationTemplates } from "#lib/stores/presentation-templates.svelte.js";
import { notificationStore } from "#lib/stores/ui/notification.svelte.js";

type SaveInput = Parameters<typeof presentationTemplates.saveTemplate>[0];
type EditorDraft = Omit<SaveInput, "description" | "formatVersion"> & {
  description: string;
};
interface SaveDependencies {
  saveTemplate: (input: SaveInput) => Promise<PresentationTemplate | null>;
  notify: (message: string) => void;
}
const defaultDependencies: SaveDependencies = {
  saveTemplate: (input) => presentationTemplates.saveTemplate(input),
  notify: (message) => notificationStore.notify(message, "success"),
};

/** One instance per open editor: saving/error state must never be shared across dialogs. */
export class PresentationEditorSaveState {
  isSaving = $state(false);
  error = $state("");

  constructor(
    private readonly dependencies: SaveDependencies = defaultDependencies,
  ) {}

  async save(
    draft: EditorDraft,
    onSaved: (saved: PresentationTemplate) => void,
    onClose: () => void,
  ) {
    if (!draft.name.trim()) return;
    this.isSaving = true;
    this.error = "";
    try {
      const { input, removedCount } = prepareDraft(draft);
      const saved = await this.dependencies.saveTemplate(input);
      if (!saved) throw new Error("Failed to save template.");
      this.dependencies.notify(savedMessage(saved.name, removedCount));
      onSaved(saved);
      onClose();
    } catch (error) {
      this.error =
        error instanceof Error ? error.message : "Failed to save template.";
    } finally {
      this.isSaving = false;
    }
  }
}

function prepareDraft(draft: EditorDraft) {
  // FR-004: remove disallowed content from durable source, not only previews.
  const { source, removed } = sanitizeSource(draft.source);
  return {
    input: {
      ...draft,
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      source,
      formatVersion: PRESENTATION_TEMPLATE_FORMAT_VERSION,
    },
    removedCount: removed.length,
  };
}

function savedMessage(name: string, removedCount: number): string {
  if (removedCount === 0) return `Saved template "${name}"`;
  const suffix = removedCount === 1 ? "" : "s";
  return `Saved template "${name}" (${removedCount} disallowed item${suffix} removed)`;
}
