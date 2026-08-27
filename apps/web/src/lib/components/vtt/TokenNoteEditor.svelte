<script lang="ts">
  import { tick } from "svelte";

  /**
   * The body of a note pinned to the map. Notes carry one block of prose
   * rather than the four labelled fields a tile gets, because they exist to
   * hold whatever the GM just rolled or jotted down.
   *
   * The body is markdown, and stays a plain string: it is what goes over the
   * wire to guests and what the note face on the canvas interprets when it
   * draws. The toolbar below writes the markers rather than replacing the
   * textarea with a rich editor, so nothing has to be sanitised on the way in
   * or out.
   */
  let {
    body,
    collapsed = false,
    disabled = false,
    generating = false,
    savingToVault = false,
    onChange,
    onToggleCollapsed,
    onGenerateEncounter,
    onSaveToVault,
  }: {
    body: string;
    collapsed?: boolean;
    disabled?: boolean;
    /** True while an encounter is being generated into this note. */
    generating?: boolean;
    /** True while this note is being written into the vault as an entity. */
    savingToVault?: boolean;
    onChange: (body: string) => void;
    onToggleCollapsed?: () => void;
    /**
     * Fills an empty note with a generated encounter. Passed only when AI
     * generation is available, so its absence is what hides the button.
     */
    onGenerateEncounter?: () => void;
    /**
     * Keeps this note as a Note entity in the vault. Passed only when there
     * is a vault to keep it in and the note is not linked to one already, so
     * its absence is what hides the button.
     */
    onSaveToVault?: () => void;
  } = $props();

  let textarea = $state<HTMLTextAreaElement | null>(null);

  // An empty note is a note the GM has not written into yet, so offering to
  // fill it costs them nothing. Once there is anything in the body, the offer
  // would be a button that overwrites their own words.
  const canGenerate = $derived(
    Boolean(onGenerateEncounter) && !disabled && body.trim().length === 0,
  );
  const canSaveToVault = $derived(
    Boolean(onSaveToVault) && !disabled && body.trim().length > 0,
  );

  /**
   * Rewrites the body and puts the caret back where the GM was working.
   * The body round-trips through the parent, so the selection has to be
   * restored after that update lands rather than in the same tick.
   */
  async function replaceBody(next: string, start: number, end: number) {
    onChange(next);
    await tick();
    textarea?.focus();
    textarea?.setSelectionRange(start, end);
  }

  /** Wraps the selection in an inline marker, or opens an empty pair. */
  function wrapSelection(marker: string) {
    if (!textarea || disabled) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = body.slice(start, end);
    const next = `${body.slice(0, start)}${marker}${selected}${marker}${body.slice(end)}`;
    const caret = start + marker.length;
    void replaceBody(next, caret, caret + selected.length);
  }

  /**
   * Adds or removes a line marker on every line the selection touches.
   * Toggling off keeps the GM from having to delete markers by hand.
   */
  function toggleLinePrefix(prefix: string) {
    if (!textarea || disabled) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const lineStart = body.lastIndexOf("\n", start - 1) + 1;
    const lineEndIndex = body.indexOf("\n", end);
    const lineEnd = lineEndIndex === -1 ? body.length : lineEndIndex;

    const block = body.slice(lineStart, lineEnd);
    const allPrefixed = block
      .split("\n")
      .every((line) => line.startsWith(prefix));
    const rewritten = block
      .split("\n")
      .map((line) =>
        allPrefixed ? line.slice(prefix.length) : `${prefix}${line}`,
      )
      .join("\n");

    const next = `${body.slice(0, lineStart)}${rewritten}${body.slice(lineEnd)}`;
    const shift = rewritten.length - block.length;
    void replaceBody(next, start, end + shift);
  }

  const FORMAT_ACTIONS = [
    {
      id: "bold",
      label: "Bold",
      icon: "icon-[lucide--bold]",
      apply: () => wrapSelection("**"),
    },
    {
      id: "italic",
      label: "Italic",
      icon: "icon-[lucide--italic]",
      apply: () => wrapSelection("*"),
    },
    {
      id: "heading",
      label: "Heading",
      icon: "icon-[lucide--heading]",
      apply: () => toggleLinePrefix("## "),
    },
    {
      id: "bullet",
      label: "Bullet list",
      icon: "icon-[lucide--list]",
      apply: () => toggleLinePrefix("- "),
    },
  ] as const;
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
  {#if !disabled}
    <div
      class="flex items-center gap-0.5"
      role="toolbar"
      aria-label="Note formatting"
      aria-controls="token-note-body"
      data-testid="token-note-format-toolbar"
    >
      {#each FORMAT_ACTIONS as action (action.id)}
        <button
          type="button"
          class="rounded p-1.5 text-theme-muted transition-colors hover:bg-theme-primary/10 hover:text-theme-primary"
          onclick={action.apply}
          title={action.label}
          aria-label={action.label}
          data-testid={`token-note-format-${action.id}`}
        >
          <span aria-hidden="true" class={`${action.icon} h-3.5 w-3.5`}></span>
        </button>
      {/each}
    </div>
  {/if}
  <textarea
    bind:this={textarea}
    id="token-note-body"
    value={body}
    {disabled}
    rows="5"
    aria-label="Note body"
    data-testid="token-note-body"
    placeholder="What happens here…"
    oninput={(event) => onChange(event.currentTarget.value)}
    class="w-full resize-y rounded-lg border border-theme-border bg-theme-surface px-2.5 py-2 text-sm text-theme-text outline-none focus:border-theme-primary disabled:cursor-not-allowed disabled:opacity-60"
  ></textarea>
  {#if canSaveToVault}
    <button
      type="button"
      class="flex w-full items-center justify-center gap-1.5 rounded-lg border border-theme-border px-2 py-1.5 text-[11px] font-bold text-theme-muted transition-colors hover:border-theme-primary hover:text-theme-primary disabled:cursor-not-allowed disabled:opacity-60"
      onclick={onSaveToVault}
      disabled={savingToVault}
      data-testid="token-note-save-to-vault"
      title="Keep this note in the vault as a Note entity, linked to this marker"
    >
      <span
        aria-hidden="true"
        class={`${savingToVault ? "icon-[lucide--loader-2] animate-spin" : "icon-[lucide--book-plus]"} h-3.5 w-3.5`}
      ></span>
      {savingToVault ? "Saving to vault…" : "Keep in vault"}
    </button>
  {/if}
</section>
