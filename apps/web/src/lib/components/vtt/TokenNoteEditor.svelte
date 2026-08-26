<script lang="ts">
  /**
   * The body of a note pinned to the map. Notes carry one block of prose
   * rather than the four labelled fields a tile gets, because they exist to
   * hold whatever the GM just rolled or jotted down.
   */
  let {
    body,
    disabled = false,
    onChange,
  }: {
    body: string;
    disabled?: boolean;
    onChange: (body: string) => void;
  } = $props();
</script>

<section
  class="space-y-2 rounded-xl border border-theme-primary/20 bg-theme-bg/50 p-3"
  aria-labelledby="token-note-heading"
  data-testid="token-note-editor"
>
  <h4
    id="token-note-heading"
    class="text-[10px] font-bold uppercase tracking-widest text-theme-primary"
  >
    Note
  </h4>
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
