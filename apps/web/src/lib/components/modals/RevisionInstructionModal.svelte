<script lang="ts">
  import { tick } from "svelte";
  import { fade, scale } from "svelte/transition";
  import { focusTrap } from "$lib/actions/focusTrap";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { revisionService } from "$lib/services/RevisionService.svelte";
  import { vault } from "$lib/stores/vault.svelte";

  const dialog = $derived(modalUIStore.revisionDialog);
  const entityId = $derived(dialog.entityId);
  const entity = $derived(entityId ? vault.entities[entityId] : null);

  let instructions = $state("");
  let instructionsField: HTMLTextAreaElement | undefined = $state();

  $effect(() => {
    if (dialog.open) {
      tick().then(() => instructionsField?.focus());
    }
  });

  const handleCancel = () => {
    instructions = "";
    modalUIStore.closeRevisionDialog();
  };

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    const targetEntityId = entityId;
    if (!targetEntityId) return;

    const inst = instructions.trim();
    instructions = "";
    modalUIStore.closeRevisionDialog();
    await revisionService.revise({
      entityId: targetEntityId,
      instructions: inst || undefined,
    });
  };

  const handleKeydown = (e: KeyboardEvent) => {
    if (!dialog.open) return;
    if (e.key === "Escape") {
      handleCancel();
    } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit(new SubmitEvent("submit"));
    }
  };
</script>

<svelte:window onkeydown={handleKeydown} />

{#if dialog.open && entity}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-[210] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    transition:fade={{ duration: 150 }}
    onclick={handleCancel}
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="revision-modal-title"
      aria-describedby="revision-modal-help"
      tabindex="-1"
      use:focusTrap
      class="relative w-full max-w-lg flex flex-col overflow-hidden rounded-xl border border-chrome-border bg-chrome-surface shadow-2xl text-left font-sans"
      transition:scale={{ duration: 180, start: 0.96 }}
      onclick={(event) => event.stopPropagation()}
    >
      <form class="flex flex-col" onsubmit={handleSubmit}>
        <!-- Header -->
        <div
          class="flex items-start justify-between border-b border-chrome-border px-5 py-4"
        >
          <div>
            <h2
              id="revision-modal-title"
              class="text-sm font-bold uppercase tracking-wider text-chrome-accent"
            >
              Revise Description
            </h2>
            <p id="revision-modal-help" class="mt-1 text-xs text-chrome-muted">
              Optional guidance for {entity.title}
            </p>
          </div>
          <button
            type="button"
            onclick={handleCancel}
            class="flex h-8 w-8 items-center justify-center rounded border border-chrome-border text-chrome-muted transition hover:border-chrome-accent hover:text-chrome-accent"
            aria-label="Close"
          >
            <span class="icon-[lucide--x] h-4 w-4"></span>
          </button>
        </div>

        <!-- Body -->
        <div class="px-5 py-4">
          <label
            for="revision-instructions"
            class="mb-2 block text-[10px] font-bold uppercase tracking-wider text-chrome-muted"
          >
            AI Instructions / Corrections (Highest Priority)
          </label>
          <textarea
            id="revision-instructions"
            bind:this={instructionsField}
            bind:value={instructions}
            placeholder="e.g. Focus on their secret alliance with the Rebellion, mention they are missing..."
            rows="5"
            class="w-full resize-none rounded border border-chrome-border bg-chrome-bg/50 p-3 text-sm leading-relaxed text-chrome-text outline-none transition focus:border-chrome-accent focus:ring-1 focus:ring-chrome-accent"
          ></textarea>
          <p class="mt-2 text-[10px] text-chrome-muted">
            Press <kbd
              class="px-1 py-0.5 border border-chrome-border rounded bg-chrome-bg/30 font-mono"
              >Ctrl + Enter</kbd
            > to revise.
          </p>
        </div>

        <!-- Footer -->
        <div
          class="flex justify-end gap-2 border-t border-chrome-border bg-chrome-surface px-5 py-3"
        >
          <button
            type="button"
            onclick={handleCancel}
            class="px-4 py-2 border border-chrome-border rounded-lg text-xs font-bold uppercase tracking-wider text-chrome-muted hover:text-chrome-text hover:border-chrome-accent transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="px-5 py-2 bg-chrome-accent text-chrome-surface font-bold uppercase tracking-wider text-xs rounded-lg hover:brightness-110 transition-all active:scale-95"
          >
            Revise
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
