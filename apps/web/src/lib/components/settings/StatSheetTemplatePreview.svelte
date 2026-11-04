<script lang="ts">
  import type { StatSheetTemplate } from "schema";
  import type { StatSheetTemplateFieldOrder } from "./stat-sheet-template-field-order.svelte.js";
  let {
    template,
    order,
  }: { template: StatSheetTemplate; order: StatSheetTemplateFieldOrder } =
    $props();
  const FIELD_TYPE_LABELS: Record<string, string> = {
    counter: "Counter",
    number: "Number",
    text: "Text",
    longtext: "Long Text",
    heading: "Section",
    dice: "Dice",
  };
</script>

{#snippet fieldBadge(field: StatSheetTemplate["fields"][number])}
  {#if field.type !== "heading"}
    <span
      class="rounded border border-theme-border px-1.5 py-0.5 text-nano font-bold uppercase tracking-wide text-theme-text"
    >
      {FIELD_TYPE_LABELS[field.type] ?? field.type}
      {#if field.type === "dice" && field.formula}
        · {field.formula}
      {:else if field.type === "counter" && (field.min !== undefined || field.max !== undefined)}
        · {field.min ?? 0}–{field.max ?? "∞"}
      {/if}
    </span>
  {/if}
{/snippet}

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<ul
  class="mt-2 space-y-1 border-t border-theme-border pt-2 outline-none"
  tabindex="0"
  onkeydown={(e) => order.handleTemplateContainerKeyDown(e, template)}
  data-testid="stat-sheet-template-preview"
>
  {#each template.fields as field, index (field.id)}
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <li
      class="flex items-center justify-between gap-2 rounded px-1.5 py-1 text-meta transition-colors {order.rowClass(
        template,
        index,
      )} {field.type === 'heading'
        ? 'mt-1 font-bold uppercase tracking-wide text-theme-text'
        : 'text-theme-text'}"
      draggable={!template.isBuiltIn}
      ondragstart={(e) => order.handleFieldDragStart(e, template.id, index)}
      ondragover={(e) => order.handleFieldDragOver(e, template.id, index)}
      ondragleave={() => (order.dragOverFieldKey = null)}
      ondrop={(e) => order.handleFieldDrop(e, template, index)}
      ondragend={() => order.handleFieldDragEnd()}
      onkeydown={(e) => order.handleTemplateFieldKeyDown(e, template, index)}
      onfocusin={() =>
        (order.selectedTemplateFieldKey = `${template.id}-${field.id}`)}
      onclick={() =>
        (order.selectedTemplateFieldKey = `${template.id}-${field.id}`)}
      data-template-field-id={`${template.id}-${field.id}`}
      data-selected={order.selectedTemplateFieldKey ===
      `${template.id}-${field.id}`
        ? "true"
        : "false"}
      data-testid="stat-sheet-template-field-item"
    >
      <div class="flex items-center gap-1.5 min-w-0">
        {#if !template.isBuiltIn}
          <button
            type="button"
            class="flex items-center cursor-grab active:cursor-grabbing text-theme-text hover:text-theme-primary p-0.5 shrink-0 rounded focus:outline-none focus:ring-1 focus:ring-theme-primary"
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
        {@render fieldBadge(field)}
        {#if !template.isBuiltIn}
          <div class="flex items-center gap-0.5">
            <button
              type="button"
              class="flex h-5 w-5 items-center justify-center rounded border border-theme-border text-theme-text hover:border-theme-primary hover:text-theme-primary disabled:opacity-30"
              onclick={() => order.moveTemplateField(template, index, -1)}
              disabled={index === 0}
              aria-label={`Move ${field.label} up`}
            >
              <span class="icon-[lucide--chevron-up] h-3 w-3" aria-hidden="true"
              ></span>
            </button>
            <button
              type="button"
              class="flex h-5 w-5 items-center justify-center rounded border border-theme-border text-theme-text hover:border-theme-primary hover:text-theme-primary disabled:opacity-30"
              onclick={() => order.moveTemplateField(template, index, 1)}
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
    <li class="text-micro text-theme-text">No fields.</li>
  {/each}
</ul>
