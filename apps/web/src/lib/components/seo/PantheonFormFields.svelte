<script lang="ts">
  import { pantheonConfig, pickFrom } from "$lib/services/seo/generator-engine";
  import SelectWithCustomOption from "$lib/components/forms/SelectWithCustomOption.svelte";

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

<SelectWithCustomOption
  id="pantheon-mode-select"
  label="Generate target"
  bind:value={mode}
  choices={[
    { value: "single", label: "Single Deity / Spirit" },
    { value: "pantheon", label: "Pantheon" },
  ]}
  className="flex flex-col gap-1.5"
  labelClass={labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom generate target"
/>

{#if mode === "pantheon"}
  <SelectWithCustomOption
    id="pantheon-size-select"
    label="Pantheon Size"
    bind:value={size}
    choices={pantheonConfig.sizes.map((s: { value: string; label: string }) => ({
      value: s.value,
      label: s.label,
    }))}
    className="flex flex-col gap-1.5"
    labelClass={labelClass}
    inputClass={selectClass}
    customPlaceholder="Enter a custom pantheon size"
  />

  <SelectWithCustomOption
    id="pantheon-width-select"
    label="Pantheon Focus / Width"
    bind:value={width}
    choices={pantheonConfig.widths.map((w: { value: string; label: string }) => ({
      value: w.value,
      label: w.label,
    }))}
    className="flex flex-col gap-1.5"
    labelClass={labelClass}
    inputClass={selectClass}
    customPlaceholder="Enter a custom pantheon width"
  />
{/if}

<SelectWithCustomOption
  id="pantheon-genre-select"
  label="Genre / Theme"
  bind:value={genre}
  choices={pantheonConfig.genres.map((g: string) => ({ value: g, label: g }))}
  className="flex flex-col gap-1.5"
  labelClass={labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom genre or theme"
/>

{#if mode === "single"}
  <SelectWithCustomOption
    id="pantheon-type-select"
    label="Divine Type"
    bind:value={divineType}
    choices={pantheonConfig.divineTypes.map((t: string) => ({ value: t, label: t }))}
    className="flex flex-col gap-1.5"
    labelClass={labelClass}
    inputClass={selectClass}
    customPlaceholder="Enter a custom divine type"
  />
{/if}

<SelectWithCustomOption
  id="pantheon-domain-select"
  label="Primary Domain"
  bind:value={domain}
  choices={pantheonConfig.domains.map((d: string) => ({ value: d, label: d }))}
  className="flex flex-col gap-1.5"
  labelClass={labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom primary domain"
/>

<SelectWithCustomOption
  id="pantheon-tone-select"
  label="Tone"
  bind:value={tone}
  choices={pantheonConfig.tones.map((t: string) => ({ value: t, label: t }))}
  className="flex flex-col gap-1.5"
  labelClass={labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom tone"
/>

<SelectWithCustomOption
  id="pantheon-worshippers-select"
  label="Worshippers"
  bind:value={worshippers}
  choices={pantheonConfig.worshippers.map((w: string) => ({ value: w, label: w }))}
  className="flex flex-col gap-1.5"
  labelClass={labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter custom worshippers"
/>

{#if mode === "pantheon"}
  <SelectWithCustomOption
    id="pantheon-conflict-select"
    label="Conflict Theme"
    bind:value={conflictTheme}
    choices={pantheonConfig.conflictThemes.map((c: string) => ({ value: c, label: c }))}
    className="flex flex-col gap-1.5"
    labelClass={labelClass}
    inputClass={selectClass}
    customPlaceholder="Enter a custom conflict theme"
  />
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
