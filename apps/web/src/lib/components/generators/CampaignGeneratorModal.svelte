<script lang="ts">
  import { fade, scale } from "svelte/transition";
  import { focusTrap } from "$lib/actions/focusTrap";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";

  const workflow = $derived(modalUIStore.generatorWorkflow);

  function close() {
    modalUIStore.closeGeneratorWorkflow();
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.key === "Escape") close();
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  class="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
  role="dialog"
  aria-modal="true"
  aria-label="Campaign Generator"
  use:focusTrap
  {onkeydown}
  transition:fade={{ duration: 150 }}
>
  <div
    class="bg-surface-800 border-surface-600 relative w-full max-w-lg rounded-xl border p-6 shadow-xl"
    transition:scale={{ start: 0.95, duration: 150 }}
  >
    <button
      class="text-surface-400 hover:text-surface-100 absolute right-4 top-4"
      onclick={close}
      aria-label="Close generator">✕</button
    >

    <h2 class="text-surface-100 mb-4 text-lg font-semibold">Generate</h2>

    <!-- Placeholder: full UI built in Phase 3 (T016–T030) -->
    <p class="text-surface-400 text-sm">
      Generator workflow coming soon.
      {#if workflow.launchMode === "contextual"}
        (Contextual: entity {workflow.sourceEntityId})
      {/if}
    </p>
  </div>
</div>
