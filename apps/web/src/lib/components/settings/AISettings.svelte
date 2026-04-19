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

  <!-- Auto-Archive Setting -->
  <div class="mb-6 pt-6 border-t border-theme-border/30">
    <div class="flex items-start justify-between gap-4">
      <div class="flex-1">
        <label
          for="auto-archive-toggle"
          class="text-sm text-theme-text font-bold uppercase font-header block cursor-pointer"
          >Auto-Archive Discovered Lore</label
        >
        <p class="text-xs text-theme-muted mt-1 leading-relaxed">
          When enabled, the Oracle will automatically save new characters,
          locations, and items to your vault as drafts.
        </p>
      </div>
      <label class="relative inline-flex items-center cursor-pointer">
        <input
          id="auto-archive-toggle"
          type="checkbox"
          class="sr-only peer"
          checked={uiStore.autoArchive}
          onchange={(e) => uiStore.toggleAutoArchive(e.currentTarget.checked)}
        />
        <div
          class="w-11 h-6 bg-theme-border/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-theme-bg after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-theme-text after:border-theme-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-theme-primary"
        ></div>
      </label>
    </div>
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
