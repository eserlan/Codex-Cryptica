<script lang="ts">
  import type { SourceMode } from "./source-workspace";
  let {
    noun,
    mode,
    onRename,
    onDuplicate,
    onDelete,
    onMode,
  }: {
    noun: string;
    mode: SourceMode;
    onRename: () => void;
    onDuplicate: () => void;
    onDelete: () => void;
    onMode: (mode: SourceMode) => void;
  } = $props();
</script>

<div
  class="mb-3 flex items-center justify-between border-b border-theme-border pb-2"
>
  <div class="flex items-center gap-2">
    <button
      type="button"
      onclick={onRename}
      class="flex items-center gap-1 rounded border border-theme-border px-2 py-1 font-header text-micro uppercase tracking-wider text-theme-muted transition-colors hover:border-theme-primary hover:text-theme-primary"
      title="Rename {noun}"
      data-testid="header-rename-{noun}"
    >
      <span aria-hidden="true" class="icon-[lucide--pencil] h-3 w-3"></span>
      <span>Rename</span>
    </button>
    <button
      type="button"
      onclick={onDuplicate}
      class="flex items-center gap-1 rounded border border-theme-border px-2 py-1 font-header text-micro uppercase tracking-wider text-theme-muted transition-colors hover:border-theme-primary hover:text-theme-primary"
      title="Duplicate {noun}"
      data-testid="header-duplicate-{noun}"
    >
      <span aria-hidden="true" class="icon-[lucide--copy] h-3 w-3"></span>
      <span>Duplicate</span>
    </button>
  </div>
  <div class="flex items-center gap-2">
    <button
      type="button"
      onclick={() => onMode(mode === "use" ? "build" : "use")}
      class="flex items-center gap-1.5 rounded bg-theme-primary/10 px-2.5 py-1 font-header text-micro font-bold uppercase tracking-wider text-theme-primary transition-colors hover:bg-theme-primary hover:text-theme-bg"
      data-testid="header-{mode === 'use' ? 'edit' : 'use'}-{noun}"
    >
      <span
        aria-hidden="true"
        class="{mode === 'use'
          ? 'icon-[lucide--pencil-ruler]'
          : 'icon-[lucide--dices]'} h-3 w-3"
      ></span>
      <span>{mode === "use" ? "Edit" : "Use"} {noun}</span>
    </button>
    <button
      type="button"
      onclick={onDelete}
      class={mode === "use"
        ? "flex items-center gap-1 rounded border border-theme-border px-2 py-1 font-header text-micro uppercase tracking-wider text-theme-muted transition-colors hover:border-red-500 hover:text-red-500"
        : "flex items-center gap-1.5 rounded border border-theme-border px-2.5 py-1 font-header text-micro uppercase tracking-widest text-theme-muted transition-colors hover:border-red-500 hover:text-red-500"}
      title={mode === "use" ? `Delete ${noun}` : undefined}
      data-testid={mode === "use" ? `header-delete-${noun}` : `delete-${noun}`}
    >
      <span aria-hidden="true" class="icon-[lucide--trash-2] h-3 w-3"></span>
      <span>Delete</span>
    </button>
  </div>
</div>
