<script lang="ts">
  import { fly, fade } from "svelte/transition";
  import { quintOut } from "svelte/easing";
  import type { AdventureManager } from "$lib/stores/oracle/adventure-manager.svelte";
  import { focusTrap } from "$lib/actions/focusTrap";
  import AdventureResourceCounters from "./AdventureResourceCounters.svelte";
  import AdventureRollHistory from "./AdventureRollHistory.svelte";

  let { manager, onClose }: { manager: AdventureManager; onClose: () => void } =
    $props();

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") onClose();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div
  class="fixed inset-0 z-[90] bg-black/30"
  onclick={onClose}
  aria-hidden="true"
  transition:fade={{ duration: 300 }}
></div>

<div
  class="fixed bottom-0 left-0 right-0 z-[91] flex max-h-[80vh] flex-col rounded-t-2xl border-t border-theme-border bg-theme-surface shadow-2xl"
  role="dialog"
  aria-modal="true"
  aria-label="Adventure tools"
  data-testid="adventure-tools-drawer"
  tabindex="-1"
  use:focusTrap
  transition:fly={{ y: 400, duration: 500, easing: quintOut }}
>
  <div class="flex justify-center pt-3 pb-1">
    <div class="h-1 w-10 rounded-full bg-theme-border"></div>
  </div>
  <div class="flex items-center justify-between px-4 pb-2 pt-1">
    <h2 class="font-semibold text-theme-primary">Adventure tools</h2>
    <button
      type="button"
      class="flex min-h-10 min-w-10 items-center justify-center rounded-full text-theme-secondary hover:bg-theme-primary/10 hover:text-theme-primary"
      onclick={onClose}
      aria-label="Close adventure tools"
    >
      <span aria-hidden="true" class="icon-[lucide--x] h-4 w-4"></span>
    </button>
  </div>
  <div
    class="space-y-4 overflow-y-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
  >
    <AdventureRollHistory {manager} />
    <AdventureResourceCounters {manager} />
  </div>
</div>
