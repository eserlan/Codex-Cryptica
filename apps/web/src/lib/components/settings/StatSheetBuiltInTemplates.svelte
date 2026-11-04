<script lang="ts">
  import { statSheetTemplates } from "#lib/stores/stat-sheet-templates.svelte.js";
  import type { StatSheetTemplateFieldOrder } from "./stat-sheet-template-field-order.svelte.js";
  import StatSheetTemplatePreview from "./StatSheetTemplatePreview.svelte";
  import StatSheetTemplateToggle from "./StatSheetTemplateToggle.svelte";
  import type { StatSheetTemplate } from "schema";
  import { BUILT_IN_STAT_SHEET_TEMPLATES } from "#lib/stores/stat-sheet/built-in-templates.js";
  import { notificationStore } from "#lib/stores/ui/notification.svelte.js";
  let {
    expandedIds,
    togglePreview,
    order,
  }: {
    expandedIds: Set<string>;
    togglePreview: (id: string) => void;
    order: StatSheetTemplateFieldOrder;
  } = $props();
  let savingBuiltInTemplateIds = $state<string[]>([]);
  const saveBuiltInAsVaultTemplate = async (template: StatSheetTemplate) => {
    if (savingBuiltInTemplateIds.includes(template.id)) return;
    savingBuiltInTemplateIds = [...savingBuiltInTemplateIds, template.id];
    try {
      const saved = await statSheetTemplates.saveAsTemplate(
        `${template.name} (Vault copy)`,
        template.fields,
        {
          description: template.description,
          category: template.category,
        },
      );
      if (saved) {
        notificationStore.notify(
          `Saved "${saved.name}" to this vault. You can now edit or publish it from Vault Templates.`,
          "success",
        );
      } else {
        notificationStore.notify(
          "Failed to save a vault copy of this template.",
          "error",
        );
      }
    } catch (error) {
      console.error(
        "[StatSheetTemplateSettings] Failed to save built-in template copy:",
        error,
      );
      notificationStore.notify(
        "Failed to save a vault copy of this template.",
        "error",
      );
    } finally {
      savingBuiltInTemplateIds = savingBuiltInTemplateIds.filter(
        (id) => id !== template.id,
      );
    }
  };
</script>

<div class="p-4 bg-theme-primary/5 border border-theme-primary/20 rounded-lg">
  <h4
    class="text-xs font-bold text-theme-primary uppercase font-header tracking-[0.2em] mb-4"
  >
    Built-In Templates
  </h4>
  <div class="space-y-2">
    {#each BUILT_IN_STAT_SHEET_TEMPLATES as template (template.id)}
      {@const isSavingVaultCopy = savingBuiltInTemplateIds.includes(
        template.id,
      )}
      <div
        class="p-3 bg-theme-surface border border-theme-border rounded"
        data-testid="stat-sheet-builtin-row"
      >
        <div class="flex items-center justify-between gap-3">
          <button
            type="button"
            class="flex flex-1 items-center gap-3 text-left min-w-0"
            onclick={() => togglePreview(template.id)}
            aria-expanded={expandedIds.has(template.id)}
            aria-label="Toggle preview of {template.name} template"
          >
            <span
              class="icon-[lucide--chevron-right] text-theme-muted w-3 h-3 shrink-0 transition-transform {expandedIds.has(
                template.id,
              )
                ? 'rotate-90'
                : ''}"
              aria-hidden="true"
            ></span>
            <span
              class="icon-[lucide--list-checks] text-theme-secondary w-3.5 h-3.5 shrink-0"
              aria-hidden="true"
            ></span>
            <div class="min-w-0">
              <span class="text-xs font-bold text-theme-text truncate block"
                >{template.name}</span
              >
              {#if template.description}
                <span class="text-micro text-theme-muted truncate block"
                  >{template.description}</span
                >
              {/if}
            </div>
          </button>
          <StatSheetTemplateToggle templateId={template.id} />
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded border border-theme-primary/40 px-2 py-1 text-micro font-bold uppercase tracking-wide text-theme-primary transition-colors hover:border-theme-primary hover:bg-theme-primary/10"
            onclick={() => saveBuiltInAsVaultTemplate(template)}
            title="Save an editable vault copy of this template"
            aria-label="Save a vault copy of {template.name} template"
            aria-busy={isSavingVaultCopy}
            disabled={isSavingVaultCopy}
            data-testid="save-builtin-stat-sheet-template-copy"
          >
            <span
              class="h-3.5 w-3.5 {isSavingVaultCopy
                ? 'icon-[lucide--loader-2] animate-spin'
                : 'icon-[lucide--copy-plus]'}"
              aria-hidden="true"
            ></span>
            {isSavingVaultCopy ? "Saving copy..." : "Save copy to Vault"}
          </button>
        </div>
        {#if expandedIds.has(template.id)}
          <StatSheetTemplatePreview {template} {order} />
        {/if}
      </div>
    {/each}
  </div>
</div>
