<script lang="ts">
  import type { RandomSource } from "random-source-engine";

  let {
    noun,
    target,
    impact,
    onClose,
    onConfirm,
  }: {
    noun: string;
    target: RandomSource;
    impact: RandomSource[];
    onClose: () => void;
    onConfirm: () => void;
  } = $props();
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
  onclick={onClose}
>
  <div
    class="w-full max-w-md rounded-xl border border-theme-border bg-theme-surface p-5 shadow-2xl animate-in zoom-in-95 duration-150"
    onclick={(e) => e.stopPropagation()}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    aria-labelledby="delete-modal-title"
  >
    <div class="flex items-start gap-3">
      <div
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-500"
      >
        <span
          aria-hidden="true"
          class="icon-[lucide--alert-triangle] h-5 w-5"
        ></span>
      </div>
      <div class="flex-1 min-w-0">
        <h3
          id="delete-modal-title"
          class="font-header text-sm font-bold uppercase tracking-wider text-theme-text"
        >
          Delete {noun}
        </h3>
        <p class="mt-1 font-body text-xs text-theme-muted">
          Are you sure you want to delete <strong
            class="text-theme-text font-semibold">"{target.name}"</strong
          >?
        </p>

        {#if impact.length > 0}
          <div
            class="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 p-3 font-body text-xs text-red-500"
            data-testid="modal-delete-impact"
          >
            <div
              class="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px]"
            >
              <span
                aria-hidden="true"
                class="icon-[lucide--alert-circle] h-3.5 w-3.5"
              ></span>
              <span>Unresolved references warning</span>
            </div>
            <p class="mt-1">
              {impact.map((s) => s.name).join(", ")}
              {impact.length === 1 ? "refers" : "refer"} to "{target.name}".
              Deleting it will break these {noun} references.
            </p>
          </div>
        {:else}
          <p class="mt-2 text-[11px] text-theme-muted/80">
            This action cannot be undone and will permanently remove this {noun}
            from your vault.
          </p>
        {/if}
      </div>
    </div>

    <div
      class="mt-5 flex justify-end gap-2.5 border-t border-theme-border/60 pt-3.5"
    >
      <button
        type="button"
        onclick={onClose}
        class="rounded-lg border border-theme-border px-3.5 py-1.5 font-header text-xs font-semibold text-theme-muted transition-colors hover:bg-theme-bg hover:text-theme-text"
        data-testid="modal-delete-cancel"
      >
        Cancel
      </button>
      <button
        type="button"
        onclick={onConfirm}
        class="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-1.5 font-header text-xs font-bold uppercase tracking-wider text-white shadow-sm transition-all hover:bg-red-700 active:scale-95"
        data-testid="modal-delete-confirm"
      >
        <span aria-hidden="true" class="icon-[lucide--trash-2] h-3.5 w-3.5"
        ></span>
        Delete {noun}
      </button>
    </div>
  </div>
</div>
