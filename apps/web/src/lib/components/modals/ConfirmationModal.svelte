<script lang="ts">
  import { fade, scale } from "svelte/transition";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";
  import { focusTrap } from "$lib/actions/focusTrap";
  import DecorativeGlowFrame from "$lib/components/ui/DecorativeGlowFrame.svelte";

  const dialog = $derived(notificationStore.confirmationDialog);

  const handleCancel = () => {
    notificationStore.resolveConfirmation(false);
  };

  const handleConfirm = () => {
    notificationStore.resolveConfirmation(true);
  };

  const handleKeydown = (e: KeyboardEvent) => {
    if (!dialog.open) return;
    if (e.key === "Escape") {
      handleCancel();
    } else if (e.key === "Enter") {
      handleConfirm();
    }
  };
</script>

<svelte:window onkeydown={handleKeydown} />

{#if dialog.open}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-[200] flex items-center justify-center p-4"
    transition:fade={{ duration: 200 }}
  >
    <button
      type="button"
      class="absolute inset-0 h-full w-full bg-black/85 backdrop-blur-md focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-theme-primary cursor-default"
      aria-label="Close Confirmation Dialog"
      onclick={handleCancel}
    ></button>
    <!-- Modal -->
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-modal-title"
      tabindex="-1"
      use:focusTrap
      class="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-theme-border bg-theme-surface shadow-2xl"
      transition:scale={{ duration: 250, start: 0.95 }}
      onclick={(e) => e.stopPropagation()}
    >
      <DecorativeGlowFrame />

      <!-- Header -->
      <div class="relative px-6 pt-8 pb-4 text-center">
        <div
          class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-theme-primary/30 bg-theme-primary/10 text-theme-primary"
        >
          {#if dialog.isDangerous}
            <span class="icon-[lucide--triangle-alert] h-6 w-6 text-red-400"
            ></span>
          {:else}
            <span class="icon-[lucide--help-circle] h-6 w-6"></span>
          {/if}
        </div>
        <h3
          id="confirmation-modal-title"
          class="font-header text-xl font-bold uppercase tracking-widest text-theme-text"
        >
          {dialog.title}
        </h3>
      </div>

      <!-- Content -->
      <div class="px-8 py-4 text-center">
        <p class="text-sm leading-relaxed text-theme-muted">
          {dialog.message}
        </p>
      </div>

      <!-- Actions -->
      <div class="flex flex-col gap-3 p-8">
        <button
          class={`w-full rounded-xl px-6 py-3 text-xs font-bold uppercase tracking-widest transition-all ${
            dialog.isDangerous
              ? "bg-red-600 text-white border border-red-600 hover:bg-red-700 shadow-[0_0_20px_rgba(220,38,38,0.25)]"
              : "bg-theme-primary text-theme-bg border border-theme-primary hover:bg-theme-secondary hover:border-theme-secondary shadow-[0_0_20px_rgba(var(--color-theme-primary-rgb),0.25)]"
          }`}
          onclick={handleConfirm}
        >
          {dialog.confirmLabel || "Confirm"}
        </button>
        <button
          class="w-full rounded-xl border border-theme-border bg-theme-bg/50 px-6 py-3 text-xs font-bold uppercase tracking-widest text-theme-muted transition-all hover:bg-theme-bg hover:text-theme-text"
          onclick={handleCancel}
        >
          {dialog.cancelLabel || "Cancel"}
        </button>
      </div>
    </div>
  </div>
{/if}
