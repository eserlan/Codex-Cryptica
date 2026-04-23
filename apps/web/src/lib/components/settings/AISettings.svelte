<script lang="ts">
  import { oracle } from "$lib/stores/oracle.svelte";
  import { uiStore } from "$lib/stores/ui.svelte";
  import { onMount } from "svelte";
  import InlineKeySetup from "../oracle/InlineKeySetup.svelte";

  onMount(() => {
    oracle.init();
  });

  const handleClear = async () => {
    if (
      await uiStore.confirm({
        title: "Reset Settings",
        message:
          "Are you sure you want to remove your API key? The Oracle will continue working via the system proxy.",
        confirmLabel: "Remove Key",
        isDangerous: true,
      })
    ) {
      await oracle.clearKey();
    }
  };

  const entityDiscoveryOptions = [
    {
      value: "off",
      label: "Off",
      description: "Do not show Oracle discovery chips.",
    },
    {
      value: "suggest",
      label: "Suggest",
      description: "Show found records and wait for your approval.",
    },
    {
      value: "auto-create",
      label: "Auto-create",
      description: "Save discovered records as drafts automatically.",
    },
  ] as const;

  const connectionDiscoveryOptions = [
    {
      value: "off",
      label: "Off",
      description: "Do not scan for links after Oracle updates.",
    },
    {
      value: "suggest",
      label: "Suggest",
      description: "Queue connection proposals for review.",
    },
    {
      value: "auto-apply",
      label: "Auto-apply",
      description: "Create eligible graph links automatically.",
    },
  ] as const;
</script>

<div class="p-4 border border-theme-border rounded-lg bg-theme-bg/30 mt-4">
  <div class="flex items-center justify-between mb-2">
    <div class="flex items-center gap-2">
      <div class="w-2 h-2 bg-theme-primary rounded-full animate-pulse"></div>
      <h3
        class="font-semibold text-theme-primary uppercase tracking-wider text-base font-header"
      >
        Lore Oracle (Gemini AI)
      </h3>
    </div>

    {#if oracle.apiKey}
      <button
        onclick={handleClear}
        class="text-sm text-red-400 hover:text-red-300 uppercase tracking-tight font-header"
      >
        Remove Key
      </button>
    {/if}
  </div>

  <p class="text-sm text-theme-text/80 mb-4 leading-relaxed">
    The Oracle uses Google Gemini for AI-powered lore assistance. Use the system
    proxy for free access, or add your own API key for direct access.
  </p>

  <!-- Connection Mode Display -->
  <div class="mb-6">
    <span
      class="text-sm text-theme-text/60 uppercase font-bold font-header block mb-3"
      >Connection Mode</span
    >

    {#if oracle.apiKey}
      <div
        class="p-4 bg-theme-primary/5 border border-theme-primary/20 rounded flex items-center gap-3"
      >
        <span class="text-theme-primary icon-[heroicons--sparkles] w-5 h-5"
        ></span>
        <div class="flex-1">
          <span
            class="text-base text-theme-text font-bold uppercase font-header tracking-wider"
          >
            Direct Connection: Custom Key
          </span>
          <span class="text-xs text-theme-muted block mt-1">
            Using your personal API key for direct access to Google Gemini.
          </span>
        </div>
        <span class="text-xs text-theme-muted font-mono"
          >••••{oracle.apiKey?.slice(-4)}</span
        >
      </div>
    {:else}
      <div
        class="p-4 bg-theme-accent/5 border border-theme-accent/20 rounded flex items-center gap-3"
      >
        <span class="text-theme-accent icon-[lucide--cloud] w-5 h-5"></span>
        <div class="flex-1">
          <span
            class="text-base text-theme-text font-bold uppercase font-header tracking-wider"
          >
            System Proxy
          </span>
          <span class="text-xs text-theme-muted block mt-1">
            Free access via the Codex Cryptica shared proxy.
          </span>
        </div>
        <span class="text-xs text-theme-accent font-bold">FREE</span>
      </div>
    {/if}
  </div>

  <!-- Oracle Automation Settings -->
  <div class="mb-6 pt-6 border-t border-theme-border/30">
    <div class="mb-5">
      <span
        class="text-sm text-theme-text font-bold uppercase font-header block"
        id="entity-discovery-label">Entity Discovery</span
      >
      <p class="text-xs text-theme-muted mt-1 mb-3 leading-relaxed">
        Choose whether Oracle chat should ignore, suggest, or automatically save
        discovered records.
      </p>
      <div
        class="grid grid-cols-1 sm:grid-cols-3 gap-2"
        role="radiogroup"
        aria-labelledby="entity-discovery-label"
      >
        {#each entityDiscoveryOptions as option (option.value)}
          <button
            type="button"
            role="radio"
            aria-checked={uiStore.entityDiscoveryMode === option.value}
            onclick={() => uiStore.setEntityDiscoveryMode(option.value)}
            class={[
              "text-left rounded-lg border p-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary/60",
              uiStore.entityDiscoveryMode === option.value
                ? "border-theme-primary bg-theme-primary/10 text-theme-text"
                : "border-theme-border bg-theme-bg/30 text-theme-text/80 hover:bg-theme-surface/60",
            ]}
          >
            <span class="block text-xs font-bold uppercase font-header">
              {option.label}
            </span>
            <span class="mt-1 block text-[11px] leading-snug text-theme-muted">
              {option.description}
            </span>
          </button>
        {/each}
      </div>
    </div>

    <div>
      <span
        class="text-sm text-theme-text font-bold uppercase font-header block"
        id="connection-discovery-label">Connection Discovery</span
      >
      <p class="text-xs text-theme-muted mt-1 mb-3 leading-relaxed">
        Choose what happens after the Oracle creates or updates a record.
      </p>
      <div
        class="grid grid-cols-1 sm:grid-cols-3 gap-2"
        role="radiogroup"
        aria-labelledby="connection-discovery-label"
      >
        {#each connectionDiscoveryOptions as option (option.value)}
          <button
            type="button"
            role="radio"
            aria-checked={uiStore.connectionDiscoveryMode === option.value}
            onclick={() => uiStore.setConnectionDiscoveryMode(option.value)}
            class={[
              "text-left rounded-lg border p-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary/60",
              uiStore.connectionDiscoveryMode === option.value
                ? "border-theme-primary bg-theme-primary/10 text-theme-text"
                : "border-theme-border bg-theme-bg/30 text-theme-text/80 hover:bg-theme-surface/60",
            ]}
          >
            <span class="block text-xs font-bold uppercase font-header">
              {option.label}
            </span>
            <span class="mt-1 block text-[11px] leading-snug text-theme-muted">
              {option.description}
            </span>
          </button>
        {/each}
      </div>
    </div>
  </div>

  <!-- Oracle Tools -->
  <div class="mt-6 pt-6 border-t border-theme-border/30">
    <span
      class="text-sm text-theme-text font-bold uppercase font-header block mb-1"
      >Oracle Tools</span
    >
    <p class="text-xs text-theme-muted mb-4 leading-relaxed">
      Run manual analysis scripts to refine your campaign.
    </p>

    <button
      onclick={() => {
        uiStore.showSettings = false;
        uiStore.showAIConnectionsAssessment = true;
      }}
      class="w-full flex items-center justify-between p-3 rounded-lg border border-theme-border bg-theme-bg/30 text-theme-text hover:bg-theme-primary/10 hover:border-theme-primary/40 transition-all group"
    >
      <div class="flex items-center gap-3 text-left">
        <div
          class="w-8 h-8 rounded-full bg-theme-primary/10 flex items-center justify-center text-theme-primary group-hover:scale-110 transition-transform"
        >
          <span class="icon-[lucide--brain-circuit] w-4 h-4"></span>
        </div>
        <div>
          <span class="block text-xs font-bold uppercase font-header"
            >Connections Assessment</span
          >
          <span class="text-[10px] text-theme-muted block"
            >Scan entire archive for missing links.</span
          >
        </div>
      </div>
      <span
        class="icon-[lucide--chevron-right] w-4 h-4 text-theme-muted group-hover:text-theme-primary transition-colors"
      ></span>
    </button>
  </div>

  <!-- API Key Management -->
  {#if !oracle.apiKey}
    <div class="pt-2 border-t border-theme-border">
      <p class="text-sm text-theme-text/80 mb-3">
        Add your own API key for direct access and enhanced rate limits.
      </p>
      <InlineKeySetup />
    </div>
  {/if}
</div>
