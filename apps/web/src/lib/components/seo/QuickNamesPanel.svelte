<script lang="ts">
  import { untrack } from "svelte";
  import { rollNames, type NameParts } from "generator-engine";
  import QuickNameRow from "./QuickNameRow.svelte";
  import {
    trackPublicGeneratorAction,
    type PublicGeneratorAction,
  } from "$lib/services/analytics/zaraz-analytics";
  import {
    QUICK_NAMES_COUNT,
    formatQuickNameList,
    mergePinned,
    namesToCopy,
    quickNamesAnalytics,
    togglePinned,
    usableAiNames,
    withCurrentChoice,
    type QuickNamesAiResult,
  } from "./quick-names";

  let {
    generatorType,
    culture = $bindable(),
    gender,
    nameType = $bindable(),
    pinned = $bindable<string[]>([]),
    cultureChoices = [],
    nameTypeChoices = [],
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
    pinned?: string[];
    /** Options for the panel's own settings row. */
    cultureChoices?: readonly string[];
    nameTypeChoices?: readonly string[];
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
  let nameSources = $state<Record<string, "local" | "ai">>({});
  let source = $state<"local" | "ai">("local");
  let parts = $state<NameParts>("full");
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
      {
        culture,
        gender,
        nameType,
        parts,
        count: String(QUICK_NAMES_COUNT),
      },
      rng,
    );
  }

  // Changing a setting rolls a fresh batch; pinning a name must not.
  $effect(() => {
    const fresh = roll();
    untrack(() => showBatch(fresh, "local"));
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

  function showBatch(fresh: string[], from: "local" | "ai") {
    batchId++;
    names = mergePinned(pinned, fresh);
    nameSources = Object.fromEntries(
      names.map((name) => [
        name,
        pinned.includes(name) && nameSources[name] ? nameSources[name] : from,
      ]),
    );
    source = from;
    copiedIndex = null;
    allCopied = false;
  }

  function reroll() {
    showBatch(roll(), "local");
    announcement = "New names rolled.";
    track("reroll", analytics({ roll_source: "local" }));
  }

  function togglePin(name: string) {
    const wasPinned = pinned.includes(name);
    pinned = togglePinned(pinned, name);
    announcement = wasPinned
      ? `Unpinned ${name}.`
      : `Pinned ${name}. It stays when you roll again.`;
  }

  function copyAll() {
    const list = namesToCopy(names, pinned);
    const message =
      pinned.length > 0 ? "Copied the pinned names." : "Copied all names.";
    void copy(formatQuickNameList(list), null, message);
  }

  // Shown on the collapsed settings row, so the current choice is visible.
  const settingsSummary = $derived(
    [
      culture,
      nameType,
      nameType === "Person" && parts === "first" ? "First names only" : "",
    ]
      .filter(Boolean)
      .join(" · "),
  );

  const privacyNotice = $derived.by(() => {
    const hasLocal = names.some((name) => nameSources[name] === "local");
    const hasAi = names.some((name) => nameSources[name] === "ai");
    if (hasLocal && hasAi) {
      return "This list includes names rolled on your device and names supplied by our AI service.";
    }
    return hasAi
      ? "These names came from our AI service."
      : "Rolled on your device: no account, no AI.";
  });

  /** Bring the full generator's button into view and focus it. */
  function showFullGenerator() {
    const button = document.getElementById("generate-button");
    button?.scrollIntoView({ behavior: "smooth", block: "center" });
    button?.focus({ preventScroll: true });
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
    showBatch(aiNames ?? roll(), aiNames ? "ai" : "local");
    announcement = aiNames
      ? "AI names ready."
      : "The AI couldn't answer, so these names were rolled on your device.";
    track(
      "reroll",
      analytics({ roll_source: "ai", ai_result: aiNames ? "ok" : "fallback" }),
    );
  }
</script>

{#snippet batchActions()}
  <div class="mt-3 flex flex-wrap items-center gap-2">
    <button
      type="button"
      onclick={reroll}
      class="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-theme-primary px-3 py-2 text-micro font-bold uppercase tracking-wider text-theme-on-primary font-header hover:brightness-110 transition-all"
    >
      <span class="icon-[lucide--dices] h-4 w-4" aria-hidden="true"></span>
      New names
    </button>
    <button
      type="button"
      onclick={copyAll}
      disabled={names.length === 0}
      aria-describedby="quick-names-copy-help"
      class="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-theme-border/70 px-3 py-2 text-micro font-bold uppercase tracking-wider text-theme-text font-header hover:border-theme-primary/60 hover:text-theme-primary transition-all disabled:opacity-50"
    >
      <span
        class={allCopied
          ? "icon-[lucide--check] h-4 w-4"
          : "icon-[lucide--copy] h-4 w-4"}
        aria-hidden="true"
      ></span>
      {allCopied
        ? "Copied"
        : pinned.length > 0
          ? `Copy pinned (${pinned.length})`
          : "Copy all"}
    </button>
    <span id="quick-names-copy-help" class="sr-only"
      >Copies a plain list, one name per line.</span
    >
  </div>
  <p class="mt-2 text-xs text-theme-text">{privacyNotice}</p>
{/snippet}

{#snippet settings()}
  <details class="mt-3 rounded-lg border border-theme-border/60 bg-theme-bg/40">
    <summary
      class="flex min-h-11 cursor-pointer items-center gap-2 px-3 py-2 text-sm text-theme-text"
    >
      <span class="icon-[lucide--sliders-horizontal] h-4 w-4" aria-hidden="true"
      ></span>
      <span class="sr-only">Settings:</span>
      <span class="min-w-0 flex-1 truncate">{settingsSummary}</span>
      <span class="icon-[lucide--chevron-down] h-4 w-4" aria-hidden="true"
      ></span>
    </summary>
    <div class="grid grid-cols-2 gap-2 px-3 pb-3">
      {#if cultureChoices.length > 0}
        <label class="flex flex-col gap-1 text-xs font-bold text-theme-text">
          Culture
          <select
            bind:value={culture}
            class="w-full rounded-lg border border-theme-border/60 bg-theme-bg/60 px-2 py-2 text-base font-normal text-theme-text"
          >
            {#each withCurrentChoice(cultureChoices, culture) as choice (choice)}
              <option value={choice}>{choice}</option>
            {/each}
          </select>
        </label>
      {/if}
      {#if nameTypeChoices.length > 0}
        <label class="flex flex-col gap-1 text-xs font-bold text-theme-text">
          Name type
          <select
            bind:value={nameType}
            class="w-full rounded-lg border border-theme-border/60 bg-theme-bg/60 px-2 py-2 text-base font-normal text-theme-text"
          >
            {#each withCurrentChoice(nameTypeChoices, nameType) as choice (choice)}
              <option value={choice}>{choice}</option>
            {/each}
          </select>
        </label>
      {/if}
      {#if nameType === "Person"}
        <label
          class="col-span-2 inline-flex min-h-11 items-center gap-2 text-sm text-theme-text"
        >
          <input
            type="checkbox"
            checked={parts === "first"}
            onchange={(event) =>
              (parts = event.currentTarget.checked ? "first" : "full")}
            class="h-4 w-4 accent-theme-primary"
          />
          First names only
        </label>
      {/if}
    </div>
  </details>
{/snippet}

{#snippet aiForm()}
  <form
    class="mt-5 flex flex-col gap-2 border-t border-theme-border/40 pt-4 sm:flex-row sm:items-end"
    onsubmit={(event) => {
      event.preventDefault();
      void rollWithAi();
    }}
  >
    <label class="flex flex-1 flex-col gap-1.5">
      <span class="text-sm font-bold text-theme-text"
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
  <h2
    id="quick-names-heading"
    class="flex flex-wrap items-baseline gap-x-2 font-header text-lg font-bold text-theme-primary"
  >
    Quick names
    {#if source === "ai"}
      <span
        class="inline-flex items-center gap-1 font-body text-xs font-normal text-theme-text"
      >
        <span class="icon-[lucide--sparkles] h-3 w-3" aria-hidden="true"></span>
        AI names
      </span>
    {/if}
  </h2>
  <p class="mt-1 text-sm text-theme-text">
    Tap a name to copy it. Pin favourites to keep them when you roll again.
  </p>

  {#if cultureChoices.length > 0 || nameType === "Person"}{@render settings()}{/if}

  <ul class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2" aria-label="Names">
    {#if names.length === 0}
      {#each { length: QUICK_NAMES_COUNT } as _, i (i)}
        <li
          class="h-11 rounded-lg border border-theme-border/40 bg-theme-bg/30 animate-pulse"
          aria-hidden="true"
        ></li>
      {/each}
    {:else}
      {#each names as name, i (`${i}-${name}`)}
        <li>
          <QuickNameRow
            {name}
            copied={copiedIndex === i}
            pinned={pinned.includes(name)}
            onCopy={() => void copy(name, i, `Copied ${name}.`)}
            onTogglePin={() => togglePin(name)}
          />
        </li>
      {/each}
    {/if}
  </ul>

  {@render batchActions()}

  {#if askAi}{@render aiForm()}{/if}

  <p class="mt-4 text-sm text-theme-text">
    Want meanings and culture notes?
    <button
      type="button"
      onclick={showFullGenerator}
      class="font-bold text-theme-text underline decoration-theme-primary/60 underline-offset-2 hover:decoration-theme-primary"
      >Generate names with notes</button
    >
  </p>

  <p class="sr-only" role="status" aria-live="polite">{announcement}</p>
</section>
