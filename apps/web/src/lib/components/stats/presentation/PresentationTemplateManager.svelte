<script lang="ts">
  import type { StatSheetTemplate, PresentationTemplate } from "schema";
  import { presentationTemplates } from "$lib/stores/presentation-templates.svelte";
  import { statSheetTemplates } from "$lib/stores/stat-sheet-templates.svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";
  import { importPresentationTemplatePackage } from "@codex/stat-sheet-engine";
  import FeatureHint from "$lib/components/help/FeatureHint.svelte";

  let {
    schema,
    onClose = () => {},
  }: { schema: StatSheetTemplate; onClose?: () => void } = $props();

  let importError = $state("");
  let fileInput: HTMLInputElement | undefined = $state();

  const available = $derived(
    presentationTemplates.availableTemplatesForSchema(schema.id),
  );
  const schemaDefaultId = $derived(
    statSheetTemplates.getDefaultPresentationTemplateId(schema.id),
  );

  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";

  function openCreate() {
    modalUIStore.presentationEditorState = {
      open: true,
      schema,
      template: null,
      duplicate: false,
    };
  }
  function openEdit(template: PresentationTemplate) {
    modalUIStore.presentationEditorState = {
      open: true,
      schema,
      template,
      duplicate: false,
    };
  }
  function openDuplicate(template: PresentationTemplate) {
    modalUIStore.presentationEditorState = {
      open: true,
      schema,
      template,
      duplicate: true,
    };
  }

  async function deleteTemplate(template: PresentationTemplate) {
    const confirmed = await notificationStore.confirm({
      title: "Delete Presentation Template",
      message: `Delete "${template.name}"? Entities using it will fall back to the standard view.`,
      confirmLabel: "Delete",
      isDangerous: true,
    });
    if (!confirmed) return;
    await presentationTemplates.deleteTemplate(template.id);
  }

  function triggerImport() {
    importError = "";
    fileInput?.click();
  }

  async function handleImportFile(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    importError = "";
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const availableSchemaIds = [schema.id];
      const result = importPresentationTemplatePackage(
        json,
        availableSchemaIds,
      );
      if (!result.ok) {
        importError = result.message;
        return;
      }
      const saved = await presentationTemplates.saveTemplate({
        schemaTemplateId: result.package.schemaTemplateId,
        name: presentationTemplates.uniqueNameForSchema(
          result.package.name,
          schema.id,
        ),
        description: result.package.description ?? null,
        source: result.package.source,
        formatVersion: result.package.formatVersion,
      });
      if (!saved) {
        importError = "Failed to import template.";
        return;
      }
      const notice =
        result.removedFragments.length > 0
          ? ` (${result.removedFragments.length} disallowed item${result.removedFragments.length === 1 ? "" : "s"} removed)`
          : "";
      notificationStore.notify(
        `Imported template "${saved.name}"${notice}`,
        "success",
      );
    } catch {
      importError = "This file isn't a valid presentation template.";
    }
  }
</script>

<div
  class="fixed inset-0 z-[120] flex items-center justify-center bg-theme-bg/80 p-3 sm:p-6"
  role="presentation"
  onclick={(event) => event.target === event.currentTarget && onClose()}
>
  <div
    class="flex max-h-[90vh] w-full max-w-2xl xl:max-w-3xl flex-col overflow-hidden rounded-xl border border-theme-border bg-theme-surface shadow-2xl"
    role="dialog"
    aria-modal="true"
    aria-labelledby="presentation-manager-title"
    data-testid="presentation-template-manager"
  >
    <div
      class="flex items-center justify-between border-b border-theme-border bg-theme-bg/50 p-4"
    >
      <h2
        id="presentation-manager-title"
        class="font-header text-sm font-bold uppercase tracking-widest text-theme-text"
      >
        Presentation Templates
      </h2>
      <button
        type="button"
        class="text-theme-muted hover:text-theme-text"
        onclick={onClose}
        aria-label="Close"
      >
        <span class="icon-[lucide--x] h-4 w-4" aria-hidden="true"></span>
      </button>
    </div>

    <div class="flex-1 overflow-y-auto p-4">
      <div class="mb-3">
        <FeatureHint hintId="presentation-templates" />
      </div>
      <ul class="flex flex-col gap-2">
        {#each available as t (t.id)}
          <li
            class="flex items-center justify-between gap-2 rounded border border-theme-border p-2"
            data-testid="presentation-manager-row"
          >
            <div class="flex flex-col min-w-0">
              <span class="text-xs font-bold text-theme-text truncate">
                {t.name}{t.id === schemaDefaultId ? " (schema default)" : ""}
                {t.isBuiltIn ? " · built-in" : ""}
              </span>
              {#if t.description}
                <span class="text-[10px] text-theme-muted truncate"
                  >{t.description}</span
                >
              {/if}
            </div>
            <div class="flex shrink-0 gap-1">
              {#if t.isBuiltIn}
                <button
                  type="button"
                  class="rounded border border-theme-border px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-theme-muted hover:border-theme-primary hover:text-theme-primary"
                  onclick={() => openDuplicate(t)}
                  data-testid="presentation-manager-duplicate"
                >
                  Duplicate
                </button>
              {:else}
                <button
                  type="button"
                  class="rounded border border-theme-border px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-theme-muted hover:border-theme-primary hover:text-theme-primary"
                  onclick={() => openEdit(t)}
                  data-testid="presentation-manager-edit"
                >
                  Edit
                </button>
                <button
                  type="button"
                  class="rounded border border-theme-border px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-theme-muted hover:border-red-500 hover:text-red-500"
                  onclick={() => deleteTemplate(t)}
                  data-testid="presentation-manager-delete"
                >
                  Delete
                </button>
              {/if}
            </div>
          </li>
        {/each}
      </ul>

      {#if importError}
        <p
          class="mt-3 text-xs text-red-400"
          role="alert"
          data-testid="presentation-manager-import-error"
        >
          {importError}
        </p>
      {/if}
    </div>

    <div
      class="flex items-center justify-between gap-2 border-t border-theme-border p-4"
    >
      <button
        type="button"
        class="rounded border border-theme-border px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-theme-muted hover:border-theme-primary hover:text-theme-primary"
        onclick={triggerImport}
        data-testid="presentation-manager-import"
      >
        Import
      </button>
      <input
        bind:this={fileInput}
        type="file"
        accept="application/json"
        class="hidden"
        onchange={handleImportFile}
      />
      <button
        type="button"
        class="rounded bg-theme-primary px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-theme-bg"
        onclick={openCreate}
        data-testid="presentation-manager-new"
      >
        New Template
      </button>
    </div>
  </div>
</div>
