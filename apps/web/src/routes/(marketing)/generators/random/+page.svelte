<script lang="ts">
  import { browser } from "$app/environment";
  import SEOGeneratorLayout from "$lib/components/seo/SEOGeneratorLayout.svelte";
  import { generatorEngine } from "$lib/services/seo/generator-engine";
  import {
    randomIdeaCategories,
    pickNextCategory,
    pickRandomIdeaTheme,
    type RandomIdeaCategory,
  } from "$lib/services/seo/random-idea";
  import type { GeneratorOutput } from "$lib/services/seo/generator-engine";

  let currentCategory = $state<RandomIdeaCategory | null>(null);
  let rollingLabel = $state<string | null>(null);
  let inFlight = $state(false);
  // Linking a draft to the Session Hub locks the theme so follow-up rolls
  // build a coherent set instead of hopping genres.
  let lockedTheme = $state<string | null>(null);
  let currentTheme: string | null = null;
  let keepCategory = false;
  let pending: Promise<GeneratorOutput> | null = null;

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  // A short text-cycle through the idea types before the pick settles —
  // playful spark, not a slot machine. Skipped for reduced-motion users.
  async function animateSelection(chosen: RandomIdeaCategory) {
    if (
      !browser ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const labels = randomIdeaCategories.map((c) => c.label);
    const start = Math.floor(Math.random() * labels.length);
    for (let i = 0; i < labels.length; i++) {
      rollingLabel = labels[(start + i) % labels.length];
      await sleep(90 + i * 30);
    }
    rollingLabel = chosen.label;
    await sleep(300);
  }

  // Serialise rolls: extra triggers while one is in flight (double-clicks,
  // Enter on the form) just share the pending result instead of racing the
  // category/animation state.
  function generate({ useAI }: { useAI: boolean }) {
    if (pending) return pending;
    inFlight = true;
    pending = (async () => {
      const keep = keepCategory;
      keepCategory = false;
      const next = pickNextCategory(currentCategory, keep);
      const theme = lockedTheme ?? pickRandomIdeaTheme();
      if (!keep) {
        await animateSelection(next);
      }
      currentCategory = next;
      currentTheme = theme;
      rollingLabel = null;
      return next.generate(generatorEngine, useAI, theme);
    })().finally(() => {
      pending = null;
      inFlight = false;
    });
    return pending;
  }
</script>

<SEOGeneratorLayout
  pageTitle="Surprise Me — Random RPG Idea Generator | Codex Cryptica"
  metaDescription="Hit the button and get a random worldbuilding idea — a faction, kingdom, NPC, quest hook, or social hub. No account, no setup, just inspiration."
  introTitle="Surprise Me"
  eyebrow="Random Idea"
  introText="Not sure what your world needs next? Spin the idea machine — it picks a random generator and rolls every input for you. Pure inspiration, zero decisions."
  canonicalPath="/generators/random"
  {generate}
  initialDraft={null}
  generateLabel="Surprise Me"
  inputHint=""
  onLinkToHub={() => {
    lockedTheme = currentTheme;
  }}
>
  {#snippet formFields(trigger)}
    <div
      class="flex items-center gap-2 px-3 py-2.5 bg-theme-bg/60 border border-theme-border/60 rounded-lg text-xs text-theme-text"
      aria-live="polite"
    >
      <span
        class="icon-[lucide--dices] w-4 h-4 text-theme-primary flex-shrink-0 {rollingLabel
          ? 'animate-spin'
          : ''}"
        aria-hidden="true"
      ></span>
      {#if rollingLabel}
        <span class="text-theme-muted">Choosing an idea type…</span>
        <span class="font-bold">{rollingLabel}</span>
      {:else if currentCategory}
        <span class="text-theme-muted">Idea type:</span>
        <span class="font-bold">{currentCategory.label}</span>
      {:else}
        <span class="text-theme-muted">Rolling up something strange…</span>
      {/if}
    </div>

    {#if lockedTheme}
      <div
        class="flex items-center justify-between gap-2 px-3 py-2 bg-theme-primary/5 border border-theme-primary/30 rounded-lg text-[10px]"
      >
        <span class="flex items-center gap-1.5 text-theme-text/80 min-w-0">
          <span
            class="icon-[lucide--lock] w-3.5 h-3.5 text-theme-primary flex-shrink-0"
            aria-hidden="true"
          ></span>
          <span class="truncate">
            Hub theme locked: <span class="font-bold">{lockedTheme}</span>
          </span>
        </span>
        <button
          type="button"
          onclick={() => {
            lockedTheme = null;
          }}
          class="font-bold uppercase tracking-wider text-theme-primary hover:brightness-110 flex-shrink-0"
          id="unlock-theme-btn"
          title="Let each roll pick a random theme again"
        >
          Unlock
        </button>
      </div>
    {/if}

    {#if currentCategory && !rollingLabel}
      <button
        type="button"
        disabled={inFlight}
        onclick={() => {
          keepCategory = true;
          trigger();
        }}
        class="w-full py-2.5 bg-theme-surface border border-theme-primary/40 text-theme-primary font-bold uppercase font-header tracking-wider text-[10px] rounded-lg hover:bg-theme-primary/10 transition-all disabled:opacity-50"
        id="regenerate-category-btn"
        title="Keep this idea type and roll a fresh one"
      >
        Another {currentCategory.label} Idea
      </button>
    {/if}
  {/snippet}
</SEOGeneratorLayout>
