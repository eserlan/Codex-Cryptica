<script lang="ts">
  import {
    DEVELOPMENT_SECTION_TITLES as titles,
    developmentToText,
    type ComparedSection,
    type Development,
  } from "generator-engine";
  import { type ClipboardService } from "$lib/services/ClipboardService";
  import ChangeSummary from "./ChangeSummary.svelte";
  import CopyButton from "./CopyButton.svelte";
  import ResultLabel from "./ResultLabel.svelte";
  import UpdatedBadge from "./UpdatedBadge.svelte";

  let {
    development,
    ideaText,
    changed = null,
    turn,
    maxTurns,
    clipboardService,
  }: {
    development: Development;
    ideaText: string;
    /** Sections this turn changed; null when there is nothing to compare. */
    changed?: ComparedSection[] | null;
    /** Which turn this is, and the most a conversation allows. */
    turn?: number;
    maxTurns?: number;
    clipboardService?: Pick<ClipboardService, "copyContent">;
  } = $props();

  const isChanged = (key: ComparedSection) => changed?.includes(key) ?? false;
  const sectionClass = (key: ComparedSection) =>
    isChanged(key) ? "border-l-4 border-theme-primary pl-3" : "";
</script>

<div class="flex flex-col gap-5" data-testid="development-result">
  <blockquote
    class="rounded-xl border border-theme-border/70 bg-theme-surface/50 p-4"
  >
    <p
      class="font-mono text-base sm:text-sm font-bold uppercase tracking-[0.24em] text-theme-primary"
    >
      Your idea
    </p>
    <p class="mt-2 whitespace-pre-wrap text-lg sm:text-base text-theme-text">
      {ideaText}
    </p>
  </blockquote>

  <ResultLabel mode={development.mode} {turn} {maxTurns} />

  <ChangeSummary whatChanged={development.whatChanged} {changed} />

  <section
    aria-labelledby="dev-interesting"
    class={sectionClass("alreadyInteresting")}
  >
    <h2
      id="dev-interesting"
      class="font-header text-xl sm:text-lg font-bold text-theme-text"
    >
      {titles.alreadyInteresting}<UpdatedBadge
        show={isChanged("alreadyInteresting")}
      />
    </h2>
    <p class="mt-1 text-lg sm:text-base text-theme-muted">
      {development.alreadyInteresting}
    </p>
  </section>

  <section
    aria-labelledby="dev-question"
    class={sectionClass("centralQuestion")}
  >
    <h2
      id="dev-question"
      class="font-header text-xl sm:text-lg font-bold text-theme-text"
    >
      {titles.centralQuestion}<UpdatedBadge
        show={isChanged("centralQuestion")}
      />
    </h2>
    <p class="mt-1 text-lg sm:text-base text-theme-muted">
      {development.centralQuestion}
    </p>
  </section>

  <section aria-labelledby="dev-move" class={sectionClass("makeItMove")}>
    <h2
      id="dev-move"
      class="font-header text-xl sm:text-lg font-bold text-theme-text"
    >
      {titles.makeItMove}<UpdatedBadge show={isChanged("makeItMove")} />
    </h2>
    <p class="mt-1 text-lg sm:text-base text-theme-muted">
      {development.makeItMove}
    </p>
  </section>

  <section aria-labelledby="dev-people" class={sectionClass("peopleWhoCare")}>
    <h2
      id="dev-people"
      class="font-header text-xl sm:text-lg font-bold text-theme-text"
    >
      {titles.peopleWhoCare}<UpdatedBadge show={isChanged("peopleWhoCare")} />
    </h2>
    <ul class="mt-2 grid gap-2 sm:grid-cols-2">
      {#each development.peopleWhoCare as person, index (index)}
        <li
          class="rounded-lg border border-theme-border/60 bg-theme-surface/40 p-3 text-lg sm:text-base"
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

  <section
    aria-labelledby="dev-players"
    class={sectionClass("playerDirections")}
  >
    <h2
      id="dev-players"
      class="font-header text-xl sm:text-lg font-bold text-theme-text"
    >
      {titles.playerDirections}<UpdatedBadge
        show={isChanged("playerDirections")}
      />
    </h2>
    <ul class="mt-2 flex flex-col gap-2">
      {#each development.playerDirections as direction, index (index)}
        <li class="text-lg sm:text-base">
          <span class="font-bold text-theme-text">{direction.title}</span>
          <span class="block text-theme-muted">{direction.description}</span>
        </li>
      {/each}
    </ul>
  </section>

  <section
    aria-labelledby="dev-consequences"
    class={sectionClass("consequences")}
  >
    <h2
      id="dev-consequences"
      class="font-header text-xl sm:text-lg font-bold text-theme-text"
    >
      {titles.consequences}<UpdatedBadge show={isChanged("consequences")} />
    </h2>
    <p class="mt-1 text-lg sm:text-base text-theme-muted">
      {development.consequences}
    </p>
  </section>

  <section
    aria-labelledby="dev-questions"
    class={sectionClass("creatorQuestions")}
  >
    <h2
      id="dev-questions"
      class="font-header text-xl sm:text-lg font-bold text-theme-text"
    >
      {titles.creatorQuestions}<UpdatedBadge
        show={isChanged("creatorQuestions")}
      />
    </h2>
    <ul class="mt-2 list-disc pl-5 text-lg sm:text-base text-theme-muted">
      {#each development.creatorQuestions as question, index (index)}
        <li>{question}</li>
      {/each}
    </ul>
    <p class="mt-2 text-lg sm:text-sm text-theme-muted">
      These are yours to answer. The tool doesn't decide them for you.
    </p>
  </section>

  <CopyButton
    text={developmentToText(development, ideaText)}
    {clipboardService}
  />
</div>
