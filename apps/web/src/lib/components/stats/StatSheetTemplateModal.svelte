<script lang="ts">
  import type { Entity, StatSheetField } from "schema";
  import { vault } from "$lib/stores/vault.svelte";
  import { statSheetTemplates } from "$lib/stores/stat-sheet-templates.svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";
  import { applyDerivedModifiers } from "$lib/utils/stat-sheet-field-actions";

  let { entity, onClose = () => {} } = $props<{
    entity: Entity;
    onClose?: () => void;
  }>();

  let saveAsName = $state("");
  let isSaving = $state(false);
  let showAllTemplates = $state(false);

  const currentTemplate = $derived(
    entity.statSheet?.templateId
      ? statSheetTemplates.allTemplates.find(
          (t) => t.id === entity.statSheet?.templateId,
        )
      : null,
  );
  const hasActiveFields = $derived((entity.statSheet?.fields?.length ?? 0) > 0);
  const displayedTemplates = $derived(
    showAllTemplates
      ? statSheetTemplates.allTemplates
      : statSheetTemplates.availableTemplates,
  );
  const hasHiddenTemplates = $derived(
    statSheetTemplates.allTemplates.length >
      statSheetTemplates.availableTemplates.length,
  );

  async function clearStatSheet() {
    const confirmed = await notificationStore.confirm({
      title: "Clear Stat Sheet",
      message: `Remove all stat fields and template assignment from "${entity.title}"?`,
      confirmLabel: "Clear Stat Sheet",
      isDangerous: true,
    });
    if (!confirmed) return;

    await vault.updateEntity(entity.id, {
      statSheet: { templateId: null, fields: [] },
    });
    onClose();
  }

  async function applyTemplate(templateId: string) {
    const template = statSheetTemplates.allTemplates.find(
      (t) => t.id === templateId,
    );
    if (!template) return;

    const existingFields = entity.statSheet?.fields ?? [];
    let mode: "overwrite" | "append" = "overwrite";

    if (existingFields.length > 0) {
      const appendConfirmed = await notificationStore.confirm({
        title: "Apply Template",
        message: `"${entity.title}" already has stat fields. Append the template's fields, or replace the whole layout?`,
        confirmLabel: "Append",
        cancelLabel: "Replace",
      });
      mode = appendConfirmed ? "append" : "overwrite";
      if (!appendConfirmed) {
        const replaceConfirmed = await notificationStore.confirm({
          title: "Replace Stat Sheet",
          message: `Replace all existing stat fields on "${entity.title}" with the "${template.name}" template?`,
          confirmLabel: "Replace",
          isDangerous: true,
        });
        if (!replaceConfirmed) return;
      }
    }

    const templateFields: StatSheetField[] =
      statSheetTemplates.cloneTemplateFields(
        template,
        mode === "append" ? existingFields : [],
      );
    const nextFields = applyDerivedModifiers(
      mode === "append"
        ? [...existingFields, ...templateFields]
        : templateFields,
    );

    await vault.updateEntity(entity.id, {
      statSheet: { templateId: template.id, fields: nextFields },
    });
    onClose();
  }

  async function saveCurrentAsTemplate() {
    if (!saveAsName.trim()) return;
    isSaving = true;
    try {
      const saved = await statSheetTemplates.saveAsTemplate(
        saveAsName.trim(),
        $state.snapshot(entity.statSheet?.fields ?? []),
        { category: entity.type },
      );
      if (saved) {
        notificationStore.notify(`Saved template "${saved.name}"`, "success");
        saveAsName = "";
      } else {
        notificationStore.notify("Failed to save template.", "error");
      }
    } catch (e) {
      console.error("[StatSheetTemplateModal] Failed to save template:", e);
      notificationStore.notify("Failed to save template.", "error");
    } finally {
      isSaving = false;
    }
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  class="fixed inset-0 bg-theme-bg/80 backdrop-blur-md z-[100] flex items-center justify-center p-4"
  onclick={onClose}
  onkeydown={(e) => e.key === "Escape" && onClose()}
  role="button"
  tabindex="0"
  aria-label="Close Modal"
>
  <div
    class="bg-theme-surface border border-theme-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]"
    onclick={(e) => e.stopPropagation()}
    role="none"
    data-testid="stat-sheet-template-modal"
  >
    <div
      class="p-4 border-b border-theme-border flex justify-between items-center bg-theme-bg/50"
    >
      <h2
        class="text-sm font-bold font-header tracking-widest text-theme-text uppercase"
      >
        Stat Sheet Templates
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

    <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
      {#if hasActiveFields || currentTemplate}
        <div
          class="flex items-center justify-between gap-2 rounded border border-theme-primary/30 bg-theme-primary/10 p-2.5 mb-2"
          data-testid="stat-sheet-active-template-banner"
        >
          <div class="flex flex-col min-w-0">
            <span
              class="text-[10px] font-bold uppercase tracking-wider text-theme-primary"
            >
              Active Stat Sheet
            </span>
            <span class="text-xs font-semibold text-theme-text truncate">
              {currentTemplate ? currentTemplate.name : "Custom Layout"} ({entity
                .statSheet?.fields?.length ?? 0} fields)
            </span>
          </div>
          <button
            type="button"
            class="flex items-center gap-1 rounded border border-red-500/50 bg-red-500/10 px-2 py-1 text-xs font-bold text-red-500 hover:bg-red-500/20 shrink-0"
            onclick={clearStatSheet}
            data-testid="stat-sheet-clear-template"
          >
            <span class="icon-[lucide--trash-2] h-3.5 w-3.5" aria-hidden="true"
            ></span>
            Clear Sheet
          </button>
        </div>
      {/if}
      {#each displayedTemplates as template (template.id)}
        <button
          type="button"
          class="flex flex-col items-start gap-0.5 rounded border border-theme-border p-2 text-left hover:border-theme-primary"
          onclick={() => applyTemplate(template.id)}
          data-testid="stat-sheet-template-option"
        >
          <span class="text-xs font-bold text-theme-text">{template.name}</span>
          {#if template.description}
            <span class="text-[10px] text-theme-muted"
              >{template.description}</span
            >
          {/if}
        </button>
      {/each}
      {#if hasHiddenTemplates}
        <button
          type="button"
          class="mt-2 text-center text-[10px] font-bold uppercase tracking-wide text-theme-muted hover:text-theme-primary"
          onclick={() => (showAllTemplates = !showAllTemplates)}
          data-testid="stat-sheet-toggle-show-all"
        >
          {showAllTemplates
            ? "Show Vault-Applicable Templates Only"
            : `Show All Templates (${statSheetTemplates.allTemplates.length - statSheetTemplates.availableTemplates.length} hidden)`}
        </button>
      {/if}
    </div>

    <div class="border-t border-theme-border p-4 flex items-center gap-2">
      <input
        type="text"
        class="flex-1 rounded border border-theme-border bg-theme-bg px-2 py-1 text-xs text-theme-text"
        placeholder="Save current layout as..."
        bind:value={saveAsName}
        data-testid="stat-sheet-template-save-name"
      />
      <button
        type="button"
        class="rounded border border-theme-border px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-theme-muted hover:border-theme-primary hover:text-theme-primary disabled:opacity-40"
        onclick={saveCurrentAsTemplate}
        disabled={!saveAsName.trim() || isSaving}
        data-testid="stat-sheet-template-save"
      >
        Save
      </button>
    </div>
  </div>
</div>
