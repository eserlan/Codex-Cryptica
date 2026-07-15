<script lang="ts">
  import { shipConfig, pickFrom } from "$lib/services/seo/generator-engine";
  import SelectWithCustomOption from "$lib/components/forms/SelectWithCustomOption.svelte";

  let {
    genre = $bindable(shipConfig.genres[0]),
    role = $bindable(""),
    scale = $bindable(""),
    condition = $bindable(""),
    tone = $bindable(""),
    campaignContext = $bindable(""),
    onSurprise = undefined,
    onGenreChange = undefined,
  }: {
    genre: string;
    role: string;
    scale: string;
    condition: string;
    tone: string;
    campaignContext: string;
    onSurprise?: () => void;
    onGenreChange?: (genre: string) => void;
  } = $props();

  const selectClass =
    "w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary/60";
  const labelClass =
    "text-[10px] font-bold uppercase tracking-wider text-theme-text/80";

  const availableScales = $derived(
    shipConfig.scalesByGenre?.[genre] ?? shipConfig.scales,
  );
</script>

<SelectWithCustomOption
  id="ship-genre-select"
  label="Genre"
  bind:value={genre}
  choices={shipConfig.genres.map((g: string) => ({ value: g, label: g }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom genre"
  onvaluechange={(g) => {
    onGenreChange?.(g);
    role = (shipConfig.rolesByGenre[g] ?? shipConfig.rolesByGenre["Sci-Fi"])[0];
    scale = (shipConfig.scalesByGenre?.[g] ?? shipConfig.scales)[0];
  }}
/>

<SelectWithCustomOption
  id="ship-role-select"
  label="Ship Role"
  bind:value={role}
  choices={(
    shipConfig.rolesByGenre[genre] ?? shipConfig.rolesByGenre["Sci-Fi"]
  ).map((r: string) => ({
    value: r,
    label: r,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom role"
/>

<SelectWithCustomOption
  id="ship-scale-select"
  label="Scale"
  bind:value={scale}
  choices={availableScales.map((s: string) => ({ value: s, label: s }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom scale"
/>

<SelectWithCustomOption
  id="ship-condition-select"
  label="Condition"
  bind:value={condition}
  choices={shipConfig.conditions.map((c: string) => ({
    value: c,
    label: c,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom condition"
/>

<SelectWithCustomOption
  id="ship-tone-select"
  label="Tone"
  bind:value={tone}
  choices={shipConfig.tones.map((t: string) => ({ value: t, label: t }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom tone"
/>

<div class="flex flex-col gap-1.5">
  <label for="ship-context" class={labelClass}
    >Campaign context (optional)</label
  >
  <textarea
    id="ship-context"
    bind:value={campaignContext}
    maxlength="240"
    rows="4"
    aria-describedby="ship-context-help"
    class="w-full min-h-24 bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-base md:text-xs text-theme-text focus:outline-none focus:border-theme-primary/60 resize-y"
  ></textarea>
  <p
    id="ship-context-help"
    class="text-[10px] text-theme-text/60 leading-relaxed"
  >
    Add a faction, system, conflict, or any detail to aim the ship at your
    world.
  </p>
</div>

<div class="pt-2 flex justify-end">
  <button
    type="button"
    class="flex items-center gap-1.5 px-3 py-1.5 bg-theme-surface/60 border border-theme-border/60 rounded-lg text-[10px] font-bold uppercase tracking-wider text-theme-text hover:bg-theme-primary hover:text-theme-bg hover:border-theme-primary transition-all cursor-pointer"
    title="Randomize all options and generate a draft from the result"
    onclick={() => {
      const roles =
        shipConfig.rolesByGenre[genre] ?? shipConfig.rolesByGenre["Sci-Fi"];
      role = pickFrom(roles);
      scale = pickFrom(availableScales);
      condition = pickFrom(shipConfig.conditions);
      tone = pickFrom(shipConfig.tones);
      onSurprise?.();
    }}
  >
    <span class="icon-[lucide--dices] w-3.5 h-3.5"></span>
    Surprise Me
  </button>
</div>
