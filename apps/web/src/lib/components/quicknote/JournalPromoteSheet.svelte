<script lang="ts">
  import {
    buildPromotion,
    type PromotionScope,
    type SessionJournal,
  } from "session-journal-engine";
  import { categories as categoryStore } from "$lib/stores/categories.svelte";

  /**
   * The small form in front of turning journal content into an entity
   * (#3402 slice 4, #3409): a type, a name, and a preview of the text. The
   * entity itself is created as a draft that the user then edits and approves
   * in the usual place, so this form does not edit the body (spec 163, FR-037).
   */
  let {
    journal,
    scope,
    categories = categoryStore.list,
    formatTime,
    onSubmit,
    onCancel,
  }: {
    journal: SessionJournal;
    scope: PromotionScope;
    categories?: Array<{ id: string; label: string }>;
    formatTime: (timestamp: number) => string;
    onSubmit: (
      type: string,
      title: string,
    ) => Promise<{ ok: true } | { ok: false; error: string }>;
    onCancel: () => void;
  } = $props();

  const PREVIEW_LIMIT = 600;

  const built = $derived(buildPromotion(journal, scope, { formatTime }));
  const defaultType = $derived(
    categories.some((c) => c.id === "note") ? "note" : categories[0]?.id,
  );

  // What the user typed, if anything; otherwise the suggestion. Keeping the
  // typed value apart avoids seeding state from props.
  let nameOverride = $state<string | undefined>(undefined);
  let typeOverride = $state<string | undefined>(undefined);
  const name = $derived(nameOverride ?? (built.ok ? built.title : ""));
  const type = $derived(typeOverride ?? defaultType ?? "");

  let isCreating = $state(false);
  let error = $state<string | null>(null);
  let nameInput = $state<HTMLInputElement | null>(null);

  const preview = $derived.by(() => {
    if (!built.ok) return "";
    return built.content.length > PREVIEW_LIMIT
      ? `${built.content.slice(0, PREVIEW_LIMIT)}…`
      : built.content;
  });

  $effect(() => {
    nameInput?.focus();
  });

  async function submit() {
    if (isCreating || !built.ok) return;
    if (!name.trim()) {
      error = "Please give it a name.";
      return;
    }
    isCreating = true;
    error = null;
    try {
      const result = await onSubmit(type, name.trim());
      if (!result.ok) error = result.error;
    } finally {
      isCreating = false;
    }
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      // Cancels the form only. Without this the app's own Escape shortcut also
      // closes the whole scratchpad.
      event.stopPropagation();
      onCancel();
    } else if (event.key === "Enter" && event.target === nameInput) {
      event.preventDefault();
      void submit();
    }
  }
</script>

<div
  role="group"
  aria-labelledby="journal-promote-heading"
  class="flex flex-col gap-3 rounded border border-theme-border bg-theme-bg/60 p-3"
  data-testid="journal-promote-sheet"
>
  <h3
    id="journal-promote-heading"
    class="font-header text-[10px] font-bold uppercase tracking-wider text-theme-primary"
  >
    Make entity
  </h3>

  {#if !built.ok}
    <p class="text-xs text-theme-muted" data-testid="promote-reason">
      {built.error}
    </p>
  {:else}
    <p class="text-[10px] text-theme-muted">
      {built.entryCount === 1 ? "1 entry" : `${built.entryCount} entries`} from this
      journal. The journal itself stays as it is.
    </p>
  {/if}

  <div class="flex flex-col gap-1">
    <label for="journal-promote-type" class="text-[10px] text-theme-muted"
      >Type</label
    >
    <select
      id="journal-promote-type"
      value={type}
      onchange={(e) => (typeOverride = e.currentTarget.value)}
      onkeydown={onKeydown}
      class="rounded border border-theme-border bg-theme-bg px-2 py-1.5 text-xs text-theme-text"
    >
      {#each categories as category (category.id)}
        <option value={category.id}>{category.label}</option>
      {/each}
    </select>
  </div>

  <div class="flex flex-col gap-1">
    <label for="journal-promote-name" class="text-[10px] text-theme-muted"
      >Name</label
    >
    <input
      id="journal-promote-name"
      type="text"
      value={name}
      bind:this={nameInput}
      oninput={(e) => (nameOverride = e.currentTarget.value)}
      onkeydown={onKeydown}
      class="rounded border border-theme-border bg-theme-bg px-2 py-1.5 text-xs text-theme-text focus:border-theme-primary focus:outline-none"
    />
  </div>

  {#if built.ok}
    <div class="flex flex-col gap-1">
      <span
        class="text-[10px] text-theme-muted"
        id="journal-promote-preview-label">Preview</span
      >
      <pre
        aria-labelledby="journal-promote-preview-label"
        class="max-h-32 overflow-auto whitespace-pre-wrap rounded border border-theme-border/40 bg-theme-bg p-2 font-body text-[11px] text-theme-text"
        data-testid="promote-preview">{preview}</pre>
    </div>
  {/if}

  {#if error}
    <p role="alert" class="text-xs text-theme-danger">{error}</p>
  {/if}

  <div class="flex justify-end gap-2">
    <button
      type="button"
      onclick={onCancel}
      class="rounded border border-theme-border px-3 py-1.5 font-header text-[10px] font-bold uppercase text-theme-muted transition-colors hover:text-theme-text"
    >
      Cancel
    </button>
    <button
      type="button"
      onclick={submit}
      disabled={isCreating || !built.ok}
      class="rounded bg-theme-primary px-3 py-1.5 font-header text-[10px] font-bold uppercase text-theme-bg transition-colors hover:bg-theme-secondary disabled:opacity-40"
    >
      Create draft
    </button>
  </div>
</div>
