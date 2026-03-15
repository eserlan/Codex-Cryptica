<script lang="ts">
  import { oracle } from "$lib/stores/oracle.svelte";
  import { onMount } from "svelte";
  import InlineKeySetup from "../oracle/InlineKeySetup.svelte";

  onMount(() => {
    oracle.init();
  });

  const handleClear = async () => {
    if (
      confirm(
        "Are you sure you want to disable the Oracle and delete the API key from this device?",
      )
    ) {
      await oracle.clearKey();
    }
  };
</script>

<div class="p-4 border border-theme-border rounded-lg bg-theme-bg/30 mt-4">
  <div class="flex items-center justify-between mb-2">
    <div class="flex items-center gap-2">
      <div
        class="w-2 h-2 bg-theme-primary rounded-full {oracle.isEnabled
          ? 'animate-pulse'
          : 'opacity-30'}"
      ></div>
      <h3
        class="font-semibold text-theme-primary uppercase tracking-wider text-base font-header"
      >
        Lore Oracle (Gemini AI)
      </h3>
    </div>

    {#if oracle.isEnabled}
      <button
        onclick={handleClear}
        class="text-sm text-red-400 hover:text-red-300 uppercase tracking-tight font-header"
      >
        Disable & Clear Key
      </button>
    {/if}
  </div>

  <p class="text-sm text-theme-text/80 mb-4 leading-relaxed">
    Power your archives with Google Gemini. Choose between the <strong
      class="text-theme-primary">Lite</strong
    >
    tier for efficiency or
    <strong class="text-theme-accent">Advanced</strong> for complex reasoning.
  </p>

  <!-- Tier Selection -->
  <div class="mb-6 space-y-3">
    <span
      class="text-sm text-theme-text/60 uppercase font-bold font-header block"
      >Oracle Intelligence Tier</span
    >
    <div class="grid grid-cols-2 gap-3">
      <button
        class="flex flex-col gap-1 p-3 rounded transition-all border text-left {oracle.tier ===
        'lite'
          ? 'bg-theme-primary/10 border-theme-primary ring-1 ring-theme-primary/50'
          : 'bg-theme-bg/30 border-theme-border hover:border-theme-primary/50'}"
        onclick={() => oracle.setTier("lite")}
        aria-pressed={oracle.tier === "lite"}
      >
        <span
          class="text-sm font-bold tracking-widest uppercase font-header {oracle.tier ===
          'lite'
            ? 'text-theme-primary'
            : 'text-theme-muted'}">Lite Tier</span
        >
        <span
          class="text-sm {oracle.tier === 'lite'
            ? 'text-theme-text'
            : 'text-theme-text/40'} leading-tight"
          >Fast, efficient, and suitable for simple lore retrieval.</span
        >
      </button>
      <button
        class="flex flex-col gap-1 p-3 rounded transition-all border text-left {oracle.tier ===
        'advanced'
          ? 'bg-theme-accent/10 border-theme-accent ring-1 ring-theme-accent/50'
          : 'bg-theme-bg/30 border-theme-border hover:border-theme-accent/30'}"
        onclick={() => oracle.setTier("advanced")}
        aria-pressed={oracle.tier === "advanced"}
      >
        <span
          class="text-sm font-bold tracking-widest uppercase font-header {oracle.tier ===
          'advanced'
            ? 'text-theme-accent'
            : 'text-theme-muted'}">Advanced Tier</span
        >
        <span
          class="text-sm {oracle.tier === 'advanced'
            ? 'text-theme-text'
            : 'text-theme-text/40'} leading-tight"
          >Superior reasoning, complex world-building, and high reliability.</span
        >
      </button>
    </div>
  </div>

  <!-- Access Management -->
  {#if oracle.apiKey}
    <div
      class="p-4 bg-theme-primary/5 border border-theme-primary/20 rounded flex items-center justify-between mb-4"
    >
      <div class="flex items-center gap-3">
        <span class="text-theme-primary icon-[heroicons--sparkles] w-5 h-5"
        ></span>
        <div class="flex flex-col">
          <span
            class="text-base text-theme-text font-bold uppercase font-header tracking-wider"
          >
            Personal Key Active
          </span>
          <span class="text-xs text-theme-muted font-mono">
            Provides full access to {oracle.tier.toUpperCase()} reasoning.
          </span>
        </div>
      </div>
      <span class="text-xs text-theme-muted font-mono"
        >••••{oracle.apiKey?.slice(-4)}</span
      >
    </div>
  {:else}
    {#if import.meta.env.VITE_SHARED_GEMINI_KEY && oracle.tier === "lite"}
      <div
        class="p-4 bg-theme-primary/10 border border-theme-primary/20 rounded-lg mb-6 flex items-start gap-4"
      >
        <div
          class="w-8 h-8 rounded-full bg-theme-primary/20 flex items-center justify-center text-theme-primary shrink-0"
        >
          <span class="icon-[lucide--check-circle] w-5 h-5"></span>
        </div>
        <div class="flex-1">
          <h4
            class="text-sm font-bold text-theme-primary uppercase font-header tracking-widest mb-1"
          >
            Shared Access Active
          </h4>
          <p class="text-sm text-theme-text/80 leading-relaxed">
            You are using the system-provided shared access for the Lite tier.
            This allows for basic Oracle consultation without a personal key.
          </p>
        </div>
      </div>
    {/if}

    <div class="pt-2 border-t border-theme-border">
      <InlineKeySetup />
    </div>
  {/if}
</div>
