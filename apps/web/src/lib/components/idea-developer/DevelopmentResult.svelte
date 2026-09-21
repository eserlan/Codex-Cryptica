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
  import SectionHeading from "./SectionHeading.svelte";

  let {
    development,
    ideaText,
    changed = null,
    previous = null,
    turn,
    clipboardService,
  }: {
    development: Development;
    ideaText: string;
    /** Sections this turn changed; null when there is nothing to compare. */
    changed?: ComparedSection[] | null;
    /** The result before this turn, so a changed section can show what it was. */
    previous?: Development | null;
    /** Which turn this is. */
    turn?: number;
    clipboardService?: Pick<ClipboardService, "copyContent">;
  } = $props();

  const isChanged = (key: ComparedSection) => changed?.includes(key) ?? false;

  // Which changed sections have their earlier version showing.
  let openSections = $state<ComparedSection[]>([]);
  const isOpen = (key: ComparedSection) => openSections.includes(key);
  const toggle = (key: ComparedSection) => {
    openSections = isOpen(key)
      ? openSections.filter((k) => k !== key)
      : [...openSections, key];
  };
  // A new result starts with everything closed.
  $effect(() => {
    void development;
    openSections = [];
  });
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

  <ResultLabel mode={development.mode} {turn} />

  <ChangeSummary whatChanged={development.whatChanged} {changed} />

  <section
    aria-labelledby="dev-interesting"
    class={sectionClass("alreadyInteresting")}
  >
    <SectionHeading
      id="dev-interesting"
      title={titles.alreadyInteresting}
      sectionKey="alreadyInteresting"
      changed={isChanged("alreadyInteresting")}
      {previous}
      open={isOpen("alreadyInteresting")}
      ontoggle={() => toggle("alreadyInteresting")}
    />
    <p class="mt-1 text-lg sm:text-base text-theme-muted">
      {development.alreadyInteresting}
    </p>
  </section>

  <section
    aria-labelledby="dev-question"
    class={sectionClass("centralQuestion")}
  >
    <SectionHeading
      id="dev-question"
      title={titles.centralQuestion}
      sectionKey="centralQuestion"
      changed={isChanged("centralQuestion")}
      {previous}
      open={isOpen("centralQuestion")}
      ontoggle={() => toggle("centralQuestion")}
    />
    <p class="mt-1 text-lg sm:text-base text-theme-muted">
      {development.centralQuestion}
    </p>
  </section>

  <section aria-labelledby="dev-move" class={sectionClass("makeItMove")}>
    <SectionHeading
      id="dev-move"
      title={titles.makeItMove}
      sectionKey="makeItMove"
      changed={isChanged("makeItMove")}
      {previous}
      open={isOpen("makeItMove")}
      ontoggle={() => toggle("makeItMove")}
    />
    <p class="mt-1 text-lg sm:text-base text-theme-muted">
      {development.makeItMove}
    </p>
  </section>

  <section aria-labelledby="dev-people" class={sectionClass("peopleWhoCare")}>
    <SectionHeading
      id="dev-people"
      title={titles.peopleWhoCare}
      sectionKey="peopleWhoCare"
      changed={isChanged("peopleWhoCare")}
      {previous}
      open={isOpen("peopleWhoCare")}
      ontoggle={() => toggle("peopleWhoCare")}
    />
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
    <SectionHeading
      id="dev-players"
      title={titles.playerDirections}
      sectionKey="playerDirections"
      changed={isChanged("playerDirections")}
      {previous}
      open={isOpen("playerDirections")}
      ontoggle={() => toggle("playerDirections")}
    />
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
    <SectionHeading
      id="dev-consequences"
      title={titles.consequences}
      sectionKey="consequences"
      changed={isChanged("consequences")}
      {previous}
      open={isOpen("consequences")}
      ontoggle={() => toggle("consequences")}
    />
    <p class="mt-1 text-lg sm:text-base text-theme-muted">
      {development.consequences}
    </p>
  </section>

  <section
    aria-labelledby="dev-questions"
    class={sectionClass("creatorQuestions")}
  >
    <SectionHeading
      id="dev-questions"
      title={titles.creatorQuestions}
      sectionKey="creatorQuestions"
      changed={isChanged("creatorQuestions")}
      {previous}
      open={isOpen("creatorQuestions")}
      ontoggle={() => toggle("creatorQuestions")}
    />
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
