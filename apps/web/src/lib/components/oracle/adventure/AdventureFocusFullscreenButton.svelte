<script lang="ts">
  let {
    inToolsSheet = false,
    active,
    busy,
    onToggle,
  }: {
    inToolsSheet?: boolean;
    active: boolean;
    busy: boolean;
    onToggle: () => Promise<void>;
  } = $props();
</script>

<button
  class={inToolsSheet
    ? "flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-theme-text px-3 py-2 text-sm font-medium text-theme-text transition hover:border-theme-primary hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary"
    : "hidden min-h-12 items-center gap-2 rounded-md border border-theme-text px-3 text-theme-text transition hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary sm:inline-flex"}
  type="button"
  aria-label={active ? "Fullscreen active" : "Fullscreen"}
  aria-pressed={active}
  disabled={busy}
  onclick={() => void onToggle()}
>
  <span
    class={inToolsSheet
      ? "flex items-center gap-2.5"
      : "inline-flex items-center gap-2"}
  >
    <span
      aria-hidden="true"
      class={[
        active ? "icon-[lucide--minimize-2]" : "icon-[lucide--maximize-2]",
        "h-4 w-4",
        inToolsSheet ? "shrink-0" : "",
      ]}
    ></span>
    {#if inToolsSheet}<span>{active ? "Fullscreen active" : "Fullscreen"}</span>
    {:else}{active ? "Fullscreen active" : "Fullscreen"}{/if}
  </span>
</button>
