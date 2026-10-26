<script lang="ts">
  import {
    applySuggestionOption,
    describeSessionPrepStep,
    describeSuggestionOption,
    emptySessionPrepSteps,
    findSingleRouteClues,
    hasSessionPrepContent,
    isSessionPrepStepEmpty,
    rememberTurnedDown,
    SESSION_PREP_DIRECTION_MAX_LENGTH,
    SESSION_PREP_STEPS,
    type SessionPrep,
    type SessionPrepGuidance,
    type SessionPrepRequest,
    type SessionPrepStep,
    type SessionPrepSuggestion,
    type TurnedDownIdea,
  } from "generator-engine";
  import {
    SESSION_PREP_SEED_MAX_LENGTH,
    type SessionPrepService,
  } from "$lib/services/seo/session-prep-service";
  import SessionPrepStepSection from "./SessionPrepStep.svelte";
  import SessionPrepStepFields from "./SessionPrepStepFields.svelte";
  import { prepFieldClass } from "./prep-field-styles";
  import { autosize } from "./prep-autosize";
  import { tick } from "svelte";
  import {
    previewSessionPrepStep,
    SESSION_PREP_STEP_INFO,
  } from "./session-prep-steps";

  let {
    prep = $bindable(),
    service,
    disabled = false,
    online = true,
    hasBuilt = false,
    hasUnbuiltChanges = false,
    onBusyChange,
    onBuild,
  }: {
    prep: SessionPrep;
    service: SessionPrepService;
    disabled?: boolean;
    online?: boolean;
    /** True once a run sheet has been built from this prep. */
    hasBuilt?: boolean;
    /** True when the prep has changed since the run sheet was last built. */
    hasUnbuiltChanges?: boolean;
    /** Reports when a form AI request starts and ends, so the page can hold a build. */
    onBusyChange?: (busy: boolean) => void;
    /**
     * Builds the run sheet; `fillEmpty` lets AI answer any empty steps first,
     * with the GM's guidance so far.
     */
    onBuild: (options: {
      fillEmpty: boolean;
      guidance: SessionPrepGuidance;
    }) => void;
  } = $props();

  type StepAiTask = `${"draft" | "redraft" | "suggest"}:${SessionPrepStep}`;
  type AiTask = StepAiTask | `routes:${string}`;

  /** The hook question comes first, then one question per prep step. */
  const QUESTION_COUNT = SESSION_PREP_STEPS.length + 1;

  let questionIndex = $state(0);
  let currentCard = $state<HTMLElement | null>(null);
  /** When on, Next asks AI to propose an answer to the next empty question. */
  let proposeOnNext = $state(true);
  let aiTask = $state<AiTask | null>(null);
  let suggestions = $state<
    Partial<Record<SessionPrepStep, SessionPrepSuggestion>>
  >({});
  /** Keyed by step, or `routes:<clue id>` for a fact's discovery routes. */
  let errors = $state<Record<string, string | undefined>>({});
  /** The GM's optional steer per step; sent with AI requests, never saved. */
  let directions = $state<Partial<Record<SessionPrepStep, string>>>({});
  /**
   * AI ideas the GM did not keep: dismissed suggestions, steps they redrafted
   * and redrafts they undid. Sent with each request so AI does not repeat them.
   */
  let turnedDown = $state<TurnedDownIdea[]>([]);
  /** The step as it was before its last AI redraft, so the GM can undo it. */
  let undo = $state<{ step: SessionPrepStep; before: SessionPrep } | null>(
    null,
  );

  function guidance(): SessionPrepGuidance {
    return $state.snapshot({ steers: directions, turnedDown });
  }

  function request(step?: SessionPrepStep): SessionPrepRequest {
    return {
      direction: step ? directions[step] : undefined,
      guidance: guidance(),
    };
  }

  function turnDown(ideas: TurnedDownIdea[]) {
    turnedDown = rememberTurnedDown(turnedDown, ideas);
  }

  const locked = $derived(disabled || aiTask !== null);
  const aiDisabled = $derived(locked || !online);
  const emptyCount = $derived(emptySessionPrepSteps(prep).length);
  const answeredCount = $derived(
    SESSION_PREP_STEPS.length - emptyCount + (prep.seed.trim() ? 1 : 0),
  );
  const canUseAi = $derived(online && hasSessionPrepContent(prep));
  const currentStep = $derived(
    questionIndex === 0 ? null : SESSION_PREP_STEPS[questionIndex - 1],
  );
  const isLastQuestion = $derived(questionIndex === QUESTION_COUNT - 1);
  const currentAnswered = $derived(
    currentStep === null
      ? prep.seed.trim() !== ""
      : !isSessionPrepStepEmpty(prep, currentStep),
  );
  /** The question Next leads to; the hook is question 0, so steps are offset. */
  const nextStep = $derived<SessionPrepStep | undefined>(
    SESSION_PREP_STEPS[questionIndex],
  );
  const nextProposesAnswer = $derived(
    proposeOnNext &&
      currentAnswered &&
      canUseAi &&
      nextStep !== undefined &&
      isSessionPrepStepEmpty(prep, nextStep),
  );
  const bottlenecks = $derived(
    new Set(findSingleRouteClues(prep).map((clue) => clue.id)),
  );
  const routesInFlight = $derived(
    aiTask?.startsWith("routes:") ? aiTask.slice("routes:".length) : null,
  );
  const routeErrors = $derived(
    Object.fromEntries(
      Object.entries(errors)
        .filter(([key]) => key.startsWith("routes:"))
        .map(([key, error]) => [key.slice("routes:".length), error]),
    ),
  );

  function message(error: unknown): string {
    return error instanceof Error
      ? error.message
      : "Something went wrong. Please try again.";
  }

  async function runAi(task: AiTask, work: () => Promise<void>) {
    if (aiTask !== null || disabled) return;
    const errorKey = task.startsWith("routes:") ? task : task.split(":")[1];
    aiTask = task;
    onBusyChange?.(true);
    errors[errorKey] = undefined;
    try {
      await work();
    } catch (error) {
      errors[errorKey] = message(error);
    } finally {
      aiTask = null;
      onBusyChange?.(false);
    }
  }

  const snapshot = () => $state.snapshot(prep) as SessionPrep;

  function draftStep(step: SessionPrepStep) {
    return runAi(`draft:${step}`, async () => {
      prep = await service.draftStep(snapshot(), step, request(step));
    });
  }

  function redraftStep(step: SessionPrepStep) {
    return runAi(`redraft:${step}`, async () => {
      const before = snapshot();
      prep = await service.redraftStep(before, step, request(step));
      undo = { step, before };
      // Asking for a redraft means the old version did not fit.
      turnDown([{ step, text: describeSessionPrepStep(before, step) }]);
    });
  }

  function undoRedraft() {
    if (!undo || locked) return;
    const { step, before } = undo;
    const restored = describeSessionPrepStep(before, step);
    turnedDown = turnedDown.filter(
      (idea) => !(idea.step === step && idea.text === restored),
    );
    turnDown([{ step, text: describeSessionPrepStep(snapshot(), step) }]);
    prep = { ...snapshot(), [step]: before[step] };
    undo = null;
  }

  function suggest(step: SessionPrepStep) {
    return runAi(`suggest:${step}`, async () => {
      suggestions[step] = await service.suggest(
        snapshot(),
        step,
        request(step),
      );
    });
  }

  function suggestRoutes(clueId: string) {
    return runAi(`routes:${clueId}`, async () => {
      prep = await service.suggestRoutes(snapshot(), clueId, request());
    });
  }

  function accept(step: SessionPrepStep, index: number) {
    const suggestion = suggestions[step];
    if (!suggestion || locked) return;
    prep = applySuggestionOption(snapshot(), suggestion, index);
    const remaining = suggestion.options.filter((_, i) => i !== index);
    suggestions[step] = remaining.length
      ? ({ ...suggestion, options: remaining } as SessionPrepSuggestion)
      : undefined;
  }

  function dismiss(step: SessionPrepStep) {
    const suggestion = suggestions[step];
    if (suggestion) {
      turnDown(
        suggestion.options.map((_, index) => ({
          step,
          text: describeSuggestionOption(suggestion, index),
        })),
      );
    }
    suggestions[step] = undefined;
  }

  async function goTo(index: number) {
    questionIndex = Math.min(Math.max(index, 0), QUESTION_COUNT - 1);
    // Rows above collapse or expand, so keep the open question in view.
    await tick();
    currentCard?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  }

  function next() {
    const propose = nextProposesAnswer ? nextStep : undefined;
    void goTo(questionIndex + 1);
    if (propose) void draftStep(propose);
  }

  function sectionProps(step: SessionPrepStep, number: number, title: string) {
    return {
      step,
      number,
      title,
      hint: SESSION_PREP_STEP_INFO[step].hint,
      suggestion: suggestions[step] ?? null,
      error: errors[step] ?? null,
      acceptDisabled: locked,
      onAccept: (index: number) => accept(step, index),
      onDismiss: () => dismiss(step),
    };
  }

  function fieldProps(step: SessionPrepStep) {
    return {
      step,
      locked,
      aiDisabled,
      bottlenecks,
      routesInFlight,
      routeErrors,
      onSuggestRoutes: suggestRoutes,
    };
  }

  const primaryButtonClass =
    "flex items-center justify-center gap-1.5 rounded-lg bg-theme-primary px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-theme-bg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50";
  const secondaryButtonClass =
    "flex items-center justify-center gap-1.5 rounded-lg border border-theme-primary/40 px-3 py-2 text-xs font-bold uppercase tracking-wider text-theme-primary transition hover:bg-theme-primary/10 disabled:cursor-not-allowed disabled:opacity-50";
  const quietButtonClass =
    "flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wider text-theme-muted transition hover:text-theme-text disabled:cursor-not-allowed disabled:opacity-50";
</script>

{#snippet aiButton(
  task: StepAiTask,
  label: string,
  busyLabel: string,
  icon: string,
  ariaLabel: string,
  onclick: () => void,
  primary = false,
)}
  <button
    type="button"
    {onclick}
    disabled={aiDisabled}
    class={primary ? primaryButtonClass : secondaryButtonClass}
    aria-label={ariaLabel}
  >
    <span
      class={aiTask === task
        ? "icon-[lucide--loader-circle] h-3.5 w-3.5 animate-spin"
        : `${icon} h-3.5 w-3.5`}
      aria-hidden="true"
    ></span>
    {aiTask === task ? busyLabel : label}
  </button>
{/snippet}

{#snippet guideField(step: SessionPrepStep, onEnter: () => void)}
  {@const info = SESSION_PREP_STEP_INFO[step]}
  <div class="relative">
    <span
      class="icon-[lucide--sparkles] pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-theme-primary"
      aria-hidden="true"
    ></span>
    <input
      bind:value={directions[step]}
      onkeydown={(event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        if (!aiDisabled) onEnter();
      }}
      disabled={locked}
      maxlength={SESSION_PREP_DIRECTION_MAX_LENGTH}
      placeholder={`Guide the AI, e.g. ${info.guideExample}`}
      aria-label={`Guide the AI for ${info.label}`}
      class="{prepFieldClass} pl-8"
    />
  </div>
{/snippet}

{#snippet undoNotice(step: SessionPrepStep)}
  {#if undo?.step === step}
    <div
      class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-theme-border/50 px-2.5 py-2"
    >
      <p class="text-sm text-theme-muted">AI redrafted this section.</p>
      <button
        type="button"
        onclick={undoRedraft}
        disabled={locked}
        class={quietButtonClass}
      >
        <span class="icon-[lucide--undo-2] h-3.5 w-3.5" aria-hidden="true"
        ></span>
        Undo redraft
      </button>
    </div>
  {/if}
{/snippet}

{#snippet hookField()}
  <textarea
    id="prep-seed"
    bind:value={prep.seed}
    {@attach autosize(() => prep.seed)}
    disabled={locked}
    maxlength={SESSION_PREP_SEED_MAX_LENGTH}
    rows="3"
    placeholder="The party returned to town after stealing the duke's ledger, and the duke knows who took it…"
    class="{prepFieldClass} resize-none text-sm leading-relaxed"
    aria-describedby="prep-seed-hint"
  ></textarea>
  <p id="prep-seed-hint" class="text-sm leading-snug text-theme-muted">
    A hook, last session's fallout, or where the campaign stands now. AI uses
    this to answer the other questions.
  </p>
{/snippet}

{#snippet offlineNotice()}
  {#if !online}
    <p class="text-sm text-theme-muted">
      You are offline. You can still answer the questions yourself and build the
      run sheet.
    </p>
  {/if}
{/snippet}

{#snippet questionRow(index: number)}
  {@const step = index === 0 ? null : SESSION_PREP_STEPS[index - 1]}
  {@const answered =
    step === null
      ? prep.seed.trim() !== ""
      : !isSessionPrepStepEmpty(prep, step)}
  {@const info = step ? SESSION_PREP_STEP_INFO[step] : null}
  <button
    type="button"
    onclick={() => goTo(index)}
    disabled={locked}
    class="flex w-full items-start gap-2.5 rounded-xl border border-theme-border/40 bg-theme-bg/30 px-3 py-2.5 text-left transition hover:border-theme-primary/50 disabled:cursor-not-allowed {answered
      ? ''
      : 'opacity-60'}"
  >
    <span
      class="{answered
        ? 'icon-[lucide--circle-check] text-theme-primary'
        : 'icon-[lucide--circle] text-theme-muted'} mt-0.5 h-4 w-4 shrink-0"
      aria-hidden="true"
    ></span>
    <span class="min-w-0 flex-1">
      <span class="block text-sm font-bold text-theme-text">
        {#if info}{index}. {info.label}{:else}Hook{/if}
      </span>
      <span class="line-clamp-2 block text-sm leading-snug text-theme-muted">
        {#if !answered}
          {info?.question ?? "What is tonight about?"}
        {:else if step}
          {previewSessionPrepStep(prep, step)}
        {:else}
          {prep.seed.trim()}
        {/if}
      </span>
    </span>
    <span
      class="icon-[lucide--pencil] mt-0.5 h-3.5 w-3.5 shrink-0 text-theme-muted"
      aria-hidden="true"
    ></span>
  </button>
{/snippet}

{#snippet currentQuestion()}
  {#if currentStep === null}
    <section
      aria-labelledby="prep-seed-heading"
      class="space-y-2.5 rounded-xl border border-theme-primary/40 bg-theme-bg/40 p-3"
    >
      <h3
        id="prep-seed-heading"
        class="text-base font-bold leading-snug text-theme-text"
      >
        <label for="prep-seed">What is tonight about?</label>
      </h3>
      {@render hookField()}
      {@render navigation()}
    </section>
  {:else}
    {@const info = SESSION_PREP_STEP_INFO[currentStep]}
    {@const step = currentStep}
    <SessionPrepStepSection
      {...sectionProps(step, questionIndex, info.question)}
    >
      {#snippet guide()}
        {@render guideField(step, () =>
          isSessionPrepStepEmpty(prep, step) ? draftStep(step) : suggest(step),
        )}
      {/snippet}
      {#snippet actions()}
        {#if isSessionPrepStepEmpty(prep, step)}
          {@render aiButton(
            `draft:${step}`,
            "Answer with AI",
            "Answering…",
            "icon-[lucide--wand-sparkles]",
            `Answer ${info.label} with AI`,
            () => draftStep(step),
            true,
          )}
        {:else}
          {@render aiButton(
            `suggest:${step}`,
            "More ideas",
            "Thinking…",
            "icon-[lucide--sparkles]",
            `Suggest more ideas for ${info.label} with AI`,
            () => suggest(step),
          )}
          {@render aiButton(
            `redraft:${step}`,
            "Redraft",
            "Redrafting…",
            "icon-[lucide--refresh-cw]",
            `Redraft ${info.label} with AI`,
            () => redraftStep(step),
          )}
        {/if}
      {/snippet}
      <SessionPrepStepFields bind:prep {...fieldProps(step)} />
      {@render undoNotice(step)}
      {@render navigation()}
    </SessionPrepStepSection>
  {/if}
{/snippet}

{#snippet navigation()}
  <div class="flex items-center justify-between gap-2 pt-1">
    <button
      type="button"
      onclick={() => goTo(questionIndex - 1)}
      disabled={locked || questionIndex === 0}
      class={quietButtonClass}
    >
      <span class="icon-[lucide--arrow-left] h-3.5 w-3.5" aria-hidden="true"
      ></span>
      Back
    </button>
    {#if !isLastQuestion}
      <button
        type="button"
        onclick={next}
        disabled={locked}
        class={currentAnswered ? primaryButtonClass : secondaryButtonClass}
        title={nextProposesAnswer
          ? "Go to the next question and let AI propose an answer"
          : undefined}
      >
        {currentAnswered ? "Next" : "Skip"}
        <span
          class="{nextProposesAnswer
            ? 'icon-[lucide--wand-sparkles]'
            : 'icon-[lucide--arrow-right]'} h-3.5 w-3.5"
          aria-hidden="true"
        ></span>
      </button>
    {/if}
  </div>
{/snippet}

{#snippet progress()}
  <div class="space-y-1.5">
    <p
      class="text-xs font-bold uppercase tracking-wider text-theme-muted"
      aria-live="polite"
    >
      {answeredCount} of {QUESTION_COUNT} answered
    </p>
    <div
      class="flex gap-1"
      role="progressbar"
      aria-label="Questions answered"
      aria-valuemin={0}
      aria-valuemax={QUESTION_COUNT}
      aria-valuenow={answeredCount}
    >
      {#each { length: QUESTION_COUNT } as _, index (index)}
        <span
          class="h-1.5 flex-1 rounded-full {index < answeredCount
            ? 'bg-theme-primary'
            : 'bg-theme-border/60'}"
        ></span>
      {/each}
    </div>
  </div>
{/snippet}

{#snippet buildPanel()}
  {#if online}
    <label class="flex items-center gap-2 text-sm text-theme-muted">
      <input
        type="checkbox"
        bind:checked={proposeOnNext}
        class="h-4 w-4 rounded border-theme-border/60 text-theme-primary"
      />
      Next asks AI to propose an answer to the next question
    </label>
  {/if}

  {#if canUseAi && emptyCount > 0}
    <div
      class="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-theme-primary/30 bg-theme-primary/10 p-3"
    >
      <p class="flex-1 basis-48 text-sm leading-snug text-theme-text">
        {emptyCount} of {SESSION_PREP_STEPS.length} questions are unanswered. AI can
        answer them from what you have and build the run sheet now.
      </p>
      <button
        type="button"
        onclick={() => onBuild({ fillEmpty: true, guidance: guidance() })}
        disabled={locked}
        class={primaryButtonClass}
      >
        <span
          class="icon-[lucide--wand-sparkles] h-3.5 w-3.5"
          aria-hidden="true"
        ></span>
        Answer the rest with AI
      </button>
    </div>
  {/if}

  {#if turnedDown.length > 0}
    <div
      class="flex flex-wrap items-center justify-between gap-2 text-sm text-theme-muted"
      role="status"
    >
      <p class="flex-1 basis-48">
        AI will avoid {turnedDown.length}
        {turnedDown.length === 1 ? "idea" : "ideas"} you turned down.
      </p>
      <button
        type="button"
        onclick={() => (turnedDown = [])}
        disabled={locked}
        class={quietButtonClass}
      >
        Forget them
      </button>
    </div>
  {/if}

  {#if hasUnbuiltChanges}
    <p
      class="rounded-lg border border-theme-accent/40 bg-theme-accent/10 px-3 py-2 text-sm text-theme-text"
      role="status"
    >
      You have changes that are not in the run sheet yet.
    </p>
  {/if}

  <button
    type="button"
    onclick={() => onBuild({ fillEmpty: false, guidance: guidance() })}
    disabled={locked}
    class="{primaryButtonClass} w-full py-3"
  >
    <span
      class="{hasBuilt
        ? 'icon-[lucide--refresh-cw]'
        : 'icon-[lucide--scroll-text]'} h-3.5 w-3.5"
      aria-hidden="true"
    ></span>
    {hasBuilt ? "Update run sheet" : "Build my run sheet"}
  </button>
{/snippet}

<div class="space-y-3">
  {@render progress()}

  <ol class="space-y-2">
    {#each { length: QUESTION_COUNT } as _, index (index)}
      <li aria-current={index === questionIndex ? "step" : undefined}>
        {#if index === questionIndex}
          <div bind:this={currentCard} class="scroll-mt-24">
            {@render currentQuestion()}
          </div>
        {:else}
          {@render questionRow(index)}
        {/if}
      </li>
    {/each}
  </ol>

  {@render buildPanel()}
  {@render offlineNotice()}
</div>
