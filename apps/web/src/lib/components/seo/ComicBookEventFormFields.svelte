<script lang="ts">
  import {
    comicBookEventConfig,
    pickFrom,
  } from "$lib/services/seo/generator-engine";
  import SelectWithCustomOption from "$lib/components/forms/SelectWithCustomOption.svelte";

  let {
    eventType = $bindable(comicBookEventConfig.eventTypes[0]),
    scale = $bindable(comicBookEventConfig.scales[0]),
    tone = $bindable(comicBookEventConfig.tones[0]),
    campaignContext = $bindable(""),
    onSurprise = undefined,
  }: {
    eventType: string;
    scale: string;
    tone: string;
    campaignContext: string;
    onSurprise?: () => void;
  } = $props();

  const inputClass =
    "w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary/60";
  const labelClass =
    "text-[11px] font-bold uppercase tracking-wider text-theme-text/80";
</script>

<SelectWithCustomOption
  id="comic-book-event-type-select"
  label="Event Type"
  bind:value={eventType}
  choices={comicBookEventConfig.eventTypes.map((t: string) => ({
    value: t,
    label: t,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  {inputClass}
  customPlaceholder="Enter a custom event type"
/>

<SelectWithCustomOption
  id="comic-book-event-scale-select"
  label="Scale"
  bind:value={scale}
  choices={comicBookEventConfig.scales.map((s: string) => ({
    value: s,
    label: s,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  {inputClass}
  customPlaceholder="Enter a custom scale"
/>
<p class="text-[10px] text-theme-muted leading-relaxed -mt-1">
  A Comic Book Event is campaign-scale by nature — Street/City-level threats fit
  the Villain or Quest Hook generators better.
</p>

<SelectWithCustomOption
  id="comic-book-event-tone-select"
  label="Tone"
  bind:value={tone}
  choices={comicBookEventConfig.tones.map((t: string) => ({
    value: t,
    label: t,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  {inputClass}
  customPlaceholder="Enter a custom tone"
/>

<div class="pt-2 flex justify-end">
  <button
    type="button"
    onclick={() => {
      eventType = pickFrom(
        comicBookEventConfig.eventTypes.filter((t: string) => t !== "Random"),
      );
      scale = pickFrom(comicBookEventConfig.scales);
      tone = pickFrom(comicBookEventConfig.tones);
      if (onSurprise) onSurprise();
    }}
    class="flex items-center gap-1.5 px-3 py-1.5 bg-theme-surface/60 border border-theme-border/60 rounded-lg text-[10px] font-bold uppercase tracking-wider text-theme-text hover:bg-theme-primary hover:text-theme-bg hover:border-theme-primary transition-all cursor-pointer"
    title="Randomize all options and generate a draft from the result"
  >
    <span class="icon-[lucide--dices] w-3.5 h-3.5" aria-hidden="true"></span>
    Surprise Me
  </button>
</div>

<div class="flex flex-col gap-1.5">
  <label for="comic-book-event-campaign-context" class={labelClass}
    >Optional Campaign Context</label
  >
  <textarea
    id="comic-book-event-campaign-context"
    name="campaign_context"
    bind:value={campaignContext}
    maxlength="4000"
    rows="3"
    aria-describedby="comic-book-event-campaign-context-help"
    class="w-full min-h-20 bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-base md:text-xs text-theme-text focus:outline-none focus:border-theme-primary/60 resize-y"
  ></textarea>
  <p
    id="comic-book-event-campaign-context-help"
    class="text-[10px] text-theme-muted leading-relaxed"
  >
    Add an existing team, city, or ongoing tension to ground this event in your
    table.
  </p>
</div>
