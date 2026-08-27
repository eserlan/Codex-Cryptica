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
    generating = false,
    onChange,
    onToggleCollapsed,
    onGenerateEncounter,
  }: {
    body: string;
    collapsed?: boolean;
    disabled?: boolean;
    /** True while an encounter is being generated into this note. */
    generating?: boolean;
    onChange: (body: string) => void;
    onToggleCollapsed?: () => void;
    /**
     * Fills an empty note with a generated encounter. Passed only when AI
     * generation is available, so its absence is what hides the button.
     */
    onGenerateEncounter?: () => void;
  } = $props();

  // An empty note is a note the GM has not written into yet, so offering to
  // fill it costs them nothing. Once there is anything in the body, the offer
  // would be a button that overwrites their own words.
  const canGenerate = $derived(
    Boolean(onGenerateEncounter) && !disabled && body.trim().length === 0,
  );
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
  {#if canGenerate}
    <button
      type="button"
      class="flex w-full items-center justify-center gap-1.5 rounded-lg border border-theme-primary/40 px-2 py-1.5 text-[11px] font-bold text-theme-primary transition-colors hover:bg-theme-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
      onclick={onGenerateEncounter}
      disabled={generating}
      data-testid="token-note-generate-encounter"
    >
      <span
        aria-hidden="true"
        class={`${generating ? "icon-[lucide--loader-2] animate-spin" : "icon-[lucide--sparkles]"} h-3.5 w-3.5`}
      ></span>
      {generating ? "Generating encounter…" : "Generate an encounter"}
    </button>
  {/if}
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
