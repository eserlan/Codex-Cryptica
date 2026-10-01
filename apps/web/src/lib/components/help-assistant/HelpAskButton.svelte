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
  Bottom-left on purpose. The bottom-right corner is where the graph and canvas
  put their create (+) buttons, and on a wide screen the entity panel opens on
  the right. On a wide screen the left edge is the 3.5rem activity rail, so the
  button clears it (4.5rem).

  z-30 on purpose: the front-page overlay is a z-40 stacking context, so the
  button stays below the whole overlay, including its call to action. The panel
  it opens is a deliberate action and stays on top.
-->
<button
  bind:this={element}
  type="button"
  onclick={onToggle}
  aria-label={open ? "Close help assistant" : "Open help assistant"}
  aria-expanded={open}
  data-testid="help-assistant-button"
  class="fixed bottom-[calc(4rem_+_env(safe-area-inset-bottom,0px))] left-3 z-[30] flex h-11 w-11 items-center justify-center rounded-full border border-theme-border bg-theme-surface text-theme-primary shadow-lg transition hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary md:bottom-4 md:left-[4.5rem]"
>
  <span
    aria-hidden="true"
    class="icon-[lucide--message-circle-question] h-5 w-5"
  ></span>
</button>
