<script lang="ts">
  import CategoryFilter from "$lib/components/labels/CategoryFilter.svelte";
  import { canvasRegistry } from "$lib/stores/canvas-registry.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";

  let {
    canvasName,
    sourceEntityId,
    sourceEntityTitle,
    sourceEntityType,
    sourceEntityKind,
    dossierEntityId,
    isFinalizingDossier = false,
    onFinalizeDossier,
    activeCategories,
    onToggleCategory,
    onClearCategories,
  } = $props<{
    canvasName: string;
    sourceEntityId?: string;
    sourceEntityTitle?: string;
    sourceEntityType?: string;
    sourceEntityKind?: string;
    dossierEntityId?: string;
    isFinalizingDossier?: boolean;
    onFinalizeDossier?: () => void;
    activeCategories: Set<string>;
    onToggleCategory: (categoryId: string) => void;
    onClearCategories: () => void;
  }>();

  const isAdventure = $derived(
    sourceEntityType === "event" || sourceEntityKind === "adventure",
  );
  const sourceIcon = $derived(
    isAdventure ? "icon-[lucide--scroll]" : "icon-[lucide--map-pin]",
  );
  const sourceLocationLabel = $derived(
    sourceEntityTitle || (isAdventure ? "Source Adventure" : "Source Location"),
  );
  const ariaLabel = $derived(
    isAdventure
      ? `Open Adventure: ${sourceLocationLabel}`
      : `Open Location: ${sourceLocationLabel}`,
  );
  const buttonText = $derived.by(() => {
    if (sourceEntityTitle) return `Open ${sourceEntityTitle}`;
    return isAdventure ? "Open Adventure Note" : "Open Location Note";
  });
</script>

<div
  class="absolute top-6 left-6 z-40 flex flex-col items-start gap-2 pointer-events-none select-none"
>
  <button
    type="button"
    onclick={() => (modalUIStore.showCanvasSelector = true)}
    title="Manage canvases"
    class="bg-theme-surface/80 backdrop-blur-md border border-theme-primary/30 px-5 py-2 shadow-[0_0_20px_rgba(var(--theme-primary-rgb),0.15)] pointer-events-auto transition-all hover:border-theme-primary/60 group flex items-center gap-2"
  >
    <span
      class="text-xs font-black text-theme-primary uppercase tracking-[0.4em] group-hover:text-theme-accent transition-colors"
    >
      {canvasName || "Untitled Workspace"}
    </span>
    <span
      class="icon-[lucide--layout-grid] w-3 h-3 text-theme-primary/50 group-hover:text-theme-accent transition-colors shrink-0"
    ></span>
  </button>

  {#if sourceEntityId}
    <div class="pointer-events-auto flex max-w-72 items-stretch gap-1">
      <button
        type="button"
        onclick={() => modalUIStore.openZenMode(sourceEntityId)}
        aria-label={ariaLabel}
        title={ariaLabel}
        class="group inline-flex min-w-0 items-center gap-2 border border-theme-border bg-theme-surface/85 px-3 py-1.5 text-left shadow-lg backdrop-blur-md transition-colors hover:border-theme-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary"
      >
        <span
          class="{sourceIcon} h-3.5 w-3.5 shrink-0 text-theme-primary"
          aria-hidden="true"
        ></span>
        <span
          class="truncate text-[10px] font-bold uppercase tracking-wider text-theme-text group-hover:text-theme-primary"
        >
          {buttonText}
        </span>
        <span
          class="icon-[lucide--external-link] h-3 w-3 shrink-0 text-theme-muted group-hover:text-theme-primary"
          aria-hidden="true"
        ></span>
      </button>
    </div>
  {/if}

  {#if onFinalizeDossier}
    <div class="pointer-events-auto flex max-w-72 items-stretch gap-1">
      {#if dossierEntityId}
        <button
          type="button"
          onclick={() => modalUIStore.openZenMode(dossierEntityId)}
          class="group inline-flex min-w-0 items-center gap-2 border border-theme-primary/50 bg-theme-surface/90 px-3 py-1.5 text-left shadow-lg backdrop-blur-md transition-colors hover:border-theme-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary"
        >
          <span
            class="icon-[lucide--book-open-text] h-3.5 w-3.5 shrink-0 text-theme-primary"
            aria-hidden="true"
          ></span>
          <span
            class="truncate text-[10px] font-bold uppercase tracking-wider text-theme-text group-hover:text-theme-primary"
          >
            Open Dossier
          </span>
        </button>
        <button
          type="button"
          onclick={onFinalizeDossier}
          disabled={isFinalizingDossier}
          aria-label="Update delve dossier"
          title="Update dossier from the current canvas"
          class="inline-flex items-center justify-center border border-theme-primary/50 bg-theme-surface/90 px-2 text-theme-primary shadow-lg backdrop-blur-md transition-colors hover:bg-theme-primary hover:text-theme-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary disabled:cursor-wait disabled:opacity-50"
        >
          <span
            class={isFinalizingDossier
              ? "icon-[lucide--loader-circle] h-3.5 w-3.5 animate-spin"
              : "icon-[lucide--refresh-cw] h-3.5 w-3.5"}
            aria-hidden="true"
          ></span>
        </button>
      {:else}
        <button
          type="button"
          onclick={onFinalizeDossier}
          disabled={isFinalizingDossier}
          class="group inline-flex min-w-0 items-center gap-2 border border-theme-primary/50 bg-theme-surface/90 px-3 py-1.5 text-left shadow-lg backdrop-blur-md transition-colors hover:border-theme-primary hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary disabled:cursor-wait disabled:opacity-50"
        >
          <span
            class={isFinalizingDossier
              ? "icon-[lucide--loader-circle] h-3.5 w-3.5 animate-spin text-theme-primary"
              : "icon-[lucide--book-check] h-3.5 w-3.5 text-theme-primary"}
            aria-hidden="true"
          ></span>
          <span
            class="truncate text-[10px] font-bold uppercase tracking-wider text-theme-text group-hover:text-theme-primary"
          >
            Finalize Dossier
          </span>
        </button>
      {/if}
    </div>
  {/if}

  <div class="pointer-events-auto">
    <CategoryFilter
      {activeCategories}
      onToggle={onToggleCategory}
      onClear={onClearCategories}
    />
  </div>

  {#if canvasRegistry.status === "saving"}
    <div
      class="flex items-center gap-2 px-3 py-1 bg-theme-primary/10 border border-theme-primary/20 backdrop-blur-sm animate-pulse"
    >
      <span class="icon-[lucide--save] w-3 h-3 text-theme-primary"></span>
      <span
        class="text-[8px] font-bold text-theme-primary tracking-[0.2em] uppercase"
      >
        Syncing...
      </span>
    </div>
  {/if}
</div>
