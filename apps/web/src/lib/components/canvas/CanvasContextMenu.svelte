<script lang="ts">
  import { vault } from "$lib/stores/vault.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import {
    CANVAS_TEXT_BACKGROUND_PRESETS,
    CANVAS_TEXT_FONT_SIZE_PRESETS,
    DEFAULT_CANVAS_TEXT_BACKGROUND,
    DEFAULT_CANVAS_TEXT_FONT_SIZE,
  } from "@codex/canvas-engine";
  import { canvasTextBackgroundStyle } from "./canvas-workspace-helpers";
  import SpatialImageControls from "$lib/components/spatial/SpatialImageControls.svelte";

  let {
    x,
    y,
    targetId,
    targetType = "node",
    isAdventure = false,
    isLocked = false,
    onDelete,
    onRename,
    onRevise,
    onCreateEntity,
    onAddAdventureNode,
    onToggleLock,
    onBringToFront,
    onSendToBack,
    onPaste,
    onAddTextNode,
    textNodeBackground = DEFAULT_CANVAS_TEXT_BACKGROUND,
    textNodeFontSize = DEFAULT_CANVAS_TEXT_FONT_SIZE,
    onTextNodeBackgroundChange,
    onTextNodeFontSizeChange,
    onClose,
  } = $props<{
    x: number;
    y: number;
    targetId?: string;
    targetType?: "node" | "edge" | "pane";
    isAdventure?: boolean;
    isLocked?: boolean;
    onDelete: () => void;
    onRename?: () => void;
    onRevise?: () => void;
    onCreateEntity?: (type: string) => void;
    onAddAdventureNode?: (
      type: "location" | "npc" | "clue" | "threat" | "outcome" | "situation",
    ) => void;
    onToggleLock?: () => void;
    onBringToFront?: () => void;
    onSendToBack?: () => void;
    onPaste?: () => void;
    onAddTextNode?: () => void;
    textNodeBackground?: string;
    textNodeFontSize?: number;
    onTextNodeBackgroundChange?: (background: string) => void;
    onTextNodeFontSizeChange?: (fontSize: number) => void;
    onClose: () => void;
  }>();

  const handleRevise = async () => {
    if (targetType !== "node") return;

    if (targetId) {
      modalUIStore.openRevisionDialog(targetId);
      onClose();
    } else if (onRevise) {
      onRevise();
      onClose();
    }
  };

  let menuEl = $state<HTMLDivElement>();

  $effect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuEl && !menuEl.contains(e.target as Node)) {
        onClose();
      }
    };
    // Use a small timeout to avoid the click that opened the menu from closing it immediately
    const timer = setTimeout(() => {
      window.addEventListener("click", handleOutsideClick);
    }, 10);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("click", handleOutsideClick);
    };
  });
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  bind:this={menuEl}
  role="menu"
  tabindex="0"
  aria-label="Canvas Context Menu"
  class="fixed z-[100] bg-theme-surface border border-theme-border shadow-2xl rounded-lg overflow-hidden min-w-[160px] py-1 animate-in fade-in zoom-in-95 duration-100"
  style:top="{y}px"
  style:left="{x}px"
  oncontextmenu={(e) => e.preventDefault()}
>
  {#if !vault.isGuest}
    {#if targetType === "edge"}
      <button
        role="menuitem"
        class="w-full text-left px-4 py-2.5 text-xs text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary flex items-center gap-3 transition-colors uppercase tracking-widest"
        onclick={() => {
          onRename?.();
          onClose();
        }}
      >
        <span class="icon-[lucide--type] w-3.5 h-3.5"></span>
        Edit Label
      </button>
      <div class="border-t border-theme-border/30 my-1"></div>
    {/if}

    {#if targetType === "pane"}
      {#if onPaste}
        <button
          role="menuitem"
          class="w-full text-left px-4 py-2.5 text-xs text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary flex items-center gap-3 transition-colors uppercase font-header tracking-widest"
          onclick={() => {
            onPaste();
            onClose();
          }}
        >
          <span class="icon-[lucide--clipboard-paste] w-3.5 h-3.5"></span>
          Paste Image
        </button>
      {/if}
      {#if onAddTextNode}
        <button
          role="menuitem"
          class="w-full text-left px-4 py-2.5 text-xs text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary flex items-center gap-3 transition-colors uppercase font-header tracking-widest"
          onclick={() => {
            onAddTextNode();
            onClose();
          }}
        >
          <span class="icon-[lucide--sticky-note] w-3.5 h-3.5"></span>
          Add Text Note
        </button>
      {/if}
      {#if onPaste || onAddTextNode}
        <div class="border-t border-theme-border/30 my-1"></div>
      {/if}
      {#if isAdventure}
        <button
          role="menuitem"
          class="w-full text-left px-4 py-2 text-xs text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary flex items-center gap-3 transition-colors uppercase font-header tracking-widest"
          onclick={() => {
            onAddAdventureNode?.("location");
            onClose();
          }}
        >
          <span class="icon-[lucide--map-pin] w-3.5 h-3.5 text-amber-400"
          ></span>
          Add Location
        </button>
        <button
          role="menuitem"
          class="w-full text-left px-4 py-2 text-xs text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary flex items-center gap-3 transition-colors uppercase font-header tracking-widest"
          onclick={() => {
            onAddAdventureNode?.("npc");
            onClose();
          }}
        >
          <span class="icon-[lucide--users] w-3.5 h-3.5 text-blue-400"></span>
          Add NPC / Faction
        </button>
        <button
          role="menuitem"
          class="w-full text-left px-4 py-2 text-xs text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary flex items-center gap-3 transition-colors uppercase font-header tracking-widest"
          onclick={() => {
            onAddAdventureNode?.("clue");
            onClose();
          }}
        >
          <span class="icon-[lucide--search] w-3.5 h-3.5 text-emerald-400"
          ></span>
          Add Clue / Secret
        </button>
        <button
          role="menuitem"
          class="w-full text-left px-4 py-2 text-xs text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary flex items-center gap-3 transition-colors uppercase font-header tracking-widest"
          onclick={() => {
            onAddAdventureNode?.("threat");
            onClose();
          }}
        >
          <span class="icon-[lucide--skull] w-3.5 h-3.5 text-rose-400"></span>
          Add Threat
        </button>
        <button
          role="menuitem"
          class="w-full text-left px-4 py-2 text-xs text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary flex items-center gap-3 transition-colors uppercase font-header tracking-widest"
          onclick={() => {
            onAddAdventureNode?.("outcome");
            onClose();
          }}
        >
          <span class="icon-[lucide--flag] w-3.5 h-3.5 text-cyan-400"></span>
          Add Outcome
        </button>
        <button
          role="menuitem"
          class="w-full text-left px-4 py-2 text-xs text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary flex items-center gap-3 transition-colors uppercase font-header tracking-widest"
          onclick={() => {
            onAddAdventureNode?.("situation");
            onClose();
          }}
        >
          <span class="icon-[lucide--play] w-3.5 h-3.5 text-purple-400"></span>
          Add Situation
        </button>
      {:else}
        <button
          role="menuitem"
          class="w-full text-left px-4 py-2.5 text-xs text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary flex items-center gap-3 transition-colors uppercase font-header tracking-widest"
          onclick={() => {
            onCreateEntity?.("character");
            onClose();
          }}
        >
          Create Character
        </button>
        <button
          role="menuitem"
          class="w-full text-left px-4 py-2.5 text-xs text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary flex items-center gap-3 transition-colors uppercase font-header tracking-widest"
          onclick={() => {
            onCreateEntity?.("location");
            onClose();
          }}
        >
          Create Location
        </button>
        <button
          role="menuitem"
          class="w-full text-left px-4 py-2.5 text-xs text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary flex items-center gap-3 transition-colors uppercase font-header tracking-widest"
          onclick={() => {
            onCreateEntity?.("event");
            onClose();
          }}
        >
          Create Event
        </button>
        <button
          role="menuitem"
          class="w-full text-left px-4 py-2.5 text-xs text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary flex items-center gap-3 transition-colors uppercase font-header tracking-widest"
          onclick={() => {
            onCreateEntity?.("item");
            onClose();
          }}
        >
          Create Item
        </button>
        <button
          role="menuitem"
          class="w-full text-left px-4 py-2.5 text-xs text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary flex items-center gap-3 transition-colors uppercase font-header tracking-widest"
          onclick={() => {
            onCreateEntity?.("lore");
            onClose();
          }}
        >
          Create Lore
        </button>
      {/if}
    {/if}

    {#if targetType === "node" && (targetId || onRevise)}
      <button
        role="menuitem"
        class="w-full text-left px-4 py-2.5 text-xs text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary flex items-center gap-3 transition-colors uppercase font-header tracking-widest"
        onclick={handleRevise}
      >
        <span class="icon-[lucide--sparkles] w-3.5 h-3.5 opacity-70"></span>
        Revise Content
      </button>
      <div class="border-t border-theme-border/30 my-1"></div>
    {/if}

    {#if targetType === "node" && (onTextNodeBackgroundChange || onTextNodeFontSizeChange)}
      {#if onTextNodeBackgroundChange}
        <div class="px-4 py-2">
          <p
            class="mb-1.5 text-[10px] font-bold text-theme-muted uppercase tracking-widest"
          >
            Background
          </p>
          <div class="flex items-center gap-1.5">
            {#each CANVAS_TEXT_BACKGROUND_PRESETS as key (key)}
              <button
                type="button"
                title={key}
                aria-label={`Set background to ${key}`}
                aria-pressed={textNodeBackground === key}
                onclick={() => onTextNodeBackgroundChange(key)}
                class="h-6 w-6 rounded-full border transition-transform {textNodeBackground ===
                key
                  ? 'border-theme-primary ring-2 ring-theme-primary/40 scale-110'
                  : 'border-theme-border/50'}"
                style:background-color={key === "transparent"
                  ? undefined
                  : canvasTextBackgroundStyle(key)}
                style:background-image={key === "transparent"
                  ? "repeating-conic-gradient(#9ca3af 0% 25%, transparent 0% 50%)"
                  : undefined}
                style:background-size={key === "transparent"
                  ? "6px 6px"
                  : undefined}
              ></button>
            {/each}
          </div>
        </div>
      {/if}
      {#if onTextNodeFontSizeChange}
        <div class="px-4 py-2">
          <p
            class="mb-1.5 text-[10px] font-bold text-theme-muted uppercase tracking-widest"
          >
            Font Size
          </p>
          <div class="flex items-center gap-1">
            {#each CANVAS_TEXT_FONT_SIZE_PRESETS as size (size)}
              <button
                type="button"
                role="menuitemradio"
                aria-checked={textNodeFontSize === size}
                title={`${size}px`}
                onclick={() => onTextNodeFontSizeChange(size)}
                class="flex h-6 min-w-6 items-center justify-center rounded px-1 text-[10px] font-semibold transition-colors {textNodeFontSize ===
                size
                  ? 'bg-theme-primary/15 text-theme-primary ring-1 ring-theme-primary'
                  : 'text-theme-muted hover:bg-theme-primary/10'}"
              >
                {size}
              </button>
            {/each}
          </div>
        </div>
      {/if}
      <div class="border-t border-theme-border/30 my-1"></div>
    {/if}

    {#if targetType !== "pane"}
      <SpatialImageControls
        locked={isLocked}
        onToggleLock={targetType === "node" && onToggleLock
          ? () => {
              onToggleLock?.();
              onClose();
            }
          : undefined}
        onBringToFront={targetType === "node" && onBringToFront
          ? () => {
              onBringToFront?.();
              onClose();
            }
          : undefined}
        onSendToBack={targetType === "node" && onSendToBack
          ? () => {
              onSendToBack?.();
              onClose();
            }
          : undefined}
        onDelete={() => {
          onDelete();
          onClose();
        }}
      />
    {/if}
  {:else}
    <div
      class="px-4 py-3 text-[10px] text-theme-muted italic uppercase tracking-widest"
    >
      Viewer Mode
    </div>
  {/if}
</div>
