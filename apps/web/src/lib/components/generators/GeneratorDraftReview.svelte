<script lang="ts">
  import type { GeneratedDraft } from "generator-engine";
  import type { Category } from "schema";
  import { getDelveLocationTypeLabel } from "$lib/utils/delve-terminology";
  import { renderMarkdown } from "$lib/utils/markdown";

  interface Props {
    draft: GeneratedDraft;
    categories: Category[];
    saving: boolean;
    onsave: (draft: GeneratedDraft, createRelationship: boolean) => void;
    onback: () => void;
    /** When true, show the relationship creation toggle (contextual launch). */
    showRelationshipToggle?: boolean;
    themeId?: string;
    /** Label for the back button — "Customize" when the draft was generated
     * immediately from a Guided Mode intent (#1909, FR-010). */
    backLabel?: string;
    /** Open Plot Twist seeded from a quest-hook draft. */
    onGeneratePlotTwist?: () => void;
  }

  let {
    draft = $bindable(),
    categories,
    saving,
    onsave,
    onback,
    showRelationshipToggle = false,
    themeId = "workspace",
    backLabel = "Back",
    onGeneratePlotTwist,
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
    Review the draft below, then open in the editor to accept or discard.
  </p>

  {#if draft.primaryLanguageTitle}
    <div
      class="flex items-center gap-2 rounded border border-chrome-border bg-chrome-bg/30 px-3 py-2 text-xs text-chrome-text"
      data-testid="primary-language-context"
    >
      <span
        aria-hidden="true"
        class="icon-[lucide--languages] h-4 w-4 text-chrome-accent"
      ></span>
      <span class="text-chrome-muted">Naming language:</span>
      <strong>{draft.primaryLanguageTitle}</strong>
    </div>
  {/if}

  {#if draft.contextProvenance?.length}
    <div
      class="flex items-center gap-2 rounded border border-chrome-border bg-chrome-bg/30 px-3 py-2 text-xs text-chrome-text"
      data-testid="in-vault-provenance"
    >
      <span
        aria-hidden="true"
        class="icon-[lucide--zap] h-4 w-4 text-chrome-accent shrink-0"
      ></span>
      <span class="text-chrome-muted">Used context:</span>
      <div class="flex flex-wrap items-center gap-1.5 font-medium">
        {#each draft.contextProvenance as item, i (item.id)}
          <span class="text-chrome-text"
            >{item.title}{#if i < draft.contextProvenance.length - 1}<span
                class="text-chrome-muted font-normal">,</span
              >{/if}</span
          >
        {/each}
      </div>
    </div>
  {/if}

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
        <option value={cat.id}>
          {draft.sourceGeneratorId === "dungeon" && cat.id === "location"
            ? getDelveLocationTypeLabel(themeId)
            : cat.label}
        </option>
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

  {#if draft.summary}
    <div class="flex flex-col gap-1">
      <span
        class="text-[10px] font-bold uppercase tracking-wider text-chrome-muted"
      >
        Summary
      </span>
      <div
        class="draft-preview max-h-32 overflow-y-auto rounded border border-chrome-border bg-chrome-bg/30 px-3 py-2"
      >
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        {@html renderMarkdown(draft.summary)}
      </div>
    </div>
  {/if}

  {#if draft.content}
    <div class="flex flex-col gap-1">
      <span
        class="text-[10px] font-bold uppercase tracking-wider text-chrome-muted"
      >
        Content
      </span>
      <div
        class="draft-preview min-h-48 max-h-80 overflow-y-auto rounded border border-chrome-border bg-chrome-bg/30 px-3 py-2"
      >
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        {@html renderMarkdown(draft.content)}
      </div>
    </div>
  {/if}

  {#if draft.lore}
    <div class="flex flex-col gap-1">
      <span
        class="text-[10px] font-bold uppercase tracking-wider text-chrome-muted"
      >
        GM Reference
      </span>
      <div
        class="draft-preview min-h-48 max-h-64 overflow-y-auto rounded border border-chrome-border bg-chrome-bg/30 px-3 py-2"
      >
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        {@html renderMarkdown(draft.lore)}
      </div>
    </div>
  {/if}

  {#if draft.connections?.length}
    <div class="flex flex-col gap-1">
      <span
        class="text-[10px] font-bold uppercase tracking-wider text-chrome-muted"
      >
        Suggested Connections
      </span>
      <ul class="flex flex-col gap-1">
        {#each draft.connections as conn (conn.targetTitle + conn.relationship)}
          <li class="flex items-center gap-2 text-xs text-chrome-text">
            <span class="icon-[lucide--link] h-3 w-3 text-chrome-muted"></span>
            <span class="text-chrome-muted">{conn.relationship}</span>
            <span class="font-medium">{conn.targetTitle}</span>
          </li>
        {/each}
      </ul>
      <p class="text-[10px] text-chrome-muted">
        Links to entities that already exist will be created on save.
      </p>
    </div>
  {/if}

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

  <div
    class="flex flex-wrap justify-between gap-2 border-t border-chrome-border pt-4"
  >
    <button
      type="button"
      onclick={onback}
      {disabled}
      class="px-4 py-2 border border-chrome-border rounded-lg text-xs font-bold uppercase tracking-wider text-chrome-muted hover:text-chrome-text hover:border-chrome-accent transition-colors disabled:opacity-50"
    >
      {backLabel}
    </button>
    <div class="flex flex-wrap justify-end gap-2">
      {#if onGeneratePlotTwist}
        <button
          type="button"
          onclick={onGeneratePlotTwist}
          disabled={saving}
          class="inline-flex items-center gap-2 rounded-lg border border-chrome-accent/60 px-4 py-2 text-xs font-bold uppercase tracking-wider text-chrome-accent transition-colors hover:bg-chrome-accent/10 disabled:pointer-events-none disabled:opacity-50"
          data-testid="generate-plot-twist-from-quest"
        >
          <span aria-hidden="true" class="icon-[lucide--shuffle] h-3.5 w-3.5"
          ></span>
          Generate Plot Twist
        </button>
      {/if}
      <button
        type="submit"
        disabled={saving}
        class="rounded-lg bg-chrome-accent px-5 py-2 text-xs font-bold uppercase tracking-wider text-chrome-surface transition-all hover:brightness-110 active:scale-95 disabled:pointer-events-none disabled:opacity-50"
      >
        {saving ? "Opening…" : "Open in Editor"}
      </button>
    </div>
  </div>
</form>

<style>
  .draft-preview :global(h1),
  .draft-preview :global(h2),
  .draft-preview :global(h3) {
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-chrome-accent, #e6b450);
    margin-top: 0.75rem;
    margin-bottom: 0.25rem;
  }
  .draft-preview :global(h1:first-child),
  .draft-preview :global(h2:first-child),
  .draft-preview :global(h3:first-child) {
    margin-top: 0;
  }
  .draft-preview :global(p) {
    font-size: 0.8125rem;
    color: var(--color-chrome-text, #e2e8f0);
    line-height: 1.6;
    margin-bottom: 0.5rem;
  }
  .draft-preview :global(strong) {
    font-weight: 600;
    color: var(--color-chrome-text, #e2e8f0);
  }
  .draft-preview :global(ul),
  .draft-preview :global(ol) {
    padding-left: 1.25rem;
    margin-bottom: 0.5rem;
    font-size: 0.8125rem;
    color: var(--color-chrome-text, #e2e8f0);
  }
  .draft-preview :global(li) {
    margin-bottom: 0.15rem;
    line-height: 1.5;
  }
  .draft-preview :global(em) {
    font-style: italic;
    opacity: 0.85;
  }
</style>
