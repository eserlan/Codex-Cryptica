<script lang="ts">
  import { canSeeHexCrawl } from "./hex-crawl-view";

  let {
    checked,
    onChange,
    isGM,
    isGuest,
    modeOn,
  }: {
    checked: boolean;
    onChange: (next: boolean) => void;
    isGM: boolean;
    isGuest: boolean;
    modeOn: boolean;
  } = $props();

  const visible = $derived(modeOn && canSeeHexCrawl({ isGM, isGuest }));
</script>

{#if visible}
  <label class="flex items-center justify-between gap-3 cursor-pointer">
    <span class="text-sm text-theme-text">Show terrain icons</span>
    <input
      type="checkbox"
      role="switch"
      aria-label="Show terrain icons"
      class="h-4 w-4 rounded border-theme-border accent-theme-primary"
      {checked}
      onchange={(event) => onChange(event.currentTarget.checked)}
    />
  </label>
{/if}
