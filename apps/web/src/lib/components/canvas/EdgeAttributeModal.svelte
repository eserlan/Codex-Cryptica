<script lang="ts">
  import type { DelveEdgeData, PassageType } from "generator-engine";

  let {
    isOpen = false,
    edgeData = null,
    onSave,
    onClose,
  }: {
    isOpen: boolean;
    edgeData: DelveEdgeData | null;
    onSave: (updated: Partial<DelveEdgeData>) => void;
    onClose: () => void;
  } = $props();

  let selectedType = $state<PassageType>("standard");
  let description = $state("");
  let condition = $state("");
  let isBidirectional = $state(true);

  $effect(() => {
    if (edgeData) {
      selectedType = edgeData.type ?? "standard";
      description = edgeData.description ?? "";
      condition = edgeData.condition ?? "";
      isBidirectional = edgeData.bidirectional ?? true;
    }
  });

  function handleSave() {
    onSave({
      type: selectedType,
      description: description.trim() || undefined,
      condition: condition.trim() || undefined,
      bidirectional: isBidirectional,
    });
    onClose();
  }
</script>

{#if isOpen && edgeData}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    role="dialog"
    aria-modal="true"
    aria-labelledby="edge-modal-title"
  >
    <div
      class="w-full max-w-md bg-theme-bg border border-theme-border rounded-2xl p-6 shadow-xl space-y-4"
    >
      <div
        class="flex items-center justify-between border-b border-theme-border/60 pb-3"
      >
        <h3
          id="edge-modal-title"
          class="font-header font-bold text-base text-theme-text flex items-center gap-2"
        >
          <span class="icon-[lucide--git-commit] w-4 h-4 text-theme-primary"
          ></span>
          Edit Passage Attributes
        </h3>
        <button
          type="button"
          onclick={onClose}
          class="text-theme-muted hover:text-theme-text transition-colors"
        >
          <span class="icon-[lucide--x] w-4 h-4"></span>
        </button>
      </div>

      <div class="space-y-3">
        <div>
          <label
            class="block text-xs font-mono font-bold uppercase tracking-wider text-theme-muted mb-1"
          >
            Passage Type
          </label>
          <select
            bind:value={selectedType}
            class="w-full bg-theme-surface/40 border border-theme-border/70 rounded-xl px-3 py-2 text-sm text-theme-text focus:border-theme-primary outline-none"
          >
            <option value="standard">Standard Passage (Solid)</option>
            <option value="hidden">Hidden / Secret Passage (Dashed 👁️)</option>
            <option value="conditional">Conditional / Locked (Solid 🔒)</option>
            <option value="vertical">Vertical Link / Stairs (Dotted 🪜)</option>
          </select>
        </div>

        <div>
          <label
            class="block text-xs font-mono font-bold uppercase tracking-wider text-theme-muted mb-1"
          >
            Lock / Key / Trap Condition
          </label>
          <input
            type="text"
            bind:value={condition}
            placeholder="e.g. Requires Bronze Key, Poison Dart Trap"
            class="w-full bg-theme-surface/40 border border-theme-border/70 rounded-xl px-3 py-2 text-sm text-theme-text focus:border-theme-primary outline-none"
          />
        </div>

        <div>
          <label
            class="block text-xs font-mono font-bold uppercase tracking-wider text-theme-muted mb-1"
          >
            Passage Description
          </label>
          <input
            type="text"
            bind:value={description}
            placeholder="e.g. Heavy iron grate, Narrow stone fissure"
            class="w-full bg-theme-surface/40 border border-theme-border/70 rounded-xl px-3 py-2 text-sm text-theme-text focus:border-theme-primary outline-none"
          />
        </div>

        <div class="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="bidirectional-chk"
            bind:checked={isBidirectional}
            class="accent-theme-primary rounded"
          />
          <label
            for="bidirectional-chk"
            class="text-xs text-theme-text cursor-pointer select-none"
          >
            Two-Way Passage (Uncheck for one-way slide/chute)
          </label>
        </div>
      </div>

      <div
        class="flex items-center justify-end gap-2 pt-3 border-t border-theme-border/60"
      >
        <button
          type="button"
          onclick={onClose}
          class="px-4 py-2 text-xs font-bold font-header uppercase tracking-wider text-theme-muted hover:text-theme-text transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onclick={handleSave}
          class="px-4 py-2 bg-theme-primary text-theme-bg text-xs font-bold font-header uppercase tracking-wider rounded-xl hover:brightness-110 transition-all shadow"
        >
          Save Passage
        </button>
      </div>
    </div>
  </div>
{/if}
