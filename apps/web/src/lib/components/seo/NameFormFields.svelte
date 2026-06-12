<script lang="ts">
  import {
    nameGeneratorConfig,
    factionConfig,
  } from "$lib/services/seo/generator-engine";

  let {
    theme = $bindable(factionConfig.themes[0]),
    showTheme = false,
    culture = $bindable(nameGeneratorConfig.cultures[0]),
    gender = $bindable(nameGeneratorConfig.genders[0]),
    nameType = $bindable(nameGeneratorConfig.nameTypes[0]),
    context = $bindable(""),
  }: {
    theme?: string;
    showTheme?: boolean;
    culture: string;
    gender: string;
    nameType: string;
    context: string;
  } = $props();

  const selectClass =
    "w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary/60";
  const labelClass =
    "text-[10px] font-bold uppercase tracking-wider text-theme-text/80";

  const activeCultures = $derived(
    showTheme
      ? (nameGeneratorConfig.culturesByTheme[theme] ??
          nameGeneratorConfig.cultures)
      : nameGeneratorConfig.cultures,
  );

  $effect(() => {
    if (!activeCultures.includes(culture)) culture = activeCultures[0];
  });
</script>

{#if showTheme}
  <div class="flex flex-col gap-1.5">
    <label for="name-theme-select" class={labelClass}>Choose a vibe</label>
    <select id="name-theme-select" bind:value={theme} class={selectClass}>
      {#each factionConfig.themes as t (t)}
        <option value={t}>{t}</option>
      {/each}
    </select>
  </div>
{/if}

<div class="flex flex-col gap-1.5">
  <label for="culture-select" class={labelClass}>Culture / Style</label>
  <select id="culture-select" bind:value={culture} class={selectClass}>
    {#each activeCultures as c (c)}
      <option value={c}>{c}</option>
    {/each}
  </select>
</div>

<div class="flex flex-col gap-1.5">
  <label for="gender-select" class={labelClass}>Gender / Presentation</label>
  <select id="gender-select" bind:value={gender} class={selectClass}>
    {#each nameGeneratorConfig.genders as g (g)}
      <option value={g}>{g}</option>
    {/each}
  </select>
</div>

<div class="flex flex-col gap-1.5">
  <label for="name-type-select" class={labelClass}>Name Type</label>
  <select id="name-type-select" bind:value={nameType} class={selectClass}>
    {#each nameGeneratorConfig.nameTypes as t (t)}
      <option value={t}>{t}</option>
    {/each}
  </select>
</div>

<div class="flex flex-col gap-1.5">
  <label for="name-context" class={labelClass}>Optional Context</label>
  <textarea
    id="name-context"
    name="context"
    bind:value={context}
    maxlength="240"
    rows="3"
    placeholder="e.g. &quot;Assyrian&quot;, &quot;a reclusive mage&quot;, &quot;harsh and guttural&quot;"
    aria-describedby="name-context-help"
    class="w-full min-h-20 bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-base md:text-xs text-theme-text focus:outline-none focus:border-theme-primary/60 resize-y"
  ></textarea>
  <p id="name-context-help" class="sr-only">
    Steer the results with a description, a real-world linguistic flavour such
    as Assyrian or Old Norse, or a vibe such as harsh and guttural.
  </p>
</div>
