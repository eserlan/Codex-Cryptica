<script lang="ts">
  /**
   * The body of a note pinned to the map. Notes carry one block of prose
   * rather than the four labelled fields a tile gets, because they exist to
   * hold whatever the GM just rolled or jotted down.
   */
  let {
    body,
    collapsed = false,
    disabled = false,
    onChange,
    onToggleCollapsed,
  }: {
    body: string;
    collapsed?: boolean;
    disabled?: boolean;
    onChange: (body: string) => void;
    onToggleCollapsed?: () => void;
  } = $props();
</script>

<section
  class="space-y-2 rounded-xl border border-theme-primary/20 bg-theme-bg/50 p-3"
  aria-labelledby="token-note-heading"
  data-testid="token-note-editor"
>
  <div class="flex items-center justify-between gap-2">
    <h4
      id="token-note-heading"
      class="text-[10px] font-bold uppercase tracking-widest text-theme-primary"
    >
      Note
    </h4>
    {#if onToggleCollapsed && !disabled}
      <button
        type="button"
        class="flex items-center gap-1 rounded border border-theme-border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-theme-muted transition-colors hover:border-theme-primary hover:text-theme-primary"
        onclick={onToggleCollapsed}
        data-testid="token-note-collapse"
        title={collapsed
          ? "Show the note at full size on the map"
          : "Fold the note down to a marker on the map"}
      >
        <span
          aria-hidden="true"
          class={`${collapsed ? "icon-[lucide--maximize-2]" : "icon-[lucide--minimize-2]"} h-3 w-3`}
        ></span>
        {collapsed ? "Expand" : "Collapse"}
      </button>
    {/if}
  </div>
  <textarea
    value={body}
    {disabled}
    rows="5"
    aria-label="Note body"
    data-testid="token-note-body"
    placeholder="What happens here…"
    oninput={(event) => onChange(event.currentTarget.value)}
    class="w-full resize-y rounded-lg border border-theme-border bg-theme-surface px-2.5 py-2 text-sm text-theme-text outline-none focus:border-theme-primary disabled:cursor-not-allowed disabled:opacity-60"
  ></textarea>
</section>
