<script lang="ts">
  import {
    DEVELOPMENT_SECTION_TITLES as titles,
    developmentToText,
    getMode,
    type Development,
  } from "generator-engine";
  import {
    clipboardService as defaultClipboardService,
    type ClipboardService,
  } from "$lib/services/ClipboardService";

  let {
    development,
    ideaText,
    clipboardService = defaultClipboardService,
  }: {
    development: Development;
    ideaText: string;
    clipboardService?: Pick<ClipboardService, "copyContent">;
  } = $props();

  const modeLabel = $derived(getMode(development.mode)?.label);

  let copied = $state(false);
  let copyFailed = $state(false);

  async function copy() {
    copyFailed = false;
    try {
      const success = await clipboardService.copyContent({
        markdown: developmentToText(development, ideaText),
      });
      if (success) {
        copied = true;
        setTimeout(() => (copied = false), 2000);
      } else {
        copyFailed = true;
      }
    } catch {
      copyFailed = true;
    }
  }
</script>

<div class="flex flex-col gap-5" data-testid="development-result">
  <blockquote
    class="rounded-xl border border-theme-border/70 bg-theme-surface/50 p-4"
  >
    <p
      class="font-mono text-sm font-bold uppercase tracking-[0.24em] text-theme-primary"
    >
      Your idea
    </p>
    <p class="mt-2 whitespace-pre-wrap text-base text-theme-text">{ideaText}</p>
  </blockquote>

  {#if modeLabel}
    <p
      class="font-mono text-sm font-bold uppercase tracking-[0.24em] text-theme-muted"
      data-testid="mode-label"
    >
      {modeLabel} mode
    </p>
  {/if}

  {#if development.whatChanged}
    <p
      class="rounded-lg border border-theme-primary/30 bg-theme-primary/10 px-3 py-2 text-base text-theme-text"
    >
      <span class="font-bold">What changed:</span>
      {development.whatChanged}
    </p>
  {/if}

  <section aria-labelledby="dev-interesting">
    <h2
      id="dev-interesting"
      class="font-header text-lg font-bold text-theme-text"
    >
      {titles.alreadyInteresting}
    </h2>
    <p class="mt-1 text-base text-theme-muted">
      {development.alreadyInteresting}
    </p>
  </section>

  <section aria-labelledby="dev-question">
    <h2 id="dev-question" class="font-header text-lg font-bold text-theme-text">
      {titles.centralQuestion}
    </h2>
    <p class="mt-1 text-base text-theme-muted">{development.centralQuestion}</p>
  </section>

  <section aria-labelledby="dev-move">
    <h2 id="dev-move" class="font-header text-lg font-bold text-theme-text">
      {titles.makeItMove}
    </h2>
    <p class="mt-1 text-base text-theme-muted">{development.makeItMove}</p>
  </section>

  <section aria-labelledby="dev-people">
    <h2 id="dev-people" class="font-header text-lg font-bold text-theme-text">
      {titles.peopleWhoCare}
    </h2>
    <ul class="mt-2 grid gap-2 sm:grid-cols-2">
      {#each development.peopleWhoCare as person, index (index)}
        <li
          class="rounded-lg border border-theme-border/60 bg-theme-surface/40 p-3 text-base"
        >
          <p class="font-bold text-theme-text">
            {person.name}
            <span class="font-normal text-theme-muted">({person.role})</span>
          </p>
          <p class="mt-1 text-theme-muted">Wants: {person.wants}</p>
          <p class="text-theme-muted">Clashes with: {person.conflictsWith}</p>
        </li>
      {/each}
    </ul>
  </section>

  <section aria-labelledby="dev-players">
    <h2 id="dev-players" class="font-header text-lg font-bold text-theme-text">
      {titles.playerDirections}
    </h2>
    <ul class="mt-2 flex flex-col gap-2">
      {#each development.playerDirections as direction, index (index)}
        <li class="text-base">
          <span class="font-bold text-theme-text">{direction.title}</span>
          <span class="block text-theme-muted">{direction.description}</span>
        </li>
      {/each}
    </ul>
  </section>

  <section aria-labelledby="dev-consequences">
    <h2
      id="dev-consequences"
      class="font-header text-lg font-bold text-theme-text"
    >
      {titles.consequences}
    </h2>
    <p class="mt-1 text-base text-theme-muted">{development.consequences}</p>
  </section>

  <section aria-labelledby="dev-questions">
    <h2
      id="dev-questions"
      class="font-header text-lg font-bold text-theme-text"
    >
      {titles.creatorQuestions}
    </h2>
    <ul class="mt-2 list-disc pl-5 text-base text-theme-muted">
      {#each development.creatorQuestions as question, index (index)}
        <li>{question}</li>
      {/each}
    </ul>
    <p class="mt-2 text-sm text-theme-muted">
      These are yours to answer. The tool doesn't decide them for you.
    </p>
  </section>

  <div class="flex flex-wrap items-center gap-3">
    <button
      type="button"
      onclick={copy}
      class="min-h-11 justify-center inline-flex items-center gap-2 rounded-lg border border-theme-border bg-theme-surface px-3 py-2 text-sm font-bold uppercase tracking-wider text-theme-text transition-colors hover:border-theme-primary/50"
    >
      <span class="icon-[lucide--copy] h-4 w-4" aria-hidden="true"></span>
      Copy result
    </button>
    {#if copied}
      <span class="text-sm text-theme-muted" role="status">Copied</span>
    {/if}
    {#if copyFailed}
      <span class="text-sm text-theme-muted" role="alert"
        >Couldn't copy. Select the text and copy it instead.</span
      >
    {/if}
  </div>
</div>
