<script lang="ts">
  import {
    buildOracleShortcutPrompt,
    TENSION_MAX,
    TENSION_MIN,
    type Likelihood,
  } from "solo-session-engine";
  import { soloSessionStore } from "$lib/stores/solo-session-instance";
  import { discoveryPolicyStore } from "$lib/stores/ui/discovery-policy.svelte";
  import { layoutUIStore } from "$lib/stores/ui/layout-ui.svelte";
  import { oracle } from "$lib/stores/oracle.svelte";
  import SoloMenu from "./SoloMenu.svelte";

  const QUESTION_LIMIT = 200;
  const CHOICES: { value: Likelihood; label: string }[] = [
    { value: "very_unlikely", label: "Very unlikely" },
    { value: "unlikely", label: "Unlikely" },
    { value: "even", label: "Even" },
    { value: "likely", label: "Likely" },
    { value: "very_likely", label: "Very likely" },
  ];

  let question = $state("");
  let likelihood = $state<Likelihood>("even");
  let answer = $state<{
    question: string;
    answer: string;
    roll: number;
  } | null>(null);
  let eventText = $state<string | null>(null);
  let error = $state<string | null>(null);

  const remaining = $derived(QUESTION_LIMIT - question.length);
  const tension = $derived(soloSessionStore.tension);

  function roll() {
    error = null;
    try {
      const result = soloSessionStore.ask(question, likelihood);
      answer = {
        question: result.question,
        answer: result.answer,
        roll: result.roll,
      };
      eventText = result.event?.text ?? null;
    } catch {
      error = "The dice could not answer just now.";
    }
  }

  function randomEvent() {
    error = null;
    eventText = soloSessionStore.randomEvent().text;
  }

  function interpret() {
    if (!answer) return;
    const session = soloSessionStore.session;
    oracle.ui.setPendingPrompt(
      buildOracleShortcutPrompt("interpret-answer", {
        question: answer.question,
        answer: answer.answer,
        sceneName: session?.sceneName ?? "",
        mapName: null,
        partyNames: soloSessionStore.party.map((m) => m.name),
        recent: [],
      }),
    );
    layoutUIStore.leftSidebarOpen = true;
    layoutUIStore.activeSidebarTool = "oracle";
  }
</script>

<SoloMenu
  label="Yes or no"
  testId="solo-yes-no-menu"
  helpTarget="solo-yes-no-menu"
>
  <div class="flex w-72 flex-col gap-2 text-sm">
    <label class="flex flex-col gap-1 text-theme-text">
      <span>Question (optional)</span>
      <input
        type="text"
        maxlength={QUESTION_LIMIT}
        bind:value={question}
        class="rounded-md border border-theme-border bg-theme-bg px-2 py-1 text-theme-text"
        data-testid="solo-yes-no-question"
      />
      <span
        class="text-xs text-theme-muted"
        data-testid="solo-yes-no-remaining"
      >
        {remaining} characters left
      </span>
    </label>

    <fieldset class="flex flex-wrap gap-1">
      <legend class="mb-1 text-theme-text">How likely is a yes?</legend>
      {#each CHOICES as choice (choice.value)}
        <label
          class="flex items-center gap-1 rounded-md px-2 py-1 text-theme-text"
        >
          <input
            type="radio"
            name="solo-yes-no-likelihood"
            value={choice.value}
            checked={likelihood === choice.value}
            onchange={() => (likelihood = choice.value)}
          />
          {choice.label}
        </label>
      {/each}
    </fieldset>

    <button
      type="button"
      class="rounded-md border border-theme-primary/60 px-3 py-1.5 font-bold text-theme-primary hover:bg-theme-primary/10"
      data-testid="solo-yes-no-roll"
      onclick={roll}
    >
      Roll
    </button>

    {#if error}
      <p role="alert" class="text-theme-danger">{error}</p>
    {/if}

    {#if answer}
      <p class="text-theme-text" data-testid="solo-yes-no-answer">
        {answer.answer}
        <span class="text-theme-muted">(roll {answer.roll})</span>
      </p>
    {/if}

    {#if eventText}
      <p class="text-theme-text" data-testid="solo-yes-no-event">{eventText}</p>
    {/if}

    <div class="flex items-center gap-2">
      <button
        type="button"
        class="rounded-md px-2 py-1 text-theme-text hover:text-theme-primary"
        data-testid="solo-random-event"
        onclick={randomEvent}
      >
        Random event
      </button>
    </div>

    <div class="flex items-center gap-2 text-theme-text" aria-label="Tension">
      <span>Tension</span>
      <button
        type="button"
        class="rounded-md px-2 py-0.5 hover:text-theme-primary disabled:opacity-40"
        aria-label="Lower tension"
        disabled={tension <= TENSION_MIN}
        onclick={() => soloSessionStore.lowerTension()}
      >
        −
      </button>
      <span data-testid="solo-tension-value">{tension} of {TENSION_MAX}</span>
      <button
        type="button"
        class="rounded-md px-2 py-0.5 hover:text-theme-primary disabled:opacity-40"
        aria-label="Raise tension"
        disabled={tension >= TENSION_MAX}
        onclick={() => soloSessionStore.raiseTension()}
      >
        +
      </button>
    </div>

    {#if !discoveryPolicyStore.aiDisabled && answer}
      <button
        type="button"
        class="rounded-md px-2 py-1 text-left text-theme-text hover:text-theme-primary"
        data-testid="solo-yes-no-interpret"
        onclick={interpret}
      >
        Interpret with the Oracle
      </button>
    {/if}
  </div>
</SoloMenu>
