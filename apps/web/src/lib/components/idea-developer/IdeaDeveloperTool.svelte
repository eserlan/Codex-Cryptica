<script lang="ts">
  import { MAX_IDEA_LENGTH, isModeId, listModes } from "generator-engine";
  import {
    ideaDeveloperStore,
    type IdeaDeveloperStore,
  } from "$lib/stores/idea-developer.svelte";
  import {
    ideaDeveloperTracker,
    type IdeaDeveloperTracker,
  } from "$lib/services/analytics/idea-developer-tracking";
  import SaveToCodexModal from "$lib/components/seo/SaveToCodexModal.svelte";
  import {
    clipboardService as defaultClipboardService,
    type ClipboardService,
  } from "$lib/services/ClipboardService";
  import {
    saveToCodex as defaultSaveToCodex,
    type SaveToCodex,
  } from "$lib/services/idea-developer/save-to-codex";
  import DevelopmentResult from "./DevelopmentResult.svelte";
  import FollowUpComposer from "./FollowUpComposer.svelte";
  import GeneratorLinks from "./GeneratorLinks.svelte";
  import NoticeBanner from "./NoticeBanner.svelte";
  import ProgressLine from "./ProgressLine.svelte";

  let {
    store = ideaDeveloperStore,
    saveToCodex = defaultSaveToCodex,
    tracker = ideaDeveloperTracker,
    clipboardService = defaultClipboardService,
  }: {
    store?: IdeaDeveloperStore;
    saveToCodex?: Pick<SaveToCodex, "save">;
    tracker?: Pick<IdeaDeveloperTracker, "signupStarted" | "generatorOpened">;
    clipboardService?: Pick<ClipboardService, "copyContent">;
  } = $props();

  const SAVE_QUERY =
    "?utm_source=idea-developer&utm_medium=save-to-codex&utm_campaign=seo-funnel";

  const modes = listModes();
  let showSaveModal = $state(false);
  let saveMessage = $state<string | null>(null);

  const submitting = $derived(store.status === "submitting");
  const active = $derived(store.status === "active");
  const canSubmit = $derived(store.ideaDraft.trim().length > 0 && !submitting);

  // Drop the tab's copy if the user removes this conversation's Session Hub draft.
  $effect(() => {
    store.reconcileHub();
  });

  function saveToCodexClicked() {
    saveMessage = null;
    const result = saveToCodex.save(store.conversation?.hubDraftId);
    if (result.ok) {
      tracker.signupStarted();
      showSaveModal = true;
    } else {
      saveMessage = result.message;
    }
  }
</script>

<div class="flex flex-col gap-4">
  {#if active && store.conversation?.latest}
    <DevelopmentResult
      development={store.conversation.latest}
      ideaText={store.conversation.ideaText}
      {clipboardService}
    />
    <FollowUpComposer {store} />
    <NoticeBanner notice={store.notice} />
    <GeneratorLinks
      suggestions={store.conversation.latest.generatorSuggestions}
      onOpen={(opened) => tracker.generatorOpened(opened)}
    />
    <div class="flex flex-col gap-3">
      <div class="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onclick={saveToCodexClicked}
          class="min-h-11 justify-center inline-flex items-center gap-2 rounded-lg bg-theme-primary px-4 py-2 text-sm font-bold uppercase tracking-wider text-theme-bg transition-opacity hover:opacity-90"
        >
          <span class="icon-[lucide--save] h-4 w-4" aria-hidden="true"></span>
          Save to your Codex
        </button>
        <button
          type="button"
          onclick={() => store.clear()}
          class="min-h-11 justify-center inline-flex items-center gap-2 rounded-lg border border-theme-border bg-theme-surface px-3 py-2 text-sm font-bold uppercase tracking-wider text-theme-text transition-colors hover:border-theme-primary/50"
        >
          <span class="icon-[lucide--rotate-ccw] h-4 w-4" aria-hidden="true"
          ></span>
          Start a new conversation
        </button>
      </div>
      {#if saveMessage}
        <p
          role="alert"
          class="rounded-lg border border-theme-border/70 bg-theme-surface/50 p-3 text-base text-theme-text"
        >
          {saveMessage}
        </p>
      {/if}
    </div>
    <SaveToCodexModal
      open={showSaveModal}
      redirectQuery={SAVE_QUERY}
      onConfirm={() => (showSaveModal = false)}
      onCancel={() => (showSaveModal = false)}
    />
  {:else}
    <div class="flex flex-col gap-2">
      <label
        for="idea-developer-input"
        class="font-mono text-sm font-bold uppercase tracking-[0.24em] text-theme-primary"
      >
        Your RPG idea
      </label>
      <textarea
        id="idea-developer-input"
        aria-label="Your RPG idea"
        class="min-h-40 w-full rounded-xl border border-theme-border bg-theme-bg/50 p-3 text-base text-theme-text placeholder:text-theme-muted/70 focus:border-theme-primary focus:outline-none"
        placeholder="A town where everything is made from dragon parts, but there are no dragons nearby."
        value={store.ideaDraft}
        readonly={submitting}
        oninput={(event) => store.setIdea(event.currentTarget.value)}
      ></textarea>
      <p class="text-right text-sm text-theme-muted">
        {store.ideaDraft.length} / {MAX_IDEA_LENGTH}
      </p>
    </div>

    <fieldset class="flex flex-col gap-2" disabled={submitting}>
      <legend
        class="font-mono text-sm font-bold uppercase tracking-[0.24em] text-theme-primary"
      >
        How should it look at your idea?
      </legend>
      <div class="grid gap-2 sm:grid-cols-2">
        {#each modes as mode (mode.id)}
          <label
            class="flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-base transition-colors {store.mode ===
            mode.id
              ? 'border-theme-primary bg-theme-primary/10'
              : 'border-theme-border/70 bg-theme-surface/40 hover:border-theme-primary/40'}"
          >
            <input
              type="radio"
              name="idea-developer-mode"
              value={mode.id}
              checked={store.mode === mode.id}
              onchange={() => isModeId(mode.id) && store.setMode(mode.id)}
              class="mt-1 h-5 w-5"
            />
            <span>
              <span class="block font-bold text-theme-text">{mode.label}</span>
              <span class="block text-sm text-theme-muted"
                >{mode.description}</span
              >
            </span>
          </label>
        {/each}
      </div>
    </fieldset>

    <div class="flex flex-col gap-3" data-testid="submit-area">
      <div class="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!canSubmit}
          onclick={() => store.submit()}
          class="min-h-11 justify-center inline-flex items-center gap-2 rounded-lg bg-theme-primary px-4 py-2 text-sm font-bold uppercase tracking-wider text-theme-bg transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span class="icon-[lucide--sparkles] h-4 w-4" aria-hidden="true"
          ></span>
          Develop my idea
        </button>
        {#if submitting}
          <button
            type="button"
            onclick={() => store.cancel()}
            class="min-h-11 justify-center inline-flex items-center gap-2 rounded-lg border border-theme-border bg-theme-surface px-3 py-2 text-sm font-bold uppercase tracking-wider text-theme-text"
          >
            Cancel
          </button>
        {/if}
      </div>
    </div>

    <ProgressLine running={submitting} />

    <NoticeBanner notice={store.notice} />
  {/if}
</div>
