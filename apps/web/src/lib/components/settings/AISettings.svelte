<script lang="ts">
  import { oracle } from "$lib/stores/oracle.svelte";
  import { onMount } from "svelte";
  import InlineKeySetup from "../oracle/InlineKeySetup.svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";
  import { discoveryPolicyStore } from "$lib/stores/ui/discovery-policy.svelte";
  import { DEFAULT_CF_IMAGE_MODEL } from "@codex/oracle-engine";

  onMount(() => {
    oracle.init();
  });

  const handleClear = async () => {
    if (
      await notificationStore.confirm({
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
            aria-checked={discoveryPolicyStore.entityDiscoveryMode ===
              option.value}
            onclick={() =>
              discoveryPolicyStore.setEntityDiscoveryMode(option.value)}
            class={[
              "text-left rounded-lg border p-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary/60",
              discoveryPolicyStore.entityDiscoveryMode === option.value
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
            aria-checked={discoveryPolicyStore.connectionDiscoveryMode ===
              option.value}
            onclick={() =>
              discoveryPolicyStore.setConnectionDiscoveryMode(option.value)}
            class={[
              "text-left rounded-lg border p-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary/60",
              discoveryPolicyStore.connectionDiscoveryMode === option.value
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

  <!-- API Key Management -->
  {#if !oracle.apiKey}
    <div class="pt-2 border-t border-theme-border">
      <p class="text-sm text-theme-text/80 mb-3">
        Add your own API key for direct access and enhanced rate limits.
      </p>
      <InlineKeySetup />
    </div>
  {/if}
  <!-- Custom Image Provider -->
  <div class="mt-6 pt-6 border-t border-theme-border/30">
    <div class="mb-5">
      <span
        class="text-sm text-theme-text font-bold uppercase font-header block mb-3"
        >Image Generation Provider</span
      >

      <div class="flex flex-wrap gap-4 mb-4">
        <label class="flex items-center gap-2 text-sm text-theme-text">
          <input
            type="radio"
            name="img_provider"
            value="cloudflare"
            checked={oracle.settings.imageProvider === "cloudflare"}
            onchange={() =>
              oracle.updateSettings({ imageProvider: "cloudflare" })}
          />
          Cloudflare Workers AI
        </label>
        <label
          class="flex items-center gap-2 text-sm text-theme-text"
          class:opacity-50={!oracle.apiKey}
        >
          <input
            type="radio"
            name="img_provider"
            value="gemini"
            checked={oracle.settings.imageProvider === "gemini"}
            disabled={!oracle.apiKey}
            onchange={() => oracle.updateSettings({ imageProvider: "gemini" })}
          />
          Google Gemini API
          {#if !oracle.apiKey}
            <span
              class="text-[10px] bg-theme-muted/20 px-1.5 py-0.5 rounded text-theme-muted"
              >Requires own key</span
            >
          {/if}
        </label>
        <label class="flex items-center gap-2 text-sm text-theme-text">
          <input
            type="radio"
            name="img_provider"
            value="custom"
            checked={oracle.settings.imageProvider === "custom"}
            onchange={() => oracle.updateSettings({ imageProvider: "custom" })}
          />
          Custom (OpenAI-Compatible)
        </label>
      </div>

      {#if oracle.settings.imageProvider === "cloudflare"}
        <div
          class="space-y-4 p-4 bg-theme-bg/50 border border-theme-border rounded"
        >
          <p class="text-xs text-theme-muted leading-relaxed">
            Leave Account ID and API Token blank to use the free shared system
            proxy (subject to daily limits).
          </p>
          <div>
            <label
              class="block text-xs uppercase font-bold text-theme-text/80 mb-1"
              for="cfAccountId">Account ID</label
            >
            <input
              id="cfAccountId"
              type="text"
              class="w-full bg-theme-bg border border-theme-border rounded px-3 py-2 text-sm"
              placeholder="e.g. 1234567890abcdef1234567890abcdef"
              value={oracle.settings.cloudflareAccountId}
              onchange={(e) =>
                oracle.updateSettings({
                  cloudflareAccountId: e.currentTarget.value,
                })}
            />
          </div>
          <div>
            <label
              class="block text-xs uppercase font-bold text-theme-text/80 mb-1"
              for="cfApiToken">API Token</label
            >
            <input
              id="cfApiToken"
              type="password"
              class="w-full bg-theme-bg border border-theme-border rounded px-3 py-2 text-sm"
              placeholder="Cloudflare API token with Workers AI permission"
              value={oracle.settings.cloudflareApiToken}
              onchange={(e) =>
                oracle.updateSettings({
                  cloudflareApiToken: e.currentTarget.value,
                })}
            />
          </div>
          <div>
            <label
              class="block text-xs uppercase font-bold text-theme-text/80 mb-1"
              for="cfModelName">Model Name</label
            >
            <input
              id="cfModelName"
              type="text"
              class="w-full bg-theme-bg border border-theme-border rounded px-3 py-2 text-sm"
              placeholder={DEFAULT_CF_IMAGE_MODEL}
              value={oracle.settings.cloudflareModel}
              onchange={(e) =>
                oracle.updateSettings({
                  cloudflareModel: e.currentTarget.value,
                })}
            />
          </div>
        </div>
      {/if}

      {#if oracle.settings.imageProvider === "custom"}
        <div
          class="space-y-4 p-4 bg-theme-bg/50 border border-theme-border rounded"
        >
          <div>
            <label
              class="block text-xs uppercase font-bold text-theme-text/80 mb-1"
              for="customImageBaseUrl">Base URL</label
            >
            <input
              id="customImageBaseUrl"
              type="text"
              class="w-full bg-theme-bg border border-theme-border rounded px-3 py-2 text-sm"
              placeholder="https://api.together.xyz/v1/images/generations"
              value={oracle.settings.customImageBaseUrl}
              onchange={(e) =>
                oracle.updateSettings({
                  customImageBaseUrl: e.currentTarget.value,
                })}
            />
            <p class="text-[11px] text-theme-muted mt-1">
              Must be an OpenAI-compatible /v1/images/generations endpoint.
            </p>
          </div>
          <div>
            <label
              class="block text-xs uppercase font-bold text-theme-text/80 mb-1"
              for="customImageApiKey">API Key</label
            >
            <input
              id="customImageApiKey"
              type="password"
              class="w-full bg-theme-bg border border-theme-border rounded px-3 py-2 text-sm"
              placeholder="sk-..."
              value={oracle.settings.customImageApiKey}
              onchange={(e) =>
                oracle.updateSettings({
                  customImageApiKey: e.currentTarget.value,
                })}
            />
          </div>
          <div>
            <label
              class="block text-xs uppercase font-bold text-theme-text/80 mb-1"
              for="customImageModel">Model Name</label
            >
            <input
              id="customImageModel"
              type="text"
              class="w-full bg-theme-bg border border-theme-border rounded px-3 py-2 text-sm"
              placeholder="black-forest-labs/FLUX.1-schnell"
              value={oracle.settings.customImageModel}
              onchange={(e) =>
                oracle.updateSettings({
                  customImageModel: e.currentTarget.value,
                })}
            />
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>
