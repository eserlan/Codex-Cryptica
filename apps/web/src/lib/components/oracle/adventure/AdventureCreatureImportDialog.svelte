<!-- fallow-ignore-file complexity -- Review, preview and result steps of the creature import dialog. -->
<script lang="ts">
  import { onMount, tick, untrack } from "svelte";
  import {
    buildCreatureProposals,
    type SourceReference,
    type StoredAdventurePackage,
  } from "@codex/adventure-engine";
  import {
    importCreatures,
    initialCreatureChoices,
    type CreatureImportResult,
  } from "#lib/services/adventure/adventure-creature-import.js";
  import {
    createVaultCreatureImportEnvironment,
    type CreatureImportEnvironment,
  } from "#lib/services/adventure/adventure-creature-import-deps.js";
  import { containTab } from "./adventure-phone-surface.js";

  let {
    item,
    environment = createVaultCreatureImportEnvironment(),
    onClose,
  }: {
    item: StoredAdventurePackage;
    environment?: CreatureImportEnvironment;
    onClose: () => void;
  } = $props();

  const pkg = $derived(item.package);
  let choices = $state(
    untrack(() =>
      initialCreatureChoices(
        item.package,
        buildCreatureProposals(item.package),
        environment.listCreatures(),
      ),
    ),
  );
  let step = $state<"review" | "preview" | "done">("review");
  let busy = $state(false);
  let result = $state<CreatureImportResult | null>(null);
  let dialogPanel = $state<HTMLElement>();
  let closeButton = $state<HTMLButtonElement>();
  let heading = $state<HTMLElement>();

  const creating = $derived(
    choices.filter((choice) => choice.include && !choice.existing),
  );
  const reusing = $derived(
    choices.filter((choice) => choice.include && choice.existing),
  );

  const nothingSelected = $derived(creating.length + reusing.length === 0);
  const reviewPageSize = 20;
  let reviewPage = $state(0);
  const reviewPageStart = $derived(reviewPage * reviewPageSize);
  const reviewPageCount = $derived(Math.ceil(choices.length / reviewPageSize));
  const visibleChoices = $derived(
    choices.slice(reviewPageStart, reviewPageStart + reviewPageSize),
  );
  const previewPageSize = 20;
  let previewPage = $state(0);
  const previewTotal = $derived(creating.length + reusing.length);
  const previewPageStart = $derived(previewPage * previewPageSize);
  const previewPageCount = $derived(
    Math.ceil(previewTotal / previewPageSize),
  );
  const previewCreating = $derived(
    creating.slice(previewPageStart, previewPageStart + previewPageSize),
  );
  const previewReusing = $derived(
    reusing.slice(
      Math.max(0, previewPageStart - creating.length),
      Math.max(0, previewPageStart + previewPageSize - creating.length),
    ),
  );

  async function goTo(next: "review" | "preview" | "done") {
    if (next === "preview") previewPage = 0;
    step = next;
    await tick();
    heading?.focus();
  }

  function close() {
    if (!busy) onClose();
  }

  onMount(() => {
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    closeButton?.focus();
    return () => {
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  });

  function pageLabel(refs: SourceReference[]): string {
    const cited = refs
      .filter((ref) => typeof ref.page === "number")
      .map((ref) => ({ start: ref.page!, end: ref.pageEnd ?? ref.page! }))
      .sort((a, b) => a.start - b.start || a.end - b.end);
    const labels = cited.map(({ start, end }) =>
      start === end ? String(start) : `${start}–${end}`,
    );
    if (labels.length === 0) return "Page not given";
    return labels.length === 1 && cited[0]!.start === cited[0]!.end
      ? `Page ${labels[0]}`
      : `Pages ${labels.join(", ")}`;
  }

  function pickFile(index: number, event: Event) {
    const file = (event.currentTarget as HTMLInputElement).files?.[0];
    if (file) choices[index]!.file = file;
  }

  async function confirm() {
    busy = true;
    try {
      result = await importCreatures(
        pkg,
        item.hash,
        choices,
        environment.importDeps,
      );
    } finally {
      busy = false;
    }
    await goTo("done");
  }
</script>

<svelte:window
  onkeydown={(event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  }}
/>

<div
  class="fixed inset-0 z-50 flex items-center justify-center bg-theme-bg/75 p-3"
>
  <div
    bind:this={dialogPanel}
    tabindex="-1"
    role="dialog"
    aria-modal="true"
    aria-labelledby="creature-import-title"
    class="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-theme-border bg-theme-surface shadow-2xl"
    data-testid="creature-import-dialog"
    onkeydown={(event) => {
      if (dialogPanel) containTab(event, dialogPanel);
    }}
  >
    <header
      class="flex items-center justify-between gap-3 border-b border-theme-border p-4"
    >
      <h3
        id="creature-import-title"
        bind:this={heading}
        tabindex="-1"
        class="font-header text-lg font-bold text-theme-text"
      >
        {step === "review"
          ? "Create creature entries"
          : step === "preview"
            ? "Review changes"
            : "Creature entries done"}
      </h3>
      <button
        bind:this={closeButton}
        type="button"
        class="flex min-h-10 min-w-10 items-center justify-center rounded-md border border-theme-text text-theme-text hover:bg-theme-primary/10"
        aria-label="Close"
        disabled={busy}
        onclick={close}
      >
        <span class="icon-[lucide--x] h-4 w-4" aria-hidden="true"></span>
      </button>
    </header>

    <div class="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
      {#if step === "review"}
        <p class="text-sm text-theme-text">
          Creatures that appear in this adventure's encounters. Nothing is saved
          until you confirm.
        </p>
        <ul class="space-y-3">
          {#each visibleChoices as choice, offset (choice.proposal.key)}
            {@const index = reviewPageStart + offset}
            {@const proposal = choice.proposal}
            <li
              class="space-y-2 rounded-lg border border-theme-border bg-theme-bg p-3 text-sm text-theme-text"
              data-testid="creature-import-item-{index}"
            >
              <p class="font-semibold">{proposal.name}</p>
              {#each [...proposal.summary, ...proposal.description, ...proposal.role, ...proposal.motivation, ...proposal.disposition] as text, textIndex (textIndex)}
                <p class="text-xs whitespace-pre-line">{text}</p>
              {/each}
              <p class="text-xs">{pageLabel(proposal.sourceRefs)}</p>
              <ul class="list-disc pl-5 text-xs">
                {#each proposal.encounters as encounter (encounter.id)}
                  <li>
                    {encounter.title}
                    ({pageLabel(
                      encounter.sourceRef ? [encounter.sourceRef] : [],
                    )}){encounter.visibility === "gm-only" ? " (GM-only)" : ""}
                  </li>
                {/each}
              </ul>
              {#if choice.existing}
                <p class="text-xs font-medium">
                  Already in your Vault: {choice.existing.title}
                </p>
                <div
                  class="flex gap-4"
                  role="radiogroup"
                  aria-label="Choice for {proposal.name}"
                >
                  <label class="flex items-center gap-1">
                    <input
                      type="radio"
                      name="creature-choice-{index}"
                      checked={choice.include}
                      onchange={() => (choice.include = true)}
                    />
                    Reuse
                  </label>
                  <label class="flex items-center gap-1">
                    <input
                      type="radio"
                      name="creature-choice-{index}"
                      checked={!choice.include}
                      onchange={() => (choice.include = false)}
                    />
                    Skip
                  </label>
                </div>
              {:else}
                <div
                  class="flex gap-4"
                  role="radiogroup"
                  aria-label="Choice for {proposal.name}"
                >
                  <label class="flex items-center gap-1">
                    <input
                      type="radio"
                      name="creature-choice-{index}"
                      checked={choice.include}
                      onchange={() => (choice.include = true)}
                    />
                    Include
                  </label>
                  <label class="flex items-center gap-1">
                    <input
                      type="radio"
                      name="creature-choice-{index}"
                      checked={!choice.include}
                      onchange={() => (choice.include = false)}
                    />
                    Skip
                  </label>
                </div>
                {#if choice.include}
                  <label class="flex items-center gap-2">
                    <input type="checkbox" bind:checked={choice.hidden} />
                    Hidden from players
                  </label>
                  <div class="flex flex-wrap items-center gap-3">
                    <label class="flex items-center gap-1">
                      <input
                        type="radio"
                        name="creature-art-{index}"
                        checked={!choice.file}
                        onchange={() => (choice.file = undefined)}
                      />
                      No image
                    </label>
                    <label
                      class="flex cursor-pointer items-center gap-1 rounded-md border border-theme-text px-2 py-1 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-theme-primary"
                    >
                      <input
                        type="file"
                        accept="image/*"
                        class="sr-only"
                        aria-label="Choose image for {proposal.name}"
                        onchange={(event) => pickFile(index, event)}
                      />
                      <span aria-hidden="true">Choose image…</span>
                    </label>
                    {#if choice.file}
                      <span class="text-xs">{choice.file.name}</span>
                      <button
                        type="button"
                        class="min-h-8 rounded-md border border-theme-text px-2 text-xs"
                        onclick={() => (choice.file = undefined)}
                      >
                        Clear image
                      </button>
                    {/if}
                  </div>
                  <label class="flex flex-col gap-1 text-xs">
                    Art credit (optional)
                    <input
                      type="text"
                      class="min-h-9 rounded-md border border-theme-text bg-theme-surface px-2 text-sm"
                      bind:value={choice.artCredit}
                    />
                  </label>
                {/if}
              {/if}
            </li>
          {/each}
        </ul>
        {#if reviewPageCount > 1}
          <div class="flex flex-wrap items-center justify-between gap-2">
            <p class="text-xs text-theme-text" aria-live="polite">
              Showing {reviewPageStart + 1}–{Math.min(
                reviewPageStart + reviewPageSize,
                choices.length,
              )} of {choices.length} creatures
            </p>
            <div class="flex gap-2">
              <button
                type="button"
                class="min-h-10 rounded-md border border-theme-text px-3 text-sm text-theme-text disabled:cursor-not-allowed"
                disabled={reviewPage === 0}
                onclick={() => (reviewPage = Math.max(0, reviewPage - 1))}
              >
                Previous creatures
              </button>
              <button
                type="button"
                class="min-h-10 rounded-md border border-theme-text px-3 text-sm text-theme-text disabled:cursor-not-allowed"
                disabled={reviewPage >= reviewPageCount - 1}
                onclick={() =>
                  (reviewPage = Math.min(reviewPageCount - 1, reviewPage + 1))}
              >
                Next creatures
              </button>
            </div>
          </div>
        {/if}
      {:else if step === "preview"}
        <p class="text-sm text-theme-text" role="status">
          {creating.length}
          {creating.length === 1 ? "entry" : "entries"} will be created, and
          {reusing.length} reused.
        </p>
        <ul class="space-y-1 text-sm text-theme-text">
          {#each previewCreating as choice (choice.proposal.key)}
            <li>
              Create {choice.proposal.name}:
              {choice.hidden ? "hidden" : "visible"},
              {choice.file ? "with an image" : "no image"}
            </li>
          {/each}
          {#each previewReusing as choice (choice.proposal.key)}
            <li>Reuse {choice.existing?.title}</li>
          {/each}
        </ul>
        {#if previewPageCount > 1}
          <div class="flex flex-wrap items-center justify-between gap-2">
            <p class="text-xs text-theme-text" aria-live="polite">
              Showing changes {previewPageStart + 1}–{Math.min(
                previewPageStart + previewPageSize,
                previewTotal,
              )} of {previewTotal}
            </p>
            <div class="flex gap-2">
              <button
                type="button"
                class="min-h-10 rounded-md border border-theme-text px-3 text-sm text-theme-text disabled:cursor-not-allowed"
                disabled={previewPage === 0}
                onclick={() => (previewPage = Math.max(0, previewPage - 1))}
              >
                Previous changes
              </button>
              <button
                type="button"
                class="min-h-10 rounded-md border border-theme-text px-3 text-sm text-theme-text disabled:cursor-not-allowed"
                disabled={previewPage >= previewPageCount - 1}
                onclick={() =>
                  (previewPage = Math.min(
                    previewPageCount - 1,
                    previewPage + 1,
                  ))}
              >
                Next changes
              </button>
            </div>
          </div>
        {/if}
      {:else if result}
        <p class="text-sm text-theme-text" role="status">
          Created {result.created}, reused {result.reused}.
          {#if result.interrupted}
            Stopped early because the Vault changed.
          {/if}
        </p>
        {#if result.failures.length}
          <ul class="list-disc pl-5 text-sm text-theme-danger" role="alert">
            {#each result.failures as failure (failure)}
              <li>{failure}</li>
            {/each}
          </ul>
        {/if}
      {/if}
    </div>

    <footer
      class="flex flex-wrap justify-end gap-2 border-t border-theme-border p-4"
    >
      {#if step === "review"}
        <button
          type="button"
          class="min-h-10 rounded-lg border border-theme-text px-3 text-sm text-theme-text"
          onclick={onClose}
        >
          Cancel
        </button>
        <button
          type="button"
          class="min-h-10 rounded-lg bg-theme-primary px-3 text-sm font-semibold text-theme-on-primary disabled:opacity-60"
          disabled={nothingSelected}
          onclick={() => void goTo("preview")}
        >
          Review changes
        </button>
        {#if nothingSelected}
          <p class="basis-full text-right text-xs text-theme-text">
            Include at least one creature.
          </p>
        {/if}
      {:else if step === "preview"}
        <button
          type="button"
          class="min-h-10 rounded-lg border border-theme-text px-3 text-sm text-theme-text"
          disabled={busy}
          onclick={() => void goTo("review")}
        >
          Back
        </button>
        <button
          type="button"
          class="min-h-10 rounded-lg bg-theme-primary px-3 text-sm font-semibold text-theme-on-primary disabled:opacity-60"
          disabled={busy || nothingSelected}
          onclick={() => void confirm()}
        >
          {busy ? "Creating…" : "Confirm and create"}
        </button>
      {:else}
        <button
          type="button"
          class="min-h-10 rounded-lg bg-theme-primary px-3 text-sm font-semibold text-theme-on-primary"
          onclick={onClose}
        >
          Done
        </button>
      {/if}
    </footer>
  </div>
</div>
