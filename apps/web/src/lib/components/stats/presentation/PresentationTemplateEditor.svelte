<script lang="ts">
  import { type StatSheetTemplate, type PresentationTemplate } from "schema";
  import { downloadPresentationTemplate } from "#lib/utils/presentation-template-download.js";
  import PresentationSourceEditor from "./PresentationSourceEditor.svelte";
  import { presentationTemplates } from "#lib/stores/presentation-templates.svelte.js";
  import { PresentationEditorSaveState } from "./editor-save.svelte";
  import PresentationRenderer from "./PresentationRenderer.svelte";
  import PresentationSyntaxHelpModal from "./PresentationSyntaxHelpModal.svelte";
  import { createPresentationPreview } from "./editor-preview.svelte";

  let {
    schema,
    template = null,
    duplicate = false,
    onClose = () => {},
    onSaved = () => {},
  }: {
    schema: StatSheetTemplate;
    /** Template being edited, or duplicated (when `duplicate` is true).
     * `null` means "create from scratch". */
    template?: PresentationTemplate | null;
    duplicate?: boolean;
    onClose?: () => void;
    onSaved?: (saved: PresentationTemplate) => void;
  } = $props();

  const isNewRecord = $derived(!template || duplicate);

  // Seeded once from props at mount to initialize editable form state;
  // not meant to stay reactive to later prop changes (this component is
  // remounted per template via PresentationTemplateManager's #if block).
  // svelte-ignore state_referenced_locally
  let name = $state(
    template
      ? duplicate
        ? presentationTemplates.uniqueNameForSchema(
            `${template.name} Copy`,
            schema.id,
          )
        : template.name
      : presentationTemplates.uniqueNameForSchema("New Layout", schema.id),
  );
  // svelte-ignore state_referenced_locally
  let description = $state(template?.description ?? "");
  // svelte-ignore state_referenced_locally
  let source = $state(template?.source ?? "");

  const saveState = new PresentationEditorSaveState();
  let showSyntaxHelp = $state(false);

  const preview = createPresentationPreview(
    () => source,
    () => schema,
  );

  function save() {
    return saveState.save(
      {
        id: isNewRecord ? undefined : template?.id,
        schemaTemplateId: schema.id,
        name,
        description,
        source,
      },
      (saved) => onSaved(saved),
      () => onClose(),
    );
  }

  function exportCurrent() {
    if (!template || duplicate) return;
    downloadPresentationTemplate(template);
  }
</script>

<div
  class="fixed inset-0 z-[200] flex flex-col bg-theme-bg font-body overflow-hidden"
  role="presentation"
>
  <div
    class="flex h-full w-full flex-col overflow-hidden bg-theme-surface shadow-2xl"
    role="dialog"
    aria-modal="true"
    aria-labelledby="presentation-editor-title"
    data-testid="presentation-template-editor"
  >
    <div
      class="flex items-center justify-between border-b border-theme-border bg-theme-bg/50 p-4"
    >
      <div class="flex items-center gap-3">
        <h2
          id="presentation-editor-title"
          class="font-header text-sm font-bold uppercase tracking-widest text-theme-text"
        >
          {isNewRecord
            ? "New Presentation Template"
            : "Edit Presentation Template"}
        </h2>
        <button
          type="button"
          class="flex items-center gap-1 rounded border border-theme-border px-2 py-0.5 text-micro font-bold uppercase tracking-wide text-theme-muted hover:border-theme-primary hover:text-theme-primary transition-colors"
          onclick={() => (showSyntaxHelp = true)}
          data-testid="presentation-editor-help-btn"
        >
          <span
            class="icon-[lucide--help-circle] h-3.5 w-3.5 text-theme-primary"
            aria-hidden="true"
          ></span>
          Syntax Help
        </button>
      </div>
      <button
        type="button"
        class="text-theme-muted hover:text-theme-text"
        onclick={onClose}
        aria-label="Close"
      >
        <span class="icon-[lucide--x] h-4 w-4" aria-hidden="true"></span>
      </button>
    </div>

    <div class="flex-1 min-h-0 flex flex-col p-4 overflow-hidden">
      <div class="grid shrink-0 gap-3 sm:grid-cols-2">
        <div>
          <label
            class="text-micro font-bold uppercase tracking-wide text-theme-muted"
            for="presentation-template-name"
          >
            Name
          </label>
          <input
            id="presentation-template-name"
            class="mt-1 w-full rounded border border-theme-border bg-theme-bg px-2 py-1.5 text-xs text-theme-text"
            bind:value={name}
            data-testid="presentation-template-name-input"
          />
        </div>
        <div>
          <label
            class="text-micro font-bold uppercase tracking-wide text-theme-muted"
            for="presentation-template-description"
          >
            Description
          </label>
          <input
            id="presentation-template-description"
            class="mt-1 w-full rounded border border-theme-border bg-theme-bg px-2 py-1.5 text-xs text-theme-text"
            bind:value={description}
          />
        </div>
      </div>

      <div class="mt-4 flex-1 min-h-0 grid gap-4 lg:grid-cols-2">
        <PresentationSourceEditor
          {schema}
          bind:source
          diagnostics={preview.diagnostics}
        />

        <div class="flex flex-1 flex-col gap-1.5 min-h-0">
          <span
            class="text-micro font-bold uppercase tracking-wide text-theme-muted"
            >Preview</span
          >
          <div
            class="flex-1 overflow-y-auto rounded border border-theme-border bg-theme-bg/50 p-3"
            data-testid="presentation-editor-preview"
          >
            {#if preview.ast}
              <PresentationRenderer
                nodes={preview.ast}
                context={preview.context}
              />
            {/if}
          </div>
        </div>
      </div>

      {#if saveState.error}
        <p class="mt-3 text-xs text-red-400" role="alert">{saveState.error}</p>
      {/if}
    </div>

    <div
      class="flex items-center justify-between gap-2 border-t border-theme-border p-4"
    >
      {#if !isNewRecord}
        <button
          type="button"
          class="rounded border border-theme-border px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-theme-muted hover:border-theme-primary hover:text-theme-primary"
          onclick={exportCurrent}
          data-testid="presentation-editor-export"
        >
          Export
        </button>
      {:else}
        <span></span>
      {/if}
      <div class="flex gap-2">
        <button
          type="button"
          class="rounded border border-theme-border px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-theme-muted hover:border-theme-primary hover:text-theme-primary"
          onclick={onClose}
        >
          Cancel
        </button>
        <button
          type="button"
          class="rounded bg-theme-primary px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-theme-bg disabled:opacity-40"
          onclick={save}
          disabled={!name.trim() || saveState.isSaving}
          data-testid="presentation-editor-save"
        >
          {saveState.isSaving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  </div>
</div>

{#if showSyntaxHelp}
  <PresentationSyntaxHelpModal onClose={() => (showSyntaxHelp = false)} />
{/if}
