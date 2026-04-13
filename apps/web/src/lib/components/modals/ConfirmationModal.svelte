<script lang="ts">
  import { uiStore } from "$lib/stores/ui.svelte";
  import { fade, scale } from "svelte/transition";

  const dialog = $derived(uiStore.confirmationDialog);

  const handleCancel = () => {
    uiStore.resolveConfirmation(false);
  };

  const handleConfirm = () => {
    uiStore.resolveConfirmation(true);
  };

  let previousActiveElement: HTMLElement | null = null;
  let modalElement: HTMLElement | undefined = $state();

  $effect(() => {
    if (dialog.open) {
      previousActiveElement = document.activeElement as HTMLElement;
      setTimeout(() => {
        const firstFocusable = modalElement?.querySelector(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ) as HTMLElement;
        firstFocusable?.focus();
      }, 10);
    } else if (previousActiveElement) {
      previousActiveElement.focus();
      previousActiveElement = null;
    }
  });

  const handleKeydown = (e: KeyboardEvent) => {
    if (!dialog.open) return;
    if (e.key === "Escape") {
      handleCancel();
      e.stopPropagation();
    } else if (e.key === "Enter") {
      if (document.activeElement?.tagName === "BUTTON") return;
      handleConfirm();
    } else if (e.key === "Tab") {
      if (!modalElement) return;
      const focusables = modalElement.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0] as HTMLElement;
      const last = focusables[focusables.length - 1] as HTMLElement;

      if (e.shiftKey && document.activeElement === first) {
        last.focus();
        e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    }
  };
</script>

{#if dialog.open}
  <!-- Backdrop -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
    transition:fade={{ duration: 200 }}
    onclick={handleCancel}
  >
    <!-- Modal -->
    <div
      bind:this={modalElement}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-modal-title"
      tabindex="-1"
      onkeydown={handleKeydown}
      class="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-theme-border bg-theme-surface shadow-2xl focus:outline-none"
      transition:scale={{ duration: 250, start: 0.95 }}
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Decorative Background Glow -->
      <div
        class="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-theme-primary/10 blur-[80px]"
      ></div>
      <div
        class="absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-theme-primary/5 blur-[80px]"
      ></div>

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

      <!-- Decorative Corners -->
      <div
        class="pointer-events-none absolute top-0 left-0 h-8 w-8 border-t-2 border-l-2 border-theme-primary/40 rounded-tl-[2rem]"
      ></div>
      <div
        class="pointer-events-none absolute bottom-0 right-0 h-8 w-8 border-b-2 border-r-2 border-theme-primary/40 rounded-br-[2rem]"
      ></div>
    </div>
  </div>
{/if}
