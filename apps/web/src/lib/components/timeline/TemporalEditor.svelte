<script lang="ts">
  import type { TemporalMetadata } from "chronology-engine";
  import { calendarEngine } from "chronology-engine";
  import { calendarStore } from "$lib/stores/calendar.svelte";
  import { slide } from "svelte/transition";
  import TemporalPicker from "./TemporalPicker.svelte";

  let { value = $bindable(), label = "Chronological Date" } = $props<{
    value?: TemporalMetadata;
    label?: string;
  }>();

  let showPicker = $state(false);
  let triggerElement = $state<HTMLElement>();
  let showLabelInput = $state(!!value?.label);

  const clear = () => {
    value = undefined;
  };

  const updateLabel = (e: Event) => {
    const val = (e.target as HTMLInputElement).value;
    if (!value && val) {
      value = { year: 0, label: val };
    } else if (value) {
      value = { ...value, label: val || undefined };
    }
  };
</script>

<div class="space-y-2 p-3 bg-theme-bg/30 border border-theme-border/20 rounded">
  <div class="flex items-center justify-between">
    <span class="text-xs font-bold text-theme-primary uppercase tracking-widest"
      >{label}</span
    >
    {#if value?.year !== undefined}
      <button
        onclick={clear}
        class="text-[10px] text-red-500 hover:text-red-400 uppercase font-mono"
      >
        Clear
      </button>
    {/if}
  </div>

  <!-- Picker Trigger -->
  <button
    bind:this={triggerElement}
    onclick={() => (showPicker = !showPicker)}
    class="w-full text-left bg-theme-bg border border-theme-border/30 rounded px-3 py-2 flex items-center justify-between group hover:border-theme-primary transition-all"
  >
    {#if value?.year !== undefined}
      <span class="text-sm text-theme-text font-mono">
        {calendarEngine.format(value, calendarStore.config)}
      </span>
    {:else}
      <span class="text-sm text-theme-muted italic">No date set...</span>
    {/if}
    <span
      class="icon-[lucide--calendar] w-4 h-4 text-theme-muted group-hover:text-theme-primary transition-colors"
    ></span>
  </button>

  {#if showPicker && triggerElement}
    <TemporalPicker
      bind:value
      trigger={triggerElement}
      onClose={() => (showPicker = false)}
    />
  {/if}

  <div class="flex flex-col gap-1">
    <button
      onclick={() => (showLabelInput = !showLabelInput)}
      class="text-[10px] text-theme-muted uppercase font-bold text-left hover:text-theme-primary transition-colors flex items-center gap-1"
    >
      <span class="text-[8px]">{showLabelInput ? "▼" : "▶"}</span> Display Label (Optional)
    </button>
    {#if showLabelInput}
      <div transition:slide={{ duration: 200 }}>
        <input
          type="text"
          value={value?.label || ""}
          oninput={updateLabel}
          placeholder="e.g. Early 1240 AF"
          class="bg-theme-bg border border-theme-border/30 rounded px-2 py-1.5 text-sm text-theme-text focus:border-theme-primary outline-none w-full placeholder:opacity-50"
        />
      </div>
    {/if}
  </div>
</div>
