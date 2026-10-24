<script lang="ts">
  import type { StatSheetTemplate } from "schema";
  import { deriveFieldDisplayOverrides } from "./editor-source";
  import { useVisualLayout } from "./use-visual-layout.svelte";
  import type { VisualCard } from "./visual-card-parser";
  import PresentationVisualCard from "./PresentationVisualCard.svelte";
  import PresentationFieldContextMenu from "./PresentationFieldContextMenu.svelte";

  let {
    schema,
    source = $bindable(),
    active = true,
  }: {
    schema: StatSheetTemplate;
    source: string;
    active?: boolean;
  } = $props();

  // Visual layout builder state derived from AST or built interactively

  const visualLayout = useVisualLayout({
    source: () => source,
    schemaFields: () => schema.fields,
    fieldDisplayOverrides: () => fieldDisplayOverrides,
    onSourceUpdate: (newSource: string) => {
      source = newSource;
    },
  });
  // Reconstructs per-field overrides (hide-label, non-default display mode)
  // from the raw saved source so reopening the visual editor doesn't start
  // from a blank slate — visualLayout.handleSyncSourceFromVisualCards() regenerates the whole
  // template from this map, so a stale/empty seed silently drops previously
  // saved overrides on the next visual edit.
  // svelte-ignore state_referenced_locally
  let fieldDisplayOverrides = $state<
    Record<string, { displayMode?: string; hideLabel?: boolean }>
  >(deriveFieldDisplayOverrides(source, schema.fields));
  let chipContextMenu = $state<{
    x: number;
    y: number;
    cardId: string;
    rowIndex: number;
    fieldId: string;
  } | null>(null);

  function openChipContextMenu(
    e: MouseEvent,
    cardId: string,
    rowIndex: number,
    fieldId: string,
  ) {
    e.preventDefault();
    e.stopPropagation();
    chipContextMenu = {
      x: e.clientX,
      y: e.clientY,
      cardId,
      rowIndex,
      fieldId,
    };
  }

  function openChipContextMenuFromKeyboard(
    e: KeyboardEvent,
    cardId: string,
    rowIndex: number,
    fieldId: string,
  ) {
    if (e.key !== "ContextMenu" && !(e.shiftKey && e.key === "F10")) return;
    e.preventDefault();
    const bounds = (e.currentTarget as HTMLElement).getBoundingClientRect();
    chipContextMenu = {
      x: bounds.left,
      y: bounds.bottom,
      cardId,
      rowIndex,
      fieldId,
    };
  }

  function closeChipContextMenu() {
    chipContextMenu = null;
  }

  function setFieldDisplayMode(fieldId: string, displayMode?: string) {
    fieldDisplayOverrides[fieldId] = {
      ...fieldDisplayOverrides[fieldId],
      displayMode,
    };
    visualLayout.handleSyncSourceFromVisualCards(visualLayout.visualCards);
    closeChipContextMenu();
  }

  function toggleFieldHideLabel(fieldId: string) {
    const current = fieldDisplayOverrides[fieldId]?.hideLabel ?? false;
    fieldDisplayOverrides[fieldId] = {
      ...fieldDisplayOverrides[fieldId],
      hideLabel: !current,
    };
    visualLayout.handleSyncSourceFromVisualCards(visualLayout.visualCards);
    closeChipContextMenu();
  }

  export function resetFromSource() {
    visualLayout.resetFromSource();
    fieldDisplayOverrides = deriveFieldDisplayOverrides(source, schema.fields);
  }

  const fieldOptions = {
    get overrides() {
      return fieldDisplayOverrides;
    },
    onContextMenu: openChipContextMenu,
    onKeyDown: openChipContextMenuFromKeyboard,
  };
  function updateCardTitle(card: VisualCard, title: string) {
    card.title = title;
    visualLayout.handleSyncSourceFromVisualCards(visualLayout.visualCards);
  }
</script>

{#if active}
  <div
    class="flex flex-1 gap-3 overflow-hidden"
    data-testid="presentation-editor-visual-builder"
  >
    <!-- Left Sidebar: Available Schema Fields Palette -->
    <div
      class="flex w-64 md:w-72 shrink-0 flex-col gap-2 overflow-y-auto rounded border border-theme-border bg-theme-surface/80 p-2.5 shadow-inner"
    >
      <div
        class="flex items-center justify-between border-b border-theme-border pb-1.5"
      >
        <span
          class="text-micro font-bold uppercase tracking-wider text-theme-muted"
        >
          Available Fields
        </span>
        <span
          class="rounded bg-theme-bg px-1.5 py-0.5 text-nano font-bold text-theme-primary"
        >
          {schema?.fields?.filter((f) => f.type !== "heading").length ?? 0}
        </span>
      </div>
      <p class="text-nano text-theme-muted leading-tight">
        Drag fields into any card row. You can reuse a field multiple times!
      </p>
      <div class="flex flex-col gap-1.5 mt-1">
        {#each schema?.fields?.filter((f) => f.type !== "heading") ?? [] as f (f.id)}
          <div
            role="button"
            tabindex="0"
            draggable="true"
            ondragstart={(e) =>
              visualLayout.handleSidebarFieldDragStart(e, f.id)}
            class="flex items-center justify-between gap-1 rounded border border-theme-border/70 bg-theme-bg px-2 py-1.5 text-xs text-theme-text font-medium cursor-grab active:cursor-grabbing hover:border-theme-primary/80 hover:bg-theme-primary/5 transition-all shadow-xs"
          >
            <div class="flex items-center gap-1.5 min-w-0">
              <span
                class="icon-[lucide--grip-vertical] h-3 w-3 text-theme-muted shrink-0"
                aria-hidden="true"
              ></span>
              <span class="truncate">{f.label}</span>
            </div>
            <span class="text-nano font-mono text-theme-muted shrink-0"
              >[{f.id}]</span
            >
          </div>
        {/each}
      </div>
    </div>

    <!-- Main Canvas: Section Cards & Rows -->
    <div
      class="flex flex-1 flex-col gap-3 overflow-y-auto rounded border border-theme-border bg-theme-bg/30 p-2"
    >
      {#each visualLayout.visualCards as card, idx (card.id)}
        <PresentationVisualCard
          {schema}
          {visualLayout}
          {card}
          {idx}
          {fieldOptions}
          onTitleChange={updateCardTitle}
        />
      {/each}

      <div class="flex gap-2">
        <button
          type="button"
          class="flex-1 rounded border border-dashed border-theme-border p-2 text-center text-xs font-bold text-theme-muted hover:border-theme-primary hover:text-theme-primary"
          onclick={() => visualLayout.addVisualCard("grid")}
          data-testid="presentation-editor-add-card"
        >
          + Add Grid Section
        </button>
        <button
          type="button"
          class="flex-1 rounded border border-dashed border-theme-border p-2 text-center text-xs font-bold text-theme-muted hover:border-theme-primary hover:text-theme-primary"
          onclick={() => visualLayout.addVisualCard("table")}
          data-testid="presentation-editor-add-table"
        >
          + Add Table Section
        </button>
      </div>
    </div>
  </div>
{/if}

{#if chipContextMenu}
  <PresentationFieldContextMenu
    x={chipContextMenu.x}
    y={chipContextMenu.y}
    fieldId={chipContextMenu.fieldId}
    targetField={schema?.fields?.find(
      (field) => field.id === chipContextMenu?.fieldId,
    )}
    currentOverride={fieldDisplayOverrides[chipContextMenu.fieldId]}
    onClose={closeChipContextMenu}
    onSetDisplayMode={setFieldDisplayMode}
    onToggleHideLabel={toggleFieldHideLabel}
  />
{/if}
