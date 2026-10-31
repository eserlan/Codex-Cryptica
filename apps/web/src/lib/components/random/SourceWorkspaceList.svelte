<script lang="ts">
  import type { RandomSource } from "random-source-engine";
  import { createLongPressTracker } from "./long-press-tracker";
  import {
    collectLabels,
    countOf,
    filterSources,
  } from "./source-workspace-filter";
  let {
    kind,
    all,
    draft,
    selectedId,
    listOpen,
    allowImport,
    onCreate,
    onGenerate,
    onImport,
    onExport,
    onSelect,
    onContextMenu,
  }: {
    kind: "table" | "deck";
    all: RandomSource[];
    draft?: RandomSource;
    selectedId?: string;
    listOpen: boolean;
    allowImport: boolean;
    onCreate: () => void;
    onGenerate: () => void;
    onImport: () => void;
    onExport: () => void;
    onSelect: (source: RandomSource) => void;
    onContextMenu: (source: RandomSource, x: number, y: number) => void;
  } = $props();
  const noun = $derived(kind === "table" ? "table" : "deck");
  let query = $state("");
  let activeLabels = $state<string[]>([]);
  const labels = $derived(collectLabels(all));

  const visible = $derived.by(() => filterSources(all, query, activeLabels));

  function toggleLabel(label: string) {
    activeLabels = activeLabels.includes(label)
      ? activeLabels.filter((l) => l !== label)
      : [...activeLabels, label];
  }

  function openContextMenu(e: MouseEvent, source: RandomSource) {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu(source, e.clientX, e.clientY);
  }

  const longPress = createLongPressTracker<RandomSource>({
    onLongPress: (source, clientX, clientY) =>
      onContextMenu(source, clientX, clientY),
    vibrate: (ms) => {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(ms);
      }
    },
  });

  function handleItemTouchStart(e: TouchEvent, source: RandomSource) {
    const touch = e.touches?.[0];
    longPress.handleTouchStart(
      source,
      touch?.clientX ?? 0,
      touch?.clientY ?? 0,
    );
  }

  function handleItemTouchMove(e: TouchEvent) {
    const touch = e.touches[0];
    if (!touch) return;
    longPress.handleTouchMove(touch.clientX, touch.clientY);
  }

  function handleItemTouchEnd() {
    longPress.handleTouchEnd();
  }
</script>

<aside
  id="source-list"
  class="w-full shrink-0 flex-col gap-3 border-theme-border p-4 md:flex md:w-72 md:border-r {listOpen
    ? 'flex'
    : 'hidden'}"
>
  <input
    class="rounded border border-theme-border bg-theme-surface px-3 py-2 text-xs text-theme-text focus:border-theme-primary focus:outline-none"
    placeholder="Search {noun}s..."
    bind:value={query}
    data-testid="{noun}-search"
  />

  {#if labels.length > 0}
    <div class="flex flex-wrap gap-1.5">
      {#each labels as label}
        <button
          type="button"
          onclick={() => toggleLabel(label)}
          class="rounded px-2 py-0.5 font-mono text-micro tracking-wider transition-colors {activeLabels.includes(
            label,
          )
            ? 'bg-theme-primary text-theme-bg'
            : 'bg-theme-primary/10 text-theme-primary hover:bg-theme-primary/20'}"
        >
          {label}
        </button>
      {/each}
    </div>
  {/if}

  <button
    type="button"
    onclick={onCreate}
    class="flex items-center justify-center gap-2 rounded border border-theme-primary/30 bg-theme-primary/10 px-3 py-2 font-header text-micro font-bold uppercase tracking-widest text-theme-primary transition-all hover:bg-theme-primary hover:text-theme-bg"
    data-testid="new-{noun}"
  >
    <span aria-hidden="true" class="icon-[lucide--plus] h-3.5 w-3.5"></span>
    New {noun}
  </button>

  {#if kind === "table"}
    <button
      type="button"
      onclick={onGenerate}
      class="flex items-center justify-center gap-2 rounded border border-theme-border px-3 py-2 font-header text-micro font-bold uppercase tracking-widest text-theme-text transition-colors hover:border-theme-primary hover:text-theme-primary"
      data-testid="generate-table-btn"
    >
      <span
        aria-hidden="true"
        class="icon-[lucide--sparkles] h-3.5 w-3.5 text-theme-primary"
      ></span>
      Generate with AI
    </button>
  {/if}

  {#if allowImport}
    <button
      type="button"
      onclick={onImport}
      class="flex items-center justify-center gap-2 rounded border border-theme-border px-3 py-2 font-header text-micro font-bold uppercase tracking-widest text-theme-text transition-colors hover:border-theme-primary hover:text-theme-primary"
      data-testid="open-import"
    >
      <span
        aria-hidden="true"
        class="icon-[lucide--clipboard-paste] h-3.5 w-3.5"
      ></span>
      Import
    </button>
  {/if}

  <!-- Beside Import, because they are the same job in two directions.
           Disabled rather than hidden when nothing is open, so it is
           discoverable before it is needed (issue 2263). -->
  <button
    type="button"
    onclick={onExport}
    disabled={!draft}
    title={draft ? `Export "${draft.name}"` : `Open a ${noun} to export it`}
    class="flex items-center justify-center gap-2 rounded border border-theme-border px-3 py-2 font-header text-micro font-bold uppercase tracking-widest text-theme-text transition-colors hover:border-theme-primary hover:text-theme-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-theme-border disabled:hover:text-theme-text"
    data-testid="open-export"
  >
    <span aria-hidden="true" class="icon-[lucide--download] h-3.5 w-3.5"></span>
    Export
  </button>

  <ul class="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
    {#each visible as source (source.id)}
      {@const isSelected = selectedId === source.id}
      <li
        class="group relative flex items-center justify-between rounded px-2 py-1.5 text-xs transition-colors select-none {isSelected
          ? 'bg-theme-primary/15 text-theme-primary font-medium'
          : 'text-theme-text hover:bg-theme-surface'}"
        oncontextmenu={(e) => openContextMenu(e, source)}
        ontouchstart={(e) => handleItemTouchStart(e, source)}
        ontouchmove={handleItemTouchMove}
        ontouchend={handleItemTouchEnd}
        ontouchcancel={handleItemTouchEnd}
      >
        <button
          type="button"
          onclick={() => {
            if (longPress.consumeTriggered()) return;
            onSelect(source);
          }}
          class="flex flex-1 min-w-0 items-center justify-between text-left focus:outline-none"
          data-testid="{noun}-list-item"
        >
          <span class="truncate pr-1">{source.name}</span>
          <span class="ml-1 font-mono text-nano text-theme-muted/60 shrink-0">
            {countOf(kind, source)}
          </span>
        </button>

        <button
          type="button"
          onclick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            onContextMenu(source, rect.right, rect.bottom);
          }}
          class="ml-1 flex h-7 w-7 sm:h-6 sm:w-6 shrink-0 items-center justify-center rounded p-1 text-theme-muted opacity-100 sm:opacity-0 transition-opacity hover:bg-theme-bg hover:text-theme-text group-hover:opacity-100 focus:opacity-100 active:scale-95"
          aria-label="Actions for {source.name}"
          data-testid="item-actions-{source.id}"
        >
          <span
            aria-hidden="true"
            class="icon-[lucide--more-vertical] h-3.5 w-3.5"
          ></span>
        </button>
      </li>
    {/each}
  </ul>
</aside>
