<script lang="ts">
  import type { Visibility } from "@codex/adventure-engine";

  let {
    collection,
    index,
    visibility,
    label,
    disabled,
    onToggle,
  }: {
    collection: string;
    index: number;
    visibility: Visibility;
    label: string;
    disabled: boolean;
    onToggle: () => void;
  } = $props();
</script>

<div class="flex flex-wrap items-center justify-between gap-2 pt-1">
  <span
    class="text-xs font-medium text-theme-text"
    data-testid="{collection}-visibility-{index}"
  >
    {visibility === "gm-only" ? "GM-only" : "Player-visible"}
  </span>
  <button
    type="button"
    data-testid="{collection}-visibility-toggle-{index}"
    aria-pressed={visibility === "gm-only"}
    aria-label="Toggle visibility for {label}"
    {disabled}
    onclick={onToggle}
    class="min-h-9 rounded-md border border-theme-border bg-theme-surface px-3 py-1.5 text-xs font-medium text-theme-text transition hover:border-theme-primary hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary disabled:cursor-not-allowed disabled:opacity-60"
  >
    {visibility === "gm-only" ? "Make player-visible" : "Make GM-only"}
  </button>
</div>
