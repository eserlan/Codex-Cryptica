<script lang="ts">
  import { fade, scale } from "svelte/transition";
  import { X, Check, Type } from "lucide-svelte";

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
      setTimeout(() => inputElement?.focus(), 50);
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

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  }
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    class="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md font-body"
    onclick={handleBackdropClick}
    onkeydown={handleKeydown}
    transition:fade={{ duration: 150 }}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <div
      class="w-full max-w-md bg-theme-surface border border-theme-border rounded-xl shadow-2xl overflow-hidden flex flex-col"
      transition:scale={{ duration: 200, start: 0.95 }}
    >
      <!-- Header -->
      <div
        class="p-4 border-b border-theme-border flex items-center justify-between bg-theme-bg/30"
      >
        <div class="flex items-center gap-2">
          <Type class="w-4 h-4 text-theme-primary" />
          <h3
            class="text-xs font-bold text-theme-text font-header uppercase tracking-widest"
          >
            Connection Label
          </h3>
        </div>
        <button
          onclick={handleCancel}
          class="p-1 rounded hover:bg-theme-bg text-theme-muted hover:text-theme-text transition-colors"
          aria-label="Close"
        >
          <X class="w-4 h-4" />
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
          class="px-4 py-2 text-[10px] font-bold text-theme-muted hover:text-theme-text uppercase tracking-widest transition-colors"
        >
          Cancel
        </button>
        <button
          onclick={handleSave}
          class="px-6 py-2 bg-theme-primary text-theme-bg rounded-lg font-bold text-[10px] uppercase tracking-widest hover:brightness-110 transition-all flex items-center gap-2 shadow-lg shadow-theme-primary/10"
        >
          <Check class="w-3 h-3" />
          Save Label
        </button>
      </div>
    </div>
  </div>
{/if}
