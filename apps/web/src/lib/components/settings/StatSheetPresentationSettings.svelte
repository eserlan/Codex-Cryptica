<script lang="ts">
  import { statSheetTemplates } from "#lib/stores/stat-sheet-templates.svelte.js";
  import type { PresentationTemplate } from "schema";
  import { notificationStore } from "#lib/stores/ui/notification.svelte.js";
  import { presentationTemplates } from "#lib/stores/presentation-templates.svelte.js";
  import { modalUIStore } from "#lib/stores/ui/modal-ui.svelte.js";
  import { importPresentationFile } from "../stats/presentation/presentation-template-import.js";
  let selectedPresentationSchemaId = $state<string>("");
  const selectedPresentationSchema = $derived(
    statSheetTemplates.availableTemplates.find(
      (t) => t.id === selectedPresentationSchemaId,
    ) ?? statSheetTemplates.availableTemplates[0],
  );

  const availablePresentations = $derived(
    selectedPresentationSchema
      ? [
          ...presentationTemplates.availableTemplatesForSchema(
            selectedPresentationSchema.id,
          ),
          ...presentationTemplates.generatedLayoutsForSchema(
            selectedPresentationSchema.id,
            selectedPresentationSchema.fields,
          ),
        ]
      : [],
  );

  const schemaDefaultPresentationId = $derived(
    selectedPresentationSchema &&
      typeof statSheetTemplates.getDefaultPresentationTemplateId === "function"
      ? statSheetTemplates.getDefaultPresentationTemplateId(
          selectedPresentationSchema.id,
        )
      : null,
  );

  let presFileInput: HTMLInputElement | undefined = $state();
  let presImportError = $state("");

  function openPresentation(
    template: PresentationTemplate | null = null,
    duplicate = false,
  ) {
    if (!selectedPresentationSchema) return;
    modalUIStore.presentationEditorState = {
      open: true,
      schema: selectedPresentationSchema,
      template,
      duplicate,
    };
  }

  async function deletePresentationTemplate(template: PresentationTemplate) {
    const confirmed = await notificationStore.confirm({
      title: "Delete Presentation Template",
      message: `Delete "${template.name}"? Entities using it will fall back to the standard view.`,
      confirmLabel: "Delete",
      isDangerous: true,
    });
    if (!confirmed) return;
    await presentationTemplates.deleteTemplate(template.id);
  }

  function triggerPresentationImport() {
    presImportError = "";
    presFileInput?.click();
  }

  async function handleImportPresentationFile(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (!file || !selectedPresentationSchema) return;
    presImportError = "";
    const error = await importPresentationFile(
      file,
      () => selectedPresentationSchema!,
    );
    if (error !== null) presImportError = error;
  }
</script>

<div class="p-4 bg-theme-primary/5 border border-theme-primary/20 rounded-lg">
  <div class="flex items-center justify-between gap-3 mb-2">
    <div>
      <h4
        class="text-xs font-bold text-theme-primary uppercase font-header tracking-[0.2em]"
      >
        Presentation Layout Templates
      </h4>
      <p class="text-micro text-theme-muted mt-1 leading-relaxed">
        Custom card, grid, and table layouts for stat sheets.
      </p>
    </div>
    <div class="flex items-center gap-2 shrink-0">
      <button
        type="button"
        class="rounded border border-theme-border px-3 py-1 text-xs font-bold uppercase tracking-wide text-theme-muted hover:border-theme-primary hover:text-theme-primary transition-colors"
        onclick={triggerPresentationImport}
        data-testid="presentation-manager-import"
      >
        Import
      </button>
      <input
        bind:this={presFileInput}
        type="file"
        accept="application/json"
        class="hidden"
        onchange={handleImportPresentationFile}
      />
      <button
        type="button"
        class="rounded bg-theme-primary px-3 py-1 text-xs font-bold uppercase tracking-wide text-theme-bg hover:opacity-90 transition-colors"
        onclick={() => openPresentation()}
        data-testid="presentation-manager-new"
      >
        New Layout
      </button>
    </div>
  </div>

  <div
    class="flex items-center gap-3 p-3 bg-theme-surface border border-theme-border rounded mb-3"
  >
    <span class="text-xs font-bold text-theme-text truncate"
      >Select Stat Schema:</span
    >
    <select
      class="rounded border border-theme-border bg-theme-bg px-2 py-1 text-xs text-theme-text flex-1"
      aria-label="Select schema to manage presentation templates"
      value={selectedPresentationSchemaId}
      onchange={(e) => {
        selectedPresentationSchemaId = (e.target as HTMLSelectElement).value;
      }}
    >
      {#each statSheetTemplates.availableTemplates as schema (schema.id)}
        <option value={schema.id}>{schema.name}</option>
      {/each}
    </select>
  </div>

  {#if presImportError}
    <p class="mb-3 text-xs text-red-400" role="alert">{presImportError}</p>
  {/if}

  <div class="space-y-2">
    {#each availablePresentations as t (t.id)}
      <div
        class="p-3 bg-theme-surface border border-theme-border rounded flex items-center justify-between gap-3 group transition-all hover:border-theme-primary/30"
        data-testid="presentation-template-row"
      >
        <div class="flex flex-col min-w-0">
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-theme-text truncate">
              {t.name}
            </span>
            {#if t.id === schemaDefaultPresentationId}
              <span
                class="rounded bg-theme-primary/10 border border-theme-primary/30 px-1.5 py-0.5 text-nano font-bold text-theme-primary uppercase tracking-wider"
              >
                Default
              </span>
            {/if}
            {#if t.isBuiltIn}
              <span
                class="rounded bg-theme-surface border border-theme-border px-1.5 py-0.5 text-nano font-bold text-theme-muted uppercase tracking-wider"
              >
                Built-in
              </span>
            {/if}
          </div>
          {#if t.description}
            <span class="text-micro text-theme-muted truncate mt-0.5"
              >{t.description}</span
            >
          {/if}
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <button
            type="button"
            class="rounded border border-theme-border px-2.5 py-1 text-micro font-bold uppercase tracking-wide text-theme-muted hover:border-theme-primary hover:text-theme-primary transition-colors"
            onclick={() => {
              presentationTemplates.exportTemplate(t);
              notificationStore.notify(`Exported "${t.name}"`, "info");
            }}
            data-testid="presentation-manager-export"
            aria-label={`Export ${t.name}`}
          >
            Export
          </button>
          {#if t.isBuiltIn}
            <button
              type="button"
              class="rounded border border-theme-border px-2.5 py-1 text-micro font-bold uppercase tracking-wide text-theme-muted hover:border-theme-primary hover:text-theme-primary transition-colors"
              onclick={() => openPresentation(t, true)}
              data-testid="presentation-manager-duplicate"
            >
              Duplicate
            </button>
          {:else}
            <button
              type="button"
              class="rounded border border-theme-border px-2.5 py-1 text-micro font-bold uppercase tracking-wide text-theme-muted hover:border-theme-primary hover:text-theme-primary transition-colors"
              onclick={() => openPresentation(t)}
              data-testid="presentation-manager-edit"
            >
              Edit
            </button>
            <button
              type="button"
              class="rounded border border-theme-border px-2.5 py-1 text-micro font-bold uppercase tracking-wide text-theme-muted hover:border-red-500 hover:text-red-500 transition-colors"
              onclick={() => deletePresentationTemplate(t)}
              data-testid="presentation-manager-delete"
            >
              Delete
            </button>
          {/if}
        </div>
      </div>
    {:else}
      <div
        class="p-6 text-center border border-dashed border-theme-border rounded bg-theme-surface/50"
      >
        <p class="text-xs text-theme-muted">
          No layout templates found for this schema.
        </p>
      </div>
    {/each}
  </div>
</div>
