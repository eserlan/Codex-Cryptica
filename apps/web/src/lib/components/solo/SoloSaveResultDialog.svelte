<script lang="ts">
  import type { JournalEntry } from "session-journal-engine";
  import { suggestCategory } from "solo-session-engine";
  import { soloPromoter } from "$lib/stores/solo-session-instance";
  import { sessionJournalStore } from "$lib/stores/session-journal.svelte";

  let {
    entry,
    categories,
    onclose,
  }: {
    entry: JournalEntry;
    categories: string[];
    onclose: () => void;
  } = $props();

  const NAME_LIMIT = 80;
  const generatorId = $derived(
    typeof entry.sourceRef?.generatorId === "string"
      ? entry.sourceRef.generatorId
      : null,
  );

  // The player's picks; until they change anything, the suggestions apply.
  let pickedCategory = $state<string | null>(null);
  let pickedName = $state<string | null>(null);
  const category = $derived(
    pickedCategory ?? suggestCategory(entry.type, generatorId, categories),
  );
  const name = $derived(
    pickedName ?? entry.content.split("\n")[0].trim().slice(0, NAME_LIMIT),
  );

  let busy = $state(false);
  let error = $state<string | null>(null);

  const formatTime = (timestamp: number) =>
    new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  async function save() {
    if (busy) return;
    const title = name.trim();
    if (!title) {
      error = "Please give it a name.";
      return;
    }
    const journal = sessionJournalStore.current;
    if (!journal) {
      error = "No journal is running.";
      return;
    }
    busy = true;
    error = null;
    try {
      const result = await soloPromoter.promote(
        journal,
        { kind: "entry", entryId: entry.id },
        { type: category, title, formatTime },
      );
      if (result.ok) onclose();
      else error = result.error;
    } finally {
      busy = false;
    }
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") onclose();
  }
</script>

<div
  class="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4"
  role="presentation"
>
  <div
    class="w-full max-w-md rounded-xl border border-theme-border bg-theme-surface p-5 shadow-2xl"
    role="dialog"
    aria-modal="true"
    aria-labelledby="solo-save-title"
    tabindex="-1"
    data-testid="solo-save-dialog"
    onkeydown={onKeydown}
  >
    <h2 id="solo-save-title" class="font-header text-lg text-theme-text">
      Save to Vault
    </h2>
    <p class="mt-1 text-sm text-theme-muted">
      Saves a draft linked to this journal entry. You stay where you are.
    </p>

    <label class="mt-4 block text-sm text-theme-text" for="solo-save-category"
      >Category</label
    >
    <select
      id="solo-save-category"
      class="mt-1 w-full rounded-md border border-theme-border bg-theme-bg px-3 py-2 text-sm text-theme-text"
      data-testid="solo-save-category"
      value={category}
      onchange={(event) => (pickedCategory = event.currentTarget.value)}
    >
      {#each categories as id (id)}
        <option value={id}>{id}</option>
      {/each}
    </select>

    <label class="mt-4 block text-sm text-theme-text" for="solo-save-name"
      >Name</label
    >
    <input
      id="solo-save-name"
      type="text"
      class="mt-1 w-full rounded-md border border-theme-border bg-theme-bg px-3 py-2 text-sm text-theme-text"
      data-testid="solo-save-name"
      value={name}
      oninput={(event) => (pickedName = event.currentTarget.value)}
    />

    {#if error}
      <p role="alert" class="mt-3 text-sm text-theme-danger">{error}</p>
    {/if}

    <div class="mt-5 flex justify-end gap-2">
      <button
        type="button"
        class="rounded-md px-3 py-2 text-sm text-theme-muted hover:text-theme-primary"
        data-testid="solo-save-cancel"
        onclick={onclose}
      >
        Cancel
      </button>
      <button
        type="button"
        class="rounded-md border border-theme-primary/60 px-3 py-2 text-sm font-bold text-theme-primary hover:bg-theme-primary/10 disabled:opacity-50"
        data-testid="solo-save-confirm"
        disabled={busy}
        onclick={save}
      >
        Save
      </button>
    </div>
  </div>
</div>
