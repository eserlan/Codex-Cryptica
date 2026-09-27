<script lang="ts">
  /**
   * A small, reusable set of Markdown formatting buttons (#3481): bold,
   * italic, bullet list. It knows nothing about any particular textarea —
   * each button calls back to the host, which owns the text and selection
   * (see `$lib/utils/markdown-editing.ts` for the pure operations this is
   * usually wired to). Kept deliberately small: this is not a rich-text
   * toolbar, just the handful of marks basic journalling needs.
   */
  let {
    onBold,
    onItalic,
    onBullet,
    disabled = false,
    label = "Formatting",
  }: {
    onBold: () => void;
    onItalic: () => void;
    onBullet: () => void;
    disabled?: boolean;
    label?: string;
  } = $props();

  const ACTIONS = [
    { id: "bold", label: "Bold", icon: "icon-[lucide--bold]" },
    { id: "italic", label: "Italic", icon: "icon-[lucide--italic]" },
    { id: "bullet", label: "Bullet list", icon: "icon-[lucide--list]" },
  ] as const;

  function run(id: (typeof ACTIONS)[number]["id"]) {
    if (disabled) return;
    if (id === "bold") onBold();
    else if (id === "italic") onItalic();
    else onBullet();
  }
</script>

<div
  class="flex items-center gap-0.5"
  role="toolbar"
  aria-label={label}
  data-testid="markdown-format-toolbar"
>
  {#each ACTIONS as action (action.id)}
    <button
      type="button"
      class="rounded p-1 text-theme-muted transition-colors hover:bg-theme-primary/10 hover:text-theme-primary disabled:cursor-not-allowed disabled:opacity-40"
      onclick={() => run(action.id)}
      {disabled}
      title={action.label}
      aria-label={action.label}
      data-testid={`markdown-format-${action.id}`}
    >
      <span aria-hidden="true" class="{action.icon} h-3.5 w-3.5"></span>
    </button>
  {/each}
</div>
