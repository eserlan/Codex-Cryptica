<script lang="ts">
  import {
    MAX_IDEA_LENGTH,
    getMode,
    isModeId,
    listModes,
    remainingTurns,
  } from "generator-engine";
  import type { IdeaDeveloperStore } from "$lib/stores/idea-developer.svelte";
  import ProgressLine from "./ProgressLine.svelte";

  let { store }: { store: IdeaDeveloperStore } = $props();

  const running = $derived(store.turnRunning);
  const hasText = $derived(store.followUpText.trim().length > 0);
  const otherModes = $derived(
    listModes().filter((mode) => mode.id !== store.conversationMode),
  );
  const left = $derived(
    store.conversation ? remainingTurns(store.conversation.turns) : 0,
  );

  const button =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-theme-border bg-theme-surface px-3 py-2 text-base sm:text-sm font-bold uppercase tracking-wider text-theme-text transition-colors hover:border-theme-primary/50 disabled:cursor-not-allowed disabled:opacity-50";
</script>

{#if store.capped}
  <p
    class="rounded-lg border border-theme-border/70 bg-theme-surface/50 p-3 text-lg sm:text-base text-theme-text"
  >
    This conversation has reached its limit. Start a new one, or copy the result
    to keep it.
  </p>
{:else}
  <section
    class="flex flex-col gap-3 rounded-xl border border-theme-border/70 bg-theme-surface/40 p-4"
    aria-labelledby="keep-developing"
  >
    <h2
      id="keep-developing"
      class="font-header text-xl sm:text-lg font-bold text-theme-text"
    >
      Keep developing
    </h2>
    <p class="text-lg sm:text-sm text-theme-muted">
      Answer the questions above, ask for a change, or look at it another way.
      {left} follow-ups left in this conversation.
    </p>
    <label
      for="idea-developer-follow-up"
      class="font-mono text-base sm:text-sm font-bold uppercase tracking-[0.24em] text-theme-primary"
    >
      Your answers or requested change
    </label>
    <textarea
      id="idea-developer-follow-up"
      aria-label="Your answers or requested change"
      class="min-h-24 w-full rounded-xl border border-theme-border bg-theme-bg/50 p-3 text-lg sm:text-base text-theme-text placeholder:text-theme-muted/70 focus:border-theme-primary focus:outline-none"
      placeholder="Answer any of the questions, or say what you'd like changed."
      value={store.followUpText}
      readonly={running}
      oninput={(event) => store.setFollowUp(event.currentTarget.value)}
    ></textarea>
    <p class="text-right text-base sm:text-sm text-theme-muted">
      {store.followUpText.length} / {MAX_IDEA_LENGTH}
    </p>
    <div class="flex flex-wrap items-center gap-2">
      <button
        type="button"
        class={button}
        disabled={running || !hasText}
        onclick={() => store.continueConversation("answer-questions")}
      >
        Answer the questions
      </button>
      <button
        type="button"
        class={button}
        disabled={running || !hasText}
        onclick={() => store.continueConversation("change-part")}
      >
        Ask for a change
      </button>
      {#each otherModes as mode (mode.id)}
        <button
          type="button"
          class={button}
          disabled={running}
          title={getMode(mode.id)?.description}
          onclick={() =>
            isModeId(mode.id) &&
            store.continueConversation("switch-mode", mode.id)}
        >
          Continue in {mode.label}
        </button>
      {/each}
      {#if running}
        <button type="button" class={button} onclick={() => store.cancel()}>
          Cancel
        </button>
      {/if}
    </div>
    <ProgressLine {running} />
  </section>
{/if}
