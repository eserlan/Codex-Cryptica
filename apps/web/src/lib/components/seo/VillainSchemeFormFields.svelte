<script lang="ts">
  import {
    villainSchemeConfig,
    pickFrom,
  } from "$lib/services/seo/generator-engine";
  import SelectWithCustomOption from "$lib/components/forms/SelectWithCustomOption.svelte";

  let {
    powerScale = $bindable(villainSchemeConfig.powerScales[0]),
    tone = $bindable(villainSchemeConfig.tones[0]),
    schemeType = $bindable(villainSchemeConfig.schemeTypes[0]),
    villainProfile = $bindable(villainSchemeConfig.villainProfiles[0]),
    campaignContext = $bindable(""),
    onSurprise = undefined,
  }: {
    powerScale: string;
    tone: string;
    schemeType: string;
    villainProfile: string;
    campaignContext: string;
    onSurprise?: () => void;
  } = $props();

  const selectClass =
    "w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary/60";
  const labelClass =
    "text-[11px] font-bold uppercase tracking-wider text-theme-text/80";
</script>

<p class="text-[10px] text-theme-muted leading-relaxed">
  Superhero / Comic Book only — this generator builds an ongoing villain SCHEME
  (not a villain writeup) that any villain, existing or freshly imagined, could
  be running.
</p>

<SelectWithCustomOption
  id="villain-scheme-power-scale-select"
  label="Power Scale"
  bind:value={powerScale}
  choices={villainSchemeConfig.powerScales.map((p: string) => ({
    value: p,
    label: p,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom power scale"
/>

<SelectWithCustomOption
  id="villain-scheme-tone-select"
  label="Tone"
  bind:value={tone}
  choices={villainSchemeConfig.tones.map((t: string) => ({
    value: t,
    label: t,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom tone"
/>

<SelectWithCustomOption
  id="villain-scheme-type-select"
  label="Scheme Type"
  bind:value={schemeType}
  choices={villainSchemeConfig.schemeTypes.map((s: string) => ({
    value: s,
    label: s,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom scheme type"
/>

<SelectWithCustomOption
  id="villain-scheme-villain-profile-select"
  label="Villain Profile"
  bind:value={villainProfile}
  choices={villainSchemeConfig.villainProfiles.map((v: string) => ({
    value: v,
    label: v,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom villain profile"
/>
<p class="text-[10px] text-theme-muted leading-relaxed -mt-1">
  Who is plausibly behind the scheme. Only lightly referenced in the output --
  swap in an existing campaign villain freely.
</p>

<div class="pt-2 flex justify-end">
  <button
    type="button"
    onclick={() => {
      powerScale = pickFrom(villainSchemeConfig.powerScales);
      tone = pickFrom(villainSchemeConfig.tones);
      schemeType = pickFrom(villainSchemeConfig.schemeTypes);
      villainProfile = pickFrom(villainSchemeConfig.villainProfiles);
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
  <label for="villain-scheme-campaign-context" class={labelClass}
    >Optional Campaign Context</label
  >
  <textarea
    id="villain-scheme-campaign-context"
    name="campaign_context"
    bind:value={campaignContext}
    maxlength="4000"
    rows="3"
    aria-describedby="villain-scheme-campaign-context-help"
    class="w-full min-h-20 bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-base md:text-xs text-theme-text focus:outline-none focus:border-theme-primary/60 resize-y"
  ></textarea>
  <p
    id="villain-scheme-campaign-context-help"
    class="text-[10px] text-theme-muted leading-relaxed"
  >
    Add a city, team, or ongoing campaign tension to ground this scheme in your
    table.
  </p>
</div>
