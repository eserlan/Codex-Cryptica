<script lang="ts">
  import { untrack } from "svelte";
  import type { RandomSource } from "random-source-engine";

  /**
   * Name and labels, shared by the table and deck editors (#2247).
   *
   * A rename commits on blur or Enter rather than per keystroke: it moves the
   * file and may break other sources' references, so it is a decision, not a
   * side effect of typing (FR-042).
   */
  let {
    source,
    onChange,
    onRename,
  }: {
    source: RandomSource;
    onChange: (next: RandomSource) => void;
    /** Returns false when the parent must ask the user before renaming. */
    onRename?: (name: string) => boolean;
  } = $props();

  let lastCommittedName = $state(source.name);
  let nameDraft = $state(source.name);
  let labelDraft = $state("");

  // Follows the source: another source selected, or a rename that landed.
  $effect(() => {
    const name = source.name;
    untrack(() => {
      if (name !== lastCommittedName) {
        lastCommittedName = name;
        nameDraft = name;
      }
    });
  });

  function commitName() {
    const name = nameDraft.trim();
    if (!name || name === source.name) {
      nameDraft = source.name;
      return;
    }
    lastCommittedName = name;
    if (!onRename) {
      onChange({ ...source, name });
      return;
    }
    if (!onRename(name)) {
      nameDraft = source.name;
      lastCommittedName = source.name;
    }
  }

  function addLabel() {
    const label = labelDraft.trim();
    labelDraft = "";
    if (!label || source.labels.includes(label)) return;
    onChange({ ...source, labels: [...source.labels, label] });
  }

  function removeLabel(label: string) {
    onChange({ ...source, labels: source.labels.filter((l) => l !== label) });
  }
</script>

<label class="flex flex-col gap-1">
  <span
    class="font-header text-[9px] font-bold uppercase tracking-[0.2em] text-theme-muted"
    >Name</span
  >
  <input
    class="rounded border border-theme-border bg-theme-bg px-3 py-2 font-header text-sm text-theme-text focus:border-theme-primary focus:outline-none"
    bind:value={nameDraft}
    onblur={commitName}
    onkeydown={(e) => {
      if (e.key === "Enter") e.currentTarget.blur();
    }}
    data-testid="{source.kind}-name"
  />
</label>

<div class="flex flex-col gap-1">
  <span
    class="font-header text-[9px] font-bold uppercase tracking-[0.2em] text-theme-muted"
    >Labels</span
  >
  <div class="flex flex-wrap items-center gap-1.5">
    {#each source.labels as label}
      <span
        class="flex items-center gap-1 rounded bg-theme-primary/10 px-2 py-0.5 font-mono text-[10px] tracking-wider text-theme-primary"
      >
        {label}
        <button
          type="button"
          onclick={() => removeLabel(label)}
          aria-label="Remove label {label}"
          class="opacity-60 transition-opacity hover:opacity-100"
        >
          <span aria-hidden="true" class="icon-[lucide--x] h-3 w-3"></span>
        </button>
      </span>
    {/each}
    <input
      class="min-w-[8rem] flex-1 rounded border border-theme-border bg-theme-bg px-2 py-1 font-body text-xs text-theme-text focus:border-theme-primary focus:outline-none"
      placeholder="Add label..."
      bind:value={labelDraft}
      onkeydown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          addLabel();
        }
      }}
      onblur={addLabel}
      data-testid="{source.kind}-label-input"
    />
  </div>
</div>

<style>
  @reference "../../../app.css";
</style>
