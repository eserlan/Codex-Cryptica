<script lang="ts">
  import type { Entity } from "schema";
  import { vault } from "#lib/stores/vault.svelte.js";
  import { oracle } from "#lib/stores/oracle.svelte.js";
  import { discoveryPolicyStore } from "#lib/stores/ui/discovery-policy.svelte.js";

  let { entity }: { entity: Entity } = $props();

  const isVisualizing = $derived(oracle.isVisualizingEntity(entity.id));
  const canGenerateImage = $derived.by(() => {
    const provider = oracle.settings?.imageProvider || "cloudflare";
    if (provider === "cloudflare") return true;
    if (provider === "custom") return !!oracle.settings?.customImageApiKey;
    return !!oracle.apiKey;
  });
  const label = $derived(
    canGenerateImage ? "Generate AI art" : "Generate prompt",
  );
</script>

<!-- Entities without text get the large image block, which has its own button. -->
{#if !vault.isGuest && !discoveryPolicyStore.aiDisabled && !entity.image && entity.content?.trim()}
  <button
    type="button"
    onclick={() => oracle.drawEntity(entity.id)}
    disabled={isVisualizing}
    aria-busy={isVisualizing}
    aria-label="{label} for {entity.title}"
    data-testid="generate-art-button"
    class="mt-1.5 flex w-fit items-center gap-1.5 rounded border border-theme-primary/30 bg-theme-surface px-2 py-1 max-md:mt-0 max-md:p-1 text-nano font-bold uppercase tracking-widest text-theme-text transition hover:border-theme-primary disabled:opacity-60"
  >
    <span
      aria-hidden="true"
      class="{isVisualizing
        ? 'icon-[lucide--loader-2] animate-spin'
        : 'icon-[lucide--palette]'} h-3 w-3"
    ></span>
    <span class="max-md:sr-only"
      >{isVisualizing ? "Visualizing..." : label}</span
    >
  </button>
{/if}
