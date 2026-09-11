<script lang="ts">
  import { fade, scale } from "svelte/transition";
  import { loreMergeStore } from "$lib/stores/ui/lore-merge.svelte";
  import {
    composeLore,
    type LoreSectionChoice,
  } from "$lib/utils/lore-sections";
  import { focusTrap } from "$lib/actions/focusTrap";

  const dialog = $derived(loreMergeStore.dialog);
  const plan = $derived(dialog.plan);

  let choices = $state<Record<string, LoreSectionChoice>>({});
  let showUnchanged = $state(false);

  // Reset selections whenever a new plan arrives.
  $effect(() => {
    if (plan) {
      choices = loreMergeStore.defaultChoices(plan);
      showUnchanged = false;
    }
  });

  const STATUS_LABEL = {
    unchanged: "Unchanged",
    modified: "Rewritten",
    removed: "Removed by the revision",
    added: "New",
  } as const;

  /** Which options make sense for a given entry. */
  function optionsFor(
    status: string,
  ): { value: LoreSectionChoice; label: string }[] {
    if (status === "removed") {
      return [
        { value: "current", label: "Keep" },
        { value: "omit", label: "Drop" },
      ];
    }
    if (status === "added") {
      return [
        { value: "proposed", label: "Add" },
        { value: "omit", label: "Skip" },
      ];
    }
    return [
      { value: "proposed", label: "Revised" },
      { value: "current", label: "Current" },
      { value: "both", label: "Both" },
    ];
  }

  let visibleEntries = $derived(
    (plan?.entries ?? []).filter(
      (entry) => showUnchanged || entry.status !== "unchanged",
    ),
  );
  let unchangedCount = $derived(
    (plan?.entries ?? []).filter((entry) => entry.status === "unchanged")
      .length,
  );
  let removedKept = $derived(
    (plan?.entries ?? []).filter(
      (entry) => entry.status === "removed" && choices[entry.key] !== "omit",
    ).length,
  );

  const label = (heading: string) => heading || "Introduction";

  function apply() {
    if (!plan) return;
    loreMergeStore.resolveRequest(composeLore(plan, choices));
  }

  function cancel() {
    loreMergeStore.resolveRequest(null);
  }

  const handleKeydown = (e: KeyboardEvent) => {
    if (dialog.open && e.key === "Escape") cancel();
  };
</script>

<svelte:window onkeydown={handleKeydown} />

{#if dialog.open && plan}
  <div
    class="fixed inset-0 z-[200] flex items-center justify-center p-4"
    transition:fade={{ duration: 200 }}
  >
    <button
      type="button"
      class="absolute inset-0 h-full w-full bg-black/85 backdrop-blur-md focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-theme-primary cursor-default"
      aria-label="Cancel lore review"
      onclick={cancel}
    ></button>

    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lore-merge-title"
      tabindex="-1"
      use:focusTrap
      class="relative flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-theme-border bg-theme-surface shadow-2xl"
      transition:scale={{ duration: 250, start: 0.95 }}
    >
      <header class="border-b border-theme-border px-6 py-5">
        <h2
          id="lore-merge-title"
          class="font-header text-lg font-bold text-theme-text"
        >
          Review lore changes
        </h2>
        <p class="mt-1 text-sm text-theme-muted">
          {#if dialog.entityTitle}<span class="text-theme-text"
              >{dialog.entityTitle}</span
            > —
          {/if}choose what to keep for each section. Nothing is written until
          you apply.
        </p>
        {#if plan.hasRemovals}
          <p
            class="mt-3 flex items-start gap-2 rounded border border-theme-primary/30 bg-theme-primary/10 p-3 text-sm text-theme-text"
            role="status"
          >
            <span
              class="icon-[lucide--alert-triangle] mt-0.5 h-4 w-4 shrink-0 text-theme-primary"
              aria-hidden="true"
            ></span>
            <span>
              This revision drops sections that exist today. They are set to be
              kept — change any of them to <strong>Drop</strong> if that is what you
              want.
            </span>
          </p>
        {/if}
      </header>

      <div class="flex-1 overflow-y-auto px-6 py-4">
        <ul class="flex list-none flex-col gap-5">
          {#each visibleEntries as entry (entry.key)}
            <li class="border border-theme-border bg-theme-bg/40 p-4">
              <div
                class="mb-3 flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <h3 class="font-header text-base font-bold text-theme-text">
                    {label(entry.heading)}
                  </h3>
                  <p
                    class="font-mono text-[10px] uppercase tracking-wider text-theme-muted"
                  >
                    {STATUS_LABEL[entry.status]}
                  </p>
                </div>

                {#if entry.status !== "unchanged"}
                  <div
                    role="radiogroup"
                    aria-label="Version to keep for {label(entry.heading)}"
                    class="flex flex-wrap gap-1"
                  >
                    {#each optionsFor(entry.status) as option (option.value)}
                      <button
                        type="button"
                        role="radio"
                        aria-checked={choices[entry.key] === option.value}
                        onclick={() => (choices[entry.key] = option.value)}
                        class="px-3 py-1 text-xs font-bold uppercase tracking-wider transition-colors focus-visible:ring-2 focus-visible:ring-theme-primary focus-visible:outline-none {choices[
                          entry.key
                        ] === option.value
                          ? 'bg-theme-primary text-theme-bg'
                          : 'border border-theme-border text-theme-muted hover:text-theme-text'}"
                      >
                        {option.label}
                      </button>
                    {/each}
                  </div>
                {/if}
              </div>

              {#if entry.status === "unchanged"}
                <p
                  class="whitespace-pre-wrap text-sm leading-relaxed text-theme-muted"
                >
                  {entry.current}
                </p>
              {:else}
                <div class="grid gap-3 sm:grid-cols-2">
                  {#if entry.current !== undefined}
                    <div
                      class="border-l-2 pl-3 {choices[entry.key] ===
                        'current' || choices[entry.key] === 'both'
                        ? 'border-theme-primary'
                        : 'border-theme-border opacity-60'}"
                    >
                      <p
                        class="mb-1 font-mono text-[10px] uppercase tracking-wider text-theme-muted"
                      >
                        Current
                      </p>
                      <p
                        class="whitespace-pre-wrap text-sm leading-relaxed text-theme-text"
                      >
                        {entry.current}
                      </p>
                    </div>
                  {/if}
                  {#if entry.proposed !== undefined}
                    <div
                      class="border-l-2 pl-3 {choices[entry.key] ===
                        'proposed' || choices[entry.key] === 'both'
                        ? 'border-theme-primary'
                        : 'border-theme-border opacity-60'}"
                    >
                      <p
                        class="mb-1 font-mono text-[10px] uppercase tracking-wider text-theme-muted"
                      >
                        Revised
                      </p>
                      <p
                        class="whitespace-pre-wrap text-sm leading-relaxed text-theme-text"
                      >
                        {entry.proposed}
                      </p>
                    </div>
                  {/if}
                </div>
              {/if}
            </li>
          {/each}
        </ul>

        {#if unchangedCount > 0}
          <button
            type="button"
            onclick={() => (showUnchanged = !showUnchanged)}
            class="mt-4 text-xs text-theme-muted underline underline-offset-4 transition-colors hover:text-theme-primary"
          >
            {showUnchanged ? "Hide" : "Show"}
            {unchangedCount} unchanged section{unchangedCount === 1 ? "" : "s"}
          </button>
        {/if}
      </div>

      <footer
        class="flex flex-wrap items-center justify-between gap-3 border-t border-theme-border px-6 py-4"
      >
        <p class="text-xs text-theme-muted" aria-live="polite">
          {#if plan.hasRemovals}
            {removedKept} of
            {plan.entries.filter((e) => e.status === "removed").length} dropped section{plan.entries.filter(
              (e) => e.status === "removed",
            ).length === 1
              ? ""
              : "s"} will be kept
          {/if}
        </p>
        <div class="flex gap-2">
          <button
            type="button"
            onclick={cancel}
            class="px-4 py-2 text-xs font-bold uppercase tracking-wider text-theme-muted transition-colors hover:text-theme-text focus-visible:ring-2 focus-visible:ring-theme-primary focus-visible:outline-none"
          >
            Cancel
          </button>
          <button
            type="button"
            onclick={apply}
            class="bg-theme-primary px-5 py-2 text-xs font-bold uppercase tracking-wider text-theme-bg transition-colors hover:bg-theme-primary/90 focus-visible:ring-2 focus-visible:ring-theme-primary focus-visible:ring-offset-2 focus-visible:ring-offset-theme-surface focus-visible:outline-none"
          >
            Apply selection
          </button>
        </div>
      </footer>
    </div>
  </div>
{/if}
