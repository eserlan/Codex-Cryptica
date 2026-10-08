<script lang="ts">
  import type { StatSheetField } from "schema";
  import { DISPLAY_MODES_BY_FIELD_TYPE } from "@codex/stat-sheet-engine";

  const DISPLAY_MODE_OPTIONS = [
    { mode: undefined, label: "Default" },
    { mode: "plain", label: "Plain Inline" },
    { mode: "prominent", label: "Prominent Badge" },
    { mode: "current-max", label: "Current / Max Counter" },
    { mode: "counter", label: "Interactive Stepper" },
    { mode: "progress", label: "Progress Bar" },
    { mode: "tag-list", label: "Tag List" },
    { mode: "notes", label: "Notes Area" },
    { mode: "table", label: "Item Table" },
    { mode: "name-target", label: "Name & Target" },
  ] as const;

  let {
    x,
    y,
    fieldId,
    targetField,
    currentOverride,
    onClose,
    onSetDisplayMode,
    onToggleHideLabel,
  }: {
    x: number;
    y: number;
    fieldId: string;
    targetField?: StatSheetField;
    currentOverride?: { displayMode?: string; hideLabel?: boolean };
    onClose: () => void;
    onSetDisplayMode: (fieldId: string, displayMode?: string) => void;
    onToggleHideLabel: (fieldId: string) => void;
  } = $props();
</script>

<button
  type="button"
  class="fixed inset-0 z-[220]"
  onclick={onClose}
  oncontextmenu={(e) => {
    e.preventDefault();
    onClose();
  }}
  aria-label="Close field display options"
></button>
<div
  class="fixed z-[230] min-w-[180px] rounded-lg border border-theme-border bg-theme-surface p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-100"
  style:left="{x}px"
  style:top="{y}px"
  role="menu"
  tabindex="0"
  aria-label="Field Display Options"
  onclick={(e) => e.stopPropagation()}
  onkeydown={(e) => e.key === "Escape" && onClose()}
>
  <div
    class="border-b border-theme-border/40 px-2.5 py-1.5 text-micro font-bold uppercase tracking-wider text-theme-muted"
  >
    Display Options — {targetField?.label ?? fieldId}
  </div>

  <div class="py-1">
    <div
      class="px-2.5 py-1 text-nano font-bold uppercase tracking-widest text-theme-primary"
    >
      Display Mode
    </div>
    {#each DISPLAY_MODE_OPTIONS.filter((option) => option.mode === undefined || !targetField || DISPLAY_MODES_BY_FIELD_TYPE[targetField.type].allowed.includes(option.mode)) as opt (opt.mode ?? "default")}
      <button
        type="button"
        role="menuitem"
        class="flex w-full items-center justify-between rounded px-2.5 py-1 text-xs text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary transition-colors text-left"
        onclick={() => onSetDisplayMode(fieldId, opt.mode)}
      >
        <span>{opt.label}</span>
        {#if currentOverride?.displayMode === opt.mode || (!currentOverride?.displayMode && opt.mode === undefined)}
          <span
            class="icon-[lucide--check] h-3.5 w-3.5 text-theme-primary"
            aria-hidden="true"
          ></span>
        {/if}
      </button>
    {/each}
  </div>

  <div class="border-t border-theme-border/40 pt-1">
    <button
      type="button"
      role="menuitem"
      class="flex w-full items-center justify-between rounded px-2.5 py-1 text-xs text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary transition-colors text-left"
      onclick={() => onToggleHideLabel(fieldId)}
    >
      <span>Hide Label</span>
      {#if currentOverride?.hideLabel}
        <span
          class="icon-[lucide--check] h-3.5 w-3.5 text-theme-primary"
          aria-hidden="true"
        ></span>
      {/if}
    </button>
  </div>
</div>
