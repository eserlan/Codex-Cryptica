<script lang="ts">
  import { resolve } from "$app/paths";
  import type { StatSheetTemplate } from "schema";
  import {
    statSheetTemplates,
    BUILT_IN_STAT_SHEET_TEMPLATES,
  } from "$lib/stores/stat-sheet-templates.svelte";
  import { categories } from "$lib/stores/categories.svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";
  import { vaultRegistry } from "$lib/stores/vault-registry.svelte";
  import TemplatePublishModal from "$lib/components/stats/community-template/TemplatePublishModal.svelte";
  import PresentationTemplateManager from "$lib/components/stats/presentation/PresentationTemplateManager.svelte";

  const handleDefaultChange = (categoryId: string, templateId: string) => {
    statSheetTemplates.setDefaultTemplate(categoryId, templateId || null);
  };

  let editingId = $state<string | null>(null);
  let renameValue = $state("");
  let expandedIds = $state(new Set<string>());
  let activePresentationManagerSchema = $state<StatSheetTemplate | null>(null);
  let selectedPresentationSchemaId = $state<string>("");

  const selectedPresentationSchema = $derived(
    statSheetTemplates.availableTemplates.find(
      (t) => t.id === selectedPresentationSchemaId,
    ) ?? statSheetTemplates.availableTemplates[0],
  );

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

  const togglePreview = (id: string) => {
    const next = new Set(expandedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    expandedIds = next;
  };

  let draggedFieldKey = $state<string | null>(null);
  let dragOverFieldKey = $state<string | null>(null);
  let selectedTemplateFieldKey = $state<string | null>(null);
  let selectedPublishTemplateIds = $state<string[]>([]);
  let publishingTemplates = $state<StatSheetTemplate[]>([]);
  let savingBuiltInTemplateIds = $state<string[]>([]);
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

  function handleFieldDragStart(
    e: DragEvent,
    templateId: string,
    index: number,
  ) {
    draggedFieldKey = `${templateId}-${index}`;
    const fieldId = statSheetTemplates.allTemplates.find(
      (t) => t.id === templateId,
    )?.fields[index]?.id;
    if (fieldId) selectedTemplateFieldKey = `${templateId}-${fieldId}`;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", `${templateId}:${index}`);
    }
  }

  function handleFieldDragOver(
    e: DragEvent,
    templateId: string,
    index: number,
  ) {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "move";
    }
    const key = `${templateId}-${index}`;
    if (dragOverFieldKey !== key) {
      dragOverFieldKey = key;
    }
  }

  async function handleFieldDrop(
    e: DragEvent,
    template: StatSheetTemplate,
    targetIndex: number,
  ) {
    e.preventDefault();
    if (!draggedFieldKey || !draggedFieldKey.startsWith(`${template.id}-`)) {
      draggedFieldKey = null;
      dragOverFieldKey = null;
      return;
    }

    const sourceIndex = Number(draggedFieldKey.split("-").pop());
    if (isNaN(sourceIndex) || sourceIndex === targetIndex) {
      draggedFieldKey = null;
      dragOverFieldKey = null;
      return;
    }

    const nextFields = [...template.fields];
    const [moved] = nextFields.splice(sourceIndex, 1);
    nextFields.splice(targetIndex, 0, moved);

    draggedFieldKey = null;
    dragOverFieldKey = null;
    selectedTemplateFieldKey = `${template.id}-${moved.id}`;
    await statSheetTemplates.updateTemplateFields(template.id, nextFields);
  }

  function handleFieldDragEnd() {
    draggedFieldKey = null;
    dragOverFieldKey = null;
  }

  async function moveTemplateField(
    template: StatSheetTemplate,
    index: number,
    direction: -1 | 1,
  ) {
    const target = index + direction;
    if (target < 0 || target >= template.fields.length) return;
    const movedId = template.fields[index].id;
    selectedTemplateFieldKey = `${template.id}-${movedId}`;
    const nextFields = [...template.fields];
    [nextFields[index], nextFields[target]] = [
      nextFields[target],
      nextFields[index],
    ];
    await statSheetTemplates.updateTemplateFields(template.id, nextFields);

    requestAnimationFrame(() => {
      const handle = document.querySelector<HTMLElement>(
        `[data-template-field-id="${template.id}-${movedId}"] [data-testid="stat-sheet-template-drag-handle"]`,
      );
      handle?.focus();
    });
  }

  function handleTemplateFieldKeyDown(
    e: KeyboardEvent,
    template: StatSheetTemplate,
    index: number,
  ) {
    if ((e.altKey || e.ctrlKey) && e.key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();
      void moveTemplateField(template, index, -1);
    } else if ((e.altKey || e.ctrlKey) && e.key === "ArrowDown") {
      e.preventDefault();
      e.stopPropagation();
      void moveTemplateField(template, index, 1);
    }
  }

  function handleTemplateContainerKeyDown(
    e: KeyboardEvent,
    template: StatSheetTemplate,
  ) {
    if (
      (e.altKey || e.ctrlKey) &&
      (e.key === "ArrowUp" || e.key === "ArrowDown")
    ) {
      if (
        !selectedTemplateFieldKey ||
        !selectedTemplateFieldKey.startsWith(`${template.id}-`)
      )
        return;
      const fieldId = selectedTemplateFieldKey.slice(template.id.length + 1);
      const index = template.fields.findIndex((f) => f.id === fieldId);
      if (index === -1) return;
      e.preventDefault();
      e.stopPropagation();
      void moveTemplateField(template, index, e.key === "ArrowUp" ? -1 : 1);
    }
  }

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
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <ul
    class="mt-2 space-y-1 border-t border-theme-border pt-2 outline-none"
    tabindex="0"
    onkeydown={(e) => handleTemplateContainerKeyDown(e, template)}
    data-testid="stat-sheet-template-preview"
  >
    {#each template.fields as field, index (field.id)}
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <li
        class="flex items-center justify-between gap-2 rounded px-1.5 py-1 text-[11px] transition-colors {!template.isBuiltIn &&
        draggedFieldKey === `${template.id}-${index}`
          ? 'opacity-40 border-dashed border-theme-primary'
          : !template.isBuiltIn &&
              dragOverFieldKey === `${template.id}-${index}`
            ? 'border-theme-primary bg-theme-primary/10'
            : selectedTemplateFieldKey === `${template.id}-${field.id}`
              ? 'border-theme-primary bg-theme-primary/10 ring-2 ring-theme-primary/40'
              : ''} {field.type === 'heading'
          ? 'mt-1 font-bold uppercase tracking-wide text-theme-muted'
          : 'text-theme-text'}"
        draggable={!template.isBuiltIn}
        ondragstart={(e) => handleFieldDragStart(e, template.id, index)}
        ondragover={(e) => handleFieldDragOver(e, template.id, index)}
        ondragleave={() => (dragOverFieldKey = null)}
        ondrop={(e) => handleFieldDrop(e, template, index)}
        ondragend={handleFieldDragEnd}
        onkeydown={(e) => handleTemplateFieldKeyDown(e, template, index)}
        onfocusin={() =>
          (selectedTemplateFieldKey = `${template.id}-${field.id}`)}
        onclick={() =>
          (selectedTemplateFieldKey = `${template.id}-${field.id}`)}
        data-template-field-id={`${template.id}-${field.id}`}
        data-selected={selectedTemplateFieldKey === `${template.id}-${field.id}`
          ? "true"
          : "false"}
        data-testid="stat-sheet-template-field-item"
      >
        <div class="flex items-center gap-1.5 min-w-0">
          {#if !template.isBuiltIn}
            <button
              type="button"
              class="flex items-center cursor-grab active:cursor-grabbing text-theme-muted hover:text-theme-primary p-0.5 shrink-0 rounded focus:outline-none focus:ring-1 focus:ring-theme-primary"
              title="Drag or use Alt/Ctrl+Up/Down to reorder field"
              aria-label={`Drag or press Alt/Ctrl Up or Alt/Ctrl Down to reorder ${field.label}`}
              data-testid="stat-sheet-template-drag-handle"
            >
              <span
                class="icon-[lucide--grip-vertical] h-3.5 w-3.5"
                aria-hidden="true"
              ></span>
            </button>
          {/if}
          <span class="truncate">{field.label}</span>
        </div>

        <div class="flex items-center gap-1.5 shrink-0">
          {#if field.type !== "heading"}
            <span
              class="rounded border border-theme-border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-theme-muted"
            >
              {FIELD_TYPE_LABELS[field.type] ?? field.type}
              {#if field.type === "dice" && field.formula}
                · {field.formula}
              {:else if field.type === "counter" && (field.min !== undefined || field.max !== undefined)}
                · {field.min ?? 0}–{field.max ?? "∞"}
              {/if}
            </span>
          {/if}
          {#if !template.isBuiltIn}
            <div class="flex items-center gap-0.5">
              <button
                type="button"
                class="flex h-5 w-5 items-center justify-center rounded border border-theme-border text-theme-muted hover:border-theme-primary hover:text-theme-primary disabled:opacity-30"
                onclick={() => moveTemplateField(template, index, -1)}
                disabled={index === 0}
                aria-label={`Move ${field.label} up`}
              >
                <span
                  class="icon-[lucide--chevron-up] h-3 w-3"
                  aria-hidden="true"
                ></span>
              </button>
              <button
                type="button"
                class="flex h-5 w-5 items-center justify-center rounded border border-theme-border text-theme-muted hover:border-theme-primary hover:text-theme-primary disabled:opacity-30"
                onclick={() => moveTemplateField(template, index, 1)}
                disabled={index === template.fields.length - 1}
                aria-label={`Move ${field.label} down`}
              >
                <span
                  class="icon-[lucide--chevron-down] h-3 w-3"
                  aria-hidden="true"
                ></span>
              </button>
            </div>
          {/if}
        </div>
      </li>
    {:else}
      <li class="text-[10px] text-theme-muted">No fields.</li>
    {/each}
  </ul>
{/snippet}

<div class="space-y-6">
  <div class="p-4 bg-theme-primary/5 border border-theme-primary/20 rounded-lg">
    <div class="mb-4">
      <div>
        <h4
          class="text-xs font-bold text-theme-primary uppercase font-header tracking-[0.2em]"
        >
          Applicable Templates for Vault ({vaultRegistry.vaultName})
        </h4>
        <p class="text-[10px] text-theme-muted mt-1 leading-relaxed">
          Select which stat sheet templates apply to this campaign/vault.
          Disabled templates will be hidden from entity template pickers.
        </p>
      </div>
    </div>
  </div>

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
            {#each statSheetTemplates.availableTemplates as template (template.id)}
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
            </button>
            <button
              type="button"
              class="flex items-center gap-1.5 rounded border px-2 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors shrink-0 {statSheetTemplates.isTemplateEnabled(
                template.id,
              )
                ? 'border-theme-primary/40 bg-theme-primary/10 text-theme-primary'
                : 'border-theme-border bg-theme-bg text-theme-muted hover:text-theme-text'}"
              onclick={(e) => {
                e.stopPropagation();
                statSheetTemplates.toggleTemplateEnabled(template.id);
              }}
              data-testid="stat-sheet-toggle-enabled"
              title={statSheetTemplates.isTemplateEnabled(template.id)
                ? "Disable for this Vault"
                : "Enable for this Vault"}
            >
              <span
                class="icon-[lucide--check] h-3 w-3 {statSheetTemplates.isTemplateEnabled(
                  template.id,
                )
                  ? 'opacity-100'
                  : 'opacity-0'}"
                aria-hidden="true"
              ></span>
              {statSheetTemplates.isTemplateEnabled(template.id)
                ? "Applicable"
                : "Hidden"}
            </button>
            <button
              type="button"
              class="inline-flex items-center gap-1.5 rounded border border-theme-primary/40 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-theme-primary transition-colors hover:border-theme-primary hover:bg-theme-primary/10"
              onclick={() => saveBuiltInAsVaultTemplate(template)}
              title="Save an editable vault copy of this template"
              aria-label="Save a vault copy of {template.name} template"
              aria-busy={isSavingVaultCopy}
              disabled={isSavingVaultCopy}
              data-testid="save-builtin-stat-sheet-template-copy"
            >
              <span
                class="icon-[lucide--copy-plus] h-3.5 w-3.5"
                aria-hidden="true"
              ></span>
              {isSavingVaultCopy ? "Saving copy..." : "Save copy to Vault"}
            </button>
          </div>
          {#if expandedIds.has(template.id)}
            {@render fieldPreview(template)}
          {/if}
        </div>
      {/each}
    </div>
  </div>

  <div class="p-4 bg-theme-primary/5 border border-theme-primary/20 rounded-lg">
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h4
        class="text-xs font-bold text-theme-primary uppercase font-header tracking-[0.2em]"
      >
        Vault Templates
      </h4>
      <a
        href={resolve("/templates")}
        class="inline-flex items-center gap-1.5 rounded border border-theme-primary/40 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-theme-primary transition-colors hover:border-theme-primary hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary"
        data-testid="browse-community-stat-sheet-templates"
      >
        <span class="icon-[lucide--users-round] h-3.5 w-3.5" aria-hidden="true"
        ></span>
        Browse community templates
      </a>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded bg-theme-primary px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-theme-bg transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={selectedPublishCount === 0}
        onclick={openPublishSelection}
        data-testid="publish-selected-stat-sheet-templates"
      >
        <span class="icon-[lucide--upload] h-3.5 w-3.5" aria-hidden="true"
        ></span>
        Publish selected{selectedPublishCount
          ? ` (${selectedPublishCount})`
          : ""}
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
              class="flex shrink-0 items-center gap-2 text-xs text-theme-muted"
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

            <button
              type="button"
              class="flex items-center gap-1.5 rounded border px-2 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors shrink-0 {statSheetTemplates.isTemplateEnabled(
                template.id,
              )
                ? 'border-theme-primary/40 bg-theme-primary/10 text-theme-primary'
                : 'border-theme-border bg-theme-bg text-theme-muted hover:text-theme-text'}"
              onclick={(e) => {
                e.stopPropagation();
                statSheetTemplates.toggleTemplateEnabled(template.id);
              }}
              data-testid="stat-sheet-toggle-enabled"
              title={statSheetTemplates.isTemplateEnabled(template.id)
                ? "Disable for this Vault"
                : "Enable for this Vault"}
            >
              <span
                class="icon-[lucide--check] h-3 w-3 {statSheetTemplates.isTemplateEnabled(
                  template.id,
                )
                  ? 'opacity-100'
                  : 'opacity-0'}"
                aria-hidden="true"
              ></span>
              {statSheetTemplates.isTemplateEnabled(template.id)
                ? "Applicable"
                : "Hidden"}
            </button>

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

  <div class="p-4 bg-theme-primary/5 border border-theme-primary/20 rounded-lg">
    <div class="flex items-center justify-between gap-3 mb-2">
      <div>
        <h4
          class="text-xs font-bold text-theme-primary uppercase font-header tracking-[0.2em]"
        >
          Presentation Layout Templates
        </h4>
        <p class="text-[10px] text-theme-muted mt-1 leading-relaxed">
          Custom card, grid, and table layouts for stat sheets. Manage
          presentation templates per stat sheet schema.
        </p>
      </div>
      {#if selectedPresentationSchema}
        <button
          type="button"
          class="rounded bg-theme-primary px-3 py-1 text-xs font-bold uppercase tracking-wide text-theme-bg hover:opacity-90 shrink-0"
          onclick={() =>
            (activePresentationManagerSchema = selectedPresentationSchema)}
          data-testid="settings-manage-presentations-btn"
        >
          Manage Layouts
        </button>
      {/if}
    </div>
    <div
      class="flex items-center gap-3 p-3 bg-theme-surface border border-theme-border rounded"
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
  </div>
</div>

{#if activePresentationManagerSchema}
  <PresentationTemplateManager
    schema={activePresentationManagerSchema}
    onClose={() => (activePresentationManagerSchema = null)}
  />
{/if}

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
