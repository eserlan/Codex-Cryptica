<script lang="ts">
  import { browser } from "$app/environment";
  import SEOGeneratorLayout from "$lib/components/seo/SEOGeneratorLayout.svelte";
  import { generatorEngine } from "$lib/services/seo/generator-engine";
  import {
    randomIdeaCategories,
    pickNextCategory,
    type RandomIdeaCategory,
  } from "$lib/services/seo/random-idea";

  let currentCategory = $state<RandomIdeaCategory | null>(null);
  let rollingLabel = $state<string | null>(null);
  let keepCategory = false;

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

  async function generate({ useAI }: { useAI: boolean }) {
    const keep = keepCategory;
    keepCategory = false;
    const next = pickNextCategory(currentCategory, keep);
    if (!keep) {
      await animateSelection(next);
    }
    currentCategory = next;
    rollingLabel = null;
    return next.generate(generatorEngine, useAI);
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

    {#if currentCategory && !rollingLabel}
      <button
        type="button"
        onclick={() => {
          keepCategory = true;
          trigger();
        }}
        class="w-full py-2.5 bg-theme-surface border border-theme-primary/40 text-theme-primary font-bold uppercase font-header tracking-wider text-[10px] rounded-lg hover:bg-theme-primary/10 transition-all"
        id="regenerate-category-btn"
        title="Keep this idea type and roll a fresh one"
      >
        Another {currentCategory.label} Idea
      </button>
    {/if}
  {/snippet}
</SEOGeneratorLayout>
