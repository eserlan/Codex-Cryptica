<script lang="ts">
  import { onMount } from "svelte";
  import SoloQuickRoll from "./SoloQuickRoll.svelte";
  import SoloActions from "./SoloActions.svelte";
  import SoloSceneField from "./SoloSceneField.svelte";

  let { onclose }: { onclose: () => void } = $props();
  let sheet: HTMLDivElement;

  onMount(() => {
    const trigger = document.activeElement as HTMLElement | null;
    sheet.focus();
    return () => trigger?.focus();
  });

  function onKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      // A modal opened from the sheet owns Escape until it closes.
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) {
        return;
      }
      onclose();
    }
  }
</script>

<svelte:window onkeydown={onKeydown} />

<div
  class="fixed inset-x-0 bottom-16 z-[80] flex max-h-[60dvh] flex-col gap-3 overflow-y-auto rounded-t-xl border-t border-theme-border bg-theme-surface p-4 shadow-2xl"
  role="dialog"
  aria-modal="false"
  aria-label="Solo session tools"
  tabindex="-1"
  data-testid="solo-sheet"
  bind:this={sheet}
>
  <div class="flex items-center justify-between">
    <span class="font-header text-sm uppercase tracking-widest text-theme-text"
      >Solo session</span
    >
    <button
      type="button"
      class="rounded-md px-2 py-1 text-sm text-theme-muted hover:text-theme-primary"
      aria-label="Close solo session tools"
      onclick={onclose}>Close</button
    >
  </div>
  <SoloSceneField />
  <SoloQuickRoll />
  <SoloActions />
</div>
