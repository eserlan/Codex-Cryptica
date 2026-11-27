<script lang="ts">
  import { tick } from "svelte";
  import type { AdventureManager } from "#lib/stores/oracle/adventure-manager.svelte.js";
  import type { AdventureFocusCompletion } from "./adventure-focus-completion.svelte.js";
  import AdventureScenarioControls from "./AdventureScenarioControls.svelte";
  import AdventurePlay from "./AdventurePlay.svelte";
  import AdventureRollPrompt from "./AdventureRollPrompt.svelte";
  import AdventureCompletionPanel from "./AdventureCompletionPanel.svelte";
  import AdventureComposer from "./AdventureComposer.svelte";
  let {
    manager,
    completion,
    phone,
    keyboardOpen,
    focusElement,
  }: {
    manager: AdventureManager;
    completion: AdventureFocusCompletion;
    phone: boolean;
    keyboardOpen: boolean;
    focusElement?: HTMLElement;
  } = $props();
  let playViewport = $state<HTMLElement>();
  const pendingCompletion = $derived(completion.pending);
  const transcriptLength = $derived(manager.transcript?.turns.length ?? 0);
  const pendingRollId = $derived(manager.session?.pendingRoll?.id ?? null);
  const oocEventVersion = $derived(
    (manager.oocExchanges ?? manager.session?.oocExchanges ?? [])
      .map((item) => `${item.id}:${item.status}`)
      .join(","),
  );
  const visibleEventVersion = $derived(
    `${transcriptLength}:${manager.phase}:${pendingRollId ?? ""}:${manager.streamedNarration?.length ?? 0}:${oocEventVersion}:${manager.oocGenerating ? "1" : "0"}`,
  );

  $effect.pre(() => {
    // These are the player-visible events that can add content below the
    // current viewport: a new turn, generation state, or a pending roll.
    const _event = visibleEventVersion;
    if (!playViewport) return;
    void tick().then(() => {
      if (!playViewport) return;
      const behavior = window.matchMedia?.("(prefers-reduced-motion: reduce)")
        .matches
        ? "auto"
        : "smooth";
      playViewport.scrollTo?.({ top: playViewport.scrollHeight, behavior });
    });
  });
</script>

<div
  class="flex min-h-0 min-w-0 flex-1 flex-col"
  data-testid="adventure-play-column"
>
  <main
    class="adventure-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:p-4 @4xl:p-6"
    bind:this={playViewport}
    data-testid="adventure-play-viewport"
  >
    <div class="mx-auto max-w-3xl space-y-4">
      <AdventureScenarioControls {manager} />
      <AdventurePlay {manager} showComposer={false} />
      <AdventureRollPrompt {manager} />
      {#if pendingCompletion}
        <AdventureCompletionPanel
          completion={pendingCompletion}
          continuationSet={completion.continuations}
          readOnly={manager.readOnly}
          busy={completion.busy}
          onContinue={() =>
            completion.continueExploring(pendingCompletion.eventId)}
          onFindAnother={() =>
            completion.findAnother(pendingCompletion.eventId)}
          onFinish={() => completion.finish(pendingCompletion.eventId)}
          onLaunchContinuation={(candidate) =>
            completion.launch(pendingCompletion.eventId, candidate)}
        />
      {/if}
    </div>
  </main>
  <!-- The composer stays outside the story scroll, visible above the keyboard
     and mobile safe area. Never remount it across generation/roll phases. -->
  <AdventureComposer
    {manager}
    {phone}
    {keyboardOpen}
    suggestionChips={!phone}
    overlayHost={focusElement}
  />
</div>
