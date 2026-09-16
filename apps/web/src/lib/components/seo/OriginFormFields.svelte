<script lang="ts">
  import { originConfig, pickFrom } from "$lib/services/seo/generator-engine";
  import SelectWithCustomOption from "$lib/components/forms/SelectWithCustomOption.svelte";

  // Superhero / Comic Book only, by design (#3111) — no theme/genre select
  // here, unlike most other public generators. See the add-generator skill's
  // Part C note for why this generator deliberately skips the theme selector.
  let {
    originType = $bindable(originConfig.originTypes[0]),
    tone = $bindable(originConfig.tones[0]),
    campaignContext = $bindable(""),
    onSurprise = undefined,
  }: {
    originType: string;
    tone: string;
    campaignContext: string;
    onSurprise?: () => void;
  } = $props();

  const inputClass =
    "w-full rounded-lg border border-theme-border/60 bg-theme-bg/60 px-3 py-2 text-base text-theme-text focus:border-theme-primary/60 focus:outline-none md:text-xs";
  const labelClass =
    "text-[11px] font-bold uppercase tracking-wider text-theme-text/80";

  function surprise() {
    originType = pickFrom(originConfig.originTypes);
    tone = pickFrom(originConfig.tones);
    onSurprise?.();
  }
</script>

<SelectWithCustomOption
  id="origin-type"
  label="Origin Type"
  bind:value={originType}
  choices={originConfig.originTypes.map((value) => ({ value, label: value }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  {inputClass}
  customPlaceholder="Enter a custom origin type"
/>
<SelectWithCustomOption
  id="origin-tone"
  label="Tone"
  bind:value={tone}
  choices={originConfig.tones.map((value) => ({ value, label: value }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  {inputClass}
  customPlaceholder="Enter a custom tone"
/>
<div class="flex flex-col gap-1.5">
  <label for="origin-context" class={labelClass}
    >Campaign context (optional)</label
  >
  <textarea
    id="origin-context"
    bind:value={campaignContext}
    rows="3"
    maxlength="600"
    class="{inputClass} resize-y"
    placeholder="A city, team, rival, or ongoing threat to weave in"
  ></textarea>
</div>
<button
  type="button"
  onclick={surprise}
  class="rounded-lg border border-theme-border px-3 py-2 text-xs font-bold text-theme-text hover:border-theme-primary hover:text-theme-primary"
  >Surprise me</button
>
