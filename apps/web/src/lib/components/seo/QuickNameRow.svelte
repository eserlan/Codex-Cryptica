<script lang="ts">
  let {
    name,
    copied,
    pinned,
    onCopy,
    onTogglePin,
  }: {
    name: string;
    copied: boolean;
    pinned: boolean;
    onCopy: () => void;
    onTogglePin: () => void;
  } = $props();
</script>

<div class="flex items-stretch gap-1.5">
  <button
    type="button"
    onclick={onCopy}
    class="group flex min-h-11 flex-1 items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition-all {copied
      ? 'border-theme-primary/70 bg-theme-primary/10'
      : 'border-theme-border/60 bg-theme-bg/40 hover:border-theme-primary/50 hover:bg-theme-surface/50'}"
    aria-label="Copy {name}"
  >
    <span class="font-header text-base font-bold text-theme-text break-words"
      >{name}</span
    >
    <span
      class="inline-flex shrink-0 items-center gap-1 text-nano font-bold uppercase tracking-wider {copied
        ? 'text-theme-primary'
        : 'text-theme-text group-hover:text-theme-primary'}"
      aria-hidden="true"
    >
      <span
        class={copied
          ? "icon-[lucide--check] h-3.5 w-3.5"
          : "icon-[lucide--copy] h-3.5 w-3.5"}
      ></span>
      {copied ? "Copied" : "Copy"}
    </span>
  </button>
  <button
    type="button"
    onclick={onTogglePin}
    aria-pressed={pinned}
    aria-label={pinned ? `Unpin ${name}` : `Pin ${name}`}
    title={pinned ? "Unpin" : "Pin to keep when rolling again"}
    class="flex min-h-11 w-11 shrink-0 items-center justify-center rounded-lg border transition-all {pinned
      ? 'border-theme-primary/70 bg-theme-primary/15 text-theme-primary'
      : 'border-theme-border/60 bg-theme-bg/40 text-theme-text hover:border-theme-primary/50 hover:text-theme-primary'}"
  >
    <span
      class={pinned
        ? "icon-[lucide--pin-off] h-4 w-4"
        : "icon-[lucide--pin] h-4 w-4"}
      aria-hidden="true"
    ></span>
  </button>
</div>
