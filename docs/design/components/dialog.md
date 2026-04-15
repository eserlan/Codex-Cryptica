# Component Pattern: Modals and Dialogs

Codex-Cryptica uses a centralized modal system managed by the `uiStore`. Modals are rendered via a `GlobalModalProvider`.

## Modal Structure

A standard modal includes a backdrop, a container with transition effects, a header, a content area, and action buttons.

### Implementation Pattern (Confirmation Example)

```svelte
<script lang="ts">
  import { fade, scale } from "svelte/transition";
  import { uiStore } from "$lib/stores/ui.svelte";

  const dialog = $derived(uiStore.confirmationDialog);

  const _close = () => uiStore.resolveConfirmation(false);
  const _confirm = () => uiStore.resolveConfirmation(true);
</script>

{#if dialog.open}
  <!-- Backdrop -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
    transition:fade={{ duration: 200 }}
    onclick={_close}
  >
    <!-- Modal Container -->
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      tabindex="-1"
      class="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-theme-border bg-theme-surface shadow-2xl"
      transition:scale={{ duration: 250, start: 0.95 }}
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Content here -->
      <div class="p-8">
        <h3
          id="modal-title"
          class="font-header text-xl uppercase tracking-widest text-theme-text"
        >
          {dialog.title}
        </h3>
        <p class="mt-4 text-sm text-theme-muted">{dialog.message}</p>

        <div class="mt-8 flex flex-col gap-3">
          <button class="bg-theme-primary ..." onclick={_confirm}
            >Confirm</button
          >
          <button class="bg-theme-bg ..." onclick={_close}>Cancel</button>
        </div>
      </div>
    </div>
  </div>
{/if}
```

## Guidelines

1.  **Z-Index**: Modals should use high z-index values (e.g., `z-[200]`) to stay above all other UI layers.
2.  **Transitions**: Use `fade` for the backdrop and `scale` for the modal container to provide a polished experience.
3.  **Keyboard Accessibility**: Ensure the modal can be closed with the `Escape` key and focus is managed correctly. `tabindex="-1"` should be set on the dialog container for programmatic focus.
4.  **A11y Labeling**: Always use `aria-labelledby` pointing to the modal's primary heading.
5.  **Backdrop**: Always include a `backdrop-blur` and a dark overlay to focus the user's attention.
