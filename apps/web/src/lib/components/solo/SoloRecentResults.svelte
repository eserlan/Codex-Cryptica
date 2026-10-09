<script lang="ts">
  import { recentResults, type JournalEntry } from "session-journal-engine";
  import { sessionJournalStore } from "$lib/stores/session-journal.svelte";
  import { categories } from "$lib/stores/categories.svelte";
  import SoloMenu from "./SoloMenu.svelte";
  import SoloSaveResultDialog from "./SoloSaveResultDialog.svelte";

  let saving = $state<JournalEntry | null>(null);

  const journal = $derived(sessionJournalStore.current);
  const running = $derived(journal?.status === "active");
  const items = $derived(journal ? recentResults(journal.entries) : []);
  const categoryIds = $derived(categories.list.map((category) => category.id));

  const summary = (entry: JournalEntry) => entry.content.split("\n")[0].trim();
</script>

<SoloMenu
  label="Recent"
  testId="solo-recent-results"
  helpTarget="solo-recent-results"
>
  <div class="flex max-h-72 w-80 flex-col gap-2 overflow-y-auto">
    {#if !running}
      <p class="text-sm text-theme-muted">
        Results are kept only while a journal runs.
      </p>
      <button
        type="button"
        class="rounded-md border border-theme-primary/60 px-3 py-1.5 text-sm font-bold text-theme-primary hover:bg-theme-primary/10"
        onclick={() => void sessionJournalStore.start()}
      >
        Start or continue a journal
      </button>
    {:else if items.length === 0}
      <p class="text-sm text-theme-muted">Nothing captured yet.</p>
    {:else}
      <ul class="flex flex-col gap-1">
        {#each items as item (item.id)}
          <li
            class="flex items-center justify-between gap-2 rounded-md px-2 py-1 hover:bg-theme-primary/5"
          >
            <span
              class="min-w-0 truncate text-sm text-theme-text"
              title={item.content}>{summary(item)}</span
            >
            <button
              type="button"
              class="shrink-0 text-xs font-bold uppercase tracking-wider text-theme-primary"
              data-testid="solo-save-result"
              onclick={() => (saving = item)}
            >
              Save to Vault
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</SoloMenu>

{#if saving}
  <SoloSaveResultDialog
    entry={saving}
    categories={categoryIds}
    onclose={() => (saving = null)}
  />
{/if}
