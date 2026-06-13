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
  let summary = $state(draft.summary ?? "");
  let lore = $state(draft.lore ?? "");
  let labelsRaw = $state(draft.labels?.join(", ") ?? "");

  const disabled = $derived(saving);

  function handleSave(e: SubmitEvent) {
    e.preventDefault();
    onsave(
      {
        ...draft,
        title: title.trim(),
        entityType,
        summary: summary.trim(),
        lore: lore.trim(),
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
  <div class="flex flex-col gap-1">
    <label for="draft-title" class="text-surface-300 text-xs font-medium"
      >Title</label
    >
    <input
      id="draft-title"
      type="text"
      bind:value={title}
      required
      {disabled}
      class="bg-surface-700 border-surface-500 rounded-md border px-3 py-2 text-sm text-white"
    />
  </div>

  <div class="flex flex-col gap-1">
    <label for="draft-type" class="text-surface-300 text-xs font-medium"
      >Type</label
    >
    <select
      id="draft-type"
      bind:value={entityType}
      {disabled}
      class="bg-surface-700 border-surface-500 rounded-md border px-3 py-2 text-sm text-white"
    >
      {#each categories as cat (cat.id)}
        <option value={cat.id}>{cat.label}</option>
      {/each}
    </select>
  </div>

  <div class="flex flex-col gap-1">
    <label for="draft-summary" class="text-surface-300 text-xs font-medium"
      >Summary</label
    >
    <textarea
      id="draft-summary"
      bind:value={summary}
      rows={3}
      {disabled}
      class="bg-surface-700 border-surface-500 rounded-md border px-3 py-2 text-sm text-white"
    ></textarea>
  </div>

  <div class="flex flex-col gap-1">
    <label for="draft-lore" class="text-surface-300 text-xs font-medium"
      >Lore</label
    >
    <textarea
      id="draft-lore"
      bind:value={lore}
      rows={4}
      {disabled}
      class="bg-surface-700 border-surface-500 rounded-md border px-3 py-2 text-sm text-white"
    ></textarea>
  </div>

  <div class="flex flex-col gap-1">
    <label for="draft-labels" class="text-surface-300 text-xs font-medium"
      >Labels (comma-separated)</label
    >
    <input
      id="draft-labels"
      type="text"
      bind:value={labelsRaw}
      {disabled}
      class="bg-surface-700 border-surface-500 rounded-md border px-3 py-2 text-sm text-white"
    />
  </div>

  {#if showRelationshipToggle}
    <label class="flex cursor-pointer items-center gap-2 text-sm">
      <input type="checkbox" bind:checked={createRelationship} {disabled} />
      <span class="text-surface-200">Link to source entity</span>
    </label>
  {/if}

  <div class="flex gap-2">
    <button
      type="button"
      onclick={onback}
      {disabled}
      class="text-surface-300 hover:text-surface-100 flex-1 rounded-lg px-4 py-2 text-sm transition-colors"
    >
      Back
    </button>
    <button
      type="submit"
      disabled={saving}
      class="bg-primary-600 hover:bg-primary-500 disabled:bg-surface-600 flex-1 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
    >
      {saving ? "Saving…" : "Save to Campaign"}
    </button>
  </div>
</form>
