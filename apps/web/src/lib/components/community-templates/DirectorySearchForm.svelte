<script lang="ts">
  import type { Snippet } from "svelte";

  /** The search box, extra filters and Search button shared by the template lists. */
  let {
    searchId,
    placeholder,
    query = $bindable(""),
    onSubmit,
    filters,
    actions,
  }: {
    searchId: string;
    placeholder: string;
    query: string;
    onSubmit: () => void;
    /** Extra filters, between the search box and the Search button. */
    filters?: Snippet;
    /** Extra buttons after the Search button. */
    actions?: Snippet;
  } = $props();
</script>

<form
  class="flex flex-wrap gap-2"
  onsubmit={(event) => {
    event.preventDefault();
    onSubmit();
  }}
>
  <label class="sr-only" for={searchId}>Search templates</label>
  <input
    id={searchId}
    bind:value={query}
    {placeholder}
    class="min-w-64 flex-1 rounded-lg border border-theme-border bg-theme-surface px-3 py-2 text-sm text-theme-text"
  />
  {@render filters?.()}
  <button
    type="submit"
    class="rounded-lg bg-theme-primary px-4 py-2 text-sm font-bold text-theme-bg"
    >Search</button
  >
  {@render actions?.()}
</form>
