<script lang="ts">
  import { rumourConfig, pickFrom } from "$lib/services/seo/generator-engine";
  import SelectWithCustomOption from "$lib/components/forms/SelectWithCustomOption.svelte";

  let {
    genre = $bindable(rumourConfig.genres[0]),
    tone = $bindable(rumourConfig.tones[0]),
    dangerLevel = $bindable(rumourConfig.dangerLevels[0]),
    subjectFocus = $bindable(rumourConfig.subjects[0]),
    locationContext = $bindable(""),
    campaignContext = $bindable(""),
    onSurprise = undefined,
    onGenreChange = undefined,
  }: {
    genre: string;
    tone: string;
    dangerLevel: string;
    subjectFocus: string;
    locationContext: string;
    campaignContext: string;
    onSurprise?: () => void;
    onGenreChange?: (genre: string) => void;
  } = $props();

  const selectClass =
    "w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary/60";
  const labelClass =
    "text-[11px] font-bold uppercase tracking-wider text-theme-text/80";
  const choices = (values: readonly string[]) =>
    values.map((value) => ({ value, label: value }));
</script>

<SelectWithCustomOption
  id="rumour-genre"
  label="Genre"
  bind:value={genre}
  choices={choices(rumourConfig.genres)}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom genre"
  onvaluechange={onGenreChange}
/>
<SelectWithCustomOption
  id="rumour-tone"
  label="Tone"
  bind:value={tone}
  choices={choices(rumourConfig.tones)}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom tone"
/>
<SelectWithCustomOption
  id="rumour-danger-level"
  label="Danger Level"
  bind:value={dangerLevel}
  choices={choices(rumourConfig.dangerLevels)}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom danger level"
/>
<SelectWithCustomOption
  id="rumour-subject-focus"
  label="Subject Focus"
  bind:value={subjectFocus}
  choices={choices(rumourConfig.subjects)}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom subject focus"
/>

<div class="flex flex-col gap-1.5">
  <label for="rumour-location-context" class={labelClass}
    >Optional settlement / location</label
  >
  <input
    id="rumour-location-context"
    name="location_context"
    bind:value={locationContext}
    maxlength="200"
    aria-describedby="rumour-location-context-help"
    class={selectClass}
  />
  <p
    id="rumour-location-context-help"
    class="text-[10px] text-theme-muted leading-relaxed"
  >
    Name the tavern, settlement, or region these rumours are overheard in.
  </p>
</div>

<div class="flex flex-col gap-1.5">
  <label for="rumour-campaign-context" class={labelClass}
    >Optional campaign context</label
  >
  <textarea
    id="rumour-campaign-context"
    name="campaign_context"
    bind:value={campaignContext}
    maxlength="4000"
    rows="3"
    aria-describedby="rumour-campaign-context-help"
    class="w-full min-h-20 bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-base md:text-xs text-theme-text focus:outline-none focus:border-theme-primary/60 resize-y"
  ></textarea>
  <p
    id="rumour-campaign-context-help"
    class="text-[10px] text-theme-muted leading-relaxed"
  >
    Add existing NPCs, factions, or locations for the rumours to reference.
  </p>
</div>

<div class="pt-2 flex justify-end">
  <button
    type="button"
    onclick={() => {
      tone = pickFrom(rumourConfig.tones);
      dangerLevel = pickFrom(rumourConfig.dangerLevels);
      subjectFocus = pickFrom(rumourConfig.subjects);
      if (onSurprise) onSurprise();
    }}
    class="flex items-center gap-1.5 px-3 py-1.5 bg-theme-surface/60 border border-theme-border/60 rounded-lg text-[10px] font-bold uppercase tracking-wider text-theme-text hover:bg-theme-primary hover:text-theme-bg hover:border-theme-primary transition-all cursor-pointer"
    title="Randomize rumour options and generate a draft"
    ><span class="icon-[lucide--dices] w-3.5 h-3.5" aria-hidden="true"></span> Surprise
    Me</button
  >
</div>
