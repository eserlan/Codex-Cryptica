<script lang="ts">
  import type { StatSheetTemplate } from "schema";
  import {
    statSheetTemplates,
    BUILT_IN_STAT_SHEET_TEMPLATES,
  } from "$lib/stores/stat-sheet-templates.svelte";
  import { categories } from "$lib/stores/categories.svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";

  const handleDefaultChange = (categoryId: string, templateId: string) => {
    statSheetTemplates.setDefaultTemplate(categoryId, templateId || null);
  };

  let editingId = $state<string | null>(null);
  let renameValue = $state("");
  let expandedIds = $state(new Set<string>());

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

  const togglePreview = (id: string) => {
    const next = new Set(expandedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    expandedIds = next;
  };

  const FIELD_TYPE_LABELS: Record<string, string> = {
    counter: "Counter",
    number: "Number",
    text: "Text",
    longtext: "Long Text",
    heading: "Section",
    dice: "Dice",
  };
</script>

{#snippet fieldPreview(template: StatSheetTemplate)}
  <ul
    class="mt-2 space-y-1 border-t border-theme-border pt-2"
    data-testid="stat-sheet-template-preview"
  >
    {#each template.fields as field (field.id)}
      <li
        class="flex items-center justify-between gap-2 text-[11px] {field.type ===
        'heading'
          ? 'mt-1 font-bold uppercase tracking-wide text-theme-muted'
          : 'pl-3 text-theme-text'}"
      >
        <span class="truncate">{field.label}</span>
        {#if field.type !== "heading"}
          <span
            class="shrink-0 rounded border border-theme-border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-theme-muted"
          >
            {FIELD_TYPE_LABELS[field.type] ?? field.type}
            {#if field.type === "dice" && field.formula}
              · {field.formula}
            {:else if field.type === "counter" && (field.min !== undefined || field.max !== undefined)}
              · {field.min ?? 0}–{field.max ?? "∞"}
            {/if}
          </span>
        {/if}
      </li>
    {:else}
      <li class="text-[10px] text-theme-muted">No fields.</li>
    {/each}
  </ul>
{/snippet}

<div class="space-y-6">
  <div class="p-4 bg-theme-primary/5 border border-theme-primary/20 rounded-lg">
    <h4
      class="text-xs font-bold text-theme-primary uppercase font-header tracking-[0.2em] mb-4"
    >
      Default Template by Category
    </h4>
    <p class="text-[10px] text-theme-muted mb-4 leading-relaxed">
      When set, new entities of that category automatically start with this
      template's fields already applied. Leave as "None" for categories that
      shouldn't get stats by default.
    </p>
    <div class="space-y-2">
      {#each categories.list as category (category.id)}
        <div
          class="flex items-center justify-between gap-3 p-3 bg-theme-surface border border-theme-border rounded"
          data-testid="stat-sheet-category-default-row"
        >
          <span class="text-xs font-bold text-theme-text truncate"
            >{category.label}</span
          >
          <select
            class="rounded border border-theme-border bg-theme-bg px-2 py-1 text-xs text-theme-text max-w-[55%]"
            aria-label="Default stat sheet template for {category.label}"
            value={statSheetTemplates.categoryDefaults[category.id] ?? ""}
            onchange={(e) =>
              handleDefaultChange(
                category.id,
                (e.target as HTMLSelectElement).value,
              )}
          >
            <option value="">None</option>
            {#each statSheetTemplates.allTemplates as template (template.id)}
              <option value={template.id}>{template.name}</option>
            {/each}
          </select>
        </div>
      {/each}
    </div>
  </div>

  <div class="p-4 bg-theme-primary/5 border border-theme-primary/20 rounded-lg">
    <h4
      class="text-xs font-bold text-theme-primary uppercase font-header tracking-[0.2em] mb-4"
    >
      Built-In Templates
    </h4>
    <div class="space-y-2">
      {#each BUILT_IN_STAT_SHEET_TEMPLATES as template (template.id)}
        <div
          class="p-3 bg-theme-surface border border-theme-border rounded"
          data-testid="stat-sheet-builtin-row"
        >
          <button
            type="button"
            class="flex w-full items-center justify-between gap-3 text-left"
            onclick={() => togglePreview(template.id)}
            aria-expanded={expandedIds.has(template.id)}
            aria-label="Toggle preview of {template.name} template"
          >
            <div class="flex items-center gap-3 min-w-0">
              <span
                class="icon-[lucide--chevron-right] text-theme-muted w-3 h-3 shrink-0 transition-transform {expandedIds.has(
                  template.id,
                )
                  ? 'rotate-90'
                  : ''}"
              ></span>
              <span
                class="icon-[lucide--list-checks] text-theme-secondary w-3.5 h-3.5 shrink-0"
              ></span>
              <div class="min-w-0">
                <span class="text-xs font-bold text-theme-text truncate block"
                  >{template.name}</span
                >
                {#if template.description}
                  <span class="text-[10px] text-theme-muted truncate block"
                    >{template.description}</span
                  >
                {/if}
              </div>
            </div>
            <span
              class="text-[9px] font-bold uppercase tracking-widest text-theme-muted shrink-0"
            >
              Built-in
            </span>
          </button>
          {#if expandedIds.has(template.id)}
            {@render fieldPreview(template)}
          {/if}
        </div>
      {/each}
    </div>
  </div>

  <div class="p-4 bg-theme-primary/5 border border-theme-primary/20 rounded-lg">
    <h4
      class="text-xs font-bold text-theme-primary uppercase font-header tracking-[0.2em] mb-4"
    >
      Vault Templates
    </h4>

    <div class="space-y-2">
      {#each statSheetTemplates.templates as template (template.id)}
        <div
          class="p-3 bg-theme-surface border border-theme-border rounded group transition-all hover:border-theme-primary/30"
          data-testid="stat-sheet-template-settings-row"
        >
          <div class="flex items-center justify-between gap-3">
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
                    class="px-3 py-1 bg-theme-primary text-theme-bg text-[11px] font-bold rounded uppercase font-header transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onclick={() => (editingId = null)}
                    class="px-3 py-1 border border-theme-border text-theme-muted text-[11px] font-bold rounded uppercase font-header hover:text-theme-text transition-colors"
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
                  ></span>
                  <span
                    class="icon-[lucide--list-checks] text-theme-secondary w-3.5 h-3.5"
                  ></span>
                  <span class="text-xs font-bold text-theme-text truncate"
                    >{template.name}</span
                  >
                </button>
              {/if}
            </div>

            {#if editingId !== template.id}
              <div
                class="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity"
              >
                <button
                  type="button"
                  onclick={() => startRename(template.id, template.name)}
                  class="p-2 text-theme-muted hover:text-theme-primary transition-colors"
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
                  <span
                    aria-hidden="true"
                    class="icon-[lucide--trash-2] w-4 h-4"
                  ></span>
                </button>
              </div>
            {/if}
          </div>
          {#if editingId !== template.id && expandedIds.has(template.id)}
            {@render fieldPreview(template)}
          {/if}
        </div>
      {:else}
        <div
          class="text-center py-12 border border-dashed border-theme-border rounded"
        >
          <div
            class="icon-[lucide--list-checks] w-8 h-8 text-theme-muted/20 mx-auto mb-3"
          ></div>
          <p
            class="text-xs text-theme-muted uppercase font-mono tracking-widest"
          >
            No vault templates saved yet
          </p>
          <p class="text-[10px] text-theme-muted/70 mt-2 max-w-sm mx-auto">
            Save a stat sheet layout as a template from an entity's Stats tab to
            see it here.
          </p>
        </div>
      {/each}
    </div>
  </div>
</div>
