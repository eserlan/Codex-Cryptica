<script lang="ts">
  import { statSheetTemplates } from "#lib/stores/stat-sheet-templates.svelte.js";
  import type { StatSheetTemplateFieldOrder } from "./stat-sheet-template-field-order.svelte.js";
  import StatSheetTemplatePreview from "./StatSheetTemplatePreview.svelte";
  import StatSheetTemplateToggle from "./StatSheetTemplateToggle.svelte";
  import type { StatSheetTemplate } from "schema";
  import { resolve } from "$app/paths";
  import { notificationStore } from "#lib/stores/ui/notification.svelte.js";
  import TemplatePublishModal from "#lib/components/stats/community-template/TemplatePublishModal.svelte";
  let {
    expandedIds,
    togglePreview,
    order,
  }: {
    expandedIds: Set<string>;
    togglePreview: (id: string) => void;
    order: StatSheetTemplateFieldOrder;
  } = $props();
  let editingId = $state<string | null>(null);
  let renameValue = $state("");
  const startRename = (id: string, currentName: string) => {
    editingId = id;
    renameValue = currentName;
  };

  const handleRename = async () => {
    if (editingId && renameValue.trim()) {
      const ok = await statSheetTemplates.renameTemplate(
        editingId,
        renameValue.trim(),
      );
      if (!ok) {
        notificationStore.notify("Failed to rename template.", "error");
      }
    }
    editingId = null;
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await notificationStore.confirm({
      title: "Delete Template",
      message: `Are you sure you want to delete the "${name}" stat sheet template? Entities already using it keep their fields — only the reusable template is removed.`,
      confirmLabel: "Delete",
      isDangerous: true,
    });
    if (confirmed) {
      const ok = await statSheetTemplates.deleteTemplate(id);
      if (!ok) {
        notificationStore.notify("Failed to delete template.", "error");
      }
    }
  };

  let selectedPublishTemplateIds = $state<string[]>([]);
  let publishingTemplates = $state<StatSheetTemplate[]>([]);
  const selectedPublishCount = $derived(selectedPublishTemplateIds.length);

  function togglePublishSelection(templateId: string, selected: boolean) {
    selectedPublishTemplateIds = selected
      ? [...new Set([...selectedPublishTemplateIds, templateId])]
      : selectedPublishTemplateIds.filter((id) => id !== templateId);
  }

  function openPublishSelection() {
    publishingTemplates = statSheetTemplates.templates.filter((template) =>
      selectedPublishTemplateIds.includes(template.id),
    );
  }
</script>

{#snippet templateName(template: StatSheetTemplate)}
  <div class="flex-1 min-w-0">
    {#if editingId === template.id}
      <div class="flex gap-2 mr-4">
        <input
          type="text"
          bind:value={renameValue}
          class="bg-black border border-theme-primary text-theme-text px-2 py-1 text-xs outline-none flex-1 rounded font-mono"
          onkeydown={(e) => e.key === "Enter" && handleRename()}
        />
        <button
          onclick={handleRename}
          class="px-3 py-1 bg-theme-primary text-theme-on-primary text-meta font-bold rounded uppercase font-header transition-colors"
        >
          Save
        </button>
        <button
          onclick={() => (editingId = null)}
          class="px-3 py-1 border border-theme-border text-theme-text text-meta font-bold rounded uppercase font-header hover:text-theme-text transition-colors"
        >
          Cancel
        </button>
      </div>
    {:else}
      <button
        type="button"
        class="flex items-center gap-3 w-full text-left"
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
          class="icon-[lucide--list-checks] text-theme-secondary w-3.5 h-3.5"
          aria-hidden="true"
        ></span>
        <span class="text-xs font-bold text-theme-text truncate"
          >{template.name}</span
        >
      </button>
    {/if}
  </div>
{/snippet}

<div class="p-4 bg-theme-primary/5 border border-theme-primary/20 rounded-lg">
  <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
    <h4
      class="text-xs font-bold text-theme-text uppercase font-header tracking-[0.2em]"
    >
      Vault Templates
    </h4>
    <a
      href={resolve("/(app)/templates")}
      class="inline-flex items-center gap-1.5 rounded border border-theme-primary/40 px-2.5 py-1.5 text-micro font-bold uppercase tracking-wide text-theme-text transition-colors hover:border-theme-primary hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary"
      data-testid="browse-community-stat-sheet-templates"
    >
      <span class="icon-[lucide--users-round] h-3.5 w-3.5" aria-hidden="true"
      ></span>
      Browse community templates
    </a>
    <button
      type="button"
      class="inline-flex items-center gap-1.5 rounded bg-theme-primary px-2.5 py-1.5 text-micro font-bold uppercase tracking-wide text-theme-on-primary transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
      disabled={selectedPublishCount === 0}
      onclick={openPublishSelection}
      data-testid="publish-selected-stat-sheet-templates"
    >
      <span class="icon-[lucide--upload] h-3.5 w-3.5" aria-hidden="true"></span>
      Publish selected{selectedPublishCount ? ` (${selectedPublishCount})` : ""}
    </button>
  </div>

  <div class="space-y-2">
    {#each statSheetTemplates.templates as template (template.id)}
      <div
        class="p-3 bg-theme-surface border border-theme-border rounded group transition-all hover:border-theme-primary/30"
        data-testid="stat-sheet-template-settings-row"
      >
        <div class="flex items-center justify-between gap-3">
          <label
            class="flex shrink-0 items-center gap-2 text-xs text-theme-text"
          >
            <input
              type="checkbox"
              checked={selectedPublishTemplateIds.includes(template.id)}
              onchange={(event) =>
                togglePublishSelection(
                  template.id,
                  (event.currentTarget as HTMLInputElement).checked,
                )}
              aria-label="Select {template.name} for community publishing"
              data-testid="stat-sheet-publish-selection"
            />
            <span class="sr-only">Select for community publishing</span>
          </label>
          {@render templateName(template)}

          <StatSheetTemplateToggle templateId={template.id} />

          {#if editingId !== template.id}
            <div
              class="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity"
            >
              <button
                type="button"
                onclick={() => startRename(template.id, template.name)}
                class="p-2 text-theme-text hover:text-theme-primary transition-colors"
                title="Rename Template"
                aria-label="Rename {template.name} template"
              >
                <span
                  aria-hidden="true"
                  class="icon-[heroicons--pencil-square] w-4 h-4"
                ></span>
              </button>
              <button
                type="button"
                onclick={() => handleDelete(template.id, template.name)}
                class="p-2 text-red-900/60 hover:text-red-500 transition-colors"
                title="Delete Template"
                aria-label="Delete {template.name} template"
              >
                <span aria-hidden="true" class="icon-[lucide--trash-2] w-4 h-4"
                ></span>
              </button>
            </div>
          {/if}
        </div>
        {#if editingId !== template.id && expandedIds.has(template.id)}
          <StatSheetTemplatePreview {template} {order} />
        {/if}
      </div>
    {:else}
      <div
        class="text-center py-12 border border-dashed border-theme-border rounded"
      >
        <div
          class="icon-[lucide--list-checks] w-8 h-8 text-theme-text mx-auto mb-3"
          aria-hidden="true"
        ></div>
        <p class="text-xs text-theme-text uppercase font-mono tracking-widest">
          No vault templates saved yet
        </p>
        <p class="text-micro text-theme-text mt-2 max-w-sm mx-auto">
          Save a stat sheet layout as a template from an entity's Stats tab to
          see it here.
        </p>
      </div>
    {/each}
  </div>
</div>

{#if publishingTemplates.length > 0}
  <TemplatePublishModal
    templates={publishingTemplates}
    onClose={() => (publishingTemplates = [])}
    onPublished={() =>
      notificationStore.notify(
        "Template published to the community directory.",
        "success",
      )}
  />
{/if}
