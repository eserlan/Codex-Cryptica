<script lang="ts">
  import { tick } from "svelte";
  import ModalShell from "$lib/components/ui/ModalShell.svelte";

  let {
    isOpen = $bindable(false),
    initialValue = "",
    onSave,
    onCancel,
  }: {
    isOpen: boolean;
    initialValue: string;
    onSave: (value: string) => void;
    onCancel: () => void;
  } = $props();

  let value = $state("");
  let inputElement = $state<HTMLInputElement>();

  $effect(() => {
    if (isOpen) {
      value = initialValue;
      tick().then(() => inputElement?.focus());
    }
  });

  function handleSave() {
    onSave(value);
    isOpen = false;
  }

  function handleCancel() {
    onCancel();
    isOpen = false;
  }

  function handleInputKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      handleSave();
    }
  }
</script>

<ModalShell
  open={isOpen}
  onClose={handleCancel}
  labelledBy="edge-label-modal-title"
  backdropClass="bg-black/60 backdrop-blur-md"
  class="flex flex-col rounded-xl border border-theme-border bg-theme-surface font-body"
  fadeDuration={150}
>
  <!-- Header -->
  <div
    class="p-4 border-b border-theme-border flex items-center justify-between bg-theme-bg/30"
  >
    <div class="flex items-center gap-2">
      <span class="icon-[lucide--type] w-4 h-4 text-theme-primary"></span>
      <h3
        id="edge-label-modal-title"
        class="text-xs font-bold text-theme-text font-header uppercase tracking-widest"
      >
        Connection Label
      </h3>
    </div>
    <button
      onclick={handleCancel}
      class="p-1 rounded hover:bg-theme-bg text-theme-muted hover:text-theme-text transition-colors"
      aria-label="Close"
      type="button"
    >
      <span aria-hidden="true" class="icon-[lucide--x] w-4 h-4"></span>
    </button>
  </div>

  <!-- Content -->
  <div class="p-6">
    <label
      for="edge-label-input"
      class="block text-[10px] text-theme-muted uppercase tracking-widest mb-2 font-mono"
    >
      Label Text
    </label>
    <input
      id="edge-label-input"
      bind:this={inputElement}
      bind:value
      type="text"
      placeholder="Enter connection label..."
      onkeydown={handleInputKeydown}
      class="w-full bg-theme-bg border border-theme-border rounded-lg px-4 py-3 text-sm text-theme-text focus:outline-none focus:border-theme-primary transition-all shadow-inner font-mono"
    />
    <p class="text-[9px] text-theme-muted/60 mt-2 italic font-mono">
      Clear the text to hide the label entirely.
    </p>
  </div>

  <!-- Actions -->
  <div
    class="p-4 bg-theme-bg/30 border-t border-theme-border flex justify-end gap-3"
  >
    <button
      onclick={handleCancel}
      class="px-4 py-2 text-[10px] font-bold text-theme-muted hover:text-theme-text uppercase font-header tracking-widest transition-colors"
      type="button"
    >
      Cancel
    </button>
    <button
      onclick={handleSave}
      class="px-6 py-2 bg-theme-primary text-theme-bg rounded-lg font-bold text-[10px] uppercase font-header tracking-widest hover:brightness-110 transition-all flex items-center gap-2 shadow-lg shadow-theme-primary/10"
      type="button"
    >
      <span class="icon-[lucide--check] w-3 h-3"></span>
      Save Label
    </button>
  </div>
</ModalShell>
