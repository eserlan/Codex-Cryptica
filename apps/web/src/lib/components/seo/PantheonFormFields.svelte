<script lang="ts">
  import { pantheonConfig, pickFrom } from "$lib/services/seo/generator-engine";

  let {
    mode = $bindable("single"),
    genre = $bindable(pantheonConfig.genres[0]),
    divineType = $bindable(pantheonConfig.divineTypes[0]),
    domain = $bindable(pantheonConfig.domains[0]),
    tone = $bindable(pantheonConfig.tones[0]),
    worshippers = $bindable(pantheonConfig.worshippers[0]),
    conflictTheme = $bindable(pantheonConfig.conflictThemes[0]),
    size = $bindable("small" as "small" | "medium" | "large"),
    width = $bindable("balanced" as "balanced" | "focused" | "wide"),
    campaignContext = $bindable(""),
    onSurprise = undefined,
  }: {
    mode: "single" | "pantheon";
    genre: string;
    divineType: string;
    domain: string;
    tone: string;
    worshippers: string;
    conflictTheme: string;
    size: "small" | "medium" | "large";
    width: "balanced" | "focused" | "wide";
    campaignContext: string;
    onSurprise?: () => void;
  } = $props();

  const selectClass =
    "w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary/60";
  const labelClass =
    "text-[10px] font-bold uppercase tracking-wider text-theme-text/80";
</script>

<div class="flex flex-col gap-1.5">
  <label for="pantheon-mode-select" class={labelClass}>Generate target</label>
  <select id="pantheon-mode-select" bind:value={mode} class={selectClass}>
    <option value="single">Single Deity / Spirit</option>
    <option value="pantheon">Pantheon</option>
  </select>
</div>

{#if mode === "pantheon"}
  <div class="flex flex-col gap-1.5">
    <label for="pantheon-size-select" class={labelClass}>Pantheon Size</label>
    <select id="pantheon-size-select" bind:value={size} class={selectClass}>
      {#each pantheonConfig.sizes as s (s.value)}
        <option value={s.value}>{s.label}</option>
      {/each}
    </select>
  </div>

  <div class="flex flex-col gap-1.5">
    <label for="pantheon-width-select" class={labelClass}
      >Pantheon Focus / Width</label
    >
    <select id="pantheon-width-select" bind:value={width} class={selectClass}>
      {#each pantheonConfig.widths as w (w.value)}
        <option value={w.value}>{w.label}</option>
      {/each}
    </select>
  </div>
{/if}

<div class="flex flex-col gap-1.5">
  <label for="pantheon-genre-select" class={labelClass}>Genre / Theme</label>
  <select id="pantheon-genre-select" bind:value={genre} class={selectClass}>
    {#each pantheonConfig.genres as g (g)}
      <option value={g}>{g}</option>
    {/each}
  </select>
</div>

{#if mode === "single"}
  <div class="flex flex-col gap-1.5">
    <label for="pantheon-type-select" class={labelClass}>Divine Type</label>
    <select
      id="pantheon-type-select"
      bind:value={divineType}
      class={selectClass}
    >
      {#each pantheonConfig.divineTypes as t (t)}
        <option value={t}>{t}</option>
      {/each}
    </select>
  </div>
{/if}

<div class="flex flex-col gap-1.5">
  <label for="pantheon-domain-select" class={labelClass}>Primary Domain</label>
  <select id="pantheon-domain-select" bind:value={domain} class={selectClass}>
    {#each pantheonConfig.domains as d (d)}
      <option value={d}>{d}</option>
    {/each}
  </select>
</div>

<div class="flex flex-col gap-1.5">
  <label for="pantheon-tone-select" class={labelClass}>Tone</label>
  <select id="pantheon-tone-select" bind:value={tone} class={selectClass}>
    {#each pantheonConfig.tones as t (t)}
      <option value={t}>{t}</option>
    {/each}
  </select>
</div>

<div class="flex flex-col gap-1.5">
  <label for="pantheon-worshippers-select" class={labelClass}>Worshippers</label
  >
  <select
    id="pantheon-worshippers-select"
    bind:value={worshippers}
    class={selectClass}
  >
    {#each pantheonConfig.worshippers as w (w)}
      <option value={w}>{w}</option>
    {/each}
  </select>
</div>

{#if mode === "pantheon"}
  <div class="flex flex-col gap-1.5">
    <label for="pantheon-conflict-select" class={labelClass}
      >Conflict Theme</label
    >
    <select
      id="pantheon-conflict-select"
      bind:value={conflictTheme}
      class={selectClass}
    >
      {#each pantheonConfig.conflictThemes as c (c)}
        <option value={c}>{c}</option>
      {/each}
    </select>
  </div>
{/if}

<div class="flex flex-col gap-1.5">
  <label for="pantheon-context" class={labelClass}
    >Campaign context (optional)</label
  >
  <textarea
    id="pantheon-context"
    bind:value={campaignContext}
    maxlength="240"
    rows="4"
    aria-describedby="pantheon-context-help"
    class="w-full min-h-24 bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-base md:text-xs text-theme-text focus:outline-none focus:border-theme-primary/60 resize-y"
  ></textarea>
  <p
    id="pantheon-context-help"
    class="text-[10px] text-theme-text/60 leading-relaxed"
  >
    Steer the generation with specific settings, e.g., "A dying sun world where
    shadows hold physical weight."
  </p>
</div>

<div class="pt-2 flex justify-end">
  <button
    type="button"
    onclick={() => {
      genre = pickFrom(pantheonConfig.genres);
      divineType = pickFrom(pantheonConfig.divineTypes);
      domain = pickFrom(pantheonConfig.domains);
      tone = pickFrom(pantheonConfig.tones);
      worshippers = pickFrom(pantheonConfig.worshippers);
      conflictTheme = pickFrom(pantheonConfig.conflictThemes);
      width = pickFrom(pantheonConfig.widths).value;
      if (onSurprise) onSurprise();
    }}
    class="flex items-center gap-1.5 px-3 py-1.5 bg-theme-surface/60 border border-theme-border/60 rounded-lg text-[10px] font-bold uppercase tracking-wider text-theme-text hover:bg-theme-primary hover:text-theme-bg hover:border-theme-primary transition-all cursor-pointer"
    title="Randomize all options and generate a draft from the result"
  >
    <span class="icon-[lucide--dices] w-3.5 h-3.5" aria-hidden="true"></span>
    Surprise Me
  </button>
</div>
