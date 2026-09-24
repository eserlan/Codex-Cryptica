<script lang="ts">
  import { holidayConfig, pickFrom } from "$lib/services/seo/generator-engine";
  import SelectWithCustomOption from "$lib/components/forms/SelectWithCustomOption.svelte";

  let {
    theme = $bindable(holidayConfig.genres[0]),
    scope = $bindable(holidayConfig.scopes[0]),
    setSize = $bindable(holidayConfig.setSizes[0]),
    tone = $bindable(holidayConfig.tones[0]),
    culture = $bindable(""),
    climate = $bindable(""),
    religion = $bindable(""),
    history = $bindable(""),
    importantPeople = $bindable(""),
    importantEvents = $bindable(""),
    includeControversial = $bindable(false),
    onSurprise,
  }: {
    theme: string;
    scope: string;
    setSize: string;
    tone: string;
    culture: string;
    climate: string;
    religion: string;
    history: string;
    importantPeople: string;
    importantEvents: string;
    includeControversial: boolean;
    onSurprise?: () => void;
  } = $props();

  const selectClass =
    "w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary/60";
  const labelClass =
    "text-[11px] font-bold uppercase tracking-wider text-theme-text/80";
  const inputClass =
    "w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-sm text-theme-text focus:outline-none focus:border-theme-primary/60";
</script>

<SelectWithCustomOption
  id="holiday-theme"
  label="Choose a vibe"
  bind:value={theme}
  choices={holidayConfig.genres.map((value) => ({ value, label: value }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom vibe"
/>
<SelectWithCustomOption
  id="holiday-scope"
  label="Observance scope"
  bind:value={scope}
  choices={holidayConfig.scopes.map((value) => ({ value, label: value }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
/>
<SelectWithCustomOption
  id="holiday-size"
  label="Generate"
  bind:value={setSize}
  choices={holidayConfig.setSizes.map((value) => ({ value, label: value }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
/>
<SelectWithCustomOption
  id="holiday-tone"
  label="Tone"
  bind:value={tone}
  choices={holidayConfig.tones.map((value) => ({ value, label: value }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
/>
<label for="holiday-culture" class={labelClass}>Culture or society</label>
<textarea
  id="holiday-culture"
  bind:value={culture}
  rows="2"
  placeholder="Describe the people and what matters to them"
  class={inputClass}
></textarea>
<label for="holiday-climate" class={labelClass}
  >Climate, seasons, or calendar</label
>
<textarea
  id="holiday-climate"
  bind:value={climate}
  rows="2"
  placeholder="Climate, seasons, moons, or calendar"
  class={inputClass}
></textarea>
<label for="holiday-religion" class={labelClass}>Religion or cosmology</label>
<textarea
  id="holiday-religion"
  bind:value={religion}
  rows="2"
  placeholder="Beliefs, deities, ancestors, or cosmology"
  class={inputClass}
></textarea>
<label for="holiday-history" class={labelClass}
  >Political or historical background</label
>
<textarea
  id="holiday-history"
  bind:value={history}
  rows="2"
  placeholder="Wars, disasters, rulers, political tensions"
  class={inputClass}
></textarea>
<label for="holiday-people" class={labelClass}>Important people</label>
<textarea
  id="holiday-people"
  bind:value={importantPeople}
  rows="2"
  placeholder="People worth considering, not necessarily commemorating"
  class={inputClass}
></textarea>
<label for="holiday-events" class={labelClass}>Important events</label>
<textarea
  id="holiday-events"
  bind:value={importantEvents}
  rows="2"
  placeholder="Historical events that might shape observances"
  class={inputClass}
></textarea>
<label class="flex items-center gap-2 text-xs text-theme-text">
  <input type="checkbox" bind:checked={includeControversial} /> Include a contested,
  secret, or suppressed observance
</label>
<div class="pt-2 flex justify-end">
  <button
    type="button"
    onclick={() => {
      scope = pickFrom(holidayConfig.scopes);
      setSize = pickFrom(holidayConfig.setSizes);
      tone = pickFrom(holidayConfig.tones);
      onSurprise?.();
    }}
    class="flex items-center gap-1.5 px-3 py-1.5 bg-theme-surface/60 border border-theme-border/60 rounded-lg text-[10px] font-bold uppercase tracking-wider text-theme-text hover:bg-theme-primary hover:text-theme-bg transition-all cursor-pointer"
  >
    <span class="icon-[lucide--dices] w-3.5 h-3.5" aria-hidden="true"
    ></span>Surprise Me
  </button>
</div>
