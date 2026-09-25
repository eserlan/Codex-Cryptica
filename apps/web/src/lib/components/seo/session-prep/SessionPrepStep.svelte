<script lang="ts">
  import type { Snippet } from "svelte";
  import {
    describeSuggestionOption,
    type SessionPrepStep,
    type SessionPrepSuggestion,
  } from "generator-engine";

  let {
    step,
    number,
    title,
    hint,
    suggestion = null,
    error = null,
    isSuggesting = false,
    aiDisabled = false,
    acceptDisabled = false,
    onSuggest,
    onAccept,
    onDismiss,
    children,
  }: {
    step: SessionPrepStep;
    number: number;
    title: string;
    hint: string;
    suggestion?: SessionPrepSuggestion | null;
    error?: string | null;
    isSuggesting?: boolean;
    aiDisabled?: boolean;
    acceptDisabled?: boolean;
    onSuggest: () => void;
    onAccept: (index: number) => void;
    onDismiss: () => void;
    children: Snippet;
  } = $props();

  const acceptLabel = $derived(
    step === "start" || step === "pressure"
      ? "Use this"
      : step === "consequences"
        ? "Fill the blanks"
        : "Add",
  );
  const headingId = $derived(`prep-step-${step}`);
</script>

<section
  aria-labelledby={headingId}
  class="@container space-y-2.5 rounded-xl border border-theme-border/50 bg-theme-bg/40 p-3"
>
  <div class="flex items-start justify-between gap-3">
    <div>
      <h3
        id={headingId}
        class="text-sm font-bold uppercase tracking-wider text-theme-text"
      >
        <span class="text-theme-primary">{number}.</span>
        {title}
      </h3>
      <p class="mt-0.5 text-sm leading-snug text-theme-muted">{hint}</p>
    </div>
    <button
      type="button"
      onclick={onSuggest}
      disabled={aiDisabled}
      class="flex shrink-0 items-center gap-1 rounded-lg border border-theme-primary/40 px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider text-theme-primary transition hover:bg-theme-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
      aria-label={`Suggest options for ${title} with AI`}
      title="Suggest options with AI"
    >
      <span
        class={isSuggesting
          ? "icon-[lucide--loader-circle] h-3.5 w-3.5 animate-spin"
          : "icon-[lucide--sparkles] h-3.5 w-3.5"}
        aria-hidden="true"
      ></span>
      {isSuggesting ? "Thinking" : "Suggest"}
    </button>
  </div>

  {@render children()}

  {#if error}
    <p role="alert" class="text-sm text-theme-danger">{error}</p>
  {/if}

  {#if suggestion && suggestion.options.length > 0}
    <div
      class="space-y-1.5 rounded-lg border border-theme-primary/30 bg-theme-primary/5 p-2.5"
    >
      <div class="flex items-center justify-between">
        <p
          class="text-xs font-bold uppercase tracking-wider text-theme-primary"
        >
          AI options: pick any that fit
        </p>
        <button
          type="button"
          onclick={onDismiss}
          class="flex items-center p-0.5 text-theme-muted transition hover:text-theme-text"
          aria-label={`Dismiss suggestions for ${title}`}
          title="Dismiss"
        >
          <span class="icon-[lucide--x] h-3.5 w-3.5" aria-hidden="true"></span>
        </button>
      </div>
      <ul class="space-y-1.5">
        {#each suggestion.options as _option, index (index)}
          <li class="flex items-start gap-2">
            <p class="flex-1 text-sm leading-snug text-theme-text">
              {describeSuggestionOption(suggestion, index)}
            </p>
            <button
              type="button"
              onclick={() => onAccept(index)}
              disabled={acceptDisabled}
              class="shrink-0 rounded-md bg-theme-primary px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-theme-bg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {acceptLabel}
            </button>
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</section>
