<script lang="ts">
  let {
    interactive,
    open,
    controls,
    ontoggle,
  }: {
    /** False when there is no earlier version to show, so it is only a label. */
    interactive: boolean;
    open: boolean;
    /** The id of the panel this button opens. */
    controls: string;
    ontoggle: () => void;
  } = $props();

  const chip =
    "rounded border border-theme-primary/40 bg-theme-primary/10 px-2 py-0.5 text-base sm:text-sm font-bold text-theme-primary";
</script>

{#if interactive}
  <button
    type="button"
    aria-expanded={open}
    aria-controls={controls}
    onclick={ontoggle}
    class="inline-flex min-h-11 items-center justify-center gap-2 {chip} transition-colors hover:bg-theme-primary/20"
  >
    <span>Updated</span>
    <span class="font-normal text-theme-muted"
      >{open ? "Hide before" : "See before"}</span
    >
    <span
      class="h-4 w-4 {open
        ? 'icon-[lucide--chevron-up]'
        : 'icon-[lucide--chevron-down]'}"
      aria-hidden="true"
    ></span>
  </button>
{:else}
  <span class={chip}>Updated</span>
{/if}
