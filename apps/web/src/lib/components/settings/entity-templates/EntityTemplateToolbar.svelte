<script lang="ts">
  import { resolve } from "$app/paths";

  let {
    canEdit,
    onNew,
    onImportFile,
  }: {
    canEdit: boolean;
    onNew: () => void;
    onImportFile: (e: Event) => void;
  } = $props();

  let fileInput: HTMLInputElement | undefined = $state();
</script>

<div class="flex flex-wrap items-center justify-between gap-3">
  <h4
    class="text-xs font-bold text-theme-primary uppercase font-header tracking-[0.2em]"
  >
    Entity Templates
  </h4>
  <div class="flex flex-wrap items-center gap-2">
    <a
      href={resolve("/templates?kind=entity" as any)}
      class="inline-flex items-center gap-1.5 rounded border border-theme-primary/40 px-2.5 py-1.5 text-micro font-bold uppercase tracking-wide text-theme-primary transition-colors hover:border-theme-primary hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary"
      data-testid="browse-community-entity-templates"
    >
      <span class="icon-[lucide--users-round] h-3.5 w-3.5" aria-hidden="true"
      ></span>
      Browse community templates
    </a>
    {#if canEdit}
      <button
        type="button"
        class="inline-flex items-center gap-1 rounded border border-theme-border px-2 py-1 text-micro font-bold uppercase tracking-wide text-theme-muted transition-colors hover:border-theme-primary/40 hover:text-theme-text"
        onclick={() => fileInput?.click()}
        data-testid="entity-template-import"
      >
        <span class="icon-[lucide--upload] h-3 w-3" aria-hidden="true"></span>
        Import
      </button>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded bg-theme-primary px-2.5 py-1.5 text-micro font-bold uppercase tracking-wide text-theme-bg hover:brightness-110"
        onclick={onNew}
        data-testid="entity-template-new"
      >
        <span class="icon-[lucide--plus] h-3.5 w-3.5" aria-hidden="true"></span>
        New template
      </button>
      <input
        bind:this={fileInput}
        type="file"
        accept=".json,application/json"
        class="hidden"
        onchange={onImportFile}
        data-testid="entity-template-import-input"
      />
    {/if}
  </div>
</div>
