<script lang="ts">
  import {
    applySuggestionOption,
    CONSEQUENCE_KEYS,
    defaultIdFactory,
    emptySessionPrepSteps,
    findSingleRouteClues,
    type PrepConsequences,
    type SessionPrep,
    type SessionPrepStep,
    type SessionPrepSuggestion,
  } from "generator-engine";
  import {
    SESSION_PREP_SEED_MAX_LENGTH,
    type SessionPrepService,
  } from "$lib/services/seo/session-prep-service";
  import SessionPrepStepSection from "./SessionPrepStep.svelte";
  import SessionPrepItemList from "./SessionPrepItemList.svelte";
  import SessionPrepClueList from "./SessionPrepClueList.svelte";
  import { prepFieldClass } from "./prep-field-styles";

  let {
    prep = $bindable(),
    service,
    disabled = false,
    online = true,
    onBusyChange,
  }: {
    prep: SessionPrep;
    service: SessionPrepService;
    disabled?: boolean;
    online?: boolean;
    /** Reports when a form AI request starts and ends, so the page can hold a build. */
    onBusyChange?: (busy: boolean) => void;
  } = $props();

  type AiTask = SessionPrepStep | "draft" | `routes:${string}`;

  let aiTask = $state<AiTask | null>(null);
  let suggestions = $state<
    Partial<Record<SessionPrepStep, SessionPrepSuggestion>>
  >({});
  let errors = $state<Partial<Record<AiTask, string>>>({});

  const locked = $derived(disabled || aiTask !== null);
  const aiDisabled = $derived(locked || !online);
  const emptyCount = $derived(emptySessionPrepSteps(prep).length);
  const bottlenecks = $derived(
    new Set(findSingleRouteClues(prep).map((clue) => clue.id)),
  );
  const routesInFlight = $derived(
    aiTask?.startsWith("routes:") ? aiTask.slice("routes:".length) : null,
  );
  const routeErrors = $derived(
    Object.fromEntries(
      Object.entries(errors)
        .filter(([task]) => task.startsWith("routes:"))
        .map(([task, error]) => [task.slice("routes:".length), error]),
    ),
  );

  const CONSEQUENCE_LABELS: Record<keyof PrepConsequences, string> = {
    success: "If they succeed",
    failure: "If they fail",
    delay: "If they delay",
    avoidance: "If they avoid it",
  };

  function message(error: unknown): string {
    return error instanceof Error
      ? error.message
      : "Something went wrong. Please try again.";
  }

  async function runAi(task: AiTask, work: () => Promise<void>) {
    if (aiTask !== null || disabled) return;
    aiTask = task;
    onBusyChange?.(true);
    errors[task] = undefined;
    try {
      await work();
    } catch (error) {
      errors[task] = message(error);
    } finally {
      aiTask = null;
      onBusyChange?.(false);
    }
  }

  const snapshot = () => $state.snapshot(prep) as SessionPrep;

  function draftEmptySteps() {
    return runAi("draft", async () => {
      prep = await service.draft(snapshot());
    });
  }

  function suggest(step: SessionPrepStep) {
    return runAi(step, async () => {
      suggestions[step] = await service.suggest(snapshot(), step);
    });
  }

  function suggestRoutes(clueId: string) {
    return runAi(`routes:${clueId}`, async () => {
      prep = await service.suggestRoutes(snapshot(), clueId);
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

  function stepProps(step: SessionPrepStep) {
    return {
      step,
      suggestion: suggestions[step] ?? null,
      error: errors[step] ?? null,
      isSuggesting: aiTask === step,
      aiDisabled,
      acceptDisabled: locked,
      onSuggest: () => suggest(step),
      onAccept: (index: number) => accept(step, index),
      onDismiss: () => (suggestions[step] = undefined),
    };
  }

  const newItem = () => ({ id: defaultIdFactory(), source: "gm" as const });
</script>

<div class="space-y-3">
  <div class="space-y-2">
    <label
      for="prep-seed"
      class="block text-[10px] font-bold uppercase tracking-wider text-theme-muted"
    >
      What is tonight about?
    </label>
    <textarea
      id="prep-seed"
      bind:value={prep.seed}
      disabled={locked}
      maxlength={SESSION_PREP_SEED_MAX_LENGTH}
      rows="4"
      placeholder="The party returned to town after stealing the duke's ledger, and the duke knows who took it…"
      class="{prepFieldClass} resize-y text-sm leading-relaxed"
      aria-describedby="prep-seed-hint"
    ></textarea>
    <p id="prep-seed-hint" class="text-[10px] text-theme-muted">
      A hook, last session's fallout, or where the campaign stands now. Fill in
      any steps you already know; AI can draft the rest.
    </p>
  </div>

  <div
    class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-theme-primary/30 bg-theme-primary/10 p-2.5"
  >
    <p class="text-[11px] leading-snug text-theme-text">
      {#if emptyCount > 0}
        {emptyCount} of 8 steps are empty. AI fills only those and leaves what you
        wrote alone.
      {:else}
        Every step has something in it. Use Suggest on any step for more
        options.
      {/if}
    </p>
    <button
      type="button"
      onclick={draftEmptySteps}
      disabled={aiDisabled || emptyCount === 0}
      class="flex items-center gap-1.5 rounded-lg bg-theme-primary px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-theme-bg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span
        class={aiTask === "draft"
          ? "icon-[lucide--loader-circle] h-3.5 w-3.5 animate-spin"
          : "icon-[lucide--wand-sparkles] h-3.5 w-3.5"}
        aria-hidden="true"
      ></span>
      {aiTask === "draft" ? "Drafting…" : "Draft empty steps"}
    </button>
    {#if errors.draft}
      <p role="alert" class="w-full text-[11px] text-theme-danger">
        {errors.draft}
      </p>
    {/if}
    {#if !online}
      <p class="w-full text-[11px] text-theme-muted">
        You are offline. You can still fill the steps and build the run sheet
        yourself.
      </p>
    {/if}
  </div>

  <SessionPrepStepSection
    {...stepProps("start")}
    number={1}
    title="Start"
    hint="Where play begins: what just happened and what demands attention."
  >
    <textarea
      bind:value={prep.start}
      disabled={locked}
      rows="3"
      aria-label="Where play begins"
      class={prepFieldClass}
    ></textarea>
  </SessionPrepStepSection>

  <SessionPrepStepSection
    {...stepProps("pressure")}
    number={2}
    title="Pressure"
    hint="What is moving tonight if the characters do nothing."
  >
    <textarea
      bind:value={prep.pressure}
      disabled={locked}
      rows="3"
      aria-label="Tonight's pressure"
      class={prepFieldClass}
    ></textarea>
  </SessionPrepStepSection>

  <SessionPrepStepSection
    {...stepProps("people")}
    number={3}
    title="People"
    hint="Who matters tonight, what they want, and what they do next."
  >
    <SessionPrepItemList
      bind:items={prep.people}
      fields={[
        { key: "name", label: "Name" },
        { key: "wants", label: "Wants" },
        { key: "doesNext", label: "Does next" },
      ]}
      noun="Person"
      {locked}
      create={() => ({ ...newItem(), name: "", wants: "", doesNext: "" })}
    />
  </SessionPrepStepSection>

  <SessionPrepStepSection
    {...stepProps("places")}
    number={4}
    title="Places"
    hint="Likely places, with a danger and something worth finding."
  >
    <SessionPrepItemList
      bind:items={prep.places}
      fields={[
        { key: "name", label: "Place" },
        { key: "detail", label: "What is playable there", wide: true },
      ]}
      noun="Place"
      {locked}
      create={() => ({ ...newItem(), name: "", detail: "" })}
    />
  </SessionPrepStepSection>

  <SessionPrepStepSection
    {...stepProps("information")}
    number={5}
    title="Information"
    hint="Facts the players may need, and the ways they can find each one."
  >
    <SessionPrepClueList
      bind:clues={prep.information}
      {locked}
      {aiDisabled}
      {bottlenecks}
      {routesInFlight}
      {routeErrors}
      onSuggestRoutes={suggestRoutes}
    />
  </SessionPrepStepSection>

  <SessionPrepStepSection
    {...stepProps("complications")}
    number={6}
    title="Complications"
    hint="Things that might happen depending on choices. Not a scene order."
  >
    <SessionPrepItemList
      bind:items={prep.complications}
      fields={[{ key: "text", label: "Complication", multiline: true }]}
      noun="Complication"
      {locked}
      create={() => ({ ...newItem(), text: "" })}
    />
  </SessionPrepStepSection>

  <SessionPrepStepSection
    {...stepProps("consequences")}
    number={7}
    title="Consequences"
    hint="How the world reacts to the main pressure."
  >
    <div class="grid gap-1.5 @md:grid-cols-2">
      {#each CONSEQUENCE_KEYS as key (key)}
        <input
          bind:value={prep.consequences[key]}
          disabled={locked}
          placeholder={CONSEQUENCE_LABELS[key]}
          aria-label={CONSEQUENCE_LABELS[key]}
          class={prepFieldClass}
        />
      {/each}
    </div>
  </SessionPrepStepSection>

  <SessionPrepStepSection
    {...stepProps("reserve")}
    number={8}
    title="Reserve"
    hint="Spare names, a minor NPC, a complication or a place you can use anywhere."
  >
    <SessionPrepItemList
      bind:items={prep.reserve}
      fields={[{ key: "text", label: "Reserve item", multiline: true }]}
      noun="Reserve item"
      {locked}
      create={() => ({ ...newItem(), text: "" })}
    />
  </SessionPrepStepSection>
</div>
