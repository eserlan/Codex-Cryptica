<script lang="ts">
  import { fade, scale } from "svelte/transition";
  import { focusTrap } from "$lib/actions/focusTrap";
  import type { Snippet } from "svelte";

  let {
    open,
    onClose,
    labelledBy,
    describedBy,
    class: dialogClass = "",
    maxWidthClass = "max-w-md",
    zIndexClass = "z-[200]",
    backdropClass = "bg-black/80 backdrop-blur-sm",
    closeAriaLabel = "Close dialog",
    fadeDuration = 200,
    scaleDuration = 200,
    scaleStart = 0.95,
    children,
    ...dialogAttrs
  }: {
    open: boolean;
    onClose: () => void;
    labelledBy: string;
    describedBy?: string;
    class?: string;
    maxWidthClass?: string;
    zIndexClass?: string;
    backdropClass?: string;
    closeAriaLabel?: string;
    fadeDuration?: number;
    scaleDuration?: number;
    scaleStart?: number;
    children: Snippet;
    [key: string]: unknown;
  } = $props();

  const handleKeydown = (e: KeyboardEvent) => {
    if (open && e.key === "Escape") onClose();
  };
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <div
    class="fixed inset-0 {zIndexClass} flex items-center justify-center p-4"
    transition:fade={{ duration: fadeDuration }}
  >
    <button
      type="button"
      class="absolute inset-0 h-full w-full {backdropClass} cursor-default focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-theme-primary"
      aria-label={closeAriaLabel}
      onclick={onClose}
    ></button>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      tabindex="-1"
      use:focusTrap
      class="relative w-full {maxWidthClass} overflow-hidden shadow-2xl {dialogClass}"
      transition:scale={{ duration: scaleDuration, start: scaleStart }}
      onclick={(e) => e.stopPropagation()}
      {...dialogAttrs}
    >
      {@render children()}
    </div>
  </div>
{/if}
