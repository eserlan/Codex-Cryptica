<script lang="ts">
  import type { StatSheetTemplate } from "schema";
  import { categories } from "#lib/stores/categories.svelte.js";
  import { partitionTemplatesForCategory } from "@codex/stat-sheet-engine";

  let {
    templates,
    category,
    systemId = null,
    onApply,
  }: {
    templates: StatSheetTemplate[];
    category: string;
    systemId?: string | null;
    onApply: (templateId: string) => void;
  } = $props();

  // #3960: templates made for this entity's category are listed first, so a
  // Location or Faction is not buried under character sheets. Nothing is
  // hidden by category; the rest stay selectable below.
  const groups = $derived(
    partitionTemplatesForCategory<StatSheetTemplate>(
      templates,
      category,
      systemId,
    ),
  );
  const categoryLabel = $derived(
    categories.getCategory(category)?.label ?? category,
  );
  const grouped = $derived(groups.suggested.length > 0);
</script>

{#snippet option(template: StatSheetTemplate)}
  <button
    type="button"
    class="flex flex-col items-start gap-0.5 rounded border border-theme-border p-2 text-left hover:border-theme-primary"
    onclick={() => onApply(template.id)}
    data-testid="stat-sheet-template-option"
  >
    <span class="text-xs font-bold text-theme-text">{template.name}</span>
    {#if template.description}
      <span class="text-micro text-theme-muted">{template.description}</span>
    {/if}
  </button>
{/snippet}

{#if grouped}
  <h3
    class="text-micro font-bold uppercase tracking-wider text-theme-muted"
    data-testid="stat-sheet-suggested-heading"
  >
    Suggested for {categoryLabel}
  </h3>
  {#each groups.suggested as template (template.id)}
    {@render option(template)}
  {/each}
{/if}
{#if grouped && groups.other.length > 0}
  <h3
    class="mt-2 text-micro font-bold uppercase tracking-wider text-theme-muted"
    data-testid="stat-sheet-other-heading"
  >
    Other Templates
  </h3>
{/if}
{#each groups.other as template (template.id)}
  {@render option(template)}
{/each}
