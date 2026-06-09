<script lang="ts">
  import { tavernConfig } from "$lib/services/seo/generator-engine";

  let {
    type = $bindable(tavernConfig.types[0]),
    atmosphere = $bindable(tavernConfig.atmospheres[0]),
    settlementType = $bindable(tavernConfig.settlementTypes[1]),
    wealthLevel = $bindable(tavernConfig.wealthLevels[2]),
    clientele = $bindable(tavernConfig.clienteles[4]),
    campaignContext = $bindable(""),
    onSurprise = undefined,
  }: {
    type: string;
    atmosphere: string;
    settlementType: string;
    wealthLevel: string;
    clientele: string;
    campaignContext: string;
    onSurprise?: () => void;
  } = $props();

  const selectClass =
    "w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary/60";
  const labelClass =
    "text-[10px] font-bold uppercase tracking-wider text-theme-muted";

  function pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }
</script>

<div class="flex flex-col gap-1.5">
  <label for="tavern-type-select" class={labelClass}>Tavern type</label>
  <select id="tavern-type-select" bind:value={type} class={selectClass}>
    {#each tavernConfig.types as t (t)}
      <option value={t}>{t}</option>
    {/each}
  </select>
</div>

<div class="flex flex-col gap-1.5">
  <label for="tavern-atmosphere-select" class={labelClass}>Atmosphere</label>
  <select
    id="tavern-atmosphere-select"
    bind:value={atmosphere}
    class={selectClass}
  >
    {#each tavernConfig.atmospheres as a (a)}
      <option value={a}>{a}</option>
    {/each}
  </select>
</div>

<div class="flex flex-col gap-1.5">
  <label for="tavern-settlement-select" class={labelClass}
    >Settlement type</label
  >
  <select
    id="tavern-settlement-select"
    bind:value={settlementType}
    class={selectClass}
  >
    {#each tavernConfig.settlementTypes as s (s)}
      <option value={s}>{s}</option>
    {/each}
  </select>
</div>

<div class="flex flex-col gap-1.5">
  <label for="tavern-wealth-select" class={labelClass}>Wealth level</label>
  <select
    id="tavern-wealth-select"
    bind:value={wealthLevel}
    class={selectClass}
  >
    {#each tavernConfig.wealthLevels as w (w)}
      <option value={w}>{w}</option>
    {/each}
  </select>
</div>

<div class="flex flex-col gap-1.5">
  <label for="tavern-clientele-select" class={labelClass}
    >Primary clientele</label
  >
  <select
    id="tavern-clientele-select"
    bind:value={clientele}
    class={selectClass}
  >
    {#each tavernConfig.clienteles as c (c)}
      <option value={c}>{c}</option>
    {/each}
  </select>
</div>

<div class="flex flex-col gap-1.5">
  <label for="tavern-context" class={labelClass}
    >Campaign context (optional)</label
  >
  <textarea
    id="tavern-context"
    bind:value={campaignContext}
    maxlength="240"
    rows="4"
    aria-describedby="tavern-context-help"
    class="w-full min-h-24 bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-base md:text-xs text-theme-text focus:outline-none focus:border-theme-primary/60 resize-y"
  ></textarea>
  <p
    id="tavern-context-help"
    class="text-[10px] text-theme-text/60 leading-relaxed"
  >
    Add a city, region, ongoing conflict, or campaign tension to aim the tavern
    at your table.
  </p>
</div>

<div class="pt-2 flex justify-end">
  <button
    type="button"
    onclick={() => {
      type = pick(tavernConfig.types);
      atmosphere = pick(tavernConfig.atmospheres);
      settlementType = pick(tavernConfig.settlementTypes);
      wealthLevel = pick(tavernConfig.wealthLevels);
      clientele = pick(tavernConfig.clienteles);
      if (onSurprise) {
        onSurprise();
      }
    }}
    class="flex items-center gap-1.5 px-3 py-1.5 bg-theme-surface/60 border border-theme-border/60 rounded-lg text-[10px] font-bold uppercase tracking-wider text-theme-text hover:bg-theme-primary hover:text-theme-bg hover:border-theme-primary transition-all cursor-pointer"
  >
    <span class="icon-[lucide--dices] w-3.5 h-3.5"></span>
    Surprise Me
  </button>
</div>
