<script lang="ts">
  import type { GeneratedDraft } from "generator-engine";
  import type { Category } from "schema";

  interface Props {
    draft: GeneratedDraft;
    categories: Category[];
    saving: boolean;
    onsave: (draft: GeneratedDraft, createRelationship: boolean) => void;
    onback: () => void;
    /** When true, show the relationship creation toggle (contextual launch). */
    showRelationshipToggle?: boolean;
  }

  let {
    draft = $bindable(),
    categories,
    saving,
    onsave,
    onback,
    showRelationshipToggle = false,
  }: Props = $props();

  let createRelationship = $state(false);
  $effect(() => {
    createRelationship = showRelationshipToggle;
  });

  let title = $state(draft.title);
  let entityType = $state(draft.entityType);
  let labelsRaw = $state(draft.labels?.join(", ") ?? "");

  const disabled = $derived(saving);

  function handleSave(e: SubmitEvent) {
    e.preventDefault();
    onsave(
      {
        ...draft,
        title: title.trim(),
        entityType,
        labels: labelsRaw
          .split(",")
          .map((l) => l.trim())
          .filter(Boolean),
      },
      createRelationship,
    );
  }
</script>

<form onsubmit={handleSave} class="flex flex-col gap-4">
  <p class="text-xs text-chrome-muted">
    Review the title and type, then open in the editor to read and accept the
    generated content.
  </p>

  <div class="flex flex-col gap-1">
    <label
      for="draft-title"
      class="text-[10px] font-bold uppercase tracking-wider text-chrome-muted"
    >
      Title
    </label>
    <input
      id="draft-title"
      type="text"
      bind:value={title}
      required
      {disabled}
      class="w-full rounded border border-chrome-border bg-chrome-bg/50 px-3 py-2 text-sm text-chrome-text outline-none transition focus:border-chrome-accent focus:ring-1 focus:ring-chrome-accent disabled:opacity-50"
    />
  </div>

  <div class="flex flex-col gap-1">
    <label
      for="draft-type"
      class="text-[10px] font-bold uppercase tracking-wider text-chrome-muted"
    >
      Type
    </label>
    <select
      id="draft-type"
      bind:value={entityType}
      {disabled}
      class="w-full rounded border border-chrome-border bg-chrome-bg/50 px-3 py-2 text-sm text-chrome-text outline-none transition focus:border-chrome-accent focus:ring-1 focus:ring-chrome-accent disabled:opacity-50"
    >
      {#each categories as cat (cat.id)}
        <option value={cat.id}>{cat.label}</option>
      {/each}
    </select>
  </div>

  <div class="flex flex-col gap-1">
    <label
      for="draft-labels"
      class="text-[10px] font-bold uppercase tracking-wider text-chrome-muted"
    >
      Labels
    </label>
    <input
      id="draft-labels"
      type="text"
      bind:value={labelsRaw}
      placeholder="comma-separated"
      {disabled}
      class="w-full rounded border border-chrome-border bg-chrome-bg/50 px-3 py-2 text-sm text-chrome-text outline-none transition focus:border-chrome-accent focus:ring-1 focus:ring-chrome-accent disabled:opacity-50"
    />
  </div>

  {#if showRelationshipToggle}
    <label class="flex cursor-pointer items-center gap-2">
      <input
        type="checkbox"
        bind:checked={createRelationship}
        {disabled}
        class="accent-chrome-accent"
      />
      <span class="text-sm text-chrome-text">Link to source entity</span>
    </label>
  {/if}

  <div class="flex justify-between gap-2 border-t border-chrome-border pt-4">
    <button
      type="button"
      onclick={onback}
      {disabled}
      class="px-4 py-2 border border-chrome-border rounded-lg text-xs font-bold uppercase tracking-wider text-chrome-muted hover:text-chrome-text hover:border-chrome-accent transition-colors disabled:opacity-50"
    >
      Back
    </button>
    <button
      type="submit"
      disabled={saving}
      class="px-5 py-2 bg-chrome-accent text-chrome-surface font-bold uppercase tracking-wider text-xs rounded-lg hover:brightness-110 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
    >
      {saving ? "Opening…" : "Open in Editor"}
    </button>
  </div>
</form>
