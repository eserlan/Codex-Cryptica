<script lang="ts">
  import SoloQuickRoll from "./SoloQuickRoll.svelte";
  import SoloActions from "./SoloActions.svelte";
  import SoloSceneField from "./SoloSceneField.svelte";

  let { onclose }: { onclose: () => void } = $props();

  function onKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") onclose();
  }
</script>

<div
  class="fixed inset-x-0 bottom-0 z-[80] flex flex-col gap-3 rounded-t-xl border-t border-theme-border bg-theme-surface p-4 shadow-2xl"
  role="dialog"
  aria-modal="false"
  aria-label="Solo session tools"
  tabindex="-1"
  data-testid="solo-sheet"
  onkeydown={onKeydown}
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
