<script lang="ts">
  import type { StatSheetTemplate, StatSheetField } from "schema";
  import { fieldReference } from "./editor-source";
  let {
    schema,
    active,
    onInsert,
    onGenerate,
  }: {
    schema: StatSheetTemplate;
    active: boolean;
    onInsert: (snippet: string, cursorOffset?: number) => void;
    onGenerate: () => void;
  } = $props();
  let showAutocomplete = $state(false);
  let autocompleteFilter = $state("");
  const snippets = [
    {
      label: "+ Card",
      title: "Insert Card Container",
      source: ":::card\n\n:::",
      offset: 9,
    },
    {
      label: "+ 2-Col",
      title: "Insert 2 Column Grid",
      source: ":::stat-group columns=2\n\n:::",
      offset: 24,
    },
    {
      label: "+ 3-Col",
      title: "Insert 3 Column Grid",
      source: ":::stat-group columns=3\n\n:::",
      offset: 24,
    },
    {
      label: "+ Row",
      title: "Insert Row Container",
      source: ":::row\n\n:::",
      offset: 8,
    },
    {
      label: "+ Table",
      title: "Insert Markdown Table",
      source: "| Header 1 | Header 2 |\n| --- | --- |\n| Cell 1 | Cell 2 |",
      offset: 0,
    },
  ];
  const filteredFields = $derived(
    schema.fields.filter(
      (f) =>
        f.id.toLowerCase().includes(autocompleteFilter.toLowerCase()) ||
        (f.key?.toLowerCase().includes(autocompleteFilter.toLowerCase()) ??
          false) ||
        f.label.toLowerCase().includes(autocompleteFilter.toLowerCase()),
    ),
  );

  function insertFieldReference(field: StatSheetField) {
    onInsert(`{{stat.${fieldReference(field)}}}`);
    showAutocomplete = false;
    autocompleteFilter = "";
  }
</script>

{#if active}
  <div class="flex flex-wrap items-center gap-1">
    <button
      type="button"
      class="rounded border border-theme-border px-1.5 py-0.5 text-micro font-medium text-theme-muted hover:border-theme-primary hover:text-theme-primary"
      onclick={onGenerate}
      title="Generate starter layout from schema fields"
      data-testid="presentation-editor-auto-layout"
    >
      ⚡ Auto Layout
    </button>
    {#each snippets as snippet (snippet.title)}
      <button
        type="button"
        class="rounded border border-theme-border px-1.5 py-0.5 text-micro font-medium text-theme-muted hover:border-theme-primary hover:text-theme-primary"
        onclick={() => onInsert(snippet.source, snippet.offset)}
        title={snippet.title}
      >
        {snippet.label}
      </button>
    {/each}
    <div class="relative">
      <button
        type="button"
        class="rounded border border-theme-border px-2 py-0.5 text-micro font-bold uppercase tracking-wide text-theme-muted hover:border-theme-primary hover:text-theme-primary"
        onclick={() => (showAutocomplete = !showAutocomplete)}
        data-testid="presentation-editor-insert-field"
      >
        Insert Field
      </button>
      {#if showAutocomplete}
        <div
          class="absolute right-0 z-10 mt-1 w-56 rounded border border-theme-border bg-theme-surface p-2 shadow-xl"
          data-testid="presentation-editor-autocomplete"
        >
          <input
            class="mb-1 w-full rounded border border-theme-border bg-theme-bg px-2 py-1 text-xs text-theme-text"
            placeholder="Filter fields..."
            bind:value={autocompleteFilter}
            data-testid="presentation-editor-autocomplete-filter"
          />
          <ul class="max-h-40 overflow-y-auto">
            {#each filteredFields as field (field.id)}
              <li>
                <button
                  type="button"
                  class="w-full rounded px-2 py-1 text-left text-xs text-theme-text hover:bg-theme-primary/10"
                  onclick={() => insertFieldReference(field)}
                  data-testid="presentation-editor-autocomplete-option"
                >
                  {field.label}
                  <span class="text-theme-muted">({fieldReference(field)})</span
                  >
                </button>
              </li>
            {/each}
          </ul>
        </div>
      {/if}
    </div>
  </div>
{/if}
