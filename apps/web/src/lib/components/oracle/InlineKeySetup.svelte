<script lang="ts">
  import { oracle } from "$lib/stores/oracle.svelte";
  import { Eye, EyeOff, Sparkles, ExternalLink } from "lucide-svelte";
  import { fade } from "svelte/transition";

  let inputKey = $state("");
  let showKey = $state(false);
  let isSaving = $state(false);

  async function handleSave() {
    if (!inputKey.trim() || isSaving) return;
    isSaving = true;
    try {
      await oracle.setKey(inputKey.trim());
      inputKey = "";
    } catch (err) {
      console.error("Failed to save API key:", err);
    } finally {
      isSaving = false;
    }
  }
</script>

<div
  class="p-6 border border-theme-primary/30 rounded-xl bg-theme-primary/5 space-y-6"
  transition:fade
>
  <div class="flex items-start gap-4">
    <div
      class="w-12 h-12 rounded-xl bg-theme-primary/10 flex items-center justify-center text-theme-primary shrink-0"
    >
      <Sparkles class="w-6 h-6 animate-pulse" />
    </div>
    <div class="space-y-1">
      <h3
        class="text-base font-bold text-theme-primary uppercase font-header tracking-wider"
      >
        Oracle Connection Required
      </h3>
      <p class="text-sm text-theme-text/80 leading-relaxed">
        Intelligent archive importing requires a direct connection to the Google
        Gemini API. Provide your personal key to enable updates.
      </p>
    </div>
  </div>

  <div class="space-y-4 pt-4 border-t border-theme-border/50">
    <div class="flex flex-col gap-2">
      <div class="relative">
        <input
          type={showKey ? "text" : "password"}
          placeholder="Paste your Google Gemini API key..."
          class="w-full bg-theme-bg border border-theme-border hover:border-theme-primary/50 focus:border-theme-primary rounded-lg px-4 py-3 text-sm text-theme-text outline-none pr-12 font-mono transition-all shadow-inner"
          bind:value={inputKey}
          onkeydown={(e) => e.key === "Enter" && handleSave()}
        />
        <button
          type="button"
          class="absolute right-4 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme-primary transition-colors"
          onclick={() => (showKey = !showKey)}
          aria-label="{showKey ? 'Hide' : 'Show'} API Key"
        >
          {#if showKey}
            <EyeOff class="w-4 h-4" />
          {:else}
            <Eye class="w-4 h-4" />
          {/if}
        </button>
      </div>
    </div>

    <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
      <a
        href="https://aistudio.google.com/app/apikey"
        target="_blank"
        rel="noopener noreferrer"
        class="text-xs text-theme-secondary hover:text-theme-primary flex items-center gap-1.5 transition-colors group font-header tracking-wide uppercase"
      >
        <span>Get free key from Google AI Studio</span>
        <ExternalLink
          class="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
        />
      </a>

      <button
        class="w-full sm:w-auto px-8 py-3 bg-theme-primary hover:bg-theme-secondary text-theme-bg font-bold rounded-lg text-xs tracking-[0.2em] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-theme-primary/20 font-header uppercase"
        onclick={handleSave}
        disabled={!inputKey.trim() || isSaving}
      >
        {#if isSaving}
          Activating...
        {:else}
          Activate Oracle
        {/if}
      </button>
    </div>
  </div>
</div>
