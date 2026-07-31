<script lang="ts">
  let {
    x,
    y,
    label,
    value,
    max,
    readOnly = false,
    onAdjust,
    onClose,
  }: {
    x: number;
    y: number;
    label: string;
    value: number;
    max: number;
    readOnly?: boolean;
    onAdjust: (direction: 1 | -1) => void;
    onClose: () => void;
  } = $props();
</script>

<div
  class="absolute z-20 -translate-x-1/2 -translate-y-[calc(100%+12px)] pointer-events-auto"
  style:left={`${x}px`}
  style:top={`${y}px`}
  onmousedown={(e) => e.stopPropagation()}
  onmouseup={(e) => e.stopPropagation()}
  onclick={(e) => e.stopPropagation()}
  ondblclick={(e) => e.stopPropagation()}
  role="none"
>
  <div
    class="bg-theme-surface border border-theme-border rounded-md shadow-lg p-1.5 flex items-center gap-2"
    data-testid="token-health-bar-popover"
  >
    <span
      class="px-1.5 text-[10px] font-bold text-theme-text uppercase tracking-wider whitespace-nowrap"
    >
      {label}
    </span>
    <button
      type="button"
      class="flex h-6 w-6 items-center justify-center rounded border border-theme-border text-theme-muted hover:border-theme-primary hover:text-theme-primary disabled:opacity-40"
      onclick={() => onAdjust(-1)}
      disabled={readOnly}
      aria-label={`Decrease ${label}`}
    >
      <span class="icon-[lucide--minus] h-3 w-3" aria-hidden="true"></span>
    </button>
    <span
      class="min-w-[3.5rem] text-center text-sm font-bold text-theme-text"
      data-testid="token-health-bar-popover-value"
    >
      {value} / {max}
    </span>
    <button
      type="button"
      class="flex h-6 w-6 items-center justify-center rounded border border-theme-border text-theme-muted hover:border-theme-primary hover:text-theme-primary disabled:opacity-40"
      onclick={() => onAdjust(1)}
      disabled={readOnly}
      aria-label={`Increase ${label}`}
    >
      <span class="icon-[lucide--plus] h-3 w-3" aria-hidden="true"></span>
    </button>
    <button
      type="button"
      class="p-1.5 text-theme-muted hover:text-theme-text transition-all rounded-md hover:bg-theme-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary focus-visible:ring-offset-1 focus-visible:ring-offset-theme-surface"
      onclick={onClose}
      aria-label="Close health bar control"
    >
      <span class="icon-[lucide--x] w-3.5 h-3.5" aria-hidden="true"></span>
    </button>
  </div>
  <div
    class="w-2 h-2 bg-theme-surface border-r border-b border-theme-border rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2"
  ></div>
</div>
