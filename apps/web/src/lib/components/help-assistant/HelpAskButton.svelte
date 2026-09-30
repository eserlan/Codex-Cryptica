<script lang="ts">
  let {
    open,
    onToggle,
    element = $bindable(),
  }: {
    open: boolean;
    onToggle: () => void;
    element?: HTMLButtonElement;
  } = $props();
</script>

<button
  bind:this={element}
  type="button"
  onclick={onToggle}
  aria-label={open ? "Close help assistant" : "Open help assistant"}
  aria-expanded={open}
  data-testid="help-assistant-button"
  class="fixed bottom-16 right-3 z-[94] flex h-11 w-11 items-center justify-center rounded-full border border-theme-border bg-theme-surface text-theme-primary shadow-lg transition hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary md:bottom-4 md:right-4"
>
  <span
    aria-hidden="true"
    class="icon-[lucide--message-circle-question] h-5 w-5"
  ></span>
</button>
