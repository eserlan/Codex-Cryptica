<script lang="ts">
  import type { TemporalMetadata } from "schema";
  import { slide } from "svelte/transition";

  let { 
    value = $bindable(), 
    label = "Chronological Date" 
  } = $props<{ 
    value?: TemporalMetadata, 
    label?: string 
  }>();

  let year = $state<number | undefined>(value?.year);
  let month = $state<number | undefined>(value?.month);
  let day = $state<number | undefined>(value?.day);
  let displayLabel = $state<string | undefined>(value?.label);
  let showLabelInput = $state(!!value?.label);

  $effect(() => {
    year = value?.year;
    month = value?.month;
    day = value?.day;
    displayLabel = value?.label;
  });

  const update = () => {
    if (year === undefined || year === null) {
      value = undefined;
    } else {
      value = {
        year,
        month: month ?? undefined,
        day: day ?? undefined,
        label: displayLabel ?? undefined
      };
    }
  };
</script>

<div class="space-y-2 p-3 bg-zinc-900/30 border border-green-900/20 rounded">
  <div class="flex items-center justify-between">
    <span class="text-xs font-bold text-green-500 uppercase tracking-widest">{label}</span>
    {#if year !== undefined}
      <button 
        onclick={() => { year = undefined; update(); }}
        class="text-[10px] text-red-500 hover:text-red-400 uppercase font-mono"
      >
        Clear
      </button>
    {/if}
  </div>

  <div class="grid grid-cols-3 gap-2">
    <div class="flex flex-col gap-1">
      <span class="text-[10px] text-green-800 uppercase font-bold">Year</span>
      <input 
        type="number" 
        bind:value={year} 
        oninput={update}
        placeholder="1240"
        class="bg-black border border-green-900/30 rounded px-2 py-1.5 text-sm text-gray-100 focus:border-green-500 outline-none w-full font-mono"
      />
    </div>
    <div class="flex flex-col gap-1">
      <span class="text-[10px] text-green-800 uppercase font-bold">Month</span>
      <input 
        type="number" 
        min="1" 
        max="12"
        bind:value={month} 
        oninput={update}
        placeholder="MM"
        class="bg-black border border-green-900/30 rounded px-2 py-1.5 text-sm text-gray-100 focus:border-green-500 outline-none w-full font-mono"
      />
    </div>
    <div class="flex flex-col gap-1">
      <span class="text-[10px] text-green-800 uppercase font-bold">Day</span>
      <input 
        type="number" 
        min="1" 
        max="31"
        bind:value={day} 
        oninput={update}
        placeholder="DD"
        class="bg-black border border-green-900/30 rounded px-2 py-1.5 text-sm text-gray-100 focus:border-green-500 outline-none w-full font-mono"
      />
    </div>
  </div>

  <div class="flex flex-col gap-1">
    <button 
      onclick={() => showLabelInput = !showLabelInput}
      class="text-[10px] text-green-800 uppercase font-bold text-left hover:text-green-500 transition-colors flex items-center gap-1"
    >
      <span class="text-[8px]">{showLabelInput ? '▼' : '▶'}</span> Display Label (Optional)
    </button>
    {#if showLabelInput}
      <div transition:slide={{ duration: 200 }}>
        <input 
          type="text" 
          bind:value={displayLabel} 
          oninput={update}
          placeholder="e.g. Early 1240 AF"
          class="bg-black border border-green-900/30 rounded px-2 py-1.5 text-sm text-gray-100 focus:border-green-500 outline-none w-full"
        />
      </div>
    {/if}
  </div>
</div>