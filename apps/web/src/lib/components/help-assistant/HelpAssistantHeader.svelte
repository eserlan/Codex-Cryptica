<script lang="ts">
  let {
    canStartOver,
    onStartOver,
    onPopOut,
    onClose,
  }: {
    canStartOver: boolean;
    onStartOver: () => void;
    /** Shown only where a pop-out window is possible. */
    onPopOut?: () => void;
    onClose: () => void;
  } = $props();
</script>

<header
  class="flex items-center justify-between gap-2 border-b border-chrome-border px-3 py-2"
>
  <div class="flex items-baseline gap-2">
    <h2 class="text-sm font-bold text-chrome-text">Cif</h2>
    <span class="text-meta uppercase tracking-wider text-chrome-muted"
      >Codex guide</span
    >
  </div>
  <div class="flex items-center gap-1">
    {#if canStartOver}
      <button
        type="button"
        onclick={onStartOver}
        class="touch-target rounded px-2 py-1 text-meta font-bold uppercase tracking-wider text-chrome-muted hover:text-chrome-text focus-visible:outline-2 focus-visible:outline-chrome-accent"
      >
        Start over
      </button>
    {/if}
    {#if onPopOut}
      <button
        type="button"
        onclick={onPopOut}
        aria-label="Open Cif in its own window"
        title="Open Cif in its own window"
        data-testid="help-assistant-popout"
        class="touch-target rounded p-1 text-chrome-muted hover:text-chrome-text focus-visible:outline-2 focus-visible:outline-chrome-accent"
      >
        <span aria-hidden="true" class="icon-[lucide--external-link] h-4 w-4"
        ></span>
      </button>
    {/if}
    <button
      type="button"
      onclick={onClose}
      aria-label="Close Cif"
      class="touch-target rounded p-1 text-chrome-muted hover:text-chrome-text focus-visible:outline-2 focus-visible:outline-chrome-accent"
    >
      <span aria-hidden="true" class="icon-[lucide--x] h-4 w-4"></span>
    </button>
  </div>
</header>
