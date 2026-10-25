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
  } from "./quick-names";

  let {
    generatorType,
    culture,
    gender,
    nameType,
    rng = Math.random,
    writeText = (text: string) => navigator.clipboard.writeText(text),
    track = trackPublicGeneratorAction,
  }: {
    generatorType: string;
    culture: string;
    gender: string;
    nameType: string;
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
  let resetTimer: ReturnType<typeof setTimeout> | undefined;

  function roll(): string[] {
    return rollNames(
      { culture, gender, nameType, count: String(QUICK_NAMES_COUNT) },
      rng,
    );
  }

  // Changing culture or name type in the settings rolls a fresh batch.
  $effect(() => {
    names = roll();
    copiedIndex = null;
    allCopied = false;
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

  function reroll() {
    names = roll();
    copiedIndex = null;
    allCopied = false;
    announcement = "New names rolled.";
    track("reroll", analytics());
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
        : 'text-theme-text/50 group-hover:text-theme-primary'}"
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
      <p class="mt-1 text-sm text-theme-text/75">
        Tap a name to copy it. Rolled on your device, with no account and no AI.
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
        class="inline-flex items-center gap-1.5 rounded-lg border border-theme-border/70 px-3 py-2 text-micro font-bold uppercase tracking-wider text-theme-text/80 font-header hover:border-theme-primary/60 hover:text-theme-primary transition-all disabled:opacity-50"
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

  <p class="mt-3 text-xs text-theme-text/65">
    Want meanings, culture notes or AI-written names? Adjust the settings and
    generate a full write-up.
  </p>

  <p class="sr-only" role="status" aria-live="polite">{announcement}</p>
</section>
