<script lang="ts">
  import type { GeneratedDraft } from "generator-engine";
  import { renderMarkdown } from "$lib/utils/markdown";

  /**
   * The read-only body of a generator draft: summary, content and GM
   * reference. With `spoilerShield` (solo play) the content and GM reference
   * stay hidden until the player reveals them, so the person who will play
   * the adventure isn't handed its plot.
   */
  let {
    draft,
    spoilerShield = false,
  }: { draft: GeneratedDraft; spoilerShield?: boolean } = $props();

  let revealed = $state(false);
  const hideSpoilers = $derived(spoilerShield && !revealed);

  const sections = $derived(
    [
      { label: "Summary", markdown: draft.summary, height: "max-h-32" },
      {
        label: "Content",
        markdown: draft.content,
        height: "min-h-48 max-h-80",
      },
      {
        label: "GM Reference",
        markdown: draft.lore,
        height: "min-h-48 max-h-64",
      },
    ].filter(
      (section) =>
        section.markdown && (section.label === "Summary" || !hideSpoilers),
    ),
  );
</script>

{#each sections as section (section.label)}
  <div class="flex flex-col gap-1">
    <span
      class="text-micro font-bold uppercase tracking-wider text-chrome-muted"
    >
      {section.label}
    </span>
    <div
      class={`draft-preview ${section.height} overflow-y-auto rounded border border-chrome-border bg-chrome-bg/30 px-3 py-2`}
    >
      <!-- eslint-disable-next-line svelte/no-at-html-tags -->
      {@html renderMarkdown(section.markdown ?? "")}
    </div>
  </div>
{/each}

{#if hideSpoilers && (draft.content || draft.lore)}
  <div
    class="flex flex-col gap-2 rounded border border-chrome-border bg-chrome-bg/30 px-3 py-3"
    data-testid="spoiler-shield"
  >
    <p class="text-xs text-chrome-text">
      The rest of this adventure is hidden so you can play it without knowing
      what's coming. You can still save it.
    </p>
    <button
      type="button"
      onclick={() => (revealed = true)}
      class="self-start rounded-lg border border-chrome-border px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-chrome-muted transition-colors hover:border-chrome-accent hover:text-chrome-text"
      data-testid="spoiler-reveal"
    >
      Reveal the full adventure
    </button>
  </div>
{/if}

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
