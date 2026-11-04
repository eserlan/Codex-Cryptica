<script lang="ts">
  import { statSheetTemplates } from "#lib/stores/stat-sheet-templates.svelte.js";
  import { categories } from "#lib/stores/categories.svelte.js";
  const handleDefaultChange = (categoryId: string, templateId: string) => {
    statSheetTemplates.setDefaultTemplate(categoryId, templateId || null);
  };
</script>

<div class="p-4 bg-theme-primary/5 border border-theme-primary/20 rounded-lg">
  <h4
    class="text-xs font-bold text-theme-primary uppercase font-header tracking-[0.2em] mb-4"
  >
    Default Template by Category
  </h4>

  <p class="text-micro text-theme-muted mb-4 leading-relaxed">
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
