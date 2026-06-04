<script lang="ts">
  import { nameGeneratorConfig } from "$lib/services/seo/generator-engine";

  let {
    culture = $bindable(nameGeneratorConfig.cultures[0]),
    gender = $bindable(nameGeneratorConfig.genders[0]),
    nameType = $bindable(nameGeneratorConfig.nameTypes[0]),
    count = $bindable(nameGeneratorConfig.counts[1]),
    context = $bindable(""),
  }: {
    culture: string;
    gender: string;
    nameType: string;
    count: string;
    context: string;
  } = $props();

  const selectClass =
    "w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary/60";
  const labelClass =
    "text-[10px] font-bold uppercase tracking-wider text-theme-muted";
</script>

<div class="flex flex-col gap-1.5">
  <label for="culture-select" class={labelClass}>Culture / Style</label>
  <select id="culture-select" bind:value={culture} class={selectClass}>
    {#each nameGeneratorConfig.cultures as c (c)}
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
  <label for="count-select" class={labelClass}>Number of Results</label>
  <select id="count-select" bind:value={count} class={selectClass}>
    {#each nameGeneratorConfig.counts as n (n)}
      <option value={n}>{n} names</option>
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
    aria-describedby="name-context-help"
    class="w-full min-h-20 bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-base md:text-xs text-theme-text focus:outline-none focus:border-theme-primary/60 resize-y"
  ></textarea>
  <p
    id="name-context-help"
    class="text-[10px] text-theme-muted leading-relaxed"
  >
    Describe the character, place, or faction to get more fitting names — e.g.
    "a reclusive mage" or "a coastal trading city".
  </p>
</div>
