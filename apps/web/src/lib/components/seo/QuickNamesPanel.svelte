<script lang="ts">
  import { rollNames } from "generator-engine";
  import {
    trackPublicGeneratorAction,
    type PublicGeneratorAction,
  } from "$lib/services/analytics/zaraz-analytics";
  import {
    QUICK_NAMES_COUNT,
    formatQuickNameList,
    quickNamesAnalytics,
    usableAiNames,
    type QuickNamesAiResult,
  } from "./quick-names";

  let {
    generatorType,
    culture,
    gender,
    nameType,
    askAi,
    isOnline = true,
    rng = Math.random,
    writeText = (text: string) => navigator.clipboard.writeText(text),
    track = trackPublicGeneratorAction,
  }: {
    generatorType: string;
    culture: string;
    gender: string;
    nameType: string;
    /** Ask the AI for a batch; omitted, the panel offers local rolls only. */
    askAi?: (query: string) => Promise<QuickNamesAiResult>;
    isOnline?: boolean;
    rng?: () => number;
    writeText?: (text: string) => Promise<void>;
    track?: (
      action: PublicGeneratorAction,
      properties: Record<string, unknown>,
    ) => void;
  } = $props();

  // Rolled in the browser only: the server render shows placeholders, so a
  // random batch never mismatches on hydration.
  let names = $state<string[]>([]);
  let copiedIndex = $state<number | null>(null);
  let allCopied = $state(false);
  let announcement = $state("");
  let query = $state("");
  let aiBusy = $state(false);
  // Bumped by every new batch, so a slow AI reply can't replace a newer one.
  let batchId = 0;
  let resetTimer: ReturnType<typeof setTimeout> | undefined;

  function roll(): string[] {
    return rollNames(
      { culture, gender, nameType, count: String(QUICK_NAMES_COUNT) },
      rng,
    );
  }

  // Changing culture or name type in the settings rolls a fresh batch.
  $effect(() => {
    showBatch(roll());
  });

  $effect(() => () => clearTimeout(resetTimer));

  function analytics(extra: Record<string, string> = {}) {
    return {
      ...quickNamesAnalytics(generatorType, culture, nameType),
      ...extra,
    };
  }

  function showCopied(index: number | null, message: string) {
    copiedIndex = index;
    allCopied = index === null;
    announcement = message;
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => {
      copiedIndex = null;
      allCopied = false;
    }, 1600);
  }

  async function copy(text: string, index: number | null, message: string) {
    track(
      "copy",
      analytics({
        copy_target: index === null ? "quick_name_list" : "quick_name",
      }),
    );
    const batch = names;
    try {
      await writeText(text);
      // A reroll while the copy was pending would point the tick at a new name.
      if (batch === names) showCopied(index, message);
    } catch {
      announcement = "Copy failed. Select the name and copy it by hand.";
    }
  }

  function showBatch(batch: string[]) {
    batchId++;
    names = batch;
    copiedIndex = null;
    allCopied = false;
  }

  function reroll() {
    showBatch(roll());
    announcement = "New names rolled.";
    track("reroll", analytics({ roll_source: "local" }));
  }

  async function rollWithAi() {
    if (!askAi || aiBusy) return;
    aiBusy = true;
    announcement = "Asking the AI for names…";
    const requestId = ++batchId;
    const aiNames = await usableAiNames(askAi, query);
    aiBusy = false;
    // A newer batch (New names, a settings change) wins over a slow reply.
    if (requestId !== batchId) return;
    showBatch(aiNames ?? roll());
    announcement = aiNames
      ? "AI names ready."
      : "The AI couldn't answer, so these names were rolled on your device.";
    track(
      "reroll",
      analytics({ roll_source: "ai", ai_result: aiNames ? "ok" : "fallback" }),
    );
  }
</script>

{#snippet nameButton(name: string, index: number, copied: boolean)}
  <button
    type="button"
    onclick={() => void copy(name, index, `Copied ${name}.`)}
    class="group flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition-all {copied
      ? 'border-theme-primary/70 bg-theme-primary/10'
      : 'border-theme-border/60 bg-theme-bg/40 hover:border-theme-primary/50 hover:bg-theme-surface/50'}"
    aria-label="Copy {name}"
  >
    <span class="font-header text-base font-bold text-theme-text break-all"
      >{name}</span
    >
    <span
      class="inline-flex shrink-0 items-center gap-1 text-nano font-bold uppercase tracking-wider {copied
        ? 'text-theme-primary'
        : 'text-theme-text group-hover:text-theme-primary'}"
      aria-hidden="true"
    >
      <span
        class={copied
          ? "icon-[lucide--check] h-3.5 w-3.5"
          : "icon-[lucide--copy] h-3.5 w-3.5"}
      ></span>
      {copied ? "Copied" : "Copy"}
    </span>
  </button>
{/snippet}

{#snippet aiForm()}
  <form
    class="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end"
    onsubmit={(event) => {
      event.preventDefault();
      void rollWithAi();
    }}
  >
    <label class="flex flex-1 flex-col gap-1.5">
      <span
        class="text-micro font-bold uppercase tracking-wider text-theme-text"
        >Ask AI for names like… (optional)</span
      >
      <input
        type="text"
        bind:value={query}
        maxlength="200"
        placeholder="e.g. harsh desert nomads, a gloomy port town"
        aria-describedby="quick-names-ai-help"
        class="w-full rounded-lg border border-theme-border/60 bg-theme-bg/60 px-3 py-2 text-base md:text-sm text-theme-text focus:border-theme-primary/60 focus:outline-none"
      />
    </label>
    <button
      type="submit"
      disabled={aiBusy || !isOnline}
      class="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-theme-primary/60 bg-theme-primary/10 px-3 py-2 text-micro font-bold uppercase tracking-wider text-theme-text font-header hover:bg-theme-primary/20 transition-all disabled:opacity-50"
    >
      <span
        class={aiBusy
          ? "icon-[lucide--loader-circle] h-4 w-4 animate-spin"
          : "icon-[lucide--sparkles] h-4 w-4"}
        aria-hidden="true"
      ></span>
      {aiBusy ? "Asking…" : "Ask AI"}
    </button>
  </form>
  <p id="quick-names-ai-help" class="mt-1.5 text-xs text-theme-text">
    {isOnline
      ? "Ask AI sends your description and settings to our AI service."
      : "Ask AI needs a connection. New names still works offline."}
  </p>
{/snippet}

<section
  class="mb-6 rounded-2xl border border-theme-primary/30 bg-theme-surface/30 p-4 sm:p-5 shadow-sm"
  aria-labelledby="quick-names-heading"
>
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h2
        id="quick-names-heading"
        class="font-header text-lg font-bold text-theme-primary"
      >
        Quick names
      </h2>
      <p class="mt-1 text-sm text-theme-text">
        Tap a name to copy it. New names rolls instantly on your device, with no
        account and no AI.
      </p>
    </div>
    <div class="flex items-center gap-2">
      <button
        type="button"
        onclick={reroll}
        class="inline-flex items-center gap-1.5 rounded-lg bg-theme-primary px-3 py-2 text-micro font-bold uppercase tracking-wider text-theme-on-primary font-header hover:brightness-110 transition-all"
      >
        <span class="icon-[lucide--dices] h-4 w-4" aria-hidden="true"></span>
        New names
      </button>
      <button
        type="button"
        onclick={() =>
          void copy(formatQuickNameList(names), null, "Copied all names.")}
        disabled={names.length === 0}
        class="inline-flex items-center gap-1.5 rounded-lg border border-theme-border/70 px-3 py-2 text-micro font-bold uppercase tracking-wider text-theme-text font-header hover:border-theme-primary/60 hover:text-theme-primary transition-all disabled:opacity-50"
      >
        <span
          class={allCopied
            ? "icon-[lucide--check] h-4 w-4"
            : "icon-[lucide--copy] h-4 w-4"}
          aria-hidden="true"
        ></span>
        {allCopied ? "Copied" : "Copy all"}
      </button>
    </div>
  </div>

  <ul class="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2" aria-label="Names">
    {#if names.length === 0}
      {#each { length: QUICK_NAMES_COUNT } as _, i (i)}
        <li
          class="h-11 rounded-lg border border-theme-border/40 bg-theme-bg/30 animate-pulse"
          aria-hidden="true"
        ></li>
      {/each}
    {:else}
      {#each names as name, i (`${i}-${name}`)}
        <li>{@render nameButton(name, i, copiedIndex === i)}</li>
      {/each}
    {/if}
  </ul>

  {#if askAi}{@render aiForm()}{/if}

  <p class="mt-3 text-xs text-theme-text">
    Want meanings and culture notes? Adjust the settings and generate a full
    write-up.
  </p>

  <p class="sr-only" role="status" aria-live="polite">{announcement}</p>
</section>
