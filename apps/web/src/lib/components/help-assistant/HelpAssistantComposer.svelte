<script lang="ts">
  import { tick } from "svelte";
  import { MAX_QUESTION_CHARS } from "help-engine";

  let {
    pending,
    notice,
    focusWhen,
    onAsk,
  }: {
    pending: boolean;
    notice: string | null;
    /** Focus the box each time this turns true (the panel opening). */
    focusWhen: boolean;
    /** Resolves true once the question was actually sent. */
    onAsk: (text: string) => Promise<boolean>;
  } = $props();

  let draft = $state("");
  let input = $state<HTMLTextAreaElement>();

  $effect(() => {
    if (focusWhen) void tick().then(() => input?.focus());
  });

  async function send() {
    const text = draft;
    if (!text.trim() || pending) return;
    // Empty the box straight away so nothing typed while waiting is lost when
    // the answer arrives. If the question was never sent (a length limit, or
    // the user cancelled), hand it back, unless they have started something new.
    draft = "";
    const started = await onAsk(text);
    if (!started && draft === "") draft = text;
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send();
    }
  }

  const remaining = $derived(MAX_QUESTION_CHARS - draft.length);
</script>

<form
  class="flex flex-col gap-1 border-t border-theme-border px-3 py-2"
  onsubmit={(event) => {
    event.preventDefault();
    void send();
  }}
>
  {#if notice}
    <p class="text-meta text-theme-muted" role="status">{notice}</p>
  {/if}
  <label for="help-assistant-input" class="sr-only">
    Ask a question about using Codex Cryptica
  </label>
  <div class="flex items-end gap-2">
    <textarea
      id="help-assistant-input"
      bind:this={input}
      bind:value={draft}
      onkeydown={onKeydown}
      maxlength={MAX_QUESTION_CHARS}
      rows="2"
      placeholder="How do I connect two entities?"
      class="min-h-[2.75rem] flex-1 resize-none rounded border border-theme-border bg-theme-bg px-2 py-1.5 text-body-ui text-theme-text placeholder:text-theme-muted focus-visible:outline-2 focus-visible:outline-theme-primary"
    ></textarea>
    <button
      type="submit"
      disabled={!draft.trim() || pending}
      class="rounded bg-theme-primary px-3 py-2 text-meta font-bold uppercase tracking-wider text-theme-bg transition hover:bg-theme-secondary disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary"
    >
      Ask
    </button>
  </div>
  <p class="text-helper text-theme-muted">
    Your question goes to our AI service. Avoid pasting private lore.
    {#if remaining <= 50}
      <span class="ml-1 font-bold">{remaining} characters left.</span>
    {/if}
  </p>
</form>
