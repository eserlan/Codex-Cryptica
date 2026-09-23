<script lang="ts">
  import type { RandomSource } from "random-source-engine";

  let {
    noun,
    target,
    draft = $bindable(),
    error,
    impact,
    onClose,
    onConfirm,
  }: {
    noun: string;
    target: RandomSource;
    draft: string;
    error: string;
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
    aria-labelledby="rename-modal-title"
  >
    <form
      onsubmit={(e) => {
        e.preventDefault();
        onConfirm();
      }}
    >
      <div class="flex items-start gap-3">
        <div
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-theme-primary/15 text-theme-primary"
        >
          <span aria-hidden="true" class="icon-[lucide--pencil] h-5 w-5"
          ></span>
        </div>
        <div class="flex-1 min-w-0">
          <h3
            id="rename-modal-title"
            class="font-header text-sm font-bold uppercase tracking-wider text-theme-text"
          >
            Rename {noun}
          </h3>
          <p class="mt-0.5 font-body text-xs text-theme-muted">
            Choose a unique name for this {noun}.
          </p>

          <div class="mt-3 flex flex-col gap-1">
            <label
              for="rename-input"
              class="font-header text-[9px] font-bold uppercase tracking-wider text-theme-muted"
            >
              New Name
            </label>
            <input
              id="rename-input"
              type="text"
              bind:value={draft}
              class="w-full rounded-lg border border-theme-border bg-theme-bg px-3 py-2 text-xs font-medium text-theme-text focus:border-theme-primary focus:outline-none"
              placeholder="Enter {noun} name..."
              required
              data-testid="modal-rename-input"
            />
          </div>

          {#if error}
            <p class="mt-2 text-xs text-red-500 font-body">
              {error}
            </p>
          {/if}

          {#if impact.length > 0}
            <div
              class="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 font-body text-xs text-amber-600 dark:text-amber-400"
              data-testid="modal-rename-impact"
            >
              <div
                class="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px]"
              >
                <span
                  aria-hidden="true"
                  class="icon-[lucide--alert-circle] h-3.5 w-3.5"
                ></span>
                <span>Reference Notice</span>
              </div>
              <p class="mt-1">
                {impact.map((s) => s.name).join(", ")}
                {impact.length === 1 ? "refers" : "refer"} to "{target.name}".
                Existing references might need updating if renamed.
              </p>
            </div>
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
          data-testid="modal-rename-cancel"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!draft.trim() ||
            draft.trim() === target.name}
          class="inline-flex items-center gap-1.5 rounded-lg bg-theme-primary px-4 py-1.5 font-header text-xs font-bold uppercase tracking-wider text-theme-bg shadow-sm transition-all hover:bg-theme-primary/90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="modal-rename-confirm"
        >
          <span aria-hidden="true" class="icon-[lucide--check] h-3.5 w-3.5"
          ></span>
          Rename {noun}
        </button>
      </div>
    </form>
  </div>
</div>
