<script lang="ts">
  import type { Entity, StatSheetTemplate, PresentationTemplate } from "schema";
  import { presentationTemplates } from "$lib/stores/presentation-templates.svelte";
  import { statSheetTemplates } from "$lib/stores/stat-sheet-templates.svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";
  import {
    analyzePresentationCompatibility,
    importPresentationTemplatePackage,
  } from "@codex/stat-sheet-engine";
  import FeatureHint from "$lib/components/help/FeatureHint.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";

  let {
    schema,
    entityType,
    onClose = () => {},
  }: {
    schema: StatSheetTemplate;
    entityType?: Entity["type"];
    onClose?: () => void;
  } = $props();

  let importError = $state("");
  let fileInput: HTMLInputElement | undefined = $state();
  let showCopyModal = $state(false);
  let showPromoteModal = $state(false);
  let templateToPromote = $state<PresentationTemplate | null>(null);

  const available = $derived(
    presentationTemplates.availableTemplatesForSchema(
      schema.id,
      schema.fields,
      entityType,
    ),
  );
  const schemaDefaultId = $derived(
    statSheetTemplates.getDefaultPresentationTemplateId(schema.id),
  );

  const isEntityLocal = $derived(
    schema.id.startsWith("entity-local-stat-sheet:"),
  );

  const otherVaultTemplates = $derived(
    presentationTemplates.templates.filter(
      (t) => t.schemaTemplateId !== schema.id,
    ),
  );

  const reusableStatSheetTemplates = $derived(statSheetTemplates.allTemplates);

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

  function handleExport(template: PresentationTemplate) {
    presentationTemplates.exportTemplate(template);
    notificationStore.notify(`Exported "${template.name}"`, "info");
  }

  async function handleCopyFromOther(sourceTemplate: PresentationTemplate) {
    const saved = await presentationTemplates.copyTemplateToSchema(
      sourceTemplate,
      schema.id,
    );
    if (!saved) {
      notificationStore.notify("Failed to copy template.", "error");
      return;
    }
    const analysis = analyzePresentationCompatibility(
      sourceTemplate.source,
      sourceTemplate.formatVersion,
      schema,
    );
    if (!analysis.compatible && analysis.unmappedFields.length > 0) {
      notificationStore.notify(
        `Copied "${saved.name}" (Note: unmapped fields: ${analysis.unmappedFields.join(", ")})`,
        "warning",
      );
    } else {
      notificationStore.notify(
        `Copied "${saved.name}" to this sheet`,
        "success",
      );
    }
    showCopyModal = false;
  }

  function openPromoteDialog(template: PresentationTemplate) {
    templateToPromote = template;
    showPromoteModal = true;
  }

  async function handlePromoteToTemplate(targetTemplate: StatSheetTemplate) {
    if (!templateToPromote) return;
    const saved = await presentationTemplates.copyTemplateToSchema(
      templateToPromote,
      targetTemplate.id,
    );
    if (!saved) {
      notificationStore.notify(
        "Failed to save reusable layout to template.",
        "error",
      );
      return;
    }
    const analysis = analyzePresentationCompatibility(
      templateToPromote.source,
      templateToPromote.formatVersion,
      targetTemplate,
    );
    if (!analysis.compatible && analysis.unmappedFields.length > 0) {
      notificationStore.notify(
        `Saved "${saved.name}" to template "${targetTemplate.name}" (Note: unmapped fields: ${analysis.unmappedFields.join(", ")})`,
        "warning",
      );
    } else {
      notificationStore.notify(
        `Saved "${saved.name}" as reusable layout for "${targetTemplate.name}"`,
        "success",
      );
    }
    showPromoteModal = false;
    templateToPromote = null;
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
        schema,
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
      const unmappedNotice =
        result.unmappedFields && result.unmappedFields.length > 0
          ? ` (Note: unmapped fields: ${result.unmappedFields.join(", ")})`
          : "";
      const strippedNotice =
        result.removedFragments.length > 0
          ? ` (${result.removedFragments.length} disallowed item${result.removedFragments.length === 1 ? "" : "s"} removed)`
          : "";
      notificationStore.notify(
        `Imported template "${saved.name}"${strippedNotice}${unmappedNotice}`,
        unmappedNotice ? "warning" : "success",
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
      <div>
        <h2
          id="presentation-manager-title"
          class="font-header text-sm font-bold uppercase tracking-widest text-theme-text"
        >
          Presentation Templates
        </h2>
        <p class="text-[11px] text-theme-muted mt-0.5">
          {isEntityLocal
            ? "Custom Character Sheet layouts. Save, export, or copy layouts between characters."
            : `Layouts for "${schema.name}". Apply across all characters using this template.`}
        </p>
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
              <div class="flex items-center gap-1.5 truncate">
                <span class="text-xs font-bold text-theme-text truncate">
                  {t.name}
                </span>
                {#if t.id === schemaDefaultId}
                  <span
                    class="rounded bg-theme-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-theme-primary"
                  >
                    Default
                  </span>
                {/if}
                {#if t.isBuiltIn}
                  <span
                    class="rounded bg-theme-bg px-1.5 py-0.5 text-[9px] font-bold text-theme-muted"
                  >
                    Built-in
                  </span>
                {/if}
              </div>
              {#if t.description}
                <span class="text-[10px] text-theme-muted truncate"
                  >{t.description}</span
                >
              {/if}
            </div>
            <div class="flex shrink-0 items-center gap-1">
              <button
                type="button"
                class="rounded border border-theme-border px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-theme-muted hover:border-theme-primary hover:text-theme-primary"
                onclick={() => handleExport(t)}
                data-testid="presentation-manager-export"
                aria-label={`Export ${t.name}`}
              >
                Export
              </button>
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
                {#if isEntityLocal && reusableStatSheetTemplates.length > 0}
                  <button
                    type="button"
                    class="rounded border border-theme-border px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-theme-muted hover:border-theme-primary hover:text-theme-primary"
                    onclick={() => openPromoteDialog(t)}
                    data-testid="presentation-manager-promote"
                    title="Save this layout to a reusable template so other characters can use it"
                  >
                    Save to Template
                  </button>
                {/if}
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
      class="flex flex-wrap items-center justify-between gap-2 border-t border-theme-border p-4"
    >
      <div class="flex items-center gap-2">
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
        {#if otherVaultTemplates.length > 0}
          <button
            type="button"
            class="rounded border border-theme-border px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-theme-muted hover:border-theme-primary hover:text-theme-primary"
            onclick={() => (showCopyModal = true)}
            data-testid="presentation-manager-copy-from-other"
          >
            Copy from Another...
          </button>
        {/if}
      </div>
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

{#if showCopyModal}
  <div
    class="fixed inset-0 z-[130] flex items-center justify-center bg-theme-bg/85 p-3 sm:p-6 backdrop-blur-xs"
    role="presentation"
    onclick={(event) =>
      event.target === event.currentTarget && (showCopyModal = false)}
  >
    <div
      class="flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-theme-border bg-theme-surface shadow-2xl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="copy-presentation-title"
    >
      <div
        class="flex items-center justify-between border-b border-theme-border bg-theme-bg/50 p-4"
      >
        <div>
          <h3
            id="copy-presentation-title"
            class="font-header text-sm font-bold uppercase tracking-widest text-theme-text"
          >
            Copy Layout from Another Character or Template
          </h3>
          <p class="text-[11px] text-theme-muted mt-0.5">
            Select an existing presentation from your vault to adapt to this
            sheet.
          </p>
        </div>
        <button
          type="button"
          class="text-theme-muted hover:text-theme-text"
          onclick={() => (showCopyModal = false)}
          aria-label="Close"
        >
          <span class="icon-[lucide--x] h-4 w-4" aria-hidden="true"></span>
        </button>
      </div>
      <div class="flex-1 overflow-y-auto p-4">
        <ul class="flex flex-col gap-2">
          {#each otherVaultTemplates as other (other.id)}
            {@const analysis = analyzePresentationCompatibility(
              other.source,
              other.formatVersion,
              schema,
            )}
            <li
              class="flex items-center justify-between gap-2 rounded border border-theme-border p-3"
              data-testid="presentation-copy-item"
            >
              <div class="flex flex-col min-w-0">
                <span class="text-xs font-bold text-theme-text truncate"
                  >{other.name}</span
                >
                {#if other.description}
                  <span class="text-[10px] text-theme-muted truncate"
                    >{other.description}</span
                  >
                {/if}
                <span
                  class="text-[10px] mt-1 font-mono {analysis.compatible
                    ? 'text-emerald-400'
                    : 'text-amber-400'}"
                >
                  {analysis.compatible
                    ? "✓ All referenced fields match"
                    : `⚠ ${analysis.matchedFields.length} matched, ${analysis.unmappedFields.length} unmapped (${analysis.unmappedFields.join(", ")})`}
                </span>
              </div>
              <button
                type="button"
                class="rounded bg-theme-primary px-2.5 py-1 text-xs font-bold text-theme-bg shrink-0 hover:opacity-90"
                onclick={() => handleCopyFromOther(other)}
                data-testid="presentation-manager-confirm-copy"
              >
                Copy Layout
              </button>
            </li>
          {/each}
        </ul>
      </div>
      <div class="border-t border-theme-border p-3 flex justify-end">
        <button
          type="button"
          class="rounded border border-theme-border px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-theme-muted"
          onclick={() => (showCopyModal = false)}
        >
          Close
        </button>
      </div>
    </div>
  </div>
{/if}

{#if showPromoteModal && templateToPromote}
  <div
    class="fixed inset-0 z-[130] flex items-center justify-center bg-theme-bg/85 p-3 sm:p-6 backdrop-blur-xs"
    role="presentation"
    onclick={(event) =>
      event.target === event.currentTarget && (showPromoteModal = false)}
  >
    <div
      class="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-theme-border bg-theme-surface shadow-2xl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="promote-presentation-title"
    >
      <div
        class="flex items-center justify-between border-b border-theme-border bg-theme-bg/50 p-4"
      >
        <div>
          <h3
            id="promote-presentation-title"
            class="font-header text-sm font-bold uppercase tracking-widest text-theme-text"
          >
            Save to Reusable Stat Sheet Template
          </h3>
          <p class="text-[11px] text-theme-muted mt-0.5">
            Save "{templateToPromote.name}" to a reusable template so all
            characters with that template can use it.
          </p>
        </div>
        <button
          type="button"
          class="text-theme-muted hover:text-theme-text"
          onclick={() => (showPromoteModal = false)}
          aria-label="Close"
        >
          <span class="icon-[lucide--x] h-4 w-4" aria-hidden="true"></span>
        </button>
      </div>
      <div class="flex-1 overflow-y-auto p-4">
        <p class="text-xs text-theme-muted mb-3">
          Choose which Stat Sheet template will receive this layout:
        </p>
        <ul class="flex flex-col gap-2">
          {#each reusableStatSheetTemplates as statTemplate (statTemplate.id)}
            {@const analysis = analyzePresentationCompatibility(
              templateToPromote.source,
              templateToPromote.formatVersion,
              statTemplate,
            )}
            <li
              class="flex items-center justify-between gap-2 rounded border border-theme-border p-3"
            >
              <div class="flex flex-col min-w-0">
                <span class="text-xs font-bold text-theme-text truncate"
                  >{statTemplate.name}</span
                >
                <span
                  class="text-[10px] mt-0.5 font-mono {analysis.compatible
                    ? 'text-emerald-400'
                    : 'text-amber-400'}"
                >
                  {analysis.compatible
                    ? "✓ All fields compatible"
                    : `⚠ ${analysis.matchedFields.length} matched, ${analysis.unmappedFields.length} unmapped`}
                </span>
              </div>
              <button
                type="button"
                class="rounded bg-theme-primary px-2.5 py-1 text-xs font-bold text-theme-bg shrink-0 hover:opacity-90"
                onclick={() => handlePromoteToTemplate(statTemplate)}
                data-testid="presentation-manager-confirm-promote"
              >
                Save Layout
              </button>
            </li>
          {/each}
        </ul>
      </div>
      <div class="border-t border-theme-border p-3 flex justify-end">
        <button
          type="button"
          class="rounded border border-theme-border px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-theme-muted"
          onclick={() => (showPromoteModal = false)}
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
{/if}
