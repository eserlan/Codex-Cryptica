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

<!--
  Styled as an Activity Bar item for placement at the bottom of the left sidebar.
-->
<button
  bind:this={element}
  type="button"
  onclick={onToggle}
  aria-label={open ? "Close help assistant" : "Open help assistant"}
  aria-expanded={open}
  title={open ? "Close help assistant" : "Open help assistant"}
  data-testid="help-assistant-button"
  class="shrink-0 w-11 h-11 md:w-10 md:h-10 flex items-center justify-center rounded-md transition-all duration-200 group relative border {open
    ? 'bg-chrome-accent/10 text-chrome-accent border-chrome-accent/30 shadow-sm'
    : 'border-transparent text-chrome-muted hover:text-chrome-text hover:bg-chrome-muted/10'} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chrome-accent"
>
  <span
    aria-hidden="true"
    class="icon-[lucide--message-circle-question] w-5 h-5 transition-transform duration-200 group-hover:scale-110"
  ></span>

  {#if open}
    <div
      class="absolute md:left-0 md:top-1/2 md:-translate-y-1/2 md:w-1 md:h-6
             bottom-0 left-1/2 -translate-x-1/2 w-6 h-1
             bg-chrome-accent rounded-t-full md:rounded-r-full md:rounded-t-none"
    ></div>
  {/if}
</button>
