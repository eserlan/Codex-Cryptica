<script lang="ts">
  import CategoryFilter from "$lib/components/labels/CategoryFilter.svelte";
  import { canvasRegistry } from "$lib/stores/canvas-registry.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import {
    CANVAS_DRAWING_WIDTH_PRESETS,
    DEFAULT_CANVAS_DRAWING_WIDTH,
  } from "@codex/canvas-engine";

  let {
    canvasName,
    sourceEntityId,
    sourceEntityTitle,
    sourceEntityType,
    sourceEntityKind,
    dossierEntityId,
    isFinalizingDossier = false,
    onFinalizeDossier,
    onOpenOrCreateSourceEntity,
    onAutoArrange,
    onUploadFiles,
    onAddTextNode,
    isDrawingMode = false,
    isErasingMode = false,
    drawingColor = "#f97316",
    drawingWidth = DEFAULT_CANVAS_DRAWING_WIDTH,
    onToggleDrawing,
    onToggleErasing,
    onDrawingColorChange,
    onDrawingWidthChange,
    onAddAdventureNode,
    activeCategories,
    onToggleCategory,
    onClearCategories,
    showMinimap = true,
    onToggleMinimap,
  } = $props<{
    canvasName: string;
    sourceEntityId?: string;
    sourceEntityTitle?: string;
    sourceEntityType?: string;
    sourceEntityKind?: string;
    dossierEntityId?: string;
    isFinalizingDossier?: boolean;
    onFinalizeDossier?: () => void;
    onOpenOrCreateSourceEntity?: () => void;
    onAutoArrange?: () => void;
    onUploadFiles?: (files: File[]) => void | Promise<void>;
    onAddTextNode?: () => void;
    isDrawingMode?: boolean;
    isErasingMode?: boolean;
    drawingColor?: string;
    drawingWidth?: number;
    onToggleDrawing?: () => void;
    onToggleErasing?: () => void;
    onDrawingColorChange?: (color: string) => void;
    onDrawingWidthChange?: (width: number) => void;
    onAddAdventureNode?: (
      type: "location" | "npc" | "clue" | "threat" | "outcome" | "situation",
    ) => void;
    activeCategories: Set<string>;
    onToggleCategory: (categoryId: string) => void;
    onClearCategories: () => void;
    showMinimap?: boolean;
    onToggleMinimap?: () => void;
  }>();

  let isAddMenuOpen = $state(false);
  let isStrokeWidthMenuOpen = $state(false);
  let strokeWidthMenuEl = $state<HTMLDivElement>();
  let fileInput = $state<HTMLInputElement>();

  function openStrokeWidthMenu(event: MouseEvent) {
    if (!onDrawingWidthChange) return;
    event.preventDefault();
    isStrokeWidthMenuOpen = true;
  }

  $effect(() => {
    if (!isStrokeWidthMenuOpen) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        strokeWidthMenuEl &&
        !strokeWidthMenuEl.contains(event.target as Node)
      ) {
        isStrokeWidthMenuOpen = false;
      }
    };
    const timer = setTimeout(() => {
      window.addEventListener("click", handleOutsideClick);
      window.addEventListener("contextmenu", handleOutsideClick);
    }, 10);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("click", handleOutsideClick);
      window.removeEventListener("contextmenu", handleOutsideClick);
    };
  });

  async function handleFileSelection(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    if (input.files?.length) await onUploadFiles?.(Array.from(input.files));
    input.value = "";
  }

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
  <div class="pointer-events-auto flex items-center gap-1.5">
    <button
      type="button"
      onclick={() => (modalUIStore.showCanvasSelector = true)}
      title="Manage canvases"
      class="h-8 bg-theme-surface/80 backdrop-blur-md border border-theme-primary/30 px-5 shadow-[0_0_20px_rgba(var(--theme-primary-rgb),0.15)] pointer-events-auto transition-all hover:border-theme-primary/60 group flex items-center gap-2"
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

    {#if onAutoArrange}
      <button
        type="button"
        onclick={onAutoArrange}
        title="Auto-arrange spatial node layout"
        aria-label="Auto-arrange spatial node layout"
        class="flex h-8 w-8 items-center justify-center bg-theme-surface/80 backdrop-blur-md border border-theme-primary/30 shadow-sm pointer-events-auto transition-all hover:border-theme-primary text-theme-muted hover:text-theme-primary"
      >
        <span class="icon-[lucide--wand-2] w-4 h-4" aria-hidden="true"></span>
      </button>
    {/if}

    {#if onToggleMinimap}
      <button
        type="button"
        onclick={onToggleMinimap}
        title={showMinimap ? "Hide minimap" : "Show minimap"}
        aria-label={showMinimap ? "Hide minimap" : "Show minimap"}
        aria-pressed={showMinimap}
        class="hidden sm:flex h-8 w-8 items-center justify-center bg-theme-surface/80 backdrop-blur-md border border-theme-primary/30 shadow-sm pointer-events-auto transition-all hover:border-theme-primary text-theme-muted hover:text-theme-primary {showMinimap
          ? 'border-theme-primary bg-theme-primary/15 text-theme-primary'
          : ''}"
      >
        <span class="icon-[lucide--map] w-4 h-4" aria-hidden="true"></span>
      </button>
    {/if}

    {#if onUploadFiles}
      <button
        type="button"
        onclick={() => fileInput?.click()}
        title="Upload files to canvas"
        aria-label="Upload files to canvas"
        class="hidden sm:flex h-8 w-8 items-center justify-center bg-theme-surface/80 backdrop-blur-md border border-theme-primary/30 shadow-sm pointer-events-auto transition-all hover:border-theme-primary text-theme-muted hover:text-theme-primary"
      >
        <span class="icon-[lucide--upload] w-4 h-4" aria-hidden="true"></span>
      </button>
      <input
        bind:this={fileInput}
        type="file"
        multiple
        class="sr-only"
        aria-label="Choose files to upload to canvas"
        onchange={handleFileSelection}
      />
    {/if}

    {#if onAddTextNode}
      <button
        type="button"
        onclick={onAddTextNode}
        title="Add a text note to canvas"
        aria-label="Add a text note to canvas"
        class="flex h-8 w-8 items-center justify-center bg-theme-surface/80 backdrop-blur-md border border-theme-primary/30 shadow-sm pointer-events-auto transition-all hover:border-theme-primary text-theme-muted hover:text-theme-primary"
      >
        <span class="icon-[lucide--sticky-note] w-4 h-4" aria-hidden="true"
        ></span>
      </button>
    {/if}

    {#if onToggleDrawing}
      <div class="relative pointer-events-auto">
        <button
          type="button"
          onclick={onToggleDrawing}
          oncontextmenu={openStrokeWidthMenu}
          title={isDrawingMode
            ? "Exit drawing mode"
            : "Draw on canvas (right-click or long-press for stroke width)"}
          aria-label={isDrawingMode ? "Exit drawing mode" : "Draw on canvas"}
          aria-pressed={isDrawingMode}
          class="flex h-8 w-8 items-center justify-center bg-theme-surface/80 backdrop-blur-md border border-theme-primary/30 shadow-sm pointer-events-auto transition-all hover:border-theme-primary text-theme-muted hover:text-theme-primary {isDrawingMode
            ? 'border-theme-primary bg-theme-primary/15 text-theme-primary'
            : ''}"
        >
          <span class="icon-[lucide--pencil] h-4 w-4" aria-hidden="true"></span>
        </button>

        {#if isStrokeWidthMenuOpen && onDrawingWidthChange}
          <div
            bind:this={strokeWidthMenuEl}
            role="menu"
            aria-label="Stroke width"
            class="absolute top-full left-0 mt-1 z-50 flex items-center gap-1 bg-theme-surface border border-theme-border shadow-xl rounded-lg p-1.5 pointer-events-auto"
          >
            {#each CANVAS_DRAWING_WIDTH_PRESETS as width (width)}
              <button
                type="button"
                role="menuitemradio"
                aria-checked={drawingWidth === width}
                title={`${width}px stroke`}
                onclick={() => {
                  onDrawingWidthChange(width);
                  isStrokeWidthMenuOpen = false;
                }}
                class="flex h-8 w-8 items-center justify-center rounded transition-colors hover:bg-theme-primary/10 {drawingWidth ===
                width
                  ? 'bg-theme-primary/15 ring-1 ring-theme-primary'
                  : ''}"
              >
                <span
                  class="rounded-full bg-theme-primary"
                  style:width="{Math.min(width, 16)}px"
                  style:height="{Math.min(width, 16)}px"
                  aria-hidden="true"
                ></span>
              </button>
            {/each}
          </div>
        {/if}
      </div>
      {#if onToggleErasing}
        <button
          type="button"
          onclick={onToggleErasing}
          title={isErasingMode ? "Exit eraser mode" : "Erase a drawing stroke"}
          aria-label={isErasingMode
            ? "Exit eraser mode"
            : "Erase a drawing stroke"}
          aria-pressed={isErasingMode}
          class="flex h-8 w-8 items-center justify-center bg-theme-surface/80 backdrop-blur-md border border-theme-primary/30 shadow-sm pointer-events-auto transition-all hover:border-theme-primary text-theme-muted hover:text-theme-primary {isErasingMode
            ? 'border-theme-primary bg-theme-primary/15 text-theme-primary'
            : ''}"
        >
          <span class="icon-[lucide--eraser] h-4 w-4" aria-hidden="true"></span>
        </button>
      {/if}
      <label
        class="flex h-8 w-8 items-center justify-center overflow-hidden border border-theme-primary/30 bg-theme-surface/80 shadow-sm backdrop-blur-md"
        title="Drawing color"
      >
        <span class="sr-only">Drawing color</span>
        <input
          type="color"
          value={drawingColor}
          aria-label="Drawing color"
          class="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
          oninput={(event) =>
            onDrawingColorChange?.(
              (event.currentTarget as HTMLInputElement).value,
            )}
        />
      </label>
    {/if}

    {#if onAddAdventureNode}
      <div class="relative pointer-events-auto">
        <button
          type="button"
          onclick={() => (isAddMenuOpen = !isAddMenuOpen)}
          title="Add element to canvas"
          class="h-8 bg-theme-surface/80 backdrop-blur-md border border-theme-primary/30 px-3 shadow-sm pointer-events-auto transition-all hover:border-theme-primary text-theme-primary flex items-center gap-1.5 text-xs font-semibold"
        >
          <span class="icon-[lucide--plus] w-4 h-4" aria-hidden="true"></span>
          Add Element
          <span
            class="icon-[lucide--chevron-down] w-3 h-3 text-theme-muted"
            aria-hidden="true"
          ></span>
        </button>

        {#if isAddMenuOpen}
          <div
            class="absolute top-full left-0 mt-1 z-50 bg-theme-surface border border-theme-border shadow-xl rounded-lg overflow-hidden py-1 min-w-[160px]"
          >
            <button
              type="button"
              class="w-full text-left px-3 py-1.5 text-xs text-theme-text hover:bg-theme-primary/10 flex items-center gap-2"
              onclick={() => {
                onAddAdventureNode("location");
                isAddMenuOpen = false;
              }}
            >
              <span class="icon-[lucide--map-pin] w-3.5 h-3.5 text-amber-400"
              ></span>
              Location
            </button>
            <button
              type="button"
              class="w-full text-left px-3 py-1.5 text-xs text-theme-text hover:bg-theme-primary/10 flex items-center gap-2"
              onclick={() => {
                onAddAdventureNode("npc");
                isAddMenuOpen = false;
              }}
            >
              <span class="icon-[lucide--users] w-3.5 h-3.5 text-blue-400"
              ></span>
              NPC / Faction
            </button>
            <button
              type="button"
              class="w-full text-left px-3 py-1.5 text-xs text-theme-text hover:bg-theme-primary/10 flex items-center gap-2"
              onclick={() => {
                onAddAdventureNode("clue");
                isAddMenuOpen = false;
              }}
            >
              <span class="icon-[lucide--search] w-3.5 h-3.5 text-emerald-400"
              ></span>
              Clue / Secret
            </button>
            <button
              type="button"
              class="w-full text-left px-3 py-1.5 text-xs text-theme-text hover:bg-theme-primary/10 flex items-center gap-2"
              onclick={() => {
                onAddAdventureNode("threat");
                isAddMenuOpen = false;
              }}
            >
              <span class="icon-[lucide--skull] w-3.5 h-3.5 text-rose-400"
              ></span>
              Threat
            </button>
            <button
              type="button"
              class="w-full text-left px-3 py-1.5 text-xs text-theme-text hover:bg-theme-primary/10 flex items-center gap-2"
              onclick={() => {
                onAddAdventureNode("outcome");
                isAddMenuOpen = false;
              }}
            >
              <span class="icon-[lucide--flag] w-3.5 h-3.5 text-cyan-400"
              ></span>
              Outcome
            </button>
            <button
              type="button"
              class="w-full text-left px-3 py-1.5 text-xs text-theme-text hover:bg-theme-primary/10 flex items-center gap-2"
              onclick={() => {
                onAddAdventureNode("situation");
                isAddMenuOpen = false;
              }}
            >
              <span class="icon-[lucide--play] w-3.5 h-3.5 text-purple-400"
              ></span>
              Situation
            </button>
          </div>
        {/if}
      </div>
    {/if}
  </div>

  {#if sourceEntityId || isAdventure}
    <div class="pointer-events-auto flex max-w-72 items-stretch gap-1">
      <button
        type="button"
        onclick={() => {
          if (onOpenOrCreateSourceEntity) {
            onOpenOrCreateSourceEntity();
          } else if (sourceEntityId) {
            modalUIStore.openZenMode(sourceEntityId);
          }
        }}
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

{#if onUploadFiles}
  <button
    type="button"
    onclick={() => fileInput?.click()}
    title="Upload files from your device"
    aria-label="Upload files from device"
    data-testid="canvas-fab-upload"
    class="absolute bottom-6 right-24 z-40 flex h-14 items-center gap-2 rounded-full border border-theme-primary/30 bg-theme-surface px-4 text-sm font-semibold text-theme-text shadow-[0_4px_20px_rgba(var(--theme-primary-rgb),0.25)] transition-all hover:border-theme-primary hover:text-theme-primary pointer-events-auto sm:hidden"
  >
    <span class="icon-[lucide--upload] h-5 w-5" aria-hidden="true"></span>
    Upload
  </button>
{/if}

<!-- Guided Mode floating action button (#1909, FR-006). -->
<button
  type="button"
  onclick={() => modalUIStore.openIntentCreateMenu()}
  title="Create"
  aria-label="Create new entity"
  data-testid="canvas-fab-create"
  class="absolute bottom-6 right-6 z-40 flex items-center justify-center w-14 h-14 rounded-full bg-theme-primary text-theme-bg shadow-[0_4px_20px_rgba(var(--theme-primary-rgb),0.4)] hover:brightness-110 transition-all pointer-events-auto"
>
  <span class="icon-[lucide--plus] w-6 h-6" aria-hidden="true"></span>
</button>
