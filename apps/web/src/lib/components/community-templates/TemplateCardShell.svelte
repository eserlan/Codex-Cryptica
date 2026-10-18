<script lang="ts">
  import type { Snippet } from "svelte";

  /** The clickable card frame shared by the community template lists. */
  let {
    title,
    ownerDisplayName,
    description,
    onOpen,
    children,
  }: {
    title: string;
    ownerDisplayName?: string;
    description: string;
    onOpen: () => void;
    /** Chips and any footer below the description. */
    children?: Snippet;
  } = $props();
</script>

<button
  type="button"
  class="rounded-xl border border-theme-border bg-theme-surface p-4 text-left transition hover:border-theme-primary"
  onclick={onOpen}
>
  <div class="flex items-start justify-between gap-3">
    <h2 class="font-header text-lg font-bold text-theme-text">{title}</h2>
    {#if ownerDisplayName}
      <span class="text-xs text-theme-muted">by {ownerDisplayName}</span>
    {/if}
  </div>
  <p class="mt-2 line-clamp-3 text-sm text-theme-muted">{description}</p>
  {@render children?.()}
</button>
