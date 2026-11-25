<script lang="ts">
  import type { AdventureCompletionSummary } from "@codex/adventure-engine";

  let {
    completion,
    readOnly = false,
    busy = false,
    onContinue,
    onFindAnother,
    onFinish,
  }: {
    completion: AdventureCompletionSummary;
    readOnly?: boolean;
    busy?: boolean;
    onContinue: () => void | Promise<void>;
    onFindAnother: () => void | Promise<void>;
    onFinish: () => void | Promise<void>;
  } = $props();

  const headingId = $derived(
    `adventure-completion-heading-${completion.eventId}`,
  );
  const descId = $derived(`adventure-completion-desc-${completion.eventId}`);
  const badgeLabel = $derived(
    completion.result === "achieved" ? "Adventure Complete" : "Arc Concluded",
  );

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key !== "Escape" || busy) return;
    event.preventDefault();
    event.stopPropagation();
    void onContinue();
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  role="region"
  tabindex="-1"
  aria-labelledby={headingId}
  aria-describedby={descId}
  data-testid="adventure-completion-panel"
  onkeydown={handleKeydown}
  class="rounded-xl border border-theme-primary/40 bg-theme-surface p-4 text-theme-text shadow-md transition-opacity motion-reduce:transition-none sm:p-5"
>
  <div class="flex items-start justify-between gap-3">
    <div class="min-w-0 space-y-1">
      <p
        class="inline-flex items-center gap-1.5 rounded-full bg-theme-primary/15 px-2.5 py-0.5 text-xs font-semibold text-theme-text"
      >
        <span
          aria-hidden="true"
          class={[
            completion.result === "achieved"
              ? "icon-[lucide--sparkles]"
              : "icon-[lucide--flag]",
            "h-3.5 w-3.5 shrink-0",
          ]}
        ></span>
        <span>{badgeLabel}</span>
      </p>
      <h3
        id={headingId}
        class="font-header text-base font-bold leading-snug text-theme-text sm:text-lg"
      >
        {completion.heading}
      </h3>
    </div>
    <button
      type="button"
      class="flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-md border border-theme-text text-theme-text transition hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary motion-reduce:transition-none"
      aria-label="Dismiss adventure completion"
      disabled={busy}
      onclick={() => void onContinue()}
    >
      <span aria-hidden="true" class="icon-[lucide--x] h-4 w-4"></span>
    </button>
  </div>

  <p
    id={descId}
    class="mt-2 text-sm leading-relaxed text-theme-text"
    data-testid="adventure-completion-epilogue"
  >
    {completion.epilogue}
  </p>

  {#if completion.worldImpacts.length > 0}
    <div class="mt-3 space-y-1.5">
      <p class="text-xs font-semibold uppercase tracking-wide text-theme-text">
        What changed in the world
      </p>
      <ul
        class="space-y-1 text-sm text-theme-text"
        data-testid="adventure-completion-impacts"
      >
        {#each completion.worldImpacts as impact (impact)}
          <li class="flex items-start gap-2">
            <span
              aria-hidden="true"
              class="icon-[lucide--check-circle-2] mt-0.5 h-4 w-4 shrink-0 text-theme-text"
            ></span>
            <span>{impact}</span>
          </li>
        {/each}
      </ul>
    </div>
  {/if}

  {#if completion.unresolvedConsequences.length > 0}
    <p
      class="mt-3 rounded-lg border border-theme-border bg-theme-bg/60 px-3 py-2 text-xs text-theme-text"
      data-testid="adventure-completion-unresolved"
    >
      <span class="font-semibold">Still unresolved:</span>
      {completion.unresolvedConsequences.join(" · ")}
    </p>
  {/if}

  <div class="mt-4 flex flex-wrap items-center gap-2">
    <button
      type="button"
      class="inline-flex min-h-10 items-center gap-1.5 rounded-md bg-theme-primary px-3.5 py-2 text-sm font-semibold text-theme-on-primary transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary motion-reduce:transition-none"
      disabled={busy}
      onclick={() => void onContinue()}
    >
      <span aria-hidden="true" class="icon-[lucide--compass] h-4 w-4"></span>
      <span>Continue exploring</span>
    </button>
    <button
      type="button"
      class="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-theme-text bg-theme-bg px-3 py-2 text-sm font-medium text-theme-text transition hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary motion-reduce:transition-none"
      disabled={busy}
      onclick={() => void onFindAnother()}
    >
      <span aria-hidden="true" class="icon-[lucide--book-open] h-4 w-4"></span>
      <span>Find another adventure</span>
    </button>
    {#if !readOnly}
      <button
        type="button"
        class="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-theme-text px-3 py-2 text-sm font-medium text-theme-text transition hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary motion-reduce:transition-none"
        disabled={busy}
        onclick={() => void onFinish()}
      >
        <span aria-hidden="true" class="icon-[lucide--archive] h-4 w-4"></span>
        <span>Finish for now</span>
      </button>
    {/if}
  </div>
</div>
