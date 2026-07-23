<script lang="ts">
  import { fade, scale } from "svelte/transition";
  import { focusTrap } from "$lib/actions/focusTrap";
  import { oracle } from "$lib/stores/oracle.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";

  const dialog = $derived(modalUIStore.imagePromptReview);
  const target = $derived(dialog.target);
  let editedPrompt = $state("");
  let error = $state("");
  let isRevisingPrompt = $state(false);

  $effect(() => {
    if (dialog.open) {
      editedPrompt = dialog.prompt;
      error = "";
      isRevisingPrompt = false;
    }
  });

  const isRevising = $derived.by(() => {
    if (!target) return false;
    return target.kind === "entity"
      ? oracle.isVisualizingEntity(target.id)
      : oracle.isVisualizingMessage(target.id);
  });
  const isBusy = $derived(isRevising || isRevisingPrompt);

  const handleCancel = () => {
    if (isBusy) return;
    modalUIStore.closeImagePromptReview();
  };

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    if (!target || isBusy) return;

    const prompt = editedPrompt.trim();
    if (!prompt) {
      error = "Prompt is required.";
      return;
    }

    error = "";
    if (target.kind === "entity") {
      await oracle.generateEntityFromPrompt(target.id, prompt);
    } else {
      await oracle.generateMessageFromPrompt(target.id, prompt);
    }
    modalUIStore.closeImagePromptReview();
  };

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(editedPrompt);
      notificationStore.notify("Copied image prompt", "success");
    } catch {
      notificationStore.notify("Could not copy image prompt.", "error");
    }
  };

  const regeneratePrompt = async () => {
    if (!target || isBusy) return;

    isRevisingPrompt = true;
    error = "";
    try {
      const prompt =
        target.kind === "entity"
          ? await oracle.regenerateEntityPrompt(target.id)
          : await oracle.regenerateMessagePrompt(target.id);
      if (prompt?.trim()) {
        editedPrompt = prompt.trim();
      } else {
        error = "Could not revise a prompt.";
      }
    } catch (err) {
      error = err instanceof Error ? err.message : "Could not revise a prompt.";
    } finally {
      isRevisingPrompt = false;
    }
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (!dialog.open) return;
    if (event.key === "Escape") {
      handleCancel();
    }
  };
</script>

<svelte:window onkeydown={handleKeydown} />

{#if dialog.open && target}
  <div
    class="fixed inset-0 z-[210] flex items-center justify-center p-3 md:p-6"
    transition:fade={{ duration: 160 }}
  >
    <button
      type="button"
      class="absolute inset-0 h-full w-full bg-black/85 backdrop-blur-md focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-theme-primary cursor-default"
      aria-label="Close Image Prompt Review Dialog"
      onclick={handleCancel}
    ></button>
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="image-prompt-title"
      aria-describedby="image-prompt-help"
      tabindex="-1"
      use:focusTrap
      class="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-theme-border bg-theme-surface shadow-2xl"
      transition:scale={{ duration: 180, start: 0.97 }}
      onclick={(event) => event.stopPropagation()}
      onkeydown={(event) => event.stopPropagation()}
    >
      <form class="flex min-h-0 flex-1 flex-col" onsubmit={handleSubmit}>
        <div
          class="flex items-start justify-between gap-4 border-b border-theme-border px-4 py-4 md:px-6"
        >
          <div class="min-w-0">
            <h2
              id="image-prompt-title"
              class="font-header text-sm font-bold uppercase tracking-widest text-theme-primary"
            >
              Review Image Prompt
            </h2>
            <p
              id="image-prompt-help"
              class="mt-1 truncate text-xs text-theme-muted"
            >
              {target.title}
            </p>
          </div>
          <button
            type="button"
            onclick={handleCancel}
            disabled={isBusy}
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-theme-border text-theme-muted transition hover:border-theme-primary hover:text-theme-primary disabled:cursor-wait disabled:opacity-50"
            aria-label="Close prompt review"
            title="Close"
          >
            <span aria-hidden="true" class="icon-[lucide--x] h-4 w-4"></span>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto px-4 py-4 md:px-6">
          <label
            for="image-prompt-review-text"
            class="mb-2 block text-[10px] font-bold uppercase tracking-widest text-theme-secondary"
          >
            Prompt
          </label>
          <textarea
            id="image-prompt-review-text"
            name="prompt"
            bind:value={editedPrompt}
            required
            rows="14"
            aria-describedby={error
              ? "image-prompt-error"
              : "image-prompt-help"}
            class="min-h-72 w-full resize-y rounded border border-theme-border bg-theme-bg/60 p-3 font-body text-sm leading-relaxed text-theme-text outline-none transition focus:border-theme-primary focus:ring-1 focus:ring-theme-primary"
          ></textarea>
          {#if error}
            <p
              id="image-prompt-error"
              class="mt-2 text-xs font-bold text-red-400"
              aria-live="polite"
            >
              {error}
            </p>
          {/if}
        </div>

        <div
          class="flex flex-col-reverse gap-2 border-t border-theme-border bg-theme-bg/30 px-4 py-4 md:flex-row md:justify-end md:px-6"
        >
          <button
            type="button"
            onclick={copyPrompt}
            disabled={isBusy}
            class="inline-flex min-h-11 items-center justify-center gap-2 rounded border border-theme-border bg-theme-surface px-4 py-2 text-xs font-bold uppercase tracking-widest text-theme-muted transition hover:border-theme-primary hover:text-theme-primary disabled:cursor-wait disabled:opacity-50"
          >
            <span class="icon-[lucide--copy] h-4 w-4"></span>
            Copy
          </button>
          <button
            type="button"
            onclick={regeneratePrompt}
            disabled={isBusy}
            aria-busy={isRevisingPrompt}
            class="inline-flex min-h-11 items-center justify-center gap-2 rounded border border-theme-border bg-theme-surface px-4 py-2 text-xs font-bold uppercase tracking-widest text-theme-muted transition hover:border-theme-primary hover:text-theme-primary disabled:cursor-wait disabled:opacity-50"
          >
            {#if isRevisingPrompt}
              <span
                class="icon-[lucide--loader-2] h-4 w-4 animate-spin"
                aria-hidden="true"
              ></span>
              Revising
            {:else}
              <span class="icon-[lucide--refresh-cw] h-4 w-4"></span>
              Revise Prompt
            {/if}
          </button>
          <button
            type="button"
            onclick={handleCancel}
            disabled={isBusy}
            class="inline-flex min-h-11 items-center justify-center rounded border border-theme-border bg-theme-surface px-4 py-2 text-xs font-bold uppercase tracking-widest text-theme-muted transition hover:text-theme-text disabled:cursor-wait disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isBusy}
            aria-busy={isRevising}
            class="inline-flex min-h-11 items-center justify-center gap-2 rounded border border-theme-primary bg-theme-primary px-4 py-2 text-xs font-bold uppercase tracking-widest text-theme-bg transition hover:bg-theme-secondary disabled:cursor-wait disabled:opacity-60"
          >
            {#if isRevising}
              <span
                class="icon-[lucide--loader-2] h-4 w-4 animate-spin"
                aria-hidden="true"
              ></span>
              Generating
            {:else}
              <span class="icon-[lucide--image-plus] h-4 w-4"></span>
              Generate
            {/if}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
